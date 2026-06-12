import { useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { createRoundState, getSettings, playerKey } from "../utils/onlineGame";
import { useToast } from "../hooks/useToast";

export default function Lobby({ setScreen, room, setRoom }) {
  const [loading, setLoading] = useState(false);
  const playerName = localStorage.getItem("playerName") || "";
  const { info, warning } = useToast();

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return onSnapshot(doc(db, "rooms", room.roomCode), (snapshot) => {
      if (!snapshot.exists()) {
        setScreen("home");
        return;
      }
      const data = snapshot.data();
      setRoom(data);
      if (data.status !== "waiting") setScreen("online-game");
    });
  }, [room?.roomCode, setRoom, setScreen]);

  const settings = getSettings(room?.settings);
  const isHost = playerName === playerKey(room?.host?.name);
  const myStatus = room?.playerStatus?.[playerName]?.status || "waiting";
  const readyCount = useMemo(
    () =>
      (room?.players || []).filter(
        (player) => room?.playerStatus?.[playerKey(player.name)]?.status === "ready"
      ).length,
    [room?.playerStatus, room?.players]
  );

  const toggleReady = async () => {
    const status = myStatus === "ready" ? "waiting" : "ready";
    try {
      await updateDoc(doc(db, "rooms", room.roomCode), {
        [`playerStatus.${playerName}`]: { status, lastHeartbeat: Date.now() }
      });
      info(`You are ${status}`);
    } catch (err) {
      warning("Failed to update ready status");
      console.error(err);
    }
  };

  const startGame = async () => {
    if (!isHost) return;
    setLoading(true);
    try {
      const roomRef = doc(db, "rooms", room.roomCode);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        const currentRoom = snapshot.data();
        const players = currentRoom.players || [];
        const everyoneReady = players.every(
          (player) =>
            currentRoom.playerStatus?.[playerKey(player.name)]?.status === "ready"
        );

        if (players.length < 2) throw new Error("NEED_PLAYERS");
        if (!everyoneReady) throw new Error("NOT_READY");
        if (currentRoom.status !== "waiting") throw new Error("ALREADY_STARTED");

        transaction.update(roomRef, {
          totals: Object.fromEntries(
            players.map((player) => [playerKey(player.name), 0])
          ),
          eliminated: {},
          history: [],
          timeoutCounts: {},
          ...createRoundState(currentRoom, 1)
        });
      });
      info("Game started");
    } catch (err) {
      const messages = {
        NEED_PLAYERS: "At least two players are required",
        NOT_READY: "All players must be ready",
        ALREADY_STARTED: "The game has already started"
      };
      warning(messages[err.message] || "Failed to start game");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const leaveRoom = async () => {
    try {
      const roomRef = doc(db, "rooms", room.roomCode);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) return;
        const data = snapshot.data();
        const players = (data.players || []).filter(
          (player) => playerKey(player.name) !== playerName
        );
        const updates = { players };
        if (playerKey(data.host?.name) === playerName && players.length) {
          updates.host = players[0];
        }
        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error(err);
    }
    setRoom(null);
    setScreen("home");
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        color: "white",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}
    >
      <div style={{ width: "100%", maxWidth: 540, textAlign: "center" }}>
        <h1>Room Lobby</h1>
        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)"
          }}
        >
          <div style={{ color: "#aaa", fontSize: 13 }}>ROOM CODE</div>
          <div style={{ fontSize: 52, fontWeight: "bold", color: "#c084fc" }}>
            {room?.roomCode}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room?.roomCode)}
            style={{ padding: 8, borderRadius: 8, border: 0, cursor: "pointer" }}
          >
            Copy code
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.08)"
          }}
        >
          {(room?.players || []).map((player) => {
            const key = playerKey(player.name);
            const ready = room?.playerStatus?.[key]?.status === "ready";
            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.06)"
                }}
              >
                <span>{playerKey(room?.host?.name) === key ? "Host: " : ""}{player.name}</span>
                <span style={{ color: ready ? "#00ff88" : "#fbbf24" }}>
                  {ready ? "Ready" : "Waiting"}
                </span>
              </div>
            );
          })}
          <div style={{ color: "#aaa", fontSize: 13 }}>
            Ready {readyCount}/{room?.players?.length || 0}
          </div>
        </div>

        <div style={{ marginTop: 16, color: "#c4b5fd", fontSize: 13 }}>
          Limit {settings.maxScore} | Penalty {settings.declarationPenalty} |
          Cards {settings.startingCards} | Turn {settings.turnSeconds}s
        </div>

        {!isHost && (
          <button onClick={toggleReady} style={primaryButton("#00b894")}>
            {myStatus === "ready" ? "Mark Not Ready" : "Ready Up"}
          </button>
        )}
        {isHost && (
          <button onClick={startGame} disabled={loading} style={primaryButton("#ff00c8")}>
            {loading ? "Starting..." : "Start Game"}
          </button>
        )}
        <button onClick={leaveRoom} style={primaryButton("#444")}>Leave Room</button>
      </div>
    </div>
  );
}

const primaryButton = (background) => ({
  width: "100%",
  padding: 16,
  marginTop: 16,
  border: 0,
  borderRadius: 14,
  background,
  color: "white",
  fontWeight: "bold",
  cursor: "pointer"
});
