import { EventLogFromDb, PersistenceObject } from '../types';
import { parseEventArgs } from '../utils/parseEventArgs';
import { ResponseWithCors } from './responseWithCors';
import { SortClause, WhereClause } from '../database/filters';
import { parseWhereClause } from './parsers/parseWhereClause';
import { parseSortClause } from './parsers/parseSortClause';

export const filterEventsWithURLParams = async (
  collectionName: string, // tableName for SQL
  request: Request,
  db: PersistenceObject,
) => {
  const { searchParams } = new URL(request.url);

  let sort: SortClause[] = [];
  let wheres: WhereClause[] = [];
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  try {
    wheres = searchParams
      .getAll('where')
      .flatMap((t) => t.split(','))
      .map((t) => parseWhereClause(t));

    sort = searchParams
      .getAll('sort')
      .flatMap((t) => t.split(','))
      .map((t) => parseSortClause(t));
  } catch (e) {
    return new ResponseWithCors(
      JSON.stringify({
        error: 'Invalid key',
        message:
          'Only alphanumeric characters and underscores are allowed in where and sort',
      }),
      { status: 400 },
    );
  }

  const { isSuccess, value } = await db
    .filter<EventLogFromDb>({
      table: collectionName,
      whereClauses: wheres,
      sortClauses: sort,
      limit: limit ? parseInt(limit) : 100,
      offset: offset ? parseInt(offset) : 0,
    })
    .then((res) => ({
      isSuccess: true,
      value: JSON.stringify(res.map(parseEventArgs)),
    }))
    .catch((e) => ({ isSuccess: false, value: e.message }));

  if (!isSuccess) {
    return new ResponseWithCors(JSON.stringify({ error: value }), { status: 400 });
  }

  return new ResponseWithCors(value);
};
