import { AbiItem } from 'viem';

export type Hash = `0x${string}`;

export interface PersistanceObject {
  init(): Promise<void>;
  saveBatch(batch: EventLog[], blockNumber?: bigint): Promise<void>;
  getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined>;
  getJsonObjectPropertySqlFragment(column: string, propertyName: string): string;
  queryAll<T>(query: string): Promise<T[]>;
  queryOne<T>(query: string): Promise<T>;
  queryRun(query: string): Promise<void>;
  disconnect(): Promise<void>;
}

export interface IndexerProps {
  rpcUrl: string;
  fromBlock: number;
  blockRange: number;
  targets: IndexerTarget[];
}

export interface IndexerTarget {
  address: Hash;
  abiItem: AbiItem;
}

export interface EventLog {
  address: string;
  blockNumber: bigint;
  eventName: string;
  args: Record<string, any>;
}

export type EventLogFromDb = Omit<EventLog, 'args'> & { args: string };

export interface GetEventsBatchParam {
  batchSize?: bigint;
  start?: bigint;
  end?: bigint;
  targets: IndexerTarget[];
}

export type BlockNumberAndLogBatchTuple = [blockNumber: bigint, logBatch: EventLog[]];

export interface EventsFetcher {
  getEventsBatch: (
    arg: GetEventsBatchParam,
  ) => AsyncGenerator<BlockNumberAndLogBatchTuple, void, unknown>;
}

export interface Block {
  number: bigint;
}

export interface GetLogsParams {
  address: Hash[];
  events: AbiItem[];
  fromBlock: bigint;
  toBlock: bigint;
}

export interface BlockchainClient {
  getLatestBlockNumber(): Promise<bigint>;
  getLogs(params: GetLogsParams): Promise<EventLog[]>;
}
