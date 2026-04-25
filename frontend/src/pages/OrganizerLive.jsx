import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import socket, { BACKEND_URL } from "../services/socket";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Check, Lock, Unlock, Trophy, User, Wallet, TrendingUp } from "lucide-react";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";
import PageTransition from "../components/PageTransition";

/* ── Sidebar accent colours ── */
const TEAM_COLORS = [
  "#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#14b8a6","#6366f1",
];

function OrganizerLive() {
  const { auctionId } = useParams();
  const [setup, setSetup] = useState(null);
  const [auctionConfig, setAuctionConfig] = useState(null);
  const [teams, setTeams] = useState([]);
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [auctionCode, setAuctionCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [maxBid, setMaxBid] = useState(null);
  const [biddingMode, setBiddingMode] = useState("OFFLINE");
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // Lock System
  const [hasLock, setHasLock] = useState(false);
  const [activeOrganizerInfo, setActiveOrganizerInfo] = useState(null);
  const [lockLoading, setLockLoading] = useState(true);
  const [managerStatuses, setManagerStatuses] = useState({});
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();
  const stateRef = useRef({ prevIndex: 0 });
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";

  const getBasePrice = (details) => {
    if (!details) return 0;
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
    for (const value of Object.values(details)) {
      if (typeof value !== "string") continue;
      if (value.includes("drive.google.com")) {
        let match = value.match(/id=([^&]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        match = value.match(/\/d\/([^/]+)/);
        if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
      }
    }
    return null;
  };

  const copyCode = () => {
    if (auctionCode) {
      navigator.clipboard.writeText(auctionCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  /* ---------- MOUNT & LOCK ---------- */
  useEffect(() => {
    const userStr = localStorage.getItem("authUser");
    if (!userStr) {
      navigate("/login");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    const tryClaimLock = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/claim-lock`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) {
          setHasLock(true);
          setActiveOrganizerInfo(user._id);
          socket.emit("organizer_lock_change", { auctionId, activeOrganizer: user._id });
        } else {
          setHasLock(false);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLockLoading(false);
      }
    };
    tryClaimLock();

    const handleBeforeUnload = () => {
      const token = localStorage.getItem("authToken");
      navigator.sendBeacon(`${BACKEND_URL}/api/auction/${auctionId}/release-lock`, JSON.stringify({ token }));
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      const token = localStorage.getItem("authToken");
      if (token && hasLock) {
        fetch(`${BACKEND_URL}/api/auction/${auctionId}/release-lock`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).then(() => {
          socket.emit("organizer_lock_change", { auctionId, activeOrganizer: null });
        }).catch(e => console.error(e));
      }
    };
  }, [auctionId, navigate]);


  /* ---------- LOAD DATA + SOCKET ---------- */
  useEffect(() => {
    socket.emit("join_auction", { auctionId });

    const fetchData = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
        if (!res.ok) throw new Error("Failed to sync");
        const data = await res.json();

        if (data.auctionSetup) setSetup(data.auctionSetup);
        if (data.auctionConfig) setAuctionConfig(data.auctionConfig);
        if (data.playersState) setPlayersState(data.playersState);
        if (data.teamsState) {
          setTeams(data.teamsState);
          if (hasLock) socket.emit("teams_update", { auctionId, teams: data.teamsState });
        }
        if (data.auctionState) setAuctionState(data.auctionState);
        if (data.maxBid != null) setMaxBid(data.maxBid);
        if (data.auctionCode) setAuctionCode(data.auctionCode);
        if (data.biddingMode) setBiddingMode(data.biddingMode);

        if (data.activeOrganizer) {
          setActiveOrganizerInfo(data.activeOrganizer);
          setHasLock(currentUser && data.activeOrganizer === currentUser._id);
        }
      } catch (err) {
        console.error("Hydration DB error:", err);
      }
    };
    fetchData();

    socket.on("organizer_lock_change", ({ activeOrganizer }) => {
      setActiveOrganizerInfo(activeOrganizer);
      if (currentUser && activeOrganizer === currentUser._id) {
        setHasLock(true);
      } else {
        setHasLock(false);
      }
    });

    socket.on("teams_update", (data) => {
      if (!hasLock) setTeams(data);
    });

    socket.on("auction_update", (data) => {
      if (!hasLock) setPlayersState(data);
    });

    socket.on("auction_state", (state) => {
      if (!hasLock) setAuctionState(state);
    });

    socket.on("manager_status_change", ({ teamName, status }) => {
      setManagerStatuses(prev => ({ ...prev, [teamName]: status }));
    });

    socket.on("team_quit_alert", ({ teamName }) => {
      alert(`⚠️ TEAM MANAGER QUIT: ${teamName} has disconnected from the auction!`);
    });

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("teams_update");
      socket.off("auction_update");
      socket.off("auction_state");
      socket.off("organizer_lock_change");
      socket.off("manager_status_change");
      socket.off("team_quit_alert");
    };
  }, [auctionId, hasLock, currentUser]);

  /* ---------- VIEWER ONLINE BIDDING HANDLER ---------- */
  useEffect(() => {
    const handleViewerBid = ({ teamName, amount }) => {
      if (!hasLock) return;
      if (!playersState) return;

      const { players, currentIndex } = playersState;
      const player = players[currentIndex];

      if (player.status === "SOLD") return;

      setPlayersState(prev => {
        const p = prev.players[prev.currentIndex];
        const newBid = Math.max(amount, p.currentBid || 0);

        const playersCopy = prev.players.map((pl, i) =>
          i === prev.currentIndex ? { ...pl, currentBid: newBid } : pl
        );
        const updated = { ...prev, players: playersCopy };

        setSelectedTeam(teamName);

        socket.emit("auction_update", { ...updated, auctionId });
        return updated;
      });
    };

    socket.on("viewer_bid_received", handleViewerBid);
    return () => socket.off("viewer_bid_received", handleViewerBid);
  }, [hasLock, playersState, auctionId]);


  useEffect(() => {
    if (hasLock && playersState && auctionConfig && teams.length > 0) {
      socket.emit("sync_full_state", {
        auctionId,
        playersState,
        auctionState,
        teamsState: teams,
        auctionConfig
      });
    }
  }, [playersState, auctionState, teams, auctionConfig, auctionId, hasLock]);

  /* ---------- AUTO BASE PRICE ---------- */
  useEffect(() => {
    if (!playersState || !hasLock) return;

    const index = playersState.currentIndex;
    if (index !== stateRef.current.prevIndex) {
      setSelectedTeam("");
      stateRef.current.prevIndex = index;
    }

    const player = playersState.players[index];
    if (!player) return;
    const base = getBasePrice(player.details);

    if (!player.currentBid || player.currentBid === 0) {
      const playersCopy = playersState.players.map((p, i) =>
        i === index ? { ...p, currentBid: base, status: "LIVE" } : p
      );
      const updated = { ...playersState, players: playersCopy };
      setPlayersState(updated);
      socket.emit("auction_update", { ...updated, auctionId });
    }
  }, [playersState?.currentIndex, hasLock]);

  /* ---------- AUCTION LOGIC ---------- */
  const updateState = async (state, skipConfirm = false) => {
    if (auctionState === "ENDED") {
      alert("This auction has ended. You cannot change its state.");
      return;
    }
    if (state === "ENDED" && !skipConfirm) {
      setShowEndConfirm(true);
      return;
    }

    setAuctionState(state);
    socket.emit("auction_state", { auctionId, state });

    if (state === "BREAK") socket.emit("teams_update", { auctionId, teams });
    if (state === "ENDED") {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`${BACKEND_URL}/api/auction/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ auctionId })
        });
      } catch (err) { console.error(err); }
    }
  };

  const goNext = () => {
    if (!playersState) return;
    setPlayersState((prev) => {
      const nextIndex = Math.min(prev.currentIndex + 1, prev.players.length - 1);
      const updated = { ...prev, currentIndex: nextIndex };
      socket.emit("auction_update", { ...updated, auctionId });
      return updated;
    });
  };

  const goPrev = () => {
    if (!playersState) return;
    setPlayersState((prev) => {
      const updated = { ...prev, currentIndex: Math.max(prev.currentIndex - 1, 0) };
      socket.emit("auction_update", { ...updated, auctionId });
      return updated;
    });
  };

  const increaseBid = (amt) => {
    if (auctionState === "ENDED") return;
    if (!playersState || playersState.players[playersState.currentIndex].status === "SOLD") return;
    const maxAvailableBudget = teams.length > 0 ? Math.max(...teams.map(t => t.budget)) : Infinity;
    const limit = Math.min(maxBid ?? Infinity, maxAvailableBudget);
    setPlayersState((prev) => {
      const base = getBasePrice(prev.players[prev.currentIndex].details);
      const playersCopy = prev.players.map((p, i) => {
        if (i !== prev.currentIndex) return p;
        const nextBid = Math.max(base, (p.currentBid || base) + amt);
        if (nextBid > limit) return p;
        return { ...p, currentBid: nextBid };
      });
      const updated = { ...prev, players: playersCopy };
      socket.emit("auction_update", { ...updated, auctionId });
      return updated;
    });
  };

  const decreaseBid = (amt) => {
    if (auctionState === "ENDED") return;
    if (!playersState || playersState.players[playersState.currentIndex].status === "SOLD") return;
    setPlayersState((prev) => {
      const playersCopy = prev.players.map((p, i) =>
        i === prev.currentIndex ? { ...p, currentBid: Math.max(0, p.currentBid - amt) } : p
      );
      const updated = { ...prev, players: playersCopy };
      socket.emit("auction_update", { ...updated, auctionId });
      return updated;
    });
  };

  const sellPlayer = () => {
    if (auctionState === "ENDED") return alert("Cannot sell players in an ended auction.");
    if (!selectedTeam) return alert("Please select a team");
    const player = playersState.players[playersState.currentIndex];
    const teamIndex = teams.findIndex((t) => t.name === selectedTeam);

    if (teamIndex === -1) return alert("Invalid team");
    const price = player.currentBid;
    if (!price || price <= 0) return alert("Start bidding first");
    if (teams[teamIndex].budget < price) return alert("Not enough budget");

    const playersCopy = playersState.players.map((p, i) =>
      i === playersState.currentIndex ? { ...p, status: "SOLD", soldTo: selectedTeam, soldPrice: price } : p
    );

    const teamsCopy = teams.map((t, i) =>
      i === teamIndex ? { ...t, budget: t.budget - price, players: [...t.players, { name: player.name, price }] } : t
    );

    const updatedPlayers = { ...playersState, players: playersCopy };
    setPlayersState(updatedPlayers);
    setTeams(teamsCopy);

    socket.emit("teams_update", { auctionId, teams: teamsCopy });
    socket.emit("auction_update", { ...updatedPlayers, auctionId });
    setSelectedTeam("");
  };

  const markUnsold = () => {
    if (auctionState === "ENDED") return;
    const player = playersState.players[playersState.currentIndex];
    const base = getBasePrice(player.details);
    const playersCopy = playersState.players.map((p, i) =>
      i === playersState.currentIndex ? { ...p, status: "UNSOLD", currentBid: base, soldTo: null, soldPrice: null } : p
    );
    const updated = { ...playersState, players: playersCopy };
    setPlayersState(updated);
    socket.emit("auction_update", { ...updated, auctionId });
  };

  const undoSold = () => {
    if (auctionState === "ENDED") return alert("Cannot undo in an ended auction.");
    const player = playersState.players[playersState.currentIndex];
    if (player.status !== "SOLD") return;

    const teamIndex = teams.findIndex((t) => t.name === player.soldTo);
    if (teamIndex === -1) return;

    const teamsCopy = teams.map((t, i) =>
      i === teamIndex ? { ...t, budget: t.budget + player.soldPrice, players: t.players.filter((p) => p.name !== player.name) } : t
    );

    const playersCopy = playersState.players.map((p, i) =>
      i === playersState.currentIndex ? { ...p, status: "LIVE", soldTo: null, soldPrice: null } : p
    );

    setTeams(teamsCopy);
    setPlayersState({ ...playersState, players: playersCopy });
    socket.emit("teams_update", { auctionId, teams: teamsCopy });
    socket.emit("auction_update", { ...playersState, players: playersCopy, auctionId });
  };


  /* ---------- RENDER ---------- */
  if (lockLoading) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
          <SkeletonLoader variant="card" count={2} />
          <div style={{ marginTop: "20px" }}><SkeletonLoader variant="row" count={4} /></div>
        </div>
      </PageTransition>
    );
  }

  /* No players uploaded yet — guide organizer to upload */
  if (setup && (!playersState || !playersState.players || playersState.players.length === 0)) {
    return (
      <PageTransition>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "70vh", padding: "40px", textAlign: "center", color: "white" }}>
          <div className="glass-panel" style={{ padding: "50px", maxWidth: "500px" }}>
            <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>No Players Uploaded</h2>
            <p style={{ color: "#94a3b8", marginBottom: "30px" }}>
              You need to upload player data before you can start the auction. Upload an Excel file with your player roster.
            </p>
            <button
              className="btn-premium"
              style={{ width: "100%", padding: "14px", fontSize: "1.05rem" }}
              onClick={() => navigate(`/organizer/${auctionId}/upload`)}
            >
              📄 Upload Players
            </button>
            <button
              className="btn-glass"
              style={{ width: "100%", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
              onClick={() => navigate("/")}
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (!setup || !auctionConfig || !playersState) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", maxWidth: "1400px", margin: "0 auto" }}>
          <SkeletonLoader variant="card" count={2} />
          <div style={{ marginTop: "20px" }}><SkeletonLoader variant="row" count={4} /></div>
        </div>
      </PageTransition>
    );
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const bidSteps = setup.bidSteps || [10, 20, 50];

  const handleNotifyTeams = () => {
    const managerIds = teams.map(t => t.manager).filter(Boolean);
    if (managerIds.length === 0) {
      alert("No managers are assigned to any teams.");
      return;
    }
    socket.emit("notify_managers", { 
      managerIds, 
      auctionId, 
      message: `The organizer is ready for ${setup.auctionName}. Please join the auction now!` 
    });
    alert("Push notification sent to all assigned team managers!");
  };

  if (auctionState === "UPCOMING" && biddingMode === "ONLINE") {
    const allJoined = teams.every(t => t.managerUsername ? managerStatuses[t.name] === "Connected" : false);

    return (
      <PageTransition>
        <div style={{...styles.layout, display: "flex", flexDirection: "column", height: "100vh"}}>
           <motion.div className="glass-panel" style={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
             <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
               <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Pre-Auction Lobby</h1>
               <div style={styles.lockBadge}>
                 {hasLock ? <Lock size={16} color="#10b981"/> : <Unlock size={16} color="#ef4444"/>}
                 <span style={{ fontSize: "0.85rem", fontWeight: 600, color: hasLock ? "#10b981" : "#ef4444" }}>
                   {hasLock ? "Edit Access" : "Read Only"}
                 </span>
               </div>
             </div>
           </motion.div>

           <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px" }}>
             <div className="glass-panel" style={{ width: "100%", maxWidth: "800px", padding: "40px", textAlign: "center" }}>
                <h2 style={{ fontSize: "2rem", marginBottom: "10px", color: "white" }}>Waiting for Team Managers</h2>
                <p style={{ color: "#9ca3af", marginBottom: "40px" }}>
                  This is an ONLINE auction. All assigned team managers must be connected to the auction room before you can start.
                </p>

                <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px", textAlign: "left" }}>
                  {teams.map((team, idx) => {
                    const isConnected = managerStatuses[team.name] === "Connected";
                    return (
                      <div key={idx} className="glass-card" style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", alignItems: "center" }}>
                         <div>
                           <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "white" }}>{team.name}</div>
                           <div style={{ color: "#6b7280", fontSize: "0.85rem" }}>
                             Manager: {team.managerUsername || <span style={{ color: "#ef4444" }}>Unassigned</span>}
                           </div>
                         </div>
                         <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                           <span style={{
                             width: "10px", height: "10px", borderRadius: "50%",
                             background: isConnected ? "#10b981" : "#ef4444",
                             boxShadow: `0 0 8px ${isConnected ? "#10b981" : "#ef4444"}`
                           }}></span>
                           <span style={{ color: isConnected ? "#10b981" : "#ef4444", fontWeight: 600 }}>
                             {isConnected ? "Connected" : "Offline / Waiting"}
                           </span>
                         </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
                   <button className="btn-glass" onClick={handleNotifyTeams} disabled={!hasLock}>
                     📣 Notify Teams
                   </button>
                   <button 
                     className="btn-premium" 
                     onClick={() => updateState("LIVE")} 
                     disabled={!hasLock || !allJoined}
                     style={{ opacity: (!hasLock || !allJoined) ? 0.5 : 1, filter: (!hasLock || !allJoined) ? "grayscale(100%)" : "none" }}
                   >
                     🚀 Start Auction
                   </button>
                </div>
                {!allJoined && hasLock && (
                  <p style={{ color: "#ef4444", marginTop: "16px", fontSize: "0.85rem" }}>
                    Cannot start auction until all teams turn green.
                  </p>
                )}
             </div>
           </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div style={styles.layout}>

        {/* HEADER / TOPBAR */}
        <motion.div className="glass-panel" style={styles.header} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Organizer Board</h1>

            <motion.div className="glass-card" style={styles.codeBubble} onClick={copyCode} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <span style={{ fontSize: "10px", color: "#94a3b8" }}>CODE</span>
              <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "1.2rem", color: "#60a5fa" }}>{auctionCode}</span>
              <AnimatePresence mode="wait">
                {codeCopied ? (
                  <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Check size={14} color="#10b981"/></motion.div>
                ) : (
                  <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}><Copy size={14} color="#94a3b8"/></motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            <div style={styles.lockBadge}>
              {hasLock ? <Lock size={16} color="#10b981"/> : <Unlock size={16} color="#ef4444"/>}
              <span style={{ fontSize: "0.85rem", fontWeight: 600, color: hasLock ? "#10b981" : "#ef4444" }}>
                {hasLock ? "Edit Access" : "Read Only"}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <motion.button className="btn-glass" onClick={() => navigate(`/organizer/${auctionId}/teams`)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>Teams Setup</motion.button>
            <motion.button className="btn-glass" onClick={() => navigate(`/organizer/${auctionId}/analytics`)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>📊 Analytics</motion.button>
          </div>
        </motion.div>

        <div style={styles.mainGrid}>

          {/* LEFT COLUMN: PLAYER CARD & BIDDING */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

            {/* State buttons */}
            <motion.div style={{ display: "flex", gap: "10px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              {[
                { label: "LIVE", value: "LIVE", color: "linear-gradient(135deg, #2563eb, #7c3aed)" },
                { label: "BREAK", value: "BREAK" },
                { label: "END", value: "ENDED" },
              ].map(btn => (
                <motion.button
                  key={btn.value}
                  className={btn.value === "LIVE" && auctionState === "LIVE" ? "btn-premium" : "btn-glass"}
                  onClick={() => updateState(btn.value)}
                  disabled={!hasLock}
                  style={{
                    flex: 1,
                    filter: btn.value === "LIVE" && auctionState !== "LIVE" ? "grayscale(100%)" : "none",
                    opacity: auctionState === btn.value ? 1 : 0.7,
                    border: auctionState === btn.value ? "1px solid rgba(59,130,246,0.5)" : undefined,
                  }}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {btn.label}
                </motion.button>
              ))}
            </motion.div>

            {/* Player Card */}
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
                <motion.div
                  style={styles.imageWrapper}
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.1, type: "spring" }}
                >
                  <img src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto} alt="Player" style={styles.photo} />
                  <AnimatePresence>
                    {currentPlayer.status === "SOLD" && (
                      <motion.div className="stamp-overlay stamp-sold" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}>
                        <h2>SOLD</h2>
                      </motion.div>
                    )}
                    {currentPlayer.status === "UNSOLD" && (
                      <motion.div className="stamp-overlay stamp-unsold" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", damping: 12 }}>
                        <h2>UNSOLD</h2>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                <motion.h2 style={{ fontSize: "2.5rem", margin: "20px 0 10px", fontWeight: 900 }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                  {currentPlayer.name}
                </motion.h2>

                <motion.div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "20px" }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
                  {auctionConfig.selectedFields.map(f => {
                     if (currentPlayer.details[f]) {
                       return <span key={f} style={styles.badge}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>;
                     }
                     return null;
                  })}
                </motion.div>

                <motion.div className="glass-card" style={styles.bidDisplay} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                  <span style={{ fontSize: "1rem", color: "#9ca3af" }}>CURRENT BID</span>
                  <AnimatedCounter
                    value={currentPlayer.currentBid || getBasePrice(currentPlayer.details)}
                    prefix="₹"
                    fontSize="4rem"
                    fontWeight="900"
                    highlight
                    className="text-gradient"
                    style={{ lineHeight: 1 }}
                  />
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* BIDDING CONTROLS */}
            <motion.div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ margin: 0 }}>Controls {biddingMode === "ONLINE" && <span style={{ color: "#3b82f6", fontSize: "0.8rem", marginLeft: "10px" }}>(Online Ops Available)</span>}</h3>
                <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                  Base: ₹{getBasePrice(currentPlayer.details)}
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                {bidSteps.map(amt => (
                  <motion.button key={amt} className="btn-glass" style={{ flex: 1, padding: "15px 0", fontSize: "1.2rem", color: "#10b981", borderColor: "rgba(16,185,129,0.3)" }} onClick={() => increaseBid(amt)} disabled={!hasLock} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }}>
                    +{amt}
                  </motion.button>
                ))}
                <motion.button className="btn-glass" style={{ flex: 1, color: "#ef4444" }} onClick={() => decreaseBid(bidSteps[0])} disabled={!hasLock} whileHover={{ scale: 1.06, y: -2 }} whileTap={{ scale: 0.94 }}>
                  -{bidSteps[0]}
                </motion.button>
              </div>

              <select
                className="input-premium"
                value={selectedTeam}
                onChange={e => setSelectedTeam(e.target.value)}
                disabled={!hasLock || currentPlayer.status === "SOLD"}
                style={{ fontSize: "1.1rem", cursor: "pointer", background: selectedTeam ? "rgba(59,130,246,0.2)" : "" }}
              >
                <option value="" style={{ color: "#0f172a", background: "#f8fafc" }}>-- SELECT TEAM --</option>
                {teams.map(t => (
                  <option key={t.name} value={t.name} style={{ color: "#0f172a", background: "#f8fafc" }}>{t.name} (₹{t.budget})</option>
                ))}
              </select>

              <div style={{ display: "flex", gap: "10px" }}>
                {currentPlayer.status === "SOLD" ? (
                  <motion.button className="btn-glass" style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }} onClick={undoSold} disabled={!hasLock || auctionState === "ENDED"} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                    Undo Sold
                  </motion.button>
                ) : (
                  <>
                    <motion.button className="btn-premium" style={{ flex: 2, background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }} onClick={sellPlayer} disabled={!hasLock || auctionState === "ENDED"} whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}>
                      SELL PLAYER
                    </motion.button>
                    <motion.button className="btn-glass" style={{ flex: 1, color: "#facc15", borderColor: "rgba(250,204,21,0.3)" }} onClick={markUnsold} disabled={!hasLock || auctionState === "ENDED"} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                      UNSOLD
                    </motion.button>
                  </>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                <motion.button className="btn-glass" onClick={goPrev} disabled={!hasLock || currentIndex === 0} whileHover={{ x: -3 }} whileTap={{ scale: 0.95 }}>← Prev</motion.button>
                <span style={{ color: "#94a3b8", alignSelf: "center", fontWeight: "bold" }}>{currentIndex + 1} / {players.length}</span>
                <motion.button className="btn-glass" onClick={goNext} disabled={!hasLock || currentIndex === players.length - 1} whileHover={{ x: 3 }} whileTap={{ scale: 0.95 }}>Next →</motion.button>
              </div>
            </motion.div>
          </div>


          {/* RIGHT COLUMN: TEAMS */}
          <motion.div
            style={{ display: "flex", flexDirection: "column", gap: "15px", height: "calc(100vh - 140px)", overflowY: "auto", paddingRight: "10px" }}
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }}
          >
            {teams.map((team, idx) => {
              const isSelected = selectedTeam === team.name;
              const color = TEAM_COLORS[idx % TEAM_COLORS.length];
              const totalSpent = team.players.reduce((s, p) => s + p.price, 0);
              const totalBudget = totalSpent + team.budget;
              const remainingPercent = totalBudget > 0 ? (team.budget / totalBudget) * 100 : 100;

              return (
                <motion.div
                  key={team.name}
                  className="glass-card"
                  style={{
                    padding: "20px",
                    borderLeft: `3px solid ${color}`,
                    border: isSelected ? `2px solid ${color}` : undefined,
                    cursor: hasLock ? "pointer" : "default",
                  }}
                  variants={{
                    hidden: { opacity: 0, x: 30 },
                    show: { opacity: 1, x: 0, transition: { type: "spring", damping: 20 } },
                  }}
                  whileHover={{ x: -4, transition: { duration: 0.2 } }}
                  animate={isSelected ? { scale: 1.02 } : { scale: 1 }}
                  onClick={() => { if (hasLock && currentPlayer.status !== "SOLD") setSelectedTeam(team.name); }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                    <h3 style={{ margin: 0 }}>{team.name}</h3>
                    <AnimatedCounter value={team.budget} prefix="₹" fontSize="1rem" fontWeight="700" color="#10b981" highlight />
                  </div>

                  {/* Budget bar */}
                  <div style={styles.progressBarBg}>
                    <motion.div
                      style={{ height: "100%", borderRadius: "3px", background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, Math.max(0, remainingPercent))}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                    />
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                    <span>{team.players.length} Players</span>
                    <span>Spent: ₹{totalSpent.toLocaleString()}</span>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

        </div>

        {/* READ ONLY OVERLAY IF NO LOCK */}
        <AnimatePresence>
          {!hasLock && (
            <motion.div
              style={styles.overlayContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel"
                style={styles.overlayCard}
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <Lock size={48} color="#ef4444" style={{ marginBottom: "20px" }} />
                <h2 style={{ margin: "0 0 10px" }}>Auction Locked</h2>
                <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: "20px", maxWidth: "300px" }}>
                  Another organizer is currently managing changes. You are in View-Only mode.
                </p>
                <motion.button className="btn-glass" onClick={() => window.location.reload()} whileHover={{ scale: 1.05 }}>Refresh Status</motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* END AUCTION CONFIRMATION MODAL */}
        <AnimatePresence>
          {showEndConfirm && (
            <motion.div
              style={styles.overlayContainer}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="glass-panel"
                style={{ ...styles.overlayCard, border: "1px solid rgba(239, 68, 68, 0.4)", boxShadow: "0 20px 50px rgba(239, 68, 68, 0.2)" }}
                initial={{ scale: 0.85, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 20 }}
              >
                <div style={{ padding: "15px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "50%", marginBottom: "20px" }}>
                   <Trophy size={40} color="#ef4444" />
                </div>
                <h2 style={{ margin: "0 0 10px", fontSize: "1.8rem" }}>End Auction?</h2>
                <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: "30px", maxWidth: "350px", lineHeight: 1.6 }}>
                  Are you absolutely sure you want to end this auction? 
                  <br/><br/>
                  <span style={{ color: "#ef4444", fontWeight: "bold" }}>This action is final and cannot be undone.</span>
                </p>
                <div style={{ display: "flex", gap: "15px", width: "100%" }}>
                  <motion.button 
                    className="btn-glass" 
                    style={{ flex: 1 }} 
                    onClick={() => setShowEndConfirm(false)}
                    whileHover={{ scale: 1.03 }}
                  >
                    Cancel
                  </motion.button>
                  <motion.button 
                    className="btn-premium" 
                    style={{ flex: 1, background: "linear-gradient(135deg, #dc2626, #991b1b)", boxShadow: "0 4px 15px rgba(220, 38, 38, 0.4)" }} 
                    onClick={() => { setShowEndConfirm(false); updateState("ENDED", true); }}
                    whileHover={{ scale: 1.03 }}
                  >
                    Yes, End It
                  </motion.button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </PageTransition>
  );
}

const styles = {
  layout: {
    padding: "20px 40px",
    maxWidth: "1400px",
    margin: "0 auto",
    position: "relative"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 30px",
    marginBottom: "20px"
  },
  codeBubble: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 12px",
    cursor: "pointer"
  },
  lockBadge: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(0,0,0,0.3)",
    padding: "6px 12px",
    borderRadius: "20px"
  },
  mainGrid: {
    display: "grid",
    gridTemplateColumns: "1.5fr 1fr",
    gap: "30px",
  },
  playerCard: {
    padding: "40px 20px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    position: "relative",
    overflow: "hidden"
  },
  imageWrapper: {
    width: "200px",
    height: "200px",
    borderRadius: "16px",
    overflow: "hidden",
    background: "rgba(255,255,255,0.05)",
    border: "4px solid rgba(255,255,255,0.1)",
    position: "relative",
    boxShadow: "0 10px 30px rgba(0,0,0,0.3)"
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover"
  },
  badge: {
    background: "rgba(59, 130, 246, 0.1)",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    color: "#60a5fa",
    padding: "4px 12px",
    borderRadius: "20px",
    fontSize: "0.8rem",
    fontWeight: "bold"
  },
  bidDisplay: {
    padding: "20px 40px",
    display: "inline-flex",
    flexDirection: "column",
    alignItems: "center",
    marginTop: "10px"
  },
  progressBarBg: {
    height: "6px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  overlayContainer: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(11, 17, 32, 0.7)",
    backdropFilter: "blur(4px)",
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  },
  overlayCard: {
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    boxShadow: "0 20px 50px rgba(0,0,0,0.5)"
  }
};

export default OrganizerLive;
