import { PublicClient, createPublicClient, defineChain, http } from 'viem';
import { env } from '../env';
import { BlockchainClient, GetLogsParams } from '../types';
import { safeAsync } from '../utils/safeAsync';

const publicClient: PublicClient = createPublicClient({
  chain: defineChain({
    id: env.CHAIN_ID,
    name: 'customChain',
    nativeCurrency: {
      decimals: 18,
      name: 'ETH',
      symbol: 'ETH',
    },
    rpcUrls: {
      default: {
        http: [env.CHAIN_RPC_URL],
      },
      public: {
        http: [env.CHAIN_RPC_URL],
      },
    },
    network: 'customChain',
  }),
  transport: http(),
});

export class ViemClient implements BlockchainClient {
  async getLatestBlockNumber() {
    return safeAsync(
      async () =>
        (await publicClient.getBlock({ blockTag: 'latest' })).number -
        env.BLOCK_CONFIRMATIONS,
    );
  }

  async getLogs(params: GetLogsParams) {
    return safeAsync(async () => publicClient.getLogs(params));
  }
}
