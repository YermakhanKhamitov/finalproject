import hre from "hardhat";
import fs from "fs";
import path from "path";

async function main() {
  console.log("Starting deployment...\n");

  try {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

    console.log("Deploying BulletToken...");
    const Token = await hre.ethers.deployContract("BulletToken");
    await Token.waitForDeployment();
    const tokenAddress = await Token.getAddress();
    console.log("✓ BulletToken deployed to:", tokenAddress, "\n");

    console.log("Deploying Roulette...");
    const Roulette = await hre.ethers.deployContract("Roulette", [tokenAddress]);
    await Roulette.waitForDeployment();
    const rouletteAddress = await Roulette.getAddress();
    console.log("✓ Roulette deployed to:", rouletteAddress, "\n");

    console.log("Deploying CasinoCrowdfunding...");
    const Crowdfunding = await hre.ethers.deployContract("CasinoCrowdfunding", [tokenAddress]);
    await Crowdfunding.waitForDeployment();
    const crowdfundingAddress = await Crowdfunding.getAddress();
    console.log("✓ CasinoCrowdfunding deployed to:", crowdfundingAddress, "\n");

    console.log("Setting up permissions...");
    const addMinterTx = await Token.addMinter(crowdfundingAddress);
    await addMinterTx.wait();
    console.log("✓ CasinoCrowdfunding added as token minter\n");

    console.log("Creating initial campaign...");
    const createCampaignTx = await Crowdfunding.createCampaign(
      "Casino Bankroll Fund - Season 1",
      hre.ethers.parseEther("1.0"), 
      7, 
      rouletteAddress 
    );
    await createCampaignTx.wait();
    console.log("✓ Initial campaign created\n");

    console.log("Initial casino funding...");
    const initialFunding = hre.ethers.parseEther("0.1");
    const buyTx = await Token.buyTokens({ value: initialFunding });
    await buyTx.wait();
    
    const tokenBalance = await Token.balanceOf(deployer.address);
    console.log("✓ Deployer received:", hre.ethers.formatUnits(tokenBalance, 18), "BULLET tokens");
  
    const transferAmount = tokenBalance / BigInt(2); 
    const approveTx = await Token.approve(rouletteAddress, transferAmount);
    await approveTx.wait();
    
    const fundTx = await Roulette.fundCasino(transferAmount);
    await fundTx.wait();
    
    const casinoBankroll = await Roulette.getCasinoBankroll();
    console.log("✓ Casino bankroll:", hre.ethers.formatUnits(casinoBankroll, 18), "BULLET tokens\n");

    const deploymentInfo = {
      network: hre.network.name,
      deployer: deployer.address,
      timestamp: new Date().toISOString(),
      contracts: {
        BulletToken: tokenAddress,
        Roulette: rouletteAddress,
        CasinoCrowdfunding: crowdfundingAddress
      }
    };

    const deploymentsDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(deploymentsDir)) {
      fs.mkdirSync(deploymentsDir);
    }

    const filename = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(filename, JSON.stringify(deploymentInfo, null, 2));
    console.log("Deployment info saved to:", filename, "\n");

    console.log("========================================");
    console.log("DEPLOYMENT SUMMARY");
    console.log("========================================");
    console.log("Network:", hre.network.name);
    console.log("BulletToken:", tokenAddress);
    console.log("Roulette:", rouletteAddress);
    console.log("CasinoCrowdfunding:", crowdfundingAddress);
    console.log("========================================\n");

    console.log("NEXT STEPS:");
    console.log("1. Update .env with these addresses:");
    console.log(`   VITE_TOKEN_ADDRESS=${tokenAddress}`);
    console.log(`   VITE_ROULETTE_ADDRESS=${rouletteAddress}`);
    console.log(`   VITE_CROWDFUNDING_ADDRESS=${crowdfundingAddress}`);
    console.log("\n2. Verify contracts on Etherscan (optional):");
    console.log(`   npx hardhat verify --network ${hre.network.name} ${tokenAddress}`);
    console.log(`   npx hardhat verify --network ${hre.network.name} ${rouletteAddress} ${tokenAddress}`);
    console.log(`   npx hardhat verify --network ${hre.network.name} ${crowdfundingAddress} ${tokenAddress}`);
    console.log("\n3. Start the frontend:");
    console.log("   npm run dev");
    console.log("========================================\n");

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
