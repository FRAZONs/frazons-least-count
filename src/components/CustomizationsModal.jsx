import { useState, useEffect } from "react";
import { getCareerPoints } from "../utils/playerStats";

const CARD_BACKS = [
  { id: "neon-cyber", name: "🌌 Neon Cyber", points: 0, desc: "Default holographic layout", symbol: "🎴", previewBg: "linear-gradient(135deg, #1e1b4b 0%, #090514 100%)", color: "#00e5ff" },
  { id: "forest-green", name: "🍀 Forest Green", points: 200, desc: "Casino-style felt pattern", symbol: "🍀", previewBg: "linear-gradient(135deg, #0f3d1b 0%, #031407 100%)", color: "#00ff88" },
  { id: "retro-pixel", name: "👾 Retro Pixel", points: 500, desc: "8-bit retro arcade grid", symbol: "👾", previewBg: "linear-gradient(135deg, #1e0b36 0%, #06020c 100%)", color: "#a855f7" },
  { id: "classic-royal", name: "👑 Classic Royal", points: 1000, desc: "Golden royal crimson backing", symbol: "👑", previewBg: "linear-gradient(135deg, #5c0612 0%, #1a0104 100%)", color: "#fbbf24" }
];

export default function CustomizationsModal({ isOpen, onClose }) {
  const [points, setPoints] = useState(0);
  const [activeBack, setActiveBack] = useState("neon-cyber");

  useEffect(() => {
    if (isOpen) {
      setPoints(getCareerPoints());
      setActiveBack(localStorage.getItem("frazons-card-back") || "neon-cyber");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selectCardBack = (id, requiredPoints) => {
    if (points < requiredPoints) return;
    localStorage.setItem("frazons-card-back", id);
    setActiveBack(id);
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
          <h2 style={{ margin: 0, fontSize: 20, color: "#00e5ff" }}>🎨 Customizations</h2>
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

        {/* Card Back selection list */}
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
            boxShadow: "0 4px 15px rgba(108,92,231,0.3)"
          }}
        >
          Confirm Settings
        </button>
      </div>
    </div>
  );
}
