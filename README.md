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
     BLOCK_FETCH_BATCH_SIZE: <number> how many blocks should be fetched in a single batch request, default: 1000
     DB_TYPE: <'postgres' | 'sqlite'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string, for sqlite it is a file name,  default: 'events.db' (for SQLite)
     CLEAR_DB: <boolean> clears the db before starting the indexer, usefull for development, default: false
     ```

   For API:

   ```bash
     CHAIN_ID=<number> e.g. 137
     API_PORT: <number> default 8080
     DB_TYPE: <'postgres' | 'sqlite'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string, for SQLite it can be a path to the file or in-memory specifier ('memory') default: 'events.db' (for SQLite).
     GRAPHQL: <string> 'true' | 'false' - enables GraphQL API instead of rest
   ```

4. run docker compose for dev or prod environment:

   ```bash
   docker compose -f docker-compose.[env].yml up
   ```

   This will start the indexer and the API server. Dev docker file will autoreload the indexer and the API on every code change. Prod one is optimized for production - you just have to pass the environment variables to the container.

5. Enjoy indexed data with zero latency and no costs!

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

- filters (EQ, LT, LTE, GT, GTE, NEQ)
  - `/api/events?where=address:EQ:0x2791bca1f2de4661ed88a30c99a7a9449aa84174&where=blockNumber:GT:INT:48358310`
  OR
  - `/api/events?where=address:EQ:0x2791bca1f2de4661ed88a30c99a7a9449aa84174,blockNumber:GT:INT:48358310`
  OR 
  - `/api/events?where=args_from:NEQ:0x25aB3Efd52e6470681CE037cD546Dc60726948D3,args_value:EQ:1053362095,blockNumber:GT:INT:48358310`
- pagination (limit, offset)
  - `/api/events?limit=10&offset=10`
- sorting (numeric sorting and text sorting) over top level fields or event arguments (asc, desc)
  - `/api/events?sort=address:ASC`
  - `/api/events?sort=blockNumber:INT:ASC`
  - `/api/events?sort=args_from:DESC`
  - `/api/events?sort=args_value:INT:DESC`

If you are using GraphQL endpoint, then you should send GraphQL queries to `POST /api/graphql`.

Example for events:
```graphql
query {
  events(
    where: [
        {
            field: "address",
            operator: EQ,
            value: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
        }
    ],
    sort: [
        {
            field: "address",
            direction: DESC,
            type: TEXT
        }
    ],
    limit: 10,
    offset: 20
  ) {
    id
    address
    blockNumber
    eventName
    args
    chainId
  }
}
```

For indexing status:

```graphql
query {
    indexing_status {
        blockNumber
        chainId
  }
}
```