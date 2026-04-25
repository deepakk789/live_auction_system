import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Users, Activity, ExternalLink, Zap, Wallet, TrendingUp, Trophy } from "lucide-react";
import socket, { BACKEND_URL } from "../services/socket";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";
import PageTransition from "../components/PageTransition";
import DrinksBreak from "./DrinksBreak";

/* ── Team sidebar colours ── */
const SIDEBAR_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1",
];

function ViewerLive() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";

  const [currentUser, setCurrentUser] = useState(null);
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [resumeSeconds, setResumeSeconds] = useState(null);
  const [teams, setTeams] = useState([]);
  const [auctionName, setAuctionName] = useState("");
  const [selectedFields, setSelectedFields] = useState([]);
  const [biddingMode, setBiddingMode] = useState("OFFLINE");
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);

  const [showAnalytics, setShowAnalytics] = useState(false);
  const [representingTeam, setRepresentingTeam] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedTeam, setExpandedTeam] = useState(null);

  const getBasePrice = (details) => {
    const value = Object.values(details).find((v) => {
      if (typeof v !== "string") return false;
      const val = v.toLowerCase();
      if (val.includes("marquee") || val.includes("uncapped") || (val.includes("capped") && !val.includes("uncapped"))) return true;
      return false;
    });
    if (!value) return 0;
    const v = value.toLowerCase();
    if (v.includes("marquee")) return 50;
    if (v.includes("uncapped")) return 10;
    if (v.includes("capped")) return 20;
    return 0;
  };

  const getPlayerPhoto = (details) => {
    if (!details) return null;
    const driveLink = Object.values(details).find(val => typeof val === "string" && val.includes("drive.google.com"));
    if (!driveLink) return null;
    let match = driveLink.match(/id=([^&]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    match = driveLink.match(/\/d\/([^/]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    return null;
  };

  /* ---------- MOUNT & LOAD ---------- */
  useEffect(() => {
    socket.emit("join_auction", { auctionId });

    const fetchData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
        if (!res.ok) throw new Error("Failed to sync");
        const data = await res.json();

        if (data.playersState) setPlayersState(data.playersState);
        if (data.teamsState) setTeams(data.teamsState);
        if (data.auctionState) setAuctionState(data.auctionState);
        if (data.auctionName) setAuctionName(data.auctionName);
        if (data.auctionConfig?.selectedFields) setSelectedFields(data.auctionConfig.selectedFields);
        if (data.biddingMode) setBiddingMode(data.biddingMode);
        if (data.auctionSetup?.bidSteps) setBidSteps(data.auctionSetup.bidSteps);

        // MANAGER DETECTION
        const tknUserStr = localStorage.getItem("authUser");
        let activeUser = null;
        if (tknUserStr) {
          activeUser = JSON.parse(tknUserStr);
          setCurrentUser(activeUser);
        }

        if (activeUser && data.teamsState && data.biddingMode === "ONLINE") {
          const managedTeam = data.teamsState.find(
            t => t.managerUsername && t.managerUsername.toLowerCase() === activeUser.username.toLowerCase()
          );
          if (managedTeam) {
            setRepresentingTeam(managedTeam.name);
            socket.emit("manager_join", { auctionId, teamName: managedTeam.name });
          }
        }
      } catch (err) {
        console.error("Failed to load auction", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    socket.on("auction_update", (data) => setPlayersState(data));
    socket.on("teams_update", (data) => setTeams(data));
    socket.on("auction_state", (state) => setAuctionState(state));
    socket.on("auction_config", (cfg) => {
      if (cfg.selectedFields) setSelectedFields(cfg.selectedFields);
    });
    socket.on("resume_countdown_tick", ({ seconds }) => {
      setResumeSeconds(seconds);
    });

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("auction_update");
      socket.off("teams_update");
      socket.off("auction_state");
      socket.off("auction_config");
      socket.off("resume_countdown_tick");
    };
  }, [auctionId]);

  useEffect(() => {
    if (representingTeam && biddingMode === "ONLINE") {
      const handleBeforeUnload = (e) => {
        socket.emit("team_quit_request", { auctionId, teamName: representingTeam });
        e.preventDefault();
        e.returnValue = "Leaving will disconnect your team and alert the organizer!";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [representingTeam, biddingMode, auctionId]);

  /* ---------- ONLINE BIDDING ---------- */
  const handleSubmitBid = (amt) => {
    if (!representingTeam) return alert("Select your team first");
    if (!playersState) return;

    const player = playersState.players[playersState.currentIndex];
    if (player.status === "SOLD") return;

    const teamState = teams.find(t => t.name === representingTeam);
    const newBid = Math.max(getBasePrice(player.details), (player.currentBid || 0) + amt);

    if (teamState && teamState.budget < newBid) {
      return alert("Your team does not have enough budget for this bid.");
    }

    socket.emit("viewer_bid", { auctionId, teamName: representingTeam, amount: newBid });
  };


  /* ---------- RENDER ---------- */
  if (loading) {
    return (
      <PageTransition>
        <div style={styles.container}>
          <SkeletonLoader variant="card" count={2} />
        </div>
      </PageTransition>
    );
  }
  if (!playersState || !playersState.players?.length) {
    return (
      <PageTransition>
        <div style={styles.container}>
          <motion.div className="glass-panel" style={styles.waitingState} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 3, ease: "linear" }} style={{ display: "inline-block" }}>
              <Activity size={48} color="#3b82f6" />
            </motion.div>
            <h3 style={{ margin: "20px 0 8px", fontSize: "1.4rem" }}>Waiting for Organizer</h3>
            <p style={{ color: "#64748b" }}>The auction hasn't started yet. Hang tight!</p>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  if (auctionState === "UPCOMING") {
    return (
      <PageTransition>
        <div style={styles.container}>
          <motion.div className="glass-panel" style={styles.waitingState} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
            <motion.div animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }} style={{ display: "inline-block" }}>
              <Zap size={48} color="#10b981" />
            </motion.div>
            <h3 style={{ margin: "20px 0 8px", fontSize: "1.4rem" }}>Lobby Open</h3>
            <p style={{ color: "#64748b" }}>Waiting for the organizer to legally start the auction.</p>
            {representingTeam && (
              <div style={{ marginTop: "20px", padding: "10px 20px", background: "rgba(16,185,129,0.15)", border: "1px solid #10b981", borderRadius: "8px", color: "#10b981", fontWeight: "bold" }}>
                ✅ You are connected as Manager for {representingTeam}
              </div>
            )}
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  if (auctionState === "BREAK" || auctionState === "PAUSED" || auctionState === "RESUMING") {
    return (
      <PageTransition>
        <div style={styles.container}>
          {auctionState === "PAUSED" && (
            <motion.div className="glass-panel" style={{ padding: "20px 30px", border: "2px solid #ef4444", marginBottom: "30px", textAlign: "center" }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <h2 style={{ color: "#ef4444", margin: "0 0 10px" }}>⚠️ Auction Paused (Break Time)</h2>
              <p style={{ color: "#9ca3af", margin: 0 }}>A team representative has disconnected. Waiting for them to rejoin before continuing.</p>
            </motion.div>
          )}
          {auctionState === "RESUMING" && (
            <motion.div className="glass-panel" style={{ padding: "20px 30px", border: "2px solid #3b82f6", marginBottom: "30px", textAlign: "center" }} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <h2 style={{ color: "#60a5fa", margin: "0 0 10px" }}>⏳ Resuming in {resumeSeconds}s...</h2>
              <p style={{ color: "#9ca3af", margin: 0 }}>All representatives are connected. Get ready!</p>
            </motion.div>
          )}
          {auctionState === "BREAK" && (
            <motion.div className="glass-panel" style={{ padding: "20px 30px", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "30px" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>{auctionName || "Auction"} - Drinks Break 🍹</h2>
            </motion.div>
          )}
          <DrinksBreak readOnly />
        </div>
      </PageTransition>
    );
  }

  if (auctionState === "ENDED") {
    return (
      <PageTransition>
        <div style={styles.container}>
          <motion.div className="glass-card" style={{ padding: "60px", textAlign: "center" }} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1, rotate: [0, 10, -10, 0] }} transition={{ delay: 0.3, type: "spring" }}>
              <Trophy size={64} color="#f59e0b" />
            </motion.div>
            <h1 style={{ marginTop: "20px" }}>Auction Ended 🏁</h1>
            <p style={{ color: "#94a3b8", marginBottom: "30px" }}>The auction has been officially concluded by the organizer.</p>
            <motion.button className="btn-premium" onClick={() => navigate(`/past/${auctionId}/analytics`)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.97 }}>
              View Final Results
            </motion.button>
          </motion.div>
        </div>
      </PageTransition>
    );
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const base = getBasePrice(currentPlayer.details);
  const currentBid = currentPlayer.currentBid || base;

  return (
    <PageTransition>
      <div style={styles.container}>

        {/* HEADER */}
        <motion.div className="glass-panel" style={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
            <Activity size={24} color="#3b82f6"/>
            {auctionName || "Live Auction"}
          </h2>
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            {biddingMode === "ONLINE" && (
              <motion.div style={styles.onlineBadge} animate={{ boxShadow: ["0 0 0 0 rgba(59,130,246,0.4)", "0 0 0 8px rgba(59,130,246,0)", "0 0 0 0 rgba(59,130,246,0)"] }} transition={{ repeat: Infinity, duration: 2 }}>
                <Zap size={14}/> ONLINE BIDDING
              </motion.div>
            )}
            <button className="btn-glass" onClick={() => setShowAnalytics(true)}>
              <ExternalLink size={16} /> Leaderboard
            </button>
          </div>
        </motion.div>

        <div style={styles.mainGrid}>

          {/* PLAYER DISPLAY */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                className="glass-panel"
                style={styles.playerCard}
                initial={{ opacity: 0, y: 30, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ type: "spring", damping: 22, stiffness: 200 }}
              >
                {/* Player image */}
                <motion.div
                  style={styles.imageWrapper}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.15, type: "spring" }}
                >
                  <img src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto} alt="Player" style={styles.photo} />
                  <AnimatePresence>
                    {currentPlayer.status === "SOLD" && (
                      <motion.div className="stamp-overlay stamp-sold" initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -15 }} transition={{ type: "spring", damping: 12 }}>
                        <h2>SOLD!</h2>
                        <p>to {currentPlayer.soldTo}</p>
                      </motion.div>
                    )}
                    {currentPlayer.status === "UNSOLD" && (
                      <motion.div className="stamp-overlay stamp-unsold" initial={{ scale: 3, opacity: 0, rotate: -30 }} animate={{ scale: 1, opacity: 1, rotate: -15 }} transition={{ type: "spring", damping: 12 }}>
                        <h2>UNSOLD</h2>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.h1
                  style={{ fontSize: "3rem", fontWeight: 900, margin: "20px 0 10px", lineHeight: 1.1 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  {currentPlayer.name}
                </motion.h1>

                <motion.div
                  style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "30px" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  {selectedFields.map(f => {
                    if (currentPlayer.details[f]) {
                      return <span key={f} style={styles.badge}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>;
                    }
                    return null;
                  })}
                </motion.div>

                {/* Bid Display */}
                <motion.div
                  className="glass-card"
                  style={styles.bidDisplay}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.35 }}
                >
                  <span style={{ fontSize: "1.2rem", color: "#9ca3af", letterSpacing: "2px" }}>CURRENT BID</span>
                  <AnimatedCounter
                    value={currentBid}
                    prefix="₹"
                    fontSize="5rem"
                    fontWeight="900"
                    highlight
                    className="text-gradient"
                    style={{ lineHeight: 1 }}
                  />
                </motion.div>

                {/* Player progress */}
                <motion.div style={{ color: "#64748b", fontSize: "0.9rem", marginTop: "10px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
                  Player {currentIndex + 1} of {players.length}
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* ONLINE BIDDING PANEL */}
            {biddingMode === "ONLINE" && currentPlayer.status !== "SOLD" && (
              <motion.div
                className="glass-card"
                style={{ padding: "30px", border: "2px solid rgba(59,130,246,0.3)" }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Zap color="#3b82f6"/> {representingTeam ? `Manager Pad: ${representingTeam}` : "Viewer Mode"}
                </h3>

                {representingTeam ? (
                  <>
                    <div style={{ padding: "10px 15px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "8px", marginBottom: "20px", color: "#10b981", fontSize: "0.9rem" }}>
                      ✅ Authorized to bid on behalf of {representingTeam}
                    </div>
                    <div style={{ display: "flex", gap: "10px" }}>
                  {bidSteps.map(amt => (
                    <motion.button
                      key={amt}
                      className="btn-premium"
                      style={{ flex: 1, padding: "20px 0", fontSize: "1.5rem" }}
                      onClick={() => handleSubmitBid(amt)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      + {amt}
                    </motion.button>
                  ))}
                </div>
                </>
              ) : (
                <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px", background: "rgba(255,255,255,0.02)", borderRadius: "8px" }}>
                  👀 You are viewing this auction in read-only mode.<br/>
                  <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Only assigned team managers can place bids.</span>
                </div>
              )}
              </motion.div>
            )}
          </div>


          {/* TEAMS SIDEBAR */}
          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: "15px" }}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.3 } } }}
          >
            {teams.map((team, idx) => {
              const color = SIDEBAR_COLORS[idx % SIDEBAR_COLORS.length];
              const totalSpent = team.players.reduce((s, p) => s + p.price, 0);
              const totalBudget = totalSpent + team.budget;
              const pct = totalBudget > 0 ? (team.budget / totalBudget) * 100 : 100;

              return (
                <motion.div
                  key={team.name}
                  className="glass-card"
                  style={{ padding: "20px", borderLeft: `3px solid ${color}` }}
                  variants={{
                    hidden: { opacity: 0, x: 30 },
                    show: { opacity: 1, x: 0, transition: { type: "spring", damping: 20 } },
                  }}
                  whileHover={{ x: -4, transition: { duration: 0.2 } }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800 }}>{team.name}</h3>
                    <AnimatedCounter value={team.budget} prefix="₹" fontSize="1.1rem" fontWeight="700" color="#10b981" highlight />
                  </div>

                  {/* Budget bar */}
                  <div style={{ height: "5px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
                    <motion.div
                      style={{ height: "100%", borderRadius: "3px", background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  {/* Summary Stats */}
                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", margin: "10px 0" }}>
                    <span>{team.players.length} Players</span>
                    <span>Spent: ₹{totalSpent.toLocaleString()}</span>
                  </div>

                  {team.players.length > 0 && (
                    <button 
                      className="btn-glass" 
                      style={{ width: "100%", padding: "6px", fontSize: "0.8rem", marginTop: "4px", background: "rgba(255,255,255,0.02)" }}
                      onClick={() => setExpandedTeam(expandedTeam === team.name ? null : team.name)}
                    >
                      {expandedTeam === team.name ? "Hide Players" : "View Players"}
                    </button>
                  )}

                  <AnimatePresence>
                    {expandedTeam === team.name && team.players.length > 0 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: "auto", marginTop: 10 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        style={{ display: "flex", flexDirection: "column", gap: "6px", overflow: "hidden" }}
                      >
                        {team.players.map((p, pidx) => (
                          <div key={pidx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "6px 10px", borderRadius: "6px", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 600 }}>{p.name}</span>
                            <span style={{ color: "#9ca3af" }}>₹{p.price}</span>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>
        </div>

      </div>
    </PageTransition>
  );
}

const styles = {
  container: {
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "20px 40px"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 30px",
    marginBottom: "30px"
  },
  onlineBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(59, 130, 246, 0.15)",
    border: "1px solid rgba(59, 130, 246, 0.4)",
    color: "#60a5fa",
    padding: "6px 12px",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "0.8rem",
    letterSpacing: "1px"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gap: "30px"
  },
  playerCard: {
    padding: "50px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative",
    overflow: "hidden"
  },
  imageWrapper: {
    width: "280px",
    height: "280px",
    borderRadius: "20px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
    border: "6px solid rgba(255,255,255,0.1)",
    position: "relative",
    boxShadow: "0 20px 50px rgba(0,0,0,0.4)"
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  badge: {
    background: "rgba(139, 92, 246, 0.15)",
    border: "1px solid rgba(139, 92, 246, 0.3)",
    color: "#a78bfa",
    padding: "6px 16px",
    borderRadius: "20px",
    fontSize: "0.85rem",
    fontWeight: "bold"
  },
  bidDisplay: {
    padding: "30px 60px",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "20px"
  },
  waitingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 40px",
    margin: "60px auto",
    maxWidth: "500px",
    borderRadius: "24px",
    textAlign: "center",
  },
};

export default ViewerLive;
