import { ethers } from "ethers";

export const TOKEN_ADDRESS = "0xE11465D8c364D117239a1D5Fa1Bf4c346fDe3171";

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
