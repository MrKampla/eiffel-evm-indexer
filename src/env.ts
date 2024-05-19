import { IndexerTarget } from './types.js';
import { z } from 'zod';
import fs from 'node:fs';
import path from 'node:path';
import { config } from 'dotenv';
config();
import { prepareEnv } from './utils/prepareEnv.js';

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

const envObj = {
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
};

export const EnvSchema = z.object(envObj);

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

declare global {
  var preparedEnv: Env;
}

/**
 * First checks if the env is already cached, if it is then it is returned. If env is not cached, it reads the env variables
 * from the .env file and the targets.json file and also overrides passed by the user (only when running programatically,
 * not in the CLI) and returns the env object.
 * @param overrides - Optional object to override the env variables
 * @returns The env object
 */
export const getEnv = (overrides: Partial<Env> = {}): Env => {
  if (globalThis.preparedEnv) return globalThis.preparedEnv as Env;

  const preparedEnv = prepareEnv(EnvSchema.shape, {
    ...process.env,
    ...overrides,
    TARGETS: getTargets(overrides),
  });
  EnvSchema.parse(preparedEnv);

  if (process.env.DB_TYPE === 'postgres' && !process.env.DB_URL) {
    throw new Error('postgres DB_URL not set');
  }

  if (process.env.DB_TYPE === 'mongo' && !process.env.DB_NAME?.length) {
    throw new Error('mogno DB_NAME is not set');
  }

  globalThis.preparedEnv = preparedEnv as Env;

  return preparedEnv as Env;
};
