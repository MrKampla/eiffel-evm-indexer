import { IndexerTarget } from './types';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';

if (!process.env.CHAIN_ID) {
  throw new Error('CHAIN_ID not set');
}
if (isNaN(+process.env.CHAIN_ID)) {
  throw new Error('CHAIN_ID must be a number');
}
if (!process.env.CHAIN_RPC_URLS) {
  throw new Error('CHAIN_RPC_URLS not set');
}
const CHAIN_RPC_URLS = JSON.parse(process.env.CHAIN_RPC_URLS) as string[];
if (!Array.isArray(CHAIN_RPC_URLS) || !CHAIN_RPC_URLS.length) {
  throw new Error('CHAIN_RPC_URLS is not an array or is empty');
}
const targetsPath = path.join(process.cwd(), './targets.json');
if (!fs.existsSync(targetsPath)) {
  throw new Error(
    `No TARGETS configured: create targets.json at ${path.dirname(targetsPath)}`,
  );
}
const TARGETS = JSON.parse(fs.readFileSync(targetsPath).toString()) as IndexerTarget[];
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
  // REQUIRED
  CHAIN_ID: +process.env.CHAIN_ID,
  CHAIN_RPC_URLS,
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
  DB_NAME: process.env.DB_NAME,
  REORG_REFETCH_DEPTH: BigInt(process.env.REORG_REFETCH_DEPTH || 0n),
} as const;
