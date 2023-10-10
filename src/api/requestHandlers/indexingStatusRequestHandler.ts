import { env } from '../envApi';
import { PersistanceObject } from '../../types';
import { ResponseWithCors } from '../responseWithCors';

export const handleIndexingStatusRequest = async (
  _request: Request,
  db: PersistanceObject,
) =>
  new ResponseWithCors(
    JSON.stringify(
      await db.queryOne(
        `SELECT * FROM indexing_status WHERE "chainId" = '${env.CHAIN_ID}'`,
      ),
    ),
  );
