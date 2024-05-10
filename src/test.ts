import { decodeFunctionResult, parseAbi } from 'viem';
import { runEiffelApi } from './api';
import { runEiffelIndexer } from './main';
import assert from 'assert';
import { expect } from 'chai';

runEiffelIndexer({
  CLEAR_DB: true,
  CHAIN_ID: 31337,
  CHAIN_RPC_URLS: ['http://127.0.0.1:8545'],
  TARGETS: [
    {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      abiItem: {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'uint256',
            name: 'initTime',
            type: 'uint256',
          },
          {
            indexed: false,
            internalType: 'address',
            name: 'owner',
            type: 'address',
          },
        ],
        name: 'Initialized',
        type: 'event',
      },
    },
    {
      address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      abiItem: {
        anonymous: false,
        inputs: [
          {
            indexed: false,
            internalType: 'bytes',
            name: 'data',
            type: 'bytes',
          },
        ],
        name: 'DataEvent',
        type: 'event',
      },
    },
  ],
  DB_TYPE: 'sqlite',
  DB_URL: 'test.db',
  DB_SSL: false,
  BLOCK_CONFIRMATIONS: 0n,
  BLOCK_FETCH_BATCH_SIZE: 1n,
  BLOCK_FETCH_INTERVAL: 1000,
  REORG_REFETCH_DEPTH: 0n,
  START_FROM_BLOCK: 0n,
});
runEiffelApi({
  API_PORT: 8080,
  CHAIN_ID: 31337,
  DB_TYPE: 'sqlite',
  DB_URL: 'test.db',
});
