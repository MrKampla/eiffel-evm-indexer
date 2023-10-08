import { env } from '../envApi';
import { PersistanceObject } from '../../types';

export const handleIndexingStatusRequest = async (
  _request: Request,
  db: PersistanceObject,
) =>
  new Response(
    JSON.stringify(
      await db.queryOne(
        `SELECT * FROM indexing_status WHERE "chainId" = '${env.CHAIN_ID}'`,
      ),
    ),
  );
