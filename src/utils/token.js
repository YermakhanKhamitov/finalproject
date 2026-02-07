import { ethers } from "ethers";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;

export const TOKEN_ABI = [
  "function balanceOf(address) view returns (uint256)",
  "function buyTokens() payable",
  "function approve(address,uint256)"
];

export const getTokenContract = (signer) => {
  return new ethers.Contract(
    TOKEN_ADDRESS,
    TOKEN_ABI,
    signer
  );
};
