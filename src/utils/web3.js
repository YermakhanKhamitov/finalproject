import { ethers } from "ethers";

export const getProvider = () => {
  return new ethers.BrowserProvider(window.ethereum);
};

export const checkNetwork = async (provider) => {
  const net = await provider.getNetwork();

  if (net.chainId !== 11155111n) {
    throw new Error("Wrong network");
  }
};

export const connectWallet = async () => {

  const provider = getProvider();

  await provider.send("eth_requestAccounts", []);

  await checkNetwork(provider);

  const signer = await provider.getSigner();
  const address = await signer.getAddress();

  return { provider, signer, address };
};
