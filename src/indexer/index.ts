import { env } from '../env';
import { PersistanceObject, EventsFetcher } from '../types';
import { logger } from '../utils/logger';

export class Indexer {
  constructor(
    private db: PersistanceObject,
    private eventsFetcher: EventsFetcher,
  ) {}

  async getStartingBlock() {
    const latestIndexedBlock = await this.db.getLatestIndexedBlockForChain(env.CHAIN_ID);
    if (!latestIndexedBlock) {
      return env.START_FROM_BLOCK;
    }

    return BigInt(latestIndexedBlock) + 1n;
  }

  async run() {
    logger.log('***STARTING EIFFEL INDEXER***');
    console.log('\n\n');
    await this.db.init();
    const startingBlock = await this.getStartingBlock();
    logger.log(`Starting from block ${startingBlock}`);

    for await (const [indexedToBlock, logBatch] of this.eventsFetcher.getEventsBatch({
      targets: env.TARGETS,
      start: startingBlock,
    })) {
      await this.db.saveBatch(logBatch, indexedToBlock);
      logger.log(`Indexed to block ${indexedToBlock}`);
    }
  }
}
