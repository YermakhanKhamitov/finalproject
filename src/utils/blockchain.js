import { ethers } from "ethers";
import TokenData from "../abi/BulletToken.json";
import RouletteData from "../abi/Roulette.json";
import CrowdfundingData from "../abi/CasinoCrowdfunding.json";

export const TOKEN_ADDRESS = 
  import.meta.env.VITE_TOKEN_ADDRESS || 
  "0xE11465D8c364D117239a1D5Fa1Bf4c346fDe3171";

export const ROULETTE_ADDRESS = 
  import.meta.env.VITE_ROULETTE_ADDRESS || 
  "0xE2ee965e65510Fa5e46C4DAC3DebF54ff0275b05";

export const CROWDFUNDING_ADDRESS = 
  import.meta.env.VITE_CROWDFUNDING_ADDRESS || 
  "0x0000000000000000000000000000000000000000";

export const EXPECTED_CHAIN_ID = "0xaa36a7"; 

export const getProvider = () => {
  if (!window.ethereum) throw new Error("Please install MetaMask");
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

export const checkNetwork = async () => {
  try {
    const provider = getProvider();
    const network = await provider.getNetwork();
    const chainId = "0x" + network.chainId.toString(16);
    
    if (chainId !== EXPECTED_CHAIN_ID) {
      return {
        correct: false,
        currentChainId: chainId,
        expectedChainId: EXPECTED_CHAIN_ID
      };
    }
    return { correct: true };
  } catch (error) {
    console.error("Network check error:", error);
    return { correct: false, error: error.message };
  }
};

export const switchToSepolia = async () => {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: EXPECTED_CHAIN_ID }],
    });
    return true;
  } catch (error) {
    console.error("Network switch error:", error);
    return false;
  }
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
  const token = await getContract(TOKEN_ADDRESS, TokenData.abi, true);
  const roulette = await getContract(ROULETTE_ADDRESS, RouletteData.abi, true);
  const betInWei = ethers.parseUnits(betAmount.toString(), 18);
  
  const provider = getProvider();
  const signer = await provider.getSigner();
  const playerAddress = await signer.getAddress();
 
  const balance = await token.balanceOf(playerAddress);
  if (balance < betInWei) {
    throw new Error(`Insufficient token balance. You have ${ethers.formatUnits(balance, 18)} BULLET`);
  }
  
  const allowance = await token.allowance(playerAddress, ROULETTE_ADDRESS);
  
  if (allowance < betInWei) {
    console.log("Approving tokens for Roulette contract...");
    const approveTx = await token.approve(ROULETTE_ADDRESS, betInWei * BigInt(10)); // Approve 10x bet
    await approveTx.wait();
    console.log("Tokens approved!");
  }

  const tx = await roulette.play(betInWei, ammoCount);
  return await tx.wait();
};

export const getBalances = async (address) => {
  const provider = getProvider();
  const token = await getContract(TOKEN_ADDRESS, TokenData.abi);
  
  const ethBalance = await provider.getBalance(address);
  const tokenBalance = await token.balanceOf(address);
  
  return {
    eth: ethers.formatEther(ethBalance),
    tokens: ethers.formatUnits(tokenBalance, 18)
  };
};

export const contributeToCampaign = async (ethAmount) => {
  const crowdfunding = await getContract(
    CROWDFUNDING_ADDRESS, 
    CrowdfundingData.abi, 
    true
  );
  
  const value = ethers.parseEther(ethAmount.toString());
  const tx = await crowdfunding.contribute({ value });
  return await tx.wait();
};

export const getCampaignDetails = async () => {
  const crowdfunding = await getContract(
    CROWDFUNDING_ADDRESS, 
    CrowdfundingData.abi
  );
  
  const details = await crowdfunding.getCampaignDetails();
  
  return {
    title: details[0],
    goal: ethers.formatEther(details[1]),
    deadline: Number(details[2]),
    totalRaised: ethers.formatEther(details[3]),
    finalized: details[4],
    successful: details[5],
    beneficiary: details[6],
    contributorsCount: Number(details[7])
  };
};

export const getUserContribution = async (address) => {
  const crowdfunding = await getContract(
    CROWDFUNDING_ADDRESS, 
    CrowdfundingData.abi
  );
  
  const contribution = await crowdfunding.getContribution(address);
  return ethers.formatEther(contribution);
};

export const isCampaignActive = async () => {
  const crowdfunding = await getContract(
    CROWDFUNDING_ADDRESS, 
    CrowdfundingData.abi
  );
  
  return await crowdfunding.isCampaignActive();
};

export const getCasinoBankroll = async () => {
  const roulette = await getContract(ROULETTE_ADDRESS, RouletteData.abi);
  const balance = await roulette.getCasinoBankroll();
  return ethers.formatUnits(balance, 18);
};

export const calculateReward = async (bet, ammo) => {
  const roulette = await getContract(ROULETTE_ADDRESS, RouletteData.abi);
  const betInWei = ethers.parseUnits(bet.toString(), 18);
  const reward = await roulette.calculatePotentialReward(betInWei, ammo);
  return ethers.formatUnits(reward, 18);
};
