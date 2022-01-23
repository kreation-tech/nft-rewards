/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import "@nomiclabs/hardhat-ethers";

import { ethers } from "hardhat";

describe("Deployments", function () {
  it("Should deploy MintableEditionsFactory", async function () {
    const AllowancesStore = await ethers.getContractFactory("AllowancesStore");
    await AllowancesStore.deploy();

    const MintableEditions = await ethers.getContractFactory("MintableEditions");
    const editionsTemplate = await MintableEditions.deploy();

    const MintableEditionsFactory = await ethers.getContractFactory("MintableEditionsFactory");
    await MintableEditionsFactory.deploy(editionsTemplate.address);
  });
});
