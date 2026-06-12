import { useState } from "react";

export default function RoomSettings({ onSettingsChange }) {
  const [maxScore, setMaxScore] = useState(200);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [roundLimit, setRoundLimit] = useState(null);

  const handleChange = () => {
    onSettingsChange({
      maxScore,
      maxPlayers,
      roundLimit
    });
  };

  return (
    <div
      style={{
        background: "rgba(108,92,231,0.1)",
        border: "1px solid #6c5ce7",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16
      }}
    >
      <h3 style={{ margin: "0 0 16px 0", color: "#6c5ce7" }}>⚙️ Room Settings</h3>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 4 }}>
          Max Score Limit: {maxScore}
        </label>
        <select
          value={maxScore}
          onChange={(e) => {
            setMaxScore(Number(e.target.value));
            handleChange();
          }}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #6c5ce7",
            background: "rgba(108,92,231,0.2)",
            color: "white",
            cursor: "pointer",
            boxSizing: "border-box"
          }}
        >
          <option value={100}>🎯 100 Points (Fast)</option>
          <option value={200}>🎮 200 Points (Standard)</option>
          <option value={500}>🏆 500 Points (Marathon)</option>
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 4 }}>
          Max Players: {maxPlayers}
        </label>
        <input
          type="range"
          min="2"
          max="6"
          value={maxPlayers}
          onChange={(e) => {
            setMaxPlayers(Number(e.target.value));
            handleChange();
          }}
          style={{ width: "100%", cursor: "pointer" }}
        />
        <div style={{ color: "#00e5ff", fontSize: 12, marginTop: 4 }}>
          {maxPlayers} players • {Array(maxPlayers).fill("👤").join("")}
        </div>
      </div>

      <div>
        <label style={{ color: "#9ca3af", fontSize: 12, display: "block", marginBottom: 4 }}>
          Round Limit (Optional)
        </label>
        <input
          type="number"
          placeholder="Leave blank for unlimited"
          value={roundLimit || ""}
          onChange={(e) => {
            setRoundLimit(e.target.value ? Number(e.target.value) : null);
            handleChange();
          }}
          min="1"
          max="20"
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 8,
            border: "1px solid #6c5ce7",
            background: "rgba(108,92,231,0.2)",
            color: "white",
            boxSizing: "border-box"
          }}
        />
      </div>
    </div>
  );
}
