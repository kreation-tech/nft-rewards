/* eslint-disable node/no-missing-import */
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { MintableEditionsFactory, MintableEditions, AllowancesStore } from "../src/types";

const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("MintableEditions", function () {
  let artist: SignerWithAddress;
  let curator: SignerWithAddress;
  let shareholder: SignerWithAddress;
  let buyer: SignerWithAddress;
  let minter: SignerWithAddress;
  let receiver: SignerWithAddress;
  let purchaser: SignerWithAddress;
  let editions: MintableEditions;
  let factory: MintableEditionsFactory;
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
    const { MintableEditionsFactory, AllowancesStore } = await deployments.fixture(["editions"]);
    factory = (await ethers.getContractAt("MintableEditionsFactory", MintableEditionsFactory.address)) as MintableEditionsFactory;
    store = (await ethers.getContractAt("AllowancesStore", AllowancesStore.address)) as AllowancesStore;
    await store.updateAllowances(recipients);
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
      if (event.event === "CreatedEditions") {
        editions = (await ethers.getContractAt("MintableEditions", event.args![4])) as MintableEditions;
      }
    }
  });

  it("Artist shares are calculated correctly", async function () {
    expect(await editions.shares(await artist.getAddress())).to.be.equal(8500);
  });

  it("Artist can mint for self", async function () {
    await expect(editions.mint())
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, artist.address, 1);

    const artistBalance = await editions.balanceOf(artist.address);
    await expect(await editions.totalSupply()).to.equal(artistBalance);
  });

  it("Artist can mint for someone", async function () {
    await expect(editions.mintAndTransfer([receiver.address]))
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 1);

    const receiverBalance = await editions.balanceOf(receiver.address);
    await expect(await editions.totalSupply()).to.equal(receiverBalance);
  });

  it("Artist can mint for others", async function () {
    const recipients = new Array<string>(250);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(editions.mintAndTransfer(recipients))
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, recipients.length);
    const receiverBalance = await editions.balanceOf(receiver.address);
    await expect(await editions.totalSupply()).to.equal(receiverBalance);
  });

  it("Artist only can set sale price", async function () {
    await expect(editions.setPrice(ethers.utils.parseEther("1.0")))
      .to.emit(editions, "PriceChanged")
      .withArgs(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(minter).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(purchaser).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(receiver).setPrice(ethers.utils.parseEther("1.0"))).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Allowed minter can mint for self", async function () {
    await expect(editions.connect(minter).mint())
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, minter.address, 1);
    const minterBalance = await editions.balanceOf(minter.address);
    await expect(await editions.totalSupply()).to.equal(minterBalance);
  });

  it("Allowed minter can mint for someone", async function () {
    await expect(editions.connect(minter).mintAndTransfer([receiver.address]))
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 1);
    const receiverBalance = await editions.balanceOf(receiver.address);
    await expect(await editions.totalSupply()).to.equal(receiverBalance);
  });

  it("Allowed minter can mint for others within limits", async function () {
    const recipients = new Array<string>(50);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(editions.connect(minter).mintAndTransfer(recipients))
      .to.emit(editions, "Transfer");
    const receiverBalance = await editions.balanceOf(receiver.address);
    await expect(await editions.totalSupply()).to.equal(receiverBalance);
  });

  it("Allowed minter cannot exceed his allowance", async function () {
    const recipients = new Array<string>(51);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = receiver.address;
    }
    await expect(editions.connect(minter).mintAndTransfer(recipients))
      .to.be.revertedWith("Minting not allowed or exceeding");
  });

   it("Revoked minters cannot mint for self or others", async function () {
    await store.updateAllowances([{ minter: minter.address, amount: 50 }]);
    await expect(editions.connect(minter).mint()).to.emit(editions, "Transfer");
    await expect(await editions.totalSupply()).to.be.equal(1);

    await store.updateAllowances([{ minter: minter.address, amount: 0 }]);
    await expect(editions.connect(minter).mint()).to.be.revertedWith("Minting not allowed");
    await expect(editions.connect(minter).mintAndTransfer([receiver.address])).to.be.revertedWith("Minting not allowed");
    await expect(await editions.totalSupply()).to.be.equal(1);
  });

  it("Anyone can mint without limit when zero address is allowed for minting", async function () {
    await editions.allowPublic(true);

    await expect(editions.connect(minter).mint())
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, minter.address, 1);
    await expect(editions.connect(minter).mintAndTransfer([receiver.address]))
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 2);
    await expect(editions.connect(purchaser).mint())
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, purchaser.address, 3);
    await expect(editions.connect(receiver).mint())
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, receiver.address, 4);

    await expect(await editions.totalSupply()).to.be.equal(4);

    for (let i = 0; i < 10; i++) {
      await expect(editions.connect(buyer).mint()).to.emit(editions, "Transfer");
    }
    expect(await editions.totalSupply()).to.be.equal(14);
  });

  it("Anyone can purchase at sale price", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.emit(editions, "Transfer")
      .withArgs(ethers.constants.AddressZero, purchaser.address, 1);
    const purchaserBalance = await editions.balanceOf(purchaser.address);
    await expect(await editions.totalSupply()).to.equal(purchaserBalance);
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("1.0"));
  });

  it("Purchases are rejected when value is incorrect", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(artist).purchase({ value: ethers.utils.parseEther("1.0001") }))
      .to.be.revertedWith("Wrong price");
    await expect(editions.connect(minter).purchase({ value: ethers.utils.parseEther("0.9999") }))
      .to.be.revertedWith("Wrong price");
    await expect(editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("0.0001") }))
      .to.be.revertedWith("Wrong price");
  });

  it("Purchases are disallowed when price is set to zero", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.emit(editions, "Transfer");

    await editions.setPrice(ethers.utils.parseEther("0.0"));
    await expect(editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") }))
      .to.be.revertedWith("Not for sale");
  });

 it("Artist only can update content URL, but only to non empty value", async function () {
    await editions.updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl", "https://ipfs.io/ipfs/newThumbnailUrl");
    expect(await editions.contentUrl()).to.be.equal("https://ipfs.io/ipfs/newContentUrl");
    expect(await editions.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/newThumbnailUrl");
    await expect(editions.connect(minter).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(purchaser).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(receiver).updateEditionsURLs("https://ipfs.io/ipfs/newContentUrl2", "https://ipfs.io/ipfs/newThumbnailUrl2")).to.be.revertedWith("Ownable: caller is not the owner");
    expect(await editions.contentUrl()).to.be.equal("https://ipfs.io/ipfs/newContentUrl");
    expect(await editions.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/newThumbnailUrl");

    await expect(editions.updateEditionsURLs("", "https://ipfs.io/ipfs/newThumbnailUrl")).to.be.revertedWith("Empty content URL");
  });

  it("Artist only can update thumbnail URL, also to empty value", async function () {
    await editions.updateEditionsURLs("ipfs://content", "ipfs://thumbnail");
    await expect(await editions.metadataUrl()).to.be.equal("ipfs://thumbnail");

    await expect(editions.connect(minter).updateEditionsURLs("ipfs://content", "ipfs://thumbnail"))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(receiver).updateEditionsURLs("ipfs://content", "ipfs://thumbnail"))
      .to.be.revertedWith("Ownable: caller is not the owner");
    await expect(editions.connect(purchaser).updateEditionsURLs("ipfs://content", ""))
      .to.be.revertedWith("Ownable: caller is not the owner");

    await editions.updateEditionsURLs("ipfs://content.new", "");
    await expect(await editions.metadataUrl()).to.be.equal("");
  });

  it("Artist can withdraw its shares", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("1.0"));

    const before = await artist.getBalance();
    await expect(editions.withdraw())
      .to.emit(editions, "SharesPaid")
      .withArgs(artist.address, ethers.utils.parseEther(".85"));
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.15"));
    await expect((await artist.getBalance()).sub(before))
      .to.be.within(ethers.utils.parseEther("0.84"), ethers.utils.parseEther("0.85"));
  });

  it("Artist without pending payment cannot withdraw", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(artist).withdraw()).to.be.revertedWith("Account is not due payment");

    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(editions.connect(artist).withdraw());
    await expect(editions.connect(artist).withdraw()).to.be.revertedWith("Account is not due payment");
  });

  it("Artist withdrawing multiple times respect its global shares", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));

    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await editions.connect(artist).withdraw();
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.15"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await editions.connect(artist).withdraw();
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.30"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await editions.connect(artist).withdraw();
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.45"));
  });

  it("Shareholders can withdraw their shares", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("1.0"));
    const before = await shareholder.getBalance();

    await expect(editions.connect(shareholder).withdraw())
      .to.emit(editions, "SharesPaid")
      .withArgs(shareholder.address, ethers.utils.parseEther(".05"));
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.95"));
    await expect((await shareholder.getBalance()).sub(before))
      .to.be.within(ethers.utils.parseEther("0.04"), ethers.utils.parseEther("0.05"));
  });

  it("Shareholders without pending payment cannot withdraw", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(shareholder).withdraw()).to.be.revertedWith("Account is not due payment");

    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(editions.connect(shareholder).withdraw());
    await expect(editions.connect(shareholder).withdraw()).to.be.revertedWith("Account is not due payment");
  });

  it("Shareholders withdrawing multiple times respect their global shares", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));

    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await editions.connect(shareholder).withdraw();
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.95"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await expect(editions.connect(shareholder).withdraw()).to.changeEtherBalance;
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("1.90"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });
    await editions.connect(shareholder).withdraw();
    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("2.85"));
  });

  it("Artist and shareholders only can withdraw", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("1.0"));
    await expect(editions.connect(minter).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(editions.connect(purchaser).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(editions.connect(receiver).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(editions.connect(buyer).withdraw()).to.be.revertedWith("Account is not due payment");
    await expect(await editions.connect(shareholder).withdraw())
      .to.changeEtherBalance(shareholder, ethers.utils.parseEther(".05"));
    await expect(await editions.connect(artist).withdraw())
      .to.changeEtherBalance(artist, ethers.utils.parseEther(".85"));
    await expect(await editions.connect(curator).withdraw())
      .to.changeEtherBalance(curator, ethers.utils.parseEther(".10"));

    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.0"));
  });

  it("Anyone can shake the contract", async function () {
    await editions.setPrice(ethers.utils.parseEther("1.0"));
    await editions.connect(purchaser).purchase({ value: ethers.utils.parseEther("1.0") });

    await expect(editions.connect(purchaser).shake())
      .to.emit(editions, "SharesPaid")
      .withArgs(shareholder.address, ethers.utils.parseEther(".05"))
      .and.to.emit(editions, "SharesPaid")
      .withArgs(curator.address, ethers.utils.parseEther(".10"))
      .and.to.emit(editions, "SharesPaid")
      .withArgs(artist.address, ethers.utils.parseEther(".85"));

    await expect(await editions.provider.getBalance(editions.address)).to.equal(ethers.utils.parseEther("0.0"));
  });

  it("Artist can transfer ownership", async function () {
    const shares = await editions.shares(artist.address);
    expect(await editions.owner()).to.be.equal(artist.address);
    await editions.connect(artist).transferOwnership(buyer.address);
    expect(await editions.owner()).to.be.equal(buyer.address);

    expect(await editions.royaltyInfo(1, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([buyer.address, ethers.utils.parseEther("0.015")]);

    expect(await editions.shares(buyer.address)).to.be.equal(shares);
    expect(await editions.shares(artist.address)).to.be.equal(0);
    expect(await editions.shares(shareholder.address)).to.be.equal(500);

    await editions.connect(buyer).transferOwnership(shareholder.address);
    expect(await editions.shares(shareholder.address)).to.be.equal(9000);
    expect(await editions.shares(buyer.address)).to.be.equal(0);
  });

  it("ERC-721: totalSupply increases upon minting", async function () {
    await expect(await editions.totalSupply()).to.be.equal(0);
    await editions.connect(minter).mint();
    await expect(await editions.totalSupply()).to.be.equal(1);
    await editions.connect(artist).mint();
    await editions.connect(minter).mintAndTransfer([receiver.address, receiver.address]);
    await expect(await editions.totalSupply()).to.be.equal(4);
  });

  it("ERC-721: token ownership", async function () {
    await editions.connect(minter).mint();
    await expect(await editions.ownerOf(1)).to.be.equal(minter.address);

    await expect(editions.ownerOf(2))
      .to.be.revertedWith("ERC721: owner query for nonexistent token");
    await editions.connect(artist).mint();
    await expect(await editions.ownerOf(2)).to.be.equal(artist.address);
  });

  it("ERC-721: token approve", async function () {
    await editions.connect(minter).mint();
    await editions.connect(minter).mint();

    await expect(editions.connect(artist).approve(minter.address, 1))
      .to.be.revertedWith("ERC721: approval to current owner");

    await expect(editions.connect(artist).approve(receiver.address, 1))
      .to.be.revertedWith("ERC721: approve caller is not owner nor approved for all");

    await expect(editions.connect(minter).approve(receiver.address, 2))
      .to.emit(editions, "Approval")
      .withArgs(minter.address, receiver.address, 2);

    await expect(editions.connect(minter).approve(receiver.address, 3))
      .to.be.revertedWith("ERC721: owner query for nonexistent token");
  });

  it("ERC-721: token approveForAll", async function () {
    await editions.connect(minter).mint();

    await expect(editions.connect(minter).setApprovalForAll(receiver.address, true))
      .to.emit(editions, "ApprovalForAll")
      .withArgs(minter.address, receiver.address, true);

    await editions.connect(minter).mint();

    await expect(editions.connect(receiver).transferFrom(minter.address, purchaser.address, 1))
      .to.emit(editions, "Transfer")
      .withArgs(minter.address, purchaser.address, 1);

    await expect(editions.connect(artist).transferFrom(minter.address, purchaser.address, 1))
      .to.be.revertedWith("ERC721: transfer caller is not owner nor approved");

    await expect(editions.connect(receiver).transferFrom(minter.address, curator.address, 2))
      .to.emit(editions, "Transfer")
      .withArgs(minter.address, curator.address, 2);

    await expect(await editions.totalSupply()).to.be.equal(2);
  });

  it("ERC-721: token burn", async function () {
    await editions.connect(minter).mint();
    await expect(editions.connect(artist).burn(1)).to.be.revertedWith("Not approved");
    await expect(editions.connect(minter).burn(1));
  });

  it("ERC-2981: royaltyInfo", async function () {
    await editions.connect(minter).mint();
    expect(await editions.royaltyInfo(1, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([artist.address, ethers.utils.parseEther("0.015")]);
    expect(await editions.royaltyInfo(2, ethers.utils.parseEther("1.0")))
      .to.be.deep.equal([artist.address, ethers.utils.parseEther("0.015")]);
  });

  it("Supports airdrop", async function () {
    const recipients = new Array<{ minter: string, amount: BigNumberish }>(500);
    for (let i = 0; i < recipients.length; i++) {
      recipients[i] = { minter: ethers.Wallet.createRandom().address, amount: 1 };
    }
    await store.updateAllowances(recipients);
    await editions.airdrop(0, 300);
    await editions.airdrop(300, 600);
    expect(await editions.totalSupply()).to.be.equal(await store.totalAllowed());
    expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(await store.minters((await store.count()).sub(1)));

    await editions.airdrop(0, 300);
    await editions.airdrop(300, 600);
    expect(await editions.totalSupply()).to.be.equal(await store.totalAllowed());
  });
});
