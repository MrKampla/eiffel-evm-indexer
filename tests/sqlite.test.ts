import { describe, it, expect } from 'vitest';
import { runEiffelApi } from '../src/api';
import { runEiffelIndexer } from 'src';
import { getTestIndexerEnvs } from './testUtils';
import { setTimeout } from 'node:timers/promises';

describe('SQLite tests', () => {
  it('should connect to local sqlite database, migrate and return', async () => {
    const indexer = await runEiffelIndexer({
      ...getTestIndexerEnvs(),
      DB_TYPE: 'sqlite',
      DB_URL: 'test.db',
      DB_SSL: false,
    });

    await new Promise((res) =>
      indexer.on('indexing', () => {
        res(0);
      }),
    );

    const api = await runEiffelApi({
      API_PORT: 8081,
      CHAIN_ID: 31337,
      DB_TYPE: 'sqlite',
      DB_URL: 'test.db',
    });

    await new Promise((resolve) => api.on('listening', resolve));
    await setTimeout(2000); // wait for events to be indexed

    expect(
      ((await (await fetch('http://localhost:8081/api/events')).json()) as any[]).map(
        (e) => e.eventName,
      ),
    ).to.be.deep.equal(['Initialized', 'DataEvent', 'DataEvent']);

    expect(
      await (await fetch('http://localhost:8081/api/indexing_status')).json(),
    ).to.be.deep.equal([
      {
        blockNumber: 3,
        chainId: 31337,
      },
    ]);
  });
});
