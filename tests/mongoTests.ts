import { describe, it, before, after } from 'node:test';
import { expect } from 'chai';
import { MongoDBContainer, StartedMongoDBContainer } from '@testcontainers/mongodb';
import { runEiffelApi } from '../src/api';
import { runEiffelIndexer } from '../src';

describe('MongoDB tests', () => {
  let mongoContainer: StartedMongoDBContainer;
  before(async () => {
    mongoContainer = await new MongoDBContainer('mongo:6.0.15').start();
  });

  after(async () => {
    await mongoContainer.stop();
    process.exit();
  });

  it('should connect to mongoDb, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      CLEAR_DB: true,
      CHAIN_ID: 137,
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

    expect(
      await (await fetch('http://localhost:8082/api/events')).json(),
    ).to.be.deep.equal([]);
  });
});
