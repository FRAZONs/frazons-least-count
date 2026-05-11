import { motion } from "framer-motion";

export default function PlayerCard({
  player,
  updateScore
}) {

  const eliminated =
    player.eliminated;

  return (

    <motion.div

      initial={{
        opacity: 0,
        y: 40
      }}

      animate={{

      opacity: 1,

       y: 0
    }}

      transition={{

      duration: 0.4,

      ease: "easeOut"
    }}

      style={{

        background:
          `${player.color}22`,

        backdropFilter:
          "blur(14px)",

        border:
          "1px solid rgba(255,255,255,0.15)",

        color:
          player.leading
            ? "#00e5ff"
            : "white",

        padding: 18,

        borderRadius: 22,

        opacity:
          eliminated ? 0.2 : 1,

        filter:
          eliminated
            ? "grayscale(1) blur(1px)"
            : "none",

        transform:
          eliminated
            ? "rotate(-1deg) scale(0.96)"
            : "none",

        boxShadow:
          player.leading
            ? `0 0 25px ${player.color}`
            : "0 0 15px rgba(0,0,0,0.4)"
      }}
    >

      <div
        style={{
          display: "flex",

          justifyContent:
            "space-between",

          alignItems: "center"
        }}
      >

        <h2>
          {player.avatar}
          {" "}
          {player.name}
        </h2>

        {player.leading &&
          !eliminated && (

            <div
              style={{
                fontSize: 24
              }}
            >
              👑
            </div>
          )}

      </div>

      <h1
        style={{
          fontSize: 50,

          marginTop: 0,

          marginBottom: 10
        }}
      >
        {player.total}
      </h1>

      {eliminated ? (

        <div
          style={{
            background: "#ff004c",

            padding: 10,

            borderRadius: 12,

            textAlign: "center",

            fontWeight: "bold"
          }}
        >
          💀 Eliminated
        </div>

      ) : (

        <input
          type="number"

          placeholder="Round score"

          className="score-input"

          onChange={(e) => {

            updateScore(
              player.id,
              e.target.value
            );
          }}

          onKeyDown={(e) => {

            if (e.key === "Enter") {

              e.preventDefault();

              const allInputs =
                Array.from(
                  document.querySelectorAll(
                    ".score-input"
                  )
                );

              const currentIndex =
                allInputs.indexOf(
                  e.target
                );

              const nextInput =
                allInputs[
                  currentIndex + 1
                ];

              if (nextInput) {

                setTimeout(() => {

                  nextInput.focus();

                }, 50);

              } else {

                const submitBtn =
                  document.querySelector(
                    ".submit-round-btn"
                  );

                if (submitBtn) {

                  setTimeout(() => {

                    submitBtn.focus();

                  }, 50);
                }
              }
            }
          }}

          style={{

            width: "100%",

            padding: 14,

            borderRadius: 14,

            border: "none",

            fontSize: 16,

            background:
              "rgba(0,0,0,0.3)",

            color: "white",

            outline: "none"
          }}
        />

      )}

    </motion.div>
  );
}