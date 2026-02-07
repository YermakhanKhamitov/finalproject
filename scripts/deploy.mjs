import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const BulletToken = await hre.ethers.getContractFactory("BulletToken");
  const token = await BulletToken.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();

  const Roulette = await hre.ethers.getContractFactory("Roulette");
  const roulette = await Roulette.deploy(tokenAddr);
  await roulette.waitForDeployment();
  const rouletteAddr = await roulette.getAddress();

  const Crowdfunding = await hre.ethers.getContractFactory("CasinoCrowdfunding");
  const cf = await Crowdfunding.deploy(tokenAddr, rouletteAddr);
  await cf.waitForDeployment();
  const cfAddr = await cf.getAddress();

  await token.addMinter(cfAddr);

  console.log("VITE_TOKEN_ADDRESS=" + tokenAddr);
  console.log("VITE_ROULETTE_ADDRESS=" + rouletteAddr);
  console.log("VITE_CROWDFUNDING_ADDRESS=" + cfAddr);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});