/* eslint-disable no-process-exit */
import { deployments, getChainId } from "hardhat";
import { readFileSync, writeFileSync } from "fs";
import { ethers } from "ethers";

const { get } = deployments;

async function addressOf(contract:string, obj:any) {
  const deployment = await get(contract);
  obj[contract] = deployment.address;
}

async function main() {
  const addresses = JSON.parse(readFileSync("./src/addresses.json", "utf-8"));
  const contracts:{[name: string]: string} = {};
  addresses[await getChainId()] = contracts;

  await addressOf("MintableRewards", contracts);
  await addressOf("MintableRewardsFactory", contracts);
  writeFileSync("./src/addresses.json", JSON.stringify(addresses, null, 2), { encoding: "utf-8" });

  const levels = JSON.parse(readFileSync("./src/stores.json", "utf-8"));
  const rewards:{[name: string]: string} = {};
  levels[await getChainId()] = rewards;
  await addressOf("ArtemGold", rewards);
  await addressOf("ArtemSilver", rewards);
  await addressOf("ArtemPlatinum", rewards);
  writeFileSync("./src/stores.json", JSON.stringify(levels, null, 2), { encoding: "utf-8" });

  const roles:{[name: string]: string} = {};
  roles.admin = ethers.constants.HashZero;
  roles.artist = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ARTIST_ROLE"));
  writeFileSync("./src/roles.json", JSON.stringify(roles, null, 2), { encoding: "utf-8" });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
