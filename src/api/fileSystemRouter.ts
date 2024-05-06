import fs from 'node:fs';
import path from 'node:path';

class FileSystemRouterMatcher {
  routes: MatchedRoute[] = [];

  match(url: string): MatchedRoute | undefined {
    return this.routes.find((route) => route.endpoint === url);
  }
}

export class StaticFileSystemRouter extends FileSystemRouterMatcher {
  constructor({ routes }: { routes: MatchedRoute[] }) {
    super();
    this.routes = routes;
  }
}

export class FileSystemRouter extends FileSystemRouterMatcher {
  _dir: string;

  constructor({ dir }: { dir: string }) {
    super();
    this._dir = dir;
    if (!fs.existsSync(dir)) {
      throw new Error(`Directory ${dir} does not exist`);
    }
    fs.readdirSync(dir, {
      recursive: true,
    }).forEach((file) => {
      const filePath = path.join(dir, file.toString());
      if (!fs.statSync(filePath).isFile() || filePath.endsWith('d.ts')) {
        return;
      }

      const endpoint = filePath
        .replace(`${dir}`, '') // remove the base dir
        .slice(0, -path.extname(filePath).length); // remove the file extension
      const isIndex = endpoint.endsWith('/index'); // remove the index suffix

      this.routes.push({
        filePath,
        endpoint: (isIndex ? endpoint.slice(0, -6) : endpoint) || '/', // append a slash if empty path (index file in root dir)
      });
    });
  }
}

export type MatchedRoute = {
  filePath: string;
  endpoint: string;
};
