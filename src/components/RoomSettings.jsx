import { useState } from "react";
import { DEFAULT_ONLINE_SETTINGS } from "../utils/onlineGame";

const fieldStyle = {
  width: "100%",
  padding: 10,
  borderRadius: 8,
  border: "1px solid #6c5ce7",
  background: "#241b46",
  color: "white",
  boxSizing: "border-box"
};

export default function RoomSettings({ onSettingsChange }) {
  const [settings, setSettings] = useState(DEFAULT_ONLINE_SETTINGS);

  const updateSetting = (name, value) => {
    const nextSettings = { ...settings, [name]: value };
    setSettings(nextSettings);
    onSettingsChange(nextSettings);
  };

  const labelStyle = {
    color: "#c4b5fd",
    fontSize: 12,
    display: "block",
    marginBottom: 4
  };

  return (
    <div
      style={{
        background: "rgba(108,92,231,0.1)",
        border: "1px solid #6c5ce7",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        textAlign: "left"
      }}
    >
      <h3 style={{ margin: "0 0 16px", color: "#a78bfa" }}>Room Settings</h3>

      <label style={labelStyle}>Score limit</label>
      <select
        value={settings.maxScore}
        onChange={(event) => updateSetting("maxScore", Number(event.target.value))}
        style={{ ...fieldStyle, marginBottom: 12 }}
      >
        <option value={100}>100 points</option>
        <option value={200}>200 points</option>
        <option value={500}>500 points</option>
      </select>

      <label style={labelStyle}>Maximum players: {settings.maxPlayers}</label>
      <input
        type="range"
        min="2"
        max="6"
        value={settings.maxPlayers}
        onChange={(event) => updateSetting("maxPlayers", Number(event.target.value))}
        style={{ width: "100%", marginBottom: 12 }}
      />

      <label style={labelStyle}>Round limit (blank means unlimited)</label>
      <input
        type="number"
        min="1"
        max="50"
        value={settings.roundLimit || ""}
        onChange={(event) =>
          updateSetting("roundLimit", event.target.value ? Number(event.target.value) : null)
        }
        style={{ ...fieldStyle, marginBottom: 12 }}
      />

      <label style={labelStyle}>Failed declaration penalty</label>
      <select
        value={settings.declarationPenalty}
        onChange={(event) =>
          updateSetting("declarationPenalty", Number(event.target.value))
        }
        style={{ ...fieldStyle, marginBottom: 12 }}
      >
        <option value={20}>20 points</option>
        <option value={40}>40 points</option>
        <option value={60}>60 points</option>
      </select>

      <label style={labelStyle}>Starting cards</label>
      <select
        value={settings.startingCards}
        onChange={(event) => updateSetting("startingCards", Number(event.target.value))}
        style={{ ...fieldStyle, marginBottom: 12 }}
      >
        <option value={5}>5 cards</option>
        <option value={7}>7 cards</option>
        <option value={10}>10 cards</option>
      </select>

      <label style={labelStyle}>Turn timer</label>
      <select
        value={settings.turnSeconds}
        onChange={(event) => updateSetting("turnSeconds", Number(event.target.value))}
        style={{ ...fieldStyle, marginBottom: 12 }}
      >
        <option value={15}>15 seconds</option>
        <option value={30}>30 seconds</option>
        <option value={45}>45 seconds</option>
        <option value={60}>60 seconds</option>
      </select>

      <label style={labelStyle}>Tie on a Least Count declaration</label>
      <select
        value={settings.tieBehavior}
        onChange={(event) => updateSetting("tieBehavior", event.target.value)}
        style={fieldStyle}
      >
        <option value="declarer-loses">Declarer loses</option>
        <option value="declarer-wins">Declarer wins</option>
      </select>
    </div>
  );
}
