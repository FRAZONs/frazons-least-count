export async function savePlayerStats(db, playerName, gameResult) {
  try {
    const { doc, setDoc, getDoc, increment } = await import("firebase/firestore");

    const playerRef = doc(db, "players", playerName);
    const playerSnap = await getDoc(playerRef);

    if (playerSnap.exists()) {
      const current = playerSnap.data();
      await setDoc(playerRef, {
        ...current,
        gamesPlayed: increment(1),
        wins: gameResult.isWinner ? increment(1) : current.wins || 0,
        totalScore: increment(gameResult.finalScore || 0),
        lastPlayed: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } else {
      await setDoc(playerRef, {
        name: playerName,
        gamesPlayed: 1,
        wins: gameResult.isWinner ? 1 : 0,
        totalScore: gameResult.finalScore || 0,
        avatar: gameResult.avatar || "😈",
        createdAt: new Date().toISOString(),
        lastPlayed: new Date().toISOString()
      });
    }
  } catch (error) {
    console.error("Failed to save player stats:", error);
  }
}

export async function getPlayerStats(db, playerName) {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const playerRef = doc(db, "players", playerName);
    const playerSnap = await getDoc(playerRef);

    if (playerSnap.exists()) {
      const data = playerSnap.data();
      return {
        ...data,
        winRate: data.gamesPlayed > 0 ? ((data.wins / data.gamesPlayed) * 100).toFixed(1) : 0,
        avgScore: data.gamesPlayed > 0 ? (data.totalScore / data.gamesPlayed).toFixed(0) : 0
      };
    }
    return null;
  } catch (error) {
    console.error("Failed to get player stats:", error);
    return null;
  }
}

export async function getTopPlayers(db, limit = 10, sortBy = "wins") {
  try {
    const { collection, query, orderBy, limit: dbLimit, getDocs } = await import("firebase/firestore");

    let sortField = "wins";
    if (sortBy === "totalScore") sortField = "totalScore";
    else if (sortBy === "rankedPoints") sortField = "rankedPoints";

    const q = query(
      collection(db, "players"),
      orderBy(sortField, "desc"),
      dbLimit(limit)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        winRate: data.gamesPlayed > 0 ? ((data.wins / data.gamesPlayed) * 100).toFixed(1) : 0,
        avgScore: data.gamesPlayed > 0 ? (data.totalScore / data.gamesPlayed).toFixed(0) : 0
      };
    });
  } catch (error) {
    console.error("Failed to fetch top players:", error);
    return [];
  }
}

export function updateLocalStats(updates) {
  try {
    const saved = localStorage.getItem("frazons-career-stats");
    const current = saved ? JSON.parse(saved) : {
      onlineMatchesPlayed: 0,
      onlineMatchesWon: 0,
      offlineMatchesPlayed: 0,
      offlineMatchesWon: 0,
      declarationsMade: 0,
      declarationsWon: 0,
      declarationsLost: 0,
      totalRoundsPlayed: 0,
      totalPointsAccumulated: 0
    };
    
    const next = { ...current };
    Object.entries(updates).forEach(([key, val]) => {
      if (typeof val === "number") {
        next[key] = (Number(next[key]) || 0) + val;
      } else {
        next[key] = val;
      }
    });
    
    localStorage.setItem("frazons-career-stats", JSON.stringify(next));
  } catch (e) {
    console.error("Error updating local stats:", e);
  }
}

export function getCareerPoints() {
  try {
    const saved = localStorage.getItem("frazons-career-stats");
    if (!saved) return 0;
    const stats = JSON.parse(saved);
    const onlineWins = Number(stats.onlineMatchesWon) || 0;
    const offlineWins = Number(stats.offlineMatchesWon) || 0;
    const rounds = Number(stats.totalRoundsPlayed) || 0;
    const bonusXP = Number(stats.bonusXP) || 0;
    return (onlineWins * 150) + (offlineWins * 50) + (rounds * 5) + bonusXP;
  } catch {
    return 0;
  }
}

export async function saveMatchToDatabase(db, matchData) {
  try {
    const { collection, addDoc } = await import("firebase/firestore");
    const docRef = await addDoc(collection(db, "matches"), {
      ...matchData,
      createdAt: new Date().toISOString()
    });
    console.log("Match saved successfully to database: ", docRef.id);
  } catch (error) {
    console.error("Failed to save match to database:", error);
  }
}

export async function getMatchHistoryFromDatabase(db, pKey) {
  try {
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const q = query(
      collection(db, "matches"),
      where("playersKeys", "array-contains", pKey)
    );
    const snapshot = await getDocs(q);
    const matches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    // Sort in-memory to prevent requiring composite index creation in Firestore!
    matches.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return matches.slice(0, 30);
  } catch (error) {
    console.error("Failed to fetch match history from database:", error);
    return [];
  }
}

export function getRankTier(rp = 0, isTop100 = false) {
  if (isTop100 && rp >= 3400) {
    return { name: "Joker", color: "#ff007f", icon: "🃏", levelName: "Joker 🃏" };
  }

  const tiers = [
    { name: "Ace 1", min: 3800, color: "#e11d48", icon: "🅰️" },
    { name: "Ace 2", min: 3700, color: "#e11d48", icon: "🅰️" },
    { name: "Ace 3", min: 3600, color: "#e11d48", icon: "🅰️" },
    { name: "Ace 4", min: 3500, color: "#e11d48", icon: "🅰️" },
    { name: "Ace 5", min: 3400, color: "#e11d48", icon: "🅰️" },
    
    { name: "King 1", min: 3300, color: "#fbbf24", icon: "👑" },
    { name: "King 2", min: 3200, color: "#fbbf24", icon: "👑" },
    { name: "King 3", min: 3100, color: "#fbbf24", icon: "👑" },
    { name: "King 4", min: 3000, color: "#fbbf24", icon: "👑" },
    { name: "King 5", min: 2900, color: "#fbbf24", icon: "👑" },
    
    { name: "Queen 1", min: 2800, color: "#ec4899", icon: "👸" },
    { name: "Queen 2", min: 2700, color: "#ec4899", icon: "👸" },
    { name: "Queen 3", min: 2600, color: "#ec4899", icon: "👸" },
    { name: "Queen 4", min: 2500, color: "#ec4899", icon: "👸" },
    { name: "Queen 5", min: 2400, color: "#ec4899", icon: "👸" },
    
    { name: "Jack 1", min: 2300, color: "#3b82f6", icon: "⚔️" },
    { name: "Jack 2", min: 2200, color: "#3b82f6", icon: "⚔️" },
    { name: "Jack 3", min: 2100, color: "#3b82f6", icon: "⚔️" },
    { name: "Jack 4", min: 2000, color: "#3b82f6", icon: "⚔️" },
    { name: "Jack 5", min: 1900, color: "#3b82f6", icon: "⚔️" },
    
    { name: "Diamond 1", min: 1800, color: "#06b6d4", icon: "💎" },
    { name: "Diamond 2", min: 1700, color: "#06b6d4", icon: "💎" },
    { name: "Diamond 3", min: 1600, color: "#06b6d4", icon: "💎" },
    { name: "Diamond 4", min: 1500, color: "#06b6d4", icon: "💎" },
    { name: "Diamond 5", min: 1400, color: "#06b6d4", icon: "💎" },
    
    { name: "Platinum 1", min: 1300, color: "#a855f7", icon: "💿" },
    { name: "Platinum 2", min: 1200, color: "#a855f7", icon: "💿" },
    { name: "Platinum 3", min: 1100, color: "#a855f7", icon: "💿" },
    { name: "Platinum 4", min: 1000, color: "#a855f7", icon: "💿" },
    
    { name: "Gold 1", min: 900, color: "#eab308", icon: "🥇" },
    { name: "Gold 2", min: 800, color: "#eab308", icon: "🥇" },
    { name: "Gold 3", min: 700, color: "#eab308", icon: "🥇" },
    { name: "Gold 4", min: 600, color: "#eab308", icon: "🥇" },
    
    { name: "Silver 1", min: 500, color: "#9ca3af", icon: "🥈" },
    { name: "Silver 2", min: 400, color: "#9ca3af", icon: "🥈" },
    { name: "Silver 3", min: 300, color: "#9ca3af", icon: "🥈" },
    
    { name: "Bronze 1", min: 200, color: "#b45309", icon: "🥉" },
    { name: "Bronze 2", min: 100, color: "#b45309", icon: "🥉" },
    { name: "Bronze 3", min: 0, color: "#b45309", icon: "🥉" }
  ];

  const tier = tiers.find(t => rp >= t.min) || tiers[tiers.length - 1];
  return { ...tier, levelName: `${tier.name} ${tier.icon}` };
}

export async function savePlayerRankedStats(db, playerName, rankChange) {
  try {
    const { doc, setDoc, getDoc } = await import("firebase/firestore");
    const pKey = playerName.trim().toLowerCase();
    const playerRef = doc(db, "players", pKey);
    const playerSnap = await getDoc(playerRef);

    const currentRP = Number(localStorage.getItem("frazons-ranked-points")) || 0;
    const newRP = Math.max(0, currentRP + rankChange);
    localStorage.setItem("frazons-ranked-points", newRP.toString());

    if (playerSnap.exists()) {
      const current = playerSnap.data();
      const updatedRP = Math.max(0, (Number(current.rankedPoints) || 0) + rankChange);
      await setDoc(playerRef, {
        ...current,
        name: playerName,
        rankedPoints: updatedRP,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } else {
      await setDoc(playerRef, {
        name: playerName,
        gamesPlayed: 0,
        wins: 0,
        totalScore: 0,
        rankedPoints: newRP,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  } catch (error) {
    console.error("Failed to save player ranked stats:", error);
  }
}

export async function getTopRankedPlayers(db, limit = 100) {
  try {
    const { collection, query, orderBy, limit: dbLimit, getDocs } = await import("firebase/firestore");
    const q = query(
      collection(db, "players"),
      orderBy("rankedPoints", "desc"),
      dbLimit(limit)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        rank: index + 1
      };
    });
  } catch (error) {
    console.error("Failed to fetch top ranked players:", error);
    return [];
  }
}

export function initializeQuests(forceReset = false) {
  try {
    const saved = localStorage.getItem("frazons-quest-progress");
    const now = Date.now();
    const todayStr = new Date().toISOString().split("T")[0];
    
    let progress = saved ? JSON.parse(saved) : null;
    
    const defaultDailies = [
      { id: "daily_win_bot", title: "Warmup: Win 1 Practice Match", current: 0, target: 1, xpReward: 50, claimed: false },
      { id: "daily_declare_low", title: "Showdown: Declare with <10 pts", current: 0, target: 1, xpReward: 100, claimed: false },
      { id: "daily_slash", title: "Slash Master: Perform a Card Slash", current: 0, target: 1, xpReward: 150, claimed: false }
    ];
    
    const defaultWeeklies = [
      { id: "weekly_ranked_plays", title: "Gladiator: Complete 5 Ranked Duels", current: 0, target: 5, xpReward: 300, claimed: false },
      { id: "weekly_low_win", title: "Least Count: Match win with <20 pts", current: 0, target: 1, xpReward: 500, claimed: false },
      { id: "weekly_ranked_wins", title: "Dominator: Win 3 Ranked Matches", current: 0, target: 3, xpReward: 400, claimed: false }
    ];

    if (!progress) {
      progress = {
        lastCheckedDaily: todayStr,
        lastCheckedWeekly: now,
        dailyQuests: defaultDailies,
        weeklyQuests: defaultWeeklies
      };
      localStorage.setItem("frazons-quest-progress", JSON.stringify(progress));
      return progress;
    }

    let changed = false;

    if (progress.lastCheckedDaily !== todayStr || forceReset) {
      progress.dailyQuests = defaultDailies;
      progress.lastCheckedDaily = todayStr;
      changed = true;
    }

    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    if (now - progress.lastCheckedWeekly >= sevenDaysMs || forceReset) {
      progress.weeklyQuests = defaultWeeklies;
      progress.lastCheckedWeekly = now;
      changed = true;
    }

    if (changed) {
      localStorage.setItem("frazons-quest-progress", JSON.stringify(progress));
    }
    return progress;
  } catch (e) {
    console.error("Failed to initialize quests:", e);
    return null;
  }
}

export function updateQuestProgress(questId, increment = 1) {
  try {
    const saved = localStorage.getItem("frazons-quest-progress");
    if (!saved) return;
    const progress = JSON.parse(saved);

    let updated = false;
    
    progress.dailyQuests = progress.dailyQuests.map(q => {
      if (q.id === questId && !q.claimed) {
        q.current = Math.min(q.target, q.current + increment);
        updated = true;
      }
      return q;
    });

    progress.weeklyQuests = progress.weeklyQuests.map(q => {
      if (q.id === questId && !q.claimed) {
        q.current = Math.min(q.target, q.current + increment);
        updated = true;
      }
      return q;
    });

    if (updated) {
      localStorage.setItem("frazons-quest-progress", JSON.stringify(progress));
    }
  } catch (e) {
    console.error("Failed to update quest progress:", e);
  }
}

export async function claimQuestReward(db, questId) {
  try {
    const saved = localStorage.getItem("frazons-quest-progress");
    if (!saved) return 0;
    const progress = JSON.parse(saved);

    let rewardXP = 0;
    let found = false;

    progress.dailyQuests = progress.dailyQuests.map(q => {
      if (q.id === questId && q.current >= q.target && !q.claimed) {
        q.claimed = true;
        rewardXP = q.xpReward;
        found = true;
      }
      return q;
    });

    if (!found) {
      progress.weeklyQuests = progress.weeklyQuests.map(q => {
        if (q.id === questId && q.current >= q.target && !q.claimed) {
          q.claimed = true;
          rewardXP = q.xpReward;
          found = true;
        }
        return q;
      });
    }

    if (found && rewardXP > 0) {
      localStorage.setItem("frazons-quest-progress", JSON.stringify(progress));
      
      const statsSaved = localStorage.getItem("frazons-career-stats");
      const stats = statsSaved ? JSON.parse(statsSaved) : {};
      stats.bonusXP = (Number(stats.bonusXP) || 0) + rewardXP;
      localStorage.setItem("frazons-career-stats", JSON.stringify(stats));

      const rawName = localStorage.getItem("playerName") || "";
      if (rawName) {
        const pKey = rawName.split("-")[0]?.toLowerCase()?.trim();
        if (pKey) {
          const { doc, updateDoc, increment } = await import("firebase/firestore");
          const playerRef = doc(db, "players", pKey);
          await updateDoc(playerRef, {
            totalScore: increment(rewardXP)
          }).catch(() => {});
        }
      }
      return rewardXP;
    }
    return 0;
  } catch (e) {
    console.error("Failed to claim quest reward:", e);
    return 0;
  }
}

export async function getPlayerProfileByUid(db, uid) {
  try {
    const { collection, query, where, getDocs } = await import("firebase/firestore");
    const q = query(collection(db, "players"), where("uid", "==", uid));
    const snap = await getDocs(q);
    if (!snap.empty) {
      return snap.docs[0].data();
    }
    return null;
  } catch (error) {
    console.error("Failed to fetch player profile by UID:", error);
    return null;
  }
}

export async function checkNicknameAvailable(db, nickname) {
  try {
    const { doc, getDoc } = await import("firebase/firestore");
    const pKey = nickname.toLowerCase().trim().replace(/\s+/g, "_");
    if (!pKey) return false;
    const playerRef = doc(db, "players", pKey);
    const snap = await getDoc(playerRef);
    return !snap.exists();
  } catch (error) {
    console.error("Failed to check nickname availability:", error);
    return false;
  }
}

export async function createPlayerProfile(db, uid, nickname, initialStats = {}) {
  try {
    const { doc, setDoc } = await import("firebase/firestore");
    const pKey = nickname.toLowerCase().trim().replace(/\s+/g, "_");
    const playerRef = doc(db, "players", pKey);
    const profile = {
      name: nickname,
      uid: uid,
      avatar: initialStats.avatar || "👾",
      gamesPlayed: Number(initialStats.gamesPlayed) || 0,
      wins: Number(initialStats.wins) || 0,
      totalScore: Number(initialStats.totalScore) || 0,
      rankedPoints: Number(initialStats.rankedPoints) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await setDoc(playerRef, profile);
    return profile;
  } catch (error) {
    console.error("Failed to create player profile:", error);
    throw error;
  }
}
