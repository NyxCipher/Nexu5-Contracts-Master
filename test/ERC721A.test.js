const { expect } = require('chai');
const { constants, expectRevert} = require('@openzeppelin/test-helpers');
const { check } = require('prettier');
const { providers } = require('ethers');
const { waffle} = require("hardhat");
const provider = waffle.provider;
const { ZERO_ADDRESS } = constants;

const RECEIVER_MAGIC_VALUE = '0x150b7a02';
const GAS_MAGIC_VALUE = 20000;

const createTestSuite = ({ contract, constructorArgs }) =>
  function () {
    context(`${contract}`, function () {
      beforeEach(async function () {
        this.ERC721A = await ethers.getContractFactory(contract);

        this.ERC721Receiver = await ethers.getContractFactory('ERC721ReceiverMock');
        this.erc721a = await this.ERC721A.deploy(...constructorArgs);

        await this.erc721a.deployed();

        this.startTokenId = this.erc721a.startTokenId ? (await this.erc721a.startTokenId()).toNumber() : 0;

      });

      context('with no minted tokens', async function () {
        beforeEach(async function () {
          const [owner, addr1, addr2, addr3] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
          this.addr2 = addr2;
          this.addr3 = addr3;
        });
        it('has 0 totalSupply', async function () {
          const supply = await this.erc721a.totalSupply();
          expect(supply).to.equal(0);
        });

        it('has 0 totalMinted', async function () {
          const totalMinted = await this.erc721a.totalMinted();
          expect(totalMinted).to.equal(0);
        });

        describe('devmint functions', async function () {
          it('onlyOwner can call DevMint', async function () {
            await expectRevert(this.erc721a.connect(this.addr1).devMint(10), "revert Ownable: caller is not the owner");
          });
          it('devteam can not overmint', async function () {
            await expectRevert(this.erc721a.devMint(20), 'revert too many already minted before dev mint');
          });
          it('devteam can not mint after sales passes 50% threshold', async function () {
            await this.erc721a.SetupPublicSaleInfo(2000);
            await this.erc721a.connect(this.addr1).publicSaleMint(10, {value: 20000});
            await expectRevert(this.erc721a.devMint(11), 'revert too many already minted before dev mint');
          });
          it('devmint mints 10', async function () {
            const mintTx = await this.erc721a.devMint(10);
            await mintTx.wait();
            // 16 for 6 in Context and 10 for Devs to listed address (see lines ~50)
            await expect(await this.erc721a.balanceOf(this.owner.address)).to.equal('10');
          });
        });
      });

      // using for list
      context('with public minted tokens', async function () {
        beforeEach(async function () {
          const [owner, addr1, addr2, addr3] = await ethers.getSigners();
          this.owner = owner;
          this.addr1 = addr1;
          this.addr2 = addr2;
          this.addr3 = addr3;
          const provider = ethers.providers.getNetwork(31337);
          signer = new ethers.VoidSigner(this.addr1, provider);
          const baseURI = await this.erc721a.setBaseURI("https://IPFS.site/");
          await this.erc721a.SetupPublicSaleInfo(2000);
          await baseURI.wait();
          await this.erc721a['seedFounderlist(address[],uint256[])']([addr1.address], [1]);
          await this.erc721a['publicSaleMint(uint256)'](1, {value: 2000});
          await this.erc721a['publicSaleMint(uint256)'](2, {value: 4000});
          await this.erc721a['publicSaleMint(uint256)'](3, {value: 6000});
          await this.erc721a.connect(this.addr1).founderMint(1);
        });

        // check founders
        describe('Founder Operations', async function () {
          it('adds address to founder lists & confirms it', async function () {
            const founderList = await this.erc721a.seedFounderlist([this.addr1.address], [1]);
            const checkList = await this.erc721a.isFounderlisted(this.addr1.address);
            await founderList.wait();
            expect(checkList).to.be.true;
          });
          it('returns founder price', async function () {
            const founderPrice = await this.erc721a.getFounderPrice();
            expect(await founderPrice).to.equal(0);
          });
          it('mints one founder avatar', async function () {
            const founderList = await this.erc721a.seedFounderlist([this.addr1.address], [1]);
            await founderList.wait();
            const founderMintTxOne = await this.erc721a.connect(this.addr1).founderMint(1);
            await founderMintTxOne.wait();
          });
          it('mints five founder avatars', async function () {
            const founderList = await this.erc721a.seedFounderlist([this.addr1.address], [5]);
            await founderList.wait();
            const founderMintTxOne = await this.erc721a.connect(this.addr1).founderMint(5);
            await founderMintTxOne.wait();
          });
          it('blocks founder attempt to overmint', async function () {
            const founderList = await this.erc721a.seedFounderlist([this.addr1.address], [5]);
            await founderList.wait();
            await expectRevert(this.erc721a.connect(this.addr1).founderMint(6), "revert");
          });
          it('sets & calls tokenURI for founder mint', async function () {
            const baseURI = await this.erc721a.setBaseURI("https://IPFS.site/");
            await baseURI.wait();
            const founderList = await this.erc721a.seedFounderlist([this.addr1.address], [1]);
            await founderList.wait();
            const founderMintTxOne = await this.erc721a.connect(this.addr1).founderMint(1);
            await founderMintTxOne.wait();
            const tokenURI = await this.erc721a.tokenURI(6);
            await expect(tokenURI).to.be.equal('https://IPFS.site/6.json');
          });
        });
        
        // check allowlist
        describe('allowlist functions', async function () {
          it('adds address to white lists & confirms it', async function () {
            const allowList = await this.erc721a.seedAllowlist([this.addr2.address], [1]);
            const checkListAllow = await this.erc721a.isWhitelisted(this.addr2.address);
            await allowList.wait();
            await expect(checkListAllow).to.be.true;
          });
          it('requires whitelist-mint to have a price', async function () {
            const allowList = await this.erc721a.seedAllowlist([this.addr2.address], [1]);
            await allowList.wait();
            await expectRevert(this.erc721a.connect(this.addr2).allowlistMint({value: 2000}), ' revert allowlist sale has not begun yet');
          });
          it('requires onlyOwner to start whitelist-sale', async function () {
            await expectRevert(this.erc721a.connect(this.addr3).SetupWhitelistSale(2000), "revert Ownable: caller is not the owner");
          });
          it('requires whitelist-mint sender', async function () {
            const setupWhitelistSale = await this.erc721a.SetupWhitelistSale(2000);
            await setupWhitelistSale.wait();
            await expectRevert(this.erc721a.connect(this.addr3).allowlistMint({value: 2000}), ' revert not eligible for allowlist mint');
          });
          it('whitelist member can only mint 1', async function () {
            const setupWhitelistSale = await this.erc721a.SetupWhitelistSale(2000);
            const allowList = await this.erc721a.seedAllowlist([this.addr2.address], [1]);
            await setupWhitelistSale.wait();
            await allowList.wait();
            await expect(await this.erc721a.connect(this.addr2).allowlistMint({value: 4000}));
            await expect(await this.erc721a.balanceOf(this.addr2.address)).to.equal('1');
          });
          it('whitelist member mints 1', async function () {
            const setupWhitelistSale = await this.erc721a.SetupWhitelistSale(2000);
            const allowList = await this.erc721a.seedAllowlist([this.addr2.address], [1]);
            await setupWhitelistSale.wait();
            await allowList.wait();
            await expect(await this.erc721a.connect(this.addr2).allowlistMint({value: 2000}));
            await expect(await this.erc721a.balanceOf(this.addr2.address)).to.equal('1');
          });
        });

        describe('exists', async function () {
          it('verifies valid tokens', async function () {
            // Account For Start At 1 vs 0 - Override
            for (let tokenId = this.startTokenId; tokenId < 7 + this.startTokenId; tokenId++) {
              const exists = await this.erc721a.exists(tokenId);
              expect(exists).to.be.true;
            }
          });

          it('verifies invalid tokens', async function () {
            expect(await this.erc721a.exists(8 + this.startTokenId)).to.be.false;
          });
        });

        describe('balanceOf', async function () {
          it('returns the amount for a given address', async function () {
            expect(await this.erc721a.balanceOf(this.owner.address)).to.equal('6');

            // Modified for owner describe minting - not using contract.connect in this function
            //
            // expect(await this.erc721a.balanceOf(this.addr1.address)).to.equal('1');
            // expect(await this.erc721a.balanceOf(this.addr2.address)).to.equal('2');
            // expect(await this.erc721a.balanceOf(this.addr3.address)).to.equal('3');
          });

          it('throws an exception for the 0 address', async function () {
            // Call ZeroAddress from msg.sender other than owner
            await expect(this.erc721a.connect(this.addr1.address).balanceOf(ZERO_ADDRESS)).to.be.revertedWith('balance query for the zero address');
          });
        });

        describe('_numberMinted', async function () {
          it('returns the amount for a given address', async function () {
            expect(await this.erc721a.numberMinted(this.owner.address)).to.equal('6');

            // Modified for owner describe minting - not using contract.connect in this function
            //
            // expect(await this.erc721a.numberMinted(this.addr1.address)).to.equal('1');
            // expect(await this.erc721a.numberMinted(this.addr2.address)).to.equal('2');
            // expect(await this.erc721a.numberMinted(this.addr3.address)).to.equal('3');
          });
        });

        context('_totalMinted', async function () {
          it('has 7 totalMinted', async function () {
            const totalMinted = await this.erc721a.totalMinted();
            expect(totalMinted).to.equal('7');
          });
        });

        describe('ownerOf', async function () {
          it('returns the right owner', async function () {
            expect(await this.erc721a.ownerOf(1 + this.startTokenId)).to.equal(this.owner.address);
            expect(await this.erc721a.ownerOf(5 + this.startTokenId)).to.equal(this.owner.address);
            expect(await this.erc721a.ownerOf(3 + this.startTokenId)).to.equal(this.owner.address);
          });

          it('reverts for an invalid token', async function () {
            await expect(this.erc721a.ownerOf(10)).to.be.revertedWith('ERC721A: owner query for nonexistent token');
          });
        });

        describe('approve', async function () {
          beforeEach(function () {
            this.tokenId = this.startTokenId;
            this.tokenId2 = this.startTokenId + 1;
          });

          it('sets approval for the target address', async function () {
            await this.erc721a.connect(this.owner).approve(this.addr1.address, this.tokenId);
            const approval = await this.erc721a.getApproved(this.tokenId);
            expect(approval).to.equal(this.addr1.address);
          });

          it('rejects an invalid token owner', async function () {
            await expect(
              this.erc721a.connect(this.addr1).approve(this.addr2.address, this.tokenId2)
            ).to.be.revertedWith('ERC721A: approve caller is not owner nor approved for all');
          });

          it('rejects an unapproved caller', async function () {
            // Connect with address other than owner here because of methods
            await expect(this.erc721a.connect(this.addr1).approve(this.addr2.address, this.tokenId)).to.be.revertedWith(
              'ERC721A: approve caller is not owner nor approved for all'
            );
          });

          it('does not get approved for invalid tokens', async function () {
            await expect(this.erc721a.getApproved(10)).to.be.revertedWith('ERC721A: approved query for nonexistent token');
          });
        });

        describe('setApprovalForAll', async function () {
          it('sets approval for all properly', async function () {
            const approvalTx = await this.erc721a.setApprovalForAll(this.addr1.address, true);
            await expect(approvalTx)
              .to.emit(this.erc721a, 'ApprovalForAll')
              .withArgs(this.owner.address, this.addr1.address, true);
            expect(await this.erc721a.isApprovedForAll(this.owner.address, this.addr1.address)).to.be.true;
          });

          it('sets rejects approvals for non msg senders', async function () {
            await expect(
              this.erc721a.connect(this.addr1).setApprovalForAll(this.addr1.address, true)
            ).to.be.revertedWith('ERC721A: approve to caller');
          });
        });

        context('test transfer functionality', function () {
          const testSuccessfulTransfer = function (transferFn) {
            beforeEach(async function () {
              this.tokenId = this.startTokenId + 6;

              const sender = this.addr1; //this.addr2
              this.from = sender.address;
              this.receiver = await this.ERC721Receiver.deploy(RECEIVER_MAGIC_VALUE);
              this.to = this.receiver.address;
              await this.erc721a.connect(sender).setApprovalForAll(this.to, true);
              this.transferTx = await this.erc721a.connect(sender)[transferFn](this.from, this.to, this.tokenId);
            });

            it('transfers the ownership of the given token ID to the given address', async function () {
              expect(await this.erc721a.ownerOf(this.tokenId)).to.be.equal(this.to);
            });

            it('emits a Transfer event', async function () {
              await expect(this.transferTx)
                .to.emit(this.erc721a, 'Transfer')
                .withArgs(this.from, this.to, this.tokenId);
            });

            it('clears the approval for the token ID', async function () {
              expect(await this.erc721a.getApproved(this.tokenId)).to.be.equal(ZERO_ADDRESS);
            });

            it('emits an Approval event', async function () {
              await expect(this.transferTx)
                .to.emit(this.erc721a, 'Approval')
                .withArgs(this.from, ZERO_ADDRESS, this.tokenId);
            });

            it('adjusts owners balances', async function () {
              expect(await this.erc721a.balanceOf(this.from)).to.be.equal(0);
            });
          };

          const testUnsuccessfulTransfer = function (transferFn) {
            beforeEach(function () {
              this.tokenId = this.startTokenId + 1;
            });

            it('rejects unapproved transfer', async function () {
              await expect(
                this.erc721a.connect(this.addr1)[transferFn](this.addr2.address, this.addr1.address, this.tokenId)
              ).to.be.revertedWith('ERC721A: transfer caller is not owner nor approved');
            });

            it('rejects transfer from incorrect owner', async function () {
              await this.erc721a.connect(this.addr2).setApprovalForAll(this.addr1.address, true);
              await expect(
                this.erc721a.connect(this.addr1)[transferFn](this.addr3.address, this.addr1.address, this.tokenId)
              ).to.be.revertedWith('ERC721A: transfer caller is not owner nor approved');
            });

            it('rejects transfer to zero address', async function () {
              await this.erc721a.connect(this.addr2).setApprovalForAll(this.addr1.address, true);
              await expect(
                this.erc721a.connect(this.addr1)[transferFn](this.addr2.address, ZERO_ADDRESS, this.tokenId)
              ).to.be.revertedWith('ERC721A: transfer caller is not owner nor approved');
            });
          };

          context('successful transfers', function () {
            describe('transferFrom', function () {
              testSuccessfulTransfer('transferFrom');
            });

            describe('safeTransferFrom', function () {
              testSuccessfulTransfer('safeTransferFrom(address,address,uint256)');

              it('validates ERC721Received', async function () {
                await expect(this.transferTx)
                  .to.emit(this.receiver, 'Received')
                  .withArgs(this.addr1.address, this.addr1.address, 6 + this.startTokenId, '0x', GAS_MAGIC_VALUE);
              });
            });
          });

          context('breakpoint', function () {
            beforeEach(async function () {
              const [owner, addr1, addr2, addr3] = await ethers.getSigners();
              this.owner = owner;
              this.addr1 = addr1;
              this.addr2 = addr2;
              this.addr3 = addr3;
              await this.erc721a.SetupPublicSaleInfo(2000);
              await this.erc721a.connect(this.addr1).publicSaleMint(5, {value: 10000});
              await this.erc721a.connect(this.addr2).publicSaleMint(5, {value: 10000});
              await this.erc721a.connect(this.addr3).publicSaleMint(5, {value: 10000});
            });
            describe('attempts zero cost purchase in-contract', function () {
              it('fails to successfully mints a single token', async function () {
              await expectRevert(this.erc721a.connect(this.addr1).publicSaleMint(1, {value: 0}), "Need to send more ETH.")
            });
          });

            describe('withdraws calls', function () {
              it('calls withdraw function', async function () {
                console.log(await this.erc721a.connect(this.owner).withdrawMoney());
                const balanceInit = await provider.getBalance(this.owner.address);
                await this.erc721a.connect(this.owner).withdrawMoney();
                const balanceRet = await provider.getBalance(this.owner.address);
                expect(balanceInit < balanceRet);
              });
              it('fails to call withdraw function',async function () {
                await expectRevert(this.erc721a.connect(this.addr1).withdrawMoney(), 'revert Ownable: caller is not the owner');
              });
            });
          });
        });
      });

      context('mint', async function () {
        beforeEach(async function () {
          const [owner, addr1, addr2, ZERO_ADDRESS] = await ethers.getSigners();
          this.zero = ZERO_ADDRESS;
          this.owner = owner;
          this.addr1 = addr1;
          this.addr2 = addr2;
          this.receiver = await this.ERC721Receiver.deploy(RECEIVER_MAGIC_VALUE);
          await this.erc721a.SetupPublicSaleInfo(2000);
        });

        describe('safeMint', function () {
          it('successfully mints a single token', async function () {
            const mintTx = await this.erc721a.connect(this.addr1).publicSaleMint(1, {value: 2000});
            await expect(mintTx)
              .to.emit(this.erc721a, 'Transfer')
              .withArgs(ZERO_ADDRESS, this.addr1.address, this.startTokenId);
            await expect(mintTx)
              .to.emit(this.receiver, 'Received')
              .withArgs(this.owner.address, ZERO_ADDRESS, this.startTokenId, '0x', GAS_MAGIC_VALUE);
            expect(await this.erc721a.ownerOf(this.startTokenId)).to.equal(this.addr1.address);
          });

          it('successfully mints multiple tokens', async function () {
            const mintTx = await this.erc721a.publicSaleMint(5, {value: 10000});
            for (let tokenId = this.startTokenId; tokenId < 5 + this.startTokenId; tokenId++) {
              await expect(mintTx)
                .to.emit(this.erc721a, 'Transfer')
                .withArgs(ZERO_ADDRESS, this.owner.address, tokenId);
              await expect(mintTx)
                .to.emit(this.receiver, 'Received')
                .withArgs(this.owner.address, ZERO_ADDRESS, tokenId, '0x', GAS_MAGIC_VALUE);
              expect(await this.erc721a.ownerOf(tokenId)).to.equal(this.owner.address);
            }
          });

          it('rejects mints to the zero address', async function () {
            await expect(this.erc721a.connect(this.zero).publicSaleMint(1, {value: 2000})).to.be.revertedWith(
              'ERC721A: mint to the zero address'
            );
          });

          it('requires quantity to be greater than 0', async function () {
            await expect(this.erc721a.connect(this.owner).publicSaleMint(0)).to.be.revertedWith(
              'ERC721A: quantity to mint too low'
            );
          });

          it('reverts for non-receivers', async function () {
            const nonReceiver = this.erc721a;
            await expect(this.erc721a.connect(nonReceiver.address).publicSaleMint(1,{value: 2000})).to.be.revertedWith(
              'ERC721A: transfer to non ERC721Receiver implementer'
            );
          });
        });

        describe('mint', function () {
          const data = '0x42';

          it('successfully mints a single token', async function () {
            const mintTx = await this.erc721a.publicSaleMint(1, {value: 2000});
            await expect(mintTx)
              .to.emit(this.erc721a, 'Transfer')
              .withArgs(ZERO_ADDRESS, this.owner.address, this.startTokenId);
            await expect(mintTx).to.not.emit(this.owner, 'Received');
            expect(await this.erc721a.ownerOf(this.startTokenId)).to.equal(this.owner.address);
          });

          it('successfully mints multiple tokens', async function () {
            const mintTx = await this.erc721a.publicSaleMint(5, {value: 10000});
            for (let tokenId = this.startTokenId; tokenId < 5 + this.startTokenId; tokenId++) {
              await expect(mintTx)
                .to.emit(this.erc721a, 'Transfer')
                .withArgs(ZERO_ADDRESS, this.owner.address, tokenId);
              await expect(mintTx).to.not.emit(this.owner, 'Received');
              expect(await this.erc721a.ownerOf(tokenId)).to.equal(this.owner.address);
            }
          });

          it('does not revert for non-receivers', async function () {
            /*const nonReceiver = this.erc721a;
            await this.erc721a.connect(this.addr2).publicSaleMint(1, {value: 2000});
            expect(await this.erc721a.ownerOf(this.startTokenId)).to.equal(this.addr2.address);*/
            const nonReceiver = this.erc721a;
            await this.erc721a['safeMint(address,uint256)'](nonReceiver.address, 1);
            expect(await this.erc721a.ownerOf(this.startTokenId)).to.equal(nonReceiver.address);
          });

          it('rejects mints to the zero address', async function () {
            // const mintTx = this.erc721a['safeMint(address,uint256)'](ZERO_ADDRESS, 1);
            await expectRevert(this.erc721a.connect(this.zero).publicSaleMint(1, {value: 2000}), 'revert ERC721A: mint to the zero address');
            // Txn Reverts Successfully
            // Cannot Catch Revert using v trying ^
            //await expect(mintTx)
            //    .to.emit(this.erc721a, 'Transfer')
            //    .withArgs(ZERO_ADDRESS, 1).to.be.revertedWith("revert ERC721A: mint to the zero address");
          });

          it('requires quantity to be greater than 0', async function () {
            await expect(this.erc721a.connect(this.addr1).publicSaleMint(0, {value: 2000} )).to.be.revertedWith('ERC721A: quantity to mint too low');
          });
        });
      });
    });
  };

describe('ERC721A', createTestSuite({ contract: 'Nexu5', constructorArgs: [10, 1000, 500, 10] }));
