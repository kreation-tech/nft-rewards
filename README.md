```
 ░█▄ █▒█▀░▀█▀  ▒█▀▄▒██▀░█ ░▒█▒▄▀▄▒█▀▄░█▀▄░▄▀▀
 ░█▒▀█░█▀ ▒█▒▒░░█▀▄░█▄▄░▀▄▀▄▀░█▀█░█▀▄▒█▄▀▒▄██
```
---

Solidity smart contracts implementing ERC721 with multiple editions. 
This is a customization of the more general [EdNFT contract](https://github.com/kreation-tech/nft-editions) tailored and optimized to fit the rewarding schema of the ARTEM token staking.

Once minted, the editions behave very much like any other NFT implementing the `ERC-721` specifications: they can be transferred, auctioned and burnt as their specific owner decide.

![](https://github.com/kreation-tech/nft-rewards/raw/main/structure.drawio.png)

# Standards

The NFTs comply with the following EIP standards:

* [ERC-721](https://eips.ethereum.org/EIPS/eip-721) Non-Fungible Token
* [ERC-2981](https://eips.ethereum.org/EIPS/eip-2981) NFT Royalty

# Specificities


The new `MintableRewards` contract is vastly comparable with the `MintableEditions` one, with the following differences:
* allowances are no more set on each piece of art, they are instead stored separately on the `AllowanceStore` contract: this implies allowances are reused and gas consumption is vastly reduced;
* the artist has no more the ability to give specific allowances and is now limited to: 
  * mint himself
  * allow/disable public minting (anyone can obtain one or more editions)
  * enable/disable purchasing (anyone can buy one or more editions by paying the sale price)
  * update tokens URLs (content, thumbnail and metadata)
* a new role, the _allowance store administrator_, is required to manage the allowances and the artist is no more involved in this task
* anyone willing to pay the gas fees can perform an _airdrop_, sending the NFTs to all addresses stored on the `AllowancesStore` respecting their allowances (2 NFTs to those having an allowance of 2 and so forth); once the airdrop is performed, repeating the operation has no effect unless the `AllowanceStore` is updated, in which case any addedd allowance (either by increasing the allowance or added address) will receive any difference
* the tokens do not contain the edition id and size in their name, the editon size information must be set as part of the edition name or description by the artist
