import hre from "hardhat";

async function main() {
  const crowdfundingAddress = "0xED23A75d3e8787CF28D06627803776A090098a97";
  const factory = await hre.ethers.getContractFactory("CasinoCrowdfunding");
  
  console.log("Available functions in CasinoCrowdfunding:");
  factory.interface.forEachFunction((f) => {
    console.log(`- ${f.name}`);
  });
}

main().catch(console.error);