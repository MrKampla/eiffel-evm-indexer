import { Database } from 'bun:sqlite';
import { EventLog } from '../types';
import { serialize } from '../utils/serializer';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { logger } from '../utils/logger';
import { SqlPersistenceBase } from './sqlPersistenceBase';

export class SqlitePersistence extends SqlPersistenceBase {
  db: Database;
  constructor(
    private chainId: number,
    dbUrl: string,
    private clearDb: boolean = false,
  ) {
    super('sqlite3');
    this.db = new Database(dbUrl, { create: true });
  }

  public async disconnect(): Promise<void> {
    this.db.close();
  }

  private prepareEventsTable(): void {
    if (this.clearDb) {
      this.db.prepare('DROP TABLE IF EXISTS events').run();
      logger.log(`Dropped tables`);
    }
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        address TEXT,
        "blockNumber" INTEGER,
        "eventName" TEXT,
        args TEXT,
        "chainId" INTEGER
        );`,
      )
      .run();
    logger.log(`Initialized tables events and indexing_status`);
  }

  private prepareIndexingStatusTable(): void {
    if (this.clearDb) {
      this.db.prepare('DROP TABLE IF EXISTS indexing_status').run();
    }
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS indexing_status (
            "chainId" INTEGER PRIMARY KEY,
            "blockNumber" INTEGER
        );`,
      )
      .run();
  }

  async init() {
    logger.log(`Initializing sqlite instance`);
    this.db.transaction(() => {
      this.prepareEventsTable();
      this.prepareIndexingStatusTable();
    })();
  }

  public async saveBatch(batch: EventLog[], latestBlockNumber?: bigint) : Promise<void> {
    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));

    const insertEventLog = this.db.prepare(
      'INSERT INTO events (id, address, blockNumber, eventName, chainId, args) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET blockNumber=excluded.blockNumber, transactionHash = excluded.transactionHash',
    );
    const insertIndexingStatus = this.db.prepare(
      'INSERT INTO indexing_status (chainId, blockNumber) VALUES (?, ?) ON CONFLICT(chainId) DO UPDATE SET blockNumber = excluded.blockNumber',
    );
    const writeLogsBatch = this.db.transaction((events: EventLog[]) => {
      events.forEach((event) => {
        insertEventLog.run(
          createUniqueIdForEvent(event),
          event.address,
          event.blockNumber,
          event.eventName,
          this.chainId.toString(),
          serialize(event.args),
        );
      });
      insertIndexingStatus.run(this.chainId.toString(), latestIndexedBlock.toString());
    });

    writeLogsBatch(batch);
  }

  public async getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined> {
    return (
      this.db
        .query(`SELECT blockNumber FROM indexing_status WHERE chainId = ${chainId}`)
        .get() as { blockNumber?: number }
    )?.blockNumber;
  }

  protected getJsonObjectPropertySqlFragment(column: string, propertyName: string): string {
    return `JSON_EXTRACT(${column}, '$.${propertyName}') `;
  }

  protected async queryAll<T>(query: string): Promise<T[]> {
    logger.log(query);
    return Promise.resolve(this.db.query(query).all() as T[]);
  }

  public async queryOne<T>(query: string): Promise<T> {
    logger.log(query);
    return Promise.resolve(this.db.query(query).get() as T);
  }

  public async queryRun(query: string): Promise<void> {
    logger.log(query);
    return Promise.resolve(this.db.prepare(query).run());
  }
}
