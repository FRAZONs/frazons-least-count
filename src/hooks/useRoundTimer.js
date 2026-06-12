import { useEffect, useState } from "react";

export function useRoundTimer(initialSeconds = 30, onTimeup = () => {}) {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsActive(false);
          onTimeup();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, timeLeft, onTimeup]);

  const start = () => setIsActive(true);
  const pause = () => setIsActive(false);
  const reset = () => {
    setTimeLeft(initialSeconds);
    setIsActive(false);
  };

  return {
    timeLeft,
    isActive,
    start,
    pause,
    reset,
    progress: ((initialSeconds - timeLeft) / initialSeconds) * 100
  };
}
