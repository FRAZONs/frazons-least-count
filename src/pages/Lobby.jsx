import { useEffect, useMemo, useState, useRef } from "react";
import { doc, onSnapshot, runTransaction, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { createRoundState, getSettings, playerKey } from "../utils/onlineGame";
import { useToast } from "../hooks/useToast";
import { getRankTier } from "../utils/playerStats";

export default function Lobby({ setScreen, room, setRoom }) {
  const [loading, setLoading] = useState(false);
  const playerName = localStorage.getItem("playerName") || "";
  const { info, warning } = useToast();

  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [room?.lobbyChats]);

  const sendLobbyMessage = async (e) => {
    if (e) e.preventDefault();
    const msg = chatInput.trim();
    if (!msg) return;

    try {
      const roomRef = doc(db, "rooms", room.roomCode);
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) return;
        const currentData = snapshot.data();
        const currentChats = currentData.lobbyChats || [];
        const displaySender = room?.players?.find(p => playerKey(p.name) === playerName)?.name || playerName;
        const nextChats = [
          ...currentChats,
          {
            sender: displaySender,
            senderKey: playerName,
            message: msg,
            timestamp: Date.now()
          }
        ];
        transaction.update(roomRef, { lobbyChats: nextChats });
      });
      setChatInput("");
    } catch (err) {
      console.error("Failed to send lobby message:", err);
    }
  };

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
      <div style={{ width: "100%", maxWidth: 540, textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
        <h1 style={{ textShadow: room?.isRanked ? "0 0 15px rgba(255, 0, 127, 0.4)" : "0 0 10px rgba(192, 132, 252, 0.3)" }}>
          {room?.isRanked ? "⚔️ Ranked Arena Lobby" : "Casual Room Lobby"}
        </h1>

        {room?.isRanked && (
          <div
            style={{
              background: "linear-gradient(90deg, rgba(255, 0, 127, 0.1), rgba(121, 40, 202, 0.1))",
              border: "1px solid rgba(255, 0, 127, 0.3)",
              borderRadius: 14,
              padding: 12,
              color: "#ff007f",
              fontWeight: "bold",
              fontSize: 14,
              marginBottom: 16,
              boxShadow: "0 0 10px rgba(255, 0, 127, 0.1)"
            }}
          >
            ⚔️ RANKED DUEL Matchmaking (Max 4 Players)
          </div>
        )}

        <div
          style={{
            padding: 24,
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 15px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ color: "#aaa", fontSize: 13, fontWeight: "bold", letterSpacing: 1 }}>ROOM DUEL CODE</div>
          <div style={{ fontSize: 44, fontWeight: "black", color: room?.isRanked ? "#ff007f" : "#00e5ff", letterSpacing: 2, margin: "8px 0" }}>
            {room?.roomCode}
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room?.roomCode)}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
              background: "rgba(255,255,255,0.06)",
              color: "white",
              fontSize: 12,
              fontWeight: "bold",
              cursor: "pointer"
            }}
          >
            📋 Copy Code
          </button>
        </div>

        <div
          style={{
            marginTop: 20,
            padding: 20,
            borderRadius: 18,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)"
          }}
        >
          {(room?.players || []).map((player) => {
            const key = playerKey(player.name);
            const ready = room?.playerStatus?.[key]?.status === "ready";
            const rankInfo = getRankTier(player.rp || 0);

            return (
              <div
                key={key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: 12,
                  marginBottom: 8,
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.04)"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontWeight: "bold" }}>
                    {playerKey(room?.host?.name) === key ? "👑 " : ""}{player.name}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${rankInfo.color}44`,
                      padding: "2px 6px",
                      borderRadius: 6,
                      color: rankInfo.color,
                      textShadow: `0 0 5px ${rankInfo.color}33`
                    }}
                  >
                    {rankInfo.levelName}
                  </span>
                </div>
                <span style={{ color: ready ? "#00ff88" : "#fbbf24", fontWeight: "bold", fontSize: 13 }}>
                  {ready ? "Ready" : "Waiting"}
                </span>
              </div>
            );
          })}
          <div style={{ color: "#aaa", fontSize: 13, marginTop: 8, fontWeight: "bold" }}>
            Ready {readyCount}/{room?.players?.length || 0}
          </div>
        </div>

        <div style={{ marginTop: 16, color: "#c4b5fd", fontSize: 12, fontWeight: "bold" }}>
          {room?.isRanked ? (
            <span style={{ color: "#ff007f" }}>🔒 Ranked Duel Parameters Locked (Standard Deck & Speed Turn timer)</span>
          ) : (
            `Limit ${settings.maxScore} | Penalty ${settings.declarationPenalty} | Cards ${settings.startingCards} | Turn ${settings.turnSeconds}s`
          )}
        </div>

        {/* Lobby Chat Room */}
        <div
          style={{
            marginTop: 20,
            padding: 16,
            borderRadius: 18,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.1)",
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 12
          }}
        >
          <div style={{ fontWeight: "bold", fontSize: 14, color: "#00e5ff", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 8, display: "flex", justifyContext: "space-between", justifyContent: "space-between" }}>
            <span>💬 Lobby Chat</span>
            <span style={{ fontSize: 11, color: "#aaa" }}>{(room?.lobbyChats || []).length} messages</span>
          </div>

          <div
            style={{
              maxHeight: 140,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 8,
              paddingRight: 4
            }}
          >
            {(room?.lobbyChats || []).length === 0 ? (
              <div style={{ color: "#666", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "20px 0" }}>
                No messages yet. Say hello!
              </div>
            ) : (
              (room.lobbyChats).map((msg, i) => {
                const isMe = msg.senderKey === playerName;
                return (
                  <div
                    key={`msg-${i}`}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignSelf: isMe ? "flex-end" : "flex-start",
                      maxWidth: "80%"
                    }}
                  >
                    <div style={{ fontSize: 10, color: isMe ? "#ff00c8" : "#00e5ff", marginBottom: 2, paddingLeft: isMe ? 0 : 4, alignSelf: isMe ? "flex-end" : "flex-start" }}>
                      {msg.sender}
                    </div>
                    <div
                      style={{
                        padding: "8px 12px",
                        borderRadius: 14,
                        background: isMe ? "rgba(255, 0, 200, 0.15)" : "rgba(255,255,255,0.08)",
                        border: isMe ? "1px solid rgba(255, 0, 200, 0.3)" : "1px solid rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: 13,
                        wordBreak: "break-word"
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          <form onSubmit={sendLobbyMessage} style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <input
              type="text"
              placeholder="Type message..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              style={{
                flex: 1,
                padding: "8px 14px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "white",
                fontSize: 13
              }}
            />
            <button
              type="submit"
              style={{
                padding: "8px 16px",
                borderRadius: 10,
                background: "#00e5ff",
                color: "black",
                border: "none",
                fontWeight: "bold",
                fontSize: 13,
                cursor: "pointer"
              }}
            >
              Send
            </button>
          </form>
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
