// SPDX-License-Identifier: MIT
// @Proteu5: Special Thanks To The Azuki Team & Chiru Labs For Releasing Their Contract Code
/*
/* ███╗   ██╗███████╗██╗  ██╗██╗   ██╗███████╗
/* ████╗  ██║██╔════╝╚██╗██╔╝██║   ██║██╔════╝
/* ██╔██╗ ██║█████╗   ╚███╔╝ ██║   ██║███████╗
/* ██║╚██╗██║██╔══╝   ██╔██╗ ██║   ██║╚════██║
/* ██║ ╚████║███████╗██╔╝ ██╗╚██████╔╝███████║
/* ╚═╝  ╚═══╝╚══════╝╚═╝  ╚═╝ ╚═════╝ ╚══════╝                               
/* 
/* A Collection By: Encode.Graphics & @Pr1mal_Cypher
*/
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./ERC721A.sol";

contract Nexu5 is ERC721A, Ownable, ReentrancyGuard {

  uint256 public immutable maxPerAddressDuringMint;
  uint256 public immutable amountForDevs;
  uint256 public immutable amountForFounders;

  struct SaleConfig {
    uint64 publicPrice;
    uint64 mintlistPrice;
  }

  SaleConfig public saleConfig;

  // @Proteu5: For Pass Holders
  mapping(address => uint256) public allowlist;

  // @Proteu5: For Founders Key Holders
  mapping(address => uint256) public founderlist;

  constructor(
    uint256 maxBatchSize_, // Max Minting Per Wallet
    uint256 collectionSize_, // Total Collection Size
    uint256 amountForFounders_, // As It States
    uint256 amountForDevs_ // As It States
  ) ERC721A("Nexu5", "NX5", maxBatchSize_, collectionSize_) {
    maxPerAddressDuringMint = maxBatchSize_;
    amountForFounders = amountForFounders_;
    amountForDevs = amountForDevs_;
    require(
      amountForFounders_ <= collectionSize_,
      "larger collection size needed"
    );
  }
  
  modifier callerIsUser() {
    require(tx.origin == msg.sender, "The caller is another contract");
    _;
  }

  function _startTokenId() internal view virtual override returns (uint256) {
        return 0;
    }
  
  function returnFounderQty() public view returns (uint256){
    return founderlist[msg.sender];
  }


  function founderMint() external payable callerIsUser {
    uint256 quantity = returnFounderQty();
    require(founderlist[msg.sender] > 0, "not eligible for founder mint");
    require(
      totalSupply() + quantity <= amountForFounders,
      "not enough remaining reserved for auction to support desired mint amount"
    );
    require(
      numberMinted(msg.sender) + quantity <= maxPerAddressDuringMint,
      "can not mint this many"
    );
    uint256 totalCost = getFounderPrice();
    delete founderlist[msg.sender];
    _safeMint(msg.sender, quantity);
  }

  function allowlistMint() external payable callerIsUser {
    uint256 price = uint256(saleConfig.mintlistPrice);
    require(price != 0, "allowlist sale has not begun yet");
    require(allowlist[msg.sender] > 0, "not eligible for allowlist mint");
    require(totalSupply() + 1 <= collectionSize, "reached max supply");
    allowlist[msg.sender]--;
    _safeMint(msg.sender, 1);
  }

  function publicSaleMint(uint256 quantity)
    external
    payable
    callerIsUser
  {
    SaleConfig memory config = saleConfig;
    uint256 publicPrice = uint256(config.publicPrice);
    if (msg.sender == address(0)) revert ("ERC721A: mint to the zero address");
    require(
      isPublicSaleOn(publicPrice),
      "public sale has not begun yet"
    );
    require(totalSupply() + quantity <= collectionSize, "reached max supply");
    require(
      numberMinted(msg.sender) + quantity <= maxPerAddressDuringMint,
      "can not mint this many"
    );
    _safeMint(msg.sender, quantity);
  }

 function isPublicSaleOn(
    uint256 publicPriceWei
  ) public view returns (bool) {
    if(publicPriceWei != 0)
    {
        return true;
    }
  }


  // @Proteu5 - Free For Founders To Claim
  uint256 public constant FOUNDER_TOKEN_PRICE = 0 ether;

 function isWhistlistSaleOn() public view returns (bool) {
    if(uint256(saleConfig.mintlistPrice) != 0)
    {
        return true;
    }
  }

 function getFounderPrice()
    public
    view
    returns (uint256)
  {
    return FOUNDER_TOKEN_PRICE;
  }

 function getMintlistPrice()
    public
    view
    returns (uint256)
  {
    return uint256(saleConfig.mintlistPrice);
  }

  function SetupWhitelistSale(uint64 _WhiteListPriceWei) external onlyOwner {
     saleConfig.mintlistPrice = _WhiteListPriceWei;
  }

  // @Proteu5 - Change State For Public Sale
  // check mintlist price
  function SetupPublicSaleInfo(
    uint64 _publicPriceWei
  ) external onlyOwner {
      saleConfig.publicPrice = _publicPriceWei;
  }

  function seedAllowlist(address[] memory addresses, uint256[] memory numSlots)
    external
    onlyOwner
  {
    require(
      addresses.length == numSlots.length,
      "addresses does not match numSlots length"
    );
    for (uint256 i = 0; i < addresses.length; i++) {
      allowlist[addresses[i]] = numSlots[i];
    }
  }

  function isWhitelisted(address _user) public view returns (bool) {
        if(allowlist[_user] > 0)
        {
            return true;
        }
        return false;
  }

  function seedFounderlist(address[] memory addresses, uint256[] memory numSlots)
    external
    onlyOwner
  {
    require(
      addresses.length == numSlots.length,
      "addresses does not match numSlots length"
    );
    for (uint256 i = 0; i < addresses.length; i++) {
      founderlist[addresses[i]] = numSlots[i];
    }
  }

  function isFounderlisted(address _user) public view returns (bool) {
        if(founderlist[_user] > 0)
        {
            return true;
        }
        return false;
  }

  // For marketing etc.
  function devMint(uint256 quantity) external onlyOwner {
    require(
      totalSupply() + quantity <= amountForDevs,
      "too many already minted before dev mint"
    );
    require(
      quantity % maxBatchSize == 0,
      "can only mint a multiple of the maxBatchSize"
    );
    uint256 numChunks = quantity / maxBatchSize;
    for (uint256 i = 0; i < numChunks; i++) {
      _safeMint(msg.sender, maxBatchSize);
    }
  }

  // @REM: aux
 function totalMinted() public view returns (uint256) {
    return _totalMinted();
 }

 function baseURI() public view returns (string memory) {
    return _baseURI();
 }

 function exists(uint256 tokenId) public view returns (bool) {
    return _exists(tokenId);
 }

 function safeMint(address to, uint256 quantity) internal {
    _safeMint(to, quantity);
 }
    

  // // metadata URI
  string private _baseTokenURI;

  function _tokenURI(uint256 tokenId) public view returns (string memory) {
    return tokenURI(tokenId);
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseURI(string calldata baseURI) external onlyOwner {
    _baseTokenURI = baseURI;
  }

  function withdrawMoney() external onlyOwner nonReentrant {
    (bool success, ) = msg.sender.call{value: address(this).balance}("");
    require(success, "Transfer failed.");
  }

  function setOwnersExplicit(uint256 quantity) external onlyOwner nonReentrant {
    _setOwnersExplicit(quantity);
  }

  function numberMinted(address owner) public view returns (uint256) {
    return _numberMinted(owner);
  }

  function setBaseExtension(string memory _newBaseExtension) public onlyOwner {
    baseExtension = _newBaseExtension;
  }

  function getOwnershipData(uint256 tokenId)
    external
    view
    returns (TokenOwnership memory)
  {
    return ownershipOf(tokenId);
  }
}