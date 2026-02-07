import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const Token = await hre.ethers.getContractFactory("BulletToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();

  const Roulette = await hre.ethers.getContractFactory("Roulette");
  const roulette = await Roulette.deploy(tokenAddr);
  await roulette.waitForDeployment();
  const rouletteAddr = await roulette.getAddress();

  const Crowdfund = await hre.ethers.getContractFactory("CasinoCrowdfunding");
  const goal = hre.ethers.parseEther("0.1");
  const duration = 60 * 60 * 24 * 7;
  const crowdfund = await Crowdfund.deploy(tokenAddr, rouletteAddr, goal, duration);
  await crowdfund.waitForDeployment();
  const crowdfundAddr = await crowdfund.getAddress();

  await (await token.addMinter(crowdfundAddr)).wait();
  const initialBankroll = hre.ethers.parseUnits("5000", 18);
  await (await token.mint(rouletteAddr, initialBankroll)).wait();

  console.log("VITE_TOKEN_ADDRESS=" + tokenAddr);
  console.log("VITE_ROULETTE_ADDRESS=" + rouletteAddr);
  console.log("VITE_CROWDFUND_ADDRESS=" + crowdfundAddr);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});