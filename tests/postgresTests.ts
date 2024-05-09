import { describe, it, before, after } from 'node:test';
import { expect } from 'chai';
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { runEiffelApi } from '../src/api';
import { runEiffelIndexer } from 'src';

describe('Postgres tests', () => {
  let postgresContainer: StartedPostgreSqlContainer;

  before(async () => {
    postgresContainer = await new PostgreSqlContainer().start();
  });

  after(async () => {
    await postgresContainer.stop();
    process.exit();
  });

  it('should connect to postgres, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      CLEAR_DB: true,
      DB_NAME: postgresContainer.getDatabase(),
      CHAIN_ID: 137,
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
    });

    await new Promise((resolve) => api.on('listening', resolve));

    expect(
      await (await fetch('http://localhost:8080/api/events')).json(),
    ).to.be.deep.equal([]);
  });
});
