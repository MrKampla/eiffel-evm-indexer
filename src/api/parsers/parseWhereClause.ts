import { FilterOperators, FilterType, WhereClause } from '../../database/filters.js';

export const parseWhereClause = (
  t: string,
  allowedKeyPattern = /^[a-zA-Z0-9_]*$/,
): WhereClause => {
  const tokens = t.trim().split(':');
  let [field, operatorEnum, typeEnum, value] =
    tokens.length === 4 ? tokens : [tokens[0], tokens[1], undefined, tokens[2]];
  if (!typeEnum) {
    typeEnum = FilterType.TEXT;
  }
  const operator = operatorEnum?.toUpperCase() as FilterOperators;
  const type = typeEnum?.toUpperCase() as FilterType;
  if (
    !operator ||
    !type ||
    !allowedKeyPattern.test(field) ||
    !allowedKeyPattern.test(value)
  ) {
    throw new Error('Invalid where clause');
  }
  return { field, operator, type, value };
};
