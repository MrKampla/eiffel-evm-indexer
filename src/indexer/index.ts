import fs from 'node:fs';
import { PersistenceObject, EventsFetcher, BlockchainClient } from '../types';
import { logger } from '../utils/logger';
import {
  Action,
  initializeActions,
  runOnBatchIndexedActions,
  runOnClearActions,
  scanForActions,
} from './actions';
import EventEmitter from 'node:events';
import { getEnv } from '../env';

export type EiffelIndexerEvents = {
  indexing: [];
};

export class Indexer {
  public eventEmitter: EventEmitter<EiffelIndexerEvents>;

  constructor(
    private db: PersistenceObject,
    private eventsFetcher: EventsFetcher,
    private blockchainClient: BlockchainClient,
  ) {
    this.eventEmitter = new EventEmitter<EiffelIndexerEvents>();
  }

  async getStartingBlock() {
    const latestIndexedBlock = await this.db.getLatestIndexedBlockForChain(
      getEnv().CHAIN_ID,
    );
    if (!latestIndexedBlock) {
      return getEnv().START_FROM_BLOCK;
    }

    return BigInt(latestIndexedBlock) + 1n;
  }

  public async run() {
    logger.log('***STARTING EIFFEL INDEXER***');

    let actions: Action[] = [];

    logger.log(`Scanning for actions in ${process.cwd()}/actions...`);
    if (fs.existsSync(`${process.cwd()}/actions`)) {
      actions = await scanForActions(`${process.cwd()}/actions`);
    }
    logger.log(`Found ${actions.length} actions`);

    await this.db.init();
    if (getEnv().CLEAR_DB) {
      await runOnClearActions(actions, this.db);
    }
    await initializeActions(actions, this.db, this.blockchainClient);
    logger.log('DB initialized');

    const startingBlock = await this.getStartingBlock();
    logger.log(`Starting from block ${startingBlock}`);

    this.eventEmitter.emit('indexing');

    for await (const [indexedToBlock, logBatch] of this.eventsFetcher.getEventsBatch({
      targets: getEnv().TARGETS,
      start: startingBlock,
    })) {
      await this.db.saveBatch(logBatch, indexedToBlock);
      const actionResults = await runOnBatchIndexedActions(actions, {
        db: this.db,
        eventLogsBatch: logBatch,
        indexedBlockNumber: indexedToBlock,
        blockchainClient: this.blockchainClient,
      });
      const failedActions = actionResults.filter(
        (result) => result.status === 'rejected',
      );
      failedActions.length && logger.error(`Failed actions:`, failedActions);
      logger.log(`Indexed to block ${indexedToBlock}`);
    }
  }
}
