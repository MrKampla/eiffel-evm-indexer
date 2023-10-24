import { PersistenceObject } from '../types';
import urlParser from 'node:url';
import { ResponseWithCors } from './responseWithCors';
import fs from 'fs/promises';

type Handler = (req: Request, db: PersistenceObject) => Promise<Response>;

export const createRouter = (db: PersistenceObject) => ({
  handlers: [] as { path: string; handler: Handler }[],
  when(path: string, handler: Handler) {
    this.handlers.push({ path, handler });
    return this;
  },
  route(request: Request): Promise<Response> {
    const handler = this.handlers.find(
      ({ path }) => urlParser.parse(request.url).pathname === path,
    );
    if (!handler) {
      return Promise.resolve(
        new ResponseWithCors(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
    }
    return handler.handler(request, db);
  },
});

export const createFileSystemBasedRouter = async (db: PersistenceObject) => {
  const endpoints = await fs.readdir(`${__dirname}/endpoints`);
  const router = createRouter(db);

  endpoints.forEach(async (endpoint) => {
    const handleRequest = (await import(`./endpoints/${endpoint}`)).default as (
      req: Request,
      db: PersistenceObject,
    ) => Promise<Response>;

    if (endpoint === 'index.ts') {
      router.when(`/`, handleRequest);
      return;
    }

    const endpointName = endpoint.split('.')[0];
    router.when(`/api/${endpointName}`, handleRequest);
  });

  return router;
};
