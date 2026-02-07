import hre from "hardhat";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  const Token = await hre.ethers.getContractFactory("MyToken");
  const token = await Token.deploy();
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("Token deployed to:", tokenAddress);

  const Roulette = await hre.ethers.getContractFactory("Roulette");
  const roulette = await Roulette.deploy(tokenAddress);
  await roulette.waitForDeployment();
  const rouletteAddress = await roulette.getAddress();
  console.log("Roulette deployed to:", rouletteAddress);

  const Crowdfunding = await hre.ethers.getContractFactory("CasinoCrowdfunding");
  const goal = hre.ethers.parseEther("1.0");
  const duration = 3600; // 1 hour

  const crowdfunding = await Crowdfunding.deploy(
    tokenAddress,
    rouletteAddress,
    goal,
    duration
  );
  await crowdfunding.waitForDeployment();
  console.log("Crowdfunding deployed to:", await crowdfunding.getAddress());

  const tx = await deployer.sendTransaction({
    to: rouletteAddress,
    value: hre.ethers.parseEther("0.05")
  });
  await tx.wait();
  console.log("Initial bankroll funded");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});