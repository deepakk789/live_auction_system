import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import { Copy, Check, Shield, Users, Globe, UserPlus, X, AlertCircle, Home, Calendar, Zap, ArrowRight, CalendarDays } from "lucide-react";

const ErrorBanner = ({ message }) => {
  if (!message) return null;
  return (
    <div className="animate-fade-in" style={{
      display: "flex", alignItems: "center", gap: "12px",
      background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)",
      color: "#f87171", padding: "14px 20px", borderRadius: "8px",
      fontSize: "0.95rem", fontWeight: "500", marginTop: "10px", marginBottom: "20px",
      boxShadow: "0 4px 12px rgba(239, 68, 68, 0.1)"
    }}>
      <AlertCircle size={20} />
      {message}
    </div>
  );
};

function OrganizerSetup() {
  const navigate = useNavigate();

  // Wizard state
  const [step, setStep] = useState(1);

  // Form state
  const [auctionName, setAuctionName] = useState("");
  const [biddingMode, setBiddingMode] = useState("OFFLINE"); // "ONLINE" or "OFFLINE"
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState([{ name: "", managerUsername: "" }, { name: "", managerUsername: "" }]);
  const [maxBudget, setMaxBudget] = useState("");
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);

  // Post-creation state
  const [createdAuction, setCreatedAuction] = useState(null);
  const [copied, setCopied] = useState(false);
  const [coOrganizerId, setCoOrganizerId] = useState("");
  const [coOrganizersList, setCoOrganizersList] = useState([]);
  const [coOrgError, setCoOrgError] = useState("");

  const [loading, setLoading] = useState(false);
  const [stepError, setStepError] = useState("");

  // Schedule state
  const [auctionAction, setAuctionAction] = useState(null); // "live" or "schedule"
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

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
    const newTeams = Array(count).fill({ name: "", managerUsername: "" });
    for (let i = 0; i < Math.min(count, teams.length); i++) {
        newTeams[i] = teams[i];
    }
    setTeams(newTeams);
  };

  const handleNumBidOptionsChange = (e) => {
    const count = Number(e.target.value);
    const newBidSteps = [...bidSteps];
    while(newBidSteps.length < count) {
      newBidSteps.push(newBidSteps[newBidSteps.length - 1] ? newBidSteps[newBidSteps.length - 1] * 2 : 10);
    }
    setBidSteps(newBidSteps.slice(0, count));
  };
  
  const handleBidStepChange = (index, value) => {
     const updated = [...bidSteps];
     updated[index] = Number(value);
     setBidSteps(updated);
  };

  const handleTeamNameChange = (index, value) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], name: value };
    setTeams(updated);
  };

  const handleManagerUsernameChange = (index, value) => {
    const updated = [...teams];
    updated[index] = { ...updated[index], managerUsername: value };
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
  const validateStep2 = () => {
    return teams.every(t => {
      const isNameValid = t.name.trim().length > 0;
      const isManagerValid = biddingMode === "ONLINE" ? t.managerUsername.trim().length > 0 : true;
      return isNameValid && isManagerValid;
    });
  };
  const validateStep3 = () => maxBudget > 0;

  const nextStep1 = () => {
    if (!validateStep1()) {
      setStepError("Please enter the auction name. It is a required field.");
      return;
    }
    setStepError("");
    setStep(2);
  };

  const nextStep2 = () => {
    if (!validateStep2()) {
      setStepError("Please ensure all team names and manager usernames are entered.");
      return;
    }
    setStepError("");
    setStep(3);
  };

  const nextStep3 = async () => {
    if (!validateStep3()) {
      setStepError("Please enter a valid max budget greater than 0.");
      return;
    }
    setStepError("");
    await handleCreate();
  };

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
      teamsState: teams.map(t => ({ name: t.name, managerUsername: biddingMode === "ONLINE" ? t.managerUsername : null, budget: Number(maxBudget), players: [] }))
    };

    setLoading(true);

    if (biddingMode === "ONLINE") {
      for (const team of teams) {
        try {
          const checkRes = await fetch(`${BACKEND_URL}/api/auth/lookup-user`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({ username: team.managerUsername })
          });
          if (!checkRes.ok) {
            setLoading(false);
            return alert(`Manager username '${team.managerUsername}' for team '${team.name}' not found.`);
          }
        } catch (err) {
          setLoading(false);
          return alert(`Error validating manager for team '${team.name}'.`);
        }
      }
    }

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
                className="glass-card"
                style={{...styles.modeCard, ...(biddingMode === "OFFLINE" ? styles.modeCardActive : {})}}
                onClick={() => setBiddingMode("OFFLINE")}
              >
                <Shield size={32} color={biddingMode === "OFFLINE" ? "#3b82f6" : "#64748b"} />
                <h3 style={{ margin: "10px 0 5px" }}>Offline / Manual</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>You control the board and input all bids manually.</p>
                {biddingMode === "OFFLINE" && <div style={styles.activeCheck}><Check size={14}/></div>}
              </div>

              <div 
                className="glass-card"
                style={{...styles.modeCard, ...(biddingMode === "ONLINE" ? styles.modeCardActive : {})}}
                onClick={() => setBiddingMode("ONLINE")}
              >
                <Globe size={32} color={biddingMode === "ONLINE" ? "#3b82f6" : "#64748b"} />
                <h3 style={{ margin: "10px 0 5px" }}>Online / Remote</h3>
                <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Teams join via devices and submit realistic live bids.</p>
                {biddingMode === "ONLINE" && <div style={styles.activeCheck}><Check size={14}/></div>}
              </div>
            </div>

            <ErrorBanner message={stepError} />
            <div style={styles.btnWrapperRight}>
              <button className="btn-premium" onClick={nextStep1}>
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
                    value={team.name}
                    onChange={(e) => handleTeamNameChange(index, e.target.value)}
                  />
                  {biddingMode === "ONLINE" && (
                    <div style={{ marginTop: "10px" }}>
                      <label style={{...styles.label, fontSize: "0.8rem"}}>Manager Username</label>
                      <input
                        className="input-premium"
                        style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                        type="text"
                        placeholder={`Manager username`}
                        value={team.managerUsername}
                        onChange={(e) => handleManagerUsernameChange(index, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <ErrorBanner message={stepError} />
            <div style={styles.btnWrapperBetween}>
              <button className="btn-glass" onClick={() => { setStepError(""); setStep(1); }}>← Back</button>
              <button className="btn-premium" onClick={nextStep2}>
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
              <label style={styles.label}>Number of Quick-Bid Options ({bidSteps.length})</label>
              <input 
                type="range" 
                min="1" max="6" 
                value={bidSteps.length} 
                onChange={handleNumBidOptionsChange} 
                style={{ width: "100%", accentColor: "#3b82f6", marginBottom: "15px" }}
              />
              
              <label style={styles.label}>Set Bid Increments</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: "10px" }}>
                {bidSteps.map((stepVal, index) => (
                  <div key={index} style={{ position: "relative" }}>
                    <span style={{...styles.currencySymbol, color: "#10b981"}}>+</span>
                    <input
                      className="input-premium"
                      type="number"
                      value={stepVal || ""}
                      onChange={(e) => handleBidStepChange(index, e.target.value)}
                      style={{ paddingLeft: "30px", width: "100%", boxSizing: "border-box" }}
                      min="1"
                    />
                  </div>
                ))}
              </div>
              <p style={{ fontSize: "0.8rem", color: "#64748b", marginTop: "10px" }}>
                These generate the quick bid buttons on the live control panel.
              </p>
            </div>

            <ErrorBanner message={stepError} />
            <div style={styles.btnWrapperBetween}>
              <button className="btn-glass" onClick={() => { setStepError(""); setStep(2); }}>← Back</button>
              <button className="btn-premium" onClick={nextStep3} disabled={loading}>
                {loading ? "Creating..." : "Launch Auction 🚀"}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: SUCCESS & ACTION CHOICE */}
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
                <span className="auction-code-text" style={styles.codeText}>{createdAuction.auctionCode}</span>
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
            <div className="glass-card" style={styles.coOrgSection}>
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

            {/* ACTION CHOICE: Start Live vs Schedule */}
            {!auctionAction && !scheduleSuccess && (
              <div style={{ marginTop: "30px" }}>
                <p style={{ color: "#94a3b8", marginBottom: "20px", fontSize: "1.05rem" }}>What would you like to do next?</p>
                <div style={styles.modeGrid}>
                  <div 
                    className="glass-card"
                    style={{...styles.modeCard, cursor: "pointer"}}
                    onClick={() => setAuctionAction("live")}
                  >
                    <Zap size={36} color="#eab308" />
                    <h3 style={{ margin: "10px 0 5px" }}>Start Live</h3>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Upload players now and go live immediately.</p>
                  </div>

                  <div 
                    className="glass-card"
                    style={{...styles.modeCard, cursor: "pointer"}}
                    onClick={() => setAuctionAction("schedule")}
                  >
                    <CalendarDays size={36} color="#3b82f6" />
                    <h3 style={{ margin: "10px 0 5px" }}>Schedule Auction</h3>
                    <p style={{ fontSize: "0.85rem", color: "#94a3b8", margin: 0 }}>Set a future date and time for this auction.</p>
                  </div>
                </div>
              </div>
            )}

            {/* START LIVE path → Player Upload */}
            {auctionAction === "live" && (
              <div style={{ marginTop: "20px" }}>
                <button 
                  className="btn-premium" 
                  style={{ width: "100%", padding: "16px", fontSize: "1.1rem" }}
                  onClick={() => navigate(`/organizer/${createdAuction._id}/upload`)}
                >
                  Continue to Player Upload →
                </button>
                <button 
                  className="btn-glass" 
                  style={{ width: "100%", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onClick={() => setAuctionAction(null)}
                >
                  ← Back to options
                </button>
              </div>
            )}

            {/* SCHEDULE path → Date picker */}
            {auctionAction === "schedule" && !scheduleSuccess && (
              <div style={{ marginTop: "20px" }}>
                <div className="glass-card" style={{ padding: "25px", textAlign: "left" }}>
                  <label style={styles.label}>
                    <CalendarDays size={16} style={{ marginRight: "8px", verticalAlign: "middle" }} />
                    Select Date & Time
                  </label>
                  <input 
                    className="input-premium"
                    type="datetime-local"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().slice(0, 16)}
                    style={{ colorScheme: "dark" }}
                  />

                  <button 
                    className="btn-premium" 
                    style={{ width: "100%", padding: "14px", fontSize: "1rem", marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                    disabled={!scheduledDate || scheduleLoading}
                    onClick={async () => {
                      setScheduleLoading(true);
                      try {
                        const token = localStorage.getItem("authToken");
                        const res = await fetch(`${BACKEND_URL}/api/auction/${createdAuction._id}/schedule`, {
                          method: "POST",
                          headers: { 
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                          },
                          body: JSON.stringify({ scheduledDate })
                        });
                        if (!res.ok) throw new Error("Failed to schedule auction");
                        setScheduleSuccess(true);
                      } catch (err) {
                        alert(err.message);
                      } finally {
                        setScheduleLoading(false);
                      }
                    }}
                  >
                    {scheduleLoading ? <div className="spinner-small"></div> : <><Calendar size={18} /> Save & Schedule Auction</>}
                  </button>
                </div>
                <button 
                  className="btn-glass" 
                  style={{ width: "100%", marginTop: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onClick={() => setAuctionAction(null)}
                >
                  ← Back to options
                </button>
              </div>
            )}

            {/* SCHEDULE SUCCESS */}
            {scheduleSuccess && (
              <div className="glass-card animate-fade-in" style={{ padding: "30px", marginTop: "20px", textAlign: "center" }}>
                <div style={{ ...styles.successIconBox, margin: "0 auto 15px" }}>
                  <Check size={36} color="#10b981" />
                </div>
                <h3 style={{ color: "#10b981", marginBottom: "10px", fontSize: "1.4rem" }}>Auction Scheduled Successfully!</h3>
                <p style={{ color: "#94a3b8", marginBottom: "8px" }}>
                  Your auction <strong style={{ color: "#fff" }}>"{createdAuction.auctionName}"</strong> is scheduled for:
                </p>
                <p style={{ fontSize: "1.3rem", color: "#60a5fa", fontWeight: 700 }}>
                  {new Date(scheduledDate).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" })}
                </p>
                <p style={{ color: "#64748b", fontSize: "0.85rem", marginTop: "10px" }}>
                  This auction will appear in the Upcoming Auctions section.
                </p>
                <button 
                  className="btn-premium" 
                  style={{ width: "100%", padding: "14px", fontSize: "1rem", marginTop: "25px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                  onClick={() => navigate("/")}
                >
                  <Home size={18} /> Go to Home Page
                </button>
              </div>
            )}

            {/* Home button (always visible in step 4) */}
            {!scheduleSuccess && (
              <button 
                className="btn-glass" 
                style={{ width: "100%", marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
                onClick={() => navigate("/")}
              >
                <Home size={18} /> Back to Home
              </button>
            )}
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
