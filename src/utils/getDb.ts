import { MongoDBPersistence } from '../database/mongoPersistence.js';
import { PostgresPersistence } from '../database/postgresPersistence.js';
import { SqlitePersistence } from '../database/sqlitePersistence.js';
import { PersistenceObject } from '../types.js';

export const getDb = ({
  chainId,
  dbType,
  dbUrl,
  dbName,
  clearDb,
  ssl,
}: {
  dbType: string;
  chainId: number;
  dbUrl: string;
  clearDb?: boolean;
  ssl?: boolean;
  dbName?: string;
}): PersistenceObject => {
  switch (dbType) {
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
