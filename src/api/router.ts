import { PersistenceObject } from '../types';
import { ResponseWithCors } from './responseWithCors';

const { FileSystemRouter } = Bun;

type Handler = (req: Request, db: PersistenceObject) => Promise<Response>;

export const createFileSystemBasedRouter = async (db: PersistenceObject) => {
  const fsRouter = new FileSystemRouter({
    style: 'nextjs',
    dir: `${__dirname}/endpoints`,
  });

  const handlersCache = new Map<string, Handler>();

  return {
    route: async (request: Request): Promise<Response> => {
      const apiPath = new URL(request.url).pathname;
      const preloadedRequestHandler =
        handlersCache.get(apiPath) ?? handlersCache.get(`${apiPath}/`);
      if (preloadedRequestHandler) {
        return preloadedRequestHandler(request, db);
      }

      const matchedFile = fsRouter.match(
        new URL(request.url).pathname.replace('/api', ''),
      );
      if (matchedFile) {
        const handler = (await import(matchedFile.filePath)).default as (
          req: Request,
          db: PersistenceObject,
        ) => Promise<Response>;
        handlersCache.set(`${apiPath}/`, handler);
        return handler(request, db);
      }

      return Promise.resolve(
        new ResponseWithCors(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
    },
  };
};
