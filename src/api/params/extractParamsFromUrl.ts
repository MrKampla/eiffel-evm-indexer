export const extractParamsFromUrl = (searchParamsEntries: { [k: string]: string }) => {
  const eventArgsParams = Object.keys(searchParamsEntries)
    .filter((key) => key.startsWith('args_'))
    .map((key) => key.replace('args_', ''));

  const topLevelParams = Object.keys(searchParamsEntries).filter(
    (key) =>
      !key.startsWith('args_') &&
      !key.startsWith('filter_') &&
      !key.startsWith('sort_') &&
      !['limit', 'offset', 'page_size'].includes(key),
  );

  // lt, lte, gt, gte, eq, neq
  // example: filter_lt_blockNumber=100
  const filters = Object.keys(searchParamsEntries).filter((key) =>
    key.startsWith('filter_'),
  );

  // limit=10&offset=0
  const paginationParams = Object.keys(searchParamsEntries).filter((key) =>
    ['limit', 'offset', 'page_size'].includes(key),
  );

  // sort_text_blockNumber=asc, sort_int_blockNumber=desc
  const sortParam = Object.keys(searchParamsEntries).find(
    (key) => key.startsWith('sort_text_') || key.startsWith('sort_int_'),
  );

  return {
    eventArgsParams,
    topLevelParams,
    filters,
    paginationParams,
    sortParam,
  };
};
