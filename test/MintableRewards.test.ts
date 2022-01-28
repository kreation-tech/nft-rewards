/* eslint-disable node/no-missing-import */
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { MintableRewardsFactory, MintableRewards, AllowancesStore } from "../src/types";

const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("MintableRewards", function () {
  let artist: SignerWithAddress;
  let curator: SignerWithAddress;
  let shareholder: SignerWithAddress;
  let buyer: SignerWithAddress;
  let minter: SignerWithAddress;
  let receiver: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let rewards: MintableRewards;
  let factory: MintableRewardsFactory;
  let store: AllowancesStore;
  let recipients: { minter: string; amount: BigNumberish; }[];

  before(async () => {
    [artist, curator, shareholder, buyer, minter, receiver, purchaser] = await ethers.getSigners();
    recipients = new Array<{ minter: string, amount: BigNumberish }>(5);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = { minter: ethers.Wallet.createRandom().address, amount: 1 };
    }
    recipients.push({ minter: minter.address, amount: 50 });
  });

  beforeEach(async () => {
    const { MintableRewardsFactory, ArtemStakingRewards } = await deployments.fixture(["rewards"]);
    factory = (await ethers.getContractAt("MintableRewardsFactory", MintableRewardsFactory.address)) as MintableRewardsFactory;
    store = (await ethers.getContractAt("AllowancesStore", ArtemStakingRewards.address)) as AllowancesStore;
    await store.update(recipients);
    const receipt = await (await factory.connect(artist).create(
      {
        name: "Roberto Lo Giacco",
        symbol: "RLG",
        contentUrl: "ipfs://QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d",
        contentHash: "0x04db57416b770a06b3b2123531e68d67e9d96872f453fa77bc413e9e53fc1bfc",
        metadataUrl: "ipfs://QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d"
      },
      2500,
      0,
      150,
      [{ holder: (await curator.getAddress()) as string, bps: 1000 }, { holder: (await shareholder.getAddress()) as string, bps: 500 }],
      store.address
    )).wait();
    for (const event of receipt.events!) {
      if (event.event === "CreatedRewards") {
        rewards = (await ethers.getContractAt("MintableRewards", event.args![4])) as MintableRewards;
      }
    }
  });

  it("Artist shares are calculated correctly", async function () {
    expect(await rewards.shares(await artist.getAddress())).to.be.equal(8500);
  });

  it("Artist can mint for self", async function () {
    await expect(rewards.mint())
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, artist.address, 1);

    const artistBalance = await rewards.balanceOf(artist.address);
    await expect(await rewards.totalSupply()).to.equal(artistBalance);
  });

  it("Artist can mint for someone", async function () {
    await expect(rewards.mintAndTransfer([receiver.address]))
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 1);

    const receiverBalance = await rewards.balanceOf(receiver.address);
    await expect(await rewards.totalSupply()).to.equal(receiverBalance);
  });

  it("Artist can mint for others", async function () {
    const recipients = new Array<string>(250);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(rewards.mintAndTransfer(recipients))
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, recipients.length);
    const receiverBalance = await rewards.balanceOf(receiver.address);
    await expect(await rewards.totalSupply()).to.equal(receiverBalance);
  });

  it("Artist only can set sale price", async function () {
    await expect(rewards.setPrice(ethers.utils.parseEther("1.0")))
      .to.emit(rewards, "PriceChanged")
      .withArgs(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(minter).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(purchaser).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(receiver).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Allowed minter can mint for self", async function () {
    await expect(rewards.connect(minter).mint())
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, minter.address, 1);
    const minterBalance = await rewards.balanceOf(minter.address);
    await expect(await rewards.totalSupply()).to.equal(minterBalance);
  });

  it("Allowed minter can mint for someone", async function () {
    await expect(rewards.connect(minter).mintAndTransfer([receiver.address]))
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 1);
    const receiverBalance = await rewards.balanceOf(receiver.address);
    await expect(await rewards.totalSupply()).to.equal(receiverBalance);
  });

  it("Allowed minter can mint for others within limits", async function () {
    const recipients = new Array<string>(50);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(rewards.connect(minter).mintAndTransfer(recipients))
      .to.emit(rewards, "Transfer");
    const receiverBalance = await rewards.balanceOf(receiver.address);
    await expect(await rewards.totalSupply()).to.equal(receiverBalance);
  });

  it("Allowed minter cannot exceed his allowance", async function () {
    const recipients = new Array<string>(51);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(rewards.connect(minter).mintAndTransfer(recipients))
      .to.be.revertedWith("Minting not allowed or exceeding");
  });

   it("Revoked minters cannot mint for self or others", async function () {
    await store.update([{ minter: minter.address, amount: 50 }]);
    await expect(rewards.connect(minter).mint()).to.emit(rewards, "Transfer");
    await expect(await rewards.totalSupply()).to.be.equal(1);

    await store.update([{ minter: minter.address, amount: 0 }]);
    await expect(rewards.connect(minter).mint()).to.be.revertedWith("Minting not allowed");
    await expect(rewards.connect(minter).mintAndTransfer([receiver.address])).to.be.revertedWith("Minting not allowed");
    await expect(await rewards.totalSupply()).to.be.equal(1);
  });

  it("Anyone can mint without limit when zero address is allowed for minting", async function () {
    await rewards.allowPublic(true);

    await expect(rewards.connect(minter).mint())
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, minter.address, 1);
    await expect(rewards.connect(minter).mintAndTransfer([receiver.address]))
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 2);
    await expect(rewards.connect(purchaser).mint())
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, purchaser.address, 3);
    await expect(rewards.connect(receiver).mint())
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 4);

    await expect(await rewards.totalSupply()).to.be.equal(4);

    for (let i = 0; i < 10; i++) {
      await expect(rewards.connect(buyer).mint()).to.emit(rewards, "Transfer");
    }
    expect(await rewards.totalSupply()).to.be.equal(14);
  });

  it("Anyone can purchase at sale price", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.emit(rewards, "Transfer")
      .withArgs(ethers.constants.AddressZero, purchaser.address, 1);
    const purchaserBalance = await rewards.balanceOf(purchaser.address);
    await expect(await rewards.totalSupply()).to.equal(purchaserBalance);
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("1.0"));
  });

  it("Purchases are rejected when value is incorrect", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(artist).purchase({ value: ethers.utils.parseEther("1.0001") }))
      .to.be.revertedWith("Wrong price");
    await expect(rewards.connect(minter).purchase({ value: ethers.utils.parseEther("0.9999") }))
      .to.be.revertedWith("Wrong price");
    await expect(rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("0.0001") }))
      .to.be.revertedWith("Wrong price");
  });

  it("Purchases are disallowed when price is set to zero", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.emit(rewards, "Transfer");

    await rewards.setPrice(ethers.utils.parseEther("0.0"));
    await expect(rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.be.revertedWith("Not for sale");
  });

 it("Artist only can update content URL, but only to non empty value", async function () {
    await rewards.updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl", "https://ipfs.io/ipfs/newThumbnailUrl");
    expect(await rewards.contentUrl()).to.be.equal("https://ipfs.io/ipfs/newContentUrl");
    expect(await rewards.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/newThumbnailUrl");
    await expect(rewards.connect(minter).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(purchaser).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(receiver).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    expect(await rewards.contentUrl()).to.be.equal("https://ipfs.io/ipfs/newContentUrl");
    expect(await rewards.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/newThumbnailUrl");

    await expect(rewards.updateEditionsURLs("", "https://ipfs.io/ipfs/newThumbnailUrl")).to.be.revertedWith("Empty content URL");
  });

  it("Artist only can update thumbnail URL, also to empty value", async function () {
    await rewards.updateEditionsURLs("ipfs://content", "ipfs://thumbnail");
    await expect(await rewards.metadataUrl()).to.be.equal("ipfs://thumbnail");

    await expect(rewards.connect(minter).updateEditionsURLs("ipfs://content", "ipfs://thumbnail"))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(receiver).updateEditionsURLs("ipfs://content", "ipfs://thumbnail"))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(rewards.connect(purchaser).updateEditionsURLs("ipfs://content", ""))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await rewards.updateEditionsURLs("ipfs://content.new", "");
    await expect(await rewards.metadataUrl()).to.be.equal("");
  });

  it("Artist can withdraw its shares", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("1.0"));

    const before = await artist.getBalance();
    await expect(rewards.withdraw())
      .to.emit(rewards, "SharesPaid")
      .withArgs(artist.address, ethers.utils.parseEther(".85"));
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.15"));
    await expect((await artist.getBalance()).sub(before))
      .to.be.within(ethers.utils.parseEther("0.84"), ethers.utils.parseEther("0.85"));
  });

  it("Artist without pending payment cannot withdraw", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(artist).withdraw()).to.be.revertedWith("Account is not due payment");

    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(rewards.connect(artist).withdraw());
    await expect(rewards.connect(artist).withdraw()).to.be.revertedWith("Account is not due payment");
  });

  it("Artist withdrawing multiple times respect its global shares", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));

    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await rewards.connect(artist).withdraw();
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.15"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await rewards.connect(artist).withdraw();
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.30"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await rewards.connect(artist).withdraw();
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.45"));
  });

  it("Shareholders can withdraw their shares", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("1.0"));
    const before = await shareholder.getBalance();

    await expect(rewards.connect(shareholder).withdraw())
      .to.emit(rewards, "SharesPaid")
      .withArgs(shareholder.address, ethers.utils.parseEther(".05"));
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.95"));
    await expect((await shareholder.getBalance()).sub(before))
      .to.be.within(ethers.utils.parseEther("0.04"), ethers.utils.parseEther("0.05"));
  });

  it("Shareholders without pending payment cannot withdraw", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(shareholder).withdraw()).to.be.revertedWith("Account is not due payment");

    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(rewards.connect(shareholder).withdraw());
    await expect(rewards.connect(shareholder).withdraw()).to.be.revertedWith("Account is not due payment");
  });

  it("Shareholders withdrawing multiple times respect their global shares", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));

    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await rewards.connect(shareholder).withdraw();
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.95"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(rewards.connect(shareholder).withdraw()).to.changeEtherBalance;
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("1.90"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await rewards.connect(shareholder).withdraw();
    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("2.85"));
  });

  it("Artist and shareholders only can withdraw", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("1.0"));
    await expect(rewards.connect(minter).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(rewards.connect(purchaser).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(rewards.connect(receiver).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(rewards.connect(buyer).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(await rewards.connect(shareholder).withdraw())
      .to.changeEtherBalance(shareholder, ethers.utils.parseEther(".05"));
    await expect(await rewards.connect(artist).withdraw())
      .to.changeEtherBalance(artist, ethers.utils.parseEther(".85"));
    await expect(await rewards.connect(curator).withdraw())
      .to.changeEtherBalance(curator, ethers.utils.parseEther(".10"));

    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.0"));
  });

  it("Anyone can shake the contract", async function () {
    await rewards.setPrice(ethers.utils.parseEther("1.0"));
    await rewards.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(rewards.connect(purchaser).shake())
      .to.emit(rewards, "SharesPaid")
      .withArgs(shareholder.address, ethers.utils.parseEther(".05"))
      .and.to.emit(rewards, "SharesPaid")
      .withArgs(curator.address, ethers.utils.parseEther(".10"))
      .and.to.emit(rewards, "SharesPaid")
      .withArgs(artist.address, ethers.utils.parseEther(".85"));

    await expect(await rewards.provider.getBalance(rewards.address)).to.equal(ethers.utils.parseEther("0.0"));
  });

  it("Artist can transfer ownership", async function () {
    const shares = await rewards.shares(artist.address);
    expect(await rewards.owner()).to.be.equal(artist.address);
    await rewards.connect(artist).transferOwnership(buyer.address);
    expect(await rewards.owner()).to.be.equal(buyer.address);

    expect(await rewards.royaltyInfo(1, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([buyer.address, ethers.utils.parseEther("0.015")]);

    expect(await rewards.shares(buyer.address)).to.be.equal(shares);
    expect(await rewards.shares(artist.address)).to.be.equal(0);
    expect(await rewards.shares(shareholder.address)).to.be.equal(500);

    await rewards.connect(buyer).transferOwnership(shareholder.address);
    expect(await rewards.shares(shareholder.address)).to.be.equal(9000);
    expect(await rewards.shares(buyer.address)).to.be.equal(0);
  });

  it("ERC-721: totalSupply increases upon minting", async function () {
    await expect(await rewards.totalSupply()).to.be.equal(0);
    await rewards.connect(minter).mint();
    await expect(await rewards.totalSupply()).to.be.equal(1);
    await rewards.connect(artist).mint();
    await rewards.connect(minter).mintAndTransfer([receiver.address, receiver.address]);
    await expect(await rewards.totalSupply()).to.be.equal(4);
  });

  it("ERC-721: token ownership", async function () {
    await rewards.connect(minter).mint();
    await expect(await rewards.ownerOf(1)).to.be.equal(minter.address);

    await expect(rewards.ownerOf(2))
      .to.be.revertedWith("ERC721: owner query for nonexistent token");
    await rewards.connect(artist).mint();
    await expect(await rewards.ownerOf(2)).to.be.equal(artist.address);
  });

  it("ERC-721: token approve", async function () {
    await rewards.connect(minter).mint();
    await rewards.connect(minter).mint();

    await expect(rewards.connect(artist).approve(minter.address, 1))
      .to.be.revertedWith("ERC721: approval to current owner");

    await expect(rewards.connect(artist).approve(receiver.address, 1))
      .to.be.revertedWith("ERC721: approve caller is not owner nor approved for all");

    await expect(rewards.connect(minter).approve(receiver.address, 2))
      .to.emit(rewards, "Approval")
      .withArgs(minter.address, receiver.address, 2);

    await expect(rewards.connect(minter).approve(receiver.address, 3))
      .to.be.revertedWith("ERC721: owner query for nonexistent token");
  });

  it("ERC-721: token approveForAll", async function () {
    await rewards.connect(minter).mint();

    await expect(rewards.connect(minter).setApprovalForAll(receiver.address, true))
      .to.emit(rewards, "ApprovalForAll")
      .withArgs(minter.address, receiver.address, true);

    await rewards.connect(minter).mint();

    await expect(rewards.connect(receiver).transferFrom(minter.address, purchaser.address, 1))
      .to.emit(rewards, "Transfer")
      .withArgs(minter.address, purchaser.address, 1);

    await expect(rewards.connect(artist).transferFrom(minter.address, purchaser.address, 1))
      .to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

    await expect(rewards.connect(receiver).transferFrom(minter.address, curator.address, 2))
      .to.emit(rewards, "Transfer")
      .withArgs(minter.address, curator.address, 2);

    await expect(await rewards.totalSupply()).to.be.equal(2);
  });

  it("ERC-721: token burn", async function () {
    await rewards.connect(minter).mint();
    await expect(rewards.connect(artist).burn(1)).to.be.revertedWith("Not approved");
    await expect(rewards.connect(minter).burn(1));
  });

  it("ERC-2981: royaltyInfo", async function () {
    await rewards.connect(minter).mint();
    expect(await rewards.royaltyInfo(1, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([artist.address, ethers.utils.parseEther("0.015")]);
    expect(await rewards.royaltyInfo(2, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([artist.address, ethers.utils.parseEther("0.015")]);
  });

  it("Supports airdrop", async function () {
    const recipients = new Array<{ minter: string, amount: BigNumberish }>(500);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = { minter: ethers.Wallet.createRandom().address, amount: 1 };
    }
    await store.update(recipients);
    await rewards.airdrop(0, 300);
    await rewards.airdrop(300, 600);
    expect(await rewards.totalSupply()).to.be.equal(await store.totalAllowed());
    expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(await store.minters((await store.length()).sub(1)));

    await rewards.airdrop(0, 300);
    await rewards.airdrop(300, 600);
    expect(await rewards.totalSupply()).to.be.equal(await store.totalAllowed());
  });
});
