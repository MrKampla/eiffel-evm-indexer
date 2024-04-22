import { Database } from 'bun:sqlite';
import { EventLog } from '../types';
import { serialize } from '../utils/serializer';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { logger } from '../utils/logger';
import { SqlPersistenceBase } from './sqlPersistenceBase';
import { Knex } from 'knex';
import { safeAsync } from '../utils/safeAsync';

export class SqlitePersistence extends SqlPersistenceBase {
  db: Database;
  constructor(
    private chainId: number,
    dbUrl: string,
    private clearDb: boolean = false,
  ) {
    super('better-sqlite3', dbUrl, true);
    this.db = new Database(dbUrl, { create: true });
  }

  public getUnderlyingDataSource(): Knex {
    return this._knexClient;
  }

  public async disconnect() {
    this.db.close();
  }

  private async prepareEventsTable() {
    await safeAsync(async () => {
      if (this.clearDb) {
        this.db.run(this._knexClient.schema.dropTableIfExists('events').toQuery());
        logger.log(`Dropped tables`);
      }
    });
    await safeAsync(async () => {
      this.db.run(
        this._knexClient.schema
          .createTableIfNotExists('events', (table) => {
            table.text('id').primary();
            table.text('address');
            table.integer('blockNumber');
            table.text('eventName');
            table.text('args');
            table.integer('chainId');
            table.text('transactionHash');
          })
          .toQuery(),
      );
    });
    logger.log(`Initialized tables events and indexing_status`);
  }

  private prepareIndexingStatusTable(): void {
    if (this.clearDb) {
      this.db.run(this._knexClient.schema.dropTableIfExists('indexing_status').toQuery());
    }
    this.db.run(
      this._knexClient.schema
        .createTableIfNotExists('indexing_status', (table) => {
          table.integer('chainId').primary();
          table.integer('blockNumber');
        })
        .toQuery(),
    );
  }

  // does not need to use ILIKE because sqlite's LIKE is case-insensitive by default
  protected doesSupportIlike(): boolean {
    return false;
  }

  async init() {
    logger.log(`Initializing sqlite instance`);
    await safeAsync(async () =>
      this.db.transaction(async () => {
        await this.prepareEventsTable();
        this.prepareIndexingStatusTable();
      })(),
    );
  }

  public async saveBatch(batch: EventLog[], latestBlockNumber?: bigint): Promise<void> {
    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));

    const writeLogsBatch = this.db.transaction(
      (events: EventLog[], latestIndexedBlockString: string) => {
        if (events.length) {
          this.db.run(
            this._knexClient
              .insert(
                events.map((event) => ({
                  id: createUniqueIdForEvent(event),
                  chainId: this.chainId.toString(),
                  args: serialize(event.args),
                  blockNumber: event.blockNumber.toString(),
                  eventName: event.eventName,
                  transactionHash: event.transactionHash,
                  address: event.address,
                })),
              )
              .into('events')
              .onConflict('id')
              .merge()
              .toQuery(),
          );
        }
        this.db.run(
          this._knexClient
            .insert({
              chainId: this.chainId.toString(),
              blockNumber: latestIndexedBlockString,
            })
            .into('indexing_status')
            .onConflict('chainId')
            .merge()
            .toQuery(),
        );
      },
    );

    await safeAsync(async () => writeLogsBatch(batch, latestIndexedBlock.toString()));
  }

  public async getLatestIndexedBlockForChain(
    chainId: number,
  ): Promise<number | undefined> {
    return safeAsync(
      async () =>
        (
          this.db
            .query(`SELECT blockNumber FROM indexing_status WHERE chainId = ${chainId}`)
            .get() as { blockNumber?: number }
        )?.blockNumber,
    );
  }

  public getJsonObjectPropertySqlFragment(column: string, propertyName: string): string {
    return `JSON_EXTRACT(${column}, '$.${propertyName}') `;
  }

  public async queryAll<T>(query: string, options = { safeAsync: true }): Promise<T[]> {
    const queryFn = async () => {
      logger.log(query);
      return Promise.resolve(this.db.query(query).all() as T[]);
    };
    return options.safeAsync ? safeAsync(queryFn) : queryFn();
  }

  public async queryOne<T>(query: string, options = { safeAsync: true }): Promise<T> {
    const queryFn = async () => {
      logger.log(query);
      return Promise.resolve(this.db.query(query).get() as T);
    };
    return options.safeAsync ? safeAsync(queryFn) : queryFn();
  }
}
