import { useNavigate } from "react-router-dom";
import { Zap, Activity, Users, ShieldCheck, Trophy, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/design-system.css";

function Home() {
  const navigate = useNavigate();
  const [showStamp, setShowStamp] = useState(false);
  const [stampFade, setStampFade] = useState(false);

  useEffect(() => {
    // Show SOLD stamp after a delay for wow effect
    const timer1 = setTimeout(() => setShowStamp(true), 1500);
    const timer2 = setTimeout(() => setStampFade(true), 3500);
    return () => { clearTimeout(timer1); clearTimeout(timer2); };
  }, []);

  return (
    <div style={styles.container} className="animate-fade-in">
      
      {/* Background Glow Orbs */}
      <div style={styles.glowOrbRight} />
      <div style={styles.glowOrbLeft} />

      {/* Hero Section */}
      <div style={styles.hero} className="stagger-1">
        <div style={styles.badge} className="pulse-glow">
          <Sparkles size={14} style={{ marginRight: '6px' }} />
          AuctionX 2.0 is Live
        </div>

        <h1 style={styles.title}>
          The Ultimate <br/>
          <span className="text-gradient">Auction Orchestration</span> Platform
        </h1>

        {/* SOLD stamp effect */}
        {showStamp && (
          <div className={`hero-sold-stamp ${stampFade ? "stamp-fade-out" : ""}`} style={{ zIndex: 10 }}>
            <span style={{ fontSize: '1.2rem', display: 'block', letterSpacing: '4px' }}>OFFICIALLY</span>
            SOLD!
          </div>
        )}

        <p style={styles.subtitle}>
          Seamlessly manage your players, teams, and live bids with our state-of-the-art interactive dashboard. Built for organizers, trusted by viewers. Now with Remote Live Bidding.
        </p>

        <div style={styles.btnRow}>
          <button className="btn-premium" style={{ padding: "18px 40px", fontSize: "1.2rem" }} onClick={() => navigate("/create-auction")}>
            Launch New Workspace ✨
          </button>
          <button className="btn-glass" style={{ padding: "18px 40px", fontSize: "1.2rem" }} onClick={() => navigate("/live")}>
            Join as Viewer →
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow} className="stagger-2">
        <div className="glass-card" style={styles.statItem}>
          <ShieldCheck size={32} color="#10b981" />
          <span style={styles.statNumber}>Dual</span>
          <span style={styles.statLabel}>Bidding Modes</span>
        </div>
        <div className="glass-card" style={styles.statItem}>
          <Zap size={32} color="#eab308" />
          <span style={styles.statNumber}>10ms</span>
          <span style={styles.statLabel}>WebSocket Sync Rate</span>
        </div>
        <div className="glass-card" style={styles.statItem}>
          <Users size={32} color="#3b82f6" />
          <span style={styles.statNumber}>Multi</span>
          <span style={styles.statLabel}>Organizer Access</span>
        </div>
      </div>

      {/* General Introduction Features */}
      <div style={styles.featuresGrid} className="stagger-3">
        <div className="glass-card" style={styles.featureCard}>
          <div style={styles.iconBox}><Activity size={24} color="#3b82f6" /></div>
          <h3 style={styles.cardTitle}>Live Analytics</h3>
          <p style={styles.cardText}>Track team budgets, see real-time player data, and manage your economy effortlessly during the auction.</p>
        </div>
        
        <div className="glass-card" style={styles.featureCard}>
          <div style={styles.iconBox}><Zap size={24} color="#eab308" /></div>
          <h3 style={styles.cardTitle}>Remote Online Bidding</h3>
          <p style={styles.cardText}>Allow teams to bid directly from their own devices in real-time, while organizers maintain full control of the podium.</p>
        </div>

        <div className="glass-card" style={styles.featureCard}>
          <div style={styles.iconBox}><Trophy size={24} color="#10b981" /></div>
          <h3 style={styles.cardTitle}>Co-Organizers</h3>
          <p style={styles.cardText}>Invite trusted members to manage the board with you. Our real-time locking system ensures only one admin edits at a time.</p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "60px",
    display: "flex",
    flexDirection: "column",
    gap: "80px",
    position: "relative",
    overflow: "hidden",
    minHeight: "calc(100vh - 60px)"
  },
  glowOrbRight: {
    position: "absolute",
    right: "-10%",
    top: "20%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, rgba(0,0,0,0) 70%)",
    zIndex: -1,
    animation: "float 6s ease-in-out infinite"
  },
  glowOrbLeft: {
    position: "absolute",
    left: "-10%",
    bottom: "10%",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.2) 0%, rgba(0,0,0,0) 70%)",
    zIndex: -1,
    animation: "float 8s ease-in-out infinite reverse"
  },
  hero: {
    textAlign: "center",
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "24px",
    position: "relative"
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    background: "rgba(59, 130, 246, 0.15)",
    color: "#60a5fa",
    padding: "8px 20px",
    borderRadius: "30px",
    fontWeight: "bold",
    fontSize: "0.95rem",
    border: "1px solid rgba(59, 130, 246, 0.3)",
    backdropFilter: "blur(4px)"
  },
  title: {
    fontSize: "4.5rem",
    lineHeight: "1.1",
    fontWeight: "900",
    margin: 0,
    letterSpacing: "-1px"
  },
  subtitle: {
    fontSize: "1.3rem",
    color: "#94a3b8",
    lineHeight: "1.6",
    maxWidth: "700px",
    marginTop: "10px"
  },
  btnRow: {
    display: "flex",
    gap: "20px",
    marginTop: "30px",
    flexWrap: "wrap",
    justifyContent: "center"
  },
  statsRow: {
    display: "flex",
    justifyContent: "center",
    gap: "30px",
    flexWrap: "wrap",
    marginTop: "20px"
  },
  statItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
    padding: "30px",
    minWidth: "220px",
    textAlign: "center"
  },
  statNumber: {
    fontSize: "2.2rem",
    fontWeight: 900,
    color: "white"
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: "0.95rem",
    fontWeight: 600,
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
    gap: "30px",
    maxWidth: "1200px",
    margin: "0 auto",
    width: "100%"
  },
  featureCard: {
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "15px"
  },
  iconBox: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
    border: "1px solid rgba(255,255,255,0.1)"
  },
  cardTitle: {
    fontSize: "1.5rem",
    margin: 0,
    fontWeight: "800",
    color: "white"
  },
  cardText: {
    color: "#94a3b8",
    lineHeight: "1.6",
    margin: 0,
    fontSize: "1.05rem"
  }
};

export default Home;
