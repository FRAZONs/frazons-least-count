import { useState } from "react";
import { db } from "../firebase";
import { doc, setDoc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import generateRoomCode from "../utils/generateRoomCode";
import RoomSettings from "../components/RoomSettings";
import { useToast } from "../hooks/useToast";

export default function Multiplayer({ setScreen, setRoom }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [roomSettings, setRoomSettings] = useState({ maxScore: 200, maxPlayers: 4, roundLimit: null });
  const [loading, setLoading] = useState(false);
  const { error, success } = useToast();

  const createRoom = async () => {
    if (!playerName.trim()) {
      error("❌ Enter your name first");
      return;
    }

    setLoading(true);
    try {
      const code = generateRoomCode();
      await setDoc(doc(db, "rooms", code), {
        roomCode: code,
        host: { name: playerName },
        players: [{ name: playerName }],
        status: "waiting",
        createdAt: Date.now(),
        settings: roomSettings,
        playerStatus: {
          [playerName]: { status: "ready", lastHeartbeat: Date.now() }
        }
      });

      localStorage.setItem("playerName", playerName.toLowerCase());
      setRoom({ roomCode: code, host: playerName });
      success(`✅ Room Created: ${code}`);
      setTimeout(() => setScreen("lobby"), 1000);
    } catch (err) {
      error("❌ Failed to create room");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    if (!roomCode.trim() || !playerName.trim()) {
      error("❌ Enter name and room code");
      return;
    }

    setLoading(true);
    try {
      const roomRef = doc(db, "rooms", roomCode);
      const roomSnap = await getDoc(roomRef);

      if (roomSnap.exists()) {
        const roomData = roomSnap.data();
        const playerCount = roomData.players?.length || 0;
        const maxPlayers = roomData.settings?.maxPlayers || 6;

        if (playerCount >= maxPlayers) {
          error("❌ Room is full");
          setLoading(false);
          return;
        }

        await updateDoc(roomRef, {
          players: arrayUnion({ name: playerName }),
          [`playerStatus.${playerName}`]: { status: "waiting", lastHeartbeat: Date.now() }
        });

        localStorage.setItem("playerName", playerName.toLowerCase());
        setRoom({ roomCode, host: roomData.host?.name || "Host" });
        success(`✅ Joined Room: ${roomCode}`);
        setTimeout(() => setScreen("lobby"), 1000);
      } else {
        error("❌ Room not found");
      }
    } catch (err) {
      error("❌ Failed to join room");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        color: "white",
        padding: 20
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          padding: 30,
          borderRadius: 24,
          backdropFilter: "blur(20px)",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)",
          boxShadow: "0 0 30px rgba(0,229,255,0.15)"
        }}
      >
        <div style={{ marginBottom: 30 }}>
          <h1 style={{ fontSize: 36, margin: 0, color: "white" }}>🌐 Multiplayer</h1>
          <p style={{ color: "#00e5ff", marginTop: 10 }}>Create a room and play with friends</p>
        </div>

        <input
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          placeholder="Your Name"
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 18,
            border: "none",
            fontSize: 18,
            boxSizing: "border-box"
          }}
        />

        {showSettings && (
          <div style={{ marginTop: 16 }}>
            <RoomSettings onSettingsChange={setRoomSettings} />
          </div>
        )}

        <button
          onClick={() => setShowSettings(!showSettings)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 18,
            border: "1px solid #6c5ce7",
            background: "transparent",
            color: "#6c5ce7",
            fontSize: 14,
            fontWeight: "bold",
            marginTop: 12,
            cursor: "pointer"
          }}
        >
          {showSettings ? "▼ Hide Settings" : "⚙️ Customize Room"}
        </button>

        <button
          onClick={createRoom}
          disabled={loading}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 20,
            border: "none",
            background: loading ? "#666" : "linear-gradient(90deg,#6c5ce7,#8e7dff)",
            color: "white",
            fontSize: 18,
            fontWeight: "bold",
            marginTop: 15,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          ☁️ Create Room
        </button>

        <div style={{ margin: "20px 0", color: "#aaa" }}>───── OR ─────</div>

        <input
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="Room Code"
          style={{
            width: "100%",
            padding: 16,
            borderRadius: 18,
            border: "none",
            textAlign: "center",
            fontSize: 18,
            boxSizing: "border-box"
          }}
        />

        <button
          onClick={joinRoom}
          disabled={loading}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 20,
            border: "none",
            background: loading ? "#666" : "linear-gradient(90deg,#00b894,#00d2a8)",
            color: "white",
            fontSize: 18,
            fontWeight: "bold",
            marginTop: 15,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1
          }}
        >
          🚪 Join Room
        </button>

        <button
          onClick={() => setScreen("home")}
          style={{
            width: "100%",
            padding: 18,
            borderRadius: 20,
            border: "none",
            background: "#444",
            color: "white",
            fontSize: 18,
            marginTop: 15,
            cursor: "pointer"
          }}
        >
          ⬅ Back
        </button>
      </div>
    </div>
  );
}
