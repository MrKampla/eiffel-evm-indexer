import { env } from '../env';
import { getDb } from '../utils/getDb';

const db = getDb({
  chainId: env.CHAIN_ID,
  dbType: env.DB_TYPE,
  dbUrl: env.DB_URL,
});

console.log(await db.queryAll('SELECT * FROM events'));
console.log(await db.queryAll('SELECT * FROM indexing_status'));

await db.disconnect();
process.exit();
