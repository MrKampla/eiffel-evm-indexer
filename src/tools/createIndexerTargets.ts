#!/usr/bin/env node

import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { program } from 'commander';
import isEsMain from 'es-main';

export const createIndexerTargetsProgram = program
  .command('create:targets')
  .description('Create targets.json file for the indexer')
  .requiredOption('-a, --abi <paths...>', 'path to abi file/files')
  .option(
    '-e, --events <names...>',
    'names of events to index (optional). If not provided, all events will be indexed',
  )
  .option('-y, --yes', 'agree to overwrite existing targets.json')
  .action(createIndexerTargets);

async function createIndexerTargets() {
  const {
    abi: abiPaths,
    events,
    yes: yesToOverwrite,
  } = createIndexerTargetsProgram.opts() as {
    abi: string[];
    events: string[] | undefined;
    yes: boolean | undefined;
  };

  interface HardhatAbi {
    address: string;
    abi: { name: string; type: string }[];
  }

  const targetAbis = await abiPaths.reduce(
    async (abis, abiPath) => {
      const abiFile = JSON.parse(
        (await fs.readFile(abiPath, 'utf8')).toString(),
      ) as HardhatAbi;

      const filteredAbiItems = events
        ? abiFile.abi.filter(({ name }) => events.includes(name))
        : abiFile.abi.filter(({ type }) => type === 'event');

      return (await abis).concat({
        address: abiFile.address,
        abi: filteredAbiItems,
      } as HardhatAbi);
    },
    Promise.resolve([] as HardhatAbi[]),
  );

  const newTargets = targetAbis.flatMap((target) =>
    target.abi.flatMap((abi) => ({ abiItem: abi, address: target.address })),
  );

  if (existsSync('./targets.json')) {
    const existingTargets = JSON.parse(await fs.readFile('./targets.json', 'utf8'));
    if (existingTargets.length) {
      if (!yesToOverwrite) {
        const shouldExtend = confirm(
          '❓ targets.json already exists, would you like to extend it?',
        );
        if (!shouldExtend) {
          console.log('❌ Aborting');
          process.exit(1);
        }
      }

      newTargets.push(...existingTargets);
    }
  }

  await fs.writeFile('./targets.json', JSON.stringify(newTargets, null, 2));
  console.log('✅ Written targets to ./targets.json');
}

if (isEsMain(import.meta)) {
  createIndexerTargetsProgram.parse(process.argv);
}
