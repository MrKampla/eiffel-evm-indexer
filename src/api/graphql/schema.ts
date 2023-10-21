import { YogaInitialContext, createSchema } from 'graphql-yoga';
import { EventLogFromDb, IndexingStatus, PersistenceObject } from '../../types';
import { FilterOperators, FilterTypes, SortClosure, WhereClosure } from '../../database/filters';
import { parseEventArgs } from '../../utils/parseEventArgs';

export type IndexerContext = YogaInitialContext & { db: PersistenceObject; chainId: number };

const gpqSchema = `
    type EventArg {
        from: String!
        to: String!
        value: String!
    }
    
    type Event {
        id: String!
        address: String!
        blockNumber: Int!
        eventName: String!
        args: EventArg!
        chainId: Int!
    }
    
    type Block {
        chainId: Int!
        blockNumber: Int!
    }
    
    type Query {
        events(where: [WhereClosure], sort: [SortClosure], limit: Int, offset: Int): [Event!]!
        indexing_status: [Block!]!
    }

    input WhereClosure {
        field: String!
        operator: FilterOperators!
        type: FilterTypes
        value: String!
    }

    input SortClosure {
        field: String!
        direction: SortDirection!
        type: FilterTypes
    }

    enum FilterOperators {
        EQ
        GT
        GTE
        LT
        LTE
        NEQ
    }
      
    enum FilterTypes {
        TEXT
        NUMBER
    }
      
    enum SortDirection {
        ASC
        DESC
    }
`;

export const schema = createSchema({
  typeDefs: gpqSchema,
  resolvers: {
    Query: {
      events: (_, _args, context: IndexerContext) => { return handleEventsRequest(_args, context.db, context.chainId); },
      indexing_status: (_, _args, context: IndexerContext) => { return handleIndexingStatusRequest(context.db, context.chainId); },
    },
  },
});

const handleEventsRequest = async (filters: {where: WhereClosure[], sort: SortClosure[], limit: number, offset: number}, db: PersistenceObject, chainId: number) => {
    const events = await db.filter<EventLogFromDb>(
      'events',
      filters?.where?.map((w) => !w.type ? {...w, type: FilterTypes.TEXT} : w),
      filters?.sort?.map((s) => !s.type ? {...s, type: FilterTypes.TEXT} : s),
      filters?.limit,
      filters?.offset,
    );
    return events.map(parseEventArgs);
}

const handleIndexingStatusRequest = (db: PersistenceObject, chainId: number): Promise<IndexingStatus[]> => 
    db.filter<IndexingStatus>('indexing_status', [{field: 'chainId', operator: FilterOperators.EQ, type: FilterTypes.TEXT, value: chainId.toString()}], [], 1, 0);