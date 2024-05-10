import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { runEiffelApi } from '../src/api';
import { runEiffelIndexer } from '../src';
import { setTimeout } from 'node:timers/promises';
import { getTestIndexerEnvs } from './testUtils';

describe('Postgres tests', () => {
  let postgresContainer: StartedPostgreSqlContainer;

  beforeAll(async () => {
    postgresContainer = await new PostgreSqlContainer().start();
  });

  afterAll(async () => {
    await postgresContainer.stop();
  });

  it('should connect to postgres, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      ...getTestIndexerEnvs(),
      DB_NAME: postgresContainer.getDatabase(),
      DB_URL: postgresContainer.getConnectionUri(),
      DB_TYPE: 'postgres',
      DB_SSL: false,
    });

    await new Promise((res) =>
      indexer.on('indexing', () => {
        res(0);
      }),
    );

    const api = await runEiffelApi({
      API_PORT: 8080,
      DB_TYPE: 'postgres',
      DB_URL: postgresContainer.getConnectionUri(),
      DB_NAME: postgresContainer.getDatabase(),
      CHAIN_ID: 31337,
    });

    await new Promise((resolve) => api.on('listening', resolve));
    await setTimeout(250); // wait for the events to be indexed

    expect(
      ((await (await fetch('http://localhost:8080/api/events')).json()) as any[]).map(
        (e) => e.eventName,
      ),
    ).to.be.deep.equal(['Initialized', 'DataEvent', 'DataEvent']);

    expect(
      await (await fetch('http://localhost:8080/api/indexing_status')).json(),
    ).to.be.deep.equal([
      {
        blockNumber: 3,
        chainId: 31337,
      },
    ]);
  });
});
