import { PublicClient, createPublicClient, defineChain, http } from 'viem';
import { env } from '../env';
import { BlockchainClient, EventLog, GetLogsParams } from '../types';
import { safeAsync } from '../utils/safeAsync';

export class ViemClient implements BlockchainClient {
  protected _publicClient?: PublicClient;

  public async getLatestBlockNumber(): Promise<bigint> {
    return safeAsync(
      async () =>
        (await this.publicClient.getBlock({ blockTag: 'latest' })).number -
        env.BLOCK_CONFIRMATIONS,
    );
  }

  public getLogs(params: GetLogsParams): Promise<EventLog[]> {
    return safeAsync(async () => this.publicClient.getLogs(params));
  }

  private get publicClient(): PublicClient {
    if (!this._publicClient) {
      this._publicClient = this.createPublicClient();
    }
    return this._publicClient;
  }

  protected createPublicClient(): PublicClient {
    return createPublicClient({
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
  }
}
