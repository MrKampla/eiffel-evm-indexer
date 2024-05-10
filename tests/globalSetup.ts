import { startLocalHardhatChainAndWaitForDeployments } from './testUtils';

export default async function setup({}) {
  const childProcess = await startLocalHardhatChainAndWaitForDeployments();
  return () => {
    if (childProcess.kill()) {
      console.log('Local hardhat chain killed');
    } else {
      console.error('Failed to kill local hardhat chain');
    }
    process.exit(0);
  };
}
