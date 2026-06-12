import { useEffect } from "react";

const TOAST_COLORS = {
  success: {
    background: "rgba(34, 197, 94, 0.2)",
    border: "1px solid #22c55e",
    color: "#22c55e",
    icon: "✅"
  },
  error: {
    background: "rgba(239, 68, 68, 0.2)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    icon: "❌"
  },
  warning: {
    background: "rgba(234, 179, 8, 0.2)",
    border: "1px solid #eab308",
    color: "#eab308",
    icon: "⚠️"
  },
  info: {
    background: "rgba(59, 130, 246, 0.2)",
    border: "1px solid #3b82f6",
    color: "#3b82f6",
    icon: "ℹ️"
  }
};

export default function Toast({ toast, onDismiss }) {
  useEffect(() => {
    // Auto-dismiss is handled by useToast, but this can be used for animations
  }, []);

  const colors = TOAST_COLORS[toast.type] || TOAST_COLORS.info;

  return (
    <div
      style={{
        padding: "12px 16px",
        marginBottom: 10,
        borderRadius: 12,
        border: colors.border,
        background: colors.background,
        color: colors.color,
        fontSize: 14,
        display: "flex",
        gap: 10,
        alignItems: "center",
        backdropFilter: "blur(10px)",
        maxWidth: 400,
        wordBreak: "break-word",
        animation: "slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        transition: "all 0.2s ease"
      }}
    >
      <span style={{ fontSize: 16, flexShrink: 0 }}>{colors.icon}</span>
      <span style={{ flex: 1 }}>{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        style={{
          background: "none",
          border: "none",
          color: "inherit",
          cursor: "pointer",
          fontSize: 18,
          padding: 0,
          flexShrink: 0,
          transition: "opacity 0.2s ease"
        }}
      >
        ✕
      </button>
    </div>
  );
}
