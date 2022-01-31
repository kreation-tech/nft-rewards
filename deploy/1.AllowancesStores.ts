/* eslint-disable node/no-missing-import */
/* eslint-disable node/no-unpublished-import */
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

async function deploy(name:string, hre: HardhatRuntimeEnvironment) {
  const { upgrades, ethers } = hre;
  const { deployments } = hre;
  try {
    const proxy = await deployments.get(name);
    if (process.env.UPGRADE_STORE) {
      const upgrade = await upgrades.upgradeProxy(proxy.address, await hre.ethers.getContractFactory("AllowancesStore"));
      console.log(`upgraded proxied contract "${name}" at ${proxy.address} to impl ${await upgrades.erc1967.getImplementationAddress(upgrade.address)}`);
    } else {
      console.log(`reusing "${name}" at ${proxy.address} as proxy`);
    }
  } catch (err) {
    const factory = await ethers.getContractFactory("AllowancesStore");
    const instance = await upgrades.deployProxy(factory, []);
    await instance.deployed();
    deployments.save(name, {
      abi: (await deployments.getArtifact("AllowancesStore")).abi,
      address: instance.address
    });

    deployments.save(name + "Impl", {
      abi: (await deployments.getArtifact("AllowancesStore")).abi,
      address: await upgrades.erc1967.getImplementationAddress(instance.address)
    });
    console.log(`deployed proxied contract "${name}" at ${instance.address}`);
  }
}

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  await deploy("ArtemSilver", hre);
  await deploy("ArtemGold", hre);
  await deploy("ArtemPlatinum", hre);
};
export default func;
func.tags = ["rewards"];
