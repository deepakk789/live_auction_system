import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket, { BACKEND_URL } from "../services/socket";
import DrinksBreak from "./DrinksBreak";
import { Copy, Check, Users, Activity, ExternalLink, Zap } from "lucide-react";

function ViewerLive() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";
  
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [teams, setTeams] = useState([]);
  const [auctionName, setAuctionName] = useState("");
  const [selectedFields, setSelectedFields] = useState([]);
  const [biddingMode, setBiddingMode] = useState("OFFLINE");
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);
  
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [representingTeam, setRepresentingTeam] = useState("");
  const [loading, setLoading] = useState(true);

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

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("auction_update");
      socket.off("teams_update");
      socket.off("auction_state");
      socket.off("auction_config");
    };
  }, [auctionId]);

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

    // Emit to room (organizer will process it and sync state)
    socket.emit("viewer_bid", { auctionId, teamName: representingTeam, amount: newBid });
  };


  /* ---------- RENDER ---------- */
  if (loading) return <div className="spinner" style={{ margin: "100px auto" }}></div>;
  if (!playersState || !playersState.players?.length) return <div style={styles.container}><h3>Waiting for organizer to start...</h3></div>;

  if (auctionState === "BREAK") {
    return (
      <div style={styles.container}>
        <div className="glass-panel" style={{ padding: "20px", display: "flex", justifyContent: "space-between", marginBottom: "30px" }}>
          <h2>{auctionName || "Auction"} - Drinks Break  🍹</h2>
          <button className="btn-glass" onClick={() => navigate(`/analytics/${auctionId}`)}>View Full Analytics</button>
        </div>
        <DrinksBreak readOnly />
      </div>
    );
  }

  if (auctionState === "ENDED") {
    return (
      <div style={styles.container}>
        <div className="glass-card" style={{ padding: "60px", textAlign: "center" }}>
          <h1>Auction Ended 🏁</h1>
          <p style={{ color: "#94a3b8", marginBottom: "30px" }}>The auction has been officially concluded by the organizer.</p>
          <button className="btn-premium" onClick={() => navigate(`/past/${auctionId}/analytics`)}>
            View Final Results
          </button>
        </div>
      </div>
    );
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const base = getBasePrice(currentPlayer.details);
  const currentBid = currentPlayer.currentBid || base;

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* HEADER */}
      <div className="glass-panel" style={styles.header}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px" }}>
          <Activity size={24} color="#3b82f6"/> 
          {auctionName || "Live Auction"}
        </h2>
        <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
          {biddingMode === "ONLINE" && (
            <div style={styles.onlineBadge}>
              <Zap size={14}/> ONLINE BIDDING
            </div>
          )}
          <button className="btn-glass" onClick={() => setShowAnalytics(true)}>
            <ExternalLink size={16} /> Leaderboard
          </button>
        </div>
      </div>

      <div style={styles.mainGrid}>
        
        {/* PLAYER DISPLAY */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="glass-panel" style={styles.playerCard}>
            <div style={styles.imageWrapper}>
              <img src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto} alt="Player" style={styles.photo} />
              {currentPlayer.status === "SOLD" && <div className="stamp-overlay stamp-sold"><h2>SOLD!</h2><p>to {currentPlayer.soldTo}</p></div>}
              {currentPlayer.status === "UNSOLD" && <div className="stamp-overlay stamp-unsold"><h2>UNSOLD</h2></div>}
            </div>

            <h1 style={{ fontSize: "3rem", fontWeight: 900, margin: "20px 0 10px", lineHeight: 1.1 }}>{currentPlayer.name}</h1>
            
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "30px" }}>
              {selectedFields.map(f => {
                if (currentPlayer.details[f]) {
                  return <span key={f} style={styles.badge}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>
                }
                return null;
              })}
            </div>

            <div className="glass-card" style={styles.bidDisplay}>
              <span style={{ fontSize: "1.2rem", color: "#9ca3af", letterSpacing: "2px" }}>CURRENT BID</span>
              <div className="text-gradient" style={{ fontSize: "6rem", fontWeight: 900, lineHeight: 1 }}>
                ₹{currentBid.toLocaleString()}
              </div>
            </div>
          </div>

          {/* ONLINE BIDDING PANEL */}
          {biddingMode === "ONLINE" && currentPlayer.status !== "SOLD" && (
            <div className="glass-card stagger-1" style={{ padding: "30px", border: "2px solid rgba(59,130,246,0.3)" }}>
              <h3 style={{ margin: "0 0 20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Zap color="#3b82f6"/> Bid from your Device
              </h3>
              
              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", color: "#94a3b8", marginBottom: "8px", fontSize: "0.9rem" }}>Are you representing a team?</label>
                <select 
                  className="input-premium" 
                  value={representingTeam} 
                  onChange={e => setRepresentingTeam(e.target.value)}
                >
                  <option value="">-- I am just a viewer --</option>
                  {teams.map(t => (
                    <option key={t.name} value={t.name}>{t.name} (Budget: ₹{t.budget})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", gap: "10px", opacity: representingTeam ? 1 : 0.4, pointerEvents: representingTeam ? "auto" : "none" }}>
                {bidSteps.map(amt => (
                  <button 
                    key={amt} 
                    className="btn-premium" 
                    style={{ flex: 1, padding: "20px 0", fontSize: "1.5rem" }}
                    onClick={() => handleSubmitBid(amt)}
                  >
                    + {amt}
                  </button>
                ))}
              </div>
              {!representingTeam && <p style={{ color: "#facc15", fontSize: "0.85rem", marginTop: "15px", textAlign: "center" }}>Select your team to place bids.</p>}
            </div>
          )}
        </div>


        {/* TEAMS SIDEBAR */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          {teams.map(team => (
            <div key={team.name} className="glass-card" style={{ padding: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 800 }}>{team.name}</h3>
                <span style={{ color: "#10b981", fontWeight: 700, fontSize: "1.2rem" }}>₹{team.budget.toLocaleString()}</span>
              </div>
              
              {team.players.length === 0 ? (
                <p style={{ color: "#64748b", margin: 0, fontSize: "0.9rem" }}>No players bought yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {team.players.map((p, idx) => (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", background: "rgba(255,255,255,0.05)", padding: "8px 12px", borderRadius: "6px", fontSize: "0.85rem" }}>
                      <span style={{ fontWeight: 600 }}>{p.name}</span>
                      <span style={{ color: "#9ca3af" }}>₹{p.price}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
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
    marginTop: "20px"
  }
};

export default ViewerLive;
