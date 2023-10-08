import { PostgresPersistance } from '../database/postgresPersistance';
import { SqlitePersistance } from '../database/sqlitePersistance';
import { PersistanceObject } from '../types';

export const getDb = ({
  chainId,
  dbType,
  dbUrl,
}: {
  dbType: string;
  chainId: number;
  dbUrl: string;
}): PersistanceObject => {
  const db: PersistanceObject =
    dbType === 'postgres'
      ? new PostgresPersistance(chainId, dbUrl)
      : new SqlitePersistance(chainId, dbUrl);

  return db;
};
