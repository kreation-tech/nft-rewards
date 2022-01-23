 ▒▄▀▄▒█▀▄░▀█▀▒██▀░█▄▒▄█░░░█▄░█▒█▀░▀█▀░░▒█▀▄▒██▀░█░░▒█▒▄▀▄▒█▀▄░█▀▄░▄▀▀
 ░█▀█░█▀▄░▒█▒░█▄▄░█▒▀▒█▒░░█▒▀█░█▀░▒█▒▒░░█▀▄░█▄▄░▀▄▀▄▀░█▀█░█▀▄▒█▄▀▒▄██

---

Solidity smart contracts implementing ERC721 with multiple editions. 
This is a customization of the more general [EdNFT contract](https://github.com/kreation-tech/nft-editions) tailored and optimized to fit the rewarding schema of the ARTEM token staking.

Once minted, the editions behave very much like any other NFT implementing the `ERC-721` specifications: they can be transferred, auctioned and burnt as their specific owner decide.

# Standards

The NFTs comply with the following EIP standards:

* [ERC-721](https://eips.ethereum.org/EIPS/eip-721) Non-Fungible Token
* [ERC-2981](https://eips.ethereum.org/EIPS/eip-2981) NFT Royalty

# Specificities

Tokens use an external `AllowancesStore` contract to retrieve minting allowances to reduce gas consumption.