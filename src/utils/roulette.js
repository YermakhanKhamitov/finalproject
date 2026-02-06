import { ethers } from "ethers";

export const ROULETTE_ADDRESS = "0xE2ee965e65510Fa5e46C4DAC3DebF54ff0275b05";

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
