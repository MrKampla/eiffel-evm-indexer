import { EventLogsFetcher } from './indexer/eventLogsFetcher.js';
import { Indexer } from './indexer/index.js';
import { ViemClient } from './rpcClient/viemClient.js';
import { PersistenceObject } from './types.js';
import { getDb } from './utils/getDb.js';
import isEsMain from 'es-main';
import { Env, getEnv } from './env.js';

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

process.on('unhandledRejection', (reason) => {
  console.error(reason);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error(error);
  process.exit(1);
});
