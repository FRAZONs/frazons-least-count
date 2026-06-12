export const STORAGE_KEYS = {
  players: "frazons-players",
  history: "frazons-history",
  round: "frazons-round"
};

export const BUTTON_STYLES = {
  base: {
    width: "100%",
    padding: 18,
    borderRadius: 20,
    border: "none",
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 15,
    cursor: "pointer",
    transition: "transform 0.2s, opacity 0.2s"
  },
  cyan: {
    background: "#00e5ff",
    color: "black"
  },
  pink: {
    background: "#ff00c8",
    color: "white"
  },
  red: {
    background: "#ff004c",
    color: "white"
  },
  purple: {
    background: "#6c5ce7",
    color: "white"
  }
};

export const HOME_PAGE_STYLE = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(180deg,#0f0f0f,#170028,#001f3f)",
    color: "white",
    fontFamily: "Arial",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: 20
  },
  wrapper: {
    width: "100%",
    maxWidth: 400,
    textAlign: "center"
  },
  logo: {
    width: 110,
    marginBottom: 10,
    filter: "drop-shadow(0 0 20px rgba(255,0,200,0.5))"
  },
  title: {
    fontSize: 54,
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-2px",
    color: "white",
    textShadow: "0 0 20px rgba(0,229,255,0.4)"
  },
  subtitle: {
    color: "#00e5ff",
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: "4px",
    marginTop: 8
  },
  description: {
    color: "#9ca3af",
    fontSize: 13,
    letterSpacing: "3px",
    marginTop: 10,
    marginBottom: 30
  }
};
