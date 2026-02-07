import { ethers } from "ethers";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS || "";
export const ROULETTE_ADDRESS = import.meta.env.VITE_ROULETTE_ADDRESS || "";
export const CROWDFUNDING_ADDRESS = import.meta.env.VITE_CROWDFUNDING_ADDRESS || "";

export const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function buyTokens() payable",
  "function approve(address,uint256)"
];

export const ROULETTE_ABI = [
  "function play(uint256 betAmount, uint256 ammo) external",
  "function spinCylinder() external",
  "event GamePlayed(address indexed player, uint256 bet, uint256 ammo, bool win, uint256 result)"
];

export const buyTokensAndApprove = async (tokenContract, amountETH, spenderAddress) => {
  try {
    const txBuy = await tokenContract.buyTokens({ value: ethers.parseEther(amountETH) });
    await txBuy.wait();
    const txApprove = await tokenContract.approve(spenderAddress, ethers.MaxUint256);
    await txApprove.wait();
    return true;
  } catch (error) {
    throw error; 
  }
};

export const playRoulette = async (rouletteContract, betAmount, ammo) => {
  try {
    const amount = ethers.parseUnits(betAmount.toString(), 18);
    const tx = await rouletteContract.play(amount, ammo);
    return await tx.wait();
  } catch (error) {
    if (error.code === "ACTION_REJECTED" || error.code === 4001) {
      throw new Error("You rejected transaction");
    }
    throw error;
  }
};

export const getContract = (address, abi, signer) => {
  if (!address || !signer) return null;
  return new ethers.Contract(address, abi, signer);
};