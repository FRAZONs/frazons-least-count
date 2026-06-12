import { useState, useEffect } from "react";

const CARD_STYLE = {
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 20,
  padding: 20,
  display: "flex",
  flexDirection: "column",
  gap: 8,
  position: "relative",
  overflow: "hidden"
};

const STAT_TITLE = {
  fontSize: 12,
  color: "#aaa",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: 1
};

const STAT_VALUE = {
  fontSize: 32,
  fontWeight: 900,
  color: "#00e5ff",
  margin: 0
};

export default function StatsDashboard({ setScreen }) {
  const [stats, setStats] = useState({
    onlineMatchesPlayed: 0,
    onlineMatchesWon: 0,
    offlineMatchesPlayed: 0,
    offlineMatchesWon: 0,
    declarationsMade: 0,
    declarationsWon: 0,
    declarationsLost: 0,
    totalRoundsPlayed: 0,
    totalPointsAccumulated: 0
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("frazons-career-stats");
      if (saved) {
        setStats(JSON.parse(saved));
      }
    } catch (e) {
      console.error("Failed to parse career stats:", e);
    }
  }, []);

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset all your career statistics? This cannot be undone.")) {
      const freshStats = {
        onlineMatchesPlayed: 0,
        onlineMatchesWon: 0,
        offlineMatchesPlayed: 0,
        offlineMatchesWon: 0,
        declarationsMade: 0,
        declarationsWon: 0,
        declarationsLost: 0,
        totalRoundsPlayed: 0,
        totalPointsAccumulated: 0
      };
      localStorage.setItem("frazons-career-stats", JSON.stringify(freshStats));
      setStats(freshStats);
    }
  };

  // Helper calculations
  const onlineMatchesPlayed = Number(stats.onlineMatchesPlayed) || 0;
  const onlineMatchesWon = Number(stats.onlineMatchesWon) || 0;
  const offlineMatchesPlayed = Number(stats.offlineMatchesPlayed) || 0;
  const offlineMatchesWon = Number(stats.offlineMatchesWon) || 0;
  const declarationsMade = Number(stats.declarationsMade) || 0;
  const declarationsWon = Number(stats.declarationsWon) || 0;
  const declarationsLost = Number(stats.declarationsLost) || 0;
  const totalRoundsPlayed = Number(stats.totalRoundsPlayed) || 0;
  const totalPointsAccumulated = Number(stats.totalPointsAccumulated) || 0;

  const onlineWinRate = onlineMatchesPlayed > 0 
    ? Math.round((onlineMatchesWon / onlineMatchesPlayed) * 100) 
    : 0;

  const offlineWinRate = offlineMatchesPlayed > 0
    ? Math.round((offlineMatchesWon / offlineMatchesPlayed) * 100)
    : 0;

  const decSuccessRate = declarationsMade > 0
    ? Math.round((declarationsWon / declarationsMade) * 100)
    : 0;

  const avgPoints = totalRoundsPlayed > 0
    ? (totalPointsAccumulated / totalRoundsPlayed).toFixed(1)
    : "0.0";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0d0d0d, #140526, #02162e)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: "30px 20px"
      }}
    >
      <div style={{ maxWidth: 800, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, textShadow: "0 0 15px rgba(0,229,255,0.4)" }}>📊 Career Statistics</h1>
            <p style={{ color: "#aaa", margin: "4px 0 0 0", fontSize: 14 }}>Your Least Count achievements and history</p>
          </div>
          <button 
            onClick={() => setScreen("home")}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "white",
              padding: "12px 20px",
              borderRadius: 14,
              cursor: "pointer",
              fontWeight: "bold",
              transition: "background 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
          >
            🏠 Home
          </button>
        </div>

        {/* Dashboard Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            gap: 20,
            marginBottom: 30
          }}
        >
          {/* Online Match Win rate card */}
          <div style={CARD_STYLE}>
            <div style={STAT_TITLE}>⚡ Online Battles</div>
            <div style={STAT_VALUE}>{onlineMatchesWon} / {onlineMatchesPlayed}</div>
            <div style={{ fontSize: 14, color: "#00ff88", fontWeight: "bold" }}>
              🏆 {onlineWinRate}% Win Rate
            </div>
            <div style={{ position: "absolute", right: 15, bottom: 10, fontSize: 40, opacity: 0.15 }}>☁️</div>
          </div>

          {/* Offline Match Win rate card */}
          <div style={CARD_STYLE}>
            <div style={STAT_TITLE}>🎮 Local Matches</div>
            <div style={STAT_VALUE}>{offlineMatchesWon} / {offlineMatchesPlayed}</div>
            <div style={{ fontSize: 14, color: "#00ff88", fontWeight: "bold" }}>
              🏆 {offlineWinRate}% Win Rate
            </div>
            <div style={{ position: "absolute", right: 15, bottom: 10, fontSize: 40, opacity: 0.15 }}>👥</div>
          </div>

          {/* Declaration success rate card */}
          <div style={CARD_STYLE}>
            <div style={STAT_TITLE}>📣 Declarations</div>
            <div style={STAT_VALUE}>{declarationsWon} / {declarationsMade}</div>
            <div style={{ fontSize: 14, color: decSuccessRate >= 50 ? "#00ff88" : "#ff7675", fontWeight: "bold" }}>
              🎯 {decSuccessRate}% Success Accuracy
            </div>
            <div style={{ position: "absolute", right: 15, bottom: 10, fontSize: 40, opacity: 0.15 }}>📢</div>
          </div>

          {/* Average Hand value card */}
          <div style={CARD_STYLE}>
            <div style={STAT_TITLE}>📉 Average Count</div>
            <div style={STAT_VALUE}>{avgPoints} <span style={{ fontSize: 14, fontWeight: "normal", color: "#aaa" }}>pts</span></div>
            <div style={{ fontSize: 14, color: "#c084fc", fontWeight: "bold" }}>
              Across {totalRoundsPlayed} rounds played
            </div>
            <div style={{ position: "absolute", right: 15, bottom: 10, fontSize: 40, opacity: 0.15 }}>🎴</div>
          </div>
        </div>

        {/* Detailed Breakdown section */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 24,
            padding: 24,
            marginBottom: 30
          }}
        >
          <h3 style={{ margin: "0 0 20px 0", color: "#c084fc", fontSize: 18 }}>📊 Lifetime Analytics</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#aaa" }}>Total Rounds Played:</span>
              <span style={{ fontWeight: "bold" }}>{totalRoundsPlayed}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#aaa" }}>Total Hand Points Accumulated:</span>
              <span style={{ fontWeight: "bold", color: "#ffb03a" }}>{totalPointsAccumulated} pts</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ color: "#aaa" }}>Failed Declarations (Penalized):</span>
              <span style={{ fontWeight: "bold", color: "#ff7675" }}>{declarationsLost}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: 10 }}>
              <span style={{ color: "#aaa" }}>Total Wins:</span>
              <span style={{ fontWeight: "bold", color: "#00ff88" }}>{onlineMatchesWon + offlineMatchesWon}</span>
            </div>
          </div>
        </div>

        {/* Reset Utility */}
        <div style={{ textAlign: "center" }}>
          <button
            onClick={handleReset}
            style={{
              background: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "#ef4444",
              padding: "10px 20px",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 13,
              fontWeight: "bold",
              transition: "all 0.2s"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.2)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.3)";
            }}
          >
            🗑 Reset Career Stats
          </button>
        </div>

      </div>
    </div>
  );
}
