/* eslint-disable brace-style */
/* eslint-disable node/no-missing-import */
/* eslint-disable no-redeclare */
/* eslint-disable import/export */
/**
 * ░█▄ █▒█▀░▀█▀  ▒█▀▄▒██▀░█ ░▒█▒▄▀▄▒█▀▄░█▀▄░▄▀▀
 * ░█▒▀█░█▀ ▒█▒▒░░█▀▄░█▄▄░▀▄▀▄▀░█▀█░█▀▄▒█▄▀▒▄██
 *
 * Made with 🧡 by www.Kreation.tech
 */
import { Provider } from "@ethersproject/providers";
import { Signer } from "@ethersproject/abstract-signer";
// eslint-disable-next-line camelcase
import { MintableRewardsFactory__factory, MintableRewards__factory, AllowancesStore__factory } from "./types";
import type { MintableRewardsFactory, MintableRewards } from "./types";
import { BigNumber, BigNumberish } from "@ethersproject/bignumber";
import addresses from "./addresses.json";
import roles from "./roles.json";
// eslint-disable-next-line node/no-unpublished-import
import { ethers } from "ethers";

export declare namespace RewardsNFT {
	// eslint-disable-next-line no-unused-vars
	interface Allowance {
		minter: string;
		amount: number
	}

	// eslint-disable-next-line no-unused-vars
	interface Definition {
		info: {
			name:string,
			symbol:string,
			contentUrl:string,
			contentHash: string,
			metadataUrl:string
		}
		size?:number,
		price?:BigNumberish,
		royalties?:number,
		shares?: {
			holder: string;
			bps: number
		}[]
	}
}

export class RewardsNFT {
	private signerOrProvider: Signer | Provider;
	public readonly factory: MintableRewardsFactory;
	public address:string;
	public roles:{[key: string]: string} = roles;

	constructor (signerOrProvider: Signer | Provider, factoryAddressOrChainId: string | number) {
		this.signerOrProvider = signerOrProvider;
		if (typeof (factoryAddressOrChainId) !== "string") {
			// load Factory contract
			const contracts:{[key: string]: string} = (addresses as {[key: string]: {[name: string]: string}})[factoryAddressOrChainId.toString()];
			if (!contracts) throw new Error("Unknown chain with id " + factoryAddressOrChainId);
			this.address = contracts.MintableRewardsFactory;
			this.factory = MintableRewardsFactory__factory.connect(this.address, signerOrProvider);
		} else {
			this.address = factoryAddressOrChainId;
			this.factory = MintableRewardsFactory__factory.connect(factoryAddressOrChainId as string, signerOrProvider);
		}
	}

	/**
	 * Determines the chain identifier
	 *
	 * @param signerOrProvider the signer or the provider
	 */
	public static async getChainId(signerOrProvider: Signer | Provider): Promise<number> {
		return new Promise((resolve, reject) => {
			const chainId = (signerOrProvider as Signer).getChainId();
			if (chainId === undefined) {
				(signerOrProvider as Provider).getNetwork().then((network: { chainId: number | PromiseLike<number>; }) => {
					resolve(network.chainId);
				});
			}
			resolve(chainId);
		});
	}

	public async metadata(title:string, description:string, uri:string, hash:string, thumbnail?:string): Promise<string> {
		return new Promise((resolve, reject) => {
			(this.signerOrProvider as Signer).getAddress().then((address) => {
				const metadata = {
					name: title,
					description: description,
					image: (thumbnail || uri),
					animation_url: thumbnail ? uri : undefined,
					properties: {
						sha256: hash
					}
				};
				resolve(JSON.stringify(metadata));
			});
		});
	}

	/**
	 * Creates a new EdNFT
	 *
	 * @param props the properties to assign to the editionable NFT to create
	 * @param allowanceStore the allowance store to assign to the editionable NFT
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async create(props:RewardsNFT.Definition, allowanceStore:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<{id:BigNumber, address:string, instance:MintableRewards}> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await this.factory
					.create({
						name: props.info.name,
						symbol: props.info.symbol,
						contentUrl: props.info.contentUrl,
						contentHash: props.info.contentHash,
						metadataUrl: props.info.metadataUrl
					}, props.size || 0, props.price || 0, props.royalties || 0, props.shares || [], allowanceStore);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "CreatedRewards") {
						resolve({
							id: log.args![0],
							address: log.args![4] as string,
							instance: MintableRewards__factory.connect(log.args![4], this.signerOrProvider)
						});
					}
				}
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Purchases an edition of an EdNFT
	 *
	 * @param id the EdNFT identifier
	 * @param confirmations number of confirmations to wait for, defaults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async purchase(id:BigNumberish, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<BigNumber> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = MintableRewards__factory.connect(await this.factory.get(id), this.signerOrProvider);
				const price = await edition.price();
				if (price.gt(0)) {
					const tx = await edition.purchase({ value: price });
					let received = tx.confirmations;
					let receipt = await tx.wait();
					while (received < confirmations) {
						if (callback) callback(received, confirmations);
						receipt = await tx.wait(received++);
					}
					for (const log of receipt.events!) {
						if (log.event === "Transfer") {
							resolve(log.args![2]);
						}
					}
					reject(new Error("Event `Transfer` not found"));
				}
				reject(new Error("Editions not for sale"));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Mints an edition of an EdNFT
	 *
	 * @param id the EdNFT identifier
	 * @param confirmations number of confirmations to wait for, defaults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async mint(id:BigNumberish, confirmations:number = 1, callback?:(received:number, requested:number) => void):Promise<BigNumber> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = MintableRewards__factory.connect(await this.factory.get(id), this.signerOrProvider);
				const tx = await edition.mint();
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "Transfer") {
						resolve(log.args![2]);
					}
				}
				reject(new Error("Event `Transfer` not found"));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Updates price
	 *
	 * @param id the EdNFT identifier
	 * @param confirmations number of confirmations to wait for, defaults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async update(id:BigNumberish, data:BigNumberish, confirmations:number = 1, callback?:(received:number, requested:number) => void):Promise<boolean> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = (await this.get(id)).instance;
				// price
				const tx = await edition.setPrice(data as BigNumberish);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "PriceChanged") {
						resolve(true);
					}
				}
				reject(new Error("Price update failed"));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Mints multiple editions of an EdNFT
	 *
	 * @param id the EdNFT identifier
	 * @param receiver the receiver of the editions
	 * @param count number of editions to mint
	 * @param confirmations number of confirmations to wait for, defaults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async mintMultiple(id:BigNumberish, receiver: string, count:number, confirmations:number = 1, callback?:(received:number, requested:number) => void):Promise<BigNumber> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = MintableRewards__factory.connect(await this.factory.get(id), this.signerOrProvider);
				const addresses: Array<string> = [];
				for (let i = 0; i < count; i++) {
					addresses.push(receiver);
				}
				const tx = await edition.mintAndTransfer(addresses);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				if (receipt.events) {
					for (let i = receipt.events.length; i > 0; i++) {
						if (receipt.events[i - 1].event === "Transfer") {
							resolve(receipt.events[i - 1].args![2]);
						}
					}
				}
				reject(new Error("Event `Transfer` not found"));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Mints multiple editions of an EdNFT for firrente recipients
	 *
	 * @param id the EdNFT identifier
	 * @param recipients list of addresses receiving the editions
	 * @param count number of instances to mint for each recipient
	 * @param confirmations number of confirmations to wait for, defaults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async mintAndTransfer(id:BigNumberish, recipients:Array<string>, count:number = 1, confirmations:number = 1, callback?:(received:number, requested:number) => void):Promise<BigNumber> {
		const addresses: Array<string> = [];
		for (const addr of recipients!) {
			for (let i = 0; i < count; i++) {
				addresses.push(addr);
			}
		}
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = MintableRewards__factory.connect(await this.factory.get(id), this.signerOrProvider);
				const tx = await edition.mintAndTransfer(addresses);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				if (receipt.events) {
					for (let i = receipt.events!.length; i > 0; i--) {
						if (receipt.events[i - 1].event === "Transfer") {
							resolve(receipt.events![i - 1].args![2]);
						}
					}
				}
				reject(new Error("Event `Transfer` not found"));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Retrieves an EdNFT
	 *
	 * @param id the EdNFT identifier
	 */
	public async get(id: BigNumberish): Promise<{address:string, instance:MintableRewards}> {
		return new Promise((resolve) => {
			this.factory.get(id).then((address) => {
				resolve({
					address: address,
					instance: MintableRewards__factory.connect(address, this.signerOrProvider).connect(this.signerOrProvider)
				});
			});
		});
	}

	/**
	 * Retreves the amount of EdNFTs produced so far
	 */
	public async instances(): Promise<BigNumber> {
		return new Promise((resolve) => {
			resolve(this.factory.instances());
		});
	}

	/**
	 * Verifies if an address is entitled to mint
	 *
	 * @param id the EdNFT identifier
	 * @param address the address to verify, defaults to current wallet
	 */
	public async isAllowedMinter(id:BigNumberish, address:string | undefined): Promise<boolean> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const edition = (await this.get(id)).instance;
				resolve(
					await edition.owner() === address ||
					await edition.allowanceOf(address || await (this.signerOrProvider as Signer).getAddress()) > 0 ||
					await edition.allowanceOf(ethers.constants.AddressZero) > 0);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	public async updateAllowances(allowanceStore:string, allowances:RewardsNFT.Allowance[], confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await store.update(allowances);
				let received = tx.confirmations;
				await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					await tx.wait(received++);
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	public async updateAllowancesTo(allowanceStore:string, receivers:string[], amount:number, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await store.updateTo(receivers, amount);
				let received = tx.confirmations;
				await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					await tx.wait(received++);
				}
				resolve(true);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	public async totalAllowed(allowanceStore:string): Promise<BigNumberish> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				resolve(await store.totalAllowed());
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	public async listAllowances(allowanceStore:string): Promise<RewardsNFT.Allowance[]> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				resolve((await store.list())
					.map(it => ({ minter: it.minter, amount: it.amount } as RewardsNFT.Allowance)));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Grants artist permissions to an address
	 *
	 * @param address the address to grant
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async grantArtist(address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return this._grantRole(roles.artist, address, confirmations, callback);
	}

	/**
	 * Revokes artist permissions from an address
	 *
	 * @param address the address to revoke
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async revokeArtist(address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return this._revokeRole(roles.artist, address, confirmations, callback);
	}

	/**
	 * Checks if an address is listed as artist
	 *
	 * @param address the address to check, defaults to current signer
	 */
	public async isArtist(address?:string): Promise<boolean> {
		return this._hasRole(roles.artist, address);
	}

	/**
	 * Grants admin permissions to an address
	 *
	 * @param address the address to grant
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async grantAdmin(address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return this._grantRole(roles.admin, address, confirmations, callback);
	}

	/**
	 * Grants admin permissions on the store to an address
	 *
	 * @param allowanceStore the allowance store address
	 * @param address the address to grant
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async grantStoreAdmin(allowanceStore:string, address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await store.grantRole(roles.admin, address);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "RoleGranted") {
						resolve(true);
					}
				}
				resolve(false);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Revokes admin permissions from an address
	 *
	 * @param address the address to revoke
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async revokeAdmin(address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return this._revokeRole(roles.admin, address, confirmations, callback);
	}

	/**
	 * Revokes admin permissions on the store from an address
	 *
	 * @param allowanceStore the allowance store address
	 * @param address the address to revoke
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	public async revokeStoreAdmin(allowanceStore:string, address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await store.revokeRole(roles.admin, address);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "RoleRevoked") {
						resolve(true);
					}
				}
				resolve(false);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Checks if an address is listed as admin
	 *
	 * @param address the address to check, defaults to current signer
	 */
	public async isAdmin(address?:string): Promise<boolean> {
		return this._hasRole(roles.admin, address);
	}

	/**
	 * Checks if an address is listed as store admin
	 *
	 * @param allowanceStore the allowance store address
	 * @param address the address to check, defaults to current signer
	 */
	public async isStoreAdmin(allowanceStore:string, address?:string): Promise<boolean> {
		const store = AllowancesStore__factory.connect(allowanceStore, this.signerOrProvider);
		return new Promise((resolve, reject) => { (async() => {
			try {
				resolve(store.hasRole(roles.admin, address || await (this.signerOrProvider as Signer).getAddress()));
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Grants permissions to an address
	 *
	 * @param address the address to grant
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	private async _grantRole(role:string, address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await this.factory.grantRole(role, address);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "RoleGranted") {
						resolve(true);
					}
				}
				resolve(false);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Revokes permissions from an address
	 *
	 * @param address the address to revoke
	 * @param confirmations the number of confirmations to wait for, deafults to 1
	 * @param callback a callback function reporting received confirmations
	 */
	private async _revokeRole(role:string, address:string, confirmations:number = 1, callback?:(received:number, requested:number) => void): Promise<boolean> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				const tx = await this.factory.revokeRole(role, address);
				let received = tx.confirmations;
				let receipt = await tx.wait();
				while (received < confirmations) {
					if (callback) callback(received, confirmations);
					receipt = await tx.wait(received++);
				}
				for (const log of receipt.events!) {
					if (log.event === "RoleRevoked") {
						resolve(true);
					}
				}
				resolve(false);
			} catch (err) {
				reject(err);
			}
		})(); });
	}

	/**
	 * Checks if an address has been granted a role
	 *
	 * @param address the address to check, defaults to current signer
	 */
	private async _hasRole(role:string, address?:string): Promise<boolean> {
		return new Promise((resolve, reject) => { (async() => {
			try {
				resolve(this.factory.hasRole(role, address || await (this.signerOrProvider as Signer).getAddress()));
			} catch (err) {
				reject(err);
			}
		})(); });
	}
}
