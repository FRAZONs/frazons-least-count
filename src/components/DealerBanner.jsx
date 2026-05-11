export default function DealerBanner({
  dealer
}) {
  return (
    <div
      style={{
        background: "#00e5ff",
        color: "black",
        padding: 15,
        borderRadius: 18,
        marginBottom: 20,
        textAlign: "center",
        fontWeight: "bold",
        fontSize: 18
      }}
    >
      🃏 Dealer & Shuffler:
      {" "}
      {dealer}
    </div>
  );
}