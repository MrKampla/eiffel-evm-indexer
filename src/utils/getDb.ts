import { PostgresPersistance } from '../database/postgresPersistance';
import { SqlitePersistance } from '../database/sqlitePersistance';
import { PersistanceObject } from '../types';

export const getDb = ({
  chainId,
  dbType,
  dbUrl,
  clearDb,
}: {
  dbType: string;
  chainId: number;
  dbUrl: string;
  clearDb?: boolean;
}): PersistanceObject => {
  const db: PersistanceObject =
    dbType === 'postgres'
      ? new PostgresPersistance(chainId, dbUrl, clearDb)
      : new SqlitePersistance(chainId, dbUrl, clearDb);

  return db;
};
