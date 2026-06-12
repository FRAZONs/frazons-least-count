import { useEffect, useState } from "react";
import Toast from "./Toast";
import { useToast } from "../hooks/useToast";

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  // Create a global toast store listener
  useEffect(() => {
    const toastStore = {
      listeners: [],
      toasts: [],
      subscribe(listener) {
        this.listeners.push(listener);
        return () => {
          this.listeners = this.listeners.filter((l) => l !== listener);
        };
      }
    };

    // Simple implementation: poll the internal state
    const checkInterval = setInterval(() => {
      // This will be called by useToast hook
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  // Get toasts from hook
  const { toasts: hookToasts, dismiss } = useToast();

  useEffect(() => {
    setToasts(hookToasts);
  }, [hookToasts]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        right: 20,
        zIndex: 10000,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none"
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{ pointerEvents: "auto" }}
        >
          <Toast toast={toast} onDismiss={dismiss} />
        </div>
      ))}

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
