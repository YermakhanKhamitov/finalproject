import { ethers } from "ethers";
import TokenData from "../abi/BulletToken.json";
import RouletteData from "../abi/Roulette.json";

export const TOKEN_ADDRESS = import.meta.env.VITE_TOKEN_ADDRESS;
export const ROULETTE_ADDRESS = import.meta.env.VITE_ROULETTE_ADDRESS;

export const getProvider = () => {
  if (!window.ethereum) throw new Error("Install MetaMask");
  return new ethers.BrowserProvider(window.ethereum);
};

export const getContract = async (address, abi, withSigner = false) => {
  const provider = getProvider();
  if (withSigner) {
    const signer = await provider.getSigner();
    return new ethers.Contract(address, abi, signer);
  }
  return new ethers.Contract(address, abi, provider);
};

export const buyTokensAndApprove = async (ethAmount) => {
  const token = await getContract(TOKEN_ADDRESS, TokenData.abi, true);
  const val = ethers.parseEther(ethAmount.toString());
  
  const buyTx = await token.buyTokens({ value: val });
  await buyTx.wait();
  
  const appTx = await token.approve(ROULETTE_ADDRESS, ethers.MaxUint256);
  await appTx.wait();
  
  return { buyTx, appTx };
};

export const playRoulette = async (betAmount, ammoCount) => {
  const roulette = await getContract(ROULETTE_ADDRESS, RouletteData.abi, true);
  const betInWei = ethers.parseUnits(betAmount.toString(), 18);
  
  const tx = await roulette.play(betInWei, ammoCount, {
    gasLimit: 300000 
  });
  return await tx.wait();
};