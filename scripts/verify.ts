/* eslint-disable no-process-exit */
import { run, deployments } from "hardhat";

const { get } = deployments;

async function verify(contract:string, args: any[]) {
  const deployment = await get(contract);
  console.log(`Verifying ${contract} at ${deployment.address}...`);
  try {
    await run("verify:verify", {
      address: deployment.address,
      constructorArguments: args
    });
  } catch (e) {
    console.log((e instanceof Error) ? "WARNING: " + e.message : "ERROR: " + e);
  }
}

async function main() {
  await verify("ArtemSilverImpl", []);
  await verify("ArtemGoldImpl", []);
  await verify("ArtemPlatinumImpl", []);
  await verify("MintableRewards", []);
  await verify("MintableRewardsFactoryImpl", []);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
