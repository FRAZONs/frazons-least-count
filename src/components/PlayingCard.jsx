import { useState } from "react";
import { motion } from "framer-motion";

const suitColors = {
  "♠": "#1a1a1a",
  "♣": "#1a1a1a",
  "♥": "#ef4444",
  "♦": "#ef4444"
};

const sizes = {
  md: { width: 82, height: 118, borderRadius: 12, padding: 8, fontSize: 16, centerFontSize: 42, badgeBottom: -24 },
  sm: { width: 55, height: 80, borderRadius: 8, padding: 5, fontSize: 11, centerFontSize: 24, badgeBottom: -18 },
  mini: { width: 34, height: 50, borderRadius: 5, padding: 3, fontSize: 8, centerFontSize: 14, badgeBottom: -12 }
};

export default function PlayingCard({
  card,
  isFaceUp = true,
  selected = false,
  onClick = null,
  hoverable = true,
  style = {},
  badge = null,
  disabled = false,
  innerRef = null,
  size = "md"
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const isJoker = card?.rank === "JOKER";
  const color = isJoker ? "#a855f7" : (suitColors[card?.suit] || "#1a1a1a");
  
  const s = sizes[size] || sizes.md;

  const handleMouseMove = (e) => {
    if (!hoverable || disabled) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 to 0.5
    const y = (e.clientY - rect.top) / rect.height - 0.5; // -0.5 to 0.5
    // Max 15 degrees rotation
    setTilt({ x: x * 15, y: -y * 15 });
  };

  const handleMouseLeave = () => {
    setTilt({ x: 0, y: 0 });
  };

  // Face-down design with high-quality futuristic patterns to match the theme
  const cardBack = (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: s.borderRadius,
        background: "linear-gradient(135deg, #1e1b4b 0%, #090514 100%)",
        border: size === "mini" ? "1px solid rgba(0, 229, 255, 0.4)" : "2px solid rgba(0, 229, 255, 0.4)",
        boxShadow: size === "mini" ? "none" : "inset 0 0 16px rgba(0, 229, 255, 0.25), 0 4px 12px rgba(0,0,0,0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* Decorative inner dotted border */}
      {size !== "mini" && (
        <div
          style={{
            position: "absolute",
            inset: size === "sm" ? 4 : 6,
            border: "1px dashed rgba(192, 132, 252, 0.3)",
            borderRadius: s.borderRadius - 2
          }}
        />
      )}
      {/* Center symbol */}
      <div
        style={{
          fontSize: size === "mini" ? 14 : size === "sm" ? 20 : 28,
          color: "#00e5ff",
          textShadow: "0 0 10px rgba(0, 229, 255, 0.8)",
          fontFamily: "serif",
          zIndex: 2
        }}
      >
        🎴
      </div>
    </div>
  );

  // Styled face-up card design
  const cardFront = (
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: s.borderRadius,
        background: "#fdfdfb",
        border: "1px solid #d1d5db",
        boxShadow: size === "mini" ? "none" : "0 4px 10px rgba(0,0,0,0.3)",
        color: color,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: s.padding,
        position: "relative",
        boxSizing: "border-box"
      }}
    >
      {/* Top Left Rank and Suit */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          alignSelf: "flex-start"
        }}
      >
        <span style={{ fontSize: s.fontSize, fontWeight: 900 }}>{isJoker ? "JK" : card?.rank}</span>
        {!isJoker && size !== "mini" && <span style={{ fontSize: s.fontSize - 3, marginTop: 1 }}>{card?.suit}</span>}
      </div>

      {/* Center Motif / Suit Character */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontSize: s.centerFontSize,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          userSelect: "none"
        }}
      >
        {isJoker ? (
          "🃏"
        ) : ["J", "Q", "K"].includes(card?.rank) ? (
          <span style={{ fontSize: s.centerFontSize - 4 }}>
            {card.rank === "J" ? "⚔️" : card.rank === "Q" ? "👸" : "👑"}
          </span>
        ) : (
          card?.suit
        )}
      </div>

      {/* Bottom Right Rank and Suit (Inverted) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          lineHeight: 1,
          alignSelf: "flex-end",
          transform: "rotate(180deg)"
        }}
      >
        <span style={{ fontSize: s.fontSize, fontWeight: 900 }}>{isJoker ? "JK" : card?.rank}</span>
        {!isJoker && size !== "mini" && <span style={{ fontSize: s.fontSize - 3, marginTop: 1 }}>{card?.suit}</span>}
      </div>
    </div>
  );

  const transformString = `perspective(400px) rotateX(${tilt.y}deg) rotateY(${tilt.x}deg) translateZ(0)`;

  const finalStyle = {
    width: s.width,
    height: s.height,
    borderRadius: s.borderRadius,
    cursor: onClick && !disabled ? "pointer" : "default",
    position: "relative",
    userSelect: "none",
    boxSizing: "border-box",
    boxShadow: selected ? "0 0 20px #00e5ff" : size === "mini" ? "0 2px 4px rgba(0,0,0,0.25)" : "0 4px 8px rgba(0,0,0,0.35)",
    border: selected ? "3.5px solid #00e5ff" : "none",
    transform: selected ? `translateY(-15px) ${transformString}` : transformString,
    transition: selected ? "border 0.2s ease, box-shadow 0.2s ease" : "transform 0.1s ease-out, border 0.2s ease, box-shadow 0.2s ease",
    opacity: disabled ? 0.8 : 1,
    ...style
  };

  return (
    <motion.div
      ref={innerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={(e) => {
        if (!disabled && onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      whileHover={hoverable && !disabled ? { scale: 1.06, y: selected ? -20 : -6, zIndex: 10 } : {}}
      whileTap={hoverable && !disabled ? { scale: 0.96 } : {}}
      style={finalStyle}
    >
      {isFaceUp ? cardFront : cardBack}

      {/* Hover/State Badge */}
      {badge && (
        <div
          style={{
            position: "absolute",
            bottom: s.badgeBottom,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15, 7, 24, 0.88)",
            color: selected ? "#00e5ff" : "#c084fc",
            fontSize: size === "sm" ? 8 : 9,
            padding: "3px 8px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            border: selected ? "1px solid #00e5ff" : "1px solid rgba(192, 132, 252, 0.3)",
            fontWeight: "bold",
            pointerEvents: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.5)",
            zIndex: 11
          }}
        >
          {badge}
        </div>
      )}
    </motion.div>
  );
}
