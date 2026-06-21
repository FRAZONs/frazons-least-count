import { useState, useEffect } from "react";
import { STORAGE_KEYS, BUTTON_STYLES, HOME_PAGE_STYLE } from "../constants";
import CustomizationsModal from "../components/CustomizationsModal";
import { getCareerPoints, getRankTier, initializeQuests, claimQuestReward } from "../utils/playerStats";
import { db } from "../firebase";

export default function Home({ setScreen }) {
  const [showCustomize, setShowCustomize] = useState(false);
  const hasSave = localStorage.getItem(STORAGE_KEYS.players);

  const [questProgress, setQuestProgress] = useState(null);
  const [questsExpanded, setQuestsExpanded] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const progress = initializeQuests();
    setQuestProgress(progress);
  }, []);

  const xp = getCareerPoints();
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;
  const xpCurrentThreshold = (level - 1) * (level - 1) * 100;
  const xpNextThreshold = level * level * 100;
  const levelXP = xp - xpCurrentThreshold;
  const nextLevelXP = xpNextThreshold - xpCurrentThreshold;
  const progressPercent = Math.min(100, Math.max(0, (levelXP / nextLevelXP) * 100));

  const rp = Number(localStorage.getItem("frazons-ranked-points")) || 0;
  const isTop100 = localStorage.getItem("frazons-is-top-100") === "true";
  const rankInfo = getRankTier(rp, isTop100);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.players);
    localStorage.removeItem(STORAGE_KEYS.history);
    localStorage.removeItem(STORAGE_KEYS.round);
  };

  const startNewGame = () => {
    clearStorage();
    setScreen("game");
  };

  const clearMatch = () => {
    clearStorage();
    window.location.reload();
  };

  const actionBtn = (bg, color = "white", full = false) => ({
    background: bg,
    color: color,
    border: "none",
    padding: "14px 18px",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: full ? "100%" : "auto",
    flex: 1,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    transition: "all 0.2s ease"
  });

  return (
    <div style={HOME_PAGE_STYLE.container}>
      <div style={HOME_PAGE_STYLE.wrapper}>
        <img src="/new-icon-512.png" alt="Frazon's Logo" style={HOME_PAGE_STYLE.logo} />
        <h1 style={HOME_PAGE_STYLE.title}>FRAZON'S</h1>
        <div style={HOME_PAGE_STYLE.subtitle}>LEAST COUNT</div>
        <p style={HOME_PAGE_STYLE.description}>ONLINE CARD BATTLES</p>

        {/* User Profile Level & XP progress bar */}
        <div
          style={{
            width: "100%",
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            textAlign: "left",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
            boxSizing: "border-box"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 32, filter: "drop-shadow(0 0 8px rgba(0, 229, 255, 0.35))" }}>
                {localStorage.getItem("frazons-player-avatar") || "👾"}
              </span>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: "bold", fontSize: 15 }}>{localStorage.getItem("playerName")?.split("-")?.[0] || "Guest Player"}</div>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: "bold",
                      background: "rgba(255, 255, 255, 0.04)",
                      border: `1px solid ${rankInfo.color}44`,
                      padding: "2px 6px",
                      borderRadius: 6,
                      color: rankInfo.color,
                      textShadow: `0 0 5px ${rankInfo.color}33`,
                      whiteSpace: "nowrap"
                    }}
                  >
                    {rankInfo.levelName} ({rp} RP)
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#aaa", marginTop: 2 }}>Ranked Card Duelist</div>
              </div>
            </div>
            <div style={{ background: "rgba(0, 229, 255, 0.15)", border: "1px solid rgba(0, 229, 255, 0.3)", color: "#00e5ff", fontWeight: "bold", padding: "4px 10px", borderRadius: 8, fontSize: 12 }}>
              LVL {level}
            </div>
          </div>

          {/* XP Progress Bar */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#aaa" }}>
              <span>Progress to Lvl {level + 1}</span>
              <span style={{ fontWeight: "bold", color: "#00ff88" }}>{levelXP} / {nextLevelXP} XP</span>
            </div>
            <div style={{ width: "100%", height: 8, background: "rgba(255,255,255,0.06)", borderRadius: 4, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div
                style={{
                  width: `${progressPercent}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #00ff88, #00e5ff)",
                  boxShadow: "0 0 8px rgba(0,255,136,0.6)",
                  transition: "width 0.8s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
              />
            </div>
          </div>
        </div>

        {/* handleClaimReward and renderQuestItem helper functions */}
        {(() => {
          const handleClaimReward = async (questId) => {
            try {
              const claimedXP = await claimQuestReward(db, questId);
              if (claimedXP > 0) {
                const updatedProgress = initializeQuests();
                setQuestProgress(updatedProgress);
                setRefreshTrigger(prev => prev + 1);
              }
            } catch (e) {
              console.error("Failed to claim reward:", e);
            }
          };

          const renderQuestItem = (q) => {
            const isCompleted = q.current >= q.target;
            const isClaimed = q.claimed;
            const progressPercent = Math.min(100, (q.current / q.target) * 100);

            return (
              <div key={q.id} style={{ display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: "bold", color: isCompleted ? "#00ff88" : "white" }}>
                      {q.title}
                    </div>
                    <div style={{ fontSize: 11, color: "#888", marginTop: 2 }}>
                      Reward: <strong style={{ color: "#00e5ff" }}>+{q.xpReward} XP</strong>
                    </div>
                  </div>

                  {/* Claim or Status button */}
                  {isClaimed ? (
                    <span style={{ fontSize: 11, color: "#555", fontWeight: "bold", padding: "4px 8px" }}>CLAIMED</span>
                  ) : isCompleted ? (
                    <button
                      onClick={() => handleClaimReward(q.id)}
                      style={{
                        background: "linear-gradient(90deg, #00ff88, #00e5ff)",
                        color: "black",
                        border: "none",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: "bold",
                        cursor: "pointer",
                        boxShadow: "0 0 10px rgba(0,255,136,0.3)",
                        transition: "transform 0.1s"
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
                      onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                    >
                      Claim XP
                    </button>
                  ) : (
                    <span style={{ fontSize: 12, color: "#aaa", fontFamily: "monospace" }}>{q.current}/{q.target}</span>
                  )}
                </div>

                {/* Progress Bar */}
                {!isClaimed && (
                  <div style={{ width: "100%", height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                    <div
                      style={{
                        width: `${progressPercent}%`,
                        height: "100%",
                        background: isCompleted ? "#00ff88" : "linear-gradient(90deg, #c084fc, #00e5ff)",
                        borderRadius: 3
                      }}
                    />
                  </div>
                )}
              </div>
            );
          };

          const dailyQuests = questProgress?.dailyQuests || [];
          const weeklyQuests = questProgress?.weeklyQuests || [];
          const pendingClaimsCount = [...dailyQuests, ...weeklyQuests].filter(q => q.current >= q.target && !q.claimed).length;

          return (
            <div
              style={{
                width: "100%",
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: 20,
                padding: 16,
                marginBottom: 20,
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
                boxSizing: "border-box"
              }}
            >
              {/* Header */}
              <div
                onClick={() => setQuestsExpanded(!questsExpanded)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  cursor: "pointer"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🎯</span>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: 15, color: "#00ff88" }}>Arena Quests</div>
                    <div style={{ fontSize: 11, color: "#aaa" }}>Daily & Weekly XP missions</div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {pendingClaimsCount > 0 && (
                    <span style={{
                      background: "#00ff88",
                      color: "black",
                      fontSize: 10,
                      fontWeight: "bold",
                      padding: "2px 6px",
                      borderRadius: 8,
                      boxShadow: "0 0 10px rgba(0,255,136,0.4)"
                    }}>
                      {pendingClaimsCount} READY
                    </span>
                  )}
                  <span style={{ fontSize: 12, color: "#aaa" }}>{questsExpanded ? "▲" : "▼"}</span>
                </div>
              </div>

              {/* Quests List */}
              {questsExpanded && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 4, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 12 }}>
                  {/* Daily Quests */}
                  <div style={{ fontSize: 12, fontWeight: "bold", color: "#00e5ff", letterSpacing: 0.5 }}>DAILY QUESTS</div>
                  {dailyQuests.map((q) => renderQuestItem(q))}

                  {/* Weekly Quests */}
                  <div style={{ fontSize: 12, fontWeight: "bold", color: "#c084fc", letterSpacing: 0.5, marginTop: 6 }}>WEEKLY QUESTS</div>
                  {weeklyQuests.map((q) => renderQuestItem(q))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Game Modes Section */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setScreen("practice")}
            style={{
              background: "linear-gradient(135deg, rgba(255,0,200,0.15), rgba(108,92,231,0.15))",
              border: "1px solid rgba(255,0,200,0.3)",
              borderRadius: 20,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(255,0,200,0.25)";
              e.currentTarget.style.borderColor = "rgba(255,0,200,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
              e.currentTarget.style.borderColor = "rgba(255,0,200,0.3)";
            }}
          >
            <span style={{ fontSize: 32 }}>🤖</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 16 }}>Bot Practice</div>
              <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>Offline Sandbox</div>
            </div>
          </button>

          <button
            onClick={() => setScreen("multiplayer")}
            style={{
              background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(108,92,231,0.15))",
              border: "1px solid rgba(0,229,255,0.3)",
              borderRadius: 20,
              padding: "20px 16px",
              textAlign: "center",
              cursor: "pointer",
              color: "white",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = "0 12px 30px rgba(0,229,255,0.25)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.2)";
              e.currentTarget.style.borderColor = "rgba(0,229,255,0.3)";
            }}
          >
            <span style={{ fontSize: 32 }}>☁️</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 16 }}>Play Online</div>
              <div style={{ fontSize: 11, color: "#c4b5fd", marginTop: 2 }}>Multiplayer Room</div>
            </div>
          </button>
        </div>

        {/* Score Sheet Calculator Card */}
        <div
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 20,
            padding: 16,
            marginBottom: 20,
            textAlign: "left",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <span style={{ fontSize: 20 }}>📝</span>
            <div>
              <div style={{ fontWeight: "bold", fontSize: 15, color: "#c4b5fd" }}>Score Sheet Calculator</div>
              <div style={{ fontSize: 11, color: "#aaa" }}>Track physical card game scores offline</div>
            </div>
          </div>

          {hasSave ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <button
                onClick={() => setScreen("game")}
                style={actionBtn("#00e5ff", "black", true)}
                onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
                onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
              >
                🎮 Continue Match
              </button>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={startNewGame}
                  style={actionBtn("rgba(255,255,255,0.08)", "white")}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  ✨ New Match
                </button>
                <button
                  onClick={clearMatch}
                  style={actionBtn("rgba(255, 0, 76, 0.15)", "#ff004c")}
                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 0, 76, 0.25)"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 0, 76, 0.15)"}
                >
                  🗑 Clear
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={startNewGame}
              style={actionBtn("#ff00c8", "white", true)}
              onMouseEnter={(e) => e.currentTarget.style.filter = "brightness(1.1)"}
              onMouseLeave={(e) => e.currentTarget.style.filter = "none"}
            >
              ✨ Start Score Sheet
            </button>
          )}
        </div>

        {/* Stats & Customizations 2x2 Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            onClick={() => setScreen("stats")}
            style={{
              background: "rgba(108, 92, 231, 0.08)",
              border: "1px solid rgba(108, 92, 231, 0.2)",
              color: "#a78bfa",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(108, 92, 231, 0.15)";
              e.currentTarget.style.borderColor = "rgba(108, 92, 231, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(108, 92, 231, 0.08)";
              e.currentTarget.style.borderColor = "rgba(108, 92, 231, 0.2)";
            }}
          >
            📊 Career Stats
          </button>
          <button
            onClick={() => setScreen("leaderboard")}
            style={{
              background: "rgba(0, 229, 255, 0.08)",
              border: "1px solid rgba(0, 229, 255, 0.2)",
              color: "#00e5ff",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 229, 255, 0.15)";
              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 229, 255, 0.08)";
              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.2)";
            }}
          >
            🏆 Leaderboard
          </button>
          <button
            onClick={() => setScreen("history")}
            style={{
              background: "rgba(0, 255, 136, 0.08)",
              border: "1px solid rgba(0, 255, 136, 0.2)",
              color: "#00ff88",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.15)";
              e.currentTarget.style.borderColor = "rgba(0, 255, 136, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(0, 255, 136, 0.08)";
              e.currentTarget.style.borderColor = "rgba(0, 255, 136, 0.2)";
            }}
          >
            📜 Duel Logs
          </button>
          <button
            onClick={() => setShowCustomize(true)}
            style={{
              background: "rgba(255, 0, 200, 0.08)",
              border: "1px solid rgba(255, 0, 200, 0.2)",
              color: "#f472b6",
              padding: "12px 14px",
              borderRadius: 14,
              fontSize: 13,
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all 0.2s ease"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 0, 200, 0.15)";
              e.currentTarget.style.borderColor = "rgba(255, 0, 200, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(255, 0, 200, 0.08)";
              e.currentTarget.style.borderColor = "rgba(255, 0, 200, 0.2)";
            }}
          >
            🎨 Style Shop
          </button>
        </div>

        <CustomizationsModal isOpen={showCustomize} onClose={() => setShowCustomize(false)} />
      </div>
    </div>
  );
}
