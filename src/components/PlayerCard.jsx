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

      whileHover={{
        scale: 1.03
      }}

      transition={{
        duration: 0.3
      }}

      style={{

        background:
          player.color,

        color: "white",

        padding: 18,

        borderRadius: 22,

        opacity:
          eliminated ? 0.4 : 1,

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
          ❌ Eliminated
        </div>

      ) : (

        <input
          type="number"

          placeholder="Round score"

          onChange={(e) =>
            updateScore(
              player.id,
              e.target.value
            )
          }

          style={{
            width: "100%",

            padding: 14,

            borderRadius: 14,

            border: "none",

            fontSize: 16,

            background:
              "rgba(0,0,0,0.3)",

            color: "white"
          }}
        />

      )}

    </motion.div>
  );
}