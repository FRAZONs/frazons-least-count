import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "../firebase";
import { useToast } from "../hooks/useToast";
import { motion, AnimatePresence } from "framer-motion";
import PlayingCard from "../components/PlayingCard";
import {
  playCardDrawSound,
  playCardPlaySound,
  playCardSelectSound,
  playEmojiSound,
  playShufflingSound,
  playHeartbeatSound,
  playQuickChatSound
} from "../utils/audio";
import { updateLocalStats } from "../utils/playerStats";
import TutorialOverlay from "../components/TutorialOverlay";
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

const cardVariants = {
  hidden: {
    opacity: 0,
    y: -150,
    scale: 0.8,
    rotate: -15
  },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    scale: 1,
    rotate: 0,
    transition: {
      delay: index * 0.08, // deal card every 80ms
      type: "spring",
      stiffness: 140,
      damping: 16
    }
  })
};

const BOARD_THEMES = {
  "cyber-violet": {
    bg: "radial-gradient(circle, rgba(29,7,56,0.95) 0%, rgba(13,3,26,0.98) 100%)",
    border: "2px solid rgba(192, 132, 252, 0.35)",
    text: "#c084fc",
    badgeBg: "rgba(192, 132, 252, 0.15)",
    tableGlow: "0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(0,229,255,0.06)",
    color: "#c084fc"
  },
  "classic-green": {
    bg: "radial-gradient(circle, rgba(16,77,33,0.98) 0%, rgba(5,36,13,1) 100%)",
    border: "2.5px double rgba(251, 191, 36, 0.6)",
    text: "#fbbf24",
    badgeBg: "rgba(251, 191, 36, 0.15)",
    tableGlow: "0 10px 40px rgba(0,0,0,0.75), inset 0 0 60px rgba(251, 191, 36, 0.08)",
    color: "#fbbf24"
  },
  "neon-blue": {
    bg: "radial-gradient(circle, rgba(10,40,75,0.95) 0%, rgba(2,12,25,0.98) 100%)",
    border: "2px solid rgba(0, 229, 255, 0.45)",
    text: "#00e5ff",
    badgeBg: "rgba(0, 229, 255, 0.15)",
    tableGlow: "0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(0, 229, 255, 0.08)",
    color: "#00e5ff"
  },
  "dark-carbon": {
    bg: "radial-gradient(circle, #2c3e50 0%, #0f171e 100%)",
    border: "2px solid rgba(149, 165, 166, 0.35)",
    text: "#bdc3c7",
    badgeBg: "rgba(149, 165, 166, 0.15)",
    tableGlow: "0 10px 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.03)",
    color: "#bdc3c7"
  }
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

  const [animatingCard, setAnimatingCard] = useState(null);
  const [animatingPlay, setAnimatingPlay] = useState(null);

  const [sortBy, setSortBy] = useState("default");
  const [revealIndex, setRevealIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const lastReactionTime = useRef({});
  const [shuffling, setShuffling] = useState(false);
  const lastRoundNumber = useRef(0);

  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem("frazons-board-theme") || "cyber-violet";
  });

  useEffect(() => {
    localStorage.setItem("frazons-board-theme", boardTheme);
  }, [boardTheme]);

  // Local Career Stats Tracking
  const roomCodeTracked = useRef(null);
  const roundTracked = useRef(0);
  const matchFinishedTracked = useRef(false);
  const lastLoggedResult = useRef(null);

  // Quick-Chat state
  const lastChatTime = useRef({});
  const [floatingChats, setFloatingChats] = useState([]);

  // Tutorial state
  const [showTutorial, setShowTutorial] = useState(() => {
    return localStorage.getItem("frazons-tutorial-completed") !== "true";
  });
  const [showChatMenu, setShowChatMenu] = useState(false);
  const reactMenuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (reactMenuRef.current && !reactMenuRef.current.contains(event.target)) {
        setShowChatMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (!room?.quickChats) return;

    Object.entries(room.quickChats).forEach(([key, data]) => {
      const lastSeen = lastChatTime.current[key] || 0;
      if (data.timestamp > lastSeen) {
        lastChatTime.current[key] = data.timestamp;

        playQuickChatSound();

        const newChat = {
          id: `${key}-${data.timestamp}`,
          playerKey: key,
          message: data.message
        };
        setFloatingChats((current) => [...current, newChat]);

        setTimeout(() => {
          setFloatingChats((current) => current.filter((item) => item.id !== newChat.id));
        }, 3000);
      }
    });
  }, [room?.quickChats]);

  // Heartbeat suspense reveal loop
  useEffect(() => {
    if (!isRoundOver) return undefined;

    const playersCount = room?.players?.length || 1;
    const speed = 1.0 + (revealIndex / playersCount) * 1.2;

    const intervalTime = 1000 / speed;
    const heartbeatTimer = setInterval(() => {
      playHeartbeatSound(speed);
    }, intervalTime);

    return () => clearInterval(heartbeatTimer);
  }, [isRoundOver, revealIndex, room?.players?.length]);

  useEffect(() => {
    if (room?.roomCode && roomCodeTracked.current !== room.roomCode) {
      roomCodeTracked.current = room.roomCode;
      updateLocalStats({ onlineMatchesPlayed: 1 });
    }
  }, [room?.roomCode]);

  useEffect(() => {
    if (room?.roundNumber && room.status === "playing" && room.roundNumber !== roundTracked.current) {
      roundTracked.current = room.roundNumber;
      updateLocalStats({ totalRoundsPlayed: 1 });
    }
  }, [room?.roundNumber, room?.status]);

  useEffect(() => {
    if (room?.status === "finished" && !matchFinishedTracked.current) {
      matchFinishedTracked.current = true;
      const matchWinnerKey = playerKey(room.matchWinner || room.winner || "");
      if (matchWinnerKey === playerName) {
        updateLocalStats({ onlineMatchesWon: 1 });
      }
    } else if (room?.status !== "finished") {
      matchFinishedTracked.current = false;
    }
  }, [room?.status, room?.matchWinner, room?.winner, playerName]);

  useEffect(() => {
    if (room?.roundResult && room.roundResult !== lastLoggedResult.current) {
      lastLoggedResult.current = room.roundResult;
      
      const myEndingCards = room.hands?.[playerName] || [];
      const myEndingScore = getHandValue(myEndingCards, room.jokerCard?.rank);
      updateLocalStats({ totalPointsAccumulated: myEndingScore });

      if (room.roundResult.type === "declaration" && room.roundResult.declarerKey === playerName) {
        if (room.roundResult.declarationWon) {
          updateLocalStats({ declarationsMade: 1, declarationsWon: 1 });
        } else {
          updateLocalStats({ declarationsMade: 1, declarationsLost: 1 });
        }
      }
    }
  }, [room?.roundResult, playerName, room?.jokerCard?.rank]);

  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const previousOpenRef = useRef(null);
  const handRef = useRef(null);
  const handCardRefs = useRef([]);

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

  const isRoundOver = room?.status === "round-finished" || room?.status === "finished";

  useEffect(() => {
    if (!room?.reactions) return;

    Object.entries(room.reactions).forEach(([key, data]) => {
      const lastSeen = lastReactionTime.current[key] || 0;
      if (data.timestamp > lastSeen) {
        lastReactionTime.current[key] = data.timestamp;

        playEmojiSound();

        const newFloating = {
          id: `${key}-${data.timestamp}`,
          playerKey: key,
          emoji: data.emoji
        };
        setFloatingEmojis((current) => [...current, newFloating]);

        setTimeout(() => {
          setFloatingEmojis((current) => current.filter((item) => item.id !== newFloating.id));
        }, 2000);
      }
    });
  }, [room?.reactions]);

  useEffect(() => {
    if (!isRoundOver) {
      setRevealIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setRevealIndex((prev) => {
        const playersCount = room?.players?.length || 0;
        if (prev < playersCount) {
          playCardDrawSound();
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isRoundOver, room?.players?.length]);

  useEffect(() => {
    if (!room?.roundNumber) return;
    if (lastRoundNumber.current !== room.roundNumber && room.status === "playing") {
      lastRoundNumber.current = room.roundNumber;

      playShufflingSound();
      setShuffling(true);
      const timer = setTimeout(() => {
        setShuffling(false);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [room?.roundNumber, room?.status]);

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
  const declarationThreshold = room?.settings?.declarationThreshold !== undefined
    ? room.settings.declarationThreshold
    : (room?.settings?.maxScore === 100 ? 10 : 20);
  const canDeclare = myCount <= declarationThreshold;

  const discardList = useMemo(() => room?.discardPile || [], [room?.discardPile]);
  const topDiscards = useMemo(() => discardList.slice(-3), [discardList]);

  const getSeededAngle = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 20) - 10; // -10 to 10 deg
  }, []);

  const getSeededX = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 14) - 7; // -7 to 7px offset
  }, []);

  const getSeededY = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 14) - 7; // -7 to 7px offset
  }, []);

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

  const handlePlaySelected = () => {
    if (!selectedCards.length || busy) return;

    const targetEl = discardRef.current;
    const animatedList = [];

    selectedCards.forEach((cardIdx) => {
      const cardEl = handCardRefs.current[cardIdx];
      if (cardEl && targetEl) {
        const startRect = cardEl.getBoundingClientRect();
        const endRect = targetEl.getBoundingClientRect();

        animatedList.push({
          card: myCards[cardIdx],
          start: {
            x: startRect.left + startRect.width / 2,
            y: startRect.top + startRect.height / 2,
            width: startRect.width,
            height: startRect.height
          },
          end: {
            x: endRect.left + endRect.width / 2,
            y: endRect.top + endRect.height / 2,
            width: endRect.width,
            height: endRect.height
          }
        });
      }
    });

    if (animatedList.length > 0) {
      playCardPlaySound();
      setAnimatingPlay(animatedList);
      setTimeout(() => {
        setAnimatingPlay(null);
      }, 600);
    } else {
      playCardPlaySound();
    }

    playSelectedCards();
  };

  const handleDraw = (useOpenCard) => {
    if (busy) return;

    const sourceEl = useOpenCard ? previousOpenRef.current : deckRef.current;
    const targetEl = handRef.current;

    if (sourceEl && targetEl) {
      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      playCardDrawSound();

      const cardInfo = useOpenCard ? room?.previousOpenCard : { rank: "JOKER", suit: "" };
      setAnimatingCard({
        card: cardInfo,
        isFaceUp: !!useOpenCard,
        start: {
          x: sourceRect.left + sourceRect.width / 2,
          y: sourceRect.top + sourceRect.height / 2,
          width: sourceRect.width,
          height: sourceRect.height
        },
        end: {
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2,
          width: 82,
          height: 118
        }
      });

      setTimeout(() => {
        setAnimatingCard(null);
      }, 600);
    } else {
      playCardDrawSound();
    }

    drawCard(useOpenCard);
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

  const sendReaction = async (emoji) => {
    if (!roomRef) return;
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) return;
        const currentRoom = snapshot.data();
        const reactions = { ...(currentRoom.reactions || {}) };
        reactions[playerName] = { emoji, timestamp: Date.now() };
        transaction.update(roomRef, { reactions });
      });
    } catch (e) {
      console.error("Failed to send reaction", e);
    }
  };

  const sendQuickChat = async (message) => {
    if (!roomRef) return;
    try {
      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(roomRef);
        if (!snapshot.exists()) return;
        const currentRoom = snapshot.data();
        const quickChats = { ...(currentRoom.quickChats || {}) };
        quickChats[playerName] = { message, timestamp: Date.now() };
        transaction.update(roomRef, { quickChats });
      });
    } catch (e) {
      console.error("Failed to send quick chat", e);
    }
  };

  const handCardsWithOriginalIndex = useMemo(() => {
    const cards = myCards.map((card, index) => ({ card, originalIndex: index }));
    if (sortBy === "value") {
      const getVal = (c) => {
        if (!c) return 0;
        if (c.rank === "JOKER" || c.rank === room?.jokerCard?.rank) return 0;
        if (c.rank === "A") return 1;
        if (["J", "Q", "K"].includes(c.rank)) return 10;
        return Number(c.rank) || 0;
      };
      cards.sort((a, b) => {
        const diff = getVal(a.card) - getVal(b.card);
        if (diff !== 0) return diff;
        if (a.card.rank !== b.card.rank) return (a.card.rank || "").localeCompare(b.card.rank || "");
        return (a.card.suit || "").localeCompare(b.card.suit || "");
      });
    }
    return cards;
  }, [myCards, sortBy, room?.jokerCard?.rank]);

  const result = room?.roundResult;

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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setShowRules(true)} style={actionButton("#c084fc")}>📖 Rules</button>
            <button onClick={leaveGame} style={actionButton("#444")}>Leave</button>
          </div>
        </div>

        {/* Visual Card Table (Board) */}
        <section
          style={{
            ...panelStyle,
            marginTop: 20,
            background: BOARD_THEMES[boardTheme]?.bg || BOARD_THEMES["cyber-violet"].bg,
            border: BOARD_THEMES[boardTheme]?.border || BOARD_THEMES["cyber-violet"].border,
            boxShadow: BOARD_THEMES[boardTheme]?.tableGlow || BOARD_THEMES["cyber-violet"].tableGlow,
            borderRadius: 24,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 24,
            position: "relative",
            transition: "all 0.5s ease"
          }}
        >
          {/* Table Header / Title */}
          <div style={{ display: "flex", justifyContent: "space-between", width: "100%", borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: 12, alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 20 }}>🌌</span>
                <span style={{ fontWeight: "bold", fontSize: 16, color: BOARD_THEMES[boardTheme]?.text || "#c084fc", letterSpacing: 1 }}>PLAYING TABLE</span>
              </div>
              <select
                value={boardTheme}
                onChange={(e) => setBoardTheme(e.target.value)}
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "white",
                  padding: "4px 10px",
                  borderRadius: 8,
                  fontSize: 12,
                  cursor: "pointer",
                  fontWeight: "bold",
                  outline: "none"
                }}
              >
                <option value="cyber-violet" style={{ background: "#13031a", color: "white" }}>🌌 Cyber Violet</option>
                <option value="classic-green" style={{ background: "#05180d", color: "white" }}>🟢 Classic Green</option>
                <option value="neon-blue" style={{ background: "#020c19", color: "white" }}>🔵 Neon Blue</option>
                <option value="dark-carbon" style={{ background: "#0f171e", color: "white" }}>⚫ Dark Carbon</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: "#aaa", fontSize: 13 }}>Current Turn:</div>
              <div style={{ fontWeight: "bold", color: isMyTurn ? "#00e5ff" : "#fff", fontSize: 15, background: isMyTurn ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 8, border: isMyTurn ? "1px solid rgba(0,229,255,0.3)" : "1px solid rgba(255,255,255,0.1)" }}>
                {isMyTurn ? "👉 Your Turn" : `${currentPlayer?.name || "-"}'s Turn`}
              </div>
              {room?.status === "playing" && (
                <div style={{ color: timeLeft <= 5 ? "#ff7675" : "#00e5ff", fontWeight: "bold", fontSize: 15 }}>
                  ⏱️ {timeLeft}s
                </div>
              )}
            </div>
          </div>

          {/* Cards Area */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 40,
              flexWrap: "wrap",
              width: "100%",
              minHeight: 160
            }}
          >
            {/* Joker Card */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#ffb03a", fontWeight: "bold", letterSpacing: 1 }}>WILD JOKER</span>
              <div style={{ position: "relative" }}>
                {room?.jokerCard ? (
                  <PlayingCard
                    card={room.jokerCard}
                    isFaceUp={true}
                    hoverable={true}
                    style={{
                      boxShadow: "0 0 20px rgba(255, 176, 58, 0.4)",
                      border: "2.5px solid #ffb03a"
                    }}
                    badge="Joker Rank"
                  />
                ) : (
                  <div style={{ width: 82, height: 118, borderRadius: 12, border: "2px dashed #444", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>None</div>
                )}
              </div>
            </div>

            {/* Draw Pile (Deck) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="tutorial-draw-deck">
              <span style={{ fontSize: 12, color: "#00e5ff", fontWeight: "bold", letterSpacing: 1 }}>DRAW DECK</span>
              <div ref={deckRef} style={{ position: "relative", width: 82, height: 118 }}>
                {/* 3D Stack effect */}
                <div style={{ position: "absolute", top: 4, left: 4, width: 82, height: 118, zIndex: 1 }}>
                  <PlayingCard card={null} isFaceUp={false} hoverable={false} style={{ opacity: 0.3 }} />
                </div>
                <div style={{ position: "absolute", top: 2, left: 2, width: 82, height: 118, zIndex: 2 }}>
                  <PlayingCard card={null} isFaceUp={false} hoverable={false} style={{ opacity: 0.6 }} />
                </div>
                <div style={{ position: "absolute", top: 0, left: 0, width: 82, height: 118, zIndex: 3 }}>
                  <PlayingCard
                    card={null}
                    isFaceUp={false}
                    hoverable={isMyTurn && room?.pendingDraw}
                    onClick={isMyTurn && room?.pendingDraw && !busy ? () => handleDraw(false) : null}
                    style={{
                      border: isMyTurn && room?.pendingDraw ? "3px solid #00e5ff" : "2px solid rgba(0, 229, 255, 0.4)",
                      boxShadow: isMyTurn && room?.pendingDraw ? "0 0 20px rgba(0,229,255,0.6)" : "0 4px 8px rgba(0,0,0,0.3)"
                    }}
                    badge={isMyTurn && room?.pendingDraw ? "CLICK TO DRAW" : "Deck"}
                  />
                </div>
              </div>
            </div>

            {/* Discard Pile (Open Card) */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#ff00c8", fontWeight: "bold", letterSpacing: 1 }}>OPEN DISCARD</span>
              <div ref={discardRef} style={{ position: "relative", width: 82, height: 118 }}>
                {room?.openCard ? (
                  <>
                    {/* Underneath cards to make a pile stack */}
                    {topDiscards.map((card, i) => {
                      const angle = getSeededAngle(card, i);
                      const x = getSeededX(card, i);
                      const y = getSeededY(card, i);
                      return (
                        <div
                          key={`discard-${card.rank}-${card.suit || "joker"}-${i}`}
                          style={{
                            position: "absolute",
                            top: y,
                            left: x,
                            width: 82,
                            height: 118,
                            transform: `rotate(${angle}deg)`,
                            zIndex: i + 1,
                            pointerEvents: "none"
                          }}
                        >
                          <PlayingCard card={card} isFaceUp={true} hoverable={false} size="md" />
                        </div>
                      );
                    })}
                    {/* Top Active Open Card */}
                    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}>
                      <PlayingCard
                        card={room.openCard}
                        isFaceUp={true}
                        hoverable={false}
                        style={{
                          border: "1px solid rgba(255, 255, 255, 0.2)",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.5)"
                        }}
                        badge="Open Card"
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ width: 82, height: 118, borderRadius: 12, border: "2px dashed #444", display: "flex", alignItems: "center", justifyContent: "center", color: "#666" }}>Empty</div>
                )}
              </div>
            </div>

            {/* Previous Open Card (Click to Pick) */}
            {room?.previousOpenCard && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#0984e3", fontWeight: "bold", letterSpacing: 1 }}>PREVIOUS OPEN</span>
                <div ref={previousOpenRef} style={{ position: "relative" }}>
                  <PlayingCard
                    card={room.previousOpenCard}
                    isFaceUp={true}
                    hoverable={isMyTurn && room?.pendingDraw}
                    onClick={isMyTurn && room?.pendingDraw && !busy ? () => handleDraw(true) : null}
                    style={{
                      border: isMyTurn && room?.pendingDraw ? "3px solid #0984e3" : "1px solid rgba(255, 255, 255, 0.2)",
                      boxShadow: isMyTurn && room?.pendingDraw ? "0 0 20px rgba(9,132,227,0.6)" : "0 4px 8px rgba(0,0,0,0.3)"
                    }}
                    badge={isMyTurn && room?.pendingDraw ? "CLICK TO PICK" : "Previous"}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        <section style={{ ...panelStyle, marginTop: 20 }}>
          <h2 style={{ marginBottom: 16 }}>Players Table</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16
            }}
          >
            {displayTotals.map((player) => {
              const isActiveTurn = currentPlayer && playerKey(currentPlayer.name) === player.key;
              const isMe = player.key === playerName;
              const statusColor = player.eliminated ? "#ef4444" : isActiveTurn ? "#00e5ff" : "rgba(255, 255, 255, 0.15)";

              // Fan of card backs
              const cardsCount = player.cards;
              const maxVisibleCards = 6;
              const numCardsToRender = Math.min(cardsCount, maxVisibleCards);
              const fannedCards = Array.from({ length: numCardsToRender });

              return (
                <div
                  key={player.key}
                  style={{
                    background: "rgba(15, 7, 24, 0.6)",
                    border: isActiveTurn
                      ? `2px solid ${statusColor}`
                      : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: isActiveTurn
                      ? `0 0 15px ${statusColor}44`
                      : "none",
                    borderRadius: 18,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    position: "relative",
                    opacity: player.eliminated ? 0.45 : 1,
                    transition: "all 0.3s ease",
                    transform: isActiveTurn ? "scale(1.02)" : "scale(1)",
                    overflow: "hidden"
                  }}
                >
                  {/* Active Turn Glowing Pulsing Bar */}
                  {isActiveTurn && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 3,
                        background: "linear-gradient(90deg, #00e5ff, #c084fc, #00e5ff)",
                        backgroundSize: "200% 100%",
                        animation: "pulse 1.5s infinite"
                      }}
                    />
                  )}

                  {/* Player Name and Points */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>
                        {player.eliminated ? "💀" : isMe ? "👤" : "🎮"}
                      </span>
                      <div>
                        <div style={{ fontWeight: "bold", color: isMe ? "#ff00c8" : "white", fontSize: 16 }}>
                          {player.name} {isMe && "(You)"}
                        </div>
                        <div style={{ fontSize: 11, color: player.eliminated ? "#ef4444" : "#aaa" }}>
                          {player.eliminated ? "Eliminated" : isActiveTurn ? "Current Turn" : "Waiting"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: "bold" }}>TOTAL POINTS</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: player.eliminated ? "#ef4444" : "#00ff88" }}>
                        {player.total} <span style={{ fontSize: 11, fontWeight: "normal", color: "#aaa" }}>pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Fan of Mini Cards (Only for active non-eliminated players) */}
                  {!player.eliminated && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 12, minHeight: 62 }}>
                      <span style={{ fontSize: 13, color: "#aaa", fontWeight: "bold" }}>Hand:</span>
                      
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        {cardsCount > 0 ? (
                          <div style={{ display: "flex", position: "relative", width: 34 + (numCardsToRender - 1) * 12, height: 50, marginRight: 8 }}>
                            {fannedCards.map((_, idx) => {
                              const mid = (numCardsToRender - 1) / 2;
                              const rot = (idx - mid) * 8;
                              const xOffset = (idx - mid) * 12;
                              return (
                                <div
                                  key={`fan-${player.key}-${idx}`}
                                  style={{
                                    position: "absolute",
                                    left: "50%",
                                    transform: `translateX(-50%) translateX(${xOffset}px) rotate(${rot}deg)`,
                                    transformOrigin: "bottom center",
                                    zIndex: idx
                                  }}
                                >
                                  <PlayingCard card={null} isFaceUp={false} hoverable={false} size="mini" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: "#888", fontSize: 12 }}>No cards</span>
                        )}
                        <span style={{ fontSize: 14, fontWeight: "bold", color: "#c084fc", background: "rgba(192, 132, 252, 0.15)", padding: "3px 8px", borderRadius: 8 }}>
                          {cardsCount} {cardsCount === 1 ? "card" : "cards"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Floating Quick Chats */}
                  <AnimatePresence>
                    {floatingChats.filter((c) => c.playerKey === player.key).map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
                        transition={{ type: "spring", stiffness: 200, damping: 15 }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "-45px",
                          transform: "translateX(-50%)",
                          background: "#00e5ff",
                          color: "black",
                          padding: "6px 14px",
                          borderRadius: 12,
                          fontWeight: "bold",
                          fontSize: 12,
                          zIndex: 110,
                          whiteSpace: "nowrap",
                          boxShadow: "0 4px 15px rgba(0,229,255,0.4)"
                        }}
                      >
                        {item.message}
                        <div
                          style={{
                            position: "absolute",
                            bottom: -5,
                            left: "50%",
                            transform: "translateX(-50%) rotate(45deg)",
                            width: 10,
                            height: 10,
                            background: "#00e5ff"
                          }}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {/* Floating Emojis */}
                  <AnimatePresence>
                    {floatingEmojis.filter((e) => e.playerKey === player.key).map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, y: 20, scale: 0.5 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: [-20, -100],
                          scale: [0.6, 1.6, 1.2]
                        }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.8, ease: "easeOut" }}
                        style={{
                          position: "absolute",
                          left: "50%",
                          top: "35%",
                          transform: "translateX(-50%)",
                          fontSize: 48,
                          zIndex: 100,
                          pointerEvents: "none",
                          textShadow: "0 0 10px rgba(0,0,0,0.5)"
                        }}
                      >
                        {item.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </section>

        {!isRoundOver && (
          <section style={{ ...panelStyle, marginTop: 20 }}>
            <div style={{ color: "#00ff88", fontWeight: "bold", marginBottom: 14 }}>
              Your count: {myCount}
            </div>

            {room?.pendingDraw && room?.pendingPlayer === playerName && (
              <div style={{
                background: "rgba(0, 229, 255, 0.1)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                padding: "12px 18px",
                borderRadius: 14,
                marginBottom: 16,
                color: "#00e5ff",
                fontWeight: "bold",
                textAlign: "center",
                boxShadow: "0 0 15px rgba(0, 229, 255, 0.1)",
                animation: "pulse 2s infinite"
              }}>
                👉 Click the DRAW DECK or PREVIOUS OPEN card on the playing table to draw!
              </div>
            )}

            {isMyTurn && !room?.pendingDraw && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={handlePlaySelected}
                  disabled={busy || !selectedCards.length}
                  style={actionButton("#ff00c8", busy || !selectedCards.length)}
                  className="tutorial-play-btn"
                >
                  Play Selected
                </button>
                {canDeclare && (
                  <button 
                    onClick={declareLeastCount} 
                    disabled={busy} 
                    style={actionButton("#f39c12", busy)}
                    className="tutorial-declare-btn"
                  >
                    Declare Least Count
                  </button>
                )}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ margin: 0 }}>Your Hand</h2>

              {/* Controls (Sort & Emojis) */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {/* Chat and Emoji Reaction dropdown */}
                <div ref={reactMenuRef} style={{ position: "relative" }}>
                  <button
                    onClick={() => setShowChatMenu(!showChatMenu)}
                    style={{
                      background: showChatMenu ? "#6c5ce7" : "rgba(255,255,255,0.08)",
                      color: "white",
                      border: "none",
                      padding: "6px 14px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      transition: "all 0.2s ease"
                    }}
                  >
                    💬 React
                  </button>

                  {showChatMenu && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "125%",
                        right: 0,
                        background: "rgba(30, 20, 50, 0.95)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid #6c5ce7",
                        borderRadius: 16,
                        padding: 12,
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 15px rgba(108,92,231,0.2)",
                        zIndex: 100,
                        display: "flex",
                        flexDirection: "column",
                        gap: 10,
                        minWidth: 220
                      }}
                    >
                      {/* Emoji Row */}
                      <div style={{ display: "flex", justifyContent: "space-around", gap: 6, background: "rgba(255,255,255,0.05)", padding: "6px 10px", borderRadius: 12 }}>
                        {["😂", "🔥", "💀", "👍", "🎉"].map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => {
                              sendReaction(emoji);
                              setShowChatMenu(false);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              fontSize: 18,
                              cursor: "pointer",
                              padding: 4,
                              transition: "transform 0.1s"
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.25)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Quick Chat List */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {["Hurry up! ⏳", "Nice hand! 👍", "Oops! 💀", "Good game! 🤝"].map((phrase) => (
                          <button
                            key={phrase}
                            onClick={() => {
                              sendQuickChat(phrase);
                              setShowChatMenu(false);
                            }}
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid rgba(255,255,255,0.06)",
                              color: "#00e5ff",
                              fontSize: 12,
                              fontWeight: "bold",
                              cursor: "pointer",
                              padding: "8px 12px",
                              borderRadius: 8,
                              textAlign: "left",
                              transition: "all 0.2s ease"
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = "rgba(0, 229, 255, 0.1)";
                              e.currentTarget.style.borderColor = "rgba(0, 229, 255, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                              e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
                            }}
                          >
                            {phrase}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort Button */}
                <button
                  onClick={() => setSortBy(prev => prev === "default" ? "value" : "default")}
                  style={{
                    background: sortBy === "value" ? "#00e5ff" : "rgba(255,255,255,0.08)",
                    color: sortBy === "value" ? "black" : "white",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: "bold",
                    cursor: "pointer"
                  }}
                >
                  {sortBy === "value" ? "🧹 Sorted" : "🔀 Sort"}
                </button>
              </div>
            </div>

            <div
              ref={handRef}
              className="tutorial-hand"
              style={{
                display: "flex",
                justifyContent: "center",
                flexWrap: "wrap",
                minHeight: 150,
                padding: "24px 0",
                gap: 0
              }}
            >
              {handCardsWithOriginalIndex.map(({ card, originalIndex }, index) => {
                const selected = selectedCards.includes(originalIndex);

                // Fan calculations
                const total = handCardsWithOriginalIndex.length;
                const mid = (total - 1) / 2;
                const rot = total > 1 ? (index - mid) * 4 : 0;
                const ty = total > 1 ? Math.abs(index - mid) * 3 : 0;
                const tx = total > 1 ? (index - mid) * -3 : 0;

                return (
                  <motion.div
                    key={`${card.rank}-${card.suit || "joker"}-${originalIndex}`}
                    ref={(el) => { handCardRefs.current[originalIndex] = el; }}
                    variants={cardVariants}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    style={{
                      marginRight: index === total - 1 ? 0 : -16,
                      transformOrigin: "bottom center"
                    }}
                  >
                    <PlayingCard
                      card={card}
                      isFaceUp={true}
                      selected={selected}
                      onClick={() => {
                        if (!isMyTurn || room?.pendingDraw) return;
                        playCardSelectSound();
                        setSelectedCards((current) =>
                          current.includes(originalIndex)
                            ? current.filter((cardIndex) => cardIndex !== originalIndex)
                            : [...current, originalIndex]
                        );
                      }}
                      hoverable={isMyTurn && !room?.pendingDraw}
                      disabled={!isMyTurn || room?.pendingDraw}
                      style={{
                        transform: selected
                          ? `translateY(-20px) rotate(0deg) translateZ(0)`
                          : `rotate(${rot}deg) translateY(${ty}px) translateX(${tx}px) translateZ(0)`
                      }}
                    />
                  </motion.div>
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

      {/* Card Shuffling Overlay */}
      <AnimatePresence>
        {shuffling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(10, 5, 20, 0.96)",
              backdropFilter: "blur(12px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 999999,
              color: "white"
            }}
          >
            <div style={{ display: "flex", gap: 20, marginBottom: 30, position: "relative", height: 160, width: 300, justifyContent: "center", alignItems: "center" }}>
              {[0, 1, 2].map((idx) => (
                <motion.div
                  key={`shuffle-card-${idx}`}
                  animate={{
                    x: idx === 0 ? [-60, 60, -60] : idx === 2 ? [60, -60, 60] : [0, 0, 0],
                    z: idx === 0 ? [0, 10, 0] : idx === 2 ? [10, 0, 10] : [5, 5, 5],
                    rotate: idx === 0 ? [-15, 15, -15] : idx === 2 ? [15, -15, 15] : [0, 0, 0],
                    scale: idx === 1 ? [1, 1.05, 1] : [0.95, 0.95, 0.95]
                  }}
                  transition={{
                    duration: 1.0,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  style={{
                    position: "absolute",
                    width: 90,
                    height: 130
                  }}
                >
                  <PlayingCard card={null} isFaceUp={false} hoverable={false} />
                </motion.div>
              ))}
            </div>
            <motion.h2
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: "bold",
                color: "#00e5ff",
                letterSpacing: 2,
                textShadow: "0 0 15px rgba(0,229,255,0.6)"
              }}
            >
              SHUFFLING DECK...
            </motion.h2>
            <p style={{ color: "#aaa", fontSize: 14, marginTop: 8 }}>Distributing cards for Round {room?.roundNumber || 1}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated drawing card overlay */}
      <AnimatePresence>
        {animatingCard && (
          <motion.div
            style={{
              position: "fixed",
              zIndex: 10000,
              pointerEvents: "none",
              left: 0,
              top: 0,
              width: animatingCard.start.width,
              height: animatingCard.start.height
            }}
            initial={{
              x: animatingCard.start.x - animatingCard.start.width / 2,
              y: animatingCard.start.y - animatingCard.start.height / 2,
              scale: 1,
              rotate: animatingCard.isFaceUp ? 0 : 180
            }}
            animate={{
              x: animatingCard.end.x - animatingCard.end.width / 2,
              y: animatingCard.end.y - animatingCard.end.height / 2,
              scale: [1, 1.15, 1],
              rotate: animatingCard.isFaceUp ? [0, 15, 0] : [180, 90, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.8, 0.25, 1]
            }}
          >
            <PlayingCard
              card={animatingCard.card}
              isFaceUp={animatingCard.isFaceUp}
              hoverable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Animated playing cards overlay */}
      <AnimatePresence>
        {animatingPlay && animatingPlay.map((item, idx) => (
          <motion.div
            key={`play-anim-${idx}`}
            style={{
              position: "fixed",
              zIndex: 10000,
              pointerEvents: "none",
              left: 0,
              top: 0,
              width: item.start.width,
              height: item.start.height
            }}
            initial={{
              x: item.start.x - item.start.width / 2,
              y: item.start.y - item.start.height / 2,
              scale: 1,
              rotate: 0
            }}
            animate={{
              x: item.end.x - item.end.width / 2,
              y: item.end.y - item.end.height / 2,
              scale: [1, 0.9, 1],
              rotate: [0, -15, 10]
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.6,
              ease: [0.25, 0.8, 0.25, 1]
            }}
          >
            <PlayingCard card={item.card} isFaceUp={true} hoverable={false} />
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Dramatic Card Showdown Reveal Screen Overlay Modal */}
      {isRoundOver && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 5, 18, 0.95)",
            backdropFilter: "blur(18px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            padding: 20,
            transition: "box-shadow 0.5s ease",
            boxShadow: `inset 0 0 100px rgba(255, 0, 76, ${0.1 + (revealIndex / (room?.players?.length || 1)) * 0.35})`
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 720,
              maxHeight: "90vh",
              overflowY: "auto",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 0 40px rgba(192, 132, 252, 0.25)",
              borderRadius: 30,
              padding: 24,
              display: "flex",
              flexDirection: "column",
              gap: 20
            }}
          >
            {/* Header */}
            <div style={{ textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: 32, textShadow: "0 0 15px rgba(192,132,252,0.5)" }}>
                🎴 ROUND SHOWDOWN
              </h1>
              <p style={{ color: "#aaa", fontSize: 14, marginTop: 4 }}>
                Who has the Least Count?
              </p>
            </div>

            {/* Players Reveal List */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(room?.players || []).map((player, idx) => {
                const key = playerKey(player.name);
                const cards = room?.hands?.[key] || [];
                const score = getHandValue(cards, room?.jokerCard?.rank);
                const revealed = idx < revealIndex;
                const isWinner = room?.winner && room.winner.split(", ").map(w => playerKey(w)).includes(key);

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                      background: isWinner && revealed ? "rgba(0, 255, 136, 0.08)" : "rgba(255, 255, 255, 0.04)",
                      border: isWinner && revealed ? "1px solid #00ff88" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22 }}>👤</span>
                        <span style={{ fontWeight: "bold", fontSize: 16 }}>{player.name}</span>
                        {isWinner && revealed && (
                          <span style={{ background: "#00ff88", color: "black", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: "bold" }}>
                            🏆 WINNER
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: revealed ? "#00ff88" : "#888" }}>
                        {revealed ? `${score} pts` : "⏳ REVEALING..."}
                      </div>
                    </div>

                    {/* Cards Fan row */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {cards.map((card, cidx) => (
                        <motion.div
                          key={`${card.rank}-${card.suit || "joker"}-${cidx}`}
                          initial={false}
                          animate={revealed ? { rotateY: 0 } : { rotateY: 180 }}
                          transition={{ duration: 0.4 }}
                          style={{ perspective: 400 }}
                        >
                          <PlayingCard card={card} isFaceUp={revealed} hoverable={false} size="sm" />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Final Outcome & Action button */}
            {revealIndex >= (room?.players?.length || 0) && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20 }}
              >
                <h2 style={{ margin: 0, color: "#00ff88" }}>
                  {room?.status === "finished"
                    ? `Match Winner: ${room.matchWinner || room.winner}`
                    : `Round Winner: ${room.winner}`}
                </h2>
                {result?.type === "declaration" && (
                  <p style={{ color: result.declarationWon ? "#00ff88" : "#ff7675", marginTop: 4 }}>
                    {result.declarer} {result.declarationWon ? "won" : "lost"} the declaration
                    {result.penalty ? ` and received ${result.penalty} penalty points` : ""}.
                  </p>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  {room.status === "round-finished" && isHost && (
                    <button onClick={startNextRound} disabled={busy} style={{ ...actionButton("#6c5ce7", busy), flex: 1 }}>
                      Start Next Round
                    </button>
                  )}
                  {room.status === "finished" && isHost && (
                    <button onClick={rematch} disabled={busy} style={{ ...actionButton("#ff00c8", busy), flex: 1 }}>
                      Rematch
                    </button>
                  )}
                  {!isHost && <p style={{ color: "#aaa", width: "100%" }}>Waiting for the host to proceed...</p>}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Illustrated Rules Guide Overlay Modal */}
      {showRules && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 5, 18, 0.95)",
            backdropFilter: "blur(18px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            padding: 20
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 540,
              maxHeight: "85vh",
              overflowY: "auto",
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 24,
              padding: 24,
              position: "relative"
            }}
          >
            <button
              onClick={() => setShowRules(false)}
              style={{
                position: "absolute",
                top: 15,
                right: 15,
                background: "rgba(255,255,255,0.1)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                color: "white",
                cursor: "pointer",
                fontWeight: "bold"
              }}
            >
              ✕
            </button>
            <h2 style={{ color: "#00e5ff", marginTop: 0 }}>🎴 How to Play Least Count</h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 16, fontSize: 14, color: "#eee", lineHeight: 1.6 }}>
              <div>
                <strong style={{ color: "#c084fc" }}>🎯 Goal:</strong>
                <p style={{ margin: "4px 0 0 0" }}>Have the lowest total points in your hand when someone declares Least Count.</p>
              </div>

              <div>
                <strong style={{ color: "#c084fc" }}>🃏 Card Values:</strong>
                <ul style={{ margin: "4px 0 0 0", paddingLeft: 20 }}>
                  <li><strong>Joker</strong> (and Wild Joker rank): 0 points</li>
                  <li><strong>Ace</strong>: 1 point</li>
                  <li><strong>Numbers 2 to 10</strong>: Face value</li>
                  <li><strong>J, Q, K</strong>: 10 points</li>
                </ul>
              </div>

              <div>
                <strong style={{ color: "#c084fc" }}>🔄 Your Turn:</strong>
                <p style={{ margin: "4px 0 0 0" }}>Select cards of the same rank from your hand and click <strong>Play Selected</strong>. Then, draw a card by clicking either the <strong>Draw Deck</strong> or the <strong>Previous Open Card</strong>.</p>
              </div>

              <div>
                <strong style={{ color: "#c084fc" }}>⚡ Slash:</strong>
                <p style={{ margin: "4px 0 0 0" }}>If you play a card of the same rank as the current Open Card on the table, it is a **Slash**. Slashes are instant plays: you do not need to draw a card, and it becomes the next player's turn immediately!</p>
              </div>

              <div>
                <strong style={{ color: "#c084fc" }}>📣 Declare Least Count:</strong>
                <p style={{ margin: "4px 0 0 0" }}>If you believe your hand total is the lowest on the table, click <strong>Declare Least Count</strong>. Hands are revealed: if you truly have the lowest score, you get 0 points for the round. If someone else has a lower or equal score, you receive a penalty (+40 points)!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <TutorialOverlay
          onComplete={() => {
            localStorage.setItem("frazons-tutorial-completed", "true");
            setShowTutorial(false);
          }}
        />
      )}
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
