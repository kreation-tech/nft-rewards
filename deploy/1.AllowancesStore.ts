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
    const upgrade = await upgrades.upgradeProxy(proxy.address, await hre.ethers.getContractFactory("AllowancesStore"));
    // eslint-disable-next-line quotes
    console.log('upgraded proxied contract "AllowancesStore" to impl at ' + await upgrades.erc1967.getImplementationAddress(upgrade.address));
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
    // eslint-disable-next-line quotes
    console.log('deployed proxied contract "AllowancesStore" at ' + instance.address);
  }
};
export default func;
func.tags = ["rewards"];
