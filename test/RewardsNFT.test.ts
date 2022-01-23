/* eslint-disable node/no-missing-import */
/* eslint-disable camelcase */
import "@nomiclabs/hardhat-ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RewardsNFT } from "../src/RewardsNFT";
import { AllowancesStore, AllowancesStore__factory, MintableEditions, MintableEditionsFactory__factory } from "../src/types";
import { fail } from "assert";
import { BigNumberish } from "ethers";

const { expect } = require("chai");
const { ethers, deployments } = require("hardhat");

describe("On RewardsNFT", () => {
	let hofa: RewardsNFT;
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
	let editions: MintableEditions;
	let store:AllowancesStore;

	before(async () => {
		[deployer, artist, shareholder, curator, receiver, purchaser, minter, signer] = await ethers.getSigners(); // test wallets
		const { MintableEditionsFactory, AllowancesStore } = await deployments.fixture(["editions"]);
		factoryAddress = MintableEditionsFactory.address;
		storeAddress = AllowancesStore.address;
		const factory = MintableEditionsFactory__factory.connect(factoryAddress, deployer);
		await factory.grantRole(await factory.ARTIST_ROLE(), artist.address);
		hofa = new RewardsNFT(artist, factoryAddress);
		const info:RewardsNFT.Definition = {
			info: {
				name: "Emanuele",
				symbol: "LELE",
				description: "My very first MeNFT",
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x1f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			size: 1000,
			price: ethers.utils.parseEther("1.0"),
			royalties: 250,
			shares: [{ holder: curator.address, bps: 100 }],
			allowances: storeAddress
		};
		editions = (await hofa.create(info)).instance;
		store = AllowancesStore__factory.connect(storeAddress, deployer);
		const recipients = new Array<{ minter: string, amount: BigNumberish }>(0);
		recipients.push({ minter: minter.address, amount: 10 });
		await store.updateAllowances(recipients);
	});

	it("Artists can create a RewardsNFT", async function() {
		// given
		const info:RewardsNFT.Definition = {
			info: {
				name: "Emanuele",
				symbol: "LELE",
				description: "My very first MeNFT",
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x5f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			size: 1000,
			price: ethers.utils.parseEther("1.0"),
			royalties: 250,
			shares: [{ holder: curator.address, bps: 100 }],
			allowances: storeAddress
		};
		// when
		const response = (await hofa.create(info));

		// then
		expect(response.id).to.be.equal(1);
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
				description: "My very first MeNFT",
				contentUrl: "ipfs://bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x6f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "ipfs://bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			allowances: storeAddress
		};
		// when
		const editions = (await hofa.create(info)).instance;
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
		const anyone = new RewardsNFT(purchaser, (await deployments.get("MintableEditionsFactory")).address);
		const nft = await (await anyone.get(0)).instance;

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
		await expect(await hofa.mint(0)).to.be.equal(await editions.totalSupply()); // returns minted token id
		await expect(await editions.balanceOf(artist.address)).to.be.equal(1); // token is transferred
		await expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(artist.address); // token ownership has been updated
	});

	it("Artist can mint multiple editions", async function () {
		await expect(await hofa.mintMultiple(0, curator.address, 3)).to.be.equal(await editions.totalSupply()); // returns last minted token id
		await expect(await editions.balanceOf(curator.address)).to.be.equal(3); // tokens are transferred
		await expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(curator.address); // token ownership has been updated
	});

	it("Artist can mint for others", async function () {
		const recipients = new Array<string>(10);
		for (let i = 0; i < recipients.length; i++) {
			recipients[i] = receiver.address;
		}
		await expect(await hofa.mintAndTransfer(0, recipients)).to.be.equal(await editions.totalSupply()); // returns last minted token id
		await expect(await editions.balanceOf(receiver.address)).to.be.equal(10); // tokens are transferred
		await expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(receiver.address); // token ownership has been updated
	});
	it("None can mint if not authorized", async function () {
		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableEditionsFactory")).address); // create a façade for the buyer
		await expect(buyer.mint(0)).to.be.revertedWith("Minting not allowed");
	});
	it("Anyone can mint if authorized", async function () {
		const buyer = new RewardsNFT(minter, (await deployments.get("MintableEditionsFactory")).address); // create a façade for the buyer
		await expect(await buyer.mint(0)).to.be.equal(await editions.totalSupply());
		await expect(await editions.balanceOf(minter.address)).to.be.equal(1); // token is transferred
		await expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(minter.address); // token ownership has been updated
	});
	it("Authorized minter with 0 allowance cannot mint", async function () {
		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableEditionsFactory")).address); // create a façade for the buyer
		await expect(buyer.mint(0)).to.be.revertedWith("Minting not allowed");
	});
	it("Anyone is able to purchase an edition", async () => {
		editions.connect(artist).setPrice(ethers.utils.parseEther("1.0")); // enables purchasing

		const buyer = new RewardsNFT(purchaser, (await deployments.get("MintableEditionsFactory")).address); // create a façade for the buyer
		const balance = await purchaser.getBalance(); // store balance before pourchase

		await expect(await buyer.purchase(0))
			.to.be.equal(await editions.totalSupply()); // acquire a token in exchange of money

		await expect(await editions.provider.getBalance(editions.address)).to.be.equal(ethers.utils.parseEther("1.0")); // money has been transferred
		await expect((await purchaser.getBalance()).sub(balance))
			.to.be.within(ethers.utils.parseEther("-1.001"), ethers.utils.parseEther("-1.0")); // money has been subtracted from purchaser (includes gas)
		await expect(await editions.ownerOf(await editions.totalSupply())).to.be.equal(purchaser.address); // token has been transferred
	});
	it("Anyone is able to verify if can mint an edition", async () => {
		await expect(await hofa.isAllowedMinter(0, signer.address)).to.be.false;
		await expect(await hofa.isAllowedMinter(0, minter.address)).to.be.true;

		await expect(await hofa.isAllowedMinter(0, curator.address)).to.be.false;
		await editions.allowPublic(true); // allows anyone
		await expect(await hofa.isAllowedMinter(0, purchaser.address)).to.be.true;
		await expect(await hofa.isAllowedMinter(0, receiver.address)).to.be.true;
		await expect(await hofa.isAllowedMinter(0, curator.address)).to.be.true;
		await expect(await hofa.isAllowedMinter(0, shareholder.address)).to.be.true;
	});

	it("Deployer can grant/revoke artists", async () => {
		hofa.grantArtist(signer.address).then(() => fail("Should have failed"), () => {});
		hofa.revokeArtist(artist.address).then(() => fail("Should have failed"), () => {});

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

	it("Wrapper is able to escape definition data", async () => {
		const info:RewardsNFT.Definition = {
			info: {
				// eslint-disable-next-line quotes
				name: 'The "Big" Lele',
				symbol: "LE\\LE",
				// eslint-disable-next-line quotes
				description: 'This "is" something\nneeding \\/ escaping',
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x2f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			size: 500,
			allowances: storeAddress
		};
		// when
		const response = (await hofa.create(info));
		// then
		const editions = response.instance;
		expect(await editions.name()).to.be.equal("The \\\"Big\\\" Lele");
		expect(await editions.symbol()).to.be.equal("LE\\\\LE");

		await editions.mint();
		expect(await editions.tokenURI(1)).to.be.equal("https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu?tokenId=1");
	});

	it("Wrapper is able to unescape definition data", async () => {
		const info:RewardsNFT.Definition = {
			info: {
				name: "The \"Big\" Lele",
				symbol: "LE\\LE",
				description: "This \"is\" something\tneeding \\/ escaping",
				contentUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu",
				contentHash: "0x3f9fd2ab1432ad0f45e1ee8f789a37ea6186cc408763bb9bd93055a7c7c2b2ca",
				metadataUrl: "https://ipfs.io/ipfs/bafybeib52yyp5jm2vwifd65mv3fdmno6dazwzyotdklpyq2sv6g2ajlgxu"
			},
			allowances: storeAddress
		};
		// when
		const response = (await hofa.create(info));
		// then
		const editions = response.instance;
		expect(RewardsNFT.unescape(await editions.name())).to.be.equal("The \"Big\" Lele");
		expect(RewardsNFT.unescape(await editions.symbol())).to.be.equal("LE\\LE");
	});
});
