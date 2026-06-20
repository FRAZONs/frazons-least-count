import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PlayingCard from "../components/PlayingCard";
import WinnerPodium from "../components/WinnerPodium";
import TutorialOverlay from "../components/TutorialOverlay";
import createDeck from "../utils/createDeck";
import shuffleDeck from "../utils/shuffleDeck";
import {
  playCardDrawSound,
  playCardPlaySound,
  playCardSelectSound,
  playEmojiSound,
  playShufflingSound,
  playHeartbeatSound,
  playQuickChatSound
} from "../utils/audio";
import { getHandValue, getCardValue, refillDrawPile } from "../utils/onlineGame";
import { updateLocalStats } from "../utils/playerStats";

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
      delay: index * 0.08,
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
    tableGlow: "0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(0,229,255,0.06)"
  },
  "classic-green": {
    bg: "radial-gradient(circle, rgba(16,77,33,0.98) 0%, rgba(5,36,13,1) 100%)",
    border: "2.5px double rgba(251, 191, 36, 0.6)",
    text: "#fbbf24",
    tableGlow: "0 10px 40px rgba(0,0,0,0.75), inset 0 0 60px rgba(251, 191, 36, 0.08)"
  },
  "neon-blue": {
    bg: "radial-gradient(circle, rgba(10,40,75,0.95) 0%, rgba(2,12,25,0.98) 100%)",
    border: "2px solid rgba(0, 229, 255, 0.45)",
    text: "#00e5ff",
    tableGlow: "0 10px 40px rgba(0,0,0,0.7), inset 0 0 50px rgba(0, 229, 255, 0.08)"
  },
  "dark-carbon": {
    bg: "radial-gradient(circle, #2c3e50 0%, #0f171e 100%)",
    border: "2px solid rgba(149, 165, 166, 0.35)",
    text: "#bdc3c7",
    tableGlow: "0 10px 40px rgba(0,0,0,0.8), inset 0 0 40px rgba(255,255,255,0.03)"
  }
};

const BOT_REACT_PHRASES = [
  "Nice play! 👍",
  "Oops! 💀",
  "Declare time? 👑",
  "Hurry up! ⏳",
  "Good game! 🤝",
  "No way! 😲",
  "Calculated! 🤖"
];

const BOT_EMOJIS = ["😂", "🔥", "💀", "👍", "🎉"];

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

export default function PracticeGame({ setScreen }) {
  // Config state
  const playerName = localStorage.getItem("playerName") || "Player";
  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem("frazons-board-theme") || "cyber-violet";
  });
  const [declarationThreshold, setDeclarationThreshold] = useState(20);

  const [isMobile, setIsMobile] = useState(window.innerWidth < 600);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 600);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Game flow states
  const [roundNumber, setRoundNumber] = useState(1);
  const [status, setStatus] = useState("setup"); // 'setup', 'playing', 'round-finished', 'finished'
  const [currentPlayer, setCurrentPlayer] = useState(0); // 0 = Player, 1 = Safe Bot, 2 = Aggressive Bot
  
  // Scores
  const [totals, setTotals] = useState({
    player: 0,
    bot1: 0,
    bot2: 0
  });

  // Local card state
  const [hands, setHands] = useState({
    player: [],
    bot1: [],
    bot2: []
  });
  const [drawPile, setDrawPile] = useState([]);
  const [discardPile, setDiscardPile] = useState([]);
  const [openCard, setOpenCard] = useState(null);
  const [jokerCard, setJokerCard] = useState(null);
  const [previousOpenCard, setPreviousOpenCard] = useState(null);
  const [pendingDraw, setPendingDraw] = useState(false);
  const [pendingPlayer, setPendingPlayer] = useState(null);

  // UI animations and overlay states
  const [selectedCards, setSelectedCards] = useState([]);
  const [shuffling, setShuffling] = useState(false);
  const [revealIndex, setRevealIndex] = useState(0);
  const [showRules, setShowRules] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [floatingChats, setFloatingChats] = useState([]);
  const [roundResult, setRoundResult] = useState(null);
  const [winner, setWinner] = useState(null);

  // Tutorial overlay
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

  const [sortBy, setSortBy] = useState("default");
  
  // Element Refs for animations/tutorial
  const deckRef = useRef(null);
  const discardRef = useRef(null);
  const previousOpenRef = useRef(null);
  const handRef = useRef(null);
  const handCardRefs = useRef([]);

  const isRoundOver = status === "round-finished" || status === "finished";
  const myCards = hands.player;
  const myCount = getHandValue(myCards, jokerCard?.rank);
  const isMyTurn = currentPlayer === 0;

  // Bot list configuration
  const bots = useMemo(() => [
    { name: playerName, key: "player", avatar: "👤", color: "#ff00c8" },
    { name: "Safe Bot 🤖", key: "bot1", avatar: "🛡️", color: "#00ff88", personality: "safe" },
    { name: "Agg Bot 🤖", key: "bot2", avatar: "⚔️", color: "#ff9f43", personality: "aggressive" }
  ], [playerName]);

  const topDiscards = useMemo(() => discardPile.slice(-3), [discardPile]);

  // Seeded rotations for discard stack
  const getSeededAngle = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 20) - 10;
  }, []);

  const getSeededX = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 14) - 7;
  }, []);

  const getSeededY = useCallback((card, index) => {
    if (!card) return 0;
    const code = (card.rank || "").charCodeAt(0) + (card.suit || "").charCodeAt(0) + index;
    return (code % 14) - 7;
  }, []);

  // Sort hand cards
  const sortedHandCards = useMemo(() => {
    const cards = myCards.map((card, index) => ({ card, originalIndex: index }));
    if (sortBy === "value") {
      const getVal = (c) => {
        if (!c) return 0;
        if (c.rank === "JOKER" || c.rank === jokerCard?.rank) return 0;
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
  }, [myCards, sortBy, jokerCard?.rank]);

  // Floating reactions / messages local triggers
  const triggerBotReaction = useCallback((botIndex) => {
    const bot = bots[botIndex];
    if (!bot) return;

    const chance = Math.random();
    if (chance < 0.25) {
      // Trigger emoji
      const emoji = BOT_EMOJIS[Math.floor(Math.random() * BOT_EMOJIS.length)];
      playEmojiSound();
      const newFloating = {
        id: `${bot.key}-${Date.now()}`,
        playerKey: bot.key,
        emoji
      };
      setFloatingEmojis((current) => [...current, newFloating]);
      setTimeout(() => {
        setFloatingEmojis((current) => current.filter((item) => item.id !== newFloating.id));
      }, 2000);
    } else if (chance < 0.45) {
      // Trigger speech message
      const message = BOT_REACT_PHRASES[Math.floor(Math.random() * BOT_REACT_PHRASES.length)];
      playQuickChatSound();
      const newChat = {
        id: `${bot.key}-${Date.now()}`,
        playerKey: bot.key,
        message
      };
      setFloatingChats((current) => [...current, newChat]);
      setTimeout(() => {
        setFloatingChats((current) => current.filter((item) => item.id !== newChat.id));
      }, 3000);
    }
  }, [bots]);

  const sendReaction = (emoji) => {
    playEmojiSound();
    const newFloating = {
      id: `player-${Date.now()}`,
      playerKey: "player",
      emoji
    };
    setFloatingEmojis((current) => [...current, newFloating]);
    setTimeout(() => {
      setFloatingEmojis((current) => current.filter((item) => item.id !== newFloating.id));
    }, 2000);
  };

  const sendQuickChat = (message) => {
    playQuickChatSound();
    const newChat = {
      id: `player-${Date.now()}`,
      playerKey: "player",
      message
    };
    setFloatingChats((current) => [...current, newChat]);
    setTimeout(() => {
      setFloatingChats((current) => current.filter((item) => item.id !== newChat.id));
    }, 3000);
  };

  // Start new round dealing
  const startRound = useCallback((roundNo) => {
    playShufflingSound();
    setShuffling(true);
    
    // Create and shuffle deck
    const deck = shuffleDeck(createDeck());
    const dealtHands = {
      player: [],
      bot1: [],
      bot2: []
    };

    // Deal 7 cards to each
    for (let c = 0; c < 7; c++) {
      dealtHands.player.push(deck.pop());
      dealtHands.bot1.push(deck.pop());
      dealtHands.bot2.push(deck.pop());
    }

    const joker = deck.pop();
    const open = deck.pop();

    setTimeout(() => {
      setHands(dealtHands);
      setDrawPile(deck);
      setDiscardPile([]);
      setOpenCard(open);
      setJokerCard(joker);
      setPreviousOpenCard(null);
      setPendingDraw(false);
      setPendingPlayer(null);
      
      // Starting player defaults to Player (0)
      setCurrentPlayer(0);
      setRoundNumber(roundNo);
      setStatus("playing");
      setShuffling(false);
      
      // Update local career stats
      updateLocalStats({ totalRoundsPlayed: 1 });
    }, 2000);
  }, []);

  // Initialize practice game
  const initPracticeGame = () => {
    setTotals({ player: 0, bot1: 0, bot2: 0 });
    setWinner(null);
    updateLocalStats({ offlineMatchesPlayed: 1 });
    startRound(1);
  };

  useEffect(() => {
    initPracticeGame();
  }, [startRound]);

  // Hearts showdown reveal loops
  useEffect(() => {
    if (!isRoundOver) {
      setRevealIndex(0);
      return;
    }

    const timer = setInterval(() => {
      setRevealIndex((prev) => {
        if (prev < bots.length) {
          playCardDrawSound();
          return prev + 1;
        }
        clearInterval(timer);
        return prev;
      });
    }, 1500);

    return () => clearInterval(timer);
  }, [isRoundOver, bots.length]);

  // Showdown reveal heartbeat sounds
  useEffect(() => {
    if (!isRoundOver) return undefined;

    const speed = 1.0 + (revealIndex / bots.length) * 1.2;
    const intervalTime = 1000 / speed;

    const heartbeatTimer = setInterval(() => {
      playHeartbeatSound(speed);
    }, intervalTime);

    return () => clearInterval(heartbeatTimer);
  }, [isRoundOver, revealIndex, bots.length]);

  // Finish current round
  const finishLocalRound = (roundScores, details = {}) => {
    const nextTotals = {
      player: totals.player + (roundScores.player || 0),
      bot1: totals.bot1 + (roundScores.bot1 || 0),
      bot2: totals.bot2 + (roundScores.bot2 || 0)
    };

    setTotals(nextTotals);

    // Check if match winner is determined
    const scoreLimit = 200;
    const checkElimination = {
      player: nextTotals.player > scoreLimit,
      bot1: nextTotals.bot1 > scoreLimit,
      bot2: nextTotals.bot2 > scoreLimit
    };

    const activeBots = bots.filter((bot) => !checkElimination[bot.key]);
    const isGameOver = activeBots.length <= 1;

    setRoundResult({
      ...details,
      scores: roundScores,
      totals: nextTotals
    });

    if (isGameOver) {
      const winnerBot = activeBots.length === 1 
        ? activeBots[0] 
        : bots.reduce((prev, curr) => (nextTotals[prev.key] < nextTotals[curr.key] ? prev : curr));
        
      setWinner(winnerBot);
      setStatus("finished");

      // Career Stats updates
      if (winnerBot.key === "player") {
        updateLocalStats({ offlineMatchesWon: 1 });
      }
    } else {
      setStatus("round-finished");
    }
  };

  // Human player playing actions
  const playSelected = () => {
    if (!selectedCards.length || pendingDraw) return;

    // Validate rank matching
    const hand = hands.player;
    const selected = selectedCards.map((idx) => hand[idx]);
    if (!selected.every((card) => card.rank === selected[0].rank)) {
      alert("Invalid Selection! Select cards of the same rank.");
      return;
    }

    playCardPlaySound();

    const playedCard = selected[selected.length - 1];
    const newHand = hand.filter((_, idx) => !selectedCards.includes(idx));
    const nextDiscard = [...discardPile, ...selected.slice(0, -1)];
    
    // Log player ending count for stats
    if (newHand.length === 0) {
      // Empty Hand round win
      const scores = {
        player: 0,
        bot1: getHandValue(hands.bot1, jokerCard?.rank),
        bot2: getHandValue(hands.bot2, jokerCard?.rank)
      };
      
      setHands((prev) => ({ ...prev, player: [] }));
      setOpenCard(playedCard);
      setDiscardPile([...nextDiscard, openCard].filter(Boolean));
      setSelectedCards([]);

      finishLocalRound(scores, {
        type: "empty-hand",
        declarer: playerName,
        winners: [playerName]
      });
      return;
    }

    const isSlash = playedCard.rank === openCard?.rank;
    setOpenCard(playedCard);
    setDiscardPile(isSlash ? [...nextDiscard, openCard].filter(Boolean) : nextDiscard);
    setPreviousOpenCard(isSlash ? null : openCard);

    // Save Hand Point updates locally
    const humanScore = getHandValue(newHand, jokerCard?.rank);
    updateLocalStats({ totalPointsAccumulated: humanScore });

    if (isSlash) {
      // Slashes skip draw entirely
      setHands((prev) => ({ ...prev, player: newHand }));
      setSelectedCards([]);
      // Advance turn
      setCurrentPlayer(1);
    } else {
      // Requires draw
      setHands((prev) => ({ ...prev, player: newHand }));
      setPendingDraw(true);
      setPendingPlayer("player");
      setSelectedCards([]);
    }
  };

  const drawCardLocal = (useOpenCard) => {
    playCardDrawSound();

    let targetCard = previousOpenCard;
    let nextDraw = [...drawPile];
    let nextDiscard = [...discardPile];

    if (!useOpenCard) {
      if (previousOpenCard) nextDiscard.push(previousOpenCard);
      const refilled = refillDrawPile(nextDraw, nextDiscard);
      nextDraw = refilled.drawPile;
      nextDiscard = refilled.discardPile;
      targetCard = nextDraw.pop();
    }

    if (!targetCard) return;

    const nextHand = [...hands.player, targetCard];
    setHands((prev) => ({ ...prev, player: nextHand }));
    setDrawPile(nextDraw);
    setDiscardPile(nextDiscard);
    setPreviousOpenCard(null);
    setPendingDraw(false);
    setPendingPlayer(null);

    // Next turn (bot 1)
    setCurrentPlayer(1);
  };

  const declareLeastCountLocal = () => {
    const originalScores = {
      player: getHandValue(hands.player, jokerCard?.rank),
      bot1: getHandValue(hands.bot1, jokerCard?.rank),
      bot2: getHandValue(hands.bot2, jokerCard?.rank)
    };

    const myScore = originalScores.player;
    const opponentScores = [originalScores.bot1, originalScores.bot2];
    
    // Declarer must have strictly lowest score
    const declarationWon = opponentScores.every((score) => myScore < score);
    const roundScores = { ...originalScores };
    const penalty = 40;

    if (!declarationWon) {
      roundScores.player += penalty;
      updateLocalStats({ declarationsMade: 1, declarationsLost: 1 });
    } else {
      updateLocalStats({ declarationsMade: 1, declarationsWon: 1 });
    }

    const lowest = Math.min(...Object.values(roundScores));
    const winners = Object.entries(roundScores)
      .filter(([, score]) => score === lowest)
      .map(([key]) => key === "player" ? playerName : key === "bot1" ? "Safe Bot 🤖" : "Agg Bot 🤖");

    finishLocalRound(roundScores, {
      type: "declaration",
      declarer: playerName,
      declarationWon,
      penalty: declarationWon ? 0 : penalty,
      originalScores,
      winners: winners
    });
  };

  // Bot Logic Execution Hook
  useEffect(() => {
    if (status !== "playing" || currentPlayer === 0) return undefined;

    const activeBotKey = currentPlayer === 1 ? "bot1" : "bot2";
    const bot = bots[currentPlayer];

    // Trigger random chat bubbles
    const reactionTimeout = setTimeout(() => {
      triggerBotReaction(currentPlayer);
    }, 400 + Math.random() * 800);

    const botActionTimeout = setTimeout(() => {
      const hand = hands[activeBotKey] || [];
      const botScore = getHandValue(hand, jokerCard?.rank);

      // 1. Declare Least Count?
      const threshold = Math.min(bot.personality === "safe" ? 5 : 2, declarationThreshold);
      if (botScore <= threshold && !pendingDraw) {
        // Perform declaration!
        const originalScores = {
          player: getHandValue(hands.player, jokerCard?.rank),
          bot1: getHandValue(hands.bot1, jokerCard?.rank),
          bot2: getHandValue(hands.bot2, jokerCard?.rank)
        };

        const decScore = originalScores[activeBotKey];
        const decWinners = Object.entries(originalScores).filter(([k]) => k !== activeBotKey);
        const declarationWon = decWinners.every(([, score]) => decScore < score);

        const roundScores = { ...originalScores };
        if (!declarationWon) roundScores[activeBotKey] += 40;

        const lowest = Math.min(...Object.values(roundScores));
        const winners = Object.entries(roundScores)
          .filter(([, s]) => s === lowest)
          .map(([k]) => k === "player" ? playerName : k === "bot1" ? "Safe Bot 🤖" : "Agg Bot 🤖");

        finishLocalRound(roundScores, {
          type: "declaration",
          declarer: bot.name,
          declarationWon,
          penalty: declarationWon ? 0 : 40,
          originalScores,
          winners
        });
        return;
      }

      // 2. Pending Draw actions
      if (pendingDraw && pendingPlayer === activeBotKey) {
        let drawOpen = false;
        if (previousOpenCard) {
          const val = getCardValue(previousOpenCard, jokerCard?.rank);
          const hasMatchingRank = hand.some((c) => c.rank === previousOpenCard.rank);
          
          if (val <= (bot.personality === "safe" ? 4 : 3) || hasMatchingRank) {
            drawOpen = true;
          }
        }

        playCardDrawSound();

        let target = previousOpenCard;
        let nextDraw = [...drawPile];
        let nextDiscard = [...discardPile];

        if (!drawOpen) {
          if (previousOpenCard) nextDiscard.push(previousOpenCard);
          const refilled = refillDrawPile(nextDraw, nextDiscard);
          nextDraw = refilled.drawPile;
          nextDiscard = refilled.discardPile;
          target = nextDraw.pop();
        }

        if (target) {
          setHands((prev) => ({
            ...prev,
            [activeBotKey]: [...hand, target]
          }));
          setDrawPile(nextDraw);
          setDiscardPile(nextDiscard);
        }

        setPreviousOpenCard(null);
        setPendingDraw(false);
        setPendingPlayer(null);

        // Turn moves forward
        setCurrentPlayer(currentPlayer === 1 ? 2 : 0);
        return;
      }

      // 3. Play Cards actions
      // Find highest value cards of same rank to dump points
      const cardValues = hand.map((card, idx) => ({
        card,
        idx,
        val: getCardValue(card, jokerCard?.rank)
      }));

      // Group by rank
      const groups = {};
      cardValues.forEach((item) => {
        if (!groups[item.card.rank]) groups[item.card.rank] = [];
        groups[item.card.rank].push(item);
      });

      // Find group with highest total value
      let bestGroup = null;
      let highestVal = -1;

      Object.values(groups).forEach((grp) => {
        const totalGrpVal = grp.reduce((acc, item) => acc + item.val, 0);
        if (totalGrpVal > highestVal) {
          highestVal = totalGrpVal;
          bestGroup = grp;
        }
      });

      if (!bestGroup || bestGroup.length === 0) return;

      playCardPlaySound();

      const playedCard = bestGroup[bestGroup.length - 1].card;
      const indexesToPlay = bestGroup.map((item) => item.idx);
      const remainingHand = hand.filter((_, idx) => !indexesToPlay.includes(idx));
      const nextDiscard = [...discardPile, ...bestGroup.slice(0, -1).map((item) => item.card)];

      if (remainingHand.length === 0) {
        // Bot Empty Hand round win
        const scores = {
          player: getHandValue(hands.player, jokerCard?.rank),
          bot1: activeBotKey === "bot1" ? 0 : getHandValue(hands.bot1, jokerCard?.rank),
          bot2: activeBotKey === "bot2" ? 0 : getHandValue(hands.bot2, jokerCard?.rank)
        };

        setHands((prev) => ({ ...prev, [activeBotKey]: [] }));
        setOpenCard(playedCard);
        setDiscardPile([...nextDiscard, openCard].filter(Boolean));

        finishLocalRound(scores, {
          type: "empty-hand",
          declarer: bot.name,
          winners: [bot.name]
        });
        return;
      }

      const isSlash = playedCard.rank === openCard?.rank;
      setOpenCard(playedCard);
      setDiscardPile(isSlash ? [...nextDiscard, openCard].filter(Boolean) : nextDiscard);
      setPreviousOpenCard(isSlash ? null : openCard);
      setHands((prev) => ({ ...prev, [activeBotKey]: remainingHand }));

      if (isSlash) {
        // Skip draw, advance turn
        setCurrentPlayer(currentPlayer === 1 ? 2 : 0);
      } else {
        // Require draw (schedule immediate bot drawing after small delay)
        setPendingDraw(true);
        setPendingPlayer(activeBotKey);
      }
    }, 1500);

    return () => {
      clearTimeout(reactionTimeout);
      clearTimeout(botActionTimeout);
    };
  }, [
    currentPlayer,
    status,
    hands,
    openCard,
    previousOpenCard,
    jokerCard,
    drawPile,
    discardPile,
    bots,
    triggerBotReaction,
    playerName
  ]);

  const handleNextRound = () => {
    startRound(roundNumber + 1);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        color: "white",
        padding: isMobile ? "12px 8px" : 20
      }}
    >
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 style={{ marginBottom: 4 }}>Practice Sandbox (Bots)</h1>
            <div style={{ color: "#00e5ff" }}>Round {roundNumber}</div>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <button onClick={() => setShowRules(true)} style={actionButton("#c084fc")}>📖 Rules</button>
            <button onClick={() => setScreen("home")} style={actionButton("#444")}>Exit</button>
          </div>
        </div>

        {/* Visual Game Board */}
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
          {/* Table Header */}
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
              <select
                value={declarationThreshold}
                onChange={(e) => setDeclarationThreshold(Number(e.target.value))}
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
                <option value={10} style={{ background: "#1a1330", color: "white" }}>Decl. Limit: 10 pts</option>
                <option value={20} style={{ background: "#1a1330", color: "white" }}>Decl. Limit: 20 pts</option>
                <option value={30} style={{ background: "#1a1330", color: "white" }}>Decl. Limit: 30 pts</option>
                <option value={999} style={{ background: "#1a1330", color: "white" }}>Decl. Limit: No limit</option>
              </select>
            </div>
            
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ color: "#aaa", fontSize: 13 }}>Current Turn:</div>
              <div style={{ fontWeight: "bold", color: isMyTurn ? "#00e5ff" : "#fff", fontSize: 15, background: isMyTurn ? "rgba(0,229,255,0.15)" : "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 8, border: isMyTurn ? "1px solid rgba(0,229,255,0.3)" : "1px solid rgba(255,255,255,0.1)" }}>
                {isMyTurn ? "👉 Your Turn" : `${bots[currentPlayer]?.name || "-"}'s Turn`}
              </div>
            </div>
          </div>

          {/* Cards Stack Area */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: isMobile ? 12 : 40,
              flexWrap: "wrap",
              width: "100%",
              minHeight: 160
            }}
          >
            {/* Wild Joker */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#ffb03a", fontWeight: "bold", letterSpacing: 1 }}>WILD JOKER</span>
              <div style={{ position: "relative" }}>
                {jokerCard ? (
                  <PlayingCard
                    card={jokerCard}
                    isFaceUp={true}
                    hoverable={true}
                    style={{ boxShadow: "0 0 20px rgba(255, 176, 58, 0.4)", border: "2.5px solid #ffb03a" }}
                    size={isMobile ? "sm" : "md"}
                  />
                ) : (
                  <div style={{ width: isMobile ? 55 : 82, height: isMobile ? 80 : 118, borderRadius: isMobile ? 8 : 12, border: "2px dashed #444", display: "flex", alignItems: "center", justifyContent: "center" }}>None</div>
                )}
              </div>
            </div>

            {/* Draw Pile (Deck) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }} className="tutorial-draw-deck">
              <span style={{ fontSize: 12, color: "#00e5ff", fontWeight: "bold", letterSpacing: 1 }}>DRAW DECK</span>
              <div ref={deckRef} style={{ position: "relative", width: isMobile ? 55 : 82, height: isMobile ? 80 : 118 }}>
                <div style={{ position: "absolute", top: 4, left: 4, width: isMobile ? 55 : 82, height: isMobile ? 80 : 118, zIndex: 1 }}>
                  <PlayingCard card={null} isFaceUp={false} hoverable={false} style={{ opacity: 0.3 }} size={isMobile ? "sm" : "md"} />
                </div>
                <div style={{ position: "absolute", top: 2, left: 2, width: isMobile ? 55 : 82, height: isMobile ? 80 : 118, zIndex: 2 }}>
                  <PlayingCard card={null} isFaceUp={false} hoverable={false} style={{ opacity: 0.6 }} size={isMobile ? "sm" : "md"} />
                </div>
                <div style={{ position: "absolute", top: 0, left: 0, width: isMobile ? 55 : 82, height: isMobile ? 80 : 118, zIndex: 3 }}>
                  <PlayingCard
                     card={null}
                     isFaceUp={false}
                     hoverable={isMyTurn && pendingDraw && pendingPlayer === "player"}
                     onClick={isMyTurn && pendingDraw && pendingPlayer === "player" ? () => drawCardLocal(false) : null}
                     style={{
                       border: isMyTurn && pendingDraw && pendingPlayer === "player" ? "3px solid #00e5ff" : "2px solid rgba(0, 229, 255, 0.4)",
                       boxShadow: isMyTurn && pendingDraw && pendingPlayer === "player" ? "0 0 20px rgba(0,229,255,0.6)" : "0 4px 8px rgba(0,0,0,0.3)"
                     }}
                     size={isMobile ? "sm" : "md"}
                  />
                </div>
              </div>
            </div>

            {/* Discard Pile */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 12, color: "#ff00c8", fontWeight: "bold", letterSpacing: 1 }}>OPEN DISCARD</span>
              <div ref={discardRef} style={{ position: "relative", width: isMobile ? 55 : 82, height: isMobile ? 80 : 118 }}>
                {openCard ? (
                  <>
                    {topDiscards.map((card, i) => {
                      const angle = getSeededAngle(card, i);
                      const x = getSeededX(card, i);
                      const y = getSeededY(card, i);
                      return (
                        <div
                          key={`discard-${i}`}
                          style={{
                            position: "absolute",
                            top: y,
                            left: x,
                            width: isMobile ? 55 : 82,
                            height: isMobile ? 80 : 118,
                            transform: `rotate(${angle}deg)`,
                            zIndex: i + 1,
                            pointerEvents: "none"
                          }}
                        >
                          <PlayingCard card={card} isFaceUp={true} hoverable={false} size={isMobile ? "sm" : "md"} />
                        </div>
                      );
                    })}
                    <div style={{ position: "absolute", top: 0, left: 0, zIndex: 10 }}>
                      <PlayingCard
                        card={openCard}
                        isFaceUp={true}
                        hoverable={false}
                        style={{ border: "1px solid rgba(255, 255, 255, 0.2)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}
                        size={isMobile ? "sm" : "md"}
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ width: isMobile ? 55 : 82, height: isMobile ? 80 : 118, borderRadius: isMobile ? 8: 12, border: "2px dashed #444", display: "flex", alignItems: "center", justifyContent: "center" }}>Empty</div>
                )}
              </div>
            </div>

            {/* Previous Open Card */}
            {previousOpenCard && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#0984e3", fontWeight: "bold", letterSpacing: 1 }}>PREVIOUS OPEN</span>
                <div ref={previousOpenRef} style={{ position: "relative" }}>
                  <PlayingCard
                    card={previousOpenCard}
                    isFaceUp={true}
                    hoverable={isMyTurn && pendingDraw && pendingPlayer === "player"}
                    onClick={isMyTurn && pendingDraw && pendingPlayer === "player" ? () => drawCardLocal(true) : null}
                    style={{
                      border: isMyTurn && pendingDraw && pendingPlayer === "player" ? "3px solid #0984e3" : "1px solid rgba(255, 255, 255, 0.2)",
                      boxShadow: isMyTurn && pendingDraw && pendingPlayer === "player" ? "0 0 20px rgba(9,132,227,0.6)" : "0 4px 8px rgba(0,0,0,0.3)"
                    }}
                    size={isMobile ? "sm" : "md"}
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Players Panel */}
        <section style={{ ...panelStyle, marginTop: 20 }}>
          <h2 style={{ marginBottom: 16 }}>Players Table</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 16
            }}
          >
            {bots.map((bot, idx) => {
              const isActive = currentPlayer === idx;
              const isMe = idx === 0;
              const cardsCount = hands[bot.key]?.length || 0;
              
              const statusColor = isActive ? "#00e5ff" : "rgba(255, 255, 255, 0.15)";
              const maxVisible = 6;
              const numRender = Math.min(cardsCount, maxVisible);
              const fannedCards = Array.from({ length: numRender });

              return (
                <div
                  key={bot.key}
                  style={{
                    background: "rgba(15, 7, 24, 0.6)",
                    border: isActive ? `2px solid ${statusColor}` : "1px solid rgba(255, 255, 255, 0.1)",
                    boxShadow: isActive ? `0 0 15px ${statusColor}44` : "none",
                    borderRadius: 18,
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    gap: 12,
                    position: "relative",
                    transform: isActive ? "scale(1.02)" : "scale(1)",
                    transition: "all 0.3s ease",
                    overflow: "hidden"
                  }}
                >
                  {/* Glowing top line */}
                  {isActive && (
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

                  {/* Info Row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 20 }}>{bot.avatar}</span>
                      <div>
                        <div style={{ fontWeight: "bold", color: isMe ? "#ff00c8" : "white", fontSize: 16 }}>
                          {bot.name} {isMe && "(You)"}
                        </div>
                        <div style={{ fontSize: 11, color: "#aaa" }}>
                          {bot.personality ? `Bot Personality: ${bot.personality}` : "Human Player"}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 11, color: "#888", fontWeight: "bold" }}>TOTAL POINTS</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: "#00ff88" }}>
                        {totals[bot.key]} <span style={{ fontSize: 11, fontWeight: "normal", color: "#aaa" }}>pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Fanned Cards Indicator */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px 14px", borderRadius: 12, minHeight: 62 }}>
                    <span style={{ fontSize: 13, color: "#aaa", fontWeight: "bold" }}>Hand:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {cardsCount > 0 ? (
                        <div style={{ display: "flex", position: "relative", width: 34 + (numRender - 1) * 12, height: 50, marginRight: 8 }}>
                          {fannedCards.map((_, cIdx) => {
                            const mid = (numRender - 1) / 2;
                            const rot = (cIdx - mid) * 8;
                            const xOffset = (cIdx - mid) * 12;
                            return (
                              <div
                                key={`fan-${bot.key}-${cIdx}`}
                                style={{
                                  position: "absolute",
                                  left: "50%",
                                  transform: `translateX(-50%) translateX(${xOffset}px) rotate(${rot}deg)`,
                                  transformOrigin: "bottom center",
                                  zIndex: cIdx
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

                  {/* Floating speech bubbles */}
                  <AnimatePresence>
                    {floatingChats.filter((c) => c.playerKey === bot.key).map((item) => (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: -10 }}
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
                    {floatingEmojis.filter((e) => e.playerKey === bot.key).map((item) => (
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

        {/* Human Turn Interface */}
        {!isRoundOver && (
          <section style={{ ...panelStyle, marginTop: 20 }}>
            <div style={{ color: "#00ff88", fontWeight: "bold", marginBottom: 14 }}>
              Your count: {myCount}
            </div>

            {pendingDraw && pendingPlayer === "player" && (
              <div style={{
                background: "rgba(0, 229, 255, 0.1)",
                border: "1px solid rgba(0, 229, 255, 0.3)",
                padding: "12px 18px",
                borderRadius: 14,
                marginBottom: 16,
                color: "#00e5ff",
                fontWeight: "bold",
                textAlign: "center",
                boxShadow: "0 0 15px rgba(0, 229, 255, 0.1)"
              }}>
                👉 Click the DRAW DECK or PREVIOUS OPEN card on the playing table to draw!
              </div>
            )}

            {isMyTurn && !pendingDraw && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  onClick={playSelected}
                  disabled={!selectedCards.length}
                  style={actionButton("#ff00c8", !selectedCards.length)}
                  className="tutorial-play-btn"
                >
                  Play Selected
                </button>
                {myCount <= declarationThreshold && (
                  <button 
                    onClick={declareLeastCountLocal} 
                    style={actionButton("#f39c12")}
                    className="tutorial-declare-btn"
                  >
                    Declare Least Count
                  </button>
                )}
              </div>
            )}

            {/* Hand Custom controls */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
              <h2 style={{ margin: 0 }}>Your Hand</h2>
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

            {/* Human Hand list */}
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
              {sortedHandCards.map(({ card, originalIndex }, index) => {
                const selected = selectedCards.includes(originalIndex);
                const total = sortedHandCards.length;
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
                    style={{ marginRight: index === total - 1 ? 0 : -16, transformOrigin: "bottom center" }}
                  >
                    <PlayingCard
                      card={card}
                      isFaceUp={true}
                      selected={selected}
                      onClick={() => {
                        if (!isMyTurn || pendingDraw) return;
                        playCardSelectSound();
                        setSelectedCards((current) =>
                          current.includes(originalIndex)
                            ? current.filter((i) => i !== originalIndex)
                            : [...current, originalIndex]
                        );
                      }}
                      hoverable={isMyTurn && !pendingDraw}
                      disabled={!isMyTurn || pendingDraw}
                      style={{
                        transform: selected
                          ? `translateY(-20px) rotate(0deg) translateZ(0)`
                          : `rotate(${rot}deg) translateY(${ty}px) translateX(${tx}px) translateZ(0)`
                      }}
                      size={isMobile ? "sm" : "md"}
                    />
                  </motion.div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Shuffling Screen Overlay */}
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
                  transition={{ duration: 1.0, repeat: Infinity, ease: "easeInOut" }}
                  style={{ position: "absolute", width: 90, height: 130 }}
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
            <p style={{ color: "#aaa", fontSize: 14, marginTop: 8 }}>Distributing cards for Round {roundNumber}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Showdown Reveal modal */}
      {isRoundOver && roundResult && (
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
            boxShadow: `inset 0 0 100px rgba(255, 0, 76, ${0.1 + (revealIndex / bots.length) * 0.35})`
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
            <div style={{ textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: 32, textShadow: "0 0 15px rgba(192,132,252,0.5)" }}>
                🎴 ROUND SHOWDOWN
              </h1>
              <p style={{ color: "#aaa", fontSize: 14, marginTop: 4 }}>
                Practice Match Reveal
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {bots.map((bot, idx) => {
                const cards = hands[bot.key] || [];
                const score = getHandValue(cards, jokerCard?.rank);
                const revealed = idx < revealIndex;
                
                // Winner indicator
                const lowestScore = Math.min(...Object.values(roundResult.scores));
                const isRoundWinner = roundResult.scores[bot.key] === lowestScore;

                return (
                  <motion.div
                    key={bot.key}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    style={{
                      background: isRoundWinner && revealed ? "rgba(0, 255, 136, 0.08)" : "rgba(255, 255, 255, 0.04)",
                      border: isRoundWinner && revealed ? "1px solid #00ff88" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 20,
                      padding: 16,
                      display: "flex",
                      flexDirection: "column",
                      gap: 12
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 22 }}>{bot.avatar}</span>
                        <span style={{ fontWeight: "bold", fontSize: 16 }}>{bot.name}</span>
                        {isRoundWinner && revealed && (
                          <span style={{ background: "#00ff88", color: "black", fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: "bold" }}>
                            🏆 WINNER
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 16, fontWeight: "bold", color: revealed ? "#00ff88" : "#888" }}>
                        {revealed ? `${score} pts` : "⏳ REVEALING..."}
                      </div>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {cards.map((card, cidx) => (
                        <motion.div
                          key={`${cidx}`}
                          initial={false}
                          animate={revealed ? { rotateY: 0 } : { rotateY: 180 }}
                          transition={{ duration: 0.4 }}
                          style={{ perspective: 400 }}
                        >
                          <PlayingCard card={card} isFaceUp={revealed} hoverable={false} size={isMobile ? "mini" : "sm"} />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {revealIndex >= bots.length && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 20 }}
              >
                <h2 style={{ margin: 0, color: "#00ff88" }}>
                  Round Complete!
                </h2>
                {roundResult?.type === "declaration" && (
                  <p style={{ color: roundResult.declarationWon ? "#00ff88" : "#ff7675", marginTop: 4 }}>
                    {roundResult.declarer} {roundResult.declarationWon ? "won" : "lost"} the declaration
                    {roundResult.penalty ? ` and received ${roundResult.penalty} penalty points` : ""}.
                  </p>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
                  <button onClick={handleNextRound} style={{ ...actionButton("#6c5ce7"), flex: 1 }}>
                    Start Next Round
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}

      {/* Match Winner Podium */}
      {winner && (
        <WinnerPodium
          players={bots.map((b) => ({
            ...b,
            id: b.key,
            total: totals[b.key]
          }))}
          onRestart={initPracticeGame}
          isHost={true}
        />
      )}

      {/* Onboarding tour */}
      {showTutorial && (
        <TutorialOverlay
          onComplete={() => {
            localStorage.setItem("frazons-tutorial-completed", "true");
            setShowTutorial(false);
          }}
        />
      )}

      {/* Illustrated Rules Guide */}
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
    </div>
  );
}
