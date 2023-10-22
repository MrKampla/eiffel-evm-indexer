import { router } from './router';
import { env } from './envApi';
import { PersistenceObject } from '../types';
import { handleEventsRequest } from './requestHandlers/eventsRequestHandler';
import { getDb } from '../utils/getDb';
import { handleIndexingStatusRequest } from './requestHandlers/indexingStatusRequestHandler';
import { logger } from '../utils/logger';
import packageJson from '../../package.json';
import { ResponseWithCors } from './responseWithCors';
import { createGraphqlServer } from './graphql';

const data: PersistenceObject = getDb({
  dbType: env.DB_TYPE,
  dbUrl: env.DB_URL,
  chainId: env.CHAIN_ID,
  ssl: env.DB_SSL,
  dbName: env.DB_NAME
});


const yoga = createGraphqlServer(data);

const server = env.GPAPHQL ? Bun.serve({fetch: yoga.fetch.bind(yoga), port: env.API_PORT}) : Bun.serve({
  port: env.API_PORT,
  async fetch(request) {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const res = new ResponseWithCors('Departed');
      return res;
    }
    return router(request, data)
      .when('/api/events', handleEventsRequest)
      .when('/api/indexing_status', handleIndexingStatusRequest)
      .when(
        '/',
        async () =>
          new ResponseWithCors(
            JSON.stringify({
              message: 'Welcome to EIFFEL API!',
              version: packageJson.version,
            }),
          ),
      )
      .route(request.url);
  },
});

logger.log(`Listening on ${server.hostname}:${server.port}`);
data.init();

process.on('exit', () => {
  data.disconnect();
  process.exit();
});
