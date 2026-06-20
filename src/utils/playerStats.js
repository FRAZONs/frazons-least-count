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

    const q = query(
      collection(db, "players"),
      orderBy(sortBy === "wins" ? "wins" : "totalScore", "desc"),
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
    return (onlineWins * 150) + (offlineWins * 50) + (rounds * 5);
  } catch {
    return 0;
  }
}
