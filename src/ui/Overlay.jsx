import React, { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useStore } from '../hooks/useStore';
import { TOKEN_ADDRESS, buyTokensAndApprove, playRoulette, ROULETTE_ADDRESS } from "../utils/blockchain";
import TokenData from "../abi/BulletToken.json";
import "./Overlay.css";

const Overlay = () => {
  const store = useStore();
  const [loading, setLoading] = useState(false);

  const updateBalances = useCallback(async (addr) => {
    if (!window.ethereum || !addr) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const b = await provider.getBalance(addr);
      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TokenData.abi, provider);
      const tb = await tokenContract.balanceOf(addr);
      store.setBalances(ethers.formatEther(b), ethers.formatUnits(tb, 18));
    } catch (e) { console.error("Balance update failed", e); }
  }, [store]);

  const handleAction = async (action) => {
    if (!store.account) return;
    setLoading(true);
    try {
      if (action === 'buy') {
        await buyTokensAndApprove("0.01");
      } else if (action === 'play') {
        store.playAnimation();
        const receipt = await playRoulette(store.bet, store.ammo);
        const iface = new ethers.Interface([
          "event GamePlayed(address indexed player, uint256 bet, uint256 ammo, bool win, uint256 result)"
        ]);
        const log = receipt.logs.find(l => l.address.toLowerCase() === ROULETTE_ADDRESS.toLowerCase());
        if (log) {
          const parsed = iface.parseLog(log);
          parsed.args.win ? store.winRound() : store.loseGame();
        }
      }
      await updateBalances(store.account);
    } catch (e) {
      console.error("Action failed", e);
      store.finishAnimation();
      alert("Transaction failed. Check console or contract bankroll.");
    } finally { setLoading(false); }
  };

  const canPlay = !loading && 
                  store.gameState !== "ANIMATING" &&
                  parseFloat(store.tokenBalance) >= parseFloat(store.bet) && 
                  parseFloat(store.bet) > 0;

  return (
    <div className="overlay-container">
      {!store.account ? (
        <div className="connect-container">
          <button onClick={async () => {
            const accs = await window.ethereum.request({ method: 'eth_requestAccounts' });
            store.setAccount(accs[0]);
            updateBalances(accs[0]);
          }} className="connect-btn">CONNECT WALLET</button>
        </div>
      ) : (
        <>
          <div className="top-bar">
            <div className="stat-item">
              <span className="stat-label">ETH</span>
              <span className="stat-value">{Number(store.ethBalance).toFixed(4)}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">$BULLET</span>
              <span className="stat-value">{Number(store.tokenBalance).toFixed(2)}</span>
            </div>
            <button className="buy-btn" onClick={() => handleAction('buy')} disabled={loading}>+ BUY</button>
          </div>

          {store.gameState === "RESULT" && (
            <div className="modal">
              <h2 className={store.lastResult === "WIN" ? "win" : "lose"}>
                {store.lastResult === "WIN" ? "SURVIVED" : "DEAD"}
              </h2>
              <button className="action-btn" onClick={() => store.resetToLobby()}>CONTINUE</button>
            </div>
          )}

          <div className="bottom-bar">
            <div className="control-group">
              <span className="control-label">AMMO</span>
              <div className="ammo-selector">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} className={`ammo-btn ${store.ammo === n ? "active" : ""}`} onClick={() => store.setAmmo(n)}>{n}</button>
                ))}
              </div>
            </div>
            <div className="control-group">
              <span className="control-label">BET</span>
              <input type="number" className="bet-input" value={store.bet} onChange={(e) => store.setBet(e.target.value)} />
            </div>
            <button className="fire-btn" onClick={() => handleAction('play')} disabled={!canPlay}>
              {loading ? "..." : "FIRE"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Overlay;