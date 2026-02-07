import { create } from "zustand";

export const useStore = create((set) => ({
  account: null,
  tokenBalance: "0",
  gameState: "LOBBY",
  ammo: 1,
  bet: 10,
  lastResult: null,
  isAnimating: false,
  isLoaded: false,

  setAccount: (acc) => set({ account: acc }),
  setBalances: (eth, tokens) => set({ tokenBalance: tokens }),
  setAmmo: (val) => set({ ammo: Number(val) }),
  setBet: (val) => set({ bet: val }),
  
  startLoad: () => set({ isAnimating: true, isLoaded: false }),
  finishAnimation: () => set({ isAnimating: false, isLoaded: true }),
  
  setResult: (isWin) => set({ 
    gameState: "RESULT", 
    lastResult: isWin ? "WIN" : "LOSE",
    isLoaded: false 
  }),

  reset: () => set({ 
    gameState: "LOBBY", 
    lastResult: null, 
    isAnimating: false, 
    isLoaded: false 
  })
}));