import { motion } from "framer-motion";

/**
 * SkeletonLoader — shimmer placeholder for loading states.
 * 
 * Props:
 *   variant  — "card" | "row" | "circle" | "text" | "chart"
 *   count    — number of skeleton items to render
 *   style    — additional inline styles
 */

const shimmerKeyframes = {
  initial: { backgroundPosition: "-200% 0" },
  animate: {
    backgroundPosition: "200% 0",
    transition: { repeat: Infinity, duration: 1.5, ease: "linear" },
  },
};

const baseShimmer = {
  background:
    "linear-gradient(90deg, rgba(255,255,255,0.03) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.03) 75%)",
  backgroundSize: "200% 100%",
  borderRadius: "8px",
};

function SkeletonCard({ style }) {
  return (
    <motion.div
      style={{
        ...baseShimmer,
        padding: "24px",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        ...style,
      }}
      {...shimmerKeyframes}
    >
      {/* Title bar */}
      <motion.div
        style={{ ...baseShimmer, height: "20px", width: "60%", borderRadius: "6px" }}
        {...shimmerKeyframes}
      />
      {/* Stat row */}
      <div style={{ display: "flex", gap: "16px" }}>
        <motion.div
          style={{ ...baseShimmer, height: "40px", flex: 1, borderRadius: "8px" }}
          {...shimmerKeyframes}
        />
        <motion.div
          style={{ ...baseShimmer, height: "40px", flex: 1, borderRadius: "8px" }}
          {...shimmerKeyframes}
        />
      </div>
      {/* Progress bar */}
      <motion.div
        style={{ ...baseShimmer, height: "8px", width: "100%", borderRadius: "4px" }}
        {...shimmerKeyframes}
      />
      {/* Content rows */}
      <motion.div
        style={{ ...baseShimmer, height: "16px", width: "90%", borderRadius: "4px" }}
        {...shimmerKeyframes}
      />
      <motion.div
        style={{ ...baseShimmer, height: "16px", width: "70%", borderRadius: "4px" }}
        {...shimmerKeyframes}
      />
    </motion.div>
  );
}

function SkeletonRow({ style }) {
  return (
    <motion.div
      style={{
        ...baseShimmer,
        height: "48px",
        borderRadius: "8px",
        border: "1px solid rgba(255,255,255,0.04)",
        ...style,
      }}
      {...shimmerKeyframes}
    />
  );
}

function SkeletonText({ style }) {
  return (
    <motion.div
      style={{
        ...baseShimmer,
        height: "14px",
        width: "80%",
        borderRadius: "4px",
        ...style,
      }}
      {...shimmerKeyframes}
    />
  );
}

function SkeletonChart({ style }) {
  return (
    <motion.div
      style={{
        ...baseShimmer,
        height: "300px",
        borderRadius: "16px",
        border: "1px solid rgba(255,255,255,0.06)",
        ...style,
      }}
      {...shimmerKeyframes}
    />
  );
}

export default function SkeletonLoader({ variant = "card", count = 1, style = {} }) {
  const items = Array.from({ length: count });

  const Component =
    variant === "card"
      ? SkeletonCard
      : variant === "row"
        ? SkeletonRow
        : variant === "chart"
          ? SkeletonChart
          : SkeletonText;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {items.map((_, i) => (
        <Component key={i} style={style} />
      ))}
    </div>
  );
}
