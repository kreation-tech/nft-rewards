/* eslint-disable node/no-missing-import */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { deployments } from "hardhat";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { upgrades } = hre;

  const factory = await hre.ethers.getContractFactory("AllowancesStore");
  const instance = await upgrades.deployProxy(factory, []);
  await instance.deployed();
  deployments.save("AllowancesStore", {
    abi: (await deployments.getArtifact("AllowancesStore")).abi,
    address: instance.address
  });
};
export default func;
func.tags = ["editions"];
