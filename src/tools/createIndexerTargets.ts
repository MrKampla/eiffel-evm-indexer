#!/usr/bin/env bun

import fs from 'node:fs/promises';
import { program } from 'commander';

program
  .requiredOption('-a, --abi <paths...>', 'path to abi file/files')
  .option('-e, --events <names...>', 'names of events to index (optional)')
  .parse(process.argv);

const { abi: abiPaths, events } = program.opts() as {
  abi: string[];
  events: string[] | undefined;
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

if (await fs.exists('./targets.json')) {
  const existingTargets = JSON.parse(await fs.readFile('./targets.json', 'utf8'));
  if (existingTargets.length) {
    const shouldExtend = confirm(
      '❓ targets.json already exists, would you like to extend it?',
    );
    if (!shouldExtend) {
      console.log('❌ Aborting');
      process.exit(1);
    }

    newTargets.push(...existingTargets);
  }
}

await fs.writeFile('./targets.json', JSON.stringify(newTargets, null, 2));
console.log('✅ Written targets to ./targets.json');
