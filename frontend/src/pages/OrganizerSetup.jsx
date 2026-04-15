import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import { Copy, Check, Shield, Users, Globe, UserPlus, X } from "lucide-react";

function OrganizerSetup() {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);

  // Form state
  const [auctionName, setAuctionName] = useState("");
  const [biddingMode, setBiddingMode] = useState("OFFLINE"); // "ONLINE" or "OFFLINE"
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState(["", ""]);
  const [maxBudget, setMaxBudget] = useState("");
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);

  // Post-creation state
  const [createdAuction, setCreatedAuction] = useState(null);
  const [copied, setCopied] = useState(false);
  const [coOrganizerId, setCoOrganizerId] = useState("");
  const [coOrganizersList, setCoOrganizersList] = useState([]);
  const [coOrgError, setCoOrgError] = useState("");

  const [loading, setLoading] = useState(false);

  // Auth check — redirect if not logged in
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      alert("Please sign in to create an auction.");
      navigate("/login");
    }
  }, [navigate]);

  const handleTeamCountChange = (e) => {
    const count = Number(e.target.value);
    setTeamCount(count);
    const newTeams = Array(count).fill("");
    for (let i = 0; i < Math.min(count, teams.length); i++) {
        newTeams[i] = teams[i];
    }
    setTeams(newTeams);
  };

  const handleTeamNameChange = (index, value) => {
    const updated = [...teams];
    updated[index] = value;
    setTeams(updated);
  };

  const copyCode = () => {
    if (createdAuction?.auctionCode) {
      navigator.clipboard.writeText(createdAuction.auctionCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const validateStep1 = () => auctionName.trim().length > 0;
  const validateStep2 = () => teams.every(t => t.trim().length > 0);
  const validateStep3 = () => maxBudget > 0;

  const handleCreate = async () => {
    const token = localStorage.getItem("authToken");
    const payload = {
      auctionSetup: {
        auctionName,
        teamCount,
        maxBudget: Number(maxBudget),
        bidSteps,
        biddingMode
      },
      teamsState: teams.map(t => ({ name: t, budget: Number(maxBudget), players: [] }))
    };

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auction/init`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Failed to initialize auction");
      const data = await res.json();
      setCreatedAuction(data.auction);
      setStep(4); // Success step
    } catch (err) {
      console.error(err);
      alert("Error starting auction");
    } finally {
      setLoading(false);
    }
  };

  const handleAddCoOrganizer = async () => {
    if (!coOrganizerId) return;
    
    setCoOrgError("");
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/auction/${createdAuction._id}/co-organizer`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ identifier: coOrganizerId })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to add co-organizer");
      
      setCoOrganizersList([...coOrganizersList, data.user]);
      setCoOrganizerId("");
    } catch (err) {
      setCoOrgError(err.message);
    }
  };

  const handleRemoveCoOrganizer = async (userId) => {
    const token = localStorage.getItem("authToken");
    try {
      const res = await fetch(`${BACKEND_URL}/api/auction/${createdAuction._id}/co-organizer/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setCoOrganizersList(coOrganizersList.filter(u => u._id !== userId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={styles.pageContainer} className="animate-fade-in">
      
      <div className="glass-panel" style={styles.wizardContainer}>
        
        {/* PROGRESS INDICATOR */}
        {step < 4 && (
          <div style={styles.progressHeader}>
            <div style={styles.progressLine}>
              <div style={{...styles.progressFill, width: `${((step - 1) / 2) * 100}%`}}></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
              <span style={{ color: step >= 1 ? '#3b82f6' : '#64748b' }}>Basics</span>
              <span style={{ color: step >= 2 ? '#3b82f6' : '#64748b' }}>Teams</span>
              <span style={{ color: step >= 3 ? '#3b82f6' : '#64748b' }}>Budget</span>
            </div>
          </div>
        )}

        {/* STEP 1: BASICS */}
        {step === 1 && (
          <div className="stagger-1">
            <h2 style={styles.stepTitle}>Auction Basics</h2>
            <p style={styles.stepSubtitle}>Let's start by naming your auction and selecting how you want to bid.</p>
            
            <div style={{ marginBottom: "24px" }}>
              <label style={styles.label}>Auction Name</label>
              <input 
                className="input-premium"
                type="text" 
                placeholder="e.g. IPL 2026 Mega Auction"
                value={auctionName}
                onChange={e => setAuctionName(e.target.value)}
              />
            </div>

            <label style={styles.label}>Bidding Mode</label>
            <div style={styles.modeGrid}>
              <div 
                style={{...styles.modeCard, ...(biddingMode === "OFFLINE" ? styles.modeCardActive : {})}}
                onClick={() => setBiddingMode("OFFLINE")}
              >
                <Shield size={32} color={biddingMode === "OFFLINE" ? "#3b82f6" : "#64748b"} />
                <h3 style={{ margin: "10px 0 5px" }}>Offline / Manual</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>You control the board and input all bids manually.</p>
                {biddingMode === "OFFLINE" && <div style={styles.activeCheck}><Check size={14}/></div>}
              </div>

              <div 
                style={{...styles.modeCard, ...(biddingMode === "ONLINE" ? styles.modeCardActive : {})}}
                onClick={() => setBiddingMode("ONLINE")}
              >
                <Globe size={32} color={biddingMode === "ONLINE" ? "#3b82f6" : "#64748b"} />
                <h3 style={{ margin: "10px 0 5px" }}>Online / Remote</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Teams join via devices and submit realistic live bids.</p>
                {biddingMode === "ONLINE" && <div style={styles.activeCheck}><Check size={14}/></div>}
              </div>
            </div>

            <div style={styles.btnWrapperRight}>
              <button className="btn-premium" disabled={!validateStep1()} onClick={() => setStep(2)}>
                Next: Configure Teams →
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: TEAMS */}
        {step === 2 && (
          <div className="stagger-1">
            <h2 style={styles.stepTitle}>Configure Teams</h2>
            <p style={styles.stepSubtitle}>How many teams are participating in this auction?</p>

            <div style={{ marginBottom: "24px" }}>
              <label style={styles.label}>Number of Teams ({teamCount})</label>
              <input 
                type="range" 
                min="2" max="15" 
                value={teamCount} 
                onChange={handleTeamCountChange} 
                style={{ width: "100%", accentColor: "#3b82f6" }}
              />
            </div>

            <div style={styles.teamInputsGrid}>
              {teams.map((team, index) => (
                <div key={index} className="glass-card" style={{ padding: "15px" }}>
                  <label style={{...styles.label, fontSize: "0.8rem"}}>Team {index + 1} Name</label>
                  <input
                    className="input-premium"
                    type="text"
                    placeholder={`e.g. Mumbai Indians`}
                    value={team}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                  />
                </div>
              ))}
            </div>

            <div style={styles.btnWrapperBetween}>
              <button className="btn-glass" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-premium" disabled={!validateStep2()} onClick={() => setStep(3)}>
                Next: Budget Details →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BUDGET */}
        {step === 3 && (
          <div className="stagger-1">
            <h2 style={styles.stepTitle}>Budget & Currency</h2>
            <p style={styles.stepSubtitle}>Set the max budget per team and the default bidding increments.</p>

            <div style={{ marginBottom: "24px" }}>
              <label style={styles.label}>Max Budget per Team</label>
              <div style={{ position: "relative" }}>
                <span style={styles.currencySymbol}>₹</span>
                <input
                  className="input-premium"
                  type="number"
                  placeholder="e.g. 1000"
                  value={maxBudget}
                  onChange={(e) => setMaxBudget(e.target.value)}
                  style={{ paddingLeft: "35px" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <label style={styles.label}>Bid Increments (comma separated)</label>
              <input
                className="input-premium"
                type="text"
                value={bidSteps.join(", ")}
                onChange={(e) => {
                  const arr = e.target.value.split(",").map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
                  setBidSteps(arr);
                }}
              />
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "5px" }}>
                These generate the quick-bid buttons (+10, +20, etc).
              </p>
            </div>

            <div style={styles.btnWrapperBetween}>
              <button className="btn-glass" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-premium" disabled={!validateStep3() || loading} onClick={handleCreate}>
                {loading ? "Creating..." : "Launch Auction 🚀"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS & INVITES */}
        {step === 4 && createdAuction && (
          <div className="stagger-1" style={{ textAlign: "center" }}>
            
            <div style={styles.successIconBox}>
              <Check size={40} color="#10b981" />
            </div>
            
            <h2 style={{ fontSize: "2rem", marginBottom: "10px" }}>Auction Created!</h2>
            <p style={{ color: "#94a3b8", marginBottom: "30px" }}>Your workspace is ready. Invite participants or configure settings.</p>

            {/* Code Box */}
            <div className="glass-card" style={styles.codePanel}>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", letterSpacing: "1px", textTransform: "uppercase" }}>
                Auction Join Code
              </p>
              <div style={styles.codeRow}>
                <span style={styles.codeText}>{createdAuction.auctionCode}</span>
                <button 
                  onClick={copyCode} 
                  style={{...styles.copyBtn, background: copied ? "#10b981" : "rgba(255,255,255,0.1)"}}
                >
                  {copied ? <Check size={18} color="white"/> : <Copy size={18} color="white"/>}
                </button>
              </div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", margin: "10px 0 0" }}>
                Share this with viewers{biddingMode === "ONLINE" && " and team reps"} to join.
              </p>
            </div>

            {/* Co-Organizers */}
            <div style={styles.coOrgSection}>
              <h3 style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", margin: "0 0 15px" }}>
                <Users size={20} color="#3b82f6" /> Add Co-Organizers
              </h3>
              <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginBottom: "20px" }}>
                Allow up to 3 trusted members to manage the board with you. Only one organizer can make edits at a time.
              </p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <input 
                  className="input-premium" 
                  style={{ flex: 1 }}
                  placeholder="Enter username or email..."
                  value={coOrganizerId}
                  onChange={e => setCoOrganizerId(e.target.value)}
                  disabled={coOrganizersList.length >= 3}
                />
                <button 
                  className="btn-premium" 
                  style={{ padding: "0 20px" }}
                  onClick={handleAddCoOrganizer}
                  disabled={coOrganizersList.length >= 3 || !coOrganizerId}
                >
                  <UserPlus size={18}/>
                </button>
              </div>
              {coOrgError && <p style={{ color: "#ef4444", fontSize: "0.8rem", textAlign: "left" }}>{coOrgError}</p>}

              {coOrganizersList.length > 0 && (
                <div style={styles.coOrgList}>
                  {coOrganizersList.map(u => (
                    <div key={u._id} style={styles.coOrgItem}>
                      <span style={{ fontWeight: 600 }}>{u.username}</span>
                      <button style={styles.removeBtn} onClick={() => handleRemoveCoOrganizer(u._id)}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button 
              className="btn-premium" 
              style={{ width: "100%", padding: "16px", fontSize: "1.1rem", marginTop: "20px" }}
              onClick={() => navigate(`/organizer/${createdAuction._id}/upload`)}
            >
              Continue to Player Upload →
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px",
  },
  wizardContainer: {
    width: "100%",
    maxWidth: "600px",
    padding: "40px",
  },
  progressHeader: {
    marginBottom: "40px"
  },
  progressLine: {
    height: "6px",
    background: "rgba(255,255,255,0.1)",
    borderRadius: "3px",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
    transition: "width 0.4s ease-out"
  },
  stepTitle: {
    fontSize: "2rem",
    fontWeight: 800,
    margin: "0 0 10px"
  },
  stepSubtitle: {
    color: "#94a3b8",
    marginBottom: "30px",
    lineHeight: "1.5"
  },
  label: {
    display: "block",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#cbd5e1",
    marginBottom: "8px"
  },
  modeGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "30px"
  },
  modeCard: {
    background: "rgba(15, 23, 42, 0.4)",
    border: "2px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "20px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    position: "relative",
    textAlign: "center"
  },
  modeCardActive: {
    background: "rgba(59, 130, 246, 0.1)",
    borderColor: "#3b82f6",
    boxShadow: "0 4px 20px rgba(59, 130, 246, 0.2)"
  },
  activeCheck: {
    position: "absolute",
    top: "-10px",
    right: "-10px",
    background: "#3b82f6",
    color: "white",
    width: "24px",
    height: "24px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
  },
  btnWrapperRight: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "40px"
  },
  btnWrapperBetween: {
    display: "flex",
    justifyContent: "space-between",
    marginTop: "40px"
  },
  teamInputsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "15px",
    maxHeight: "350px",
    overflowY: "auto",
    padding: "5px"
  },
  currencySymbol: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#94a3b8",
    fontWeight: "bold"
  },
  successIconBox: {
    width: "80px",
    height: "80px",
    background: "rgba(16, 185, 129, 0.1)",
    border: "2px solid #10b981",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px",
    boxShadow: "0 0 30px rgba(16, 185, 129, 0.2)"
  },
  codePanel: {
    background: "linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,41,59,0.8))",
    padding: "30px",
    textAlign: "center",
    marginBottom: "30px"
  },
  codeRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "15px",
    marginTop: "10px"
  },
  codeText: {
    fontSize: "3rem",
    fontWeight: 900,
    letterSpacing: "6px",
    color: "#60a5fa",
    fontFamily: "monospace"
  },
  copyBtn: {
    border: "none",
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  coOrgSection: {
    background: "rgba(15,23,42,0.5)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "left"
  },
  coOrgList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px"
  },
  coOrgItem: {
    background: "rgba(255,255,255,0.05)",
    padding: "10px 16px",
    borderRadius: "8px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  removeBtn: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "none",
    color: "#ef4444",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer"
  }
};

export default OrganizerSetup;
