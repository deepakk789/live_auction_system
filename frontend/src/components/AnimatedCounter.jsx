import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import Counter from "./Counter";

/**
 * AnimatedCounter — wrappers the React Bits Counter component
 * smoothly animates between number values with prefix/suffix support.
 */
export default function AnimatedCounter({
  value = 0,
  prefix = "",
  suffix = "",
  fontSize = "1rem",
  color = "inherit",
  fontWeight = "inherit",
  className = "",
  highlight = false,
  style = {},
}) {
  const [flash, setFlash] = useState(false);
  const prevValue = useRef(value);

  // Fix React Bits Counter invisibility:
  // .text-gradient applies `-webkit-text-fill-color: transparent` which breaks absolute positioned numbers
  const isGradient = className && className.includes("text-gradient");
  const finalClassName = className ? className.replace("text-gradient", "").trim() : "";
  const finalColor = isGradient && color === "inherit" ? "#60a5fa" : color;

  // Auto-calculate numeric fontSize for Counter if a string is provided (e.g. "2rem")
  let numFontSize = 24;
  if (typeof fontSize === "string") {
      if (fontSize.includes("rem")) numFontSize = parseFloat(fontSize) * 16;
      else if (fontSize.includes("px")) numFontSize = parseFloat(fontSize);
      else if (fontSize.includes("em")) numFontSize = parseFloat(fontSize) * 16;
  } else if (typeof fontSize === "number") {
      numFontSize = fontSize;
  }

  // Highlight pulse when value changes
  useEffect(() => {
    if (highlight && prevValue.current !== value) {
      setFlash(true);
      const timer = setTimeout(() => setFlash(false), 600);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value, highlight]);

  return (
    <motion.span
      className={finalClassName}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontVariantNumeric: "tabular-nums",
        transition: "text-shadow 0.3s ease, color 0.3s ease",
        textShadow: flash
          ? "0 0 20px rgba(59, 130, 246, 0.8), 0 0 40px rgba(59, 130, 246, 0.4)"
          : "none",
        ...style,
      }}
      animate={
        flash
          ? { scale: [1, 1.1, 1], transition: { duration: 0.4 } }
          : { scale: 1 }
      }
    >
      {prefix && (
        <span style={{ fontSize, color: finalColor, fontWeight, marginRight: "4px" }}>
          {prefix}
        </span>
      )}
      <Counter 
        value={value} 
        fontSize={numFontSize} 
        textColor={finalColor} 
        fontWeight={fontWeight}
        gap={2}
        gradientFrom="transparent"
        gradientTo="transparent"
      />
      {suffix && (
        <span style={{ fontSize, color: finalColor, fontWeight, marginLeft: "4px" }}>
          {suffix}
        </span>
      )}
    </motion.span>
  );
}
