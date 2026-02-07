import { ethers } from "ethers";

export const ROULETTE_ADDRESS = import.meta.env.VITE_ROULETTE_ADDRESS;

export const ROULETTE_ABI = [
  "function play(uint256,uint8)"
];

export const getRoulette = (signer) => {
  return new ethers.Contract(
    ROULETTE_ADDRESS,
    ROULETTE_ABI,
    signer
  );
};
