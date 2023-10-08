import { PersistanceObject } from '../../types';

const filterSigns = {
  lt: '<',
  lte: '<=',
  gt: '>',
  gte: '>=',
  eq: '=',
  neq: '!=',
};

export const parseFieldFilter = (
  db: PersistanceObject,
  key: string,
  searchParamsEntries: {
    [k: string]: string;
  },
) => {
  const filterKey = key.replace('filter_', '');
  const [filter, field] = filterKey.split('_');

  if (filterKey.includes('args_')) {
    const [filter, argKey] = filterKey.replace('args_', '').split('_');

    if (filter in filterSigns === false) {
      // @TODO: Handle error instead of silently ignoring
      return null;
    }

    return `${db.getJsonObjectPropertySqlFragment('events.args', argKey)} ${
      filterSigns[filter as keyof typeof filterSigns]
    } '${searchParamsEntries[key]}'`;
  }

  if (filter in filterSigns === false) {
    // @TODO: Handle error instead of silently ignoring
    return null;
  }
  return `"${field}" ${filterSigns[filter as keyof typeof filterSigns]} '${
    searchParamsEntries[key]
  }'`;
};
