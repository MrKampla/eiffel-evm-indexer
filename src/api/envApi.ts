// TODO: code duplication with indexer validation

if (!process.env.CHAIN_ID) {
  throw new Error('CHAIN_ID not set');
}
if (isNaN(+process.env.CHAIN_ID)) {
  throw new Error('CHAIN_ID must be a number');
}

if (![undefined, 'sqlite', 'postgres', 'mongo'].includes(process.env.DB_TYPE)) {
  throw new Error('DB_TYPE is only allowed to be "sqlite", "postgres" or "mongo"');
}
if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
  throw new Error('postgres DB_URL not set');
}

if (process.env.DB_TYPE === 'mongo' && !process.env.DB_NAME?.length) {
  throw new Error('mogno DB_NAME is not set');
}

export const env = {
  CHAIN_ID: +process.env.CHAIN_ID,
  API_PORT: +(process.env.API_PORT || 8080),
  DB_TYPE: process.env.DB_TYPE || 'sqlite',
  DB_URL: process.env.DB_URL || 'events.db',
  DB_SSL: process.env.DB_SSL === 'true',
  GPAPHQL: process.env.GPAPHQL === 'true',
  DB_NAME: process.env.DB_NAME,
} as const;
