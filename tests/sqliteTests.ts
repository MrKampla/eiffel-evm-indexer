import { describe, it, after } from 'node:test';
import { expect } from 'chai';
import { runEiffelApi } from '../src/api';
import { runEiffelIndexer } from 'src';

describe('SQLite tests', () => {
  after(async () => {
    process.exit();
  });

  it('should connect to local sqlite database, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      CLEAR_DB: true,
      CHAIN_ID: 137,
      DB_TYPE: 'sqlite',
      DB_SSL: false,
    });

    await new Promise((res) =>
      indexer.on('indexing', () => {
        res(0);
      }),
    );

    const api = await runEiffelApi({
      API_PORT: 8081,
      DB_TYPE: 'sqlite',
    });

    await new Promise((resolve) => api.on('listening', resolve));

    expect(
      await (await fetch('http://localhost:8081/api/events')).json(),
    ).to.be.deep.equal([]);
  });
});
