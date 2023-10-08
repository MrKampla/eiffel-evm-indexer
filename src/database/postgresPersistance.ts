import postgres, { Sql } from 'postgres';
import { EventLog, PersistanceObject } from '../types';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { serialize } from '../utils/serializer';
import { logger } from '../utils/logger';

export class PostgresPersistance implements PersistanceObject {
  private sql: Sql;

  constructor(
    private chainId: number,
    dbUrl: string,
  ) {
    this.sql = postgres(dbUrl, { ssl: true });
  }

  async disconnect(): Promise<void> {
    await this.sql.end();
  }

  async init(): Promise<void> {
    await this.sql.begin(async (tx) => {
      await tx`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        address TEXT,
        "blockNumber" INTEGER,
        "eventName" TEXT,
        args TEXT,
        "chainId" INTEGER
      );`;
      await tx`CREATE TABLE IF NOT EXISTS indexing_status (
        "chainId" INTEGER PRIMARY KEY,
        "blockNumber" INTEGER
      );`;
    });
  }

  async saveBatch(
    batch: EventLog[],
    latestBlockNumber?: bigint | undefined,
  ): Promise<void> {
    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));

    await this.sql.begin(async (tx) => {
      await Promise.all(
        batch.map(async (event) => {
          await tx`INSERT INTO events ${this.sql(
            {
              ...event,
              blockNumber: event.blockNumber.toString(),
              id: createUniqueIdForEvent(event),
              args: serialize(event.args),
              chainId: this.chainId.toString(),
            },
            'id',
            'address',
            'blockNumber',
            'eventName',
            'args',
            'chainId',
          )} ON CONFLICT(id) DO UPDATE SET "blockNumber"=excluded."blockNumber"`;
        }),
      );
      await tx`INSERT INTO indexing_status ${this.sql({
        chainId: this.chainId.toString(),
        blockNumber: latestIndexedBlock?.toString(),
      })} ON CONFLICT("chainId") DO UPDATE SET "blockNumber"=excluded."blockNumber"`;
    });
  }
  async getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined> {
    return (
      await this
        .sql`SELECT "blockNumber" FROM indexing_status WHERE "chainId" = ${chainId}`
    )[0]?.blockNumber;
  }
  getJsonObjectPropertySqlFragment(column: string, propertyName: string): string {
    return ` CAST(${column} AS json)->>'${propertyName}' `;
    // return ` to_json(${column})->>'${propertyName}' `;
  }
  async queryAll<T>(query: string): Promise<T[]> {
    logger.log(query);
    const items = (await this.sql.unsafe(query)) as unknown as T[];
    return items;
  }
  async queryOne<T>(query: string): Promise<T> {
    logger.log(query);
    const items = (await this.sql.unsafe(query)) as unknown as T[];
    return items[0];
  }
  async queryRun(query: string): Promise<void> {
    logger.log(query);
    await this.sql`${query}`;
  }
}
