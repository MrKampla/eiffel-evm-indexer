import { IndexerTarget } from './types.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

const targetsSchema = z.array(
  z.object({
    address: z.string(),
    abiItem: z.object({
      type: z.enum(['event']),
      anonymous: z.boolean().optional(),
      inputs: z.array(z.any()),
      name: z.string(),
    }),
  }),
);

export const EnvSchema = z.object({
  // REQUIRED
  CHAIN_ID: z.number(),
  CHAIN_RPC_URLS: z.array(z.string()).min(1),
  TARGETS: targetsSchema,
  START_FROM_BLOCK: z.bigint(),
  // OPTIONAL
  BLOCK_CONFIRMATIONS: z.bigint().optional().default(5n),
  BLOCK_FETCH_INTERVAL: z.number().optional().default(1000),
  BLOCK_FETCH_BATCH_SIZE: z.bigint().optional().default(1000n),
  DB_TYPE: z.enum(['sqlite', 'postgres', 'mongo']).optional().default('sqlite'),
  DB_URL: z.string().optional().default('events.db'),
  DB_SSL: z.boolean().optional().default(true),
  CLEAR_DB: z.boolean().optional().default(true),
  DB_NAME: z.string().optional(),
  REORG_REFETCH_DEPTH: z.bigint().optional().default(0n),
});

export type Env = Omit<z.infer<typeof EnvSchema>, 'TARGETS'> & {
  TARGETS: IndexerTarget[];
};

const getTargets = (overrides: Partial<Env> = {}) => {
  if (overrides.TARGETS || Array.isArray(process.env.TARGETS)) {
    targetsSchema.parse(overrides.TARGETS || process.env.TARGETS);
    return overrides.TARGETS || process.env.TARGETS;
  }

  const targetsPath = path.join(process.cwd(), './targets.json');
  if (!fs.existsSync(targetsPath)) {
    throw new Error(
      `No TARGETS configured: create targets.json at ${path.dirname(targetsPath)}`,
    );
  }
  const TARGETS = JSON.parse(fs.readFileSync(targetsPath).toString()) as IndexerTarget[];

  targetsSchema.parse(TARGETS);
  return TARGETS;
};

const getChainRpcUrls = (overrides: Partial<Env> = {}) => {
  if (overrides.CHAIN_RPC_URLS || Array.isArray(process.env.CHAIN_RPC_URLS)) {
    return overrides.CHAIN_RPC_URLS || process.env.CHAIN_RPC_URLS;
  }

  if (process.env.CHAIN_RPC_URLS) {
    return JSON.parse(process.env.CHAIN_RPC_URLS);
  }
  return undefined;
};

/**
 * First checks if the env is already cached, if it is then it is returned. If env is not cached, it reads the env variables
 * from the .env file and the targets.json file and also overrides passed by the user (only when running programatically,
 * not in the CLI) and returns the env object.
 * @param overrides - Optional object to override the env variables
 * @returns The env object
 */
export const getEnv = (overrides: Partial<Env> = {}): Env => {
  config();

  const env = EnvSchema.parse({
    ...process.env,
    ...overrides,
    CHAIN_RPC_URLS: getChainRpcUrls(overrides),
    START_FROM_BLOCK:
      overrides.START_FROM_BLOCK ?? process.env.START_FROM_BLOCK
        ? BigInt(process.env.START_FROM_BLOCK!)
        : undefined,
    BLOCK_CONFIRMATIONS:
      overrides.BLOCK_CONFIRMATIONS ?? process.env.BLOCK_CONFIRMATIONS
        ? BigInt(process.env.BLOCK_CONFIRMATIONS!)
        : undefined,
    BLOCK_FETCH_INTERVAL:
      overrides.BLOCK_FETCH_INTERVAL ?? Number(process.env.BLOCK_FETCH_INTERVAL),
    BLOCK_FETCH_BATCH_SIZE:
      overrides.BLOCK_FETCH_BATCH_SIZE ?? process.env.BLOCK_FETCH_BATCH_SIZE
        ? BigInt(process.env.BLOCK_FETCH_BATCH_SIZE!)
        : undefined,
    CHAIN_ID: overrides.CHAIN_ID ?? Number(process.env.CHAIN_ID),
    TARGETS: getTargets(overrides),
  });

  if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
    throw new Error('postgres DB_URL not set');
  }

  if (process.env.DB_TYPE === 'mongo' && !process.env.DB_NAME?.length) {
    throw new Error('mogno DB_NAME is not set');
  }

  process.env = {
    ...process.env,
    ...(env as any),
  };
  return env as Env;
};
