/* eslint-disable node/no-missing-import */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { upgrades } = hre;
  const { deployments } = hre;

  const factory = await hre.ethers.getContractFactory("AllowancesStore");
  const instance = await upgrades.deployProxy(factory, []);
  await instance.deployed();
  deployments.save("ArtemStakingRewards", {
    abi: (await deployments.getArtifact("AllowancesStore")).abi,
    address: instance.address
  });

  deployments.save("ArtemStakingRewardsImpl", {
    abi: (await deployments.getArtifact("AllowancesStore")).abi,
    address: await upgrades.erc1967.getImplementationAddress(instance.address)
  });
};
export default func;
func.tags = ["rewards"];
