import { useState, useEffect } from "react";
import { enableNetwork, disableNetwork } from "firebase/firestore";
import { db } from "../firebase";

export function useConnection() {
  const [status, setStatus] = useState("checking");
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    setStatus("checking");

    // Track online/offline status
    const handleOnline = () => {
      setIsOnline(true);
      setStatus("connected");
      enableNetwork(db).catch(() => setStatus("reconnecting"));
    };

    const handleOffline = () => {
      setIsOnline(false);
      setStatus("offline");
      disableNetwork(db).catch(() => {});
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Test Firestore connectivity
    const testConnection = async () => {
      try {
        const response = await fetch("https://firebaseinstallations.googleapis.com/v1/projects/_/instances");
        if (response.ok) {
          setStatus("connected");
        } else {
          setStatus("reconnecting");
        }
      } catch {
        setStatus("offline");
      }
    };

    // Initial connection test
    if (navigator.onLine) {
      testConnection();
    }

    // Periodic connection test every 30 seconds
    const interval = setInterval(testConnection, 30000);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  return { status, isOnline };
}
