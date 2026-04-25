import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Lock, Unlock, Copy, Check, Users, ArrowRight } from "lucide-react";
import socket, { BACKEND_URL } from "../services/socket";
import PageTransition from "../components/PageTransition";
import SkeletonLoader from "../components/SkeletonLoader";

function OnlineLobby() {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [auction, setAuction] = useState(null);
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managerStatuses, setManagerStatuses] = useState({});
  const [hasLock, setHasLock] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // For assigning reps
  const [assigningTeam, setAssigningTeam] = useState(null);
  const [assignUsername, setAssignUsername] = useState("");

  const [copiedLink, setCopiedLink] = useState(null);

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
          socket.emit("organizer_lock_change", { auctionId, activeOrganizer: user._id });
        }
      } catch (err) {
        console.error(err);
      }
    };
    tryClaimLock();

    const fetchAuction = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
        if (!res.ok) throw new Error("Failed to fetch auction");
        const data = await res.json();
        
        setAuction(data);
        setTeams(data.teamsState || []);
        
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

    socket.emit("join_auction", { auctionId });

    socket.on("manager_status_change", ({ teamName, status }) => {
      setManagerStatuses(prev => ({ ...prev, [teamName]: status }));
    });

    socket.on("auction_state", (state) => {
      if (state === "LIVE") {
        navigate(`/organizer-online/${auctionId}`);
      }
    });

    return () => {
      socket.emit("leave_auction", { auctionId });
      socket.off("manager_status_change");
      socket.off("auction_state");
      
      const token = localStorage.getItem("authToken");
      if (token && hasLock) {
        fetch(`${BACKEND_URL}/api/auction/${auctionId}/release-lock`, {
          method: "POST",
          headers: { "Authorization": `Bearer ${token}` }
        }).catch(e => console.error(e));
      }
    };
  }, [auctionId, navigate]);

  const handleAssignRep = async (e) => {
    e.preventDefault();
    if (!assigningTeam) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/assign-rep`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ teamName: assigningTeam.name, username: assignUsername })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to assign");
      }

      setTeams(teams.map(t => t.name === assigningTeam.name ? { ...t, managerUsername: assignUsername } : t));
      setAssigningTeam(null);
      setAssignUsername("");
    } catch (err) {
      alert(err.message);
    }
  };

  const copyJoinLink = (teamName) => {
    // The join link goes to the viewer route, which then routes them to TeamRepDashboard if they are a manager
    const link = `${window.location.origin}/viewer/${auctionId}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(teamName);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const startAuction = () => {
    if (!hasLock) return;
    socket.emit("start_online_auction", { auctionId });
    // Navigation is handled by socket event listener
  };

  if (loading) {
    return (
      <PageTransition>
        <div style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
          <SkeletonLoader variant="card" count={2} />
        </div>
      </PageTransition>
    );
  }

  const allJoined = teams.every(t => t.managerUsername ? managerStatuses[t.name] === "Connected" : false);

  return (
    <PageTransition>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "40px" }}>
        
        {/* Header */}
        <motion.div className="glass-panel" style={{ padding: "20px 30px", marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center" }} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>Pre-Auction Lobby</h1>
            <p style={{ margin: "5px 0 0", color: "#94a3b8" }}>{auction?.auctionSetup?.auctionName} (ONLINE MODE)</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(16,185,129,0.1)", padding: "8px 16px", borderRadius: "50px", border: "1px solid rgba(16,185,129,0.3)", color: "#10b981", fontWeight: 600 }}>
            {hasLock ? <Lock size={16} /> : <Unlock size={16} color="#ef4444" />}
            {hasLock ? "Edit Access" : "Read Only"}
          </div>
        </motion.div>

        {/* Main Content */}
        <div style={{ maxWidth: "800px", margin: "0 auto", width: "100%" }}>
          <div className="glass-panel" style={{ padding: "40px", textAlign: "center", marginBottom: "30px" }}>
            <h2 style={{ fontSize: "2rem", marginBottom: "10px", color: "white" }}>Waiting for Team Representatives</h2>
            <p style={{ color: "#9ca3af", marginBottom: "40px" }}>
              Assign a username to each team. The representative must log in with that username and open the auction link to connect.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px", textAlign: "left", marginBottom: "40px" }}>
              {teams.map((team, idx) => {
                const isConnected = managerStatuses[team.name] === "Connected";
                return (
                  <div key={idx} className="glass-card" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "white" }}>{team.name}</div>
                      <div style={{ color: "#9ca3af", fontSize: "0.85rem", marginTop: "4px" }}>
                        Rep: <span style={{ color: team.managerUsername ? "#60a5fa" : "#ef4444", fontWeight: 600 }}>
                          {team.managerUsername || "Unassigned"}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                      {/* Status Indicator */}
                      {team.managerUsername && (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{
                            width: "10px", height: "10px", borderRadius: "50%",
                            background: isConnected ? "#10b981" : "#ef4444",
                            boxShadow: `0 0 8px ${isConnected ? "#10b981" : "#ef4444"}`
                          }}></span>
                          <span style={{ color: isConnected ? "#10b981" : "#ef4444", fontWeight: 600, fontSize: "0.85rem" }}>
                            {isConnected ? "Connected" : "Offline"}
                          </span>
                        </div>
                      )}

                      {/* Controls */}
                      {hasLock && (
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button 
                            className="btn-glass" 
                            style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            onClick={() => { setAssigningTeam(team); setAssignUsername(team.managerUsername || ""); }}
                          >
                            Assign Rep
                          </button>
                          <button 
                            className="btn-glass" 
                            style={{ padding: "6px 12px", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "4px" }}
                            onClick={() => copyJoinLink(team.name)}
                          >
                            {copiedLink === team.name ? <Check size={14} color="#10b981" /> : <Copy size={14} />} Link
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ display: "flex", justifyContent: "center" }}>
              <button 
                className="btn-premium" 
                onClick={startAuction}
                disabled={!hasLock || !allJoined}
                style={{ 
                  padding: "16px 32px", 
                  fontSize: "1.1rem", 
                  opacity: (!hasLock || !allJoined) ? 0.5 : 1, 
                  filter: (!hasLock || !allJoined) ? "grayscale(100%)" : "none" 
                }}
              >
                Start Auction <ArrowRight size={18} style={{ marginLeft: "8px" }} />
              </button>
            </div>
            {!allJoined && hasLock && (
              <p style={{ color: "#ef4444", marginTop: "16px", fontSize: "0.85rem" }}>
                Cannot start until all teams have an assigned rep and are connected (green).
              </p>
            )}
          </div>
        </div>

        {/* Assign Modal */}
        {assigningTeam && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, backdropFilter: "blur(5px)" }}>
            <motion.div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "30px" }} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
              <h3 style={{ margin: "0 0 20px" }}>Assign Rep for {assigningTeam.name}</h3>
              <form onSubmit={handleAssignRep}>
                <input 
                  type="text" 
                  placeholder="Username of the representative"
                  value={assignUsername}
                  onChange={(e) => setAssignUsername(e.target.value)}
                  className="input-premium"
                  style={{ width: "100%", boxSizing: "border-box", marginBottom: "20px" }}
                  autoFocus
                />
                <div style={{ display: "flex", gap: "10px" }}>
                  <button type="button" className="btn-glass" style={{ flex: 1 }} onClick={() => setAssigningTeam(null)}>Cancel</button>
                  <button type="submit" className="btn-premium" style={{ flex: 1 }}>Save</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

      </div>
    </PageTransition>
  );
}

export default OnlineLobby;
