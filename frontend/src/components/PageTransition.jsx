import { motion } from "framer-motion";

/**
 * PageTransition — wraps page content to animate in on mount.
 *
 * Props:
 *   children — page content
 *   className — optional className
 *   style    — optional inline styles
 */
const pageVariants = {
  initial: { opacity: 0, y: 24 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  },
  exit: {
    opacity: 0,
    y: -16,
    transition: { duration: 0.3, ease: "easeIn" },
  },
};

export default function PageTransition({ children, className = "", style = {} }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}
