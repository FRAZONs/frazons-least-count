import {
  useState,
  useEffect
} from "react";

import Home from "./pages/Home";
import Game from "./pages/Game";

export default function App() {

  const [screen, setScreen] =
    useState("home");

  const [players, setPlayers] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "frazons-players"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    });

  const [history, setHistory] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "frazons-history"
        );

      return saved
        ? JSON.parse(saved)
        : [];
    });

  const [round, setRound] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "frazons-round"
        );

      return saved
        ? JSON.parse(saved)
        : 1;
    });

  useEffect(() => {
    localStorage.setItem(
      "frazons-players",

      JSON.stringify(players)
    );
  }, [players]);

  useEffect(() => {
    localStorage.setItem(
      "frazons-history",

      JSON.stringify(history)
    );
  }, [history]);

  useEffect(() => {
    localStorage.setItem(
      "frazons-round",

      JSON.stringify(round)
    );
  }, [round]);

  return (
    <>
      {screen === "home" ? (
        <Home
          setScreen={setScreen}
        />
      ) : (
        <Game
          setScreen={setScreen}
          players={players}
          setPlayers={setPlayers}
          history={history}
          setHistory={setHistory}
          round={round}
          setRound={setRound}
        />
      )}
    </>
  );
}