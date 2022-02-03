/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RewardsNFT } from "../src/RewardsNFT";
import { AllowancesStore, AllowancesStore__factory, MintableRewards, MintableRewardsFactory__factory } from "../src/types";
import { fail } from "assert";
import { BigNumber, BigNumberish } from "ethers";

const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("On RewardsNFT", () => {
	let facade: RewardsNFT;
	let factoryAddress: string;
	let storeAddress: string;
	let deployer: SignerWithAddress;
	let artist: SignerWithAddress;
	let curator: SignerWithAddress;
	let shareholder: SignerWithAddress;
	let receiver: SignerWithAddress;
	let purchaser: SignerWithAddress;
	let minter: SignerWithAddress;
	let signer: SignerWithAddress;
	let rewards: MintableRewards;
	let store:AllowancesStore;

	before(async () => {
		[deployer, artist, shareholder, curator, receiver, purchaser, minter, signer] = await ethers.getSigners(); // test wallets
		const { MintableRewardsFactory, ArtemGold } = await deployments.fixture(["rewards"]);
		factoryAddress = MintableRewardsFactory.address;
		storeAddress = ArtemGold.address;
		const factory = MintableRewardsFactory__factory.connect(factoryAddress, deployer);
		await factory.grantRole(await factory.ARTIST_ROLE(), artist.address);
		facade = new RewardsNFT(artist, factoryAddress);
		const info:RewardsNFT.Definition = {
			info: {
				name: "Emanuele",
				symbol: "LELE",
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x1f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			size: 1000,
			price: ethers.utils.parseEther("1.0"),
			royalties: 250,
			shares: [{ holder: curator.address, bps: 100 }]
		};
		rewards = (await facade.create(info, storeAddress)).instance;
		store = AllowancesStore__factory.connect(storeAddress, deployer);
		const recipients = new Array<{ minter: string, amount: BigNumberish }>(0);
		recipients.push({ minter: minter.address, amount: 10 });
		await store.update(recipients);
	});

	it("Artists can create a RewardsNFT", async function() {
		// given
		const info:RewardsNFT.Definition = {
			info: {
				name: "Emanuele",
				symbol: "LELE",
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x5f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			size: 1000,
			price: ethers.utils.parseEther("1.0"),
			royalties: 250,
			shares: [{ holder: curator.address, bps: 100 }]
		};
		// when
		const response = (await facade.create(info, storeAddress));

		// then
		expect(response.id).to.be.equal(2);
		expect(response.address.length).to.be.equal(42);
		const editions = response.instance;
		expect(await editions.name()).to.be.equal("Emanuele");
		expect(await editions.contentHash()).to.be.equal("0x5f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca");
	});
	it("Artist can leave unpopulated default values for price, shares and royalties on the RewardsNFT", async function() {
		// given
		const info:RewardsNFT.Definition = {
			info: {
				name: "Emanuele",
				symbol: "LELE",
				contentUrl: "ipfs://bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x6f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "ipfs://bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			}
		};
		// when
		const editions = (await facade.create(info, storeAddress)).instance;
		// then
		expect(await editions.connect(artist).name()).to.be.equal("Emanuele");
		expect(await editions.connect(artist).contentHash()).to.be.equal("0x6f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca");
		expect(await editions.connect(artist).metadataUrl()).to.be.equal("ipfs://bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu");
		expect(await editions.connect(artist).royalties()).to.be.equal(0);
		expect(await editions.connect(artist).price()).to.be.equal(0);
		expect(await editions.connect(artist).size()).to.be.equal(0);
		expect(await editions.connect(artist).shares(artist.address)).to.be.equal(10000);
	});

	it("Anyone can retrive info of a MeNFT", async () => {
		const anyone = new RewardsNFT(purchaser, (await deployments.get("MintableRewardsFactory")).address);
		const nft = await (await anyone.get(1)).instance;

		await expect(await nft.name()).to.be.equal("Emanuele");
		await expect(await nft.symbol()).to.be.equal("LELE");
		await expect(await nft.contentUrl()).to.be.equal("https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu");
		await expect(await nft.contentHash()).to.be.equal("0x1f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca");
		await expect(await nft.metadataUrl()).to.be.equal("https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu");
		await expect(await nft.price()).to.be.equal(ethers.utils.parseEther("1.0"));
		await expect(await nft.size()).to.be.equal(1000);
		await expect(await nft.royalties()).to.be.equal(250);
	});
	it("Artist can mint for self", async function () {
		await expect(await facade.mint(1)).to.be.equal(await rewards.totalSupply()); // returns minted token id
		await expect(await rewards.balanceOf(artist.address)).to.be.equal(1); // token is transferred
		await expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(artist.address); // token ownership has been updated
	});

	it("Artist can mint multiple editions", async function () {
		await expect(await facade.mintMultiple(1, curator.address, 3)).to.be.equal(await rewards.totalSupply()); // returns last minted token id
		await expect(await rewards.balanceOf(curator.address)).to.be.equal(3); // tokens are transferred
		await expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(curator.address); // token ownership has been updated
	});

	it("Artist can mint for others", async function () {
		const recipients = new Array<string>(10);
		for (let i = 0; i < recipients.length; i++) {
			recipients[i] = receiver.address;
		}
		await expect(await facade.mintAndTransfer(1, recipients)).to.be.equal(await rewards.totalSupply()); // returns last minted token id
		await expect(await rewards.balanceOf(receiver.address)).to.be.equal(10); // tokens are transferred
		await expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(receiver.address); // token ownership has been updated
	});
	it("None can mint if not authorized", async function () {
		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableRewardsFactory")).address); // create a façade for the buyer
		await expect(buyer.mint(1)).to.be.revertedWith("Minting not allowed");
	});
	it("Anyone can mint if authorized", async function () {
		const buyer = new RewardsNFT(minter, (await deployments.get("MintableRewardsFactory")).address); // create a façade for the buyer
		await expect(await buyer.mint(1)).to.be.equal(await rewards.totalSupply());
		await expect(await rewards.balanceOf(minter.address)).to.be.equal(1); // token is transferred
		await expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(minter.address); // token ownership has been updated
	});
	it("Authorized minter with 0 allowance cannot mint", async function () {
		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableRewardsFactory")).address); // create a façade for the buyer
		await expect(buyer.mint(1)).to.be.revertedWith("Minting not allowed");
	});
	it("Anyone is able to purchase an edition", async () => {
		rewards.connect(artist).setPrice(ethers.utils.parseEther("1.0")); // enables purchasing

		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableRewardsFactory")).address); // create a façade for the buyer
		const balance = await purchaser.getBalance(); // store balance before pourchase

		await expect(await buyer.purchase(1))
			.to.be.equal(await rewards.totalSupply()); // acquire a token in exchange of money

		await expect(await rewards.provider.getBalance(rewards.address)).to.be.equal(ethers.utils.parseEther("1.0")); // money has been transferred
		await expect((await purchaser.getBalance()).sub(balance))
			.to.be.within(ethers.utils.parseEther("-1.001"), ethers.utils.parseEther("-1.0")); // money has been subtracted from purchaser (includes gas)
		await expect(await rewards.ownerOf(await rewards.totalSupply())).to.be.equal(purchaser.address); // token has been transferred
	});
	it("Anyone is able to verify if can mint an edition", async () => {
		await expect(await facade.isAllowedMinter(1, signer.address)).to.be.false;
		await expect(await facade.isAllowedMinter(1, minter.address)).to.be.true;

		await expect(await facade.isAllowedMinter(1, curator.address)).to.be.false;
		await rewards.allowPublic(true); // allows anyone
		await expect(await facade.isAllowedMinter(1, purchaser.address)).to.be.true;
		await expect(await facade.isAllowedMinter(1, receiver.address)).to.be.true;
		await expect(await facade.isAllowedMinter(1, curator.address)).to.be.true;
		await expect(await facade.isAllowedMinter(1, shareholder.address)).to.be.true;
	});

	it("Admin is able to modify allowances", async () => {
		const facade = new RewardsNFT(deployer, factoryAddress);
		const required = (await facade.totalAllowed(storeAddress)) as BigNumber;
		const recipients = new Array<RewardsNFT.Allowance>(400);
		for (let i = 0; i < recipients.length; i++) {
			recipients[i] = { minter: ethers.Wallet.createRandom().address, amount: 5 };
		}
		await facade.updateAllowances(storeAddress, recipients);
		expect(await facade.totalAllowed(storeAddress)).to.be.equal(required.add(recipients.length * 5));
	});

	it("Admin is able to modify multiple allowances to the same value", async () => {
		const facade = new RewardsNFT(deployer, factoryAddress);
		const required = (await facade.totalAllowed(storeAddress)) as BigNumber;
		const recipients = new Array<string>(100);
		for (let i = 0; i < recipients.length; i++) {
			recipients[i] = ethers.Wallet.createRandom().address;
		}
		await facade.updateAllowancesTo(storeAddress, recipients, 10);
		expect(await facade.totalAllowed(storeAddress)).to.be.equal(required.add(1000));
	});

	it("Deployer can grant/revoke artists", async () => {
		facade.grantArtist(signer.address).then(() => fail("Should have failed"), () => {});
		facade.revokeArtist(artist.address).then(() => fail("Should have failed"), () => {});

		const admin = new RewardsNFT(deployer, factoryAddress);
		await expect(await admin.isArtist(signer.address)).to.be.false;

		await expect(await admin.grantArtist(signer.address)).to.be.true;
		await expect(await admin.isArtist(signer.address)).to.be.true;

		await expect(await admin.revokeArtist(signer.address)).to.be.true;
		await expect(await admin.isArtist(signer.address)).to.be.false;
	});

	it("Anyone can check role admin", async () => {
		const admin = new RewardsNFT(deployer, factoryAddress);
		await expect(await admin.isAdmin(signer.address)).to.be.false;
		await expect(await admin.isAdmin(deployer.address)).to.be.true;
	});
});
