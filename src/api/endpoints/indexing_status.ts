import { env } from '../envApi';
import { IndexingStatus, PersistenceObject } from '../../types';
import { ResponseWithCors } from '../responseWithCors';
import { FilterOperators, FilterType } from '../../database/filters';

export default async (_request: Request, db: PersistenceObject) => {
  const item = await db.filter<IndexingStatus>({
    table: 'indexing_status',
    whereClauses: [
      {
        field: 'chainId',
        operator: FilterOperators.EQ,
        type: FilterType.TEXT,
        value: env.CHAIN_ID.toString(),
      },
    ],
    sortClauses: [],
    limit: 1,
    offset: 0,
  });
  return new ResponseWithCors(JSON.stringify(item));
};
