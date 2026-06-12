import { useState, useEffect, useRef } from "react";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Particles from "@tsparticles/react";
import { loadSlim } from "tsparticles-slim";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import Multiplayer from "./pages/Multiplayer";
import OnlineGame from "./pages/OnlineGame";
import Leaderboard from "./pages/Leaderboard";
import ambientMusic from "./audio/ambient.mp3";
import { STORAGE_KEYS } from "./constants";
import ConnectionStatus from "./components/ConnectionStatus";
import ToastContainer from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";

const safeGetJSON = (key, defaultValue) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    console.error(`Failed to parse ${key} from localStorage:`, e);
    return defaultValue;
  }
};

export default function App() {
  const particlesInit = async (main) => {
    await loadSlim(main);
  };

  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [screen, setScreen] = useState("home");
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState(() => safeGetJSON(STORAGE_KEYS.players, []));
  const [history, setHistory] = useState(() => safeGetJSON(STORAGE_KEYS.history, []));
  const [round, setRound] = useState(() => safeGetJSON(STORAGE_KEYS.round, 1));

  useEffect(() => {
    const testFirestore = async () => {
      try {
        const roomRef = doc(db, "rooms", "testroom");
        const roomSnap = await getDoc(roomRef);
        if (roomSnap.exists()) {
          console.log("Firestore Connected ✅", roomSnap.data());
        } else {
          console.log("Room Not Found ❌");
        }
      } catch (e) {
        console.error("Firestore test failed:", e);
      }
    };
    testFirestore();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.players, JSON.stringify(players));
  }, [players]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.round, JSON.stringify(round));
  }, [round]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : 0.15;
      audioRef.current.play().catch(() => {});
    }
  }, [muted]);

  useEffect(() => {
    const moveBackground = (e) => {
      const x = e.clientX / 50;
      const y = e.clientY / 50;
      document.body.style.backgroundPosition = `${x}px ${y}px`;
    };

    window.addEventListener("mousemove", moveBackground);
    return () => {
      window.removeEventListener("mousemove", moveBackground);
    };
  }, []);

  return (
    <>
      <audio ref={audioRef} src={ambientMusic} loop />

      <ConnectionStatus />
      <ToastContainer />

      <button
        onClick={() => setMuted(!muted)}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          border: "none",
          borderRadius: 50,
          padding: 12,
          background: "rgba(255,255,255,0.1)",
          color: "white",
          backdropFilter: "blur(10px)",
          cursor: "pointer"
        }}
      >
        {muted ? "🔇" : "🎵"}
      </button>

      <Particles
        id="tsparticles"
        init={particlesInit}
        options={{
          background: { color: { value: "transparent" } },
          fpsLimit: 60,
          interactivity: {
            events: {
              onHover: { enable: true, mode: "repulse" },
              resize: true
            },
            modes: {
              repulse: { distance: 120, duration: 0.4 }
            }
          },
          particles: {
            color: { value: "#00e5ff" },
            links: {
              color: "#c084fc",
              distance: 120,
              enable: true,
              opacity: 0.2,
              width: 1
            },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "bounce" },
              random: false,
              speed: 1,
              straight: false
            },
            number: {
              density: { enable: true, area: 800 },
              value: 40
            },
            opacity: { value: 0.3 },
            shape: { type: "circle" },
            size: { value: { min: 1, max: 4 } }
          },
          detectRetina: true
        }}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 0
        }}
      />

      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <ErrorBoundary>
          {screen === "home" && <Home setScreen={setScreen} />}
          {screen === "leaderboard" && <Leaderboard setScreen={setScreen} />}
          {screen === "multiplayer" && <Multiplayer setScreen={setScreen} setRoom={setRoom} />}
          {screen === "lobby" && <Lobby setScreen={setScreen} room={room} setRoom={setRoom} />}
          {screen === "game" && (
            <Game
              setScreen={setScreen}
              players={players}
              setPlayers={setPlayers}
              history={history}
              setHistory={setHistory}
              round={round}
              setRound={setRound}
            />
          )}
          {screen === "online-game" && <OnlineGame room={room} setRoom={setRoom} setScreen={setScreen} />}
        </ErrorBoundary>
      </div>
    </>
  );
}