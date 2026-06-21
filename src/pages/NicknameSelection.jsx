import { useState } from "react";
import { db } from "../firebase";
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

export default function NicknameSelection({ uid, onComplete }) {
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);
  const { error: showError, success } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    const nickTrim = nickname.trim();
    if (!nickTrim) {
      showError("Please enter a Gamer ID");
      return;
    }

    setLoading(true);
    try {
      // 1. Verify availability
      const available = await checkNicknameAvailable(db, nickTrim);
      if (!available) {
        showError("Gamer ID is already taken. Try another!");
        setLoading(false);
        return;
      }

      // 2. Migrate existing local stats if they exist
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

      // 3. Create player profile document
      const profile = await createPlayerProfile(db, uid, nickTrim, initialStats);
      success("Gamer ID created successfully!");
      onComplete(profile);
    } catch (err) {
      showError("Failed to set Gamer ID. Try again.");
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
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 48, filter: "drop-shadow(0 0 10px rgba(0, 229, 255, 0.4))" }}>🃏</span>
          <h2 style={{ margin: "12px 0 2px 0", fontSize: 24, fontWeight: "black", letterSpacing: 1, color: "white", textShadow: "0 0 15px rgba(0,229,255,0.3)" }}>
            CREATE GAMER ID
          </h2>
          <p style={{ fontSize: 13, color: "#aaa", marginTop: 4 }}>
            Choose a unique Gamer ID to represent you on the leaderboard and in duels!
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 12, fontWeight: "bold", color: "#aaa" }}>CHOOSE GAMER ID</label>
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

          <button
            type="submit"
            disabled={loading}
            style={btnStyle("linear-gradient(90deg, #ff00c8, #6c5ce7)", "white")}
            onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.15)"}
            onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
          >
            {loading ? "SAVING GAMER ID..." : "CREATE GAMER ID & ENTER"}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
