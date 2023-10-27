import { env } from '../env';
import { PersistenceObject, EventsFetcher, BlockchainClient } from '../types';
import { logger } from '../utils/logger';
import {
  initializeActions,
  runOnBatchIndexedActions,
  runOnClearActions,
  scanForActions,
} from './actions';

export class Indexer {
  constructor(
    private db: PersistenceObject,
    private eventsFetcher: EventsFetcher,
    private blockchainClient: BlockchainClient,
  ) {}

  async getStartingBlock() {
    const latestIndexedBlock = await this.db.getLatestIndexedBlockForChain(env.CHAIN_ID);
    if (!latestIndexedBlock) {
      return env.START_FROM_BLOCK;
    }

    return BigInt(latestIndexedBlock) + 1n;
  }

  public async run(): Promise<void> {
    logger.log('***STARTING EIFFEL INDEXER***');

    logger.log(`Scanning for actions in ${__dirname}/actions...`);
    const actions = await scanForActions(`${__dirname}/actions`);
    logger.log(`Found ${actions.length} actions`);

    await this.db.init();

    await runOnClearActions(actions, this.db);
    await initializeActions(actions, this.db, this.blockchainClient);
    logger.log('DB initialized');

    const startingBlock = await this.getStartingBlock();
    logger.log(`Starting from block ${startingBlock}`);

    for await (const [indexedToBlock, logBatch] of this.eventsFetcher.getEventsBatch({
      targets: env.TARGETS,
      start: startingBlock,
    })) {
      await this.db.saveBatch(logBatch, indexedToBlock);
      await runOnBatchIndexedActions(actions, {
        db: this.db,
        eventLogsBatch: logBatch,
        indexedBlockNumber: indexedToBlock,
        blockchainClient: this.blockchainClient,
      });
      logger.log(`Indexed to block ${indexedToBlock}`);
    }
  }
}
