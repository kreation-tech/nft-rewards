/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import "@nomiclabs/hardhat-ethers";

import { ethers } from "hardhat";

describe("Deployments", function () {
  it("Should deploy MintableEditionsFactory", async function () {
    const AllowancesStore = await ethers.getContractFactory("AllowancesStore");
    await AllowancesStore.deploy();

    const MintableRewards = await ethers.getContractFactory("MintableRewards");
    await MintableRewards.deploy();

    const MintableRewardsFactory = await ethers.getContractFactory("MintableRewardsFactory");
    await MintableRewardsFactory.deploy();
  });
});
