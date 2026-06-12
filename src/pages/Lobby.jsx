import {
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";

import {
  useEffect
} from "react";

import { db }
  from "../firebase";

import createDeck
  from "../utils/createDeck";

import shuffleDeck
  from "../utils/shuffleDeck";

export default function Lobby({
  setScreen,
  room,
  setRoom
}) {

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

            const roomData =
              snapshot.data();

            setRoom(
              roomData
            );

            if (
              roomData.status ===
              "playing"
            ) {

              setScreen(
                "online-game"
              );

            }

          }

        }
      );

    return () =>
      unsubscribe();

  }, [
    room?.roomCode,
    setRoom,
    setScreen
  ]);

  const startGame =
  async () => {

    let deck =
      shuffleDeck(
        createDeck()
      );

    const players =
      room.players;

    const hands = {};

    players.forEach(
      (player) => {

        hands[player.name.toLowerCase()] = [];
      }
    );

    for (
      let i = 0;
      i < 7;
      i++
    ) {

      players.forEach(
        (player) => {

          hands[
            player.name.toLowerCase()
          ].push(
            deck.pop()
          );

        }
      );

    }

    const jokerCard =
      deck.pop();

    const openCard =
      deck.pop();

    const drawPile =
      deck;

    await updateDoc(
  doc(
    db,
    "rooms",
    room.roomCode
  ),
  {
    status: "playing",

    hands,
    drawPile,
    openCard,
    jokerCard,

    currentPlayer: 0,

    previousOpenCard: null,
    pendingDraw: false,
    pendingPlayer: null,

    scores: {}
  }
);

  };

  return (

    <div
      style={{
        minHeight: "100vh",

        background:
          "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",

        color: "white",

        display: "flex",

        justifyContent:
          "center",

        alignItems:
          "center",

        padding: 20
      }}
    >

      <div
        style={{
          width: "100%",

          maxWidth: 500,

          textAlign:
            "center"
        }}
      >

        <h1
          style={{
            fontSize: 34,

            marginBottom: 25,

            textShadow:
              "0 0 15px rgba(0,229,255,0.5)"
          }}
        >
          ☁️ Room Lobby
        </h1>

        <div
          style={{
            marginTop: 20,

            padding: 30,

            minHeight: 180,

            borderRadius: 18,

            background:
              "rgba(255,255,255,0.08)",

            border:
              "1px solid rgba(255,255,255,0.15)",

            position:
              "relative"
          }}
        >

          <div
            style={{
              color: "#aaa",

              fontSize: 14
            }}
          >
            ROOM CODE
          </div>

          <div
            style={{
              fontSize: 56,

              fontWeight:
                "bold",

              color:
                "#c084fc",

              textAlign:
                "center",

              marginTop: 20,

              letterSpacing:
                "4px"
            }}
          >
            {room?.roomCode}
          </div>

          <button

            onClick={() =>
              navigator.clipboard.writeText(
                room?.roomCode
              )
            }

            style={{

              position:
                "absolute",

              bottom: 20,

              right: 20,

              padding:
                "8px 12px",

              fontSize: 14,

              border:
                "none",

              borderRadius: 12,

              cursor:
                "pointer",

              background:
                "linear-gradient(90deg,#6c5ce7,#8e7dff)",

              color:
                "white"
            }}
          >

            📋 Copy

          </button>

        </div>

        <div
          style={{
            marginTop: 25,

            padding: 20,

            borderRadius: 18,

            background:
              "rgba(255,255,255,0.08)",

            border:
              "1px solid rgba(255,255,255,0.15)"
          }}
        >

          <div
            style={{
              color: "#aaa",

              marginBottom: 15
            }}
          >
            PLAYERS (
            {room?.players?.length || 0}
            /6)
          </div>

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
                      "rgba(255,255,255,0.05)",

                    textAlign:
                      "left"
                  }}
                >

                  {
                    index === 0
                      ? "👑"
                      : "🎮"
                  }

                  {" "}

                  {player.name}

                </div>

              )

            )
          }

        </div>

        <button
          onClick={startGame}

          style={{
            width: "100%",

            padding: 18,

            marginTop: 20,

            border: "none",

            borderRadius: 18,

            background:
              "linear-gradient(90deg,#ff00c8,#ff4d94)",

            color: "white",

            fontWeight:
              "bold",

            fontSize: 18,

            cursor:
              "pointer"
          }}
        >

          🚀 Start Game

        </button>

      </div>

    </div>

  );

}