import { Database } from 'bun:sqlite';
import { EventLog, PersistanceObject } from '../types';
import { serialize } from '../utils/serializer';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { logger } from '../utils/logger';

export class SqlitePersistance implements PersistanceObject {
  db: Database;
  constructor(
    private chainId: number,
    dbUrl: string,
  ) {
    this.db = new Database(dbUrl, { create: true });
  }

  async disconnect() {
    this.db.close();
  }

  private prepareEventsTable() {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        address TEXT,
        blockNumber INTEGER,
        eventName TEXT,
        args TEXT,
        chainId INTEGER
        );`,
      )
      .run();
  }

  private prepareIndexingStatusTable() {
    this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS indexing_status (
            chainId INTEGER PRIMARY KEY,
        blockNumber INTEGER
        );`,
      )
      .run();
  }

  async init() {
    this.db.transaction(() => {
      this.prepareEventsTable();
      this.prepareIndexingStatusTable();
    })();
  }

  async saveBatch(batch: EventLog[], latestBlockNumber?: bigint) {
    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));

    const insertEventLog = this.db.prepare(
      'INSERT INTO events (id, address, blockNumber, eventName, chainId, args) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET blockNumber=excluded.blockNumber',
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

  async getLatestIndexedBlockForChain(chainId: number) {
    return (
      this.db
        .query(`SELECT blockNumber FROM indexing_status WHERE chainId = ${chainId}`)
        .get() as { blockNumber?: number }
    )?.blockNumber;
  }

  getJsonObjectPropertySqlFragment(column: string, propertyName: string): string {
    return ` JSON_EXTRACT(${column}, '$.${propertyName}') `;
  }

  async queryAll<T>(query: string) {
    logger.log(query);
    return Promise.resolve(this.db.query(query).all() as T[]);
  }

  async queryOne<T>(query: string): Promise<T> {
    logger.log(query);
    return Promise.resolve(this.db.query(query).get() as T);
  }

  async queryRun(query: string) {
    logger.log(query);
    return Promise.resolve(this.db.prepare(query).run());
  }
}
