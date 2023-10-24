import { YogaInitialContext, createSchema } from 'graphql-yoga';
import { EventLogFromDb, IndexingStatus, PersistenceObject } from '../../types';
import {
  FilterOperators,
  FilterType,
  SortClause,
  WhereClause,
} from '../../database/filters';
import { parseEventArgs } from '../../utils/parseEventArgs';

export type IndexerContext = YogaInitialContext & {
  db: PersistenceObject;
  chainId: number;
};

const gpqSchema = `
    scalar JSON

    type Event {
        id: String!
        address: String!
        blockNumber: Int!
        eventName: String!
        args: JSON!
        chainId: Int!
    }
    
    type Block {
        chainId: Int!
        blockNumber: Int!
    }
    
    type Query {
        events(where: [WhereClause], sort: [SortClause], limit: Int, offset: Int): [Event!]!
        indexing_status: [Block!]!
    }

    input WhereClause {
        field: String!
        operator: FilterOperators!
        type: FilterTypes
        value: String!
    }

    input SortClause {
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
      events: (_, _args, context: IndexerContext) => {
        return handleEventsRequest(_args, context.db, context.chainId);
      },
      indexing_status: (_, _args, context: IndexerContext) => {
        return handleIndexingStatusRequest(context.db, context.chainId);
      },
    },
  },
});

const handleEventsRequest = async (
  filters: { where: WhereClause[]; sort: SortClause[]; limit: number; offset: number },
  db: PersistenceObject,
  _chainId: number,
) => {
  const events = await db.filter<EventLogFromDb>({
    table: 'events',
    whereClauses: filters?.where?.map((w) =>
      !w.type ? { ...w, type: FilterType.TEXT } : w,
    ),
    sortClauses: filters?.sort?.map((s) =>
      !s.type ? { ...s, type: FilterType.TEXT } : s,
    ),
    limit: filters?.limit,
    offset: filters?.offset,
  });
  return events.map(parseEventArgs);
};

const handleIndexingStatusRequest = (
  db: PersistenceObject,
  chainId: number,
): Promise<IndexingStatus[]> =>
  db.filter<IndexingStatus>({
    table: 'indexing_status',
    whereClauses: [
      {
        field: 'chainId',
        operator: FilterOperators.EQ,
        type: FilterType.TEXT,
        value: chainId.toString(),
      },
    ],
    sortClauses: [],
    limit: 1,
    offset: 0,
  });
