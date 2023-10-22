import { env } from '../envApi';
import { IndexingStatus, PersistenceObject } from '../../types';
import { ResponseWithCors } from '../responseWithCors';
import { FilterOperators, FilterTypes } from '../../database/filters';

export const handleIndexingStatusRequest = async (
  _request: Request,
  db: PersistenceObject,
) => {
  const item = await db.filter<IndexingStatus>({
    table: 'indexing_status',
    whereClauses: [
      {
        field: 'chainId',
        operator: FilterOperators.EQ,
        type: FilterTypes.TEXT,
        value: env.CHAIN_ID.toString(),
      },
    ],
    sortClauses: [],
    limit: 1,
    offset: 0,
  });
  return new ResponseWithCors(JSON.stringify(item));
};
