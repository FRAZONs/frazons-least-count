export default function createDeck() {

  const suits = [
    "♠",
    "♥",
    "♦",
    "♣"
  ];

  const ranks = [
    "A",
    "2",
    "3",
    "4",
    "5",
    "6",
    "7",
    "8",
    "9",
    "10",
    "J",
    "Q",
    "K"
  ];

  const deck = [];

  for (
    let deckNo = 0;
    deckNo < 2;
    deckNo++
  ) {

    for (
      const suit of suits
    ) {

      for (
        const rank of ranks
      ) {

        deck.push({
          rank,
          suit
        });

      }

    }

  }

  deck.push({
    rank: "JOKER"
  });

  deck.push({
    rank: "JOKER"
  });

  return deck;

}