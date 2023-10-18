import { MongoDBPersistence } from '../database/mongoPersistence';
import { PostgresPersistence } from '../database/postgresPersistence';
import { SqlitePersistence } from '../database/sqlitePersistence';
import { PersistenceObject } from '../types';

export const getDb = ({
  chainId,
  dbType,
  dbUrl,
  dbName,
  clearDb,
  ssl
}: {
  dbType: string;
  chainId: number;
  dbUrl: string;
  clearDb?: boolean;
  ssl?: boolean;
  dbName?: string;
}): PersistenceObject => {
  switch(dbType) {
    case 'postgres':
      return new PostgresPersistence(chainId, dbUrl, clearDb, ssl);
    case 'sqlite':
      return new SqlitePersistence(chainId, dbUrl, clearDb);
    case 'mongo':
      return new MongoDBPersistence(chainId, dbUrl, dbName ?? 'default', clearDb);
    default:
      throw new Error(`Unsupported db type ${dbType}`);
  }
};
