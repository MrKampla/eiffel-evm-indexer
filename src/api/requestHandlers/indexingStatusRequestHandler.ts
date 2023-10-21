import { env } from '../envApi';
import { IndexingStatus, PersistenceObject } from '../../types';
import { ResponseWithCors } from '../responseWithCors';
import { FilterOperators, FilterTypes } from '../../database/filters';

export const handleIndexingStatusRequest = async (_request: Request, db: PersistenceObject) => {
  const item = await db.filter<IndexingStatus>('indexing_status', [{field: 'chainId', operator: FilterOperators.EQ, type: FilterTypes.TEXT, value: env.CHAIN_ID.toString()}], [], 1, 0);
  return new ResponseWithCors(JSON.stringify(item));
}
