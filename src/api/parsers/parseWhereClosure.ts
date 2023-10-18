import { FilterOperators, FilterTypes, WhereClosure } from '../../database/filters';

export const parseWhereClosure = (t: string, allowedKeyPattern = /^[a-zA-Z0-9_]*$/): WhereClosure => {
  const tokens = t.trim().split(':');
  let [field, operatorEnum, typeEnum, value] =
    tokens.length === 4 ? tokens : [tokens[0], tokens[1], undefined, tokens[2]];
  if (!typeEnum) {
    typeEnum = FilterTypes.TEXT;
  }
  const operator = operatorEnum?.toUpperCase() as FilterOperators;
  const type = typeEnum?.toUpperCase() as FilterTypes;
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
