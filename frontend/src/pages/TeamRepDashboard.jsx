import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Activity, Users, Wallet } from "lucide-react";
import socket, { BACKEND_URL } from "../services/socket";
import PageTransition from "../components/PageTransition";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";
import DrinksBreak from "./DrinksBreak";

function TeamRepDashboard() {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [auctionState, setAuctionState] = useState("LIVE");
  const [playersState, setPlayersState] = useState(null);
  const [teams, setTeams] = useState([]);
  const [auctionConfig, setAuctionConfig] = useState(null);
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);
  
  const [representingTeam, setRepresentingTeam] = useState("");
  const [countdown, setCountdown] = useState(null);
  const [myTeamData, setMyTeamData] = useState(null);
  const [resumeSeconds, setResumeSeconds] = useState(null);

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
          alert("This auction is not an online auction. Redirecting to viewer.");
          navigate(`/viewer/${auctionId}`);
          return;
        }

        setAuctionState(data.auctionState);
        setPlayersState(data.playersState);
        setTeams(data.teamsState || []);
        setAuctionConfig(data.auctionConfig);
        if (data.auctionSetup?.bidSteps) setBidSteps(data.auctionSetup.bidSteps);

        // Find my team
        const managedTeam = data.teamsState.find(
          t => t.managerUsername && t.managerUsername.toLowerCase() === user.username.toLowerCase()
        );

        if (!managedTeam) {
          alert("You are not assigned as a team representative for this auction.");
          navigate(`/viewer/${auctionId}`);
          return;
        }

        setRepresentingTeam(managedTeam.name);
        setMyTeamData(managedTeam);
        
        // Announce presence
        socket.emit("manager_join", { auctionId, teamName: managedTeam.name });

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAuction();

    // Socket listeners
    socket.on("auction_state", (state) => setAuctionState(state));
    
    socket.on("bid_accepted", ({ playerIndex, amount, teamName, playerName }) => {
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
      // Deduct budget locally for instant feedback
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
    });

    socket.on("player_skipped", ({ playerIndex, playerName }) => {
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

    socket.on("resume_countdown_tick", ({ seconds }) => {
      setResumeSeconds(seconds);
    });

    return () => {
      socket.emit("team_quit_request", { auctionId, teamName: representingTeam });
      socket.emit("leave_auction", { auctionId });
      socket.off("auction_state");
      socket.off("bid_accepted");
      socket.off("bid_countdown_tick");
      socket.off("player_sold_auto");
      socket.off("online_next_player");
      socket.off("player_skipped");
      socket.off("online_auction_complete");
      socket.off("teams_update");
      socket.off("resume_countdown_tick");
    };
  }, [auctionId, navigate, representingTeam]);

  useEffect(() => {
    if (representingTeam) {
      const me = teams.find(t => t.name === representingTeam);
      if (me) setMyTeamData(me);
    }
  }, [teams, representingTeam]);

  useEffect(() => {
    if (representingTeam) {
      const handleBeforeUnload = (e) => {
        socket.emit("team_quit_request", { auctionId, teamName: representingTeam });
        e.preventDefault();
        e.returnValue = "Leaving will disconnect your team and alert the organizer!";
      };
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }
  }, [representingTeam, auctionId]);

  const handleBid = (increment) => {
    if (auctionState !== "LIVE") return;
    if (!playersState) return;

    const currentPlayer = playersState.players[playersState.currentIndex];
    if (currentPlayer.status !== "LIVE") return;
    
    // Prevent bidding against yourself
    if (currentPlayer.currentBidder === representingTeam) return;

    const base = getBasePrice(currentPlayer.details);
    const newBid = Math.max(base, (currentPlayer.currentBid || 0) + increment);

    if (myTeamData && myTeamData.budget < newBid) {
      alert("Insufficient budget for this bid.");
      return;
    }

    socket.emit("online_bid", { auctionId, teamName: representingTeam, amount: newBid });
  };

  if (loading || !playersState) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
          <SkeletonLoader variant="card" count={2} />
        </div>
      </PageTransition>
    );
  }

  if (auctionState === "UPCOMING") {
    return (
      <PageTransition>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "80vh", padding: "40px", textAlign: "center", color: "white" }}>
          <div className="glass-panel" style={{ padding: "50px", maxWidth: "500px" }}>
            <Activity size={48} color="#3b82f6" style={{ marginBottom: "20px" }} />
            <h2 style={{ fontSize: "1.8rem", marginBottom: "12px" }}>Waiting for Organizer</h2>
            <p style={{ color: "#9ca3af", marginBottom: "20px" }}>
              You are connected as the manager for <strong style={{ color: "#10b981" }}>{representingTeam}</strong>. The auction will start when the organizer opens the lobby.
            </p>
          </div>
        </div>
      </PageTransition>
    );
  }

  if (auctionState === "BREAK" || auctionState === "PAUSED" || auctionState === "RESUMING") {
    return (
      <PageTransition>
        <div style={{ padding: "30px 40px", maxWidth: "1400px", margin: "0 auto" }}>
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
              <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>Drinks Break 🍹</h2>
            </motion.div>
          )}
          <DrinksBreak readOnly />
        </div>
      </PageTransition>
    );
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const base = getBasePrice(currentPlayer.details);
  const currentBid = currentPlayer.currentBid || base;
  const isLeading = currentPlayer.currentBidder === representingTeam;

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "20px 40px" }}>
        
        {/* Header */}
        <motion.div className="glass-panel" style={{ padding: "16px 24px", marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "center" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Zap size={24} color="#facc15" />
            <h2 style={{ margin: 0, fontSize: "1.4rem" }}>Team Dashboard</h2>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase" }}>Representing</div>
              <div style={{ fontWeight: 800, fontSize: "1.2rem", color: "#3b82f6" }}>{representingTeam}</div>
            </div>
            <div style={{ width: "2px", height: "30px", background: "rgba(255,255,255,0.1)" }}></div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "0.8rem", color: "#9ca3af", textTransform: "uppercase" }}>Remaining Budget</div>
              <AnimatedCounter value={myTeamData?.budget || 0} prefix="₹" fontSize="1.2rem" fontWeight="800" color="#10b981" />
            </div>
          </div>
        </motion.div>

        {auctionState === "ENDED" ? (
          <div className="glass-panel" style={{ padding: "60px", textAlign: "center", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <h1 style={{ fontSize: "3rem", marginBottom: "20px" }}>Auction Ended</h1>
            <p style={{ color: "#9ca3af", fontSize: "1.2rem" }}>Thank you for participating.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: "24px", flex: 1 }}>
            
            {/* Left: Player + Bid Display */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  className="glass-panel"
                  style={{ padding: "40px", flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden" }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <div style={{ width: "220px", height: "220px", borderRadius: "20px", overflow: "hidden", border: "4px solid rgba(255,255,255,0.1)", marginBottom: "20px", position: "relative" }}>
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
                  
                  <h1 style={{ fontSize: "2.5rem", margin: "0 0 10px", fontWeight: 900 }}>{currentPlayer.name}</h1>
                  
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "8px", marginBottom: "30px" }}>
                    {auctionConfig?.selectedFields?.map(f => {
                      if (currentPlayer.details[f]) {
                        return <span key={f} style={{ background: "rgba(255,255,255,0.05)", padding: "4px 12px", borderRadius: "20px", fontSize: "0.8rem", color: "#9ca3af" }}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>;
                      }
                      return null;
                    })}
                  </div>

                  {/* Bid State */}
                  <div style={{ background: "rgba(0,0,0,0.3)", width: "100%", padding: "30px", borderRadius: "16px", textAlign: "center", position: "relative", border: isLeading ? "2px solid #10b981" : "2px solid transparent" }}>
                    <div style={{ fontSize: "1rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "2px", marginBottom: "10px" }}>Current Bid</div>
                    <AnimatedCounter value={currentBid} prefix="₹" fontSize="4.5rem" fontWeight="900" highlight className="text-gradient" />
                    
                    {currentPlayer.currentBidder ? (
                      <div style={{ marginTop: "15px", fontSize: "1.1rem", fontWeight: 600, color: isLeading ? "#10b981" : "#facc15" }}>
                        Highest Bidder: {isLeading ? "YOU" : currentPlayer.currentBidder}
                      </div>
                    ) : (
                      <div style={{ marginTop: "15px", fontSize: "1.1rem", color: "#64748b" }}>Waiting for opening bid... (Base: ₹{base})</div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Right: Controls & Countdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              
              {/* Countdown Timer */}
              <div className="glass-panel" style={{ padding: "30px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
                <h3 style={{ margin: "0 0 15px", color: "#9ca3af" }}>Time Remaining</h3>
                <div style={{ width: "120px", height: "120px", borderRadius: "50%", border: `8px solid ${countdown !== null && countdown <= 3 ? "#ef4444" : "#3b82f6"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "3rem", fontWeight: 900, background: "rgba(0,0,0,0.2)", transition: "border-color 0.3s" }}>
                  {countdown !== null ? countdown : "--"}
                </div>
                {countdown !== null && (
                  <div style={{ marginTop: "15px", color: countdown <= 3 ? "#ef4444" : "#60a5fa", fontWeight: 700, animation: countdown <= 3 ? "pulse 1s infinite" : "none" }}>
                    Going {countdown <= 3 ? (countdown === 1 ? "once..." : "twice...") : "..."}
                  </div>
                )}
              </div>

              {/* Bidding Controls */}
              <div className="glass-panel" style={{ padding: "24px" }}>
                <h3 style={{ margin: "0 0 15px" }}>Place Bid</h3>
                
                {currentPlayer.status !== "LIVE" ? (
                  <div style={{ textAlign: "center", padding: "20px", background: "rgba(255,255,255,0.05)", borderRadius: "12px", color: "#9ca3af" }}>
                    Waiting for next player...
                  </div>
                ) : isLeading ? (
                  <div style={{ textAlign: "center", padding: "20px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: "12px", color: "#10b981", fontWeight: 600 }}>
                    You have the highest bid!
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {bidSteps.map(amt => {
                      const nextBid = Math.max(base, (currentPlayer.currentBid || 0) + amt);
                      const canAfford = myTeamData?.budget >= nextBid;
                      return (
                        <motion.button
                          key={amt}
                          className="btn-premium"
                          style={{ padding: "16px", fontSize: "1.2rem", display: "flex", justifyContent: "space-between", alignItems: "center", opacity: canAfford ? 1 : 0.5 }}
                          onClick={() => handleBid(amt)}
                          disabled={!canAfford}
                          whileHover={canAfford ? { scale: 1.02 } : {}}
                          whileTap={canAfford ? { scale: 0.98 } : {}}
                        >
                          <span>Bid +{amt}</span>
                          <span style={{ fontSize: "1rem", opacity: 0.8 }}>(₹{nextBid})</span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* My Roster */}
              <div className="glass-panel" style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
                <h3 style={{ margin: "0 0 15px", display: "flex", alignItems: "center", gap: "8px" }}><Users size={18} /> My Roster ({myTeamData?.players.length || 0})</h3>
                <div style={{ overflowY: "auto", flex: 1, maxHeight: "200px" }}>
                  {myTeamData?.players.length === 0 ? (
                    <div style={{ color: "#64748b", fontSize: "0.9rem", fontStyle: "italic" }}>No players acquired yet.</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                      {myTeamData?.players.map((p, idx) => (
                        <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.03)", padding: "10px 12px", borderRadius: "8px", fontSize: "0.9rem" }}>
                          <span style={{ fontWeight: 600 }}>{p.name}</span>
                          <span style={{ color: "#facc15" }}>₹{p.price}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </PageTransition>
  );
}

export default TeamRepDashboard;
