import fs from 'node:fs/promises';
import { BlockchainClient, EventLog, PersistenceObject } from '../../types.js';

export interface ActionProps<
  UnderlyingDataSourceType = unknown,
  PersistenceObjectType = PersistenceObject<UnderlyingDataSourceType>,
  BlockchainClientType = unknown,
> {
  db: PersistenceObjectType;
  eventLogsBatch: EventLog[];
  indexedBlockNumber: bigint;
  blockchainClient: BlockchainClient<BlockchainClientType>;
}

export interface Action<
  UnderlyingDataSourceType = unknown,
  PersistenceObjectType = PersistenceObject<UnderlyingDataSourceType>,
  BlockchainClientType = unknown,
> {
  onInit: (
    db: PersistenceObjectType,
    blockchainClient: BlockchainClient<BlockchainClientType>,
  ) => Promise<void>;
  onClear: (db: PersistenceObjectType) => Promise<void>;
  onBatchIndexed: (
    props: ActionProps<
      UnderlyingDataSourceType,
      PersistenceObjectType,
      BlockchainClientType
    >,
  ) => Promise<void>;
}

export const scanForActions = async (dir: string) => {
  const actionFiles = (await fs.readdir(dir)).filter((file) => file !== 'index.ts');

  return actionFiles.reduce(
    async (actions, actionFile) => {
      const action = (await import(`${dir}/${actionFile}`)).default as Action;
      return [...(await actions), action];
    },
    Promise.resolve([] as Action[]),
  );
};

export const initializeActions = async (
  actions: Action[],
  db: PersistenceObject,
  blockchainClient: BlockchainClient,
) => {
  for (const action of actions) {
    await action.onInit(db, blockchainClient);
  }
};

export const runOnClearActions = async (actions: Action[], db: PersistenceObject) =>
  Promise.allSettled(actions.map((action) => action.onClear(db)));

export const runOnBatchIndexedActions = async (
  actions: Action[],
  actionProps: Parameters<Action['onBatchIndexed']>[0],
) => Promise.allSettled(actions.map((action) => action.onBatchIndexed(actionProps)));
