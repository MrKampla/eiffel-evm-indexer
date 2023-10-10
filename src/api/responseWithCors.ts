const CORS_HEADERS = {
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, POST',
    'Access-Control-Allow-Headers': 'Content-Type',
  },
};

export class ResponseWithCors extends Response {
  constructor(body: string, init?: ResponseInit) {
    super(body, { ...CORS_HEADERS, ...init });
  }
}
