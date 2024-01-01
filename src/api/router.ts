import fs from 'node:fs';
import { PersistenceObject } from '../types';
import { ResponseWithCors } from './responseWithCors';
import { MatchedRoute } from 'bun';
import { logger } from '../utils/logger';
import { FileSystemRouter } from 'bun';

export type Handler = (req: Request, db: PersistenceObject) => Promise<Response>;

export const createFileSystemBasedRouter = async (db: PersistenceObject) => {
  const defaultEndpointsFsRouter = new FileSystemRouter({
    style: 'nextjs',
    dir: `${import.meta.dir}/endpoints`,
  });
  logger.log(`Scanning for custom endpoints in ${process.cwd()}/endpoints...`);
  const areCustomEndpointsDefined = fs.existsSync(`${process.cwd()}/endpoints`);
  const customEndpointsFsRouter = areCustomEndpointsDefined
    ? new FileSystemRouter({
        style: 'nextjs',
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
    route: async (request: Request): Promise<Response> => {
      const apiPath = new URL(request.url).pathname;
      const preloadedRequestHandler =
        handlersCache.get(apiPath) ?? handlersCache.get(`${apiPath}/`);
      if (preloadedRequestHandler) {
        return preloadedRequestHandler(request, db);
      }

      const invokeEndpointHandler = async (matchedRoute: MatchedRoute) => {
        const routeHandler = (await import(matchedRoute.filePath)).default as (
          req: Request,
          db: PersistenceObject,
        ) => Promise<Response>;
        handlersCache.set(`${apiPath}/`, routeHandler);
        return routeHandler(request, db);
      };

      const matchedFile = defaultEndpointsFsRouter.match(
        new URL(request.url).pathname.replace('/api', ''),
      );
      if (matchedFile) {
        return invokeEndpointHandler(matchedFile);
      }

      const matchedCustomEndpointFile = customEndpointsFsRouter?.match(
        new URL(request.url).pathname.replace('/api', ''),
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
