import { AbiItem } from 'viem';
import { SortClause, WhereClause } from './database/filters';

export type Hash = `0x${string}`;

export interface PersistenceObject<UnderlyingDataSource = unknown> {
  init(): Promise<void>;
  saveBatch(batch: EventLog[], blockNumber?: bigint): Promise<void>;
  getLatestIndexedBlockForChain(chainId: number): Promise<number | undefined>;
  disconnect(): Promise<void>;
  filter<T extends {}>({
    table,
    whereClauses,
    sortClauses,
    limit,
    offset,
  }: {
    table: string;
    whereClauses?: WhereClause[];
    sortClauses?: SortClause[];
    limit?: number;
    offset?: number;
  }): Promise<T[]>;
  getUnderlyingDataSource(): UnderlyingDataSource;
  queryAll<T>(query: string): Promise<T[]>;
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
  transactionHash: string;
}

export type EventLogFromDb = Omit<EventLog, 'args'> & { args: string };

export interface GetEventsBatchParam {
  batchSize?: bigint;
  start?: bigint;
  end?: bigint;
  reorgDepth?: bigint;
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

export interface BlockchainClient<T = unknown> {
  getLatestBlockNumber(): Promise<bigint>;
  getLogs(params: GetLogsParams): Promise<EventLog[]>;
  getClient(): T;
}

export interface IndexingStatus {
  chainId: bigint;
  blockNumber: bigint;
}

export interface Order {
  id: string;
  address: string;
  blockNumber: bigint;
  eventName: string;
  args: string;
  chainId: number;
  transactionHash: string;
  priceMakerSellTokenInMakerBuyToken: string;
  priceMakerBuyTokenInMakerSellToken: string;
  orderId: string;
  orderStatus: 'FILLED' | 'UNFILLED' | 'CANCELLED';
  createdAt: Date;
  completedAt?: Date | null;
  makerSellTokenAmount: bigint;
  makerBuyTokenAmount: bigint;
}
