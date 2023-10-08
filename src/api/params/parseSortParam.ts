import { PersistanceObject } from '../../types';

export const parseSortParam = (db: PersistanceObject, sortParam: string | undefined) => {
  if (!sortParam) return undefined;

  const sortField = sortParam.replace('sort_', '');
  if (sortField.startsWith('text_')) {
    const textSortField = sortField.replace('text_', '');
    if (textSortField.startsWith('args_')) {
      return db.getJsonObjectPropertySqlFragment(
        'events.args',
        textSortField.replace('args_', ''),
      );
    }

    return `"${textSortField}"`;
  }
  if (sortField.startsWith('int_')) {
    const intSortField = sortField.replace('int_', '');

    if (intSortField.startsWith('args_')) {
      return `CAST(${db.getJsonObjectPropertySqlFragment(
        'events.args',
        intSortField.replace('args_', ''),
      )} AS numeric)`;
    }

    return `CAST("${intSortField}" as numeric)`;
  }

  return undefined;
};
