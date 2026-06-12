import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc } from "firebase/firestore";
import generateRoomCode from "../utils/generateRoomCode";
import { STORAGE_KEYS, BUTTON_STYLES, HOME_PAGE_STYLE } from "../constants";
import { useToast } from "../hooks/useToast";

export default function Home({ setScreen }) {
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const hasSave = localStorage.getItem(STORAGE_KEYS.players);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.players);
    localStorage.removeItem(STORAGE_KEYS.history);
    localStorage.removeItem(STORAGE_KEYS.round);
  };

  const startNewGame = () => {
    clearStorage();
    setScreen("game");
  };

  const clearMatch = () => {
    clearStorage();
    window.location.reload();
  };

  const createRoom = async () => {
    setLoading(true);
    try {
      const code = generateRoomCode();
      await setDoc(doc(db, "rooms", code), {
        createdAt: Date.now(),
        players: [],
        status: "waiting"
      });
      success(`✅ Room Created: ${code}`);
      setTimeout(() => setScreen("multiplayer"), 1500);
    } catch (err) {
      error("❌ Failed to create room");
      console.error("Create room error:", err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim()) {
      error("❌ Enter a room code");
      return;
    }
    setLoading(true);
    try {
      const roomRef = doc(db, "rooms", roomCode);
      const roomSnap = await getDoc(roomRef);
      if (roomSnap.exists()) {
        success(`✅ Joined Room: ${roomCode}`);
        setTimeout(() => setScreen("multiplayer"), 1500);
      } else {
        error("❌ Room not found");
      }
    } catch (err) {
      error("❌ Failed to join room");
      console.error("Join room error:", err);
    } finally {
      setLoading(false);
    }
  };

  const buttonStyle = (colorVariant) => ({
    ...BUTTON_STYLES.base,
    ...BUTTON_STYLES[colorVariant],
    opacity: loading ? 0.6 : 1,
    pointerEvents: loading ? "none" : "auto"
  });

  return (
    <div style={HOME_PAGE_STYLE.container}>
      <div style={HOME_PAGE_STYLE.wrapper}>
        <img src="/new-icon-512.png" alt="Frazon's Logo" style={HOME_PAGE_STYLE.logo} />
        <h1 style={HOME_PAGE_STYLE.title}>FRAZON'S</h1>
        <div style={HOME_PAGE_STYLE.subtitle}>LEAST COUNT</div>
        <p style={HOME_PAGE_STYLE.description}>ONLINE CARD BATTLES</p>

        {hasSave && (
          <button onClick={() => setScreen("game")} style={buttonStyle("cyan")}>
            🎮 Continue Match
          </button>
        )}

        <button onClick={startNewGame} style={buttonStyle("pink")}>
          ✨ Start New Match
        </button>

        <button onClick={clearMatch} style={buttonStyle("red")}>
          🗑 Clear Match
        </button>

        <button onClick={() => setScreen("multiplayer")} style={buttonStyle("purple")}>
          ☁️ Online Multiplayer
        </button>

        <button onClick={() => setScreen("leaderboard")} style={buttonStyle("cyan")}>
          🏆 Leaderboard
        </button>

        <div style={{ marginTop: 20, padding: "15px", background: "rgba(108,92,231,0.1)", borderRadius: 10 }}>
          <input
            type="text"
            placeholder="Enter room code..."
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            style={{
              width: "100%",
              padding: 12,
              marginBottom: 10,
              borderRadius: 8,
              border: "1px solid #6c5ce7",
              background: "rgba(108,92,231,0.2)",
              color: "white",
              fontSize: 14,
              boxSizing: "border-box"
            }}
          />
          <button onClick={joinRoom} style={{ ...buttonStyle("purple"), marginTop: 0 }}>
            🔓 Join Room
          </button>
          <button onClick={createRoom} style={{ ...buttonStyle("purple"), marginTop: 10 }}>
            🔐 Create Room
          </button>
        </div>
      </div>
    </div>
  );
}