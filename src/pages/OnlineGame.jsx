import { useCallback, useEffect, useMemo, useState } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../hooks/useToast";
import {
  createRoundState,
  finishRound,
  getDisplayName,
  getHandValue,
  getNextPlayerIndex,
  getSettings,
  playerKey,
  refillDrawPile
} from "../utils/onlineGame";

const panelStyle = {
  padding: 18,
  borderRadius: 16,
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)"
};

const actionButton = (background, disabled = false) => ({
  padding: "12px 16px",
  border: 0,
  borderRadius: 12,
  background: disabled ? "#555" : background,
  color: "white",
  fontWeight: "bold",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.65 : 1
});

export default function OnlineGame({ room, setRoom, setScreen }) {
  const [selectedCards, setSelectedCards] = useState([]);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const playerName = localStorage.getItem("playerName") || "";
  const { warning, error: showError } = useToast();

  useEffect(() => {
    if (!room?.roomCode) return undefined;
    return onSnapshot(doc(db, "rooms", room.roomCode), (snapshot) => {
      if (!snapshot.exists()) {
        setScreen("home");
        return;
      }
      setRoom(snapshot.data());
    });
  }, [room?.roomCode, setRoom, setScreen]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(timer);
  }, []);

  const roomCode = room?.roomCode;
  const roomRef = useMemo(
    () => (roomCode ? doc(db, "rooms", roomCode) : null),
    [roomCode]
  );
  const myCards = room?.hands?.[playerName] || [];
  const currentPlayer = room?.players?.[room?.currentPlayer];
  const isMyTurn = playerKey(currentPlayer?.name) === playerName;
  const isHost = playerKey(room?.host?.name) === playerName;
  const timeLeft = Math.max(0, Math.ceil(((room?.turnDeadline || now) - now) / 1000));
  const myCount = getHandValue(myCards, room?.jokerCard?.rank);

  const displayTotals = useMemo(
    () =>
      (room?.players || []).map((player) => {
        const key = playerKey(player.name);
        return {
          key,
          name: player.name,
          cards: room?.handCounts?.[key] ?? room?.hands?.[key]?.length ?? 0,
          total: room?.totals?.[key] || 0,
          eliminated: Boolean(room?.eliminated?.[key])
        };
      }),
    [room]
  );

  const runAction = async (action, fallbackMessage) => {
    if (!roomRef || busy) return;
    setBusy(true);
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) throw new Error("ROOM_MISSING");
        const updates = action(snapshot.data());
        transaction.update(roomRef, updates);
      });
    } catch (err) {
      const messages = {
        NOT_YOUR_TURN: "It is not your turn",
        DRAW_REQUIRED: "Choose a card to draw first",
        INVALID_SELECTION: "Select cards with the same rank",
        STATE_CHANGED: "The game changed. Please try again",
        NO_CARD: "There are no cards available to draw",
        ROOM_MISSING: "This room no longer exists"
      };
      showError(messages[err.message] || fallbackMessage);
      console.error(err);
    } finally {
      setBusy(false);
    }
  };

  const assertTurn = (currentRoom, allowPendingDraw = false) => {
    if (currentRoom.status !== "playing") throw new Error("STATE_CHANGED");
    const turnPlayer = currentRoom.players?.[currentRoom.currentPlayer];
    if (playerKey(turnPlayer?.name) !== playerName) throw new Error("NOT_YOUR_TURN");
    if (!allowPendingDraw && currentRoom.pendingDraw) throw new Error("DRAW_REQUIRED");
  };

  const playSelectedCards = () => {
    if (!selectedCards.length) {
      warning("Select at least one card");
      return;
    }

    runAction((currentRoom) => {
      assertTurn(currentRoom);
      const hand = currentRoom.hands?.[playerName] || [];
      const indexes = [...selectedCards].sort((a, b) => a - b);
      if (indexes.some((index) => !hand[index])) throw new Error("STATE_CHANGED");

      const selected = indexes.map((index) => hand[index]);
      if (!selected.every((card) => card.rank === selected[0].rank)) {
        throw new Error("INVALID_SELECTION");
      }

      const hands = { ...currentRoom.hands };
      hands[playerName] = hand.filter((_, index) => !indexes.includes(index));
      const newOpenCard = selected[selected.length - 1];
      const discardPile = [
        ...(currentRoom.discardPile || []),
        ...selected.slice(0, -1)
      ];
      const handCounts = {
        ...(currentRoom.handCounts || {}),
        [playerName]: hands[playerName].length
      };

      if (hands[playerName].length === 0) {
        const roundScores = Object.fromEntries(
          Object.entries(hands).map(([key, cards]) => [
            key,
            getHandValue(cards, currentRoom.jokerCard?.rank)
          ])
        );
        return {
          hands,
          handCounts,
          openCard: newOpenCard,
          discardPile: [...discardPile, currentRoom.openCard].filter(Boolean),
          ...finishRound(currentRoom, roundScores, {
            type: "empty-hand",
            winners: [getDisplayName(currentRoom.players, playerName)]
          })
        };
      }

      const nextPlayer = getNextPlayerIndex(currentRoom);
      const turnDeadline = Date.now() + getSettings(currentRoom.settings).turnSeconds * 1000;
      const isSlash = selected[0].rank === currentRoom.openCard?.rank;

      if (isSlash) {
        return {
          hands,
          handCounts,
          openCard: newOpenCard,
          discardPile: [...discardPile, currentRoom.openCard].filter(Boolean),
          previousOpenCard: null,
          pendingDraw: false,
          pendingPlayer: null,
          currentPlayer: nextPlayer,
          turnDeadline
        };
      }

      return {
        hands,
        handCounts,
        openCard: newOpenCard,
        discardPile,
        previousOpenCard: currentRoom.openCard,
        pendingDraw: true,
        pendingPlayer: playerName,
        turnDeadline
      };
    }, "Could not play those cards");
    setSelectedCards([]);
  };

  const drawCard = (useOpenCard) => {
    runAction((currentRoom) => {
      assertTurn(currentRoom, true);
      if (!currentRoom.pendingDraw || currentRoom.pendingPlayer !== playerName) {
        throw new Error("STATE_CHANGED");
      }

      const hands = { ...currentRoom.hands };
      const hand = [...(hands[playerName] || [])];
      let drawPile = [...(currentRoom.drawPile || [])];
      let discardPile = [...(currentRoom.discardPile || [])];
      let card = currentRoom.previousOpenCard;

      if (!useOpenCard) {
        if (card) discardPile.push(card);
        const refilled = refillDrawPile(drawPile, discardPile);
        drawPile = refilled.drawPile;
        discardPile = refilled.discardPile;
        card = drawPile.pop();
      }
      if (!card) throw new Error("NO_CARD");

      hand.push(card);
      hands[playerName] = hand;
      const nextPlayer = getNextPlayerIndex(currentRoom);
      return {
        hands,
        handCounts: { ...(currentRoom.handCounts || {}), [playerName]: hand.length },
        drawPile,
        discardPile,
        previousOpenCard: null,
        pendingDraw: false,
        pendingPlayer: null,
        currentPlayer: nextPlayer,
        turnDeadline:
          Date.now() + getSettings(currentRoom.settings).turnSeconds * 1000
      };
    }, "Could not draw a card");
  };

  const declareLeastCount = () => {
    runAction((currentRoom) => {
      assertTurn(currentRoom);
      const currentSettings = getSettings(currentRoom.settings);
      const originalScores = Object.fromEntries(
        Object.entries(currentRoom.hands || {}).map(([key, cards]) => [
          key,
          getHandValue(cards, currentRoom.jokerCard?.rank)
        ])
      );
      const declarerScore = originalScores[playerName];
      const opponents = Object.entries(originalScores).filter(([key]) => key !== playerName);
      const declarationWon = opponents.every(([, score]) =>
        currentSettings.tieBehavior === "declarer-wins"
          ? declarerScore <= score
          : declarerScore < score
      );
      const roundScores = { ...originalScores };
      if (!declarationWon) {
        roundScores[playerName] += currentSettings.declarationPenalty;
      }
      const lowest = Math.min(...Object.values(roundScores));
      const winners = Object.entries(roundScores)
        .filter(([, score]) => score === lowest)
        .map(([key]) => getDisplayName(currentRoom.players, key));

      return finishRound(currentRoom, roundScores, {
        type: "declaration",
        declarer: getDisplayName(currentRoom.players, playerName),
        declarerKey: playerName,
        declarationWon,
        penalty: declarationWon ? 0 : currentSettings.declarationPenalty,
        originalScores,
        winners
      });
    }, "Could not declare Least Count");
  };

  const handleTimeout = useCallback(async () => {
    if (!roomRef || room?.status !== "playing" || !room?.turnDeadline) return;
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) return;
        const currentRoom = snapshot.data();
        if (
          currentRoom.status !== "playing" ||
          currentRoom.turnDeadline !== room.turnDeadline ||
          Date.now() < currentRoom.turnDeadline
        ) return;

        const timedOutPlayer = playerKey(
          currentRoom.players?.[currentRoom.currentPlayer]?.name
        );
        const updates = {
          timeoutCounts: {
            ...(currentRoom.timeoutCounts || {}),
            [timedOutPlayer]: (currentRoom.timeoutCounts?.[timedOutPlayer] || 0) + 1
          },
          pendingDraw: false,
          pendingPlayer: null,
          previousOpenCard: null,
          currentPlayer: getNextPlayerIndex(currentRoom),
          turnDeadline:
            Date.now() + getSettings(currentRoom.settings).turnSeconds * 1000
        };

        if (currentRoom.pendingDraw && currentRoom.pendingPlayer === timedOutPlayer) {
          const hands = { ...currentRoom.hands };
          const hand = [...(hands[timedOutPlayer] || [])];
          let discardPile = [...(currentRoom.discardPile || [])];
          let drawPile = [...(currentRoom.drawPile || [])];
          if (currentRoom.previousOpenCard) discardPile.push(currentRoom.previousOpenCard);
          const refilled = refillDrawPile(drawPile, discardPile);
          drawPile = refilled.drawPile;
          discardPile = refilled.discardPile;
          const card = drawPile.pop();
          if (card) hand.push(card);
          hands[timedOutPlayer] = hand;
          Object.assign(updates, {
            hands,
            handCounts: {
              ...(currentRoom.handCounts || {}),
              [timedOutPlayer]: hand.length
            },
            drawPile,
            discardPile
          });
        }
        transaction.update(roomRef, updates);
      });
    } catch (err) {
      console.error("Timeout handling failed", err);
    }
  }, [room, roomRef]);

  useEffect(() => {
    if (timeLeft === 0) handleTimeout();
  }, [handleTimeout, timeLeft]);

  const startNextRound = () => {
    runAction((currentRoom) => {
      if (playerKey(currentRoom.host?.name) !== playerName) throw new Error("NOT_HOST");
      if (currentRoom.status !== "round-finished") throw new Error("STATE_CHANGED");
      return createRoundState(currentRoom, (currentRoom.roundNumber || 1) + 1);
    }, "Only the host can start the next round");
  };

  const rematch = () => {
    runAction((currentRoom) => {
      if (playerKey(currentRoom.host?.name) !== playerName) throw new Error("NOT_HOST");
      if (currentRoom.status !== "finished") throw new Error("STATE_CHANGED");
      const resetRoom = {
        ...currentRoom,
        eliminated: {},
        totals: Object.fromEntries(
          (currentRoom.players || []).map((player) => [playerKey(player.name), 0])
        )
      };
      return {
        eliminated: {},
        totals: resetRoom.totals,
        history: [],
        timeoutCounts: {},
        ...createRoundState(resetRoom, 1)
      };
    }, "Only the host can start a rematch");
  };

  const leaveGame = async () => {
    if (roomRef) {
      try {
        await runTransaction(db, async (transaction) => {
          const snapshot = await transaction.get(roomRef);
          if (!snapshot.exists()) return;
          const currentRoom = snapshot.data();
          const players = (currentRoom.players || []).filter(
            (player) => playerKey(player.name) !== playerName
          );
          const updates = {
            players,
            eliminated: { ...(currentRoom.eliminated || {}), [playerName]: true }
          };
          if (playerKey(currentRoom.host?.name) === playerName && players.length) {
            updates.host = players[0];
          }
          if (playerKey(currentRoom.players?.[currentRoom.currentPlayer]?.name) === playerName) {
            updates.currentPlayer = getNextPlayerIndex({
              ...currentRoom,
              eliminated: updates.eliminated
            });
            updates.turnDeadline =
              Date.now() + getSettings(currentRoom.settings).turnSeconds * 1000;
          }
          transaction.update(roomRef, updates);
        });
      } catch (err) {
        console.error(err);
      }
    }
    setRoom(null);
    setScreen("home");
  };

  const result = room?.roundResult;
  const isRoundOver = room?.status === "round-finished" || room?.status === "finished";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        color: "white",
        padding: 20
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>Least Count Online</h1>
            <div style={{ color: "#c084fc" }}>Round {room?.roundNumber || 1}</div>
          </div>
          <button onClick={leaveGame} style={actionButton("#444")}>Leave</button>
        </div>

        {isRoundOver && (
          <section style={{ ...panelStyle, marginTop: 20, borderColor: "#00b894" }}>
            <h2 style={{ marginTop: 0 }}>
              {room.status === "finished"
                ? `Match Winner: ${room.matchWinner || room.winner}`
                : `Round Winner: ${room.winner}`}
            </h2>
            {result?.type === "declaration" && (
              <p style={{ color: result.declarationWon ? "#00ff88" : "#ff7675" }}>
                {result.declarer} {result.declarationWon ? "won" : "lost"} the declaration
                {result.penalty ? ` and received ${result.penalty} penalty points` : ""}.
              </p>
            )}
            <ScoreRows room={room} scores={result?.scores || room?.scores} />
            {room.status === "round-finished" && isHost && (
              <button onClick={startNextRound} disabled={busy} style={actionButton("#6c5ce7", busy)}>
                Start Next Round
              </button>
            )}
            {room.status === "finished" && isHost && (
              <button onClick={rematch} disabled={busy} style={actionButton("#ff00c8", busy)}>
                Rematch
              </button>
            )}
            {!isHost && <p style={{ color: "#aaa" }}>Waiting for the host...</p>}
          </section>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
            gap: 16,
            marginTop: 20
          }}
        >
          <section style={panelStyle}>
            <div style={{ color: "#aaa" }}>Joker</div>
            <h2>{room?.jokerCard?.rank}{room?.jokerCard?.suit}</h2>
          </section>
          <section style={panelStyle}>
            <div style={{ color: "#aaa" }}>Open Card</div>
            <h2>{room?.openCard?.rank}{room?.openCard?.suit}</h2>
          </section>
          <section style={panelStyle}>
            <div style={{ color: "#aaa" }}>Turn</div>
            <h2>{currentPlayer?.name || "-"}</h2>
            {room?.status === "playing" && (
              <div style={{ color: timeLeft <= 5 ? "#ff7675" : "#00e5ff" }}>
                {timeLeft}s remaining
              </div>
            )}
          </section>
        </div>

        <section style={{ ...panelStyle, marginTop: 20 }}>
          <h2>Players</h2>
          {displayTotals.map((player) => (
            <div
              key={player.key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 16,
                padding: "10px 0",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                opacity: player.eliminated ? 0.5 : 1
              }}
            >
              <span>{player.name}{player.eliminated ? " (eliminated)" : ""}</span>
              <span>{player.cards} cards</span>
              <strong>{player.total} pts</strong>
            </div>
          ))}
        </section>

        {!isRoundOver && (
          <section style={{ ...panelStyle, marginTop: 20 }}>
            <div style={{ color: "#00ff88", fontWeight: "bold", marginBottom: 14 }}>
              Your count: {myCount}
            </div>

            {room?.pendingDraw && room?.pendingPlayer === playerName && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button onClick={() => drawCard(false)} disabled={busy} style={actionButton("#00b894", busy)}>
                  Draw From Deck
                </button>
                <button
                  onClick={() => drawCard(true)}
                  disabled={busy || !room.previousOpenCard}
                  style={actionButton("#0984e3", busy || !room.previousOpenCard)}
                >
                  Pick Previous Open Card
                </button>
              </div>
            )}

            {isMyTurn && !room?.pendingDraw && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={playSelectedCards}
                  disabled={busy || !selectedCards.length}
                  style={actionButton("#ff00c8", busy || !selectedCards.length)}
                >
                  Play Selected
                </button>
                <button onClick={declareLeastCount} disabled={busy} style={actionButton("#f39c12", busy)}>
                  Declare Least Count
                </button>
              </div>
            )}

            <h2>Your Hand</h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
              {myCards.map((card, index) => {
                const selected = selectedCards.includes(index);
                return (
                  <button
                    key={`${card.rank}-${card.suit || "joker"}-${index}`}
                    onClick={() => {
                      if (!isMyTurn || room?.pendingDraw) return;
                      setSelectedCards((current) =>
                        current.includes(index)
                          ? current.filter((cardIndex) => cardIndex !== index)
                          : [...current, index]
                      );
                    }}
                    style={{
                      width: 82,
                      height: 118,
                      borderRadius: 12,
                      border: selected ? "3px solid #00e5ff" : "1px solid #ddd",
                      background: "white",
                      color: "black",
                      fontSize: 18,
                      fontWeight: "bold",
                      transform: selected ? "translateY(-8px)" : "none",
                      cursor: isMyTurn ? "pointer" : "default"
                    }}
                  >
                    {card.rank}{card.suit}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <div style={{ marginTop: 14, color: "#888", fontSize: 12 }}>
          Opponent cards are shown only as counts. Secure card secrecy requires authenticated
          per-player Firestore documents and matching security rules.
        </div>
      </div>
    </div>
  );
}

function ScoreRows({ room, scores = {} }) {
  return (
    <div style={{ marginBottom: 16 }}>
      {(room?.players || []).map((player) => {
        const key = playerKey(player.name);
        return (
          <div
            key={key}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "8px 0",
              borderBottom: "1px solid rgba(255,255,255,0.1)"
            }}
          >
            <span>{player.name}</span>
            <span>
              Round {scores?.[key] || 0} | Total {room?.totals?.[key] || 0}
            </span>
          </div>
        );
      })}
    </div>
  );
}
