import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Wallet, TrendingUp, Trophy, UserCheck, Package } from "lucide-react";
import socket, { BACKEND_URL } from "../services/socket";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";
import PageTransition from "../components/PageTransition";

/* ── Team accent colors ── */
const TEAM_COLORS = [
  { accent: "#3b82f6", glow: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)" },
  { accent: "#8b5cf6", glow: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.3)" },
  { accent: "#10b981", glow: "rgba(16,185,129,0.15)", border: "rgba(16,185,129,0.3)" },
  { accent: "#f59e0b", glow: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)" },
  { accent: "#ef4444", glow: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.3)" },
  { accent: "#ec4899", glow: "rgba(236,72,153,0.15)", border: "rgba(236,72,153,0.3)" },
  { accent: "#14b8a6", glow: "rgba(20,184,166,0.15)", border: "rgba(20,184,166,0.3)" },
  { accent: "#6366f1", glow: "rgba(99,102,241,0.15)", border: "rgba(99,102,241,0.3)" },
];

/* ── Stagger container + child ── */
const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.96 },
  show: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", damping: 20, stiffness: 200 },
  },
};
const playerRowVariants = {
  hidden: { opacity: 0, x: -20 },
  show: { opacity: 1, x: 0, transition: { type: "spring", damping: 22, stiffness: 260 } },
};

function DrinksBreak({ readOnly = false }) {
  const params = useParams();
  const navigate = useNavigate();
  const auctionId = params.auctionId;
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (auctionId) {
      socket.emit("join_auction", { auctionId });
    }

    const fetchTeams = async () => {
      if (auctionId) {
        try {
          const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
          if (res.ok) {
            const data = await res.json();
            if (data.teamsState) {
              setTeams(data.teamsState);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.error("DrinksBreak fetch error:", err);
        }
      }

      // Fallback to localStorage
      const savedTeams = JSON.parse(localStorage.getItem("teamsState"));
      if (Array.isArray(savedTeams)) {
        setTeams(savedTeams);
      }
      setLoading(false);
    };
    fetchTeams();

    socket.on("teams_update", (data) => {
      setTeams(data);
      setLoading(false);
    });

    return () => {
      socket.off("teams_update");
      if (auctionId) {
        socket.emit("leave_auction", { auctionId });
      }
    };
  }, [auctionId]);

  /* ── Compute global stats ── */
  const totalPlayers = teams.reduce((s, t) => s + t.players.length, 0);
  const totalSpentAll = teams.reduce(
    (s, t) => s + t.players.reduce((ps, p) => ps + p.price, 0),
    0
  );

  /* ── LOADING STATE ── */
  if (loading) {
    return (
      <PageTransition>
        <div style={styles.page}>
          <div style={styles.headerSection}>
            <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center" }}>
              <span style={{ fontSize: "2.5rem" }}>🍹</span>
              <h1 style={styles.pageTitle}>Auction Summary</h1>
            </div>
          </div>
          <div style={styles.grid}>
            <SkeletonLoader variant="card" count={3} />
          </div>
        </div>
      </PageTransition>
    );
  }

  /* ── EMPTY STATE ── */
  if (!teams.length) {
    return (
      <PageTransition>
        <div style={styles.page}>
          <motion.div
            className="glass-panel"
            style={styles.emptyState}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", damping: 20 }}
          >
            <Package size={64} color="#374151" strokeWidth={1.5} />
            <h2 style={{ margin: "20px 0 8px", fontSize: "1.8rem" }}>No Team Data Available</h2>
            <p style={{ color: "#64748b", fontSize: "1.1rem", maxWidth: "400px", lineHeight: 1.7 }}>
              The auction hasn't started yet or no teams have been configured. Check back when the organizer begins the auction.
            </p>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={styles.page}>

        {/* ── HEADER ── */}
        <motion.div
          style={styles.headerSection}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px", justifyContent: "center", position: "relative" }}>
            {!readOnly && (
              <button 
                className="btn-glass" 
                style={{ position: "absolute", left: 0, padding: "8px 16px", fontSize: "0.9rem" }}
                onClick={() => navigate(-1)}
              >
                ← Go Back
              </button>
            )}
            <span style={{ fontSize: "2.5rem" }}>🍹</span>
            <h1 style={styles.pageTitle}>
              Drinks Break — <span className="text-gradient">Auction Summary</span>
            </h1>
          </div>
        </motion.div>

        {/* ── GLOBAL STATS BAR ── */}
        <motion.div
          style={styles.statsBar}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <div className="glass-card" style={styles.statChip}>
            <Users size={20} color="#3b82f6" />
            <div style={styles.statChipInner}>
              <span style={styles.statLabel}>Teams</span>
              <AnimatedCounter value={teams.length} fontSize="1.6rem" fontWeight="900" color="#f8fafc" highlight />
            </div>
          </div>
          <div className="glass-card" style={styles.statChip}>
            <UserCheck size={20} color="#10b981" />
            <div style={styles.statChipInner}>
              <span style={styles.statLabel}>Players Bought</span>
              <AnimatedCounter value={totalPlayers} fontSize="1.6rem" fontWeight="900" color="#f8fafc" highlight />
            </div>
          </div>
          <div className="glass-card" style={styles.statChip}>
            <Wallet size={20} color="#f59e0b" />
            <div style={styles.statChipInner}>
              <span style={styles.statLabel}>Total Spent</span>
              <AnimatedCounter value={totalSpentAll} prefix="₹" fontSize="1.6rem" fontWeight="900" color="#f8fafc" highlight />
            </div>
          </div>
        </motion.div>

        {/* ── TEAM CARDS GRID ── */}
        <motion.div
          style={styles.grid}
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {teams.map((team, idx) => {
            const color = TEAM_COLORS[idx % TEAM_COLORS.length];
            const totalSpent = team.players.reduce((s, p) => s + p.price, 0);
            const totalBudget = totalSpent + team.budget;
            const spentPercent = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
            const topPlayer = [...team.players].sort((a, b) => b.price - a.price)[0];

            return (
              <motion.div
                key={team.name}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.015 }}
                className="glass-panel"
                style={{
                  ...styles.teamCard,
                  borderColor: color.border,
                }}
              >
                {/* Card Header */}
                <div style={styles.cardHeader}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <div style={{ ...styles.teamIcon, background: color.glow, borderColor: color.border }}>
                      <Trophy size={20} color={color.accent} />
                    </div>
                    <div>
                      <h2 style={styles.teamName}>{team.name}</h2>
                      <span style={{ color: "#64748b", fontSize: "0.85rem" }}>
                        {team.players.length} player{team.players.length !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  {topPlayer && (
                    <motion.div
                      style={{ ...styles.mvpBadge, background: color.glow, borderColor: color.border }}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.4 + idx * 0.1, type: "spring" }}
                    >
                      <span style={{ fontSize: "0.7rem", color: "#94a3b8", letterSpacing: "1px" }}>MVP</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: color.accent }}>{topPlayer.name.split(" ")[0]}</span>
                    </motion.div>
                  )}
                </div>

                {/* Budget Stats */}
                <div style={styles.budgetRow}>
                  <div style={styles.budgetItem}>
                    <TrendingUp size={16} color="#ef4444" />
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Spent</span>
                    <AnimatedCounter
                      value={totalSpent}
                      prefix="₹"
                      fontSize="1.3rem"
                      fontWeight="800"
                      color="#f87171"
                      highlight
                    />
                  </div>
                  <div style={{ width: "1px", background: "rgba(255,255,255,0.08)", alignSelf: "stretch" }} />
                  <div style={styles.budgetItem}>
                    <Wallet size={16} color="#10b981" />
                    <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>Remaining</span>
                    <AnimatedCounter
                      value={team.budget}
                      prefix="₹"
                      fontSize="1.3rem"
                      fontWeight="800"
                      color="#34d399"
                      highlight
                    />
                  </div>
                </div>

                {/* Progress Bar */}
                <div style={styles.progressContainer}>
                  <div style={styles.progressLabels}>
                    <span style={{ color: "#94a3b8", fontSize: "0.75rem" }}>Budget Usage</span>
                    <span style={{ color: color.accent, fontSize: "0.75rem", fontWeight: 700 }}>
                      {spentPercent.toFixed(1)}%
                    </span>
                  </div>
                  <div style={styles.progressBg}>
                    <motion.div
                      style={{ ...styles.progressFill, background: `linear-gradient(90deg, ${color.accent}, ${color.accent}88)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, spentPercent)}%` }}
                      transition={{ duration: 1.2, ease: "easeOut", delay: 0.3 + idx * 0.1 }}
                    />
                  </div>
                </div>

                {/* Players List */}
                <div style={styles.playersSection}>
                  <AnimatePresence>
                    {team.players.length === 0 ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        style={styles.emptyPlayers}
                      >
                        <Package size={24} color="#374151" />
                        <span style={{ color: "#4b5563", fontSize: "0.9rem" }}>No players bought yet</span>
                      </motion.div>
                    ) : (
                      <motion.div
                        variants={{ show: { transition: { staggerChildren: 0.06 } }, hidden: {} }}
                        initial="hidden"
                        animate="show"
                        style={{ display: "flex", flexDirection: "column", gap: "6px" }}
                      >
                        {team.players.map((player, pIdx) => (
                          <motion.div
                            key={player.name + pIdx}
                            variants={playerRowVariants}
                            whileHover={{
                              backgroundColor: "rgba(255,255,255,0.06)",
                              x: 4,
                              transition: { duration: 0.2 },
                            }}
                            style={styles.playerRow}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span style={{
                                ...styles.playerIdx,
                                background: color.glow,
                                color: color.accent,
                                borderColor: color.border,
                              }}>
                                {pIdx + 1}
                              </span>
                              <span style={styles.playerName}>{player.name}</span>
                            </div>
                            <span style={{
                              fontWeight: 700,
                              fontSize: "0.95rem",
                              color: color.accent,
                              fontVariantNumeric: "tabular-nums",
                            }}>
                              ₹{player.price}
                            </span>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })}
        </motion.div>

      </div>
    </PageTransition>
  );
}

/* ─────────────────────────────────────
   STYLES
   ───────────────────────────────────── */
const styles = {
  page: {
    padding: "30px 40px 60px",
    maxWidth: "1400px",
    margin: "0 auto",
  },
  headerSection: {
    textAlign: "center",
    marginBottom: "30px",
  },
  pageTitle: {
    fontSize: "2.4rem",
    fontWeight: 900,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  statsBar: {
    display: "flex",
    justifyContent: "center",
    gap: "20px",
    flexWrap: "wrap",
    marginBottom: "40px",
  },
  statChip: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    padding: "16px 24px",
    minWidth: "200px",
  },
  statChipInner: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
  },
  statLabel: {
    fontSize: "0.75rem",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontWeight: 600,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(420px, 1fr))",
    gap: "24px",
  },
  teamCard: {
    padding: "28px",
    borderRadius: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    border: "1px solid",
    transition: "box-shadow 0.4s ease",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  teamIcon: {
    width: "44px",
    height: "44px",
    borderRadius: "12px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  teamName: {
    margin: 0,
    fontSize: "1.3rem",
    fontWeight: 800,
    letterSpacing: "-0.3px",
  },
  mvpBadge: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "6px 14px",
    borderRadius: "10px",
    border: "1px solid",
    gap: "2px",
  },
  budgetRow: {
    display: "flex",
    justifyContent: "space-around",
    background: "rgba(0,0,0,0.2)",
    borderRadius: "12px",
    padding: "16px",
  },
  budgetItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  progressContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
  },
  progressBg: {
    height: "8px",
    background: "rgba(255,255,255,0.06)",
    borderRadius: "4px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: "4px",
    boxShadow: "0 0 12px rgba(59,130,246,0.3)",
  },
  playersSection: {
    flex: 1,
    maxHeight: "260px",
    overflowY: "auto",
    paddingRight: "4px",
  },
  emptyPlayers: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    padding: "40px 20px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.02)",
    border: "1px dashed rgba(255,255,255,0.08)",
  },
  playerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 12px",
    borderRadius: "8px",
    cursor: "default",
    transition: "background 0.2s",
  },
  playerIdx: {
    width: "28px",
    height: "28px",
    borderRadius: "8px",
    border: "1px solid",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.8rem",
    fontWeight: 700,
  },
  playerName: {
    fontWeight: 600,
    fontSize: "0.95rem",
    color: "#e2e8f0",
  },
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    textAlign: "center",
    padding: "80px 40px",
    margin: "60px auto",
    maxWidth: "500px",
    borderRadius: "24px",
  },
};

export default DrinksBreak;
