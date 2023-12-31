import { EventLogsFetcher } from './indexer/eventLogsFetcher';
import { Indexer } from './indexer';
import { ViemClient } from './rpcClient/viemClient';
import { PersistenceObject } from './types';
import { getDb } from './utils/getDb';
import { env } from './env';

export const runEiffelIndexer = async () => {
  const viemClient = new ViemClient();
  const viemEventsFetcher = new EventLogsFetcher(viemClient);
  const db: PersistenceObject = getDb({
    dbType: env.DB_TYPE,
    dbUrl: env.DB_URL,
    chainId: env.CHAIN_ID,
    clearDb: env.CLEAR_DB,
    ssl: env.DB_SSL,
    dbName: env.DB_NAME,
  });

  new Indexer(db, viemEventsFetcher, viemClient).run();
};

if (import.meta.main) {
  await runEiffelIndexer();
}
