import {
  useState,
  useEffect,
  useRef
} from "react";

import ambientMusic
  from "./audio/ambient.mp3";

import Particles
  from "@tsparticles/react";

import { loadSlim }
  from "tsparticles-slim";

import Home from "./pages/Home";

import Game from "./pages/Game";

export default function App() {

  const particlesInit =
    async (main) => {

      await loadSlim(main);
    };

  const audioRef =
    useRef(null);

  const [muted, setMuted] =
    useState(false);

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

  useEffect(() => {

    if (audioRef.current) {

      audioRef.current.volume =
        muted ? 0 : 0.15;

      audioRef.current.play()
        .catch(() => {});
    }

  }, [muted]);

  useEffect(() => {

    const moveBackground =
      (e) => {

        const x =
          e.clientX / 50;

        const y =
          e.clientY / 50;

        document.body.style.backgroundPosition =
          `${x}px ${y}px`;
      };

    window.addEventListener(
      "mousemove",
      moveBackground
    );

    return () => {

      window.removeEventListener(
        "mousemove",
        moveBackground
      );
    };

  }, []);

  return (

    <>

      <audio
        ref={audioRef}

        src={ambientMusic}

        loop
      />

      <button

        onClick={() =>
          setMuted(!muted)
        }

        style={{

          position: "fixed",

          top: 20,

          right: 20,

          zIndex: 9999,

          border: "none",

          borderRadius: 50,

          padding: 12,

          background:
            "rgba(255,255,255,0.1)",

          color: "white",

          backdropFilter:
            "blur(10px)"
        }}
      >

        {muted ? "🔇" : "🎵"}

      </button>

      <Particles

        id="tsparticles"

        init={particlesInit}

        options={{

          background: {

            color: {
              value: "transparent"
            }
          },

          fpsLimit: 60,

          interactivity: {

            events: {

              onHover: {

                enable: true,

                mode: "repulse"
              },

              resize: true
            },

            modes: {

              repulse: {

                distance: 120,

                duration: 0.4
              }
            }
          },

          particles: {

            color: {
              value: "#00e5ff"
            },

            links: {

              color: "#c084fc",

              distance: 120,

              enable: true,

              opacity: 0.2,

              width: 1
            },

            move: {

              direction: "none",

              enable: true,

              outModes: {
                default: "bounce"
              },

              random: false,

              speed: 1,

              straight: false
            },

            number: {

              density: {

                enable: true,

                area: 800
              },

              value: 40
            },

            opacity: {

              value: 0.3
            },

            shape: {

              type: "circle"
            },

            size: {

              value: {
                min: 1,
                max: 4
              }
            }
          },

          detectRetina: true
        }}

        style={{

          position: "fixed",

          top: 0,

          left: 0,

          width: "100%",

          height: "100%",

          zIndex: 0
        }}
      />

      <div
        style={{
          position: "relative",

          zIndex: 1,

          width: "100%"
        }}
      >

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

      </div>

    </>

  );
}