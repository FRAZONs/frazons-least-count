import {
  useState,
  useEffect
} from "react";
import {
  doc,
  updateDoc,
  onSnapshot
} from "firebase/firestore";

import { db } from "../firebase";

export default function OnlineGame({
  room,
  setRoom,
  setScreen
}) {

  const [selectedCards,
    setSelectedCards] =
    useState([]);
  const [isDeclaring,
    setIsDeclaring] =
    useState(false);
    useEffect(() => {

  if (!room?.roomCode)
    return;

  const unsubscribe =
    onSnapshot(

      doc(
        db,
        "rooms",
        room.roomCode
      ),

      (snapshot) => {

        if (
          snapshot.exists()
        ) {

          setRoom(
            snapshot.data()
          );

        }

      }

    );

  return () =>
    unsubscribe();

}, [
  room?.roomCode
]);

  const playerName =
    localStorage
      .getItem("playerName")
      ?.toLowerCase();

  const myCards =
    room?.hands?.[
      playerName
    ] || [];
  
  const isMyTurn =
  room?.players?.[
    room?.currentPlayer
  ]?.name?.toLowerCase()
  === playerName;

  const toggleCard =
  (index) => {

    if (!isMyTurn)
  return;

    if (
      selectedCards.includes(
        index
      )
    ) {

      setSelectedCards(
        selectedCards.filter(
          (i) =>
            i !== index
        )
      );

    } else {

      setSelectedCards([
        ...selectedCards,
        index
      ]);

    }

  };

const drawFromDeck =
  async () => {

    const drawPile =
      [...room.drawPile];

    const card =
      drawPile.pop();

    if (!card)
      return;

    const hands = {
      ...room.hands
    };

    hands[playerName] = [
      ...hands[playerName],
      card
    ];

    const nextPlayer =
      (
        room.currentPlayer + 1
      ) %
      room.players.length;

    await updateDoc(
      doc(
        db,
        "rooms",
        room.roomCode
      ),
      {
        hands,
        drawPile,
        pendingDraw: false,
        pendingPlayer: null,
        currentPlayer: nextPlayer
      }
    );

  };

const pickOpenCard =
  async () => {

    const hands = {
      ...room.hands
    };

    hands[playerName] = [
      ...hands[playerName],
      room.previousOpenCard
    ];

    const nextPlayer =
      (
        room.currentPlayer + 1
      ) %
      room.players.length;

    await updateDoc(
      doc(
        db,
        "rooms",
        room.roomCode
      ),
      {
        hands,
        pendingDraw: false,
        pendingPlayer: null,
        currentPlayer: nextPlayer
      }
    );

  };

const playSelectedCards =
  async () => {

    console.log(
      "PLAY BUTTON CLICKED"
    );

    if (!isMyTurn) {

      alert(
        "Not your turn!"
      );

      return;

    }

    if (
      selectedCards.length === 0
    ) {

      return;

    }

    const selected =
      selectedCards.map(
        (index) =>
          myCards[index]
      );

    const firstRank =
      selected[0].rank;

    const allSameRank =
      selected.every(
        (card) =>
          card.rank ===
          firstRank
      );

    if (
      !allSameRank
    ) {

      alert(
        "All selected cards must have the same rank"
      );

      return;

    }

    const openRank =
      room.openCard.rank;

    const isSlash =
      firstRank ===
      openRank;

    const hands = {
      ...room.hands
    };

    let updatedHand =
      [...hands[playerName]];

    selectedCards
      .sort(
        (a, b) =>
          b - a
      )
      .forEach(
        (index) => {

          updatedHand.splice(
            index,
            1
          );

        }
      );

    hands[playerName] =
      updatedHand;

    const hasWon =
    updatedHand.length === 0;

    const newOpenCard =
      selected[
        selected.length - 1
      ];

    const nextPlayer =
      (
        room.currentPlayer + 1
      ) %
      room.players.length;

    if (isSlash) {

  if (hasWon) {
    if (hasWon) {

  await updateDoc(
    doc(
      db,
      "rooms",
      room.roomCode
    ),
    {
      hands,
      winner: playerName,
      status: "finished"
    }
  );

  return;

}

    await updateDoc(
      doc(
        db,
        "rooms",
        room.roomCode
      ),
      {
        hands,
        winner: playerName,
        status: "finished"
      }
    );

    return;

  }

  await updateDoc(
    doc(
      db,
      "rooms",
      room.roomCode
    ),
    {
      hands,
      openCard: newOpenCard,
      currentPlayer: nextPlayer
    }
  );

}

else {

      await updateDoc(

        doc(
          db,
          "rooms",
          room.roomCode
        ),

        {
          hands,

          previousOpenCard:
            room.openCard,

          openCard:
            newOpenCard,

          pendingDraw:
            true,

          pendingPlayer:
            playerName
        }

      );

    }

    setSelectedCards([]);

  };

  const getCardValue =
  (card) => {

    if (!card)
      return 0;

    if (
      card.rank ===
      room?.jokerCard?.rank
    )
      return 0;

    if (
      card.rank === "A"
    )
      return 1;

    if (
      ["J","Q","K"]
      .includes(card.rank)
    )
      return 10;

    return Number(
      card.rank
    ) || 0;

  };

const handValue =
  myCards.reduce(
    (sum, card) =>
      sum +
      getCardValue(
        card
      ),
    0
  );

  const getPlayerCount =
  (cards) => {

    return cards.reduce(

      (sum, card) =>

        sum +
        getCardValue(
          card
        ),

      0

    );

  };

const declareLeastCount =
  async () => {

    if (
      !isMyTurn ||
      room?.status !== "playing" ||
      isDeclaring
    )
      return;

    setIsDeclaring(true);

    const results =
      {};

    Object.entries(
      room.hands
    ).forEach(

      ([name, cards]) => {

        results[name] =
          getPlayerCount(
            cards
          );

      }

    );

    const declarerCount =
      results[playerName];

    const opponentCounts =
      Object.entries(results)
        .filter(
          ([name]) =>
            name !== playerName
        )
        .map(
          ([, count]) => count
        );

    const declarationWon =
      opponentCounts.length === 0 ||
      opponentCounts.every(
        (count) =>
          declarerCount < count
      );

    const finalScores = {
      ...results
    };

    if (!declarationWon) {
      finalScores[playerName] =
        declarerCount + 40;
    }

    const winningScore =
      Math.min(
        ...Object.values(
          finalScores
        )
      );

    const winnerNames =
      Object.entries(finalScores)
        .filter(
          ([, count]) =>
            count === winningScore
        )
        .map(
          ([name]) => name
        );

    const getDisplayName =
      (name) =>
        room.players.find(
          (player) =>
            player.name
              .toLowerCase() ===
            name
        )?.name || name;

    const declarationResult = {
      declarer:
        getDisplayName(
          playerName
        ),
      declarerKey:
        playerName,
      declarationWon,
      penalty:
        declarationWon
          ? 0
          : 40,
      scores:
        finalScores,
      originalScores:
        results,
      winners:
        winnerNames.map(
          getDisplayName
        )
    };

    try {
      await updateDoc(
        doc(
          db,
          "rooms",
          room.roomCode
        ),
        {
          status: "finished",
          winner:
            declarationResult
              .winners
              .join(", "),
          scores:
            finalScores,
          declarationResult
        }
      );
    } catch (error) {
      console.error(
        "Failed to declare least count",
        error
      );
      alert(
        "Could not declare Least Count. Please try again."
      );
    } finally {
      setIsDeclaring(false);
    }

  };

  return (

    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
        color: "white",
        padding: 20
      }}
    >

      <h1
        style={{
          textAlign:
            "center"
        }}
      >
        🎴 Least Count Online
      </h1>
      {
  room?.status ===
    "finished" && (

    <div
      style={{
        background:
          "#00b894",
        padding: 20,
        borderRadius: 12,
        textAlign:
          "center",
        marginBottom: 20
      }}
    >

      🏆 Winner:
      {" "}
      {room?.winner}

    </div>

  )
}
      {
        room?.declarationResult && (
          <div
            style={{
              maxWidth: 520,
              margin:
                "0 auto 20px",
              padding: 20,
              borderRadius: 12,
              background:
                room
                  .declarationResult
                  .declarationWon
                  ? "rgba(0,184,148,0.2)"
                  : "rgba(214,48,49,0.2)",
              border:
                room
                  .declarationResult
                  .declarationWon
                  ? "1px solid #00b894"
                  : "1px solid #d63031"
            }}
          >
            <h2
              style={{
                marginTop: 0,
                textAlign:
                  "center"
              }}
            >
              {
                room
                  .declarationResult
                  .declarationWon
                  ? `${room.declarationResult.declarer} won the declaration`
                  : `${room.declarationResult.declarer} lost the declaration`
              }
            </h2>

            {
              !room
                .declarationResult
                .declarationWon && (
                <p
                  style={{
                    color:
                      "#ff7675",
                    fontWeight:
                      "bold",
                    textAlign:
                      "center"
                  }}
                >
                  40-point penalty applied
                </p>
              )
            }

            {
              Object.entries(
                room
                  .declarationResult
                  .scores
              ).map(
                ([name, score]) => (
                  <div
                    key={name}
                    style={{
                      display:
                        "flex",
                      justifyContent:
                        "space-between",
                      padding:
                        "8px 0",
                      borderBottom:
                        "1px solid rgba(255,255,255,0.12)"
                    }}
                  >
                    <span>
                      {
                        room.players.find(
                          (player) =>
                            player.name
                              .toLowerCase() ===
                            name
                        )?.name ||
                        name
                      }
                    </span>
                    <strong>
                      {score}
                      {
                        name ===
                          room
                            .declarationResult
                            .declarerKey &&
                        room
                          .declarationResult
                          .penalty > 0
                          ? " (includes penalty)"
                          : ""
                      }
                    </strong>
                  </div>
                )
              )
            }
          </div>
        )
      }

      <div
        style={{
          display: "flex",
          justifyContent:
            "center",
          gap: 20,
          marginTop: 20
        }}
      >

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "rgba(255,255,255,0.08)",
            minWidth: 150,
            textAlign:
              "center"
          }}
        >

          <div>
            🃏 Joker
          </div>

          <h2>
            {room?.jokerCard?.rank}
            {room?.jokerCard?.suit}
          </h2>

        </div>

        <div
          style={{
            padding: 20,
            borderRadius: 16,
            background:
              "rgba(255,255,255,0.08)",
            minWidth: 150,
            textAlign:
              "center"
          }}
        >

          <div>
            🎴 Open Card
          </div>

          <h2>
            {room?.openCard?.rank}
            {room?.openCard?.suit}
          </h2>

        </div>

      </div>

      <h2
  style={{
    textAlign: "center",
    marginTop: 20,
    color:
      isMyTurn
        ? "#00ff88"
        : "#00e5ff"
  }}
>
  {
    isMyTurn
      ? "🟢 Your Turn"
      : `⏳ Waiting for ${
          room?.players?.[
            room?.currentPlayer
          ]?.name
        }`
  }
</h2>

      <div
        style={{
          marginTop: 30
        }}
      >

        <h2>
          👥 Players
        </h2>

        {
          room?.players?.map(
            (
              player,
              index
            ) => (

              <div
                key={index}
                style={{
                  padding: 12,
                  marginBottom: 10,
                  borderRadius: 12,
                  background:
                    "rgba(255,255,255,0.08)"
                }}
              >

                {player.name}

              </div>

            )
          )
        }

      </div>

      <div
  style={{
    marginTop: 40
  }}
>

  {
    room?.pendingDraw &&
    room?.pendingPlayer ===
      playerName && (

      <div
        style={{
          marginTop: 20,
          marginBottom: 20
        }}
      >

        <button
          onClick={
            drawFromDeck
          }
          style={{
            padding: 12,
            border: "none",
            borderRadius: 12,
            background: "#00b894",
            color: "white",
            cursor: "pointer"
          }}
        >
          🂠 Draw From Deck
        </button>

        <button
          onClick={
            pickOpenCard
          }
          style={{
            padding: 12,
            border: "none",
            borderRadius: 12,
            background: "#0984e3",
            color: "white",
            cursor: "pointer",
            marginLeft: 10
          }}
        >
          🎴 Pick Open Card
        </button>

      </div>

    )
  }
  <div
  style={{
    color: "#00ff88",
    fontWeight: "bold",
    marginBottom: 10,
    fontSize: 18
  }}
>
  📊 Current Count:
  {" "}
  {handValue}
</div>
{
  isMyTurn &&
  room?.status === "playing" && (

    <button

      onClick={
        declareLeastCount
      }

      disabled={
        isDeclaring
      }

      style={{

        padding: 12,

        border: "none",

        borderRadius: 12,

        background:
          "#f39c12",

        color: "white",

        fontWeight:
          "bold",

        cursor:
          isDeclaring
            ? "not-allowed"
            : "pointer",

        marginBottom: 15,

        opacity:
          isDeclaring
            ? 0.65
            : 1

      }}
    >

      📢 Declare Least Count

    </button>

  )
}

  <h2
    style={{
      marginTop: 20
    }}
  >
    ✋ Your Hand
  </h2>

  {selectedCards.length > 0 && (

  <div
    style={{
      marginBottom: 20,
      color: "#00e5ff",
      fontWeight: "bold",
      display: "flex",
      alignItems: "center",
      gap: 15
    }}
  >

    <span>
      Selected:
      {" "}
      {selectedCards.length}
      {" "}
      card(s)
    </span>

    <button

      onClick={playSelectedCards}

      disabled={!isMyTurn}

      style={{

        padding: 12,

        border: "none",

        borderRadius: 12,

        background:
          isMyTurn
            ? "#ff00c8"
            : "#555",

        color: "white",

        fontWeight: "bold",

        cursor: "pointer"

      }}
    >

      ▶ Play Selected Cards

    </button>

  </div>

)}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12
          }}
        >

          {
            myCards.map(
              (
                card,
                index
              ) => (

                <div

                  key={index}

                  onClick={() =>
                    toggleCard(
                      index
                    )
                  }

                  style={{

                    width: 90,
                    height: 130,

                    background:
                      selectedCards.includes(
                        index
                      )
                        ? "#00e5ff"
                        : "white",

                    color:
                      "black",

                    borderRadius: 12,

                    display: "flex",

                    flexDirection:
                      "column",

                    justifyContent:
                      "space-between",

                    padding: 10,

                    fontWeight:
                      "bold",

                    cursor:
                      "pointer",

                    transform:
                      selectedCards.includes(
                        index
                      )
                        ? "translateY(-10px)"
                        : "none",

                    transition:
                      "0.2s"
                  }}

                >

                  <div>
                    {card.rank}
                    {card.suit}
                  </div>

                  <div
                    style={{
                      textAlign:
                        "center",
                      fontSize: 28
                    }}
                  >
                    {card.suit}
                  </div>

                  <div
                    style={{
                      textAlign:
                        "right"
                    }}
                  >
                    {card.rank}
                  </div>

                </div>

              )
            )
          }

        </div>

      </div>

    </div>

  );

}
