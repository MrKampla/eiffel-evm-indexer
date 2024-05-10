import { getApiEnv } from '../envApi.js';
import { IndexingStatus, PersistenceObject } from '../../types.js';
import { ResponseWithCors } from '../responseWithCors.js';
import { FilterOperators, FilterType } from '../../database/filters.js';

export default async (_request: Request, db: PersistenceObject) => {
  const item = await db.filter<IndexingStatus>({
    table: 'indexing_status',
    whereClauses: [
      {
        field: 'chainId',
        operator: FilterOperators.EQ,
        type: FilterType.TEXT,
        value: getApiEnv().CHAIN_ID.toString(),
      },
    ],
    sortClauses: [],
    limit: 1,
    offset: 0,
  });
  return new ResponseWithCors(JSON.stringify(item));
};
