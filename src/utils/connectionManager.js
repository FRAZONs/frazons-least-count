export async function updatePlayerHeartbeat(db, roomCode, playerName) {
  try {
    const { updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
    const roomRef = doc(db, "rooms", roomCode);

    await updateDoc(roomRef, {
      [`playerStatus.${playerName}`]: {
        lastHeartbeat: serverTimestamp(),
        status: "active"
      }
    });
  } catch (error) {
    console.error("Heartbeat update failed:", error);
  }
}

export function getPlayerStatus(room, playerName, timeoutMs = 30000) {
  if (!room?.playerStatus?.[playerName]) return "unknown";

  const lastHeartbeat = room.playerStatus[playerName].lastHeartbeat;
  if (!lastHeartbeat) return "unknown";

  const timeSinceHeartbeat = Date.now() - lastHeartbeat;
  if (timeSinceHeartbeat > timeoutMs) return "offline";

  return room.playerStatus[playerName].status || "active";
}

export function initializePlayerStatus(players) {
  const status = {};
  players.forEach((player) => {
    status[player.name || player] = {
      status: "waiting",
      lastHeartbeat: Date.now()
    };
  });
  return status;
}
