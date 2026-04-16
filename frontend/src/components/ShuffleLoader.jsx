import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ShuffleLoader({ onComplete, targetImageUrl }) {
  const [phase, setPhase] = useState(0);

  // Preload the target image while animating
  useEffect(() => {
    if (targetImageUrl) {
      const img = new Image();
      img.src = targetImageUrl;
    }
  }, [targetImageUrl]);

  useEffect(() => {
    // Sequence timing
    const t1 = setTimeout(() => setPhase(1), 300);   // Spread out
    const t2 = setTimeout(() => setPhase(2), 1000);  // Shuffle 1
    const t3 = setTimeout(() => setPhase(3), 1500);  // Shuffle 2
    const t4 = setTimeout(() => setPhase(4), 2100);  // Gather back
    const t5 = setTimeout(() => setPhase(5), 2600);  // Flip & Finish

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5);
    };
  }, []);

  useEffect(() => {
    if (phase === 5) {
      const finish = setTimeout(() => onComplete(), 300);
      return () => clearTimeout(finish);
    }
  }, [phase, onComplete]);

  // Framer motion variants to handle the phases
  // We use 3 cards: left (-1), center (0), right (1)
  const cardVariants = {
    initial: { scale: 0, x: 0, y: 0, rotateY: 180, zIndex: 1 },
    spread: (i) => ({ 
        scale: 1, 
        x: i * 140, 
        y: 0, 
        rotateY: 180, 
        zIndex: i === 0 ? 3 : 1,
        transition: { type: "spring", bounce: 0.4 } 
    }),
    shuffle1: (i) => ({ 
        scale: i === 0 ? 0.9 : 1.1, 
        x: i === 0 ? 140 : i === 1 ? -140 : 0, 
        y: [0, i === 0 ? -40 : 40, 0], 
        rotateY: 180,
        zIndex: i === 0 ? 1 : 3,
        transition: { duration: 0.5, ease: "easeInOut" } 
    }),
    shuffle2: (i) => ({ 
        scale: i === -1 ? 1.1 : 0.9, 
        x: i === -1 ? 0 : i === 0 ? -140 : 140, 
        y: [0, i === -1 ? -40 : 40, 0], 
        rotateY: 180,
        zIndex: i === -1 ? 3 : 1,
        transition: { duration: 0.5, ease: "easeInOut" } 
    }),
    gather: { 
        scale: 1, 
        x: 0, 
        y: 0, 
        rotateY: 180, 
        zIndex: 2,
        transition: { type: "spring", bounce: 0.3 } 
    },
    finalize: { 
        scale: 1.3, 
        rotateY: 90, // Flip halfway to invisible, then `onComplete` mounts the real card
        opacity: 0, 
        transition: { duration: 0.3, ease: "easeIn" } 
    }
  };

  const getVariant = () => {
    if (phase === 0) return "initial";
    if (phase === 1) return "spread";
    if (phase === 2) return "shuffle1";
    if (phase === 3) return "shuffle2";
    if (phase === 4) return "gather";
    if (phase === 5) return "finalize";
  };

  return (
    <motion.div 
      className="glass-panel" 
      style={{
        padding: "50px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        position: "relative",
        height: "600px", // Match approx height of PlayerCard
        overflow: "hidden"
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <h3 style={{ position: "absolute", top: "40px", color: "#60a5fa", letterSpacing: "2px" }}>
        DRAWING NEXT PLAYER...
      </h3>

      <div style={{ position: "relative", width: "100%", height: "200px", display: "flex", justifyContent: "center", alignItems: "center" }}>
        {[-1, 0, 1].map((i) => (
          <motion.div
            key={i}
            custom={i}
            variants={cardVariants}
            initial="initial"
            animate={getVariant()}
            style={{
              position: "absolute",
              width: "160px",
              height: "230px",
              background: "linear-gradient(135deg, #1e293b, #0f172a)",
              border: "2px solid rgba(59, 130, 246, 0.5)",
              borderRadius: "16px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
              backfaceVisibility: "hidden",
              display: "flex",
              justifyContent: "center",
              alignItems: "center"
            }}
          >
            {/* Card Back Design */}
            <div style={{ width: "90%", height: "90%", border: "1px dashed rgba(59, 130, 246, 0.3)", borderRadius: "10px", display: "flex", justifyContent: "center", alignItems: "center" }}>
               <div style={{ width: "50px", height: "50px", border: "4px solid rgba(59, 130, 246, 0.4)", borderRadius: "50%", borderTopColor: "transparent", transform: "rotate(45deg)" }}></div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
