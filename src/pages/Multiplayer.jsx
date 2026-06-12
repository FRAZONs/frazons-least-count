import { useState } from "react";
import { doc, runTransaction, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import generateRoomCode from "../utils/generateRoomCode";
import RoomSettings from "../components/RoomSettings";
import { useToast } from "../hooks/useToast";
import { DEFAULT_ONLINE_SETTINGS, playerKey } from "../utils/onlineGame";

const inputStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "none",
  fontSize: 18,
  boxSizing: "border-box"
};

const buttonStyle = (background) => ({
  width: "100%",
  padding: 18,
  borderRadius: 20,
  border: "none",
  background,
  color: "white",
  fontSize: 18,
  fontWeight: "bold",
  marginTop: 15,
  cursor: "pointer"
});

export default function Multiplayer({ setScreen, setRoom }) {
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [roomSettings, setRoomSettings] = useState(DEFAULT_ONLINE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const { error, success } = useToast();

  const createRoom = async () => {
    const name = playerName.trim();
    if (!name) {
      error("Enter your name first");
      return;
    }

    setLoading(true);
    try {
      const code = generateRoomCode();
      const key = playerKey(name);
      const roomData = {
        roomCode: code,
        host: { name },
        players: [{ name }],
        status: "waiting",
        createdAt: Date.now(),
        settings: roomSettings,
        totals: { [key]: 0 },
        eliminated: {},
        history: [],
        playerStatus: {
          [key]: { status: "ready", lastHeartbeat: Date.now() }
        }
      };

      await setDoc(doc(db, "rooms", code), roomData);
      localStorage.setItem("playerName", key);
      setRoom(roomData);
      success(`Room created: ${code}`);
      setScreen("lobby");
    } catch (err) {
      error("Failed to create room");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async () => {
    const name = playerName.trim();
    const code = roomCode.trim().toUpperCase();
    if (!name || !code) {
      error("Enter your name and room code");
      return;
    }

    setLoading(true);
    try {
      const roomRef = doc(db, "rooms", code);
      const key = playerKey(name);
      const joinedRoom = await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) throw new Error("ROOM_NOT_FOUND");

        const data = snapshot.data();
        if (data.status !== "waiting") throw new Error("GAME_IN_PROGRESS");

        const players = data.players || [];
        const alreadyJoined = players.some((player) => playerKey(player.name) === key);
        if (!alreadyJoined && players.length >= (data.settings?.maxPlayers || 6)) {
          throw new Error("ROOM_FULL");
        }

        const nextPlayers = alreadyJoined ? players : [...players, { name }];
        transaction.update(roomRef, {
          players: nextPlayers,
          [`playerStatus.${key}`]: { status: "waiting", lastHeartbeat: Date.now() },
          [`totals.${key}`]: data.totals?.[key] || 0
        });
        return { ...data, players: nextPlayers };
      });

      localStorage.setItem("playerName", key);
      setRoom(joinedRoom);
      success(`Joined room: ${code}`);
      setScreen("lobby");
    } catch (err) {
      const messages = {
        ROOM_NOT_FOUND: "Room not found",
        ROOM_FULL: "Room is full",
        GAME_IN_PROGRESS: "This game has already started"
      };
      error(messages[err.message] || "Failed to join room");
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
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.15)"
        }}
      >
        <h1 style={{ fontSize: 36, marginTop: 0 }}>Online Multiplayer</h1>
        <p style={{ color: "#00e5ff" }}>Create a room and play with friends</p>

        <input
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
          placeholder="Your name"
          maxLength={24}
          style={inputStyle}
        />

        {showSettings && (
          <div style={{ marginTop: 16 }}>
            <RoomSettings onSettingsChange={setRoomSettings} />
          </div>
        )}

        <button
          onClick={() => setShowSettings((visible) => !visible)}
          style={buttonStyle("transparent")}
        >
          {showSettings ? "Hide Settings" : "Customize Room"}
        </button>

        <button onClick={createRoom} disabled={loading} style={buttonStyle("#6c5ce7")}>
          {loading ? "Working..." : "Create Room"}
        </button>

        <div style={{ margin: "20px 0", color: "#aaa" }}>OR</div>

        <input
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
          placeholder="Room code"
          maxLength={8}
          style={{ ...inputStyle, textAlign: "center" }}
        />

        <button onClick={joinRoom} disabled={loading} style={buttonStyle("#00b894")}>
          Join Room
        </button>
        <button onClick={() => setScreen("home")} style={buttonStyle("#444")}>
          Back
        </button>
      </div>
    </div>
  );
}
