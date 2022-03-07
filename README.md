## About The Nexu5 & ERC721A
Nexu5 is accomidating a wealth of founding members and followers, by request of the comunity we have outfitted the ERC721A (Also Known As Azuki), contract.
For while, we have been re-writing and custom writing tests, while going over security of the contract. We know that Azuki was certified and vetted, however,
are changes effect core compoents of the contract and required re-writing of the Chiru Labs contract in small parts to fit our needs. We are running two two claim lists and a public sale. This means that we have three minting functions plus a dev minting function. We found the quanity size from Azuki to be highly beneficial in segregating collection sizes. All in all we have written/re-written 58 tests with one failure on "does not revert for non-receivers:" - (ProviderError: VM Exception while processing transaction: revert ERC721A: transfer to non ERC721Receiver implementer). This will be checked over again on testnet in contract version 3.0. We are currently on contract version 2.0.

Notice: Removed Functions For Security -- Some Tests Will Fail Unless Test Functions Are Replaced (Will Update The Tests ASAP To Account For Changes)

## Summary of Tests:
- ERC721A
-    Nexu5
-      with no minted tokens
-        ✓ has 0 totalSupply
-        ✓ has 0 totalMinted
-        devmint functions
-          ✓ onlyOwner can call DevMint
-          ✓ devteam can not overmint
-          ✓ devteam can not mint after sales passes 50% threshold (69ms)
-          ✓ devmint mints 10 (48ms)
-      with public minted tokens
-        Founder Operations
-          ✓ adds address to founder lists & confirms it
-          ✓ returns founder price
-          ✓ mints one founder avatar (64ms)
-          ✓ mints five founder avatars (62ms)
-          ✓ blocks founder attempt to overmint (39ms)
-          ✓ sets & calls tokenURI for founder mint (94ms)
-        allowlist functions
-          ✓ adds address to white lists & confirms it (57ms)
-         ✓ requires whitelist-mint to have a price (41ms)
-          ✓ requires onlyOwner to start whitelist-sale
-          ✓ requires whitelist-mint sender (41ms)
-          ✓ whitelist member can only mint 1 (86ms)
-          ✓ whitelist member mints 1 (86ms)
-        exists
-          ✓ verifies valid tokens (50ms)
-          ✓ verifies invalid tokens
-        balanceOf
-          ✓ returns the amount for a given address
-          ✓ throws an exception for the 0 address
-        _numberMinted
-          ✓ returns the amount for a given address
-        _totalMinted
-          ✓ has 7 totalMinted
-        ownerOf
-          ✓ returns the right owner
-          ✓ reverts for an invalid token
-        approve
-          ✓ sets approval for the target address
-          ✓ rejects an invalid token owner
-          ✓ rejects an unapproved caller
-          ✓ does not get approved for invalid tokens
-        setApprovalForAll
-          ✓ sets approval for all properly
-          ✓ sets rejects approvals for non msg senders
-        test transfer functionality
-          successful transfers
-            transferFrom
-              ✓ transfers the ownership of the given token ID to the given address
-              ✓ emits a Transfer event
-              ✓ clears the approval for the token ID
-              ✓ emits an Approval event
-              ✓ adjusts owners balances
-            safeTransferFrom
-              ✓ transfers the ownership of the given token ID to the given address
-              ✓ emits a Transfer event
-              ✓ clears the approval for the token ID
-              ✓ emits an Approval event
-              ✓ adjusts owners balances
-              ✓ validates ERC721Received
-          breakpoint
-            attempts zero cost purchase in-contract
-              ✓ fails to successfully mints a single token
-            withdraws calls
-              ✓ calls withdraw function (63ms)
-              ✓ fails to call withdraw function
-      mint
-        safeMint
-          ✓ successfully mints a single token (42ms)
-          ✓ successfully mints multiple tokens (152ms)
-          ✓ rejects mints to the zero address
-          ✓ requires quantity to be greater than 0
-          ✓ reverts for non-receivers
-        mint
-          ✓ successfully mints a single token (39ms)
-          ✓ successfully mints multiple tokens (136ms)
-          1) does not revert for non-receivers
-          ✓ rejects mints to the zero address
-          ✓ requires quantity to be greater than 0

-  ERC721A Gas Usage
-    safeMintOne
-      ✓ runs safeMintOne 50 times (936ms)
-    safeMintTen
-      ✓ runs safeMintTen 50 times (1080ms)


-  57 passing (17s)
-  1 failing

-  1) ERC721A
-       Nexu5
-         mint
-           mint
-             does not revert for non-receivers:
-     ProviderError: VM Exception while processing transaction: revert ERC721A: transfer to non ERC721Receiver implementer

## Forked Repo Data From Chiru Labs
The goal of ERC721A is to provide a fully compliant implementation of IERC721 with significant gas savings for minting multiple NFTs in a single transaction. This project and implementation will be updated regularly and will continue to stay up to date with best practices.

The [Azuki](https://twitter.com/azukizen) team created ERC721A for its sale on 1/12/22. There was significant demand for 8700 tokens made available to the public, and all were minted within minutes. The network BASEFEE remained low despite huge demand, resulting in low gas costs for minters, while minimizing network disruption for the wider ecosystem as well.

![Gas Savings](https://pbs.twimg.com/media/FIdILKpVQAEQ_5U?format=jpg&name=medium)

For more information on how ERC721A works under the hood, please visit our [blog](https://www.azuki.com/erc721a). To find other projects that are using ERC721A, please visit [erc721a.org](https://www.erc721a.org) and our [curated projects list](https://github.com/chiru-labs/ERC721A/blob/main/projects.md).

**Chiru Labs is not liable for any outcomes as a result of using ERC721A.** DYOR.
