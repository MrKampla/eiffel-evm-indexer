import { EventLogFromDb, PersistanceObject } from '../../types';
import { parseEventArgs } from '../../utils/parseEventArgs';
import { extractParamsFromUrl } from '../params/extractParamsFromUrl';
import { parseFieldFilter } from '../params/parseFieldFilter';
import { parseSortParam } from '../params/parseSortParam';
import { ResponseWithCors } from '../responseWithCors';

export const handleEventsRequest = async (request: Request, db: PersistanceObject) => {
  const { searchParams } = new URL(request.url);
  const searchParamsEntries = Object.fromEntries(searchParams);

  const { eventArgsParams, filters, paginationParams, sortParam, topLevelParams } =
    extractParamsFromUrl(searchParamsEntries);

  // params validation
  const allowedKeyPattern = /^[a-zA-Z0-9_]*$/; // prevents SQL injection
  if (
    [
      ...topLevelParams,
      ...topLevelParams.map((topLevelParam) => searchParamsEntries[topLevelParam]),
      ...eventArgsParams,
      ...eventArgsParams.map(
        (eventArgParam) => searchParamsEntries[`args_${eventArgParam}`],
      ),
      ...filters,
      ...filters.map((filter) => searchParamsEntries[filter]),
      ...paginationParams.map((paginationParam) => searchParamsEntries[paginationParam]),
      ...(sortParam ? [sortParam, searchParamsEntries[sortParam]] : []),
    ].some((param) => allowedKeyPattern.test(param) === false)
  ) {
    return new ResponseWithCors(
      JSON.stringify({
        error: 'Invalid key',
        message: 'Only alphanumeric characters and underscores are allowed',
      }),
      { status: 400 },
    );
  }

  const allConditions = [
    topLevelParams.map((key) => `events."${key}" = '${searchParamsEntries[key]}'`),
    eventArgsParams.map(
      (key) =>
        `${db.getJsonObjectPropertySqlFragment('events.args', key)} = '${
          searchParamsEntries[`args_${key}`]
        }'`,
    ),
    filters.map((key) => parseFieldFilter(db, key, searchParamsEntries)),
  ]
    .flat()
    .filter(Boolean);

  const sortCondition = parseSortParam(db, sortParam);

  const paginationAndSorting = [
    sortParam ? [`ORDER BY ${sortCondition} ${searchParamsEntries[sortParam]}`] : [],
    paginationParams.map((key) => {
      const value = searchParamsEntries[key];
      const paginationParamToSql = {
        limit: 'LIMIT',
        offset: 'OFFSET',
      };
      return `${paginationParamToSql[key as keyof typeof paginationParamToSql]} ${value}`;
    }),
  ]
    .flat()
    .filter(Boolean);

  const SELECT_EVENTS_QUERY = `SELECT * FROM events`;
  let query = SELECT_EVENTS_QUERY;
  if (allConditions.length > 0) {
    query = query.concat(` WHERE ${allConditions.join(' AND ')}`);
  }
  if (paginationAndSorting.length > 0) {
    query = query.concat(` ${paginationAndSorting.join(' ')}`);
  }

  const { isSuccess, value } = await db
    .queryAll<EventLogFromDb>(query)
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
