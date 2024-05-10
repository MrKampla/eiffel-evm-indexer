import {
  BlockNumberAndLogBatchTuple,
  BlockchainClient,
  EventsFetcher,
  GetEventsBatchParam,
} from '../types';
import { BIGINT_MATH } from '../utils/bigIntMath';
import { getEnv } from '../env';
import { setTimeout } from 'node:timers/promises';
import { logger } from '../utils/logger';

export class EventLogsFetcher implements EventsFetcher {
  constructor(private publicClient: BlockchainClient) {}

  async *getEventsBatch({
    batchSize = getEnv().BLOCK_FETCH_BATCH_SIZE,
    start = 0n,
    end = 0n, // if end is 0, indexer will run indefinitely
    reorgDepth = getEnv().REORG_REFETCH_DEPTH,
    targets,
  }: GetEventsBatchParam) {
    let currentBlock = start;
    while (end === 0n || currentBlock < end) {
      const latestBlockNumber = await this.publicClient.getLatestBlockNumber();

      const toBlock = BIGINT_MATH.min(currentBlock + batchSize, latestBlockNumber);

      if (toBlock === currentBlock || currentBlock > toBlock) {
        if (reorgDepth === 0n) {
          logger.log('Waiting for new blocks...');
          await setTimeout(getEnv().BLOCK_FETCH_INTERVAL);
          continue;
        }

        logger.log(
          `Indexed to latest block ${latestBlockNumber}. Refetching latest ${reorgDepth} blocks in order to mitigate reorgs...`,
        );
        currentBlock =
          latestBlockNumber > reorgDepth ? latestBlockNumber - reorgDepth : 0n;
        await setTimeout(getEnv().BLOCK_FETCH_INTERVAL);
      }

      logger.log(`Fetching from ${currentBlock} to ${toBlock}`);
      const logs = await this.publicClient.getLogs({
        address: targets.map((target) => target.address),
        events: targets.map((target) => target.abiItem),
        fromBlock: currentBlock,
        toBlock,
      });

      yield [toBlock, logs] as BlockNumberAndLogBatchTuple;
      currentBlock = toBlock;
    }
  }
}
