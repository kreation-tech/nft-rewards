░█▄█░▄▀▄▒█▀▒▄▀▄░░░▒░░░░█▄░█▒█▀░▀█▀░░▒██▀░█▀▄░█░▀█▀░█░▄▀▄░█▄░█░▄▀▀ 
▒█▒█░▀▄▀░█▀░█▀█▒░░▀▀▒░░█▒▀█░█▀░▒█▒▒░░█▄▄▒█▄▀░█░▒█▒░█░▀▄▀░█▒▀█▒▄██

---

Solidity smart contracts implementing ERC721 with multiple editions. We will call it _Editionable Non Fungible Token_ or `EdNFT`: one `EdNFT` can produce (_mint_) a fixed set of NFTs (its _editions_).

Once minted, the editions behave very much like any other NFT implementing the `ERC-721` specifications: they can be transferred, auctioned and burnt as their specific owner decide.

# Standards

The EdNFTs comply with the following EIP standards:

* [ERC-721](https://eips.ethereum.org/EIPS/eip-721) Non-Fungible Token
* [ERC-2981](https://eips.ethereum.org/EIPS/eip-2981) NFT Royalty

# Properties

Instances of this contract are what we call `EdNFT` and. can be obtained by using the `create` operation on the `MintableEditionsFactory` contract, with a substantial saving in gas.

Each `EdNFT` produced has the following characteristics:

* `name` (IMMUTABLE) can be considered the title for the editions produced, used by OpenSea as name of the collection
* `symbol` (IMMUTABLE) is the symbol associated with the editions
* `description` (IMMUTABLE) can be used to describe the editions to the public, can contain [markdown](https://www.markdownguide.org/cheat-sheet/)
* `contentUrl` is used to associate some off-chain content (the EdNFT owner can update, direct references to IPFS content are possible)
* `thumbnailUrl` (OPTIONAL) is used to associate a static off-chain content when the main content is an animation (the EdNFT owner can update, direct references to IPFS content are possible)
* `contentHash` (IMMUTABLE) sha256 of the associated off-chain content, ensures content uniqueness within the chain
* `size` (IMMUTABLE) determines how many editions of this EdNFT can be minted: if set to 0 then `uint64.max()` editions can be minted (about _18.5 **quintillions**_)
* `price` determines how much has to be transferred to the contract in order to purchase an edition: if set to 0 then editions cannot be purchased
* `royalties` (IMMUTABLE) perpetual royalties to be paid to the EdNFT owner upon any reselling, in [basis-points](https://www.investopedia.com/terms/b/basispoint.asp) format (eq. `250` corresponding to **2.5%**)
* `shares` (IMMUTABLE) pairs of (shareholder, percentage) describing how the value collected by the sales of this contract will be splitted between the shareholders and the owner (percentages expressed in [basis-points](https://www.investopedia.com/terms/b/basispoint.asp))
* `allowances` pairs of (address, amount) describing who is entitle to mint and for how many editions: giving a non-zero allowance to the _ZeroAddress_ permits to anyone minting as many editions as available

Almost all the properties are immutable, with the exclusion of the `contentUrl`, `thumbnailUrl` (allowing the EdNFT owner to move the off-chain content, if necessary), `price` (enbling or disabling sales) and `allowances` (providing others other than the artist to mint editions).

The EdNFT guarantees minting is automatically disabled when the last available edition is produced: an EdNFT can never generate more NFTs than `size`, or `18,446,744,073,709,551,614` if the MNFT was created as unbound (`size = 0`).

# Capabilities

## Roles

The following are the roles available on the contract:

* the `owner`, also referenced as _the artist_, is the **creator** of the EdNFT, unless ownership is transferrred
* the `minters` are those allowed for minting, in case the zero-address is added among the allowed minters _anyone_ can be considered a _minter_
* the `buyer` is anyone who mints a token through the `purchase()` operation
* the `shareholders` are those receving shares of the contract balance upon withdrawal and it always include the `owner`/`artist`

At any time, any shareholder can request to `withdraw()` its part of the shares: the action can be repeated for partial payouts. At any time anyone can `shake()` EdNFT, releasing its balance toward the shareholders.

## Owner

The contract is quite flexible and allows the editions _owner_ to:

* mint an NFT for himself
* mint and transfer NFTs to a list of addresses (one NFT per address), allowing for partial giveaways (owner pays minting gas)
* permit limited minting (from `1` up to `65,535` NFTs) to a list of third parties, allowing for rewarding (owner pays gas for permission granting, third party pays minting gas)
* permit minting to anyone, allowing for unlimited public giveaways (third party pays minting gas)
* establish a sale price, allowing for public sales (third party pays minting gas plus sale price)
* transfer ownership to someone else along with the royalties on previous and future editions and any sale shares of the previous owner

# Addresses

Contract addresses on each network, referenced by `chainId`, are published in (this repository)[https://raw.githubusercontent.com/agileware-org/nft-editions/main/addresses.json].

# Example

Gas required: `652323`

### Description
A static image EdNFT (stored on IPFS) able to produce 100 editions, each one with 2.5% perpetual royalties on secondary sales.

Of any revenues this contract might collect, 15% of it will be given to the _curator_ address, the remainder 85% will go to the EdNFT _owner_.

### Properties

| field        | value                                                                |
|-------------:|:---------------------------------------------------------------------|
| name         | `Roberto Lo Giacco`                                                  |
| symbol       | `RLG`                                                                |
| description  | `**Me**, _myself_ and I. A gentle reminder to take care of our inner child, avoiding to take ourselves too seriously, no matter the circumstances: we are just _'a blade of grass'_. See [my website](http://www.agileware.org)` |
| contentUrl   | `ipfs://QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d`              |
| contentHash  | `0x94DB57416B770A06B3B2123531E68D67E9D96872F453FA77BC413E9E53FC1BFC` |
| thumbnailUrl | empty                                                                |
| size         | `100`                                                                |
| price        | `0`                                                                  |
| royalties    | `250`                                                                |
| shares       | `[["0x8c4e43e88ba5cb9a15a9F7F74a4d58aD51024389",1500]]`              |
| allowances   | `[["0x8c4e43e88ba5cb9a15a9F7F74a4d58aD51024389",15]]`                |

```
["Roberto Lo Giacco","RLG","**Me**, _myself_ and I. A gentle reminder to take care of our inner child, avoiding to take ourselves too seriously, no matter the circumstances: we are just _'a blade of grass'_. See [my website](http://www.agileware.org)","ipfs://QmYMj2yraaBch5AoBTEjvLFdoT3ULKs4i4Ev7vte72627d","0x94DB57416B770A06B3B2123531E68D67E9D96872F453FA77BC413E9E53FC1BFC"],"100","0","250",[["0x8c4e43e88ba5cb9a15a9F7F74a4d58aD51024389",1500]],[["0x8c4e43e88ba5cb9a15a9F7F74a4d58aD51024389",15]]
```

### Address

Rinkeby: `0x3b09e54450C7dA5B7f0553d47a2Ec3Ec56Aa1056` [OpenSea collection](https://testnets.opensea.io/collection/roberto-lo-giacco)

## Deploy

```
npm run deploy -- --network rinkeby --export networks/rinkeby.json
npm run verify -- --network rinkeby
```

or

```
npx hardhat deploy --network rinkeby --export networks/rinkeby.json
npx hardhat run scripts/verify.ts --network rinkeby
```
