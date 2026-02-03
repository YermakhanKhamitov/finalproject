

import { create } from "zustand";
import {
  connectWallet,
  setupMetaMaskListeners,
  startRound      as chainStartRound,
  spinBarrel      as chainSpinBarrel,
  shoot           as chainShoot,
  convertETHtoBLTK as chainConvertBuy,
  convertBLTKtoETH as chainConvertSell,
  getCurrentPrice  as chainGetPrice,
  stakeTokens     as chainStake,
  unstakeTokens   as chainUnstake,
  claimRewards    as chainClaim,
  getETHBalance,
  getBLTKBalance,
  getStakeInfo,
  getRoundInfo
} from "./blockchain";


export const ROUND_STATE = {
  IDLE:       0,
  COMMITTED:  1,
  REVEALED:   2,
  ACTIVE:     3,
  FINISHED:   4
};

export const useStore = create((set, get) => ({
  
  ammo:          0,
  isAnimating:   false,

  setAmmo: (count) => set({ ammo: count, isAnimating: true }),
  finishAnimation: () => set((state) => {
    if (state.pendingRoundInfo) {
      const { roundState, roundBullets, roundMultiplier, roundShotsLeft } = state.pendingRoundInfo;
      return {
        isAnimating:     false,
        pendingRoundInfo: null,
        roundState,
        roundBullets,
        roundMultiplier,
        roundShotsLeft
      };
    }
    return { isAnimating: false };
  }),
  shoot: () => set((state) => ({
    ammo: state.ammo > 0 ? state.ammo - 1 : 0
  })),

  
  walletAddress: null,
  isConnected:   false,
  networkName:   null,

  connectWallet: async () => {
    try {
      set({ loading: true, error: null });
      const address = await connectWallet();
      set({ walletAddress: address, isConnected: true, loading: false });

      await get().refreshBalances();
      await get().refreshPrice();

      setupMetaMaskListeners(
        (newAddr) => {
          if (!newAddr) {
            set({ walletAddress: null, isConnected: false });
          } else {
            set({ walletAddress: newAddr });
            get().refreshBalances();
          }
        },
        () => {
          get().connectWallet();
        }
      );
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  
  ethBalance:     "0",
  bltkBalance:    "0",
  stakedBalance:  "0",
  pendingRewards: "0",

  refreshBalances: async () => {
    const addr = get().walletAddress;
    if (!addr) return;
    try {
      const [eth, bltk, stakeInfo] = await Promise.all([
        getETHBalance(addr),
        getBLTKBalance(addr),
        getStakeInfo(addr)
      ]);
      set({
        ethBalance:     eth,
        bltkBalance:    bltk,
        stakedBalance:  stakeInfo.staked,
        pendingRewards: stakeInfo.pending
      });
    } catch (err) {
      console.error("refreshBalances:", err);
    }
  },

  
  currentPrice: "1000000", 

  refreshPrice: async () => {
    if (!get().isConnected) return;
    try {
      const price = await chainGetPrice();
      set({ currentPrice: price });
    } catch (err) {
      console.error("refreshPrice:", err);
    }
  },

  
  roundState:       ROUND_STATE.IDLE,
  roundBullets:     0,
  roundMultiplier:  0,
  roundShotsLeft:   0,
  lastShotResult:   null,
  pendingRoundInfo: null,

  
  loading: false,
  error:   null,

  

  
  startNewRound: async (bulletCount, bltkWager) => {
    try {
      set({ loading: true, error: null, lastShotResult: null });

      await chainStartRound(bulletCount, bltkWager);

      const info = await getRoundInfo();
      set({
        pendingRoundInfo: {
          roundState:      info.state,
          roundBullets:    info.bulletCount,
          roundMultiplier: info.totalMultiplier,
          roundShotsLeft:  info.shotsRemaining
        },
        loading: false
      });

      get().setAmmo(bulletCount);

      await get().refreshBalances();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  spinBarrel: async () => {
    try {
      set({ loading: true, error: null });
      const { startPos } = await chainSpinBarrel();

      const info = await getRoundInfo();
      set({
        roundState:     info.state,
        roundShotsLeft: info.shotsRemaining,
        loading:        false
      });

      console.log("Barrel spin result – starting position:", startPos);
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  fireShot: async () => {
    try {
      set({ loading: true, error: null });

      const result = await chainShoot();

      get().shoot();

      const info = await getRoundInfo();
      set({
        roundState:     info.state,
        roundShotsLeft: info.shotsRemaining,
        lastShotResult: result,
        loading:        false
      });

      await get().refreshBalances();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  
  convertAmount: "0.001",   
  sellAmount:    "0",       

  setConvertAmount: (val) => set({ convertAmount: val }),
  setSellAmount:    (val) => set({ sellAmount: val }),

  convertETH: async () => {
    try {
      set({ loading: true, error: null });
      await chainConvertBuy(get().convertAmount);
      set({ loading: false });
      await get().refreshBalances();
      await get().refreshPrice();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  sellBLTK: async () => {
    try {
      set({ loading: true, error: null });
      await chainConvertSell(get().sellAmount);
      set({ loading: false });
      await get().refreshBalances();
      await get().refreshPrice();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  
  stakeAmount:   "0",
  unstakeAmount: "0",

  setStakeAmount:   (val) => set({ stakeAmount: val }),
  setUnstakeAmount: (val) => set({ unstakeAmount: val }),

  stakeTokens: async () => {
    try {
      set({ loading: true, error: null });
      await chainStake(get().stakeAmount);
      set({ loading: false });
      await get().refreshBalances();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  unstakeTokens: async () => {
    try {
      set({ loading: true, error: null });
      await chainUnstake(get().unstakeAmount);
      set({ loading: false });
      await get().refreshBalances();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  },

  claimRewards: async () => {
    try {
      set({ loading: true, error: null });
      await chainClaim();
      set({ loading: false });
      await get().refreshBalances();
    } catch (err) {
      set({ loading: false, error: err.message });
    }
  }
}));
