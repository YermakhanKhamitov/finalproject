import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { 
  TOKEN_ADDRESS, 
  buyTokensAndApprove, 
  playRoulette 
} from "../utils/blockchain";
import TokenData from "../abi/BulletToken.json";
import "../ui/Overlay.css"; 

const Overlay = () => {
  const [account, setAccount] = useState(null);
  const [ethBalance, setEthBalance] = useState("0.00");
  const [tokenBalance, setTokenBalance] = useState("0.00");
  const [bet, setBet] = useState(10);
  const [ammo, setAmmo] = useState(1);
  const [loading, setLoading] = useState(false);

  const multiplier = (6 / (6 - ammo)).toFixed(2);

  const updateBalances = useCallback(async (addr) => {
    if (!window.ethereum || !addr) return;
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const b = await provider.getBalance(addr);
      setEthBalance(ethers.formatEther(b));

      const tokenContract = new ethers.Contract(TOKEN_ADDRESS, TokenData.abi, provider);
      const tb = await tokenContract.balanceOf(addr);
      setTokenBalance(ethers.formatUnits(tb, 18));
    } catch (e) { console.error(e); }
  }, []);

  const connect = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      updateBalances(accounts[0]);
    } else {
      alert("Please install MetaMask");
    }
  };

  const handleAction = async (action) => {
    if (!account) return connect();
    setLoading(true);
    try {
      if (action === 'buy') {
        await buyTokensAndApprove("0.01");
        alert("Tokens purchased successfully!");
      }
      if (action === 'play') {
        if (parseFloat(tokenBalance) < parseFloat(bet)) {
          alert(`Insufficient balance! You need ${bet} $BULLET tokens to play.`);
          setLoading(false);
          return;
        }
        const receipt = await playRoulette(bet, ammo);
        
        const event = receipt.logs.find(log => {
          try {
            return log.topics[0] === ethers.id("GamePlayed(address,uint256,uint8,uint256,bool,uint256)");
          } catch {
            return false;
          }
        });
        
        alert("Game completed! Check your balance.");
      }
      await updateBalances(account);
    } catch (e) {
      console.error("Transaction error:", e);
      const errorMsg = e.reason || e.message || "Transaction failed";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={uiStyles.container}>
      {!account ? (
        <button onClick={connect} style={uiStyles.connectBtn}>CONNECT WALLET</button>
      ) : (
        <>
          <div style={uiStyles.topBar}>
            <div style={uiStyles.stat}>ETH: {parseFloat(ethBalance).toFixed(4)}</div>
            <div style={uiStyles.stat}>$BULLET: {parseFloat(tokenBalance).toFixed(2)}</div>
            <button onClick={() => handleAction('buy')} disabled={loading} style={uiStyles.actionBtn}>
              BUY TOKENS
            </button>
          </div>

          <div style={uiStyles.bottomBar}>
            <div style={uiStyles.controls}>
              <div style={{marginBottom: '10px'}}>
                <label>AMMO: {ammo}</label>
                <input 
                  type="range" min="1" max="5" value={ammo} 
                  onChange={(e) => setAmmo(Number(e.target.value))}
                  style={{width: '100%', cursor: 'pointer'}}
                />
              </div>
              <div style={{marginBottom: '10px'}}>
                <label>BET: </label>
                <input 
                  type="number" 
                  value={bet} 
                  min="1"
                  step="1"
                  onChange={(e) => {
                    const value = parseFloat(e.target.value) || 1;
                    setBet(value > 0 ? value : 1);
                  }}
                  style={uiStyles.input}
                />
              </div>
              <div style={{fontSize: '12px', color: '#ffd700'}}>
                WIN: {(bet * multiplier).toFixed(2)} $B (x{multiplier})
              </div>
            </div>
            <button 
              onClick={() => handleAction('play')} 
              disabled={loading} 
              style={{...uiStyles.playBtn, opacity: loading ? 0.5 : 1}}
            >
              {loading ? "WAIT..." : "PULL TRIGGER"}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const uiStyles = {
  container: {
    position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none',
    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '20px'
  },
  topBar: { 
    display: 'flex', gap: '15px', pointerEvents: 'auto', background: 'rgba(0,0,0,0.8)', 
    padding: '15px', borderRadius: '8px', alignSelf: 'flex-start', color: 'white' 
  },
  bottomBar: { 
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', pointerEvents: 'auto' 
  },
  controls: { 
    background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '12px', width: '250px', color: 'white' 
  },
  connectBtn: { 
    pointerEvents: 'auto', margin: 'auto', padding: '15px 30px', background: '#ffd700', 
    border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' 
  },
  actionBtn: { background: '#ffd700', border: 'none', padding: '5px 10px', cursor: 'pointer', borderRadius: '4px' },
  playBtn: { 
    background: '#ff4444', color: 'white', border: 'none', padding: '20px 40px', 
    fontSize: '18px', fontWeight: 'bold', borderRadius: '8px', cursor: 'pointer' 
  },
  input: { background: '#222', color: 'white', border: '1px solid #444', padding: '5px', width: '80px' },
  stat: { fontWeight: 'bold' }
};

export default Overlay;