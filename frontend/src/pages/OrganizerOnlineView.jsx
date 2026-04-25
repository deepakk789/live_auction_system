import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, Clock, ShieldAlert, SkipForward, Power, Search, List } from "lucide-react";
import socket, { BACKEND_URL } from "../services/socket";
import PageTransition from "../components/PageTransition";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";

function OrganizerOnlineView() {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [hasLock, setHasLock] = useState(false);
  
  const [auctionState, setAuctionState] = useState("LIVE");
  const [playersState, setPlayersState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [managerStatuses, setManagerStatuses] = useState({});
  const [auctionConfig, setAuctionConfig] = useState(null);
  
  const [countdown, setCountdown] = useState(null);
  const [resumeSeconds, setResumeSeconds] = useState(null);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState("");

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
    const driveLink = Object.values(details).find(val => typeof val === "string" && val.includes("drive.google.com"));
    if (!driveLink) return null;
    let match = driveLink.match(/id=([^&]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    match = driveLink.match(/\/d\/([^/]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    return null;
  };

  useEffect(() => {
    const userStr = localStorage.getItem("authUser");
    if (!userStr) {
      navigate("/login");
      return;
    }
    const user = JSON.parse(userStr);
    setCurrentUser(user);

    socket.emit("join_auction", { auctionId });

    const fetchAuction = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
        if (!res.ok) throw new Error("Failed to fetch auction");
        const data = await res.json();
        
        if (data.biddingMode !== "ONLINE") {
          alert("This auction is not an online auction.");
          navigate(`/organizer/${auctionId}/live`);
          return;
        }

        setAuctionState(data.auctionState);
        setPlayersState(data.playersState);
        setTeams(data.teamsState || []);
        setAuctionConfig(data.auctionConfig);

        if (data.activeOrganizer === user._id) {
          setHasLock(true);
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();

    // Socket listeners
    socket.on("auction_state", (state) => setAuctionState(state));
    
    socket.on("bid_accepted", ({ playerIndex, amount, teamName }) => {
      setPlayersState(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        if (copy.currentIndex === playerIndex && copy.players[playerIndex]) {
          copy.players[playerIndex].currentBid = amount;
          copy.players[playerIndex].currentBidder = teamName;
        }
        return copy;
      });
    });

    socket.on("bid_countdown_tick", ({ seconds }) => {
      setCountdown(seconds);
    });

    socket.on("player_sold_auto", ({ playerIndex, playerName, soldTo, soldPrice }) => {
      setCountdown(null);
      setPlayersState(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        if (copy.currentIndex === playerIndex && copy.players[playerIndex]) {
          copy.players[playerIndex].status = "SOLD";
          copy.players[playerIndex].soldTo = soldTo;
          copy.players[playerIndex].soldPrice = soldPrice;
        }
        return copy;
      });
      setTeams(prevTeams => prevTeams.map(t => {
        if (t.name === soldTo) {
          return { ...t, budget: t.budget - soldPrice, players: [...t.players, { name: playerName, price: soldPrice }] };
        }
        return t;
      }));
    });

    socket.on("online_next_player", ({ playerIndex, player, teams }) => {
      setCountdown(null);
      setPlayersState(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        copy.currentIndex = playerIndex;
        copy.players[playerIndex] = player;
        return copy;
      });
      setTeams(teams);
      setShowPlayerList(false); // Close list if open
    });

    socket.on("player_skipped", ({ playerIndex }) => {
      setCountdown(null);
      setPlayersState(prev => {
        if (!prev) return prev;
        const copy = { ...prev };
        if (copy.currentIndex === playerIndex && copy.players[playerIndex]) {
          copy.players[playerIndex].status = "UNSOLD";
        }
        return copy;
      });
    });

    socket.on("online_auction_complete", () => {
      setAuctionState("ENDED");
    });

    socket.on("teams_update", (tms) => setTeams(tms));

    socket.on("manager_status_change", ({ teamName, status }) => {
      setManagerStatuses(prev => ({ ...prev, [teamName]: status }));
    });
    
    socket.on("team_quit_alert", ({ teamName }) => {
      setToastMessage(`⚠️ TEAM MANAGER DISCONNECTED: ${teamName}`);
      setTimeout(() => setToastMessage(""), 5000);
    });

    socket.on("resume_countdown_tick", ({ seconds }) => {
      setResumeSeconds(seconds);
    });

    socket.on("player_queued", ({ playerName }) => {
      setToastMessage(`✅ ${playerName} queued for next round!`);
      setTimeout(() => setToastMessage(""), 5000);
    });

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("auction_state");
      socket.off("bid_accepted");
      socket.off("bid_countdown_tick");
      socket.off("player_sold_auto");
      socket.off("online_next_player");
      socket.off("player_skipped");
      socket.off("online_auction_complete");
      socket.off("teams_update");
      socket.off("manager_status_change");
      socket.off("team_quit_alert");
      socket.off("resume_countdown_tick");
      socket.off("player_queued");
    };
  }, [auctionId, navigate]);

  const handleSkipPlayer = () => {
    if (!hasLock) return;
    if (confirm("Are you sure you want to mark this player as UNSOLD and skip to the next?")) {
      socket.emit("organizer_skip_player", { auctionId });
    }
  };

  const handleEndAuction = async () => {
    if (!hasLock) return;
    if (confirm("Are you sure you want to END the auction completely? This cannot be undone.")) {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`${BACKEND_URL}/api/auction/end`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ auctionId })
        });
        socket.emit("auction_state", { auctionId, state: "ENDED" });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleResetAuction = async () => {
    if (!hasLock) return;
    if (confirm("Are you sure you want to RESET the auction? All bids and sold players will be reverted to UPCOMING.")) {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`${BACKEND_URL}/api/auction/reset`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
          body: JSON.stringify({ auctionId })
        });
        alert("Auction reset successfully! Refresh to apply.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleSetNextPlayer = (index) => {
    if (!hasLock) return;
    if (confirm("Set this player as the active player for bidding?")) {
      socket.emit("organizer_set_player", { auctionId, playerIndex: index });
    }
  };

  if (loading || !playersState) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", maxWidth: "1200px", margin: "0 auto" }}>
          <SkeletonLoader variant="card" count={2} />
        </div>
      </PageTransition>
    );
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  
  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "20px 40px", position: "relative" }}>
        
        {/* Toast Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              style={{
                position: "fixed",
                top: "20px",
                left: "50%",
                transform: "translateX(-50%)",
                background: "rgba(239, 68, 68, 0.9)",
                backdropFilter: "blur(10px)",
                color: "white",
                padding: "12px 24px",
                borderRadius: "8px",
                fontWeight: "bold",
                zIndex: 1000,
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                border: "1px solid rgba(255,255,255,0.2)"
              }}
            >
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <motion.div className="glass-panel" style={{ padding: "16px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Eye size={24} color="#facc15" />
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Organizer Oversight <span style={{ color: "#9ca3af", fontSize: "1rem", fontWeight: "normal", marginLeft: "10px" }}>(Online Mode)</span></h2>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="btn-glass" onClick={() => setShowPlayerList(!showPlayerList)} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <List size={16} /> Player DB
            </button>
            <button className="btn-glass" onClick={() => navigate(`/organizer/${auctionId}/analytics`)}>📊 Analytics</button>
            {auctionState !== "ENDED" && hasLock && (
              <>
                <button className="btn-glass" style={{ color: "#facc15", borderColor: "rgba(250, 204, 21, 0.3)" }} onClick={handleResetAuction}>
                  Reset Auction
                </button>
                <button className="btn-glass" style={{ color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.3)" }} onClick={handleEndAuction}>
                  <Power size={16} style={{ marginRight: "6px" }} /> End Auction
                </button>
              </>
            )}
          </div>
        </motion.div>

        {auctionState === "PAUSED" && (
          <motion.div className="glass-panel" style={{ padding: "16px 24px", marginBottom: "24px", border: "2px solid #ef4444", background: "rgba(239, 68, 68, 0.1)" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 style={{ color: "#ef4444", margin: "0 0 5px" }}>⚠️ Auction Paused (Missing Representative)</h3>
            <p style={{ margin: 0, color: "#f87171" }}>A team representative has disconnected. The auction timer is paused and will automatically resume when they reconnect.</p>
          </motion.div>
        )}

        {auctionState === "RESUMING" && (
          <motion.div className="glass-panel" style={{ padding: "16px 24px", marginBottom: "24px", border: "2px solid #3b82f6", background: "rgba(59, 130, 246, 0.1)" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
            <h3 style={{ color: "#60a5fa", margin: "0 0 5px" }}>⏳ Resuming in {resumeSeconds}s...</h3>
            <p style={{ margin: 0, color: "#93c5fd" }}>All representatives are connected. The auction is about to automatically resume.</p>
          </motion.div>
        )}

        {auctionState === "ENDED" ? (
          <div className="glass-panel" style={{ padding: "60px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>Auction Ended</h1>
            <p style={{ color: "#9ca3af", fontSize: "1.2rem" }}>The auction has concluded successfully.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: showPlayerList ? "1fr 400px 350px" : "1fr 350px", gap: "24px", flex: 1, minHeight: 0, transition: "all 0.3s" }}>
            
            {/* Left: Player + Bidding Status */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px", overflowY: "auto", paddingRight: "5px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  className="glass-panel"
                  style={{ padding: "40px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div style={{ position: "absolute", top: "20px", left: "20px", display: "flex", alignItems: "center", gap: "6px", background: "rgba(0,0,0,0.4)", padding: "6px 12px", borderRadius: "20px", fontSize: "0.85rem", color: "#9ca3af" }}>
                    <ShieldAlert size={14} /> View Only
                  </div>

                  <div style={{ width: "200px", height: "200px", borderRadius: "20px", overflow: "hidden", border: "4px solid rgba(255,255,255,0.1)", marginBottom: "20px", position: "relative" }}>
                    <img src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto} alt="Player" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    <AnimatePresence>
                      {currentPlayer.status === "SOLD" && (
                        <motion.div className="stamp-overlay stamp-sold" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ padding: "5px", fontSize: "1.5rem" }}>
                          <h2 style={{ margin: 0 }}>SOLD</h2>
                          <div style={{ fontSize: "0.8rem" }}>to {currentPlayer.soldTo}</div>
                        </motion.div>
                      )}
                      {currentPlayer.status === "UNSOLD" && (
                        <motion.div className="stamp-overlay stamp-unsold" initial={{ scale: 3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ padding: "5px", fontSize: "1.5rem" }}>
                          <h2 style={{ margin: 0 }}>UNSOLD</h2>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  
                  <h1 style={{ fontSize: "2.2rem", margin: "0 0 10px", fontWeight: 900 }}>{currentPlayer.name}</h1>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "30px" }}>
                    {auctionConfig?.selectedFields?.map(f => {
                      if (currentPlayer.details[f]) {
                        return <span key={f} style={{ background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", color: "#9ca3af" }}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>;
                      }
                      return null;
                    })}
                  </div>

                  <div style={{ display: "flex", gap: "20px", width: "100%" }}>
                    {/* Bid State */}
                    <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "16px", textAlign: "center" }}>
                      <div style={{ fontSize: "0.9rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "5px" }}>Highest Bid</div>
                      <AnimatedCounter value={currentPlayer.currentBid || getBasePrice(currentPlayer.details)} prefix="₹" fontSize="3rem" fontWeight="900" className="text-gradient" />
                      <div style={{ marginTop: "10px", fontSize: "1rem", fontWeight: 600, color: currentPlayer.currentBidder ? "#10b981" : "#64748b" }}>
                        {currentPlayer.currentBidder ? `Team: ${currentPlayer.currentBidder}` : "Waiting for opening bid"}
                      </div>
                    </div>

                    {/* Countdown */}
                    <div style={{ flex: 1, background: "rgba(0,0,0,0.3)", padding: "20px", borderRadius: "16px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                      <div style={{ fontSize: "0.9rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "15px" }}>Timer</div>
                      <div style={{ width: "80px", height: "80px", borderRadius: "50%", border: `6px solid ${countdown !== null && countdown <= 3 ? "#ef4444" : "#3b82f6"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2rem", fontWeight: 900, background: "rgba(0,0,0,0.2)" }}>
                        {countdown !== null ? countdown : "--"}
                      </div>
                    </div>
                  </div>

                  {hasLock && currentPlayer.status === "LIVE" && (
                    <button className="btn-glass" style={{ marginTop: "30px", color: "#facc15", borderColor: "rgba(250,204,21,0.3)", padding: "12px 24px" }} onClick={handleSkipPlayer}>
                      <SkipForward size={16} style={{ marginRight: "8px" }} /> Force Mark UNSOLD
                    </button>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Middle: Player List (Optional) */}
            {showPlayerList && (
              <motion.div className="glass-panel" style={{ display: "flex", flexDirection: "column", padding: "20px" }} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }}>
                <h3 style={{ margin: "0 0 15px", display: "flex", alignItems: "center", gap: "8px" }}><List size={18} /> Player Database</h3>
                <div style={{ position: "relative", marginBottom: "15px" }}>
                  <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }} />
                  <input 
                    type="text" 
                    placeholder="Search players..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-premium"
                    style={{ width: "100%", paddingLeft: "30px", fontSize: "0.9rem" }}
                  />
                </div>
                <div style={{ flex: 1, overflowY: "auto", minHeight: 0, display: "flex", flexDirection: "column", gap: "8px", paddingRight: "5px" }}>
                  {filteredPlayers.map((p, idx) => (
                    <div key={idx} style={{ 
                      background: "rgba(255,255,255,0.03)", 
                      border: p.status === "LIVE" ? "1px solid #3b82f6" : "1px solid transparent",
                      padding: "10px", borderRadius: "8px", display: "flex", flexDirection: "column", gap: "8px" 
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem", color: p.status === "LIVE" ? "#3b82f6" : "white" }}>{p.name}</span>
                        <span style={{ 
                          fontSize: "0.7rem", padding: "2px 6px", borderRadius: "4px", fontWeight: "bold",
                          background: p.status === "SOLD" ? "rgba(16,185,129,0.1)" : p.status === "UNSOLD" ? "rgba(239,68,68,0.1)" : p.status === "LIVE" ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)",
                          color: p.status === "SOLD" ? "#10b981" : p.status === "UNSOLD" ? "#ef4444" : p.status === "LIVE" ? "#60a5fa" : "#9ca3af"
                        }}>
                          {p.status}
                        </span>
                      </div>
                      {p.status !== "SOLD" && p.status !== "LIVE" && hasLock && (
                        <button 
                          className="btn-glass" 
                          style={{ padding: "4px", fontSize: "0.75rem", width: "100%" }}
                          onClick={() => handleSetNextPlayer(idx)}
                        >
                          Select as Active
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Right: Team Statuses */}
            <div style={{ display: "flex", flexDirection: "column", gap: "15px", overflowY: "auto", paddingRight: "5px" }}>
              <div style={{ fontSize: "1.1rem", fontWeight: 700, marginBottom: "5px" }}>Teams Overview</div>
              {teams.map((team, idx) => {
                const isConnected = managerStatuses[team.name] === "Connected";
                return (
                  <div key={team.name} className="glass-card" style={{ padding: "16px", borderLeft: `3px solid #3b82f6` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                      <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800 }}>{team.name}</h3>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: isConnected ? "#10b981" : "#ef4444" }}></span>
                        <span style={{ fontSize: "0.75rem", color: isConnected ? "#10b981" : "#ef4444" }}>{isConnected ? "Connected" : "Offline"}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                      <span style={{ fontSize: "0.85rem", color: "#9ca3af" }}>Budget:</span>
                      <AnimatedCounter value={team.budget} prefix="₹" fontSize="0.9rem" fontWeight="700" color="#10b981" />
                    </div>

                    <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", justifyContent: "space-between" }}>
                      <span>{team.players.length} Players</span>
                      <span>Rep: {team.managerUsername || "None"}</span>
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        )}

      </div>
    </PageTransition>
  );
}

export default OrganizerOnlineView;
