import { EventLogFromDb, PersistenceObject } from '../../types';
import { parseEventArgs } from '../../utils/parseEventArgs';
import { ResponseWithCors } from '../responseWithCors';
import {
  FilterOperators,
  FilterTypes,
  SortClosure,
  WhereClosure,
} from '../../database/filters';
import { parseWhereClosure } from '../parsers/parseWhereClosure';
import { parseSortClosure } from '../parsers/parseSortClosure';

export const handleEventsRequest = async (request: Request, db: PersistenceObject) => {
  const { searchParams } = new URL(request.url);

  let sort: SortClosure[] = [];
  let wheres: WhereClosure[] = [];
  const limit = searchParams.get('limit');
  const offset = searchParams.get('offset');

  try {
    wheres = searchParams
      .getAll('where')
      .flatMap((t) => t.split(','))
      .map((t) => parseWhereClosure(t));

    sort = searchParams
      .getAll('sort')
      .flatMap((t) => t.split(','))
      .map((t) => parseSortClosure(t));

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
    .filter<EventLogFromDb>(
      'events',
      wheres,
      sort,
      limit ? parseInt(limit) : 100,
      offset ? parseInt(offset) : 0,
    )
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
