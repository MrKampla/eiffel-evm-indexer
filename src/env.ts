import { IndexerTarget } from './types';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';

if (!process.env.CHAIN_ID) {
  throw new Error('CHAIN_ID not set');
}
if (isNaN(+process.env.CHAIN_ID)) {
  throw new Error('CHAIN_ID must be a number');
}
if (!process.env.CHAIN_RPC_URL) {
  throw new Error('CHAIN_RPC_URL not set');
}
if (!fs.existsSync(path.join(__dirname, '../targets.json'))) {
  throw new Error(
    'No TARGETS configured: create targets.json file at the root directory',
  );
}
const TARGETS = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../targets.json')).toString(),
) as IndexerTarget[];
if (TARGETS) {
  const targetSchema = z.array(
    z.object({
      address: z.string(),
      abiItem: z.object({
        type: z.enum(['event']),
      }),
    }),
  );
  targetSchema.parse(TARGETS);
}
if (!process.env.START_FROM_BLOCK) {
  throw new Error('START_FROM_BLOCK not set');
}
if (![undefined, 'sqlite', 'postgres'].includes(process.env.DB_TYPE)) {
  throw new Error('DB_TYPE is only allowed to be "sqlite" or "postgres"');
}
if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
  throw new Error('postgres DB_URL not set');
}

export const env = {
  // REQUIRED
  CHAIN_ID: +process.env.CHAIN_ID,
  CHAIN_RPC_URL: process.env.CHAIN_RPC_URL,
  TARGETS,
  START_FROM_BLOCK: BigInt(process.env.START_FROM_BLOCK),
  // OPTIONAL
  BLOCK_CONFIRMATIONS: BigInt(process.env.BLOCK_CONFIRMATIONS || 5n),
  BLOCK_FETCH_INTERVAL: +(process.env.BLOCK_FETCH_INTERVAL || 1000),
  BLOCK_FETCH_BATCH_SIZE: BigInt(process.env.BLOCK_FETCH_BATCH_SIZE || 1000n),
  DB_TYPE: process.env.DB_TYPE || 'sqlite',
  DB_URL: process.env.DB_URL || 'events.db',
  DB_SSL: process.env.DB_SSL === 'true',
  CLEAR_DB: process.env.CLEAR_DB === 'true',
} as const;
