import { useState } from "react";
import clickSound from "../audio/click.mp3";
import winSound from "../audio/win.mp3";
import Confetti from "react-confetti";
import PlayerCard from "../components/PlayerCard";
import DealerBanner from "../components/DealerBanner";
import ScoreTable from "../components/ScoreTable";
import { STORAGE_KEYS } from "../constants";
import { useToast } from "../hooks/useToast";

const DEALER_QUOTES = [
  "🃏 Somebody call an ambulance.",
  "🔥 That round was criminal.",
  "👑 Main character energy detected.",
  "💀 Bro is collecting points like Pokémon.",
  "⚡ The dealer is disappointed.",
  "🎴 Fate has chosen violence."
];

const AVATARS = ["😈", "🤖", "🦊", "🐸", "🦅", "🎭", "👑"];
const SCORE_LIMIT = 200;

const createNewPlayer = (name, avatar, color) => ({
  id: Date.now(),
  name,
  avatar,
  color,
  total: 0,
  leading: false,
  eliminated: false
});

export default function Game({ setScreen, players, setPlayers, history, setHistory, round, setRound }) {
  const [playerName, setPlayerName] = useState("");
  const [playerAvatar, setPlayerAvatar] = useState("😈");
  const [playerColor, setPlayerColor] = useState("#00e5ff");
  const [scores, setScores] = useState({});
  const [winner, setWinner] = useState(null);
  const { warning } = useToast();

  const clickAudio = new Audio(clickSound);
  const winAudio = new Audio(winSound);

  const addPlayer = () => {
    clickAudio.play();
    if (!playerName.trim()) return;
    if (players.length >= 7) return; // UI prevents this, but guard anyway

    const newPlayer = createNewPlayer(playerName, playerAvatar, playerColor);
    setPlayers([...players, newPlayer]);
    setPlayerName("");
  };

  const updateScore = (id, value) => {
    setScores({ ...scores, [id]: value });
  };

  const submitRound = () => {
    clickAudio.play();
    if (players.length === 0) return;

    const missingScores = players.some(
      (player) => !player.eliminated && (scores[player.id] === undefined || scores[player.id] === "")
    );

    if (missingScores) {
      warning("⚠️ Enter scores for all active players before submitting!");
      return;
    }

    let updatedPlayers = players.map((player) => {
      if (player.eliminated) return player;

      const roundScore = Number(scores[player.id]) || 0;
      const newTotal = player.total + roundScore;

      return {
        ...player,
        currentScore: "",
        total: newTotal,
        eliminated: newTotal > SCORE_LIMIT
      };
    });

    const activePlayers = updatedPlayers.filter((p) => !p.eliminated);

    if (activePlayers.length > 0) {
      const lowestScore = Math.min(...activePlayers.map((p) => p.total));
      updatedPlayers = updatedPlayers.map((player) => ({
        ...player,
        leading: !player.eliminated && player.total === lowestScore
      }));
    }

    const roundData = {
      round,
      scores: updatedPlayers.map((p) => scores[p.id] || 0)
    };

    setHistory([...history, roundData]);
    setPlayers(updatedPlayers);

    if (activePlayers.length === 1) {
      winAudio.play();
      setWinner(activePlayers[0]);
    }

    setScores({});

    setTimeout(() => {
      const inputs = document.querySelectorAll(".score-input");
      inputs.forEach((input) => {
        input.value = "";
      });
      if (inputs[0]) inputs[0].focus();
    }, 100);

    setRound(round + 1);
  };

  const dealer = players.length > 0 ? players[(round - 1) % players.length].name : "No Players Yet";
  const dealerQuote = DEALER_QUOTES[round % DEALER_QUOTES.length];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(180deg,#0d0d0d,#180028,#001f3f)", color: "white", fontFamily: "Arial", padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 25 }}>
        <div>
          <h1 style={{ margin: 0 }}>🎴 Least Count</h1>
          <p style={{ color: "#00e5ff" }}>Round {round}</p>
        </div>
        <button onClick={() => setScreen("home")} style={{ background: "#222", color: "white", border: "none", padding: 12, borderRadius: 14, cursor: "pointer" }}>
          🏠
        </button>
      </div>

      <DealerBanner dealer={dealer} />

      <div style={{ marginBottom: 20, color: "#c084fc", fontStyle: "italic", textAlign: "center", fontSize: 18, textShadow: "0 0 12px rgba(192,132,252,0.6)" }}>
        {dealerQuote}
      </div>

      <div style={{ background: "#1d1d1d", padding: 16, borderRadius: 20, marginBottom: 25 }}>
        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Enter player name"
          style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", fontSize: 16, marginBottom: 10 }}
        />

        <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
          <select value={playerAvatar} onChange={(e) => setPlayerAvatar(e.target.value)} style={{ flex: 1, padding: 12, borderRadius: 12, border: "none" }}>
            {AVATARS.map((avatar) => (
              <option key={avatar}>{avatar}</option>
            ))}
          </select>

          <input
            type="color"
            value={playerColor}
            onChange={(e) => setPlayerColor(e.target.value)}
            style={{ width: 70, height: 45, border: "none", borderRadius: 10 }}
          />
        </div>

        <button
          onClick={addPlayer}
          disabled={players.length >= 7}
          style={{
            width: "100%",
            padding: 14,
            borderRadius: 14,
            border: "none",
            background: players.length >= 7 ? "#999" : "#ff00c8",
            color: "white",
            fontWeight: "bold",
            cursor: players.length >= 7 ? "not-allowed" : "pointer"
          }}
        >
          ➕ Add Player {players.length}/7
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 12,
          "@media (max-width: 768px)": {
            gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
            gap: 8
          },
          "@media (max-width: 480px)": {
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 6
          }
        }}
      >
        {players.map((player) => (
          <PlayerCard key={player.id} player={player} updateScore={updateScore} />
        ))}
      </div>

      {players.length > 0 && (
        <button
          onClick={submitRound}
          className="submit-round-btn"
          style={{
            width: "100%",
            marginTop: 25,
            padding: 18,
            borderRadius: 18,
            border: "none",
            background: "#ff00c8",
            color: "white",
            fontWeight: "bold",
            fontSize: 18,
            cursor: "pointer"
          }}
        >
          🎯 Submit Round
        </button>
      )}

      <ScoreTable history={history} players={players} />

      {winner && (
        <>
          <Confetti />
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.88)",
              backdropFilter: "blur(12px)",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              zIndex: 9999,
              padding: 20
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: 700,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 30,
                padding: 30,
                backdropFilter: "blur(20px)",
                boxShadow: "0 0 40px rgba(0,229,255,0.25)",
                textAlign: "center"
              }}
            >
              <h1 style={{ fontSize: 60, marginBottom: 10, textShadow: "0 0 20px #00e5ff" }}>🏆</h1>
              <h1 style={{ marginBottom: 10 }}>
                {winner.avatar} {winner.name}
              </h1>
              <p style={{ color: "#c084fc", marginBottom: 30, fontSize: 20 }}>Wins The Match</p>

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[...players]
                  .sort((a, b) => a.total - b.total)
                  .map((player, index) => (
                    <div
                      key={player.id}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.1)",
                        borderRadius: 18,
                        padding: 18,
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                        <div style={{ fontSize: 28 }}>
                          {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "🎴"}
                        </div>
                        <div style={{ textAlign: "left" }}>
                          <h3 style={{ margin: 0 }}>
                            {player.avatar} {player.name}
                          </h3>
                          <p style={{ color: "#aaa" }}>Final Score</p>
                        </div>
                      </div>
                      <h2 style={{ margin: 0 }}>{player.total}</h2>
                    </div>
                  ))}
              </div>

              <button
                onClick={() => {
                  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
                  window.location.reload();
                }}
                style={{
                  marginTop: 30,
                  width: "100%",
                  padding: 18,
                  borderRadius: 18,
                  border: "none",
                  background: "#00e5ff",
                  color: "black",
                  fontWeight: "bold",
                  fontSize: 18,
                  cursor: "pointer"
                }}
              >
                🎮 Start New Match
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}