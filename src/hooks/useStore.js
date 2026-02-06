import { create } from "zustand";

export const useStore = create((set) => ({
  account: null,
  signer: null,
  ethBalance: "0", // Переименовал в ethBalance для соответствия Overlay
  tokenBalance: "0", // Используем строку, чтобы не терять точность длинных чисел
  gameState: "LOBBY",
  ammo: 1,
  bet: 10,
  isAnimating: false,
  lastResult: null,

  setAccount: (acc, signer) => set({ account: acc, signer }),
  
  // Обновление балансов (принимаем строки от ethers.format)
  setBalances: (eth, tokens) => set({ 
    ethBalance: eth, 
    tokenBalance: tokens 
  }),

  setGameState: (state) => set({ gameState: state }),
  setAmmo: (val) => set({ ammo: val }),
  setBet: (val) => set({ bet: val }),

  // Вызывается в момент клика, когда запускается транзакция
  playAnimation: () => set({ isAnimating: true }),

  winRound: (multiplier) => set((state) => ({
    isAnimating: false,
    gameState: "RESULT",
    lastResult: "WIN"
  })),

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