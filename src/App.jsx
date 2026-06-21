import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import Multiplayer from "./pages/Multiplayer";
import OnlineGame from "./pages/OnlineGame";
import ambientMusic from "./audio/ambient.mp3";
import { STORAGE_KEYS } from "./constants";
import ConnectionStatus from "./components/ConnectionStatus";
import ToastContainer from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";
import StatsDashboard from "./pages/StatsDashboard";
import PracticeGame from "./pages/PracticeGame";
import MatchHistory from "./pages/MatchHistory";

const Leaderboard = lazy(() => import("./pages/Leaderboard"));

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
  const [particlesReady, setParticlesReady] = useState(false);

  useEffect(() => {
    initParticlesEngine(async (engine) => {
      await loadSlim(engine);
    }).then(() => {
      setParticlesReady(true);
    });
  }, []);

  const audioRef = useRef(null);
  const [muted, setMuted] = useState(false);
  const [screen, setScreen] = useState("home");
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState(() => safeGetJSON(STORAGE_KEYS.players, []));
  const [history, setHistory] = useState(() => safeGetJSON(STORAGE_KEYS.history, []));
  const [round, setRound] = useState(() => safeGetJSON(STORAGE_KEYS.round, 1));

  const [showSettings, setShowSettings] = useState(false);

  const [musicVolume, setMusicVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("frazons-music-volume");
      return saved !== null ? Number(saved) : 0.15;
    } catch {
      return 0.15;
    }
  });

  const [fxVolume, setFxVolume] = useState(() => {
    try {
      const saved = localStorage.getItem("frazons-fx-volume");
      return saved !== null ? Number(saved) : 0.5;
    } catch {
      return 0.5;
    }
  });

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
    try {
      localStorage.setItem("frazons-music-volume", musicVolume.toString());
    } catch (e) {
      console.error(e);
    }
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : musicVolume;
    }
  }, [musicVolume, muted]);

  useEffect(() => {
    try {
      localStorage.setItem("frazons-fx-volume", fxVolume.toString());
    } catch (e) {
      console.error(e);
    }
  }, [fxVolume]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = muted ? 0 : musicVolume;
      audioRef.current.play().catch(() => {});
    }
  }, [muted, musicVolume]);

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
        onClick={() => setShowSettings(true)}
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 9999,
          border: "none",
          borderRadius: 50,
          padding: "12px 18px",
          background: "rgba(255,255,255,0.1)",
          color: "white",
          backdropFilter: "blur(10px)",
          cursor: "pointer",
          fontWeight: "bold",
          boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          gap: 6
        }}
      >
        <span>⚙️</span> Settings
      </button>

      {showSettings && (
        <div
          onClick={() => setShowSettings(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 99998,
            display: "flex",
            justifyContent: "flex-end"
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 320,
              height: "100%",
              background: "rgba(20, 10, 35, 0.95)",
              borderLeft: "1px solid rgba(255, 255, 255, 0.12)",
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 24,
              boxShadow: "-10px 0 30px rgba(0,0,0,0.5)",
              color: "white"
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 16 }}>
              <h2 style={{ margin: 0, fontSize: 20, color: "#00e5ff" }}>⚙️ Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "white",
                  fontSize: 20,
                  cursor: "pointer"
                }}
              >
                ✕
              </button>
            </div>

            {/* Mute Control */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: "bold" }}>Mute All Audio</span>
              <button
                onClick={() => setMuted(!muted)}
                style={{
                  background: muted ? "#ef4444" : "#00ff88",
                  color: "black",
                  border: "none",
                  padding: "8px 16px",
                  borderRadius: 10,
                  fontWeight: "bold",
                  cursor: "pointer"
                }}
              >
                {muted ? "MUTED 🔇" : "ACTIVE 🎵"}
              </button>
            </div>

            {/* Ambient Music Slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "#aaa" }}>🎵 Music Volume</span>
                <span style={{ fontWeight: "bold" }}>{Math.round(musicVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.01"
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "#00e5ff",
                  cursor: "pointer"
                }}
              />
            </div>

            {/* Sound FX Slider */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                <span style={{ color: "#aaa" }}>⚡ Sound FX Volume</span>
                <span style={{ fontWeight: "bold" }}>{Math.round(fxVolume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={fxVolume}
                onChange={(e) => setFxVolume(Number(e.target.value))}
                style={{
                  width: "100%",
                  accentColor: "#ff00c8",
                  cursor: "pointer"
                }}
              />
            </div>

            <div style={{ marginTop: "auto", fontSize: 12, color: "#888", textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 16 }}>
              Least Count v1.3.0
            </div>
          </div>
        </div>
      )}

      {particlesReady && (
        <Particles
          id="tsparticles"
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
      )}

      <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
        <ErrorBoundary>
          {screen === "home" && <Home setScreen={setScreen} />}
          {screen === "stats" && <StatsDashboard setScreen={setScreen} />}
          {screen === "history" && <MatchHistory setScreen={setScreen} />}
          {screen === "practice" && <PracticeGame setScreen={setScreen} />}
          {screen === "leaderboard" && (
            <Suspense
              fallback={
                <div
                  style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: 18
                  }}
                >
                  Loading leaderboard...
                </div>
              }
            >
              <Leaderboard setScreen={setScreen} />
            </Suspense>
          )}
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