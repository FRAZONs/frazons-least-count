import createDeck from "./createDeck";
import shuffleDeck from "./shuffleDeck";

export const DEFAULT_ONLINE_SETTINGS = {
  maxScore: 200,
  maxPlayers: 4,
  roundLimit: null,
  declarationPenalty: 40,
  startingCards: 7,
  turnSeconds: 30,
  tieBehavior: "declarer-loses",
  declarationThreshold: 20
};

export const playerKey = (name = "") => name.trim().toLowerCase();

export const getSettings = (settings = {}) => ({
  ...DEFAULT_ONLINE_SETTINGS,
  ...settings
});

export const getCardValue = (card, jokerRank) => {
  if (!card || card.rank === "JOKER" || card.rank === jokerRank) return 0;
  if (card.rank === "A") return 1;
  if (["J", "Q", "K"].includes(card.rank)) return 10;
  return Number(card.rank) || 0;
};

export const getHandValue = (cards = [], jokerRank) =>
  cards.reduce((total, card) => total + getCardValue(card, jokerRank), 0);

export const getDisplayName = (players = [], key) =>
  players.find((player) => playerKey(player.name) === key)?.name || key;

export const getActivePlayers = (room) => {
  const eliminated = room.eliminated || {};
  return (room.players || []).filter((player) => !eliminated[playerKey(player.name)]);
};

export const getNextPlayerIndex = (room, currentIndex = room.currentPlayer || 0) => {
  const players = room.players || [];
  if (!players.length) return 0;

  for (let offset = 1; offset <= players.length; offset += 1) {
    const index = (currentIndex + offset) % players.length;
    if (!room.eliminated?.[playerKey(players[index].name)]) return index;
  }

  return currentIndex;
};

export const createRoundState = (room, roundNumber = 1) => {
  const settings = getSettings(room.settings);
  const activePlayers = getActivePlayers(room);
  const deck = shuffleDeck(createDeck());
  const hands = {};

  activePlayers.forEach((player) => {
    hands[playerKey(player.name)] = [];
  });

  for (let cardIndex = 0; cardIndex < settings.startingCards; cardIndex += 1) {
    activePlayers.forEach((player) => {
      hands[playerKey(player.name)].push(deck.pop());
    });
  }

  const jokerCard = deck.pop();
  const openCard = deck.pop();
  const firstPlayerIndex = Math.max(
    0,
    (room.players || []).findIndex(
      (player) => playerKey(player.name) === playerKey(activePlayers[0]?.name)
    )
  );

  return {
    status: "playing",
    hands,
    handCounts: Object.fromEntries(
      Object.entries(hands).map(([key, cards]) => [key, cards.length])
    ),
    drawPile: deck,
    discardPile: [],
    openCard,
    jokerCard,
    previousOpenCard: null,
    pendingDraw: false,
    pendingPlayer: null,
    currentPlayer: firstPlayerIndex,
    roundNumber,
    roundResult: null,
    declarationResult: null,
    winner: null,
    matchWinner: null,
    turnDeadline: Date.now() + settings.turnSeconds * 1000
  };
};

export const refillDrawPile = (drawPile = [], discardPile = []) => {
  if (drawPile.length > 0 || discardPile.length === 0) {
    return { drawPile: [...drawPile], discardPile: [...discardPile] };
  }

  return {
    drawPile: shuffleDeck(discardPile),
    discardPile: []
  };
};

export const finishRound = (room, roundScores, details = {}) => {
  const settings = getSettings(room.settings);
  const totals = { ...(room.totals || {}) };

  (room.players || []).forEach((player) => {
    const key = playerKey(player.name);
    totals[key] = (totals[key] || 0) + (roundScores[key] || 0);
  });

  const eliminated = { ...(room.eliminated || {}) };
  Object.entries(totals).forEach(([key, total]) => {
    if (total >= settings.maxScore) eliminated[key] = true;
  });

  const activeKeys = (room.players || [])
    .map((player) => playerKey(player.name))
    .filter((key) => !eliminated[key]);
  const reachedRoundLimit =
    settings.roundLimit && (room.roundNumber || 1) >= settings.roundLimit;
  const matchFinished = activeKeys.length <= 1 || reachedRoundLimit;

  let matchWinner = null;
  if (matchFinished) {
    const candidates = activeKeys.length
      ? activeKeys
      : Object.keys(totals);
    const lowestTotal = Math.min(...candidates.map((key) => totals[key] || 0));
    matchWinner = candidates
      .filter((key) => (totals[key] || 0) === lowestTotal)
      .map((key) => getDisplayName(room.players, key))
      .join(", ");
  }

  const history = [
    ...(room.history || []),
    {
      roundNumber: room.roundNumber || 1,
      scores: roundScores,
      totals,
      ...details
    }
  ];

  return {
    status: matchFinished ? "finished" : "round-finished",
    scores: roundScores,
    totals,
    eliminated,
    history,
    roundResult: {
      roundNumber: room.roundNumber || 1,
      scores: roundScores,
      ...details
    },
    declarationResult: details.type === "declaration" ? details : null,
    winner: details.winners?.join(", ") || null,
    matchWinner
  };
};
