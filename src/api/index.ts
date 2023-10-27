import { createFileSystemBasedRouter } from './router';
import { env } from './envApi';
import { PersistenceObject } from '../types';
import { getDb } from '../utils/getDb';
import { logger } from '../utils/logger';
import { ResponseWithCors } from './responseWithCors';
import { createGraphqlServer } from './graphql';

const db: PersistenceObject = getDb({
  dbType: env.DB_TYPE,
  dbUrl: env.DB_URL,
  chainId: env.CHAIN_ID,
  ssl: env.DB_SSL,
  dbName: env.DB_NAME,
});

const yoga = createGraphqlServer(db);

const router = await createFileSystemBasedRouter(db);

const server = env.GPAPHQL
  ? Bun.serve({ fetch: yoga.fetch.bind(yoga), port: env.API_PORT })
  : Bun.serve({
      port: env.API_PORT,
      async fetch(request) {
        // Handle CORS preflight requests
        if (request.method === 'OPTIONS') {
          const res = new ResponseWithCors('Departed');
          return res;
        }

        return router.route(request);
      },
    });

logger.log(`Listening on ${server.hostname}:${server.port}`);
db.init();

process.on('exit', () => {
  db.disconnect();
  process.exit();
});
