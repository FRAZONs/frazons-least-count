import { useState, useEffect } from "react";
import { db } from "../firebase";
import { getMatchHistoryFromDatabase } from "../utils/playerStats";

const panelStyle = {
  padding: 20,
  borderRadius: 18,
  background: "rgba(255, 255, 255, 0.05)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  boxShadow: "0 4px 20px rgba(0,0,0,0.3)"
};

const backButtonStyle = {
  background: "rgba(255, 255, 255, 0.08)",
  color: "white",
  border: "none",
  padding: "10px 18px",
  borderRadius: 10,
  cursor: "pointer",
  fontWeight: "bold",
  fontSize: 14,
  transition: "all 0.2s"
};

export default function MatchHistory({ setScreen }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const playerName = localStorage.getItem("playerName") || "player";
  const pKey = playerName.toLowerCase().replace(/\s+/g, "_");

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const data = await getMatchHistoryFromDatabase(db, pKey);
        setHistory(data);
      } catch (err) {
        console.error("Failed to load match history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [pKey]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        color: "white",
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 24 }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 32, textShadow: "0 0 15px rgba(0,229,255,0.4)" }}>📜 Duel Logs</h1>
            <div style={{ color: "#00e5ff", fontSize: 13, marginTop: 4 }}>Completed Game Records</div>
          </div>
          <button
            onClick={() => setScreen("home")}
            style={backButtonStyle}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.15)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)"}
          >
            ← Exit
          </button>
        </div>

        {/* List Container */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
            <div className="spinner" style={{ border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid #00e5ff", borderRadius: "50%", width: 36, height: 36, margin: "0 auto 16px auto", animation: "spin 1s linear infinite" }} />
            <span>Loading match logs from database...</span>
            <style>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        ) : history.length === 0 ? (
          <div style={{ ...panelStyle, textAlign: "center", padding: "48px 24px", color: "#888" }}>
            <span style={{ fontSize: 48, display: "block", marginBottom: 12 }}>🃏</span>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#aaa" }}>No matches recorded yet</div>
            <p style={{ fontSize: 13, color: "#666", marginTop: 4, maxWidth: 300, margin: "4px auto 0 auto" }}>
              Complete a match in Bot Practice or Online mode to log your results to the database!
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {history.map((match) => {
              const formattedDate = match.createdAt
                ? new Date(match.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                  })
                : "Unknown Date";

              // Check if user is winner
              const isWinner = match.winnerKey === pKey;

              // Find user's score
              const myParticipant = match.players?.find(p => p.key === pKey);
              const myScore = myParticipant ? `${myParticipant.totalScore} pts` : "-";

              return (
                <div
                  key={match.id}
                  style={{
                    ...panelStyle,
                    background: isWinner ? "rgba(0, 255, 136, 0.04)" : "rgba(255, 255, 255, 0.03)",
                    border: isWinner ? "1px solid rgba(0, 255, 136, 0.25)" : "1px solid rgba(255, 255, 255, 0.08)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 14,
                    transition: "transform 0.2s",
                    cursor: "default"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                >
                  {/* Top line summary */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: "bold",
                        textTransform: "uppercase",
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: match.type === "online" ? "rgba(192, 132, 252, 0.2)" : "rgba(0, 229, 255, 0.15)",
                        color: match.type === "online" ? "#c084fc" : "#00e5ff",
                        border: match.type === "online" ? "1px solid rgba(192, 132, 252, 0.4)" : "1px solid rgba(0, 229, 255, 0.3)"
                      }}>
                        {match.type === "online" ? "☁️ Online" : "🤖 Offline"}
                      </span>
                      <span style={{ fontSize: 12, color: "#888" }}>{formattedDate}</span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13, color: "#aaa" }}>Rounds: <strong>{match.roundCount || "-"}</strong></span>
                      {isWinner ? (
                        <span style={{ background: "#00ff88", color: "black", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: "bold" }}>
                          🏆 VICTORY
                        </span>
                      ) : (
                        <span style={{ background: "rgba(255,255,255,0.08)", color: "#aaa", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: "bold" }}>
                          DEFEAT
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Player Rankings List */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(0,0,0,0.15)", padding: 12, borderRadius: 12 }}>
                    {(match.players || [])
                      .sort((a, b) => a.totalScore - b.totalScore)
                      .map((p, rankIdx) => {
                        const isMe = p.key === pKey;
                        const medal = rankIdx === 0 ? "🥇" : rankIdx === 1 ? "🥈" : rankIdx === 2 ? "🥉" : "👤";
                        
                        return (
                          <div
                            key={p.key}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              fontSize: 13,
                              color: isMe ? "#00ff88" : "#fff",
                              fontWeight: isMe ? "bold" : "normal"
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ width: 18, textAlign: "center" }}>{medal}</span>
                              <span>{p.name} {isMe && "(You)"}</span>
                            </div>
                            <span style={{ color: rankIdx === 0 ? "#00ff88" : "#aaa", fontFamily: "monospace" }}>
                              {p.totalScore} pts
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
