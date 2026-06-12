import { useState, useEffect } from "react";
import { enableNetwork, disableNetwork } from "firebase/firestore";
import { db } from "../firebase";

export function useConnection() {
  const [status, setStatus] = useState(() =>
    navigator.onLine ? "checking" : "offline"
  );

  useEffect(() => {
    const handleOnline = () => {
      setStatus("reconnecting");
      enableNetwork(db)
        .then(() => setStatus("connected"))
        .catch(() => setStatus("reconnecting"));
    };

    const handleOffline = () => {
      setStatus("offline");
      disableNetwork(db).catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    if (navigator.onLine) {
      enableNetwork(db)
        .then(() => setStatus("connected"))
        .catch(() => setStatus("reconnecting"));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return { status, isOnline: status !== "offline" };
}
