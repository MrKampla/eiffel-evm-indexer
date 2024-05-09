import { EventLogsFetcher } from './indexer/eventLogsFetcher';
import { Indexer } from './indexer';
import { ViemClient } from './rpcClient/viemClient';
import { PersistenceObject } from './types';
import { getDb } from './utils/getDb';
import isEsMain from 'es-main';
import { Env, getEnv } from './env';

export const runEiffelIndexer = async (props: Partial<Env> = {}) => {
  const viemClient = new ViemClient();
  const viemEventsFetcher = new EventLogsFetcher(viemClient);
  const env = getEnv(props);
  const db: PersistenceObject = getDb({
    dbType: env.DB_TYPE,
    dbUrl: env.DB_URL,
    chainId: env.CHAIN_ID,
    clearDb: env.CLEAR_DB,
    ssl: env.DB_SSL,
    dbName: env.DB_NAME,
  });

  const indexer = new Indexer(db, viemEventsFetcher, viemClient);

  setImmediate(() => indexer.run());

  return indexer.eventEmitter;
};

if (isEsMain(import.meta)) {
  await runEiffelIndexer();
}
