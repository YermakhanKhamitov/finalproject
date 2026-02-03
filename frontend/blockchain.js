

import { ethers } from "ethers";




let CONTRACT_ADDRESSES = {
  bulletToken:     "0x0000000000000000000000000000000000000000",
  russianRoulette: "0x0000000000000000000000000000000000000000"
};

try {
  const imported = await import("./addresses.json");
  CONTRACT_ADDRESSES = imported.default || imported;
} catch {
  console.warn("⚠️  addresses.json not found – using placeholder addresses.");
}





const BULLET_TOKEN_ABI = [
  
  "function balanceOf(address) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function transfer(address to, uint256 amount) returns (bool)",
  
  "function stake(uint256 amount)",
  "function unstake(uint256 amount)",
  "function claimRewards()",
  "function pendingRewards(address) view returns (uint256)",
  "function stakes(address) view returns (uint256 stakedAmount, uint256 lastClaimBlock)",
  
  "event Staked(address indexed user, uint256 amount)",
  "event Unstaked(address indexed user, uint256 amount)",
  "event RewardsClaimed(address indexed user, uint256 reward, uint256 ownerFee)"
];

const ROULETTE_ABI = [
  
  "function startRound(uint8 bulletCount, uint256 bltkWager)",
  "function spinBarrel(bytes32 hash)",
  "function revealSpin(bytes32 secret)",
  "function shoot()",
  
  
  "function convertETHtoBLTK() payable",
  "function convertBLTKtoETH(uint256 bltkAmount)",
  "function getCurrentPrice() view returns (uint256)",
  
  
  "function getRound(address) view returns (uint8 state, uint256 wager, uint8 bulletCount, uint8 currentPos, uint256 totalMultiplier, uint256 shotsRemaining)",
  "function revealChambers(address) view returns (bool[6])",
  "function getContractBalance() view returns (uint256)",
  "function MIN_WAGER_BLTK() view returns (uint256)",
  
  
  "event RoundStarted(address indexed player, uint8 bulletCount, uint256 wager, uint256 totalMultiplier)",
  "event BarrelSpinned(address indexed player, uint8 startingPosition)",
  "event ShotFired(address indexed player, bool survived, uint8 chamberIndex)",
  "event RoundWon(address indexed player, uint256 payout)",
  "event RoundLost(address indexed player, uint256 wagerLost)",
  "event ETHConverted(address indexed player, uint256 ethSent, uint256 bltkReceived, uint256 ownerFee, uint256 price)",
  "event BLTKConverted(address indexed player, uint256 bltkSent, uint256 ethReceived, uint256 ownerFee, uint256 price)"
];




let provider  = null;
let signer    = null;
let roulette  = null;
let bltk      = null;
let bltkRead  = null;





export async function connectWallet() {
  if (!window.ethereum) {
    throw new Error("MetaMask is not installed. Please install MetaMask.");
  }

  provider = new ethers.BrowserProvider(window.ethereum);
  const accounts = await provider.send("eth_requestAccounts", []);
  if (!accounts || accounts.length === 0) {
    throw new Error("No account selected in MetaMask.");
  }

  signer   = await provider.getSigner();
  const address = await signer.getAddress();

  const network = await provider.getNetwork();
  const chainId = Number(network.chainId);
  if (chainId !== 11155111 && chainId !== 31337) {
    throw new Error(
      `Wrong network! Please switch MetaMask to Sepolia (chainId 11155111) or a local Hardhat node (31337). Current: ${chainId}`
    );
  }

  roulette = new ethers.Contract(CONTRACT_ADDRESSES.russianRoulette, ROULETTE_ABI, signer);
  bltk     = new ethers.Contract(CONTRACT_ADDRESSES.bulletToken,     BULLET_TOKEN_ABI, signer);
  bltkRead = new ethers.Contract(CONTRACT_ADDRESSES.bulletToken,     BULLET_TOKEN_ABI, provider);

  console.log("🔗  Wallet connected:", address, "| Network:", network.name);
  return address;
}

export function setupMetaMaskListeners(onAccountChange, onChainChange) {
  if (!window.ethereum) return;
  window.ethereum.on("accountsChanged", (accounts) => {
    if (accounts.length === 0) {
      onAccountChange(null);
    } else {
      onAccountChange(accounts[0]);
    }
  });
  window.ethereum.on("chainChanged", () => {
    onChainChange();
  });
}





export async function getETHBalance(address) {
  const bal = await provider.getBalance(address);
  return ethers.formatEther(bal);
}

export async function getBLTKBalance(address) {
  const bal = await bltkRead.balanceOf(address);
  return ethers.formatUnits(bal, 18);
}

export async function getStakeInfo(address) {
  const [stakedRaw]  = await bltkRead.stakes(address);
  const pendingRaw   = await bltkRead.pendingRewards(address);
  return {
    staked:  ethers.formatUnits(stakedRaw,  18),
    pending: ethers.formatUnits(pendingRaw, 18)
  };
}






export async function getCurrentPrice() {
  _requireConnected();
  const priceRaw = await roulette.getCurrentPrice();
  return ethers.formatUnits(priceRaw, 0); 
}


export async function convertETHtoBLTK(ethAmount) {
  _requireConnected();
  const value = ethers.parseEther(ethAmount);
  const tx = await roulette.convertETHtoBLTK({ value });
  console.log("⏳  Waiting for convertETHtoBLTK tx…", tx.hash);
  await tx.wait();
  console.log("✅  Conversion complete.");
  return tx.hash;
}


export async function convertBLTKtoETH(bltkAmount) {
  _requireConnected();
  const parsed = ethers.parseUnits(bltkAmount, 18);

  
  const approveTx = await bltk.approve(CONTRACT_ADDRESSES.russianRoulette, parsed);
  console.log("⏳  approve tx…", approveTx.hash);
  await approveTx.wait();

  
  const tx = await roulette.convertBLTKtoETH(parsed);
  console.log("⏳  convertBLTKtoETH tx…", tx.hash);
  await tx.wait();
  console.log("✅  Sold BLTK for ETH.");
  return tx.hash;
}






export async function startRound(bulletCount, bltkWager) {
  _requireConnected();
  const wagerParsed = ethers.parseUnits(bltkWager, 18);

  
  const approveTx = await bltk.approve(CONTRACT_ADDRESSES.russianRoulette, wagerParsed);
  console.log("⏳  approve wager tx…", approveTx.hash);
  await approveTx.wait();

  
  const tx = await roulette.startRound(bulletCount, wagerParsed);
  console.log("⏳  startRound tx…", tx.hash);
  await tx.wait();
  console.log("✅  Round started with", bulletCount, "bullet(s), wager:", bltkWager, "BLTK");
  return tx.hash;
}


export async function spinBarrel() {
  _requireConnected();

  const secret = ethers.randomBytes(32);
  const secretHex = ethers.hexlify(secret);
  const commitHash = ethers.keccak256(secretHex);

  
  const commitTx = await roulette.spinBarrel(commitHash);
  console.log("⏳  spinBarrel (commit) tx…", commitTx.hash);
  await commitTx.wait();

  
  const revealTx = await roulette.revealSpin(secretHex);
  console.log("⏳  revealSpin tx…", revealTx.hash);
  const receipt = await revealTx.wait();

  const event = receipt.logs
    .map((log) => {
      try { return roulette.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e && e.name === "BarrelSpinned");

  const startPos = event ? Number(event.args.startingPosition) : -1;
  console.log("✅  Barrel spun. Starting position:", startPos);
  return { secret: secretHex, startPos };
}


export async function shoot() {
  _requireConnected();

  const tx = await roulette.shoot();
  console.log("⏳  shoot tx…", tx.hash);
  const receipt = await tx.wait();

  const events = receipt.logs
    .map((log) => {
      try { return roulette.interface.parseLog(log); } catch { return null; }
    })
    .filter(Boolean);

  const shotEvent = events.find((e) => e.name === "ShotFired");
  const wonEvent  = events.find((e) => e.name === "RoundWon");
  const lostEvent = events.find((e) => e.name === "RoundLost");

  const survived       = shotEvent ? shotEvent.args.survived : false;
  const chamberIndex   = shotEvent ? Number(shotEvent.args.chamberIndex) : -1;

  let result = { survived, chamberIndex, roundFinished: false };

  if (wonEvent) {
    result.roundFinished  = true;
    result.payout         = ethers.formatUnits(wonEvent.args.payout, 18); 
    console.log("🎉  YOU WON!", result.payout, "BLTK");
  }
  if (lostEvent) {
    result.roundFinished = true;
    console.log("💀  YOU LOST.", ethers.formatUnits(lostEvent.args.wagerLost, 18), "BLTK");
  }

  return result;
}

export async function getRoundInfo() {
  _requireConnected();
  const addr = await signer.getAddress();
  const [state, wager, bulletCount, currentPos, totalMult, shotsLeft] =
    await roulette.getRound(addr);
  return {
    state:            Number(state),
    wager:            ethers.formatUnits(wager, 18), 
    bulletCount:      Number(bulletCount),
    currentPos:       Number(currentPos),
    totalMultiplier:  Number(totalMult),
    shotsRemaining:   Number(shotsLeft)
  };
}





export async function stakeTokens(amount) {
  _requireConnected();
  const parsed = ethers.parseUnits(amount, 18);

  
  const stakeTx = await bltk.stake(parsed);
  console.log("⏳  stake tx…", stakeTx.hash);
  await stakeTx.wait();
  console.log("✅  Staked", amount, "BLTK");
}

export async function unstakeTokens(amount) {
  _requireConnected();
  const parsed = ethers.parseUnits(amount, 18);
  const tx = await bltk.unstake(parsed);
  console.log("⏳  unstake tx…", tx.hash);
  await tx.wait();
  console.log("✅  Unstaked", amount, "BLTK");
}

export async function claimRewards() {
  _requireConnected();
  const tx = await bltk.claimRewards();
  console.log("⏳  claimRewards tx…", tx.hash);
  await tx.wait();
  console.log("✅  Rewards claimed.");
}




function _requireConnected() {
  if (!signer || !roulette || !bltk) {
    throw new Error("Wallet not connected. Call connectWallet() first.");
  }
}
