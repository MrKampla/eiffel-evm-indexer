import fs from 'node:fs';
import { PersistenceObject } from '../types';
import { ResponseWithCors } from './responseWithCors';
import { MatchedRoute } from 'bun';
import { logger } from '../utils/logger';

const { FileSystemRouter } = Bun;

export type Handler = (req: Request, db: PersistenceObject) => Promise<Response>;

const invokeEndpointHandler = async ({
  request,
  matchedFile,
  handlersCache,
  db,
}: {
  request: Request;
  matchedFile: MatchedRoute;
  handlersCache: Map<string, Handler>;
  db: PersistenceObject;
}) => {
  const apiPath = new URL(request.url).pathname;
  const handler = (await import(matchedFile.filePath)).default as (
    req: Request,
    db: PersistenceObject,
  ) => Promise<Response>;
  handlersCache.set(`${apiPath}/`, handler);
  return handler(request, db);
};

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

      const matchedFile = defaultEndpointsFsRouter.match(
        new URL(request.url).pathname.replace('/api', ''),
      );
      if (matchedFile) {
        return invokeEndpointHandler({ matchedFile, request, db, handlersCache });
      }

      const matchedCustomEndpointFile = customEndpointsFsRouter?.match(
        new URL(request.url).pathname.replace('/api', ''),
      );
      if (matchedCustomEndpointFile) {
        return invokeEndpointHandler({
          matchedFile: matchedCustomEndpointFile,
          request,
          db,
          handlersCache,
        });
      }

      return Promise.resolve(
        new ResponseWithCors(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
    },
  };
};
