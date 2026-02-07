import React, { useState } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../hooks/useStore';
import { TOKEN_ADDRESS, ROULETTE_ADDRESS, TOKEN_ABI, ROULETTE_ABI } from "../utils/blockchain";
import "./Overlay.css";

const Overlay = () => {
  const store = useStore();
  const [loading, setLoading] = useState(false);
  const [buyAmount, setBuyAmount] = useState("0.01");
  
  const [lastWinAmmo, setLastWinAmmo] = useState(0);

  const emptyChambers = 6 - store.ammo;
  const multiplier = emptyChambers > 0 ? (6 / emptyChambers) : 0;
  const potentialWin = (Number(store.bet) * multiplier).toFixed(2);

  const getBalance = async (addr) => {
    if (!window.ethereum || !addr) return "0";
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const token = new ethers.Contract(TOKEN_ADDRESS, ["function balanceOf(address) view returns (uint256)"], provider);
      const bal = await token.balanceOf(addr);
      return ethers.formatUnits(bal, 18);
    } catch (e) { return "0"; }
  };

  const updateBalances = async (addr) => {
    const bal = await getBalance(addr);
    store.setBalances("0", bal);
  };

  const connect = async () => {
    if (!window.ethereum) return;
    try {
      const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (accs.length > 0) {
        store.setAccount(accs[0]);
        updateBalances(accs[0]);
      }
    } catch (e) {}
  };

  const buyTokens = async () => {
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const token = new ethers.Contract(TOKEN_ADDRESS, TOKEN_ABI, signer);
      const tx = await token.buyTokens({ value: ethers.parseEther(buyAmount) });
      await tx.wait();
      updateBalances(store.account);
    } catch (e) {}
    setLoading(false);
  };

  const play = async () => {
    if (loading || !store.isLoaded) return;
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const roulette = new ethers.Contract(ROULETTE_ADDRESS, ROULETTE_ABI, signer);
      const token = new ethers.Contract(TOKEN_ADDRESS, [
        "function allowance(address,address) view returns (uint256)", 
        "function approve(address,uint256) returns (bool)"
      ], signer);
      
      const betWei = ethers.parseUnits(store.bet.toString(), 18);
      const currentBalance = await getBalance(store.account);
      
      const allowance = await token.allowance(store.account, ROULETTE_ADDRESS);
      if (allowance < betWei) {
        const atx = await token.approve(ROULETTE_ADDRESS, ethers.MaxUint256);
        await atx.wait();
      }

      const tx = await roulette.play(betWei, BigInt(store.ammo), { gasLimit: 600000 });
      await tx.wait();

      const newBalance = await getBalance(store.account);
      const isWin = parseFloat(newBalance) > parseFloat(currentBalance);

      store.setResult(isWin); 

      setTimeout(() => {
        setLoading(false);
        store.setBalances("0", newBalance);
        
        if (isWin) {
          setLastWinAmmo(store.ammo);
        } else {
          setLastWinAmmo(0);
        }
      }, 600);
    } catch (e) {
      console.error(e);
      store.reset();
      setLoading(false);
    }
  };

  const handleNextTurn = (isWin) => {
    if (!isWin) {
      setLastWinAmmo(0);
      store.setAmmo(0);
    }
    store.reset(); 
  };

  return (
    <div className="dapp-overlay">
      {!store.account ? (
        <div className="screen-center">
          <div className="glass-panel main-menu">
            <h1 className="title">RUSSIAN ROULETTE</h1>
            <button className="connect-btn" onClick={connect}>CONNECT WALLET</button>
          </div>
        </div>
      ) : (
        <div className="hud-container">
          <div className="hud-top">
            <div className="glass-panel buy-box">
              <input type="number" value={buyAmount} onChange={e => setBuyAmount(e.target.value)} step="0.01" />
              <button className="action-btn" onClick={buyTokens}>BUY</button>
              <div className="balance-info">
                <small>BULLETS</small>
                <strong>{Number(store.tokenBalance).toFixed(2)}</strong>
              </div>
            </div>
          </div>

          <div className="hud-bottom">
            <div className={`glass-panel controls ${store.gameState === 'RESULT' ? 'hidden' : ''}`}>
              <div className="bet-config">
                <div className="input-group">
                  <label>YOUR BET</label>
                  <input type="number" value={store.bet} onChange={(e) => store.setBet(e.target.value)} disabled={store.isLoaded || store.isAnimating} />
                </div>
                <div className="win-estimate">
                  <small>WIN ({multiplier.toFixed(1)}x)</small>
                  <span>{potentialWin}</span>
                </div>
              </div>

              <div className="ammo-grid">
                {[1, 2, 3, 4, 5].map(n => {
                  const isBelowWin = lastWinAmmo > 0 && n <= lastWinAmmo;
                  
                  return (
                    <button 
                      key={n} 
                      disabled={store.isLoaded || store.isAnimating || isBelowWin} 
                      className={`ammo-btn ${store.ammo === n ? "active" : ""}`} 
                      onClick={() => store.setAmmo(n)}
                    >
                      {n}
                    </button>
                  );
                })}
              </div>
              
              <div className="action-row">
                {!store.isLoaded ? (
                  <button className="fire-btn load-style" onClick={() => store.startLoad()} disabled={store.isAnimating || store.ammo <= lastWinAmmo}>
                    {store.isAnimating ? "LOADING..." : "LOAD REVOLVER"}
                  </button>
                ) : (
                  <button className="fire-btn" onClick={play} disabled={loading}>
                    {loading ? "SHOOTING..." : "FIRE"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {store.gameState === "RESULT" && !loading && (
        <div className="modal-root">
          <div className={`glass-panel result-box ${store.lastResult?.toLowerCase()}`}>
            <h2 className="status-text">{store.lastResult === "WIN" ? "SURVIVED" : "DIED"}</h2>
            <p className="result-desc">
              {store.lastResult === "WIN" ? `You won ${potentialWin} tokens!` : "The chamber was not empty."}
            </p>
            <div className="modal-actions">
              <button className="m-btn primary" onClick={() => handleNextTurn(store.lastResult === "WIN")}>
                {store.lastResult === "WIN" ? "CONTINUE" : "TRY AGAIN"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overlay;