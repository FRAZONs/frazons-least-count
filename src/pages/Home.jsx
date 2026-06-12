import { STORAGE_KEYS, BUTTON_STYLES, HOME_PAGE_STYLE } from "../constants";

export default function Home({ setScreen }) {
  const hasSave = localStorage.getItem(STORAGE_KEYS.players);

  const clearStorage = () => {
    localStorage.removeItem(STORAGE_KEYS.players);
    localStorage.removeItem(STORAGE_KEYS.history);
    localStorage.removeItem(STORAGE_KEYS.round);
  };

  const startNewGame = () => {
    clearStorage();
    setScreen("game");
  };

  const clearMatch = () => {
    clearStorage();
    window.location.reload();
  };

  const buttonStyle = (colorVariant) => ({
    ...BUTTON_STYLES.base,
    ...BUTTON_STYLES[colorVariant]
  });

  return (
    <div style={HOME_PAGE_STYLE.container}>
      <div style={HOME_PAGE_STYLE.wrapper}>
        <img src="/new-icon-512.png" alt="Frazon's Logo" style={HOME_PAGE_STYLE.logo} />
        <h1 style={HOME_PAGE_STYLE.title}>FRAZON'S</h1>
        <div style={HOME_PAGE_STYLE.subtitle}>LEAST COUNT</div>
        <p style={HOME_PAGE_STYLE.description}>ONLINE CARD BATTLES</p>

        {hasSave && (
          <button onClick={() => setScreen("game")} style={buttonStyle("cyan")}>
            🎮 Continue Match
          </button>
        )}

        <button onClick={startNewGame} style={buttonStyle("pink")}>
          ✨ Start New Match
        </button>

        <button onClick={clearMatch} style={buttonStyle("red")}>
          🗑 Clear Match
        </button>

        <button onClick={() => setScreen("multiplayer")} style={buttonStyle("purple")}>
          ☁️ Online Multiplayer
        </button>

        <button onClick={() => setScreen("practice")} style={buttonStyle("pink")}>
          🤖 Practice Mode (Bots)
        </button>

        <button onClick={() => setScreen("stats")} style={buttonStyle("purple")}>
          📊 Career Stats
        </button>

        <button onClick={() => setScreen("leaderboard")} style={buttonStyle("cyan")}>
          🏆 Leaderboard
        </button>
      </div>
    </div>
  );
}
