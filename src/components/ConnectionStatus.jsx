import { useConnection } from "../hooks/useConnection";

const STATUS_STYLES = {
  connected: {
    background: "rgba(34, 197, 94, 0.2)",
    borderColor: "#22c55e",
    color: "#22c55e",
    icon: "✅"
  },
  connecting: {
    background: "rgba(234, 179, 8, 0.2)",
    borderColor: "#eab308",
    color: "#eab308",
    icon: "🔄"
  },
  reconnecting: {
    background: "rgba(234, 179, 8, 0.2)",
    borderColor: "#eab308",
    color: "#eab308",
    icon: "⚠️"
  },
  offline: {
    background: "rgba(239, 68, 68, 0.2)",
    borderColor: "#ef4444",
    color: "#ef4444",
    icon: "❌"
  },
  checking: {
    background: "rgba(100, 116, 139, 0.2)",
    borderColor: "#64748b",
    color: "#64748b",
    icon: "..."
  }
};

export default function ConnectionStatus() {
  const { status, isOnline } = useConnection();
  const style = STATUS_STYLES[status] || STATUS_STYLES.checking;

  const labels = {
    connected: "Connected",
    connecting: "Connecting",
    reconnecting: "Reconnecting",
    offline: "Offline",
    checking: "Checking"
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        left: 20,
        zIndex: 9998,
        padding: "8px 14px",
        borderRadius: 20,
        border: `2px solid ${style.borderColor}`,
        background: style.background,
        color: style.color,
        fontSize: 12,
        fontWeight: 600,
        display: "flex",
        gap: 8,
        alignItems: "center",
        backdropFilter: "blur(10px)"
      }}
    >
      <span style={{ fontSize: 14 }}>{style.icon}</span>
      <span>{labels[status]}</span>
    </div>
  );
}
