import { IndexerTarget } from './types';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';

export const EnvSchema = z.object({
  // REQUIRED
  CHAIN_ID: z.number(),
  CHAIN_RPC_URLS: z.array(z.string()).min(1),
  TARGETS: z.array(
    z.object({
      address: z.string().startsWith('0x'),
      abiItem: z.object({
        type: z.enum(['event']),
      }),
    }),
  ),
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

export type Env = z.infer<typeof EnvSchema> & {
  TARGETS: IndexerTarget[];
};

const getTargets = (overrides: Partial<Env> = {}) => {
  if (overrides.TARGETS) {
    const targetSchema = z.array(
      z.object({
        address: z.string(),
        abiItem: z.object({
          type: z.enum(['event']),
        }),
      }),
    );
    return targetSchema.parse(overrides.TARGETS);
  }

  const targetsPath = path.join(process.cwd(), './targets.json');
  if (!fs.existsSync(targetsPath)) {
    throw new Error(
      `No TARGETS configured: create targets.json at ${path.dirname(targetsPath)}`,
    );
  }
  const TARGETS = JSON.parse(fs.readFileSync(targetsPath).toString()) as IndexerTarget[];
  const targetSchema = z.array(
    z.object({
      address: z.string(),
      abiItem: z.object({
        type: z.enum(['event']),
      }),
    }),
  );
  return targetSchema.parse(TARGETS);
};

let cachedEnv: Env;

/**
 * First checks if the env is already cached, if it is then it is returned. If env is not cached, it reads the env variables
 * from the .env file and the targets.json file and also overrides passed by the user (only when running programatically,
 * not in the CLI) and returns the env object.
 * @param overrides - Optional object to override the env variables
 * @returns The env object
 */
export const getEnv = (overrides: Partial<Env> = {}): Env => {
  if (cachedEnv) {
    return cachedEnv;
  }

  config();

  const env = EnvSchema.parse({
    ...process.env,
    CHAIN_RPC_URLS:
      overrides.CHAIN_RPC_URLS ?? JSON.parse(process.env.CHAIN_RPC_URLS as string),
    START_FROM_BLOCK: overrides.START_FROM_BLOCK ?? BigInt(process.env.START_FROM_BLOCK!),
    BLOCK_CONFIRMATIONS:
      overrides.BLOCK_CONFIRMATIONS ?? BigInt(process.env.BLOCK_CONFIRMATIONS!),
    BLOCK_FETCH_INTERVAL:
      overrides.BLOCK_FETCH_INTERVAL ?? Number(process.env.BLOCK_FETCH_INTERVAL),
    BLOCK_FETCH_BATCH_SIZE:
      overrides.BLOCK_FETCH_BATCH_SIZE ?? BigInt(process.env.BLOCK_FETCH_BATCH_SIZE!),
    ...overrides,
    TARGETS: getTargets(overrides),
  });

  if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
    throw new Error('postgres DB_URL not set');
  }

  if (process.env.DB_TYPE === 'mongo' && !process.env.DB_NAME?.length) {
    throw new Error('mogno DB_NAME is not set');
  }

  cachedEnv = env as Env;

  return cachedEnv;
};
