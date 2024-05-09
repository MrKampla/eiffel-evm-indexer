import { YogaInitialContext, createYoga } from 'graphql-yoga';
import { PersistenceObject } from '../../types';
import { schema } from './schema';
import { getApiEnv } from '../envApi';

export * from './schema';

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
