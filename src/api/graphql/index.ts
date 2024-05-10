import { YogaInitialContext, createYoga } from 'graphql-yoga';
import { PersistenceObject } from '../../types.js';
import { schema } from './schema.js';
import { getApiEnv } from '../envApi.js';

export * from './schema.js';

export const createGraphqlServer = (db: PersistenceObject): any =>
  createYoga({
    schema,
    cors: {
      allowedHeaders: ['Content-Type'],
      origin: '*',
      methods: ['POST', 'OPTIONS'],
    },
    graphqlEndpoint: '/api/graphql',
    context(initial: YogaInitialContext): any {
      return { ...initial, db, chainId: getApiEnv().CHAIN_ID };
    },
  });
