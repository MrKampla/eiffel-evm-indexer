import { ResponseWithCors } from '../responseWithCors';
import packageJson from '../../../package.json';

export default () =>
  new ResponseWithCors(
    JSON.stringify({
      message: 'Welcome to EIFFEL API!',
      version: packageJson.version,
    }),
  );
