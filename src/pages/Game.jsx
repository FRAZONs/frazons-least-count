import { useState } from "react";

import Confetti from "react-confetti";

import PlayerCard from "../components/PlayerCard";
import DealerBanner from "../components/DealerBanner";
import ScoreTable from "../components/ScoreTable";

export default function Game({
  setScreen,
  players,
  setPlayers,
  history,
  setHistory,
  round,
  setRound
}) {

  const [playerName, setPlayerName] =
    useState("");

  const [playerAvatar, setPlayerAvatar] =
    useState("😈");

  const [playerColor, setPlayerColor] =
    useState("#00e5ff");

  const [scores, setScores] =
    useState({});

  const [winner, setWinner] =
    useState(null);

  const addPlayer = () => {

    if (!playerName.trim())
      return;

    if (players.length >= 7) {

      alert(
        "Maximum 7 players allowed"
      );

      return;
    }

    const newPlayer = {

      id: Date.now(),

      name: playerName,

      avatar: playerAvatar,

      color: playerColor,

      total: 0,

      leading: false,

      eliminated: false
    };

    setPlayers([
      ...players,
      newPlayer
    ]);

    setPlayerName("");
  };

  const updateScore = (
    id,
    value
  ) => {

    setScores({
      ...scores,

      [id]: value
    });
  };

  const submitRound = () => {

    if (players.length === 0)
      return;

    const missingScores =
      players.some(
        (player) =>
          !player.eliminated &&
          (
            scores[player.id] ===
              undefined ||
            scores[player.id] === ""
          )
      );

    if (missingScores) {

      alert(
        "⚠️ Enter scores for all active players before submitting!"
      );

      return;
    }

    let updatedPlayers =
      players.map((player) => {

        if (player.eliminated)
          return player;

        const roundScore =
          Number(
            scores[player.id]
          ) || 0;

        const newTotal =
          player.total +
          roundScore;

        return {

          ...player,

          total: newTotal,

          eliminated:
            newTotal > 200
        };
      });

    const activePlayers =
      updatedPlayers.filter(
        (p) => !p.eliminated
      );

    if (activePlayers.length > 0) {

      const lowestScore =
        Math.min(
          ...activePlayers.map(
            (p) => p.total
          )
        );

      updatedPlayers =
        updatedPlayers.map(
          (player) => ({

            ...player,

            leading:
              !player.eliminated &&
              player.total ===
                lowestScore
          })
        );
    }

    const roundData = {

      round,

      scores:
        updatedPlayers.map(
          (p) =>
            scores[p.id] || 0
        )
    };

    setHistory([
      ...history,
      roundData
    ]);

    setPlayers(updatedPlayers);

    if (activePlayers.length === 1) {

      setTimeout(() => {

        setWinner(
          activePlayers[0]
        );

      }, 300);
    }

    setScores({});

    setRound(round + 1);
  };

  const dealer =
    players.length > 0
      ? players[
          (round - 1) %
            players.length
        ].name
      : "No Players Yet";

  return (

    <div
      style={{
        minHeight: "100vh",

        background:
          "linear-gradient(180deg,#0d0d0d,#180028,#001f3f)",

        color: "white",

        fontFamily: "Arial",

        padding: 20
      }}
    >

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center",

          marginBottom: 25
        }}
      >

        <div>

          <h1
            style={{
              margin: 0
            }}
          >
            🎴 Least Count
          </h1>

          <p
            style={{
              color: "#00e5ff"
            }}
          >
            Round {round}
          </p>

        </div>

        <button
          onClick={() =>
            setScreen("home")
          }

          style={{
            background: "#222",

            color: "white",

            border: "none",

            padding: 12,

            borderRadius: 14,

            cursor: "pointer"
          }}
        >
          🏠
        </button>

      </div>

      <DealerBanner
        dealer={dealer}
      />

      <div
        style={{
          background: "#1d1d1d",

          padding: 16,

          borderRadius: 20,

          marginBottom: 25
        }}
      >

        <input
          value={playerName}

          onChange={(e) =>
            setPlayerName(
              e.target.value
            )
          }

          placeholder="Enter player name"

          style={{
            width: "100%",

            padding: 14,

            borderRadius: 14,

            border: "none",

            fontSize: 16,

            marginBottom: 10
          }}
        />

        <div
          style={{
            display: "flex",

            gap: 10,

            marginBottom: 10
          }}
        >

          <select
            value={playerAvatar}

            onChange={(e) =>
              setPlayerAvatar(
                e.target.value
              )
            }

            style={{
              flex: 1,

              padding: 12,

              borderRadius: 12,

              border: "none"
            }}
          >

            <option>😈</option>
            <option>🤖</option>
            <option>🦊</option>
            <option>🐸</option>
            <option>🦅</option>
            <option>🎭</option>
            <option>👑</option>

          </select>

          <input
            type="color"

            value={playerColor}

            onChange={(e) =>
              setPlayerColor(
                e.target.value
              )
            }

            style={{
              width: 70,

              height: 45,

              border: "none",

              borderRadius: 10
            }}
          />

        </div>

        <button
          onClick={addPlayer}

          style={{
            width: "100%",

            padding: 14,

            borderRadius: 14,

            border: "none",

            background:
              "#ff00c8",

            color: "white",

            fontWeight:
              "bold",

            cursor: "pointer"
          }}
        >
          ➕ Add Player
        </button>

      </div>

      <div
        style={{
          display: "grid",

          gridTemplateColumns:
            "repeat(auto-fit,minmax(240px,1fr))",

          gap: 15
        }}
      >

        {players.map((player) => (

          <PlayerCard
            key={player.id}

            player={player}

            updateScore={
              updateScore
            }
          />

        ))}

      </div>

      {players.length > 0 && (

        <button
          onClick={submitRound}

          style={{
            width: "100%",

            marginTop: 25,

            padding: 18,

            borderRadius: 18,

            border: "none",

            background:
              "#ff00c8",

            color: "white",

            fontWeight: "bold",

            fontSize: 18,

            cursor: "pointer"
          }}
        >
          🎯 Submit Round
        </button>

      )}

      <ScoreTable
        history={history}
        players={players}
      />

      {winner && (

        <>

          <Confetti />

          <div
            style={{
              position: "fixed",

              inset: 0,

              background:
                "rgba(0,0,0,0.9)",

              display: "flex",

              justifyContent:
                "center",

              alignItems: "center",

              zIndex: 999
            }}
          >

            <div
              style={{
                background:
                  winner.color,

                padding: 40,

                borderRadius: 30,

                textAlign: "center",

                boxShadow:
                  `0 0 40px ${winner.color}`,

                width: 320
              }}
            >

              <div
                style={{
                  fontSize: 80
                }}
              >
                👑
              </div>

              <h1
                style={{
                  marginBottom: 10
                }}
              >
                {winner.avatar}
                {" "}
                {winner.name}
              </h1>

              <h2>
                Wins The Match!
              </h2>

              <button
                onClick={() => {

                  localStorage.clear();

                  window.location.reload();
                }}

                style={{
                  marginTop: 20,

                  width: "100%",

                  padding: 16,

                  borderRadius: 16,

                  border: "none",

                  background: "black",

                  color: "white",

                  fontWeight: "bold",

                  fontSize: 16,

                  cursor: "pointer"
                }}
              >
                🎮 Start New Match
              </button>

            </div>

          </div>

        </>

      )}

    </div>
  );
}