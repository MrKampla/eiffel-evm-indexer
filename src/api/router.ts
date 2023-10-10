import { PersistanceObject } from '../types';
import urlParser from 'node:url';
import { ResponseWithCors } from './responseWithCors';

type Handler = (request: Request, db: PersistanceObject) => Promise<Response>;

export const router = (request: Request, db: PersistanceObject) => ({
  handlers: [] as { path: string; handler: Handler }[],
  when(path: string, handler: Handler) {
    this.handlers.push({ path, handler });
    return this;
  },
  route(url: string): Promise<Response> {
    const handler = this.handlers.find(
      ({ path }) => urlParser.parse(url).pathname === path,
    );
    if (!handler) {
      return Promise.resolve(
        new ResponseWithCors(JSON.stringify({ error: 'Not found' }), { status: 404 }),
      );
    }
    return handler.handler(request, db);
  },
});
