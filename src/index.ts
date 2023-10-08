import { EventLogsFetcher } from './indexer/eventLogsFetcher';
import { Indexer } from './indexer';
import { ViemClient } from './rpcClient/viemClient';
import { PersistanceObject } from './types';
import { getDb } from './utils/getDb';
import { env } from './env';

const viemClient = new ViemClient();
const viemEventsFetcher = new EventLogsFetcher(viemClient);
const db: PersistanceObject = getDb({
  dbType: env.DB_TYPE,
  dbUrl: env.DB_URL,
  chainId: env.CHAIN_ID,
});

new Indexer(db, viemEventsFetcher).run();
