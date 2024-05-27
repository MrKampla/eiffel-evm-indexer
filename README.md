# 🗼 EIFFEL: Easy Indexer For Frickin EVM Logs

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

This is a simple Typescript indexer for any smart contract event logs on any EVM chain based soley on the contract ABI (no custom code needed to run but is extendable if you want). It saves event data into either postgres, MongoDB or SQLite (in-memory or file). Indexer comes with a REST API to query indexed data.

You just have to provide an RPC url (public works too!), chain ID and ABI of a target contract with address. No need to write any code or use any SDKs, archives or other bullshit.

Indexer is easily extendable with custom actions and custom API endpoints. Run your own logic when an
event is indexed and query the data however you want in your custom API endpoints.

- [🗼 EIFFEL: Easy Indexer For Frickin EVM Logs](#-eiffel-easy-indexer-for-frickin-evm-logs)
  - [How to run](#how-to-run)
  - [Deployment](#deployment)
    - [Programmatic start](#programmatic-start)
    - [ABI Parser Tool](#abi-parser-tool)
  - [Querying data](#querying-data)
    - [Filters (EQ, EQCI (case insensitive equals), LT, LTE, GT, GTE, NEQ, IN, NOTIN)](#filters-eq-eqci-case-insensitive-equals-lt-lte-gt-gte-neq-in-notin)
    - [Pagination (limit, offset)](#pagination-limit-offset)
    - [Sorting (numeric sorting and text sorting) over top level fields or event arguments (asc, desc)](#sorting-numeric-sorting-and-text-sorting-over-top-level-fields-or-event-arguments-asc-desc)
    - [Counting](#counting)
  - [Custom API endpoints](#custom-api-endpoints)
  - [Custom event handlers (actions)](#custom-event-handlers-actions)
    - [Example](#example)
  - [GraphQL (NOT PRODUCTION READY)](#graphql-not-production-ready)
  - [Issues](#issues)
    - [Knex SQLite connection in Bun is missing bindings](#knex-sqlite-connection-in-bun-is-missing-bindings)

## How to run

In order to run the indexer you don't have to write any code. Every contract can be indexed just by providing a contract ABI and a target address. This indexer comes with an ABI parser CLI tool that can be used to generate a list of targets for indexer.

1. Install [Node](https://nodejs.org) or [Bun](https://bun.sh) runtime and create a new repo.
2. Install eiffel-evm-indexer npm package:

   ```bash
   npm i eiffel-evm-indexer
    # or
   bun i eiffel-evm-indexer
   ```

3. In the directory from which you will run indexer, create a file `targets.json` (either manually or parse hardhat deployment ouput with [ABI Parser Tool](#abi-parser-tool)) with the following structure:

   ```ts
   [
     {
       // event ABI item
       abiItem: {
         anonymous: false,
         inputs: [
           {
             indexed: false,
             internalType: 'address',
             name: 'addressInput',
             type: 'address',
           },
           {
             indexed: false,
             internalType: 'uint256',
             name: 'uintInput',
             type: 'uint256',
           },
         ],
         name: 'MyEventName',
         type: 'event',
       },
       // address of the contract that emits the event
       address: '0x3a2Eb2622B4f10de9E78bd2057a0AB7a6F70B95F',
     },
   ];
   ```

   > If you want to index events from multiple contracts, then you can add multiple objects to the array.

4. In the directory from which you will run indexer, create a `.env` file and fill in the environment variables:

   For indexer:

   - Required:

     ```bash
     CHAIN_ID=<number> e.g. 137
     CHAIN_RPC_URLS=<string[]> e.g. ["https://polygon-rpc.com/"]
     START_FROM_BLOCK=<number> e.g. 0 to start from genesis block
     ```

   - Optional:

     ```bash
     BLOCK_CONFIRMATIONS: <number> default: 5
     BLOCK_FETCH_INTERVAL: <number> in miliseconds, default: 1000
     BLOCK_FETCH_BATCH_SIZE: <number> how many blocks should be fetched in a single batch request, default: 1000
     DB_TYPE: <'postgres' | 'sqlite' | 'mongo'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string, for sqlite it is a file name,  default: 'events.db' (for SQLite)
     CLEAR_DB: <boolean> clears the db before starting the indexer, useful for development, default: false
     REORG_REFETCH_DEPTH: <number> how many latest blocks should be refetched when fully indexed, default: 0 (no refetch)
     ```

   For API:

   ```bash
     CHAIN_ID= <number> e.g. 137
     API_PORT: <number> default 8080
     DB_TYPE: <'postgres' | 'sqlite' | 'mongo'> default: 'sqlite'
     DB_URL: <string> for postgres it is a connection string, for SQLite it can be a path to the file or in-memory specifier ('memory') default: 'events.db' (for SQLite).
     GRAPHQL: <string> 'true' | 'false' - enables GraphQL API instead of rest
   ```

5. run the indexer:
   EIFFEL comes with two aliases for running the indexer. You can either use full package name `eiffel-evm-indexer`,or a shorter alias `eiffel`.

   ```bash
    # start both indexer and API server in a single process
    npx eiffel # if you use NPM
    bunx eiffel # if you use Bun

    # or start indexer and API server separately
    # if you use NPM
    npx eiffel indexer
    npx eiffel api

    # if you use Bun
    bunx eiffel indexer
    bunx eiffel api
   ```

6. Enjoy indexed data with zero latency and no costs!

## Deployment

You can deploy the indexer to any cloud provider or your own server. We've prepared example `Dockerfile` and `docker-compose` files in the `./docker` directory.

The `./docker/dev` directory example copies the `src` directory to the docker image and runs the indexer and API server from source code with Bun. This is useful for development and debugging.

### Programmatic start

If you need to start the indexer programmatically instead of with an npm script, you can use the `runEiffelIndexer` and `runEiffelApi` functions from `eiffel-evm-indexer` package.

```ts
import { runEiffelIndexer } from './main';
import { runEiffelApi } from './api/api';

runEiffelIndexer();
runEiffelApi();
```

You can also override env variables by passing them as an argument to the function:

```ts
runEiffelIndexer({
  CHAIN_ID: 137,
  CHAIN_RPC_URLS: ['https://polygon-rpc.com/'],
  START_FROM_BLOCK: 0,
  BLOCK_CONFIRMATIONS: 5,
  BLOCK_FETCH_INTERVAL: 1000,
  BLOCK_FETCH_BATCH_SIZE: 1000,
  DB_TYPE: 'sqlite',
  DB_URL: 'events.db',
  CLEAR_DB: false,
  REORG_REFETCH_DEPTH: 0,
});
runEiffelApi({
  CHAIN_ID: 137,
  API_PORT: 8080,
  DB_TYPE: 'sqlite',
  DB_URL: 'events.db',
});
```

Both `runEiffelIndexer` and `runEiffelApi` functions return an event emitter that emits an event when the given service is started. `runEiffelIndexer` emits `indexing` event and `runEiffelApi` emits `listening` event. You can listen to these events by using the `on` method:

```ts
const indexer = await runEiffelIndexer();
const api = await runEiffelApi();
indexer.on('indexing', () => {
  console.log('Indexer started');
});
api.on('listening', () => {
  console.log('API server started');
});
```

### ABI Parser Tool

Eiffel comes with an ABI parser tool that can be used to generate a list of targets for indexer based on the contracts ABI.

**WARNING**: this tool only accepts Hardhat output ABI from `deployments` directory

```bash
eiffel create:targets -a <path to ABI file> -e <event names to index separated by space>
```

example:

```bash
eiffel create:targets -a ./abi.json -e "Transfer" "Approval"
```

> `-e` flag is optional. If you don't provide it, then all events from a given contract will be indexed.

This will generate a list of targets in a file `targets.json`.

> If you want to index events from multiple contracts, then you can run the `create:targets` command multiple times with differend params and your events will be appended to the targets file.

If you don't have Hardhat output ABI, then you can create `targets.json` file manually. It has a following structure:

```ts
[
  {
    abiItem: {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: 'address',
          name: 'addressInput',
          type: 'address',
        },
        {
          indexed: false,
          internalType: 'uint256',
          name: 'uintInput',
          type: 'uint256',
        },
      ],
      name: 'MyEventName',
      type: 'event',
    },
    address: '0x3a2Eb2622B4f10de9E78bd2057a0AB7a6F70B95F',
  },
];
```

## Querying data

Event logs are saved to the `events` table and the indexed block number is saved in `indexing_status` table.

```ts
interface EventLog {
  address: string; // address of the source contract that emitted the event
  blockNumber: number;
  eventName: string;
  args: Record<string, any>; // event arguments in a JSON.stringify text
  chainId: number;
  transactionHash: string;
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

### Filters (EQ, EQCI (case insensitive equals), LT, LTE, GT, GTE, NEQ, IN, NOTIN)

- `/api/events?where=blockNumber:IN:NUM:1_2_3_4` => queries for block numbers 1, 2, 3 and 4
- `/api/events?where=blockNumber:NOTIN:NUM:1_2_3_4` => queries for block numbers that are not 1, 2, 3 or 4
- `/api/events?where=address:EQCI:0x2791bca1f2de4661ed88a30c99a7a9449aa84174` => case insensitive equals

You can also merge conditions together with a comma `,` in order to build more complex queries:
- `/api/events?where=address:EQ:0x2791bca1f2de4661ed88a30c99a7a9449aa84174,blockNumber:GT:NUM:48358310` => queries for a specific address AND block number greater than specified number
- `/api/events?where=args_from:NEQ:0x25aB3Efd52e6470681CE037cD546Dc60726948D3,args_value:EQ:1053362095,blockNumber:GT:NUM:48358310` => queries for transactions where argument `from` is not equal to a specific value AND `value` param is equal a specific amount AND block number is greater than a specific value

### Pagination (limit, offset)

- `/api/events?limit=10&offset=10`

### Sorting (numeric sorting and text sorting) over top level fields or event arguments (asc, desc)

- `/api/events?sort=address:ASC`
- `/api/events?sort=blockNumber:NUM:ASC`
- `/api/events?sort=args_from:DESC`
- `/api/events?sort=args_value:NUM:DESC`

### Counting

- `/api/events?count` - returns the count of all events that match the query
- `/api/events?where=blockNumber:LT:1337&count` - returns the count of all events that match the query

There are two types of comparison: text and numeric. By default all values are compared by text. If you want to compare by number, then you have to specify the type of the field in the query parameter. For example, if you want to sort by block number, then you have to specify that it is a numeric field: `sort=blockNumber:NUM:ASC`. This also works for `where` filters e.g. `where=blockNumber:GT:NUM:48358310`.

If you have multiple `where` clauses, then you can separate them by a comma, for example:
`/api/events?where=address:EQ:0x2791bca1f2de4661ed88a30c99a7a9449aa84174,blockNumber:GT:NUM:48358310`

## Custom API endpoints

You can create your own API endpoints by adding request handlers by creating a `./endpoints` directory (in the same directory from which you will be run) and adding files with request handlers to it. Name of the file will be the name of the endpoint (Next.js style) and the endpoint will be available at `/api/<endpoint-name>`.
Request handler file has to `export default` a function with the following signature:

```ts
(request: Request, db: PersistenceObject) => Promise<ResponseWithCors | {}>;
```

Where `Request` is a standard request object from the `http` module, `db` is a database object that you can use to query the database and the return type is either `ResponseWithCors` (which is a standard response object with CORS headers) or any JSON serializable object.

Example `./endpoints/custom-endpoint.ts`:

```ts
import { SqlPersistenceBase } from '../../../database/sqlPersistenceBase';

// You have access to the db and the request object.
// If you use SQL based database, you can use the SqlPersistenceBase type in order to get
// better type safety. For MongoDB, just use PersistenceObject<MongoClient>.
export default async (request: Request, db: SqlPersistenceBase) => {
  // you can use the request object to get query parameters, headers, etc.
  const { searchParams } = new URL(request.url);
  const amount = +(searchParams.get('amount') ?? 0);

  // you can use the db to query the database
  const knex = db.getUnderlyingDataSource();
  const result = (
    await db.queryOne<{ result: number }>(
      knex.raw(`SELECT 1 + ${amount} AS result`).toQuery(),
    )
  ).result;

  return {
    result,
  };
};
```

You should be able to access your endpoint at `/api/custom-endpoint`.

## Custom event handlers (actions)

You can add a custom logic that will be run on every batch that was indexed. You can create your own actions by adding them to the `./actions` directory. This directory has to be in the same directory from which you will be running the indexer command. Event handler file has to `export default` an object with the following structure:

```ts
interface Action<DBType = unknown, BlockchainClientType = unknown> {
  onInit: (
    db: PersistenceObject<DBType>,
    blockchainClient: BlockchainClient<BlockchainClientType>,
  ) => Promise<void>;
  onClear: (db: PersistenceObject<DBType>) => Promise<void>;
  onBatchIndexed: (actionProps: {
    db: PersistenceObject<DBType>;
    eventLogsBatch: EventLog[];
    indexedBlockNumber: bigint;
    blockchainClient: BlockchainClient<BlockchainClientType>;
  }) => Promise<void>;
}
```

This is useful for example for saving the selected data in a different table, sending notifications, etc.
Actions work well with custom API endpoints. You can query the tables that you've prepared in actions.

### Example

> I have a order book based DEX. I want to only save orders that haven't been filled before. My DEX emits two events: "OrderCreated" and "OrderFilled" with "tokenId" as an event property.

Although our REST API query capabilities are strong, it's not possible to create such a query yet just with search params. So we can create a custom action that will save orders to a different table,
wait for "OrderFilled" events and when this happens, it'll delete the filled order from the table.

Let's create a custom action file `.//actions/storeUnfilledOrders.ts`:

```ts
import { Action } from '.';
import { Knex } from 'knex';
import { SqlPersistenceBase } from '../../database/sqlPersistenceBase';

const whenOrderIsFilled: Action<Knex, SqlPersistenceBase> = {
  async onClear(db: SqlPersistenceBase) {
    const knex = db.getUnderlyingDataSource();
    const query = knex.schema.dropTableIfExists('unfilled_orders').toQuery();
    await db.queryAll(query);
  },
  async onInit(db) {
    await db.queryAll(
      db
        .getUnderlyingDataSource()
        .schema.createTableIfNotExists('unfilled_orders', (table) => {
          table.text('tokenId').primary();
        })
        .toQuery(),
    );
  },
  async onBatchIndexed({ db, eventLogsBatch }) {
    const orderCreatedEvents = eventLogsBatch.filter(
      ({ eventName }) => eventName === 'PublicOrderCreated',
    );
    const orderFilledEvents = eventLogsBatch.filter(
      ({ eventName }) => eventName === 'PublicOrderFilled',
    );

    if (orderCreatedEvents.length > 0) {
      const query = db
        .getUnderlyingDataSource()
        .insert(
          orderCreatedEvents.map((event) => ({
            tokenId: event.args.tokenId.toString(),
          })),
        )
        .into('unfilled_orders')
        .toQuery();

      await db.queryAll(query);
    }

    if (orderFilledEvents.length === 0) return;

    const query = db
      .getUnderlyingDataSource()
      .delete()
      .from('unfilled_orders')
      .whereIn(
        'tokenId',
        orderFilledEvents.map((event) => event.args.tokenId.toString()),
      )
      .toQuery();

    await db.queryAll(query);
  },
};

export default whenOrderIsFilled;
```

Then we can create a custom API endpoint that will query the orders table and return only unfilled orders.
Create a file `./endpoints/unfilled-orders.ts`:

```ts
import { ResponseWithCors } from '../../responseWithCors';
import { SqlPersistenceBase } from '../../../database/sqlPersistenceBase';

export default async (_request: Request, db: SqlPersistenceBase) => {
  return await db.queryAll(
    db.getUnderlyingDataSource().select().from('unfilled_orders').toQuery(),
  );
};
```

Now the endpoint should be available at `/api/unfilled-orders`.

If you want to copy the functionality of filtering and sorting results which is described in [querying data](#querying-data) section, you can use `filterEventsWithURLParams` function which can be imported from `eiffel-evm-indexer` package.

```ts
import { filterEventsWithURLParams } from 'eiffel-evm-indexer';
```

## GraphQL (NOT PRODUCTION READY)

If you want to use GraphQL endpoint, then you should send GraphQL queries to `POST /api/graphql`.

> **WARNING** There is currently a limitation to the GraphQL api: you cannot query by event arguments. This will be fixed in the future by providing an option to extend the GraphQL schema with custom types defined by user.

Example for events:

```graphql
query {
  events(
    where: [
      {
        field: "address"
        operator: EQ
        value: "0x2791bca1f2de4661ed88a30c99a7a9449aa84174"
      }
    ]
    sort: [{ field: "address", direction: DESC, type: TEXT }]
    limit: 10
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

## Issues

### Knex SQLite connection in Bun is missing bindings

Knex DB connection wiht SQLite in Bun doesn't work due to missing bindings. This issue is caused by postinstall scripts not being run for packages that are not listed as trusted. [This issue](https://github.com/oven-sh/bun/issues/4959) tracks the problem. Apparently, there is a solution to that but I couldn't get the Indexer to work in docker so for now please only use Knex as a querybuilder if you use SQLite. For Postgres it works fine.
