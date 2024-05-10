import { ResponseWithCors } from '../responseWithCors.js';
import packageJson from '../../../package.json' with { type: "json" };

export default () =>
  new ResponseWithCors(
    JSON.stringify({
      message: 'Welcome to EIFFEL API!',
      version: packageJson.version,
    }),
  );
