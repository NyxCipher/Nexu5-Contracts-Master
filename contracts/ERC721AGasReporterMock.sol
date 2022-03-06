// SPDX-License-Identifier: MIT
// Creators: Chiru Labs

pragma solidity ^0.8.4;

import './ERC721A.sol';

contract ERC721AGasReporterMock is ERC721A {
    constructor(string memory name_, string memory symbol_, uint256 maxBatchSize_, uint256 collectionSize_) 
    ERC721A(name_, symbol_, maxBatchSize_, collectionSize_) {}

    function safeMintOne(address to) public {
        _safeMint(to, 1);
    }

    /*function mintOne(address to) public {
        _mint(to, 1, '', false);
    }*/

    function safeMintTen(address to) public {
        _safeMint(to, 10);
    }

    /*function mintTen(address to) public {
        _mint(to, 10, '', false);
    }*/
}
