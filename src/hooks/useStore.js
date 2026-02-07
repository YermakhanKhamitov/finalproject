import { create } from "zustand";

export const useStore = create((set) => ({
  account: null,
  signer: null,
  ethBalance: "0",
  tokenBalance: "0",
  gameState: "LOBBY",
  ammo: 1,
  bet: 10,
  isAnimating: false,
  lastResult: null,

  setAccount: (acc, signer) => set({ account: acc, signer }),
  setBalances: (eth, tokens) => set({ ethBalance: eth, tokenBalance: tokens }),
  setGameState: (state) => set({ gameState: state }),
  setAmmo: (val) => set({ ammo: Number(val) }),
  setBet: (val) => set({ bet: val }),
  
  playAnimation: () => set({ isAnimating: true, gameState: "ANIMATING", lastResult: null }),
  
  winRound: () => set({ 
    isAnimating: false, 
    gameState: "RESULT", 
    lastResult: "WIN" 
  }),
  
  loseGame: () => set({ 
    isAnimating: false, 
    gameState: "RESULT", 
    lastResult: "LOSE" 
  }),

  finishAnimation: () => set({ isAnimating: false }),

  resetToLobby: () => set({ 
    gameState: "LOBBY", 
    lastResult: null, 
    isAnimating: false 
  })
}));