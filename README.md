# 🗼 EIFFEL: Easy Indexer For Frickin EVM Logs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is a simple Typescript indexer for any smart contract event logs on any EVM chain based soley on the contract ABI (no custom code). It saves event data into either postgres database or SQLite (in-memory or file). Indexer comes with a REST API to query indexed data.

You just have to provide an RPC url (public works too!), chain ID and ABI of a target contract. No need to write any code or use any SDKs, archives or other bullshit.

## Deployment

### environment variables

In order to run the indexer you don't have to write any code. Every contract can be indexed just by providing a contract ABI and a target address. This indexer comes with an ABI parser CLI tool that can be used to generate a list of targets for indexer.

1. install dependencies:

   ```bash
   bun install
   ```

2. run the ABI parser tool:

   ```bash
   bun run create:targets -a <path to ABI file> -e <event names to index separated by space>
   ```

   example:

   ```bash
   bun run create:targets -a ./abi.json -e "Transfer" "Approval"
   ```

   This will generate a list of targets in a file `targets.json`. **Do not modify this file!**

3. fill in the environment variables in the docker compose file for the appropriate environment (dev or prod):

   For indexer:

   - Required:

     ```bash
     CHAIN_ID=<number> e.g. 137
     CHAIN_RPC_URL=<string> e.g. https://polygon-rpc.com/
     START_FROM_BLOCK=<number> e.g. 0 to start from genesis block
     ```

   - Optional:

     ```bash
     BLOCK_CONFIRMATIONS: <number> default: 5
     BLOCK_FETCH_INTERVAL: <number> in miliseconds, default: 1000
     BLOCK_FETCH_BATCH_SIZE: <number> default: 1000
     DB_TYPE: <'postgres' | 'sqlite'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string,  default: 'events.db' (for SQLite)
     ```

   For API:

   ```bash
     CHAIN_ID=<number> e.g. 137
     API_PORT: <number> default 8080
     DB_TYPE: <'postgres' | 'sqlite'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string, default: 'events.db' (for SQLite)
   ```

4. run docker compose for dev or prod environment:

   ```bash
   docker compose -f docker-compose.[env].yml up
   ```

   This will start the indexer and the API server.

   Enjoy indexed data with zero latency and no costs!

## Querying data

Event logs are saved to the `events` table and the indexed block number is saved in `indexing_status` table.

```ts
interface EventLog {
  address: string; // address of the source contract that emitted the event
  blockNumber: number;
  eventName: string;
  args: Record<string, any>; // event arguments in a JSON.stringify text
  chainId: number;
}

interface IndexingStatus {
  chainId: number;
  blockNumber: number;
}
```

You can query them with the following API endpoints:

- `/api/events` - returns all events
- `/api/indexing_status` - returns the latest indexed block number for a chain ID specified in the environment variables

Requests to the `/api/events` endpoint are configurable with following query parameters:

- top level fields of the `EventLog` interface e.g. `address`, `blockNumber`, `eventName`, `chainId`
  - `/api/events?address=0x123&blockNumber=1234&eventName=Transfer`
- event arguments of the event in the `args` field (custom to every contract event) e.g. for ERC-20 transfer event: `args.amount`, `args.from`, `args.to`
  - `/api/events?args_amount=1000&args_from=0x123&args_to=0x456`
- filters (lt, lte, gt, gte, eq, neq) for top level fields and event arguments
  - `/api/events?filter_lt_blockNumber=1000&filter_gte_args_amount=1000`
- pagination (limit, offset)
  - `/api/events?limit=10&offset=10`
- sorting (numeric sorting and text sorting) over top level fields or event arguments (asc, desc)
  - `/api/events?sort_text_address=asc`
  - `/api/events?sort_int_blockNumber=asc`
  - `/api/events?sort_text_args_user=desc`
  - `/api/events?sort_int_args_amount=desc`
