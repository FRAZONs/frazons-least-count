import { motion } from "framer-motion";
import Confetti from "react-confetti";

export default function WinnerPodium({ players, onRestart, isHost = true }) {
  // Sort players by total score ascending (lowest score is 1st place)
  const sorted = [...players].sort((a, b) => a.total - b.total);
  
  const first = sorted[0];
  const second = sorted[1];
  const third = sorted[2];
  const others = sorted.slice(3);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 5, 20, 0.95)",
        backdropFilter: "blur(16px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 99999,
        padding: 20,
        overflowY: "auto",
        fontFamily: "system-ui, -apple-system, sans-serif"
      }}
    >
      <Confetti opacity={0.6} numberOfPieces={150} />
      
      <div
        style={{
          width: "100%",
          maxWidth: 680,
          background: "rgba(255, 255, 255, 0.05)",
          border: "1px solid rgba(255, 255, 255, 0.12)",
          boxShadow: "0 0 50px rgba(0, 229, 255, 0.25)",
          borderRadius: 30,
          padding: 30,
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          gap: 24
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 36, textShadow: "0 0 20px rgba(0,229,255,0.6)" }}>🏆 MATCH COMPLETE</h1>
          <p style={{ color: "#aaa", fontSize: 14, margin: "4px 0 0 0" }}>Final Standings</p>
        </div>

        {/* 3D Podium Layout */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 12,
            minHeight: 280,
            marginTop: 10,
            paddingBottom: 10
          }}
        >
          {/* 2nd Place (Silver) */}
          {second && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}
            >
              <span style={{ fontSize: 30 }}>🥈</span>
              <div style={{ fontWeight: "bold", fontSize: 15, color: "#e2e8f0", margin: "6px 0" }}>
                {second.avatar} {second.name}
              </div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 10 }}>
                {second.total} pts
              </div>
              <div
                style={{
                  width: "100%",
                  height: 120,
                  background: "linear-gradient(180deg, rgba(203, 213, 225, 0.25) 0%, rgba(203, 213, 225, 0.05) 100%)",
                  border: "1px solid rgba(203, 213, 225, 0.4)",
                  borderBottom: "none",
                  borderRadius: "16px 16px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#cbd5e1",
                  fontSize: 24,
                  fontWeight: 900
                }}
              >
                2nd
              </div>
            </motion.div>
          )}

          {/* 1st Place (Gold) */}
          {first && (
            <motion.div
              initial={{ opacity: 0, y: 80 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160, position: "relative", zIndex: 10 }}
            >
              <div style={{ position: "relative" }}>
                <span style={{ fontSize: 50 }}>👑</span>
                <span style={{ position: "absolute", left: "50%", bottom: -10, transform: "translateX(-50%)", fontSize: 32 }}>🥇</span>
              </div>
              <div style={{ fontWeight: "bold", fontSize: 18, color: "#fbbf24", textShadow: "0 0 10px rgba(251,191,36,0.4)", margin: "8px 0" }}>
                {first.avatar} {first.name}
              </div>
              <div style={{ fontSize: 14, color: "#fbbf24", fontWeight: "bold", marginBottom: 12 }}>
                {first.total} pts
              </div>
              <div
                style={{
                  width: "100%",
                  height: 160,
                  background: "linear-gradient(180deg, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0.05) 100%)",
                  border: "2px solid rgba(251, 191, 36, 0.6)",
                  borderBottom: "none",
                  borderRadius: "20px 20px 0 0",
                  boxShadow: "0 0 30px rgba(251, 191, 36, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fbbf24",
                  fontSize: 32,
                  fontWeight: 900
                }}
              >
                1st
              </div>
            </motion.div>
          )}

          {/* 3rd Place (Bronze) */}
          {third && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
              style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 140 }}
            >
              <span style={{ fontSize: 30 }}>🥉</span>
              <div style={{ fontWeight: "bold", fontSize: 15, color: "#d97706", margin: "6px 0" }}>
                {third.avatar} {third.name}
              </div>
              <div style={{ fontSize: 13, color: "#d97706", marginBottom: 10 }}>
                {third.total} pts
              </div>
              <div
                style={{
                  width: "100%",
                  height: 90,
                  background: "linear-gradient(180deg, rgba(217, 119, 6, 0.2) 0%, rgba(217, 119, 6, 0.03) 100%)",
                  border: "1px solid rgba(217, 119, 6, 0.4)",
                  borderBottom: "none",
                  borderRadius: "16px 16px 0 0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d97706",
                  fontSize: 20,
                  fontWeight: 900
                }}
              >
                3rd
              </div>
            </motion.div>
          )}
        </div>

        {/* Other players list */}
        {others.length > 0 && (
          <div
            style={{
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              borderRadius: 18,
              padding: 16,
              textAlign: "left",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}
          >
            <div style={{ fontSize: 12, color: "#888", fontWeight: "bold", letterSpacing: 1, textTransform: "uppercase" }}>Runners Up</div>
            {others.map((player, idx) => (
              <div key={player.id || player.name} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14 }}>
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ color: "#aaa" }}>#{idx + 4}</span>
                  <span>{player.avatar} {player.name}</span>
                </div>
                <span style={{ fontWeight: "bold", color: "#aaa" }}>{player.total} pts</span>
              </div>
            ))}
          </div>
        )}

        {/* Controls */}
        <div style={{ marginTop: 10 }}>
          {isHost ? (
            <button
              onClick={onRestart}
              style={{
                width: "100%",
                padding: 16,
                borderRadius: 16,
                border: "none",
                background: "linear-gradient(90deg, #ff00c8, #00e5ff)",
                color: "black",
                fontWeight: "bold",
                fontSize: 18,
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(0, 229, 255, 0.4)",
                transition: "transform 0.1s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.02)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              🎮 Play Again / Rematch
            </button>
          ) : (
            <p style={{ color: "#aaa", margin: 0 }}>Waiting for host to trigger rematch...</p>
          )}
        </div>
      </div>
    </div>
  );
}
