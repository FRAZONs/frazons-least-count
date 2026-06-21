import { useEffect, useState } from "react";
import { db } from "../firebase";
import { getTopPlayers, getRankTier } from "../utils/playerStats";
import { useToast } from "../hooks/useToast";

export default function Leaderboard({ setScreen }) {
  const [players, setPlayers] = useState([]);
  const [sortBy, setSortBy] = useState("wins");
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    let active = true;
    // Fetch 100 players if rankedPoints is sorted, otherwise 20
    const limitCount = sortBy === "rankedPoints" ? 100 : 20;

    getTopPlayers(db, limitCount, sortBy)
      .then((topPlayers) => {
        if (active) {
          setPlayers(topPlayers);

          // Update local cache of isTop100 status
          const localNameKey = localStorage.getItem("playerName") || "";
          if (localNameKey) {
            // Find index in top players list sorted by rankedPoints
            if (sortBy === "rankedPoints") {
              const myRankIndex = topPlayers.findIndex(
                (p) => p.name.trim().toLowerCase() === localNameKey.trim().toLowerCase()
              );
              if (myRankIndex !== -1 && myRankIndex < 100) {
                localStorage.setItem("frazons-is-top-100", "true");
              } else {
                localStorage.setItem("frazons-is-top-100", "false");
              }
            }
          }
        }
      })
      .catch((err) => {
        if (active) error("Failed to load leaderboard");
        console.error(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [error, sortBy]);

  const changeSort = (nextSort) => {
    setLoading(true);
    setSortBy(nextSort);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0d0d0d,#180028,#001f3f)",
        color: "white",
        fontFamily: "system-ui, -apple-system, sans-serif",
        padding: 20
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25,
          maxWidth: 680,
          margin: "0 auto 25px auto"
        }}
      >
        <div>
          <h1 style={{ margin: 0, textShadow: "0 0 15px rgba(0,229,255,0.4)" }}>🏆 Leaderboard</h1>
          <div style={{ color: "#00e5ff", fontSize: 13, marginTop: 4 }}>Top Duelists Arena</div>
        </div>
        <button
          onClick={() => setScreen("home")}
          style={{
            background: "rgba(255,255,255,0.08)",
            color: "white",
            border: "none",
            padding: "10px 18px",
            borderRadius: 12,
            cursor: "pointer",
            fontWeight: "bold",
            transition: "all 0.2s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
        >
          ← Back
        </button>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          onClick={() => changeSort("wins")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: sortBy === "wins" ? "1px solid rgba(0, 229, 255, 0.4)" : "1px solid transparent",
            background: sortBy === "wins" ? "rgba(0, 229, 255, 0.15)" : "rgba(255,255,255,0.04)",
            color: sortBy === "wins" ? "#00e5ff" : "#aaa",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          🎯 Most Wins
        </button>
        <button
          onClick={() => changeSort("totalScore")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: sortBy === "totalScore" ? "1px solid rgba(0, 229, 255, 0.4)" : "1px solid transparent",
            background: sortBy === "totalScore" ? "rgba(0, 229, 255, 0.15)" : "rgba(255,255,255,0.04)",
            color: sortBy === "totalScore" ? "#00e5ff" : "#aaa",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          📊 Highest Score
        </button>
        <button
          onClick={() => changeSort("rankedPoints")}
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: sortBy === "rankedPoints" ? "1px solid rgba(255, 0, 127, 0.4)" : "1px solid transparent",
            background: sortBy === "rankedPoints" ? "rgba(255, 0, 127, 0.15)" : "rgba(255,255,255,0.04)",
            color: sortBy === "rankedPoints" ? "#ff007f" : "#aaa",
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s"
          }}
        >
          ⚔️ Ranked Arena
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa" }}>
          <div className="spinner" style={{ border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid #00e5ff", borderRadius: "50%", width: 36, height: 36, margin: "0 auto 16px auto", animation: "spin 1s linear infinite" }} />
          <span>Loading leaderboard players...</span>
        </div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, fontSize: 16, color: "#888" }}>
          No players recorded yet. Start a game!
        </div>
      ) : (
        <div style={{ maxWidth: 680, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 }}>
          {players.map((player, index) => {
            const isRankedTab = sortBy === "rankedPoints";
            const points = player.rankedPoints || 0;
            const rankInfo = getRankTier(points, isRankedTab && index < 100);

            return (
              <div
                key={player.name}
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 16,
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 16,
                  transition: "transform 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.01)"}
                onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
              >
                {/* Ranking Medals */}
                <div
                  style={{
                    fontSize: 24,
                    minWidth: 40,
                    textAlign: "center",
                    fontWeight: "bold",
                    color: index === 0 ? "#ffd700" : index === 1 ? "#c0c0c0" : index === 2 ? "#cd7f32" : "#888"
                  }}
                >
                  {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}`}
                </div>

                {/* Avatar */}
                <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {(player.avatar || "😈").startsWith("data:image") ? (
                    <img
                      src={player.avatar || "😈"}
                      alt=""
                      style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: "1px solid rgba(255,255,255,0.15)" }}
                    />
                  ) : (
                    <span style={{ fontSize: 28 }}>{player.avatar || "😈"}</span>
                  )}
                </div>

                {/* Player details */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: 16, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span>{player.name}</span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: "bold",
                        background: "rgba(255, 255, 255, 0.04)",
                        border: `1px solid ${rankInfo.color}44`,
                        padding: "1px 6px",
                        borderRadius: 5,
                        color: rankInfo.color,
                        textShadow: `0 0 5px ${rankInfo.color}33`,
                        whiteSpace: "nowrap"
                      }}
                    >
                      {rankInfo.levelName}
                    </span>
                  </div>
                  <div style={{ color: "#aaa", fontSize: 12, marginTop: 4 }}>
                    {player.gamesPlayed} games • {player.winRate}% win rate
                  </div>
                </div>

                {/* Score stats columns */}
                <div style={{ textAlign: "right" }}>
                  <div style={{ color: isRankedTab ? "#ff007f" : "#00e5ff", fontWeight: "bold", fontSize: 18 }}>
                    {isRankedTab ? `${points} RP` : sortBy === "wins" ? player.wins : player.totalScore}
                  </div>
                  <div style={{ color: "#aaa", fontSize: 11, marginTop: 2 }}>
                    {isRankedTab ? "Arena Rating" : sortBy === "wins" ? "Wins" : "Total Score"}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
