import { createFileSystemBasedRouter } from './router.js';
import { getApiEnv, ApiEnv } from './envApi.js';
import { PersistenceObject } from '../types.js';
import { getDb } from '../utils/getDb.js';
import { logger } from '../utils/logger.js';
import { ResponseWithCors } from './responseWithCors.js';
import http from 'node:http';
import isEsMain from 'es-main';
import EventEmitter from 'node:events';
import { AddressInfo } from 'node:net';
import { Readable } from 'stream';

export type EiffelApiEvents = {
  listening: [string | AddressInfo | null];
};

const handlerResponseToServerResponse = (
  handlerResponse: Response,
  serverResponse: http.ServerResponse,
) => {
  serverResponse.writeHead(
    handlerResponse.status,
    [...handlerResponse.headers].reduce((acc, [key, val]) => {
      acc[key] = val;
      return acc;
    }, {} as http.OutgoingHttpHeaders),
  );
};

function incommingMessageToWebRequest(incomingMessage: http.IncomingMessage): Request {
  const env = getApiEnv();
  const headers = new Headers();
  for (const [key, value] of Object.entries(incomingMessage.headers)) {
    headers.append(key, value as string);
  }
  return new Request(`http://localhost:${env.API_PORT}${incomingMessage.url}`, {
    method: incomingMessage.method,
    headers: headers,
    body:
      incomingMessage.method === 'GET' || incomingMessage.method === 'HEAD'
        ? null
        : (Readable.from(incomingMessage) as unknown as BodyInit),
  });
}

export const runEiffelApi = async (
  props: Partial<ApiEnv> = {},
): Promise<EventEmitter<EiffelApiEvents>> => {
  logger.log('***STARTING EIFFEL API***');
  const env = getApiEnv(props);
  const db: PersistenceObject = getDb({
    dbType: env.DB_TYPE,
    dbUrl: env.DB_URL,
    chainId: env.CHAIN_ID,
    ssl: env.DB_SSL,
    dbName: env.DB_NAME,
  });
  await db.init();

  const apiEventEmitter = new EventEmitter<EiffelApiEvents>();

  const router = await createFileSystemBasedRouter(db);

  const server = env.GPAPHQL
    ? await (async () => {
        const { createGraphqlServer } = await import('./graphql/index.js');
        const yoga = createGraphqlServer(db);
        return http.createServer(yoga.fetch.bind(yoga)).listen(env.API_PORT);
      })()
    : http
        .createServer(async (req, res) => {
          // Handle CORS preflight requests
          if (req.method === 'OPTIONS') {
            const handlerResponse = new ResponseWithCors('Departed');
            handlerResponseToServerResponse(handlerResponse, res);
            res.end(await handlerResponse.text());
            return;
          }

          router
            .route(incommingMessageToWebRequest(req))
            .then(async (routeHandlerResult) => {
              let handlerResponse: Response = routeHandlerResult as Response;
              if (!(routeHandlerResult instanceof Response)) {
                // assume response is a JSON object
                handlerResponse = new ResponseWithCors(
                  JSON.stringify(routeHandlerResult),
                );
              }

              handlerResponseToServerResponse(handlerResponse, res);
              res.end(JSON.stringify(await handlerResponse.json()));
            });
        })
        .listen(env.API_PORT);

  server.on('listening', () => {
    logger.log(`EIFFEL API listening on ${JSON.stringify(server.address())}`);
    apiEventEmitter.emit('listening', server.address());
  });

  process.on('exit', () => {
    db.disconnect();
    process.exit();
  });

  return apiEventEmitter;
};

if (isEsMain(import.meta)) {
  runEiffelApi();
}

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});
