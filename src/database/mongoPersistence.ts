import { MongoClient, Db, Collection, Document, Filter } from 'mongodb';
import { EventLog, PersistenceObject } from '../types';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { logger } from '../utils/logger';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { WhereClause, SortClause, FilterOperators, FilterType } from './filters';
import { serialize } from '../utils/serializer';

export class MongoDBPersistence implements PersistenceObject {
  private client: MongoClient;
  private db?: Db;

  private readonly indexingCollectionName = 'indexing_status';
  private readonly eventsCollectionName = 'events';

  constructor(
    private chainId: number,
    dbUrl: string,
    private dbName: string,
    private clearDb: boolean = false,
  ) {
    this.client = new MongoClient(dbUrl);
  }

  queryAll<T>(_query: string): Promise<T[]> {
    throw new Error('Not supported in MongoDB');
  }

  getUnderlyingDataSource(): MongoClient {
    return this.client;
  }

  public async filter<T extends {}>({
    table,
    whereClauses = [],
    sortClauses = [],
    limit = 100,
    offset = 0,
  }: {
    table: string;
    whereClauses: WhereClause[];
    sortClauses: SortClause[];
    limit: number;
    offset: number;
  }): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    const mongoQuery: Filter<T> = {
      $and: whereClauses.map(this.convertWhereToMongoQuery.bind(this)),
    };

    const mongoSort = sortClauses.reduce(
      (acc, sortClouse) => ({
        ...acc,
        ...this.convertSortToMongoSort(sortClouse),
      }),
      {},
    );

    const collection = this.db?.collection<T>(table);
    let query = collection.find(whereClauses?.length ? mongoQuery : {});

    if (sortClauses?.length) query = query.sort(mongoSort);
    if (limit) query = query.limit(limit);
    if (offset >= 0) query = query.skip(offset);

    const results = (await query.toArray()).map((result) => result as T);
    return results;
  }

  public async disconnect(): Promise<void> {
    await this.client.close();
  }

  public async init(): Promise<void> {
    logger.log(`Initializing mongodb instance`);

    await this.client.connect();
    this.db = this.client.db(this.dbName);

    const collections = await this.db.listCollections().toArray();

    if (this.clearDb) {
      if (collections.some((col) => col.name === this.eventsCollectionName))
        await this.db.dropCollection(this.eventsCollectionName);
      if (collections.some((col) => col.name === this.indexingCollectionName))
        await this.db.dropCollection(this.indexingCollectionName);
      logger.log(`Dropped collections`);
    }
    if (!collections.some((col) => col.name === this.eventsCollectionName))
      await this.db.createCollection(this.eventsCollectionName);
    if (!collections.some((col) => col.name === this.indexingCollectionName))
      await this.db.createCollection(this.indexingCollectionName);
    logger.log(`Initialized collections`);
  }

  public async saveBatch(
    batch: EventLog[],
    latestBlockNumber?: bigint | undefined,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    if (batch.length === 0) return;

    const eventsCollection: Collection = this.db.collection(this.eventsCollectionName);
    const indexingStatusCollection: Collection = this.db.collection(
      this.indexingCollectionName,
    );

    const latestIndexedBlock =
      latestBlockNumber ?? BIGINT_MATH.max(...batch.map((event) => event.blockNumber));

    const transformedEvents: Document[] = batch.map((event) => ({
      ...event,
      blockNumber: event.blockNumber.toString(),
      id: createUniqueIdForEvent(event),
      chainId: this.chainId.toString(),
      args: serialize(event.args),
    }));

    await eventsCollection.insertMany(transformedEvents, { ordered: false });

    await indexingStatusCollection.updateOne(
      { chainId: this.chainId.toString() },
      { $set: { blockNumber: latestIndexedBlock.toString() } },
      { upsert: true },
    );
  }

  public async getLatestIndexedBlockForChain(
    chainId: number,
  ): Promise<number | undefined> {
    if (!this.db) throw new Error('Database not initialized');

    const indexingStatusCollection: Collection = this.db.collection(
      this.indexingCollectionName,
    );
    const result = await indexingStatusCollection.findOne({
      chainId: chainId.toString(),
    });
    return result?.blockNumber;
  }

  private convertWhereToMongoQuery(whereClause: WhereClause): any {
    switch (whereClause.operator) {
      case FilterOperators.EQ:
        return { [whereClause.field]: { $eq: this.convertValue(whereClause) } };
      case FilterOperators.GT:
        return { [whereClause.field]: { $gt: this.convertValue(whereClause) } };
      case FilterOperators.GTE:
        return { [whereClause.field]: { $gte: this.convertValue(whereClause) } };
      case FilterOperators.LT:
        return { [whereClause.field]: { $lt: this.convertValue(whereClause) } };
      case FilterOperators.LTE:
        return { [whereClause.field]: { $lte: this.convertValue(whereClause) } };
      case FilterOperators.NEQ:
        return { [whereClause.field]: { $ne: this.convertValue(whereClause) } };
      default:
        throw new Error('Invalid filter operator');
    }
  }

  private convertValue(whereClauses: WhereClause): string | number {
    return whereClauses.type === FilterType.NUMBER
      ? parseFloat(whereClauses.value)
      : whereClauses.value;
  }

  private convertSortToMongoSort(sortClause: SortClause): any {
    return {
      [sortClause.field]: sortClause.direction === 'ASC' ? 1 : -1,
    };
  }
}
