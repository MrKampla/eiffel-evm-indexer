import { env } from '../env';
import { getDb } from '../utils/getDb';

const db = getDb({
  chainId: env.CHAIN_ID,
  dbType: env.DB_TYPE,
  dbUrl: env.DB_URL,
  ssl: env.DB_SSL,
});

console.log(await db.filter('events', [], [], 0, 0));
console.log(await db.filter('indexing_status', [], [], 0, 0));

await db.disconnect();
process.exit();
