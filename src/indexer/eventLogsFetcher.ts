import {
  BlockNumberAndLogBatchTuple,
  BlockchainClient,
  EventLog,
  EventsFetcher,
  GetEventsBatchParam,
} from '../types';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { env } from '../env';
import { setTimeout } from 'node:timers/promises';
import { logger } from '../utils/logger';

export class EventLogsFetcher implements EventsFetcher {
  constructor(private publicClient: BlockchainClient) {}

  async *getEventsBatch({
    batchSize = env.BLOCK_FETCH_BATCH_SIZE,
    start = 0n,
    end = 0n, // if end is 0, indexer will run indefinitely
    targets,
  }: GetEventsBatchParam) {
    let currentBlock = start;
    while (end === 0n || currentBlock < end) {
      const latestBlockNumber = await this.publicClient.getLatestBlockNumber();

      const toBlock = BIGINT_MATH.min(currentBlock + batchSize, latestBlockNumber);

      if (toBlock === currentBlock || currentBlock > toBlock) {
        logger.log(`Waiting for new blocks...`);
        await setTimeout(env.BLOCK_FETCH_INTERVAL);
        continue;
      }

      logger.log(`Fetching from ${currentBlock} to ${toBlock}`);

      yield new Promise<BlockNumberAndLogBatchTuple>(async (resolve) => {
        const logs = (await this.publicClient.getLogs({
          address: targets.map((target) => target.address),
          events: targets.map((target) => target.abiItem),
          fromBlock: currentBlock,
          toBlock,
        })) as EventLog[];
        resolve([toBlock, logs]);
      });
      currentBlock = toBlock + 1n;
    }
  }
}
