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
