import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { db, auth } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import Home from "./pages/Home";
import Game from "./pages/Game";
import Lobby from "./pages/Lobby";
import Multiplayer from "./pages/Multiplayer";
import OnlineGame from "./pages/OnlineGame";
import AuthPage from "./pages/AuthPage";
import NicknameSelection from "./pages/NicknameSelection";
import { getPlayerProfileByUid } from "./utils/playerStats";
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
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    try {
      return localStorage.getItem("frazons-is-guest") === "true";
    } catch {
      return false;
    }
  });

  const settingsFileInputRef = useRef(null);

  const handleSettingsCustomAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select a valid image file");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = async () => {
        const canvas = document.createElement("canvas");
        const maxDim = 120;
        let width = img.width;
        let height = img.height;

        const size = Math.min(width, height);
        const xOffset = (width - size) / 2;
        const yOffset = (height - size) / 2;

        canvas.width = maxDim;
        canvas.height = maxDim;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, xOffset, yOffset, size, size, 0, 0, maxDim, maxDim);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);
        await updateAvatar(compressedBase64);
      };
    };
  };

  const updateAvatar = async (newAvatar) => {
    try {
      const rawName = localStorage.getItem("playerName");
      if (rawName && user) {
        const pKey = rawName.toLowerCase().trim();
        const { doc, updateDoc } = await import("firebase/firestore");
        const playerRef = doc(db, "players", pKey);
        await updateDoc(playerRef, { avatar: newAvatar });
      }
      localStorage.setItem("frazons-player-avatar", newAvatar);
      setUserProfile(prev => prev ? { ...prev, avatar: newAvatar } : { avatar: newAvatar });
    } catch (e) {
      console.error("Failed to update avatar in Firestore:", e);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          const profile = await getPlayerProfileByUid(db, firebaseUser.uid);
          if (profile) {
            setUserProfile(profile);
            const pKey = profile.name.toLowerCase().trim().replace(/\s+/g, "_");
            localStorage.setItem("playerName", pKey);
            localStorage.setItem("frazons-player-avatar", profile.avatar || "👾");
            localStorage.setItem("frazons-ranked-points", (profile.rankedPoints || 0).toString());
            
            localStorage.setItem("frazons-career-stats", JSON.stringify({
              onlineMatchesPlayed: Number(profile.gamesPlayed) || 0,
              onlineMatchesWon: Number(profile.wins) || 0,
              bonusXP: Math.max(0, Number(profile.totalScore) - (Number(profile.wins) * 150))
            }));
          } else {
            setUserProfile(null);
          }
        } catch (e) {
          console.error("Failed to load user profile from Firestore:", e);
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

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

            {user && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "rgba(255, 255, 255, 0.03)", padding: 16, borderRadius: 16, border: "1px solid rgba(255, 255, 255, 0.08)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 40, filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.3))", minWidth: 44, height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {(userProfile?.avatar || localStorage.getItem("frazons-player-avatar") || "👾").startsWith("data:image") ? (
                      <img
                        src={userProfile?.avatar || localStorage.getItem("frazons-player-avatar") || "👾"}
                        alt="Profile"
                        style={{ width: 38, height: 38, borderRadius: "50%", objectFit: "cover", border: "2px solid #00e5ff" }}
                      />
                    ) : (
                      userProfile?.avatar || localStorage.getItem("frazons-player-avatar") || "👾"
                    )}
                  </span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 15, color: "#00e5ff", textAlign: "left" }}>
                      {userProfile?.name || localStorage.getItem("playerName")?.split("_")?.[0] || "Duelist"}
                    </div>
                    <div style={{ fontSize: 11, color: "#aaa", textAlign: "left" }}>Gamer Profile</div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: "bold", color: "#888", textAlign: "left" }}>CHANGE AVATAR</span>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                    {["👾", "🤖", "😈", "🦊", "⚔️", "👑", "💀", "🛸", "🔋", "🌌"].map((a) => (
                      <button
                        key={a}
                        onClick={() => updateAvatar(a)}
                        style={{
                          fontSize: 18,
                          background: (userProfile?.avatar || localStorage.getItem("frazons-player-avatar") || "👾") === a ? "rgba(0, 229, 255, 0.15)" : "transparent",
                          border: (userProfile?.avatar || localStorage.getItem("frazons-player-avatar") || "👾") === a ? "1px solid #00e5ff" : "1px solid transparent",
                          borderRadius: 8,
                          padding: 4,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  {/* Upload custom pic */}
                  <input
                    type="file"
                    ref={settingsFileInputRef}
                    onChange={handleSettingsCustomAvatarUpload}
                    style={{ display: "none" }}
                    accept="image/*"
                  />
                  <button
                    onClick={() => settingsFileInputRef.current?.click()}
                    style={{
                      width: "100%",
                      padding: "8px 12px",
                      borderRadius: 10,
                      border: "1px dashed rgba(0, 229, 255, 0.35)",
                      background: "rgba(0, 229, 255, 0.04)",
                      color: "#00e5ff",
                      fontSize: 13,
                      fontWeight: "bold",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      marginTop: 6
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "rgba(0, 229, 255, 0.15)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "rgba(0, 229, 255, 0.04)"}
                  >
                    📤 Upload Custom Photo
                  </button>
                </div>
              </div>
            )}

            {(user || isGuest) && (
              <button
                onClick={async () => {
                  try {
                    if (user) {
                      await signOut(auth);
                    }
                    setIsGuest(false);
                    localStorage.removeItem("frazons-is-guest");
                    localStorage.removeItem("playerName");
                    localStorage.removeItem("frazons-player-avatar");
                    localStorage.removeItem("frazons-ranked-points");
                    localStorage.removeItem("frazons-career-stats");
                    localStorage.removeItem("frazons-quest-progress");
                    setScreen("home");
                    setShowSettings(false);
                  } catch (e) {
                    console.error("Sign out failed:", e);
                  }
                }}
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: "none",
                  background: "rgba(239, 68, 68, 0.15)",
                  color: "#ef4444",
                  fontWeight: "bold",
                  fontSize: 14,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  marginTop: 15
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.25)"}
                onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239, 68, 68, 0.15)"}
              >
                🚪 {isGuest ? "Exit Guest Mode / Sign In" : "Sign Out"}
              </button>
            )}

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
          {authLoading ? (
            <div
              style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontFamily: "system-ui, -apple-system, sans-serif",
                gap: 16
              }}
            >
              <div style={{ border: "4px solid rgba(255,255,255,0.1)", borderTop: "4px solid #00e5ff", borderRadius: "50%", width: 36, height: 36, margin: "0 auto", animation: "spin 1s linear infinite" }} />
              <span style={{ fontSize: 15, fontWeight: "bold", color: "#00e5ff", textShadow: "0 0 10px rgba(0,229,255,0.3)" }}>CONNECTING TO THE ARENA...</span>
              <style>{`
                @keyframes spin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `}</style>
            </div>
          ) : (!user && !isGuest) ? (
            <AuthPage
              onGuestMode={() => {
                setIsGuest(true);
                localStorage.setItem("frazons-is-guest", "true");
              }}
            />
          ) : (!userProfile && !isGuest) ? (
            <NicknameSelection uid={user.uid} onComplete={(profile) => setUserProfile(profile)} />
          ) : (
            <>
              {screen === "home" && <Home setScreen={setScreen} isGuest={isGuest} />}
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
              {screen === "multiplayer" && (
                <Multiplayer
                  setScreen={setScreen}
                  setRoom={setRoom}
                  isGuest={isGuest}
                  onExitGuestMode={() => {
                    setIsGuest(false);
                    localStorage.removeItem("frazons-is-guest");
                    setScreen("home");
                  }}
                />
              )}
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
            </>
          )}
        </ErrorBoundary>
      </div>
    </>
  );
}