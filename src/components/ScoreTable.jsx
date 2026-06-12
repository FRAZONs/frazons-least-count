export default function ScoreTable({
  history,
  players,
  scoreLimit = 200
}) {
  const cumulativeScores = Array(players.length).fill(0);
  
  const historyWithCumulative = history.map((round) => {
    const roundScores = round.scores;
    const roundCumulative = roundScores.map((score, index) => {
      cumulativeScores[index] += Number(score) || 0;
      return cumulativeScores[index];
    });
    const lowestRoundScore = Math.min(...roundScores);
    return {
      ...round,
      cumulative: roundCumulative,
      lowestScore: lowestRoundScore
    };
  });

  return (
    <div
      style={{
        marginTop: 30,
        background: "#1d1d1d",
        borderRadius: 20,
        padding: 20,
        overflowX: "auto",
        border: "1px solid rgba(255,255,255,0.08)"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 15, flexWrap: "wrap", gap: 10 }}>
        <h2 style={{ margin: 0 }}>📊 Match History</h2>
        <span style={{ fontSize: 13, color: "#aaa", background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
          Limit: <strong style={{ color: "#ff00c8" }}>{scoreLimit} pts</strong>
        </span>
      </div>

      {history.length === 0 ? (
        <div style={{ textAlign: "center", padding: "20px 0", color: "#666", fontSize: 15 }}>
          No rounds recorded yet. Play a round to see details!
        </div>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "center"
          }}
        >
          <thead>
            <tr
              style={{
                background: "rgba(0, 229, 255, 0.15)",
                color: "#00e5ff",
                borderBottom: "2px solid rgba(0, 229, 255, 0.3)"
              }}
            >
              <th style={{ padding: 12 }}>Round</th>
              {players.map((p, index) => {
                const isEliminatedNow = cumulativeScores[index] > scoreLimit;
                return (
                  <th key={p.id} style={{ padding: 12, color: isEliminatedNow ? "#ef4444" : "white" }}>
                    <div>{p.avatar} {p.name}</div>
                    <div style={{ fontSize: 10, fontWeight: "normal", color: isEliminatedNow ? "#ef4444" : "#aaa", marginTop: 2 }}>
                      {isEliminatedNow ? "ELIMINATED" : `Total: ${cumulativeScores[index]}p`}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {historyWithCumulative.map((round) => (
              <tr key={round.round} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                <td style={{ padding: 12, fontWeight: "bold", color: "#c084fc", borderRight: "1px solid rgba(255,255,255,0.04)" }}>
                  R{round.round}
                </td>
                {round.scores.map((score, index) => {
                  const cum = round.cumulative[index];
                  const isLowest = score === round.lowestScore;
                  const isEliminated = cum > scoreLimit;
                  const isHighScore = score >= 20;

                  return (
                    <td key={index} style={{ padding: 12 }}>
                      <div
                        style={{
                          color: isEliminated ? "#ef4444" : isLowest ? "#00ff88" : isHighScore ? "#ffb03a" : "white",
                          fontWeight: isLowest ? "bold" : "normal",
                          textDecoration: isEliminated ? "line-through" : "none",
                          fontSize: 16
                        }}
                      >
                        {score}
                      </div>
                      <div style={{ fontSize: 11, color: isEliminated ? "#ef4444" : "#888", marginTop: 2 }}>
                        ({cum} pts) {isEliminated && "💀"}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}