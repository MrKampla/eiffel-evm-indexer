import { MongoClient, Db, Collection, Document, WithId } from 'mongodb';
import { EventLog, PersistenceObject } from '../types';
import { createUniqueIdForEvent } from '../utils/createUniqueIdForEvent';
import { serialize } from '../utils/serializer';
import { logger } from '../utils/logger';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { WhereClosure, SortClosure, FilterOperators, FilterTypes } from './filters';

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

  public async filter<T extends {}>(
    table: string,
    whereClosures: WhereClosure[],
    sortClosures: SortClosure[],
    limit: number,
    offset: number,
  ): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');

    const mongoQuery = {
      $and: whereClosures.map(this.convertWhereToMongoQuery),
    };
    const mongoSort = sortClosures.reduce((acc, sortClosure) => ({
      ...acc,
      ...this.convertSortToMongoSort(sortClosure)
    }), {});
    const collection = this.db?.collection<T>(table);
    
    let query = collection.find(mongoQuery).sort(mongoSort);
    if(limit) query = query.limit(limit);
    if(offset >= 0) query = query.skip(offset);

    const results = (await query.toArray()).map((result) => result as any);
    return results;
  }

  public async disconnect(): Promise<void> {
    await this.client.close();
  }

  public async init(): Promise<void> {
    logger.log(`Initializing mongodb instance`);

    await this.client.connect();
    this.db = this.client.db(this.dbName);

    if (this.clearDb) {
      await this.db.dropCollection(this.eventsCollectionName);
      await this.db.dropCollection(this.indexingCollectionName);
      logger.log(`Dropped collections`);
    }
    this.db.createCollection(this.eventsCollectionName);
    this.db.createCollection(this.indexingCollectionName);
    logger.log(`Initialized collections`);
  }

  public async saveBatch(
    batch: EventLog[],
    latestBlockNumber?: bigint | undefined,
  ): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

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

  private convertWhereToMongoQuery(whereClosure: WhereClosure): any {
    switch (whereClosure.operator) {
      case FilterOperators.EQ:
        return { [whereClosure.field]: { $eq: this.convertValue(whereClosure) } };
      case FilterOperators.GT:
        return { [whereClosure.field]: { $gt: this.convertValue(whereClosure) } };
      case FilterOperators.GTE:
        return { [whereClosure.field]: { $gte: this.convertValue(whereClosure) } };
      case FilterOperators.LT:
        return { [whereClosure.field]: { $lt: this.convertValue(whereClosure) } };
      case FilterOperators.LTE:
        return { [whereClosure.field]: { $lte: this.convertValue(whereClosure) } };
      case FilterOperators.NEQ:
        return { [whereClosure.field]: { $ne: this.convertValue(whereClosure) } };
      default:
        throw new Error('Invalid filter operator');
    }
  }

  private convertValue(whereClosure: WhereClosure): string | number {
    return whereClosure.type === FilterTypes.NUMBER
      ? parseFloat(whereClosure.value)
      : whereClosure.value;
  }

  private convertSortToMongoSort(sortClosure: SortClosure): any {
    return {
      [sortClosure.field]: sortClosure.direction === 'ASC' ? 1 : -1,
    };
  }
}
