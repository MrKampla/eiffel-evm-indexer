import { z } from 'zod';
import { config } from 'dotenv';

export const ApiEnvSchema = z.object({
  // REQUIRED
  CHAIN_ID: z.number(),
  // OPTIONAL
  API_PORT: z.number().optional().default(8080),
  DB_TYPE: z.enum(['sqlite', 'postgres', 'mongo']).optional().default('sqlite'),
  DB_URL: z.string().optional().default('events.db'),
  DB_SSL: z.boolean().optional().default(true),
  GPAPHQL: z.boolean().optional().default(false),
  DB_NAME: z.string().optional(),
});

export type ApiEnv = z.infer<typeof ApiEnvSchema>;

/**
 * First checks if the env is already cached, if it is then it is returned. If env is not cached, it reads the env variables
 * from the .env file and the targets.json file and also overrides passed by the user (only when running programatically,
 * not in the CLI) and returns the env object.
 * @param overrides - Optional object to override the env variables
 * @returns The env object
 */
export const getApiEnv = (overrides: Partial<ApiEnv> = {}): ApiEnv => {
  config();

  const env = ApiEnvSchema.parse({
    ...process.env,
    ...overrides,
    CHAIN_ID: overrides.CHAIN_ID ?? Number(process.env.CHAIN_ID),
    API_PORT: overrides.API_PORT ?? Number(process.env.API_PORT),
    DB_SSL: overrides.DB_SSL ?? process.env.DB_SSL === 'true',
    GRAPHQL: overrides.GPAPHQL ?? process.env.GPAPHQL === 'true',
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

  return env as ApiEnv;
};
