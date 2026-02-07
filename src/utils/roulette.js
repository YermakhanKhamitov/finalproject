import { ethers } from "ethers";

export const ROULETTE_ADDRESS = "0x25BF236f90C5c33a45b14De90C0A639d405E9965";

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
