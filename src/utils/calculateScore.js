export default function
calculateScore(
  cards,
  jokerValue
) {

  let total = 0;

  for (
    const card of cards
  ) {

    if (
      card.rank ===
      "JOKER"
    ) {
      continue;
    }

    if (
      card.rank ===
      jokerValue
    ) {
      continue;
    }

    if (
      card.rank === "A"
    ) {

      total += 1;

    } else if (

      ["J", "Q", "K"]
        .includes(
          card.rank
        )

    ) {

      total += 10;

    } else {

      total += Number(
        card.rank
      );

    }

  }

  return total;

}