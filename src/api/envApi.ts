if (!process.env.CHAIN_ID) {
  throw new Error('CHAIN_ID not set');
}
if (isNaN(+process.env.CHAIN_ID)) {
  throw new Error('CHAIN_ID must be a number');
}

if (![undefined, 'sqlite', 'postgres'].includes(process.env.DB_TYPE)) {
  throw new Error('DB_TYPE is only allowed to be "sqlite" or "postgres"');
}
if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
  throw new Error('postgres DB_URL not set');
}

export const env = {
  CHAIN_ID: +process.env.CHAIN_ID,
  API_PORT: +(process.env.API_PORT || 8080),
  DB_TYPE: process.env.DB_TYPE || 'sqlite',
  DB_URL: process.env.DB_URL || 'events.db',
} as const;
