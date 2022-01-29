/* eslint-disable node/no-missing-import */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployments, upgrades } = hre;

  try {
    const proxy = await deployments.get("MintableRewardsFactory");
    if (process.env.UPGRADE_FACTORY) {
      const upgrade = await upgrades.upgradeProxy(proxy.address, await hre.ethers.getContractFactory("MintableRewardsFactory"));
      console.log(`upgraded proxied contract "MintableRewardsFactory" at ${proxy.address} to impl ${await upgrades.erc1967.getImplementationAddress(upgrade.address)}`);
    } else {
      console.log(`reusing "MintableRewardsFactory" at ${proxy.address} as proxy`);
    }
  } catch (err) {
    const template = await deployments.get("MintableRewards");
    const factory = await hre.ethers.getContractFactory("MintableRewardsFactory");
    const instance = await upgrades.deployProxy(factory, [template.address]);
    await instance.deployed();
    deployments.save("MintableRewardsFactory", {
      abi: (await deployments.getArtifact("MintableRewardsFactory")).abi,
      address: instance.address
    });

    deployments.save("MintableRewardsFactoryImpl", {
      abi: (await deployments.getArtifact("MintableRewardsFactory")).abi,
      address: await upgrades.erc1967.getImplementationAddress(instance.address)
    });
    // eslint-disable-next-line quotes
    console.log(`deployed proxied contract "MintableRewardsFactory" at ${instance.address}`);
  }
};
export default func;
func.dependencies = ["MintableRewards"];
func.tags = ["rewards"];
