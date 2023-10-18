import { FilterTypes, SortClosure } from '../../database/filters';

export const parseSortClosure = (
  t: string,
  allowedKeyPattern = /^[a-zA-Z0-9_]*$/,
): SortClosure => {
  const tokens = t.trim().split(':');
  let [field, typeEnum, directionEnum] =
    tokens.length === 3 ? tokens : [tokens[0], undefined, tokens[1]];
  if (!typeEnum) {
    typeEnum = FilterTypes.TEXT;
  }
  const direction = directionEnum?.toUpperCase() as 'ASC' | 'DESC';
  const type = typeEnum?.toUpperCase() as FilterTypes;
  if (!direction || !type || !allowedKeyPattern.test(field)) {
    throw new Error('Invalid sort clause');
  }
  return { field, direction, type };
};
