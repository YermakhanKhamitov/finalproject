const { ethers } = require("hardhat");
const fs          = require("fs");
const path        = require("path");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("\n👤  Deploying contracts with account:", deployer.address);
  console.log("💰  Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH\n");

  
  
  
  
  const SECONDS_PER_BLOCK = 12;

  const BulletToken = await ethers.getContractFactory("BulletToken");
  const bulletToken = await BulletToken.deploy(SECONDS_PER_BLOCK);
  await bulletToken.waitForDeployment();
  const bulletTokenAddr = await bulletToken.getAddress();
  console.log("✅  BulletToken deployed  →", bulletTokenAddr);

  
  const RussianRoulette = await ethers.getContractFactory("RussianRoulette");
  const roulette        = await RussianRoulette.deploy(bulletTokenAddr);
  await roulette.waitForDeployment();
  const rouletteAddr    = await roulette.getAddress();
  console.log("✅  RussianRoulette deployed →", rouletteAddr);

  
  const MINTER_ROLE = await bulletToken.MINTER_ROLE();
  const tx = await bulletToken.grantRole(MINTER_ROLE, rouletteAddr);
  await tx.wait();
  console.log("✅  MINTER_ROLE granted to RussianRoulette");

  
  
  
  const fundingTx = await deployer.sendTransaction({
    to:    rouletteAddr,
    value: ethers.parseEther("0.05")
  });
  await fundingTx.wait();
  console.log("✅  House funded with 0.05 ETH");

  
  const addresses = {
    bulletToken:     bulletTokenAddr,
    russianRoulette: rouletteAddr,
    network:         (await ethers.provider.getNetwork()).name
  };

  
  const outPath = path.join(__dirname, "..", "addresses.json");
  fs.writeFileSync(outPath, JSON.stringify(addresses, null, 2));
  console.log("\n📄  Contract addresses written to addresses.json");
  console.log(JSON.stringify(addresses, null, 2));
  console.log("\n🎉  Deployment complete!\n");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
