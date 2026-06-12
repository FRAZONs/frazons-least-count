import { useState, useEffect } from "react";
import clickSound from "../audio/click.mp3";
import winSound from "../audio/win.mp3";
import Confetti from "react-confetti";
import PlayerCard from "../components/PlayerCard";
import DealerBanner from "../components/DealerBanner";
import ScoreTable from "../components/ScoreTable";
import { STORAGE_KEYS } from "../constants";
import { useToast } from "../hooks/useToast";
import { updateLocalStats } from "../utils/playerStats";
import WinnerPodium from "../components/WinnerPodium";

const DEALER_QUOTES = [
  "🃏 Somebody call an ambulance.",
  "🔥 That round was criminal.",
  "👑 Main character energy detected.",
  "💀 Bro is collecting points like Pokémon.",
  "⚡ The dealer is disappointed.",
  "🎴 Fate has chosen violence."
];

const AVATARS = ["😈", "🤖", "🦊", "🐸", "🦅", "🎭", "👑"];

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
  const [scoreLimit, setScoreLimit] = useState(() => {
    const saved = localStorage.getItem("frazons-score-limit");
    return saved ? Number(saved) : 200;
  });
  const [declarationLimit, setDeclarationLimit] = useState(() => {
    const saved = localStorage.getItem("frazons-declaration-limit");
    if (saved) return Number(saved);
    const savedScoreLimit = Number(localStorage.getItem("frazons-score-limit")) || 200;
    return savedScoreLimit === 100 ? 10 : savedScoreLimit === 200 ? 20 : Math.floor(savedScoreLimit / 10);
  });
  const { warning } = useToast();

  const clickAudio = new Audio(clickSound);
  const winAudio = new Audio(winSound);

  useEffect(() => {
    localStorage.setItem("frazons-score-limit", scoreLimit.toString());
  }, [scoreLimit]);

  useEffect(() => {
    localStorage.setItem("frazons-declaration-limit", declarationLimit.toString());
  }, [declarationLimit]);

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
        eliminated: newTotal > scoreLimit
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

    // Local stats round track
    updateLocalStats({ totalRoundsPlayed: 1 });
    const primaryName = localStorage.getItem("playerName") || "";
    if (primaryName) {
      const myPlayer = players.find(p => p.name.toLowerCase() === primaryName.toLowerCase());
      if (myPlayer && !myPlayer.eliminated) {
        const myRoundScore = Number(scores[myPlayer.id]) || 0;
        updateLocalStats({ totalPointsAccumulated: myRoundScore });
      }
    }

    if (activePlayers.length === 1) {
      winAudio.play();
      setWinner(activePlayers[0]);

      // Local stats match complete track
      updateLocalStats({ offlineMatchesPlayed: 1 });
      if (primaryName && activePlayers[0].name.toLowerCase() === primaryName.toLowerCase()) {
        updateLocalStats({ offlineMatchesWon: 1 });
      }
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

  const undoLastRound = () => {
    clickAudio.play();
    if (history.length === 0) return;
    
    const lastRound = history[history.length - 1];
    const prevHistory = history.slice(0, -1);
    
    const updatedPlayers = players.map((player, idx) => {
      const roundScore = Number(lastRound.scores[idx]) || 0;
      const newTotal = Math.max(0, player.total - roundScore);
      return {
        ...player,
        total: newTotal,
        eliminated: newTotal > scoreLimit,
        leading: false
      };
    });
    
    const activePlayers = updatedPlayers.filter((p) => !p.eliminated);
    if (activePlayers.length > 0) {
      const lowestScore = Math.min(...activePlayers.map((p) => p.total));
      updatedPlayers.forEach((p) => {
        p.leading = !p.eliminated && p.total === lowestScore;
      });
    }
    
    setPlayers(updatedPlayers);
    setHistory(prevHistory);
    setRound(Math.max(1, round - 1));
    setWinner(null);
  };

  const resetMatch = () => {
    clickAudio.play();
    if (!window.confirm("Are you sure you want to reset the current match? This will clear all scores but keep the player list.")) return;
    
    const resetPlayers = players.map(p => ({
      ...p,
      total: 0,
      leading: false,
      eliminated: false
    }));
    
    setPlayers(resetPlayers);
    setHistory([]);
    setRound(1);
    setWinner(null);
    setScores({});
  };

  const activePlayers = players.filter((p) => !p.eliminated);
  const dealer = activePlayers.length > 0 ? activePlayers[(round - 1) % activePlayers.length].name : "No Players Yet";
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

      {/* Local Game Customizer Settings */}
      <div style={{ background: "#1d1d1d", padding: 16, borderRadius: 20, marginBottom: 25, border: "1px solid rgba(255,255,255,0.08)" }}>
        <h3 style={{ marginTop: 0, marginBottom: 12, color: "#00e5ff" }}>⚙️ Game Settings</h3>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <label style={{ fontSize: 15, color: "#aaa" }}>Max Score Limit:</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number"
              value={scoreLimit}
              onChange={(e) => {
                const newLimit = Math.max(10, Number(e.target.value) || 200);
                setScoreLimit(newLimit);
                const newDecl = newLimit === 100 ? 10 : newLimit === 200 ? 20 : Math.floor(newLimit / 10);
                setDeclarationLimit(newDecl);
              }}
              style={{
                width: 90,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: "rgba(0,0,0,0.3)",
                color: "white",
                fontSize: 15,
                fontWeight: "bold",
                textAlign: "center"
              }}
            />
            <span style={{ fontSize: 14, color: "#aaa" }}>pts</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
          <label style={{ fontSize: 15, color: "#aaa" }}>Declaration Limit:</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="number"
              value={declarationLimit}
              onChange={(e) => setDeclarationLimit(Math.max(1, Number(e.target.value) || 20))}
              style={{
                width: 90,
                padding: "8px 12px",
                borderRadius: 10,
                border: "none",
                background: "rgba(0,0,0,0.3)",
                color: "white",
                fontSize: 15,
                fontWeight: "bold",
                textAlign: "center"
              }}
            />
            <span style={{ fontSize: 14, color: "#aaa" }}>pts</span>
          </div>
        </div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 25 }}>
          <button
            onClick={submitRound}
            className="submit-round-btn"
            style={{
              width: "100%",
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
          
          <div style={{ display: "flex", gap: 12 }}>
            <button
              onClick={undoLastRound}
              disabled={history.length === 0}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 14,
                border: "none",
                background: history.length === 0 ? "#444" : "rgba(255, 255, 255, 0.08)",
                color: history.length === 0 ? "#777" : "white",
                fontWeight: "bold",
                cursor: history.length === 0 ? "not-allowed" : "pointer",
                fontSize: 14
              }}
            >
              ↩️ Undo Last Round
            </button>
            <button
              onClick={resetMatch}
              style={{
                flex: 1,
                padding: "12px 16px",
                borderRadius: 14,
                border: "none",
                background: "rgba(239, 68, 68, 0.15)",
                color: "#ef4444",
                fontWeight: "bold",
                cursor: "pointer",
                fontSize: 14
              }}
            >
              🔄 Reset Match
            </button>
          </div>
        </div>
      )}

      <ScoreTable history={history} players={players} scoreLimit={scoreLimit} declarationLimit={declarationLimit} />

      {winner && (
        <WinnerPodium
          players={players}
          onRestart={() => {
            Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
            window.location.reload();
          }}
          isHost={true}
        />
      )}
    </div>
  );
}