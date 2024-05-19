import { OutgoingHttpHeaders } from 'node:http';
const CORS_HEADERS = {
  headers: {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'OPTIONS, HEAD, GET, POST, PUT, PATCH, DELETE',
    'access-control-allow-headers': 'Content-Type',
    'content-type': 'application/json',
  } as OutgoingHttpHeaders,
} as const;

export class ResponseWithCors extends Response {
  constructor(body: string, init?: ResponseInit) {
    super(body, { ...CORS_HEADERS, ...(init as any) });
  }
}
