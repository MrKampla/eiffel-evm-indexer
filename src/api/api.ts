import { createFileSystemBasedRouter } from './router';
import { env } from './envApi';
import { PersistenceObject } from '../types';
import { getDb } from '../utils/getDb';
import { logger } from '../utils/logger';
import { ResponseWithCors } from './responseWithCors';
import { createGraphqlServer } from './graphql';
import http from 'node:http';
import isEsMain from 'es-main';

export const runEiffelApi = async () => {
  logger.log('***STARTING EIFFEL API***');
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
    ? http.createServer(yoga.fetch.bind(yoga)).listen(env.API_PORT)
    : http
        .createServer((req, res) => {
          // Handle CORS preflight requests
          if (req.method === 'OPTIONS') {
            const response = new ResponseWithCors('Departed');
            res.writeHead(
              response.status,
              response.headers as unknown as http.OutgoingHttpHeaders,
            );
            res.end(response.body);
            return;
          }

          router.route(req).then(async (routeHandlerResult) => {
            let response: Response = routeHandlerResult as Response;
            if (!(routeHandlerResult instanceof Response)) {
              // assume response is a JSON object
              response = new ResponseWithCors(JSON.stringify(routeHandlerResult));
            }

            res.writeHead(
              response.status,
              response.headers as unknown as http.OutgoingHttpHeaders,
            );
            res.end(JSON.stringify(await response.json()));
          });
        })
        .listen(env.API_PORT);

  server.on('listening', () => {
    logger.log(`EIFFEL API listening on ${JSON.stringify(server.address())}`);
  });

  process.on('exit', () => {
    db.disconnect();
    process.exit();
  });
};

if (isEsMain(import.meta)) {
  runEiffelApi();
}
