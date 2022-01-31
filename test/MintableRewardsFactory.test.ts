/* eslint-disable node/no-missing-import */
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { MintableRewardsFactory, MintableRewards, AllowancesStore } from "../src/types";

require("chai").use(require("chai-as-promised"));
const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("MintableRewardsFactory", function () {
  let deployer: SignerWithAddress;
  let artist: SignerWithAddress;
  let shareholder: SignerWithAddress;
  let other: SignerWithAddress;
  let factory: MintableRewardsFactory;
  let store: AllowancesStore;

  const info = {
    name: "Roberto Lo Giacco",
    symbol: "RLG",
    description: "**Me**, _myself_ and I.",
    contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
    contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
    metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
  };

  beforeEach(async () => {
    [deployer, artist, shareholder, other] = await ethers.getSigners();
    const { MintableRewardsFactory, ArtemGold } = await deployments.fixture(["rewards"]);
    factory = (await ethers.getContractAt("MintableRewardsFactory", MintableRewardsFactory.address)) as MintableRewardsFactory;
    await factory.grantRole(await factory.ARTIST_ROLE(), artist.address);

    const recipients = new Array<{ minter: string, amount: BigNumberish }>(5);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = { minter: ethers.Wallet.createRandom().address, amount: 1 };
    }
    recipients.push({ minter: deployer.address, amount: 50 });
    recipients.push({ minter: shareholder.address, amount: 100 });
    store = (await ethers.getContractAt("AllowancesStore", ArtemGold.address)) as AllowancesStore;
    await store.update(recipients);
  });

  it("Should emit a CreatedRewards event upon create", async function () {
    expect(await factory.instances()).to.be.equal(0);
    const expectedAddress = await factory.get(0);
    await expect(factory.connect(artist).create(
      {
        name: "Roberto",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://i.imgur.com/FjT55Ou.jpg"
      },
      1000,
      0,
      250,
      [{ holder: (await shareholder.getAddress()), bps: 1500 }],
      store.address))

      .to.emit(factory, "CreatedRewards");

    expect(await factory.instances()).to.be.equal(1);
    expect(await factory.get(0)).to.be.equal(expectedAddress);
  });

  it("Should produce an initialized MintableRewards instance upon create", async function () {
    const receipt = await (await factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      2500,
      ethers.utils.parseEther("1.0"),
      150,
      [{ holder: (await shareholder.getAddress()), bps: 500 }],
      store.address
    )).wait();

    let contractAddress = "0x0";
    for (const event of receipt.events!) {
      if (event.event === "CreatedRewards") {
        contractAddress = event.args![4];
      }
    }
    expect(contractAddress).to.not.be.equal("0x0");
    const editions = (await ethers.getContractAt("MintableRewards", contractAddress)) as MintableRewards;
    expect(await editions.name()).to.be.equal("Roberto Lo Giacco");
    expect(await editions.symbol()).to.be.equal("RLG");
    expect(await editions.contentUrl()).to.be.equal("https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d");
    expect(await editions.contentHash()).to.be.equal("0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc");
    expect(await editions.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu");
    expect(await editions.size()).to.be.equal(2500);
    expect(await editions.royalties()).to.be.equal(150);
    expect(await editions.shares(artist.address)).to.be.equal(9500);
    expect(await editions.shares(shareholder.address)).to.be.equal(500);
    expect(await editions.mintable()).to.be.equal(2500);
    expect(await editions.price()).to.be.equal(ethers.utils.parseEther("1.0"));
    expect(await editions.totalSupply()).to.be.equal(0);
    expect(await editions.allowanceOf(deployer.address)).to.be.equal(50);
    expect(await editions.allowanceOf(shareholder.address)).to.be.equal(100);
  });

  it("Should reject creation for an already minted content", async function () {
    const receipt = await (await factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "ipfs://QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      2500,
      0,
      150,
      [],
      store.address
    )).wait();

    let contractAddress = "0x0";
    for (const event of receipt.events!) {
      if (event.event === "CreatedRewards") {
        contractAddress = event.args![4];
      }
    }
    await expect(contractAddress).to.not.be.equal("0x0");
    await expect(factory.connect(deployer).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      2500,
      0,
      150,
      [],
      store.address
    )).to.be.revertedWith("Duplicated content");
  });

  it("Should accept creation from artists only", async function () {
    await expect(factory.connect(other).create(info, 2500, 0, 150, [], store.address)).to.be.revertedWith("AccessControl");
    await expect(factory.connect(shareholder).create(info, 2500, 0, 150, [], store.address)).to.be.revertedWith("AccessControl");
  });

  it("Should accept creation with no royalties", async function () {
    await factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      1000,
      0,
      0,
      [],
      store.address
    );
    const editions = (await ethers.getContractAt("MintableRewards", await factory.get(1))) as MintableRewards;
    await expect(await editions.royalties()).to.be.equal(0x0);
  });

  it("Should reject creation for invalid royalties", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      100,
      0,
      10000,
      [],
      store.address
    )).to.be.revertedWith("Royalties too high");
  });

  it("Should accept creation with multiple shareholders", async function () {
    await factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      0,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 1000 }, { holder: (await other.getAddress()), bps: 500 }],
      store.address
    );
  });

  it("Should reject creation with duplicated shareholders", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 1000 }, { holder: (await shareholder.getAddress()), bps: 500 }],
      store.address
    )).to.be.revertedWith("Shareholder already has shares");
  });

  it("Should reject creation with artist among shareholders", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 1000 }, { holder: (await artist.getAddress()), bps: 500 }],
      store.address
    )).to.be.revertedWith("Shareholder already has shares");
  });

  it("Should reject creation with zero-address among shareholders", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: ethers.constants.AddressZero, bps: 1000 }, { holder: (await artist.getAddress()), bps: 500 }],
      store.address
    )).to.be.revertedWith("Shareholder is zero address");
  });

  it("Should reject creation with a shares sum above 100%", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 9000 }, { holder: (await artist.getAddress()), bps: 1500 }],
      store.address
    )).to.be.revertedWith("Shares too high");
  });

  it("Should reject creation with 0% shares", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 0 }, { holder: (await artist.getAddress()), bps: 500 }],
      store.address
    )).to.be.revertedWith("Shares are invalid");
  });

  it("Should reject creation with shares above 100%", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 11000 }],
      store.address
    )).to.be.revertedWith("Shares are invalid");
  });

  it("Should reject creation without contentUrl", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 1000 }],
      store.address
    )).to.be.revertedWith("Empty content URL");
  });

  it("Should reject creation without contentHash", async function () {
    await expect(factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "https://ipfs.io/ipfs/QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "",
        metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
      },
      500,
      0,
      150,
      [{ holder: (await shareholder.getAddress()), bps: 1000 }],
      store.address
    )).to.be.rejectedWith(Error, "INVALID_ARGUMENT");
  });

  it("Should accept role granting from deployer only", async function () {
    await expect(factory.connect(artist).grantRole(await factory.ARTIST_ROLE(), other.address)).to.be.revertedWith("AccessControl");
    await expect(factory.connect(other).grantRole(await factory.ARTIST_ROLE(), other.address)).to.be.revertedWith("AccessControl");
    await expect(factory.connect(shareholder).grantRole(await factory.ARTIST_ROLE(), other.address)).to.be.revertedWith("AccessControl");

    // grant
    await expect(factory.connect(other).create(info, 2500, 0, 150, [], store.address)).to.be.revertedWith("AccessControl");
    await factory.connect(deployer).grantRole(await factory.ARTIST_ROLE(), other.address);
    await factory.connect(other).create(info, 2500, 0, 150, [], store.address);

    // revoke
    await factory.connect(deployer).revokeRole(await factory.ARTIST_ROLE(), other.address);
    await expect(factory.connect(other).create({
      // eslint-disable-next-line node/no-unsupported-features/es-syntax
      ...info, contentHash: "0x07db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc"
    }, 2500, 0, 150, [], store.address)).to.be.revertedWith("AccessControl");
  });
});
