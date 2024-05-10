import fs from 'node:fs';
import { PersistenceObject } from '../types.js';
import { ResponseWithCors } from './responseWithCors.js';
import { logger } from '../utils/logger.js';
import http from 'node:http';
import { FileSystemRouter, MatchedRoute } from './fileSystemRouter.js';
import path from 'node:path';

export type Handler = (
  req: http.IncomingMessage,
  db: PersistenceObject,
) => Promise<Response | {}>;

const findClosestNodeModulesPath = (dir: string): string => {
  if (fs.existsSync(`${dir}/node_modules`)) {
    if (fs.existsSync(`${dir}/node_modules/eiffel-evm-indexer`)) {
      return `${dir}/node_modules/eiffel-evm-indexer`;
    }
    return `${dir}/dist`;
  }
  return findClosestNodeModulesPath(path.dirname(dir));
};

export const createFileSystemBasedRouter = async (db: PersistenceObject) => {
  const nodeModulesPackageDistPath = findClosestNodeModulesPath(
    import.meta.url.slice('file://'.length),
  );

  logger.log(
    `Scanning for default endpoints in ${nodeModulesPackageDistPath}/api/endpoints...`,
  );
  const defaultEndpointsFsRouter = new FileSystemRouter({
    dir: `${nodeModulesPackageDistPath}/api/endpoints`,
  });
  logger.log(
    `Found ${
      defaultEndpointsFsRouter ? Object.keys(defaultEndpointsFsRouter.routes).length : 0
    } default endpoints`,
  );

  logger.log(`Scanning for custom endpoints in ${process.cwd()}/endpoints...`);
  const areCustomEndpointsDefined = fs.existsSync(`${process.cwd()}/endpoints`);
  const customEndpointsFsRouter = areCustomEndpointsDefined
    ? new FileSystemRouter({
        dir: `${process.cwd()}/endpoints`,
      })
    : undefined;
  logger.log(
    `Found ${
      customEndpointsFsRouter ? Object.keys(customEndpointsFsRouter.routes).length : 0
    } custom endpoints`,
  );

  const handlersCache = new Map<string, Handler>();

  return {
    route: async (request: http.IncomingMessage): Promise<Response | {}> => {
      request.url = `http://localhost${request.url}`;
      const apiPath = new URL(request.url!).pathname;
      const preloadedRequestHandler =
        handlersCache.get(apiPath) ?? handlersCache.get(`${apiPath}/`);
      if (preloadedRequestHandler) {
        return preloadedRequestHandler(request, db);
      }

      const invokeEndpointHandler = async (matchedRoute: MatchedRoute) => {
        try {
          const routeHandler = (await import(matchedRoute.filePath)).default as (
            req: http.IncomingMessage,
            db: PersistenceObject,
          ) => Promise<Response | {}>;
          handlersCache.set(`${apiPath}/`, routeHandler);
          return routeHandler(request, db);
        } catch (e) {
          console.error(e);
          return new ResponseWithCors(
            JSON.stringify({
              error: `Default handler function for ${new URL(request.url ?? 'http://localhost/').pathname} module not found`,
            }),
            {
              status: 500,
            },
          );
        }
      };

      const matchedFile = defaultEndpointsFsRouter.match(
        new URL(request.url!).pathname.replace('/api', ''),
      );
      if (matchedFile) {
        return invokeEndpointHandler(matchedFile);
      }

      const matchedCustomEndpointFile = customEndpointsFsRouter?.match(
        new URL(request.url!).pathname.replace('/api', ''),
      );
      if (matchedCustomEndpointFile) {
        return invokeEndpointHandler(matchedCustomEndpointFile);
      }

      return Promise.resolve(
        new ResponseWithCors(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
    },
  };
};
