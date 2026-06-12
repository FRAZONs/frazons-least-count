import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TUTORIAL_STEPS = [
  {
    title: "🎴 Your Hand",
    description: "These are the cards currently in your hand. Select cards of the SAME RANK (e.g., two 7s or three Queens) to play them.",
    selector: ".tutorial-hand",
    arrowDirection: "down"
  },
  {
    title: "⚡ Discard / Play Selected",
    description: "After selecting cards of matching rank, click 'Play Selected' to toss them onto the Discard Pile. Slashes are instant turns!",
    selector: ".tutorial-play-btn",
    arrowDirection: "down"
  },
  {
    title: "🃏 Draw Pile & Discard",
    description: "After playing, click the facedown Draw Deck or the previous Open Card on the playing table to draw. Slashes skip this step!",
    selector: ".tutorial-draw-deck",
    arrowDirection: "up"
  },
  {
    title: "📣 Declare Least Count",
    description: "If your hand's total point count is low (usually <= 5) and you think it is the lowest at the table, click this to declare showdown!",
    selector: ".tutorial-declare-btn",
    arrowDirection: "down"
  }
];

export default function TutorialOverlay({ onComplete }) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState(null);
  const resizeInterval = useRef(null);

  const currentStep = TUTORIAL_STEPS[step];

  const updateTargetBounds = () => {
    if (!currentStep?.selector) {
      setRect(null);
      return;
    }
    const el = document.querySelector(currentStep.selector);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  };

  useEffect(() => {
    updateTargetBounds();
    
    // Poll to handle animations or loading delays
    resizeInterval.current = setInterval(updateTargetBounds, 300);
    window.addEventListener("resize", updateTargetBounds);
    
    return () => {
      clearInterval(resizeInterval.current);
      window.removeEventListener("resize", updateTargetBounds);
    };
  }, [step, currentStep?.selector]);

  const handleNext = () => {
    if (step < TUTORIAL_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const tooltipStyles = () => {
    if (!rect) {
      return {
        position: "fixed",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        width: 320
      };
    }

    const { left, top, width, height } = rect;
    const arrowDir = currentStep.arrowDirection;

    if (arrowDir === "up") {
      return {
        position: "absolute",
        top: top + height + window.scrollY + 16,
        left: Math.max(16, Math.min(window.innerWidth - 336, left + width / 2 - 150)),
        width: 300
      };
    } else {
      return {
        position: "absolute",
        top: Math.max(16, top + window.scrollY - 200),
        left: Math.max(16, Math.min(window.innerWidth - 336, left + width / 2 - 150)),
        width: 300
      };
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 999999,
        pointerEvents: "none",
        minHeight: "100vh"
      }}
    >
      {/* Dimmed Background Spotlight Overlay */}
      <AnimatePresence>
        {rect && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.4)",
              backdropFilter: "blur(2px)",
              pointerEvents: "auto",
              zIndex: 999997
            }}
          />
        )}
      </AnimatePresence>

      {/* Target Highlight Box */}
      {rect && (
        <motion.div
          animate={{
            x: rect.left,
            y: rect.top + window.scrollY,
            width: rect.width,
            height: rect.height,
            opacity: 1
          }}
          initial={{ opacity: 0 }}
          transition={{ type: "spring", stiffness: 120, damping: 15 }}
          style={{
            position: "absolute",
            border: "3px solid #00e5ff",
            boxShadow: "0 0 25px rgba(0, 229, 255, 0.8), inset 0 0 15px rgba(0, 229, 255, 0.3)",
            borderRadius: 14,
            zIndex: 999998,
            pointerEvents: "none"
          }}
        />
      )}

      {/* Tooltip Card */}
      <motion.div
        key={`step-${step}`}
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          ...tooltipStyles(),
          background: "rgba(15, 7, 24, 0.96)",
          border: "1px solid rgba(0, 229, 255, 0.3)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.8)",
          borderRadius: 20,
          padding: 20,
          zIndex: 999999,
          pointerEvents: "auto",
          color: "white"
        }}
      >
        <h3 style={{ margin: "0 0 8px 0", color: "#00e5ff", fontSize: 18 }}>{currentStep.title}</h3>
        <p style={{ margin: "0 0 20px 0", fontSize: 13, color: "#ddd", lineHeight: 1.5 }}>
          {currentStep.description}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            onClick={onComplete}
            style={{
              background: "none",
              border: "none",
              color: "#aaa",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Skip Tour
          </button>
          
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#888" }}>
              {step + 1} / {TUTORIAL_STEPS.length}
            </span>
            <button
              onClick={handleNext}
              style={{
                background: "#00e5ff",
                color: "black",
                border: "none",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              {step === TUTORIAL_STEPS.length - 1 ? "Got it! 👍" : "Next ➡️"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
