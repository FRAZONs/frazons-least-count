export default function Home({
  setScreen
}) {

  const hasSave =
    localStorage.getItem(
      "frazons-players"
    );

  const startNewGame = () => {

    localStorage.removeItem(
      "frazons-players"
    );

    localStorage.removeItem(
      "frazons-history"
    );

    localStorage.removeItem(
      "frazons-round"
    );

    setScreen("game");
  };

  const clearMatch = () => {

    localStorage.removeItem(
      "frazons-players"
    );

    localStorage.removeItem(
      "frazons-history"
    );

    localStorage.removeItem(
      "frazons-round"
    );

    window.location.reload();
  };

  return (
    <div
      style={{
        minHeight: "100vh",

        background:
          "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",

        color: "white",

        fontFamily: "Arial",

        display: "flex",

        justifyContent:
          "center",

        alignItems: "center",

        padding: 20
      }}
    >
      <div
        style={{
          width: "100%",

          maxWidth: 400,

          textAlign: "center"
        }}
      >
        <div
          style={{
            fontSize: 90
          }}
        >
          🎴
        </div>

        <h1
          style={{
            fontSize: 42
          }}
        >
          Frazon's
        </h1>

        <h2
          style={{
            color: "#00e5ff"
          }}
        >
          Least Count
        </h2>

        {hasSave && (
          <button
            onClick={() =>
              setScreen("game")
            }

            style={{
              width: "100%",

              padding: 18,

              borderRadius: 20,

              border: "none",

              background:
                "#00e5ff",

              color: "black",

              fontSize: 18,

              fontWeight:
                "bold",

              marginTop: 30,

              cursor: "pointer"
            }}
          >
            🎮 Continue Match
          </button>
        )}

        <button
          onClick={startNewGame}

          style={{
            width: "100%",

            padding: 18,

            borderRadius: 20,

            border: "none",

            background:
              "#ff00c8",

            color: "white",

            fontSize: 18,

            fontWeight: "bold",

            marginTop: 15,

            cursor: "pointer"
          }}
        >
          ✨ Start New Match
        </button>

        <button
          onClick={clearMatch}

          style={{
            width: "100%",

            padding: 18,

            borderRadius: 20,

            border: "none",

            background:
              "#ff004c",

            color: "white",

            fontSize: 18,

            fontWeight: "bold",

            marginTop: 15,

            cursor: "pointer"
          }}
        >
          🗑 Clear Match
        </button>
      </div>
    </div>
  );
}