#!/usr/bin/env bun

import fs from 'fs/promises';
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

const res = targetAbis.flatMap((target) =>
  target.abi.flatMap((abi) => ({ abiItem: abi, address: target.address })),
);

console.log(JSON.stringify(res));
await fs.writeFile('./targets.json', JSON.stringify(res, null, 2));
