

import { useStore, ROUND_STATE } from "../hooks/useStore";
import { useState } from "react";

const Panel = ({ children, style }) => (
  <div style={{
    background: "rgba(10,10,10,0.82)",
    border: "1px solid rgba(255,68,0,0.35)",
    borderRadius: 8,
    padding: "14px 20px",
    backdropFilter: "blur(6px)",
    ...style
  }}>
    {children}
  </div>
);

const Label = ({ children }) => (
  <span style={{ color: "#ff6633", fontSize: 11, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>
    {children}
  </span>
);

const Value = ({ children, style }) => (
  <span style={{ color: "#fff", fontSize: 15, fontWeight: 600, marginLeft: 8, ...style }}>
    {children}
  </span>
);

const Btn = ({ children, onClick, disabled, style }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "9px 22px",
      background: disabled ? "rgba(40,40,40,0.6)" : "rgba(20,20,20,0.85)",
      color: disabled ? "#555" : "#ff4400",
      border: `1px solid ${disabled ? "#333" : "rgba(255,68,0,0.4)"}`,
      borderRadius: 5,
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.2s",
      ...style
    }}
  >
    {children}
  </button>
);

const Input = ({ value, onChange, placeholder, style }) => (
  <input
    type="number"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    style={{
      background: "rgba(30,30,30,0.7)",
      border: "1px solid rgba(255,68,0,0.3)",
      borderRadius: 5,
      color: "#fff",
      padding: "7px 10px",
      fontSize: 13,
      width: 90,
      outline: "none",
      ...style
    }}
  />
);

export const Overlay = () => {
  const {
    walletAddress, isConnected, connectWallet,
    ethBalance, bltkBalance, stakedBalance, pendingRewards,
    currentPrice,
    roundState, roundBullets, roundMultiplier, roundShotsLeft, lastShotResult,
    startNewRound, spinBarrel, fireShot,
    isAnimating,
    convertAmount, setConvertAmount, convertETH,
    sellAmount, setSellAmount, sellBLTK,
    stakeAmount, setStakeAmount, stakeTokens,
    unstakeAmount, setUnstakeAmount, unstakeTokens, claimRewards,
    loading, error
  } = useStore();

  const [wagerInput, setWagerInput] = useState("1000");

  const gamePhase = (() => {
    if (!isConnected) return "CONNECT";
    if (roundState === ROUND_STATE.IDLE || roundState === ROUND_STATE.FINISHED) return "CHOOSE_BULLETS";
    if (roundState === ROUND_STATE.COMMITTED) return "SPIN";
    if (roundState === ROUND_STATE.ACTIVE) return "SHOOT";
    return "WAITING";
  })();

  return (
    <div style={{
      position: "absolute", inset: 0,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "flex-end",
      gap: 14, paddingBottom: 32,
      pointerEvents: "none",
      userSelect: "none"
    }}>

      <div style={{ position: "absolute", top: 20, left: 20, pointerEvents: "auto" }}>
        {!isConnected ? (
          <Btn onClick={connectWallet} style={{ background: "rgba(255,68,0,0.25)", color: "#ff6633" }}>
            🔗 Connect MetaMask
          </Btn>
        ) : (
          <Panel style={{ padding: "8px 14px" }}>
            <span style={{ color: "#0f0", fontSize: 11 }}>● </span>
            <span style={{ color: "#aaa", fontSize: 12 }}>{walletAddress?.slice(0,6)}…{walletAddress?.slice(-4)}</span>
          </Panel>
        )}
      </div>

      {isConnected && (
        <div style={{ position: "absolute", top: 20, right: 20, pointerEvents: "none" }}>
          <Panel style={{ display: "flex", gap: 24 }}>
            <div><Label>ETH</Label><Value>{parseFloat(ethBalance).toFixed(4)}</Value></div>
            <div><Label>BLTK</Label><Value>{parseFloat(bltkBalance).toFixed(2)}</Value></div>
            <div><Label>Staked</Label><Value>{parseFloat(stakedBalance).toFixed(2)}</Value></div>
            <div><Label>Rewards</Label><Value style={{ color: "#0f0" }}>{parseFloat(pendingRewards).toFixed(4)}</Value></div>
          </Panel>
        </div>
      )}

      {isConnected && (
        <div style={{ position: "absolute", top: 70, right: 20, pointerEvents: "none" }}>
          <Panel style={{ padding: "6px 12px" }}>
            <Label>Price</Label>
            <Value style={{ color: "#ffaa00", fontSize: 13 }}>
              {parseInt(currentPrice).toLocaleString()} BLTK/ETH
            </Value>
          </Panel>
        </div>
      )}

      {roundState === ROUND_STATE.ACTIVE && (
        <div style={{ pointerEvents: "none" }}>
          <Panel style={{ textAlign: "center" }}>
            <Label>Bullets</Label><Value>{roundBullets}</Value>
            <span style={{ color: "#555", margin: "0 10px" }}>|</span>
            <Label>Multiplier</Label><Value style={{ color: "#ff4400" }}>{roundMultiplier}×</Value>
            <span style={{ color: "#555", margin: "0 10px" }}>|</span>
            <Label>Shots Left</Label><Value>{roundShotsLeft}</Value>
          </Panel>
        </div>
      )}

      {lastShotResult && lastShotResult.roundFinished && (
        <div style={{ pointerEvents: "none" }}>
          {lastShotResult.survived ? (
            <Panel style={{ textAlign: "center", border: "1px solid #0f0", background: "rgba(0,40,0,0.7)" }}>
              <div style={{ color: "#0f0", fontSize: 22, fontWeight: 900 }}>🎉 YOU WON!</div>
              <div style={{ color: "#fff", marginTop: 6 }}>
                <Label>Payout</Label><Value>{parseFloat(lastShotResult.payout).toFixed(2)} BLTK</Value>
              </div>
            </Panel>
          ) : (
            <Panel style={{ textAlign: "center", border: "1px solid #f00", background: "rgba(40,0,0,0.7)" }}>
              <div style={{ color: "#f00", fontSize: 22, fontWeight: 900 }}>💀 YOU LOST</div>
              <div style={{ color: "#aaa", fontSize: 13, marginTop: 4 }}>Your wager has been burned.</div>
            </Panel>
          )}
        </div>
      )}

      <div style={{ pointerEvents: "auto", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
        {gamePhase === "CHOOSE_BULLETS" && (
          <>
            <div style={{ color: "#aaa", fontSize: 13, marginBottom: -4 }}>Choose bullets & enter BLTK wager:</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Label>Wager</Label>
              <Input value={wagerInput} onChange={setWagerInput} placeholder="1000" style={{ width: 120 }} />
              <span style={{ color: "#aaa", fontSize: 12 }}>BLTK</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const mults = [2, 5, 9, 14, 20];
                return (
                  <Btn
                    key={n}
                    onClick={() => startNewRound(n, wagerInput)}
                    disabled={loading || isAnimating || !wagerInput || parseFloat(wagerInput) < 1000}
                    style={{ flexDirection: "column", gap: 2, display: "flex" }}
                  >
                    <span>{n} bullet{n > 1 ? "s" : ""}</span>
                    <span style={{ fontSize: 10, color: "#ff6633", fontWeight: 400 }}>{mults[n - 1]}× payout</span>
                  </Btn>
                );
              })}
            </div>
            <div style={{ color: "#666", fontSize: 10 }}>Minimum wager: 1000 BLTK</div>
          </>
        )}

        {gamePhase === "SPIN" && (
          <Btn onClick={spinBarrel} disabled={loading} style={{ fontSize: 16, padding: "12px 48px", background: "rgba(255,68,0,0.2)" }}>
            🔄 Spin Barrel
          </Btn>
        )}

        {gamePhase === "SHOOT" && (
          <Btn onClick={fireShot} disabled={loading || isAnimating} style={{
            fontSize: 22,
            padding: "16px 64px",
            background: "rgba(180,0,0,0.6)",
            color: "#fff",
            border: "2px solid #f00",
            boxShadow: "0 0 24px rgba(255,0,0,0.4)"
          }}>
            🔫 SHOOT
          </Btn>
        )}

        {loading && <div style={{ color: "#ff6633", fontSize: 13 }}>⏳ Waiting for transaction…</div>}
      </div>

      {isConnected && (
        <div style={{ pointerEvents: "auto", display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
          <Panel style={{ minWidth: 200 }}>
            <div style={{ marginBottom: 8 }}><Label>Buy BLTK</Label></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input value={convertAmount} onChange={setConvertAmount} placeholder="0.001" />
              <span style={{ color: "#aaa", fontSize: 12 }}>ETH</span>
              <Btn onClick={convertETH} disabled={loading}>Buy</Btn>
            </div>
            <div style={{ color: "#666", fontSize: 10, marginTop: 6 }}>
              Price: {parseInt(currentPrice).toLocaleString()} BLTK/ETH
            </div>
          </Panel>

          <Panel style={{ minWidth: 200 }}>
            <div style={{ marginBottom: 8 }}><Label>Sell BLTK</Label></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Input value={sellAmount} onChange={setSellAmount} placeholder="1000" />
              <span style={{ color: "#aaa", fontSize: 12 }}>BLTK</span>
              <Btn onClick={sellBLTK} disabled={loading}>Sell</Btn>
            </div>
            <div style={{ color: "#666", fontSize: 10, marginTop: 6 }}>Get ETH back (1% fee)</div>
          </Panel>

          <Panel style={{ minWidth: 240 }}>
            <div style={{ marginBottom: 8 }}><Label>Staking (1% / day)</Label></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Input value={stakeAmount} onChange={setStakeAmount} placeholder="100" style={{ width: 80 }} />
              <span style={{ color: "#aaa", fontSize: 12 }}>BLTK</span>
              <Btn onClick={stakeTokens} disabled={loading}>Stake</Btn>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <Input value={unstakeAmount} onChange={setUnstakeAmount} placeholder="50" style={{ width: 80 }} />
              <span style={{ color: "#aaa", fontSize: 12 }}>BLTK</span>
              <Btn onClick={unstakeTokens} disabled={loading}>Unstake</Btn>
            </div>
            <Btn onClick={claimRewards} disabled={loading} style={{ width: "100%", fontSize: 11 }}>
              💰 Claim ({parseFloat(pendingRewards).toFixed(4)} BLTK)
            </Btn>
          </Panel>
        </div>
      )}

      {error && (
        <div style={{
          position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)",
          background: "rgba(60,0,0,0.9)", border: "1px solid #f44", borderRadius: 6,
          color: "#f88", padding: "8px 18px", fontSize: 13, pointerEvents: "none",
          maxWidth: "70vw", textAlign: "center"
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
