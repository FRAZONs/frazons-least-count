export default function ScoreTable({
  history,
  players
}) {
  return (
    <div
      style={{
        marginTop: 30,
        background: "#1d1d1d",
        borderRadius: 20,
        padding: 15,
        overflowX: "auto"
      }}
    >
      <h2>
        📊 Match History
      </h2>

      <table
        style={{
          width: "100%",
          borderCollapse:
            "collapse",
          textAlign: "center"
        }}
      >
        <thead>
          <tr
            style={{
              background:
                "#00e5ff",
              color: "black"
            }}
          >
            <th
              style={{
                padding: 10
              }}
            >
              Round
            </th>

            {players.map((p) => (
              <th key={p.id}>
                {p.name}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {history.map((round) => (
            <tr key={round.round}>
              <td
                style={{
                  padding: 10
                }}
              >
                {round.round}
              </td>

              {round.scores.map(
                (score, index) => (
                  <td key={index}>
                    {score}
                  </td>
                )
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}