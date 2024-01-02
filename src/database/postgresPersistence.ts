import { EventLog } from '../types';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { serialize } from '../utils/serializer';
import { logger } from '../utils/logger';
import { SqlPersistenceBase } from './sqlPersistenceBase';
import { safeAsync } from '../utils/safeAsync';

export class PostgresPersistence extends SqlPersistenceBase {
  private readonly indexingCollectionName = 'indexing_status';
  private readonly eventsCollectionName = 'events';

  constructor(
    private chainId: number,
    dbUrl: string,
    private clearDb: boolean = false,
    ssl: boolean = true,
  ) {
    super('pg', dbUrl, ssl);
  }

  public disconnect(): Promise<void> {
    return this._knexClient.destroy();
  }

  public async init(): Promise<void> {
    logger.log(`Initializing postgres instance`);
    await safeAsync(async () => {
      if (this.clearDb) {
        await this.dropTables();
      }
    });
    await safeAsync(async () =>
      this._knexClient.transaction(async (trx) => {
        await trx.raw(`CREATE TABLE IF NOT EXISTS events (
          id TEXT PRIMARY KEY,
          address TEXT,
          "blockNumber" INTEGER,
          "eventName" TEXT,
          args TEXT,
          "chainId" INTEGER,
          "transactionHash" TEXT
          );`);
        await trx.raw(`CREATE TABLE IF NOT EXISTS indexing_status (
            "chainId" INTEGER PRIMARY KEY,
            "blockNumber" INTEGER
            );`);
      }),
    );
    logger.log(
      `Initialized tables ${this.eventsCollectionName} and ${this.indexingCollectionName}`,
    );
  }

  public async saveBatch(
    batch: EventLog[],
    latestBlockNumber?: bigint | undefined,
  ): Promise<void> {
    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));
    await safeAsync(async () =>
      this._knexClient.transaction(async (trx) => {
        await Promise.all(
          batch.map(async (event) => {
            await trx.raw(
              `INSERT INTO events (id, address, "blockNumber", "eventName", args, "chainId", "transactionHash") VALUES (
              '${createUniqueIdForEvent(event)}',
              '${event.address}',
              '${event.blockNumber.toString()}',
              '${event.eventName}',
              '${serialize(event.args)}',
              '${this.chainId.toString()}',
              '${event.transactionHash}'
            ) ON CONFLICT(id) DO UPDATE SET 
            "blockNumber"=excluded."blockNumber", "transactionHash" = excluded."transactionHash"`,
            );
          }),
        );
        await trx.raw(
          `INSERT INTO indexing_status ("chainId", "blockNumber") 
        VALUES ('${this.chainId.toString()}', '${latestIndexedBlock?.toString()}') 
        ON CONFLICT("chainId") DO UPDATE SET "blockNumber"=excluded."blockNumber"`,
        );
      }),
    );
  }

  public async getLatestIndexedBlockForChain(
    chainId: number,
  ): Promise<number | undefined> {
    return safeAsync(
      async () =>
        (
          await this._knexClient.raw(
            `SELECT "blockNumber" FROM indexing_status WHERE "chainId" = ${chainId}`,
          )
        ).rows[0]?.blockNumber,
    );
  }

  public getJsonObjectPropertySqlFragment(column: string, propertyName: string): string {
    return `CAST(${column} AS json)->>'${propertyName}' `;
  }

  public async queryAll<T>(query: string, options = { safeAsync: true }): Promise<T[]> {
    const queryFn = async () => {
      logger.log(query);

      const items = (await this._knexClient.raw(query)).rows as T[];
      return items;
    };
    return options.safeAsync ? safeAsync(queryFn) : queryFn();
  }

  public async queryOne<T>(query: string, options = { safeAsync: true }): Promise<T> {
    const queryFn = async () => {
      logger.log(query);
      const item = (await this._knexClient.raw(query)).rows[0] as T;
      return item;
    };
    return options.safeAsync ? safeAsync(queryFn) : queryFn();
  }

  protected async dropTables(): Promise<void> {
    await this._knexClient.raw(`DROP TABLE IF EXISTS events`);
    await this._knexClient.raw(`DROP TABLE IF EXISTS indexing_status`);
    logger.log(`Dropped tables`);
  }
}
