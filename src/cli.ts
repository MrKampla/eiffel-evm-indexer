#!/usr/bin/env node

import { program } from 'commander';

program
  .name('eiffel-evm-indexer')
  .description('CLI tool for EIFFEL EVM Indexer')
  .addHelpText(
    'after',
    '\n If no command is provided, both the indexer and the API will be started in a single process.',
  )
  .version(require('../package.json').version)
  .action(async () => {
    const { runEiffelIndexer } = await import('./main');
    const { runEiffelApi } = await import('./api/api');
    runEiffelIndexer();
    runEiffelApi();
  });

program
  .command('api')
  .description('Run the EIFFEL API')
  .action(async () => {
    const { runEiffelApi } = await import('./api/api');
    runEiffelApi();
  });

program
  .command('indexer')
  .description('Run the EIFFEL indexer')
  .action(async () => {
    const { runEiffelIndexer } = await import('./main');
    runEiffelIndexer();
  });

await import('./tools/createIndexerTargets');

program.parse(process.argv);
