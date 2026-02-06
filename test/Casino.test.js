import { expect } from "chai";
import hre from "hardhat";

describe("Casino DApp - Core Functionality", function () {
  let token, roulette, crowdfunding;
  let owner, player1, player2;

  beforeEach(async function () {
    [owner, player1, player2] = await hre.ethers.getSigners();

    // Deploy BulletToken
    const Token = await hre.ethers.getContractFactory("BulletToken");
    token = await Token.deploy();
    await token.waitForDeployment();

    // Deploy Roulette
    const Roulette = await hre.ethers.getContractFactory("Roulette");
    roulette = await Roulette.deploy(await token.getAddress());
    await roulette.waitForDeployment();

    // Deploy Crowdfunding
    const Crowdfunding = await hre.ethers.getContractFactory("CasinoCrowdfunding");
    crowdfunding = await Crowdfunding.deploy(await token.getAddress());
    await crowdfunding.waitForDeployment();

    // Add crowdfunding as minter
    await token.addMinter(await crowdfunding.getAddress());
  });

  describe("BulletToken", function () {
    it("Should allow buying tokens with ETH", async function () {
      const ethAmount = hre.ethers.parseEther("0.1");
      await token.connect(player1).buyTokens({ value: ethAmount });

      const balance = await token.balanceOf(player1.address);
      const expectedTokens = ethAmount * BigInt(1000); // rate = 1000
      expect(balance).to.equal(expectedTokens);
    });

    it("Should mint tokens when called by authorized minter", async function () {
      const mintAmount = hre.ethers.parseUnits("1000", 18);
      
      // Get the crowdfunding contract address
      const crowdfundingAddress = await crowdfunding.getAddress();
      
      // Impersonate the crowdfunding contract
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [crowdfundingAddress],
      });
      
      // Set balance for the impersonated account (needed for gas)
      await hre.network.provider.send("hardhat_setBalance", [
        crowdfundingAddress,
        "0x1000000000000000000", // 1 ETH in hex
      ]);
      
      const crowdfundingSigner = await hre.ethers.getSigner(crowdfundingAddress);
      
      // Now mint from the crowdfunding contract
      await token.connect(crowdfundingSigner).mint(player1.address, mintAmount);

      const balance = await token.balanceOf(player1.address);
      expect(balance).to.equal(mintAmount);
      
      // Stop impersonating
      await hre.network.provider.request({
        method: "hardhat_stopImpersonatingAccount",
        params: [crowdfundingAddress],
      });
    });

    it("Should reject minting from unauthorized address", async function () {
      const mintAmount = hre.ethers.parseUnits("1000", 18);
      await expect(
        token.connect(player1).mint(player1.address, mintAmount)
      ).to.be.revertedWith("Not authorized to mint");
    });
  });

  describe("Roulette", function () {
    beforeEach(async function () {
      // Player1 buys tokens
      await token.connect(player1).buyTokens({ 
        value: hre.ethers.parseEther("0.1") 
      });

      // Owner buys tokens FIRST before trying to fund casino
      await token.connect(owner).buyTokens({ 
        value: hre.ethers.parseEther("1") 
      });
      
      // Now owner has 1000 tokens (1 ETH * 1000)
      const fundAmount = hre.ethers.parseUnits("500", 18); // Fund with 500 tokens (well below 1000)
      await token.connect(owner).approve(await roulette.getAddress(), fundAmount);
      await roulette.connect(owner).fundCasino(fundAmount);
    });

    it("Should allow playing with valid bet and ammo", async function () {
      const betAmount = hre.ethers.parseUnits("100", 18);
      
      await token.connect(player1).approve(
        await roulette.getAddress(), 
        betAmount
      );

      await expect(
        roulette.connect(player1).play(betAmount, 1)
      ).to.emit(roulette, "GamePlayed");
    });

    it("Should reject bet with insufficient balance", async function () {
      const hugeBet = hre.ethers.parseUnits("1000000", 18);
      
      await token.connect(player1).approve(
        await roulette.getAddress(), 
        hugeBet
      );

      await expect(
        roulette.connect(player1).play(hugeBet, 1)
      ).to.be.revertedWith("Insufficient balance");
    });

    it("Should reject invalid ammo values", async function () {
      const betAmount = hre.ethers.parseUnits("100", 18);
      await token.connect(player1).approve(
        await roulette.getAddress(), 
        betAmount
      );

      await expect(
        roulette.connect(player1).play(betAmount, 0)
      ).to.be.revertedWith("Ammo must be between 1 and 5");

      await expect(
        roulette.connect(player1).play(betAmount, 6)
      ).to.be.revertedWith("Ammo must be between 1 and 5");
    });

    it("Should calculate correct potential rewards", async function () {
      const bet = hre.ethers.parseUnits("100", 18);
      
      // Ammo 1: 6/5 = 1.2x
      const reward1 = await roulette.calculatePotentialReward(bet, 1);
      expect(reward1).to.equal(hre.ethers.parseUnits("120", 18));
      
      // Ammo 5: 6/1 = 6x
      const reward5 = await roulette.calculatePotentialReward(bet, 5);
      expect(reward5).to.equal(hre.ethers.parseUnits("600", 18));
    });
  });

  describe("CasinoCrowdfunding", function () {
    beforeEach(async function () {
      // Create campaign
      await crowdfunding.createCampaign(
        "Casino Bankroll Fund",
        hre.ethers.parseEther("1.0"), // 1 ETH goal
        7, // 7 days
        await roulette.getAddress()
      );
    });

    it("Should create campaign with correct parameters", async function () {
      const details = await crowdfunding.getCampaignDetails();
      
      expect(details.title).to.equal("Casino Bankroll Fund");
      expect(details.goal).to.equal(hre.ethers.parseEther("1.0"));
      expect(details.beneficiary).to.equal(await roulette.getAddress());
      expect(details.finalized).to.be.false;
    });

    it("Should accept contributions and mint tokens", async function () {
      const contribution = hre.ethers.parseEther("0.1");
      
      await crowdfunding.connect(player1).contribute({ value: contribution });

      const playerContribution = await crowdfunding.getContribution(player1.address);
      expect(playerContribution).to.equal(contribution);

      const tokenBalance = await token.balanceOf(player1.address);
      const expectedTokens = contribution * BigInt(1000);
      expect(tokenBalance).to.equal(expectedTokens);
    });

    it("Should track multiple contributors", async function () {
      await crowdfunding.connect(player1).contribute({ 
        value: hre.ethers.parseEther("0.2") 
      });
      await crowdfunding.connect(player2).contribute({ 
        value: hre.ethers.parseEther("0.3") 
      });

      const count = await crowdfunding.getContributorsCount();
      expect(count).to.equal(2);

      const details = await crowdfunding.getCampaignDetails();
      expect(details.totalRaised).to.equal(hre.ethers.parseEther("0.5"));
    });

    it("Should reject contributions after deadline", async function () {
      // Fast forward time by 8 days
      await hre.network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      await expect(
        crowdfunding.connect(player1).contribute({ 
          value: hre.ethers.parseEther("0.1") 
        })
      ).to.be.revertedWith("Campaign has ended");
    });

    it("Should finalize successful campaign and transfer funds", async function () {
      // Contribute enough to meet goal
      await crowdfunding.connect(player1).contribute({ 
        value: hre.ethers.parseEther("1.0") 
      });

      // Fast forward past deadline
      await hre.network.provider.send("evm_increaseTime", [8 * 24 * 60 * 60]);
      await hre.network.provider.send("evm_mine");

      await crowdfunding.finalizeCampaign();

      const details = await crowdfunding.getCampaignDetails();
      expect(details.finalized).to.be.true;
      expect(details.successful).to.be.true;
      
      // Verify the crowdfunding contract's ETH was transferred
      const crowdfundingBalance = await hre.ethers.provider.getBalance(
        await crowdfunding.getAddress()
      );
      // After finalization, crowdfunding should have 0 ETH (transferred to roulette)
      expect(crowdfundingBalance).to.equal(0);
    });
  });
});