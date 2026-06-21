import { useState, useEffect } from "react";
import { getCareerPoints } from "../utils/playerStats";

const CARD_BACKS = [
  { id: "neon-cyber", name: "🌌 Neon Cyber", points: 0, desc: "Default holographic layout", symbol: "🎴", previewBg: "linear-gradient(135deg, #1e1b4b 0%, #090514 100%)", color: "#00e5ff" },
  { id: "forest-green", name: "🍀 Forest Green", points: 200, desc: "Casino-style felt pattern", symbol: "🍀", previewBg: "linear-gradient(135deg, #0f3d1b 0%, #031407 100%)", color: "#00ff88" },
  { id: "retro-pixel", name: "👾 Retro Pixel", points: 500, desc: "8-bit retro arcade grid", symbol: "👾", previewBg: "linear-gradient(135deg, #1e0b36 0%, #06020c 100%)", color: "#a855f7" },
  { id: "classic-royal", name: "👑 Classic Royal", points: 1000, desc: "Golden royal crimson backing", symbol: "👑", previewBg: "linear-gradient(135deg, #5c0612 0%, #1a0104 100%)", color: "#fbbf24" }
];

const BOARD_THEMES = [
  { id: "cyber-violet", name: "🌌 Cyber Violet", points: 0, desc: "Default glowing cyber violet grid", symbol: "🌌", previewBg: "radial-gradient(circle, rgba(29,7,56,0.95) 0%, rgba(13,3,26,0.98) 100%)", color: "#c084fc" },
  { id: "classic-green", name: "🟢 Green Felt", points: 300, desc: "Classic green casino felt pattern", symbol: "🟢", previewBg: "radial-gradient(circle, rgba(16,77,33,0.98) 0%, rgba(5,36,13,1) 100%)", color: "#fbbf24" },
  { id: "neon-blue", name: "🔵 Neon Grid", points: 600, desc: "Holographic light blue grid", symbol: "🔵", previewBg: "radial-gradient(circle, rgba(10,40,75,0.95) 0%, rgba(2,12,25,0.98) 100%)", color: "#00e5ff" },
  { id: "dark-carbon", name: "⚫ Carbon Fiber", points: 900, desc: "Sleek carbon dark pattern", symbol: "⚫", previewBg: "radial-gradient(circle, #2c3e50 0%, #0f171e 100%)", color: "#bdc3c7" }
];

export default function CustomizationsModal({ isOpen, onClose }) {
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState("cardBacks");
  const [activeBack, setActiveBack] = useState("neon-cyber");
  const [activeTheme, setActiveTheme] = useState("cyber-violet");

  useEffect(() => {
    if (isOpen) {
      setPoints(getCareerPoints());
      setActiveBack(localStorage.getItem("frazons-card-back") || "neon-cyber");
      setActiveTheme(localStorage.getItem("frazons-board-theme") || "cyber-violet");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectCardBack = (id, requiredPoints) => {
    if (points < requiredPoints) return;
    localStorage.setItem("frazons-card-back", id);
    setActiveBack(id);
  };

  const selectBoardTheme = (id, requiredPoints) => {
    if (points < requiredPoints) return;
    localStorage.setItem("frazons-board-theme", id);
    setActiveTheme(id);
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "rgba(20, 10, 35, 0.95)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 24,
          padding: 24,
          boxShadow: "0 10px 40px rgba(0,0,0,0.5), 0 0 20px rgba(108,92,231,0.2)",
          color: "white",
          display: "flex",
          flexDirection: "column",
          gap: 20
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: "#00e5ff" }}>🎨 Style Shop</h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "white",
              fontSize: 20,
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>

        {/* Career Points Counter */}
        <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", padding: 12, borderRadius: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 11, color: "#aaa", fontWeight: "bold" }}>CAREER XP POINTS</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#00ff88" }}>{points} <span style={{ fontSize: 11, color: "#aaa", fontWeight: "normal" }}>XP</span></div>
          </div>
          <span style={{ fontSize: 28 }}>⭐</span>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 12 }}>
          <button
            onClick={() => setActiveTab("cardBacks")}
            style={{
              background: activeTab === "cardBacks" ? "rgba(0, 229, 255, 0.15)" : "transparent",
              color: activeTab === "cardBacks" ? "#00e5ff" : "#aaa",
              border: activeTab === "cardBacks" ? "1px solid rgba(0, 229, 255, 0.25)" : "1px solid transparent",
              padding: "8px 16px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 13,
              flex: 1,
              transition: "all 0.2s"
            }}
          >
            🃏 Card Backs
          </button>
          <button
            onClick={() => setActiveTab("boardThemes")}
            style={{
              background: activeTab === "boardThemes" ? "rgba(0, 229, 255, 0.15)" : "transparent",
              color: activeTab === "boardThemes" ? "#00e5ff" : "#aaa",
              border: activeTab === "boardThemes" ? "1px solid rgba(0, 229, 255, 0.25)" : "1px solid transparent",
              padding: "8px 16px",
              borderRadius: 10,
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: 13,
              flex: 1,
              transition: "all 0.2s"
            }}
          >
            🏟️ Table Boards
          </button>
        </div>

        {/* Content list depending on active tab */}
        {activeTab === "cardBacks" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#c4b5fd" }}>SELECT CARD BACK DESIGN</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
              {CARD_BACKS.map((item) => {
                const unlocked = points >= item.points;
                const active = activeBack === item.id;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => selectCardBack(item.id, item.points)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 16,
                      background: active ? "rgba(0, 229, 255, 0.08)" : "rgba(255,255,255,0.02)",
                      border: active ? "1px solid #00e5ff" : unlocked ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: unlocked ? "pointer" : "not-allowed",
                      opacity: unlocked ? 1 : 0.5,
                      transition: "all 0.2s"
                    }}
                  >
                    {/* Card Back Preview Frame */}
                    <div
                      style={{
                        width: 42,
                        height: 58,
                        borderRadius: 6,
                        background: item.previewBg,
                        border: active ? `1.5px solid ${item.color}` : "1px solid rgba(255,255,255,0.2)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                        fontSize: 18,
                        boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                      }}
                    >
                      <span style={{ color: item.color, textShadow: `0 0 5px ${item.color}` }}>{item.symbol}</span>
                    </div>

                    {/* Text details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {item.name}
                        {active && <span style={{ background: "#00e5ff", color: "black", fontSize: 8, padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.desc}</div>
                    </div>

                    {/* Lock/Unlock indicators */}
                    <div>
                      {unlocked ? (
                        active ? (
                          <span style={{ color: "#00e5ff" }}>✔️</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#888" }}>Select</span>
                        )
                      ) : (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12 }}>🔒 Lock</span>
                          <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2 }}>Needs {item.points} XP</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ fontSize: 13, fontWeight: "bold", color: "#c4b5fd" }}>SELECT PLAYING BOARD THEME</div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto", paddingRight: 4 }}>
              {BOARD_THEMES.map((item) => {
                const unlocked = points >= item.points;
                const active = activeTheme === item.id;
                
                return (
                  <div
                    key={item.id}
                    onClick={() => selectBoardTheme(item.id, item.points)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: 12,
                      borderRadius: 16,
                      background: active ? "rgba(0, 229, 255, 0.08)" : "rgba(255,255,255,0.02)",
                      border: active ? "1px solid #00e5ff" : unlocked ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(255,255,255,0.04)",
                      cursor: unlocked ? "pointer" : "not-allowed",
                      opacity: unlocked ? 1 : 0.5,
                      transition: "all 0.2s"
                    }}
                  >
                    {/* Board Theme Preview Circle */}
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: "50%",
                        background: item.previewBg,
                        border: active ? `2px solid ${item.color}` : "1px solid rgba(255,255,255,0.2)",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        position: "relative",
                        fontSize: 20,
                        boxShadow: "0 2px 8px rgba(0,0,0,0.4)"
                      }}
                    >
                      <span style={{ textShadow: `0 0 5px ${item.color}` }}>{item.symbol}</span>
                    </div>

                    {/* Text details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: "bold", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                        {item.name}
                        {active && <span style={{ background: "#00e5ff", color: "black", fontSize: 8, padding: "2px 6px", borderRadius: 4, fontWeight: "bold" }}>ACTIVE</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>{item.desc}</div>
                    </div>

                    {/* Lock/Unlock indicators */}
                    <div>
                      {unlocked ? (
                        active ? (
                          <span style={{ color: "#00e5ff" }}>✔️</span>
                        ) : (
                          <span style={{ fontSize: 12, color: "#888" }}>Select</span>
                        )
                      ) : (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontSize: 12 }}>🔒 Lock</span>
                          <div style={{ fontSize: 9, color: "#ef4444", marginTop: 2 }}>Needs {item.points} XP</div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            padding: 14,
            borderRadius: 14,
            background: "linear-gradient(90deg, #6c5ce7, #8e44ad)",
            border: "none",
            color: "white",
            fontWeight: "bold",
            cursor: "pointer",
            fontSize: 14,
            boxShadow: "0 4px 15px rgba(108,92,231,0.3)",
            marginTop: 4
          }}
        >
          Confirm Settings
        </button>
      </div>
    </div>
  );
}
