import { useState } from "react";
import { STORAGE_KEYS, BUTTON_STYLES, HOME_PAGE_STYLE } from "../constants";
import CustomizationsModal from "../components/CustomizationsModal";
import { getCareerPoints } from "../utils/playerStats";

export default function Home({ setScreen }) {
  const [showCustomize, setShowCustomize] = useState(false);
  const hasSave = localStorage.getItem(STORAGE_KEYS.players);

  const xp = getCareerPoints();
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpCurrentThreshold = (level - 1) * (level - 1) * 100;
  const xpNextThreshold = level * level * 100;
  const levelXP = xp - xpCurrentThreshold;
  const nextLevelXP = xpNextThreshold - xpCurrentThreshold;
  const progressPercent = Math.min(100, Math.max(0, (levelXP / nextLevelXP) * 100));

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.players);
    localStorage.removeItem(STORAGE_KEYS.history);
    localStorage.removeItem(STORAGE_KEYS.round);
  };

  const startNewGame = () => {
    clearStorage();
    setScreen("game");
  };

  const clearMatch = () => {
    clearStorage();
    window.location.reload();
  };

  const actionBtn = (bg, color = "white", full = false) => ({
    background: bg,
    color: color,
    border: "none",
    padding: "14px 18px",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: full ? "100%" : "auto",
    flex: 1,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease"
  });

  return (
    <div style={HOME_PAGE_STYLE.container}>
      <div style={HOME_PAGE_STYLE.wrapper}>
        <img src="/new-icon-512.png" alt="Frazon's Logo" style={HOME_PAGE_STYLE.logo} />
        <h1 style={HOME_PAGE_STYLE.title}>FRAZON'S</h1>
        <div style={HOME_PAGE_STYLE.subtitle}>LEAST COUNT</div>
        <p style={HOME_PAGE_STYLE.description}>ONLINE CARD BATTLES</p>

        {/* User Profile Level & XP progress bar */}
        <div
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            boxSizing: "border-box"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 24 }}>👤</span>
              <div>
                <div style={{ fontWeight: "bold", fontSize: 15 }}>{localStorage.getItem("playerName")?.split("-")?.[0] || "Guest Player"}</div>
                <div style={{ fontSize: 11, color: "#aaa" }}>Ranked Card Duelist</div>
              </div>
            </div>
            <div style={{ background: "rgba(0, 229, 255, 0.15)", border: "1px solid rgba(0, 229, 255, 0.3)", color: "#00e5ff", fontWeight: "bold", padding: "4px 10px", borderRadius: 8, fontSize: 12 }}>
              LVL {level}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
              <span>Progress to Lvl {level + 1}</span>
              <span style={{ fontWeight: "bold", color: "#00ff88" }}>{levelXP} / {nextLevelXP} XP</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #00ff88, #00e5ff)",
                  boxShadow: "0 0 8px rgba(0,255,136,0.6)",
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>
          </div>
        </div>

        {/* Game Modes Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setScreen("practice")}
            style={{
              background: "linear-gradient(135deg, rgba(255,0,200,0.15), rgba(108,92,231,0.15))",
              border: "1px solid rgba(255,0,200,0.3)",
              borderRadius: 20,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(255,0,200,0.25)";
              e.currentTarget.style.borderColor = "rgba(255,0,200,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
              e.currentTarget.style.borderColor = "rgba(255,0,200,0.3)";
            }}
          >
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 16 }}>Bot Practice</div>
              <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>Offline Sandbox</div>
            </div>
          </button>

          <button
            onClick={() => setScreen("multiplayer")}
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(108,92,231,0.15))",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: 20,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,229,255,0.25)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
            }}
          >
            <span style={{ fontSize: 32 }}>☁️</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 16 }}>Play Online</div>
              <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>Multiplayer Room</div>
            </div>
          </button>
        </div>

        {/* Score Sheet Calculator Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 15, color: "#c4b5fd" }}>Score Sheet Calculator</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Track physical card game scores offline</div>
            </div>
          </div>

          {hasSave ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => setScreen("game")}
                style={actionBtn("#00e5ff", "black", true)}
                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
              >
                🎮 Continue Match
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={startNewGame}
                  style={actionBtn("rgba(255,255,255,0.08)", "white")}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  ✨ New Match
                </button>
                <button
                  onClick={clearMatch}
                  style={actionBtn("rgba(255, 0, 76, 0.15)", "#ff004c")}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 0, 76, 0.25)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 0, 76, 0.15)"}
                >
                  🗑 Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startNewGame}
              style={actionBtn("#ff00c8", "white", true)}
              onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
            >
              ✨ Start Score Sheet
            </button>
          )}
        </div>

        {/* Stats & Customizations 2x2 Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={() => setScreen("stats")}
            style={{
              background: "rgba(108, 92, 231, 0.08)",
              border: "1px solid rgba(108, 92, 231, 0.2)",
              color: "#a78bfa",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(108, 92, 231, 0.15)";
              e.currentTarget.style.borderColor = "rgba(108, 92, 231, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(108, 92, 231, 0.08)";
              e.currentTarget.style.borderColor = "rgba(108, 92, 231, 0.2)";
            }}
          >
            📊 Career Stats
          </button>
          <button
            onClick={() => setScreen("leaderboard")}
            style={{
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              color: "#00e5ff",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 229, 255, 0.15)";
              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 229, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.2)";
            }}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => setScreen("history")}
            style={{
              background: "rgba(0, 255, 136, 0.08)",
              border: "1px solid rgba(0, 255, 136, 0.2)",
              color: "#00ff88",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.15)";
              e.currentTarget.style.borderColor = "rgba(0, 255, 136, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.08)";
              e.currentTarget.style.borderColor = "rgba(0, 255, 136, 0.2)";
            }}
          >
            📜 Duel Logs
          </button>
          <button
            onClick={() => setShowCustomize(true)}
            style={{
              background: "rgba(255, 0, 200, 0.08)",
              border: "1px solid rgba(255, 0, 200, 0.2)",
              color: "#f472b6",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 0, 200, 0.15)";
              e.currentTarget.style.borderColor = "rgba(255, 0, 200, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 0, 200, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 0, 200, 0.2)";
            }}
          >
            🎨 Style Shop
          </button>
        </div>

        <CustomizationsModal isOpen={showCustomize} onClose={() => setShowCustomize(false)} />
      </div>
    </div>
  );
}
