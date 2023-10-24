import postgres, { Sql } from 'postgres';
import { EventLog } from '../types';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { serialize } from '../utils/serializer';
import { logger } from '../utils/logger';
import { SqlPersistenceBase } from './sqlPersistenceBase';

export class PostgresPersistence extends SqlPersistenceBase {
  private sql: Sql;
  private readonly indexingCollectionName = 'indexing_status';
  private readonly eventsCollectionName = 'events';

  constructor(
    private chainId: number,
    dbUrl: string,
    private clearDb: boolean = false,
    ssl: boolean = true,
  ) {
    super('pg');
    this.sql = postgres(dbUrl, { ssl });
  }

  public disconnect(): Promise<void> {
    return this.sql.end();
  }

  public async init(): Promise<void> {
    logger.log(`Initializing postgres instance`);
    if (this.clearDb) {
      await this.dropTables();
    }
    await this.sql.begin(async (tx) => {
      await tx`CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        address TEXT,
        "blockNumber" INTEGER,
        "eventName" TEXT,
        args TEXT,
        "chainId" INTEGER,
        "transactionHash" TEXT
      );`;
      await tx`CREATE TABLE IF NOT EXISTS indexing_status (
        "chainId" INTEGER PRIMARY KEY,
        "blockNumber" INTEGER
      );`;
    });
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
            'transactionHash',
          )} ON CONFLICT(id) DO UPDATE SET "blockNumber"=excluded."blockNumber", "transactionHash" = excluded."transactionHash"`;
        }),
      );
      await tx`INSERT INTO indexing_status ${this.sql({
        chainId: this.chainId.toString(),
        blockNumber: latestIndexedBlock?.toString(),
      })} ON CONFLICT("chainId") DO UPDATE SET "blockNumber"=excluded."blockNumber"`;
    });
  }

  public async getLatestIndexedBlockForChain(
    chainId: number,
  ): Promise<number | undefined> {
    return (
      await this
        .sql`SELECT "blockNumber" FROM indexing_status WHERE "chainId" = ${chainId}`
    )[0]?.blockNumber;
  }

  protected getJsonObjectPropertySqlFragment(
    column: string,
    propertyName: string,
  ): string {
    return `CAST(${column} AS json)->>'${propertyName}' `;
  }

  protected async queryAll<T>(query: string): Promise<T[]> {
    logger.log(query);
    const items = (await this.sql.unsafe(query)) as unknown as T[];
    return items;
  }

  protected async dropTables(): Promise<void> {
    await this.sql`DROP TABLE IF EXISTS events`;
    await this.sql`DROP TABLE IF EXISTS indexing_status`;
    logger.log(`Dropped tables`);
  }
}
