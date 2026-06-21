import { useState } from "react";
import { doc, runTransaction, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import generateRoomCode from "../utils/generateRoomCode";
import RoomSettings from "../components/RoomSettings";
import { useToast } from "../hooks/useToast";
import { DEFAULT_ONLINE_SETTINGS, playerKey } from "../utils/onlineGame";
import { getRankTier } from "../utils/playerStats";

const inputStyle = {
  width: "100%",
  padding: 16,
  borderRadius: 18,
  border: "none",
  fontSize: 16,
  boxSizing: "border-box",
  background: "rgba(255, 255, 255, 0.08)",
  color: "white",
  outline: "none",
  borderBottom: "2px solid rgba(0, 229, 255, 0.2)"
};

const buttonStyle = (background) => ({
  width: "100%",
  padding: 16,
  borderRadius: 16,
  border: "none",
  background,
  color: "white",
  fontSize: 16,
  fontWeight: "bold",
  marginTop: 15,
  cursor: "pointer",
  boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
  transition: "all 0.2s"
});

const tabStyle = (active) => ({
  flex: 1,
  padding: "12px 10px",
  background: active ? "rgba(0, 229, 255, 0.15)" : "transparent",
  border: active ? "1px solid rgba(0, 229, 255, 0.35)" : "1px solid transparent",
  color: active ? "#00e5ff" : "#aaa",
  fontWeight: "bold",
  fontSize: 14,
  borderRadius: 12,
  cursor: "pointer",
  transition: "all 0.2s"
});

export default function Multiplayer({ setScreen, setRoom, isGuest, onExitGuestMode }) {
  const [activeTab, setActiveTab] = useState("casual"); // "casual" or "ranked"
  const [playerName, setPlayerName] = useState(() => {
    try {
      const saved = localStorage.getItem("playerName");
      if (saved) {
        return saved.split("_")[0];
      }
    } catch {}
    return "";
  });
  const [roomCode, setRoomCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [roomSettings, setRoomSettings] = useState(DEFAULT_ONLINE_SETTINGS);
  const [loading, setLoading] = useState(false);
  const { error, success } = useToast();

  const getRankDetails = () => {
    const currentRP = Number(localStorage.getItem("frazons-ranked-points")) || 0;
    const tier = getRankTier(currentRP);
    return { rp: currentRP, rankName: tier.name };
  };

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
      const { rp, rankName } = getRankDetails();

      const roomData = {
        roomCode: code,
        host: { name },
        players: [{ name, rp, rankName }],
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
      const { rp, rankName } = getRankDetails();

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

        const nextPlayers = alreadyJoined ? players : [...players, { name, rp, rankName }];
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

  const findRankedMatch = async () => {
    const name = playerName.trim();
    if (!name) {
      error("Enter your name first");
      return;
    }

    setLoading(true);
    try {
      const key = playerKey(name);
      const { rp, rankName } = getRankDetails();

      // Query for an existing open ranked room
      const roomsRef = collection(db, "rooms");
      const q = query(
        roomsRef,
        where("isRanked", "==", true),
        where("status", "==", "waiting")
      );
      const snap = await getDocs(q);

      let joinedRoomCode = null;
      let joinedRoomData = null;

      // Find first ranked room with space (< 4 players)
      const availableRooms = snap.docs
        .map((docSnap) => ({ code: docSnap.id, ...docSnap.data() }))
        .filter((r) => (r.players || []).length < 4);

      if (availableRooms.length > 0) {
        const roomToJoin = availableRooms[0];
        const roomRef = doc(db, "rooms", roomToJoin.code);

        joinedRoomData = await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(roomRef);
          if (!snapshot.exists()) throw new Error("ROOM_NOT_FOUND");

          const data = snapshot.data();
          if (data.status !== "waiting") throw new Error("GAME_IN_PROGRESS");

          const players = data.players || [];
          const alreadyJoined = players.some((player) => playerKey(player.name) === key);
          if (!alreadyJoined && players.length >= 4) {
            throw new Error("ROOM_FULL");
          }

          const nextPlayers = alreadyJoined ? players : [...players, { name, rp, rankName }];
          transaction.update(roomRef, {
            players: nextPlayers,
            [`playerStatus.${key}`]: { status: "waiting", lastHeartbeat: Date.now() },
            [`totals.${key}`]: data.totals?.[key] || 0
          });
          return { ...data, players: nextPlayers };
        });
        joinedRoomCode = roomToJoin.code;
      } else {
        // Create a new ranked room
        const code = generateRoomCode();
        const roomData = {
          roomCode: code,
          isRanked: true,
          host: { name },
          players: [{ name, rp, rankName }],
          status: "waiting",
          createdAt: Date.now(),
          settings: {
            maxScore: 200,
            maxPlayers: 4,
            roundLimit: null,
            declarationPenalty: 40,
            startingCards: 7,
            turnSeconds: 20,
            tieBehavior: "declarer-loses",
            declarationThreshold: 20
          },
          totals: { [key]: 0 },
          eliminated: {},
          history: [],
          playerStatus: {
            [key]: { status: "ready", lastHeartbeat: Date.now() }
          }
        };

        await setDoc(doc(db, "rooms", code), roomData);
        joinedRoomData = roomData;
        joinedRoomCode = code;
      }

      localStorage.setItem("playerName", key);
      setRoom(joinedRoomData);
      success(`Joined Ranked Queue: ${joinedRoomCode}`);
      setScreen("lobby");
    } catch (err) {
      error("Matchmaking failed. Try again!");
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
        padding: 20,
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          textAlign: "center",
          padding: 24,
          borderRadius: 24,
          background: "rgba(20, 10, 35, 0.7)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)"
        }}
      >
        <h1 style={{ fontSize: 32, marginTop: 0, textShadow: "0 0 15px rgba(0,229,255,0.3)" }}>Online Arena</h1>
        <p style={{ color: "#00e5ff", fontSize: 14, marginTop: -8, marginBottom: 20 }}>Dueling against world-wide players</p>

        {/* Tab Selection */}
        <div style={{ display: "flex", gap: 10, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 14, marginBottom: 20 }}>
          <button onClick={() => setActiveTab("casual")} style={tabStyle(activeTab === "casual")}>
            🎮 Casual Room
          </button>
          <button onClick={() => setActiveTab("ranked")} style={tabStyle(activeTab === "ranked")}>
            ⚔️ Ranked Queue
          </button>
        </div>

        {/* Shared Username Input */}
        <div style={{ textAlign: "left", marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: "#aaa", fontWeight: "bold", display: "block", marginBottom: 6 }}>ENTER YOUR DUELIST NAME</label>
          <input
            value={playerName}
            onChange={(event) => setPlayerName(event.target.value)}
            placeholder="Duelist Name"
            maxLength={20}
            style={inputStyle}
          />
        </div>

        {activeTab === "casual" ? (
          <div>
            {showSettings && (
              <div style={{ marginTop: 16 }}>
                <RoomSettings onSettingsChange={setRoomSettings} />
              </div>
            )}

            <button
              onClick={() => setShowSettings((visible) => !visible)}
              style={buttonStyle("rgba(255,255,255,0.08)")}
            >
              {showSettings ? "Hide Settings" : "Customize Room"}
            </button>

            <button onClick={createRoom} disabled={loading} style={buttonStyle("linear-gradient(135deg, #6c5ce7, #8e44ad)")}>
              {loading ? "Creating..." : "Create Room"}
            </button>

            <div style={{ margin: "16px 0", color: "#aaa", fontSize: 13, fontWeight: "bold" }}>- OR JOIN BY CODE -</div>

            <input
              value={roomCode}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ROOM CODE"
              maxLength={8}
              style={{ ...inputStyle, textAlign: "center", fontSize: 20, letterSpacing: 2 }}
            />

            <button onClick={joinRoom} disabled={loading} style={buttonStyle("linear-gradient(135deg, #00b894, #00cec9)")}>
              Join Room
            </button>
          </div>
        ) : isGuest ? (
          <div style={{ padding: "30px 10px", display: "flex", flexDirection: "column", gap: 15, alignItems: "center" }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <div style={{ fontSize: 16, fontWeight: "bold", color: "#ff007f", textShadow: "0 0 10px rgba(255,0,127,0.3)" }}>
              RANKED QUEUE LOCKED
            </div>
            <p style={{ fontSize: 13, color: "#aaa", margin: 0, lineHeight: 1.5 }}>
              Ranked matchmaking requires a duelist account. Sign in to climb tiers, track stats, and save your progress!
            </p>
            <button
              onClick={onExitGuestMode}
              style={{ ...buttonStyle("linear-gradient(135deg, #ff007f, #7928ca)"), marginTop: 5 }}
            >
              Sign In to Unlock
            </button>
          </div>
        ) : (
          <div style={{ padding: "10px 0" }}>
            <div style={{
              background: "rgba(0, 229, 255, 0.04)",
              border: "1px solid rgba(0, 229, 255, 0.15)",
              borderRadius: 16,
              padding: 16,
              textAlign: "left",
              fontSize: 13,
              lineHeight: "1.5",
              color: "#ccc",
              marginBottom: 20
            }}>
              <span style={{ color: "#00e5ff", fontWeight: "bold" }}>⚔️ Ranked Rules:</span>
              <ul style={{ margin: "8px 0 0 16px", padding: 0 }}>
                <li>Standard 4-player Least Count match</li>
                <li>Turn timer is limited to 20 seconds</li>
                <li>Gain Ranked Points (RP) on victories</li>
                <li>Rank tiers from Bronze up to Ace & Joker!</li>
              </ul>
            </div>

            <button onClick={findRankedMatch} disabled={loading} style={buttonStyle("linear-gradient(135deg, #ff007f, #7928ca)")}>
              {loading ? "Searching Match..." : "⚔️ Find Ranked Duel"}
            </button>
          </div>
        )}

        <button onClick={() => setScreen("home")} style={buttonStyle("rgba(255,255,255,0.04)")}>
          Back to Main Menu
        </button>
      </div>
    </div>
  );
}
