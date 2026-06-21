import { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  GithubAuthProvider
} from "firebase/auth";
import { auth, db } from "../firebase";
import { checkNicknameAvailable, createPlayerProfile } from "../utils/playerStats";
import { useToast } from "../hooks/useToast";
import { motion } from "framer-motion";

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(255, 255, 255, 0.05)",
  color: "white",
  fontSize: 15,
  outline: "none",
  boxSizing: "border-box",
  transition: "all 0.2s ease"
};

const btnStyle = (bg, textColor = "white") => ({
  width: "100%",
  padding: 14,
  borderRadius: 12,
  border: "none",
  background: bg,
  color: textColor,
  fontSize: 15,
  fontWeight: "bold",
  cursor: "pointer",
  transition: "all 0.2s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
});

export default function AuthPage({ onGuestMode }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const { error: showError, success } = useToast();

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loading) return;

    const emailTrim = email.trim();
    const pwTrim = password.trim();
    const nickTrim = nickname.trim();

    if (!emailTrim || !pwTrim) {
      showError("Please fill in email and password fields");
      return;
    }

    if (isSignUp && !nickTrim) {
      showError("Please select a duelist nickname");
      return;
    }

    setLoading(true);
    try {
      if (isSignUp) {
        // 1. Verify nickname availability first
        const available = await checkNicknameAvailable(db, nickTrim);
        if (!available) {
          showError("Nickname is already taken. Try another!");
          setLoading(false);
          return;
        }

        // 2. Create Auth user
        const credential = await createUserWithEmailAndPassword(auth, emailTrim, pwTrim);
        
        // 3. Migrate any existing local stats
        let initialStats = {};
        try {
          const localStatsSaved = localStorage.getItem("frazons-career-stats");
          const localRPSaved = localStorage.getItem("frazons-ranked-points");
          if (localStatsSaved) {
            const parsed = JSON.parse(localStatsSaved);
            initialStats = {
              gamesPlayed: (Number(parsed.onlineMatchesPlayed) || 0) + (Number(parsed.offlineMatchesPlayed) || 0),
              wins: (Number(parsed.onlineMatchesWon) || 0) + (Number(parsed.offlineMatchesWon) || 0),
              totalScore: (Number(parsed.onlineMatchesWon) || 0) * 150 + (Number(parsed.offlineMatchesWon) || 0) * 50 + (Number(parsed.totalRoundsPlayed) || 0) * 5 + (Number(parsed.bonusXP) || 0)
            };
          }
          if (localRPSaved) {
            initialStats.rankedPoints = Number(localRPSaved) || 0;
          }
        } catch (err) {
          console.error("Failed to parse local stats for migration:", err);
        }

        // 4. Register profile
        await createPlayerProfile(db, credential.user.uid, nickTrim, initialStats);
        success("Account created successfully!");
      } else {
        // Sign in
        await signInWithEmailAndPassword(auth, emailTrim, pwTrim);
        success("Signed in successfully!");
      }
    } catch (err) {
      let msg = "Authentication failed. Try again.";
      if (err.code === "auth/email-already-in-use") msg = "This email is already in use.";
      else if (err.code === "auth/weak-password") msg = "Password must be at least 6 characters.";
      else if (err.code === "auth/invalid-credential") msg = "Invalid email or password.";
      showError(msg);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSignIn = async (provider, name) => {
    if (loading) return;
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      success(`${name} authentication complete!`);
    } catch (err) {
      showError(`${name} sign-in failed. Try again.`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #07030d, #140526, #020f26)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        boxSizing: "border-box",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255, 255, 255, 0.03)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 10px 40px rgba(0,0,0,0.5), inset 0 0 30px rgba(108, 92, 231, 0.15)",
          borderRadius: 28,
          padding: "36px 28px",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          position: "relative",
          backdropFilter: "blur(20px)"
        }}
      >
        {/* Fanfare visual elements */}
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <img src="/new-icon-512.png" alt="Logo" style={{ width: 64, height: 64, filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.4))" }} />
          <h1 style={{ margin: "12px 0 2px 0", fontSize: 28, fontWeight: "black", letterSpacing: 1.5, color: "white", textShadow: "0 0 15px rgba(0,229,255,0.3)" }}>
            FRAZON'S
          </h1>
          <div style={{ fontSize: 13, color: "#00e5ff", fontWeight: "bold", letterSpacing: 1 }}>
            ARENA LOGIN
          </div>
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isSignUp && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 12, fontWeight: "bold", color: "#aaa" }}>DUELIST NICKNAME</label>
              <input
                type="text"
                placeholder="e.g. CyberNinja"
                value={nickname}
                onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
                style={inputStyle}
                disabled={loading}
                required
              />
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: "bold", color: "#aaa" }}>EMAIL ADDRESS</label>
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: "bold", color: "#aaa" }}>PASSWORD</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={btnStyle("linear-gradient(90deg, #ff00c8, #6c5ce7)", "white")}
            onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.15)"}
            onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
          >
            {loading ? "AUTHENTICATING..." : isSignUp ? "REGISTER DUELIST" : "ENTER ARENA"}
          </button>
        </form>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "#666", fontWeight: "bold" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              name: "Google / Play Games",
              displayName: "Google / Play Games",
              color: "#4285F4",
              provider: new GoogleAuthProvider(),
              svg: (
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.1.88-1.59 2.59l4.51 3.5c2.64-2.43 4.14-6 4.14-10z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-4.51-3.5c-1.25.84-2.85 1.34-4.6 1.34-3.53 0-6.52-2.38-7.59-5.59l-4.66 3.61C5.17 21.03 8.35 24 12 24z"/>
                  <path fill="#FBBC05" d="M4.41 13.34c-.27-.81-.42-1.68-.42-2.58s.15-1.77.42-2.58l-4.66-3.61C-.72 6.84-1.2 9.35-1.2 12s.48 5.16 1.37 7.42l4.24-3.28c-.27-.8-.42-1.67-.42-2.57z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 8.35 0 5.17 2.97 3.75 7.15l4.66 3.61c1.07-3.21 4.06-5.59 7.59-5.59z"/>
                </svg>
              )
            },
            {
              name: "GitHub",
              displayName: "GitHub",
              color: "#24292e",
              provider: new GithubAuthProvider(),
              svg: (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.579.688.481C19.137 20.162 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
                </svg>
              )
            }
          ].map((platform) => (
            <button
              key={platform.name}
              type="button"
              onClick={() => handleSocialSignIn(platform.provider, platform.name)}
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                color: "white",
                fontSize: 14,
                fontWeight: "bold",
                cursor: "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: 12,
                boxSizing: "border-box"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.08)";
                e.currentTarget.style.borderColor = platform.color;
                e.currentTarget.style.boxShadow = `0 0 10px ${platform.color}33`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 20, height: 20 }}>
                {platform.svg}
              </span>
              <span>Continue with {platform.displayName}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "10px 0" }}>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
          <span style={{ fontSize: 11, color: "#666", fontWeight: "bold" }}>OR</span>
          <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        </div>

        <button
          type="button"
          onClick={onGuestMode}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px",
            borderRadius: 12,
            border: "1px solid rgba(0, 255, 136, 0.25)",
            background: "rgba(0, 255, 136, 0.05)",
            color: "#00ff88",
            fontSize: 14,
            fontWeight: "bold",
            cursor: "pointer",
            transition: "all 0.2s ease",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxSizing: "border-box"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(0, 255, 136, 0.15)";
            e.currentTarget.style.boxShadow = "0 0 15px rgba(0, 255, 136, 0.25)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(0, 255, 136, 0.05)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          🎮 Play Offline (Guest Mode)
        </button>

        <div style={{ textAlign: "center", fontSize: 13, color: "#aaa", marginTop: 8 }}>
          {isSignUp ? "Already a duelist?" : "New to the arena?"}{" "}
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            style={{
              background: "none",
              border: "none",
              color: "#00e5ff",
              fontWeight: "bold",
              cursor: "pointer",
              padding: 0,
              textDecoration: "underline"
            }}
          >
            {isSignUp ? "Sign In" : "Register"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
