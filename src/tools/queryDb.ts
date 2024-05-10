import { getEnv } from '../env.js';
import { getDb } from '../utils/getDb.js';

const db = getDb({
  chainId: getEnv().CHAIN_ID,
  dbType: getEnv().DB_TYPE,
  dbUrl: getEnv().DB_URL,
  ssl: getEnv().DB_SSL,
});

console.log(await db.filter({ table: 'events', limit: 0 }));
console.log(await db.filter({ table: 'indexing_status', limit: 0 }));

await db.disconnect();
process.exit();
