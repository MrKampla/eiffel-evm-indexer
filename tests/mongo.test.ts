import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { runEiffelApi } from '../src/api/index.js';
import { runEiffelIndexer } from '../src/index.js';
import { setTimeout } from 'node:timers/promises';
import { getTestIndexerEnvs } from './testUtils.js';

describe('MongoDB tests', () => {
  let mongoContainer: StartedMongoDBContainer;

  beforeAll(async () => {
    mongoContainer = await new MongoDBContainer('mongo:6.0.15').start();
  });

  afterAll(async () => {
    await mongoContainer.stop();
  });

  it('should connect to mongoDb, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      ...getTestIndexerEnvs(),
      DB_NAME: 'default',
      DB_URL: `${mongoContainer.getConnectionString()}/default`,
      DB_TYPE: 'mongo',
      DB_SSL: false,
    });

    await new Promise((res) =>
      indexer.on('indexing', () => {
        res(0);
      }),
    );

    const api = await runEiffelApi({
      API_PORT: 8082,
      DB_TYPE: 'mongo',
      DB_URL: `${mongoContainer.getConnectionString()}/default`,
      DB_SSL: false,
    });

    await new Promise((resolve) => api.on('listening', resolve));
    await setTimeout(250); // wait for events to be indexed

    expect(
      ((await (await fetch('http://localhost:8082/api/events')).json()) as any[]).map(
        (e) => e.eventName,
      ),
    ).to.be.deep.equal(['Initialized', 'DataEvent', 'DataEvent']);

    expect(
      (await (await fetch('http://localhost:8082/api/indexing_status')).json())[0],
    ).to.be.deep.include({
      blockNumber: '3',
      chainId: '31337',
    });
  });
});
