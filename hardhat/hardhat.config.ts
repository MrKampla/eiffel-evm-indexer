import { HardhatUserConfig, task } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox-viem';

import { TASK_NODE } from 'hardhat/builtin-tasks/task-names';
task(
  TASK_NODE,
  'Deploy contracts with hardhat ignition automatically when starting local node',
  async (args, hre, runSuper) => {
    const waitForLocalBlockchainToStart = async () => {
      while (true) {
        const isStarted = await isLocalBlockchainStarted();
        if (isStarted) {
          return;
        }
        await new Promise((res) => setTimeout(() => res({}), 1000));
      }
    };

    const isLocalBlockchainStarted = async () => {
      try {
        await (await hre.viem.getPublicClient()).getBlockNumber();
        return true;
      } catch (e) {
        return false;
      }
    };

    waitForLocalBlockchainToStart().then(async () => {
      console.log('Local blockchain started');
      await hre.run(
        {
          task: 'deploy',
          scope: 'ignition',
        },
        {
          network: 'localhost',
          modulePath: './ignition/modules/localhost.ts',
        },
      );
    });

    return runSuper(args);
  },
);

const config: HardhatUserConfig = {
  solidity: '0.8.24',
};

export default config;
