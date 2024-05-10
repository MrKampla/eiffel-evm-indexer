import { ChildProcess, exec } from 'node:child_process';
import { IndexerTarget } from 'src';
import * as viem from 'viem';
import { hardhat } from 'viem/chains';

export const getTestIndexerEnvs = () => ({
  CLEAR_DB: true,
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
  ] as IndexerTarget[],
  BLOCK_CONFIRMATIONS: 0n,
  BLOCK_FETCH_BATCH_SIZE: 1n,
  BLOCK_FETCH_INTERVAL: 1000,
  REORG_REFETCH_DEPTH: 0n,
  START_FROM_BLOCK: 0n,
  CHAIN_ID: 31337,
});

export const startLocalHardhatChainAndWaitForDeployments = async () => {
  const childProcess = exec('cd hardhat && npx hardhat node');
  return new Promise<ChildProcess>(async (res) => {
    const client = viem.createPublicClient({
      transport: viem.http(),
      chain: hardhat,
    });
    while (true) {
      try {
        const bytecode = await client.getBytecode({
          address: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
          blockTag: 'latest',
        });
        if (bytecode !== '0x') {
          return res(childProcess);
        }
      } catch (e) {}
    }
  });
};
