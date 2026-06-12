import { useEffect, useState } from "react";
import { db } from "../firebase";
import { getTopPlayers } from "../utils/playerStats";
import { useToast } from "../hooks/useToast";

export default function Leaderboard({ setScreen }) {
  const [players, setPlayers] = useState([]);
  const [sortBy, setSortBy] = useState("wins");
  const [loading, setLoading] = useState(true);
  const { error } = useToast();

  useEffect(() => {
    let active = true;
    getTopPlayers(db, 20, sortBy)
      .then((topPlayers) => {
        if (active) setPlayers(topPlayers);
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
        fontFamily: "Arial",
        padding: 20
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 25
        }}
      >
        <h1 style={{ margin: 0 }}>🏆 Leaderboard</h1>
        <button
          onClick={() => setScreen("home")}
          style={{
            background: "#222",
            color: "white",
            border: "none",
            padding: 12,
            borderRadius: 14,
            cursor: "pointer"
          }}
        >
          🏠
        </button>
      </div>

      <div style={{ marginBottom: 20, display: "flex", gap: 10 }}>
        <button
          onClick={() => changeSort("wins")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: sortBy === "wins" ? "#00e5ff" : "#222",
            color: sortBy === "wins" ? "black" : "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          🎯 Most Wins
        </button>
        <button
          onClick={() => changeSort("totalScore")}
          style={{
            padding: "10px 20px",
            borderRadius: 10,
            border: "none",
            background: sortBy === "totalScore" ? "#00e5ff" : "#222",
            color: sortBy === "totalScore" ? "black" : "white",
            fontWeight: "bold",
            cursor: "pointer"
          }}
        >
          📊 Highest Score
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, fontSize: 18, color: "#9ca3af" }}>
          Loading leaderboard...
        </div>
      ) : players.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, fontSize: 18, color: "#9ca3af" }}>
          No players yet. Start a game!
        </div>
      ) : (
        <div style={{ maxWidth: 800, margin: "0 auto" }}>
          {players.map((player, index) => (
            <div
              key={player.name}
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 12,
                padding: 16,
                marginBottom: 10,
                display: "flex",
                alignItems: "center",
                gap: 16
              }}
            >
              <div
                style={{
                  fontSize: 32,
                  minWidth: 40,
                  textAlign: "center"
                }}
              >
                {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}.`}
              </div>
              <div style={{ fontSize: 24 }}>{player.avatar || "😈"}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: "bold", fontSize: 16 }}>{player.name}</div>
                <div style={{ color: "#9ca3af", fontSize: 13 }}>
                  {player.gamesPlayed} games • {player.winRate}% win rate
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#00e5ff", fontWeight: "bold", fontSize: 18 }}>
                  {sortBy === "wins" ? player.wins : player.totalScore}
                </div>
                <div style={{ color: "#9ca3af", fontSize: 12 }}>
                  {sortBy === "wins" ? "Wins" : "Total Score"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
