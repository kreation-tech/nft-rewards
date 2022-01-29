/* eslint-disable node/no-missing-import */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { getImplementationAddress } from "@openzeppelin/upgrades-core";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { upgrades } = hre;
  const { deployments } = hre;
  try {
    const proxy = await deployments.get("AllowancesStore");
    if (process.env.UPGRADE_STORE) {
      const upgrade = await upgrades.upgradeProxy(proxy.address, await hre.ethers.getContractFactory("AllowancesStore"));
      console.log(`upgraded proxied contract "AllowancesStore" at ${proxy.address} to impl ${await upgrades.erc1967.getImplementationAddress(upgrade.address)}`);
    } else {
      console.log(`reusing "AllowancesStore" at ${proxy.address} as proxy`);
    }
  } catch (err) {
    const factory = await hre.ethers.getContractFactory("AllowancesStore");
    const instance = await upgrades.deployProxy(factory, []);
    await instance.deployed();
    deployments.save("AllowancesStore", {
      abi: (await deployments.getArtifact("AllowancesStore")).abi,
      address: instance.address
    });

    deployments.save("AllowancesStoreImpl", {
      abi: (await deployments.getArtifact("AllowancesStore")).abi,
      address: await upgrades.erc1967.getImplementationAddress(instance.address)
    });
    console.log(`deployed proxied contract "AllowancesStore" at ${instance.address}`);
  }
};
export default func;
func.tags = ["rewards"];
