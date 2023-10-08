const bigIntParser = (_key: string, value: any) =>
  typeof value === 'bigint' ? value.toString() : value;

export const serialize = (value: any) => JSON.stringify(value, bigIntParser);

export const deserialize = <T>(value: string) => JSON.parse(value) as T;
