import { useEffect, useState, useRef } from "react";
import socket, { BACKEND_URL } from "../services/socket";
import { useNavigate, useParams } from "react-router-dom";
import { Copy, Check, Lock, Unlock, Trophy, User } from "lucide-react";

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

  // Lock System
  const [hasLock, setHasLock] = useState(false);
  const [activeOrganizerInfo, setActiveOrganizerInfo] = useState(null);
  const [lockLoading, setLockLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const navigate = useNavigate();
  const stateRef = useRef({ prevIndex: 0 });

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
          // Sync state will give us the active organizer
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
        
        // Always respect server's activeOrganizer initially
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
      if (!hasLock) setTeams(data); // only non-lock holders accept state changes blindly
    });

    socket.on("auction_update", (data) => {
      if (!hasLock) setPlayersState(data);
    });

    socket.on("auction_state", (state) => {
      if (!hasLock) setAuctionState(state);
    });

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("teams_update");
      socket.off("auction_update");
      socket.off("auction_state");
      socket.off("organizer_lock_change");
    };
  }, [auctionId, hasLock, currentUser]);

  /* ---------- VIEWER ONLINE BIDDING HANDLER ---------- */
  useEffect(() => {
    const handleViewerBid = ({ teamName, amount }) => {
      if (!hasLock) return; // Only the active organizer processes viewer bids to avoid race conditions
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
        
        // Select the team that bid automatically so organizer can just click SOLD
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
      setSelectedTeam(""); // Reset selected team on player change
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
  const updateState = async (state) => {
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
    if (!playersState || playersState.players[playersState.currentIndex].status === "SOLD") return;
    const limit = maxBid ?? Infinity;
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
  if (lockLoading || !setup || !auctionConfig || !playersState) {
    return <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}><div className="spinner"></div></div>;
  }

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const bidSteps = setup.bidSteps || [10, 20, 50];

  return (
    <div style={styles.layout} className="animate-fade-in">
      
      {/* HEADER / TOPBAR */}
      <div className="glass-panel" style={styles.header}>
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Organizer Board</h1>
          
          <div className="glass-card" style={styles.codeBubble} onClick={copyCode}>
            <span style={{ fontSize: "10px", color: "#94a3b8" }}>CODE</span>
            <span style={{ fontFamily: "monospace", fontWeight: "bold", fontSize: "1.2rem", color: "#60a5fa" }}>{auctionCode}</span>
            {codeCopied ? <Check size={14} color="#10b981"/> : <Copy size={14} color="#94a3b8"/>}
          </div>
          
          <div style={styles.lockBadge}>
            {hasLock ? <Lock size={16} color="#10b981"/> : <Unlock size={16} color="#ef4444"/>}
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: hasLock ? "#10b981" : "#ef4444" }}>
              {hasLock ? "Edit Access" : "Read Only"}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn-glass" onClick={() => { updateState("BREAK"); navigate(`/organizer/${auctionId}/teams`); }}>Teams Setup</button>
          <button className="btn-glass" onClick={() => navigate(`/organizer/${auctionId}/analytics`)}>📊 Analytics</button>
        </div>
      </div>

      <div style={styles.mainGrid}>
        
        {/* LEFT COLUMN: PLAYER CARD & BIDDING */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          
          <div style={{ display: "flex", gap: "10px" }}>
            <button className={`btn-premium ${auctionState === "LIVE" ? "active" : ""}`} onClick={() => updateState("LIVE")} disabled={!hasLock} style={{flex: 1, filter: auctionState !== "LIVE" ? "grayscale(100%)" : "none"}}>LIVE</button>
            <button className={`btn-glass ${auctionState === "BREAK" ? "active" : ""}`} onClick={() => updateState("BREAK")} disabled={!hasLock} style={{flex: 1}}>BREAK</button>
            <button className={`btn-glass ${auctionState === "ENDED" ? "active" : ""}`} onClick={() => updateState("ENDED")} disabled={!hasLock} style={{flex: 1}}>END</button>
          </div>

          <div className="glass-panel" style={styles.playerCard}>
            <div style={styles.imageWrapper}>
               <img src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto} alt="Player" style={styles.photo} />
               {currentPlayer.status === "SOLD" && <div className="stamp-overlay stamp-sold"><h2>SOLD</h2></div>}
               {currentPlayer.status === "UNSOLD" && <div className="stamp-overlay stamp-unsold"><h2>UNSOLD</h2></div>}
            </div>
            
            <h2 style={{ fontSize: "2.5rem", margin: "20px 0 10px", fontWeight: 900 }}>{currentPlayer.name}</h2>
            
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "10px", marginBottom: "20px" }}>
              {auctionConfig.selectedFields.map(f => {
                 if (currentPlayer.details[f]) {
                   return <span key={f} style={styles.badge}>{f.toUpperCase()}: {currentPlayer.details[f]}</span>
                 }
                 return null;
              })}
            </div>
            
            <div className="glass-card" style={styles.bidDisplay}>
              <span style={{ fontSize: "1rem", color: "#9ca3af" }}>CURRENT BID</span>
              <div className="text-gradient" style={{ fontSize: "4rem", fontWeight: 900, lineHeight: 1 }}>
                ₹{(currentPlayer.currentBid || getBasePrice(currentPlayer.details)).toLocaleString()}
              </div>
            </div>
          </div>

          {/* BIDDING CONTROLS */}
          <div className="glass-panel" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Controls {biddingMode === "ONLINE" && <span style={{ color: "#3b82f6", fontSize: "0.8rem", marginLeft: "10px" }}>(Online Ops Available)</span>}</h3>
              <div style={{ fontSize: "0.85rem", color: "#94a3b8" }}>
                Base: ₹{getBasePrice(currentPlayer.details)}
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              {bidSteps.map(amt => (
                <button key={amt} className="btn-glass" style={{ flex: 1, padding: "15px 0", fontSize: "1.2rem", color: "#10b981", borderColor: "rgba(16,185,129,0.3)" }} onClick={() => increaseBid(amt)} disabled={!hasLock}>
                  +{amt}
                </button>
              ))}
              <button className="btn-glass" style={{ width: "60px", color: "#ef4444" }} onClick={() => decreaseBid(bidSteps[0])} disabled={!hasLock}>
                -{bidSteps[0]}
              </button>
            </div>

            <select 
              className="input-premium" 
              value={selectedTeam} 
              onChange={e => setSelectedTeam(e.target.value)}
              disabled={!hasLock || currentPlayer.status === "SOLD"}
              style={{ fontSize: "1.1rem", cursor: "pointer", background: selectedTeam ? "rgba(59,130,246,0.2)" : "" }}
            >
              <option value="">-- SELECT TEAM --</option>
              {teams.map(t => (
                <option key={t.name} value={t.name}>{t.name} (₹{t.budget})</option>
              ))}
            </select>

            <div style={{ display: "flex", gap: "10px" }}>
              {currentPlayer.status === "SOLD" ? (
                <button className="btn-glass" style={{ flex: 1, background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }} onClick={undoSold} disabled={!hasLock}>
                  Undo Sold
                </button>
              ) : (
                <>
                  <button className="btn-premium" style={{ flex: 2, background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)" }} onClick={sellPlayer} disabled={!hasLock}>
                    SELL PLAYER
                  </button>
                  <button className="btn-glass" style={{ flex: 1, color: "#facc15", borderColor: "rgba(250,204,21,0.3)" }} onClick={markUnsold} disabled={!hasLock}>
                    UNSOLD
                  </button>
                </>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
              <button className="btn-glass" onClick={goPrev} disabled={!hasLock || currentIndex === 0}>← Prev</button>
              <span style={{ color: "#94a3b8", alignSelf: "center", fontWeight: "bold" }}>{currentIndex + 1} / {players.length}</span>
              <button className="btn-glass" onClick={goNext} disabled={!hasLock || currentIndex === players.length - 1}>Next →</button>
            </div>
          </div>
        </div>


        {/* RIGHT COLUMN: TEAMS */}
        <div style={{ display: "flex", flexDirection: "column", gap: "15px", height: "calc(100vh - 140px)", overflowY: "auto", paddingRight: "10px" }}>
          {teams.map(team => {
            const isSelected = selectedTeam === team.name;
            const remainingPercent = (team.budget / (setup.maxBudget || 1)) * 100;
            return (
              <div key={team.name} className="glass-card" style={{ padding: "20px", border: isSelected ? "2px solid #3b82f6" : "1px solid rgba(255,255,255,0.1)", transform: isSelected ? "scale(1.02)" : "scale(1)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>{team.name}</h3>
                  <span style={{ fontWeight: "bold", color: "#10b981" }}>₹{team.budget.toLocaleString()}</span>
                </div>
                
                <div style={styles.progressBarBg}>
                  <div style={{...styles.progressBarFill, width: `${Math.min(100, Math.max(0, remainingPercent))}%`}}></div>
                </div>
                
                <div style={{ fontSize: "0.8rem", color: "#94a3b8", display: "flex", justifyContent: "space-between", marginTop: "10px" }}>
                  <span>{team.players.length} Players</span>
                  <span>Spent: ₹{(setup.maxBudget - team.budget).toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>

      {/* READ ONLY OVERLAY IF NO LOCK */}
      {!hasLock && (
        <div style={styles.overlayContainer}>
          <div className="glass-panel" style={styles.overlayCard}>
            <Lock size={48} color="#ef4444" style={{ marginBottom: "20px" }} />
            <h2 style={{ margin: "0 0 10px" }}>Auction Locked</h2>
            <p style={{ color: "#94a3b8", textAlign: "center", marginBottom: "20px", maxWidth: "300px" }}>
              Another organizer is currently managing changes. You are in View-Only mode.
            </p>
            <button className="btn-glass" onClick={() => window.location.reload()}>Refresh Status</button>
          </div>
        </div>
      )}

    </div>
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
    marginTop: "10px"
  },
  progressBarBg: {
    height: "6px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  progressBarFill: {
    height: "100%",
    background: "linear-gradient(90deg, #10b981, #34d399)",
    transition: "width 0.4s ease-out"
  },
  overlayContainer: {
    position: "absolute",
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
