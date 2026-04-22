import { useNavigate } from "react-router-dom";
import { Zap, Activity, Users, ShieldCheck, Trophy, Sparkles, Server, DollarSign, PlayCircle, FileText, CheckCircle, MessageSquare, Mail, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/design-system.css";
import PageTransition from "../components/PageTransition";
import BorderGlow from "../components/BorderGlow";

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
    <PageTransition>
    <div style={styles.container}>
      
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
          Seamlessly manage your players, teams, and live bids with our state-of-the-art interactive dashboard. Built for organizers, trusted by viewers.
        </p>

        <div style={styles.btnRow}>
          <button className="btn-premium" style={{ padding: "18px 40px", fontSize: "1.2rem" }} onClick={() => navigate("/create-auction")}>
            Organise an Auction ✨
          </button>
          <button className="btn-glass" style={{ padding: "18px 40px", fontSize: "1.2rem" }} onClick={() => navigate("/live")}>
            Join as Viewer →
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={styles.statsRow} className="stagger-2">
        <BorderGlow className="glass-card feature-card-hover" style={styles.statItem} animated={true} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
          <ShieldCheck size={32} color="#10b981" />
          <span style={styles.statNumber}>Dual</span>
          <span style={styles.statLabel}>Bidding Modes</span>
        </BorderGlow>
        <BorderGlow className="glass-card feature-card-hover" style={styles.statItem} animated={true} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
          <Zap size={32} color="#eab308" />
          <span style={styles.statNumber}>10ms</span>
          <span style={styles.statLabel}>WebSocket Sync Rate</span>
        </BorderGlow>
        <BorderGlow className="glass-card feature-card-hover" style={styles.statItem} animated={true} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
          <Users size={32} color="#3b82f6" />
          <span style={styles.statNumber}>Multi</span>
          <span style={styles.statLabel}>Organizer Access</span>
        </BorderGlow>
      </div>

      {/* Services Provided Section */}
      <div className="stagger-3" style={{ textAlign: "center", marginTop: "60px" }}>
        <h2 style={{ fontSize: "2.8rem", fontWeight: 900, marginBottom: "15px", letterSpacing: "-1px" }}>Professional Services</h2>
        <p style={{ color: "#94a3b8", fontSize: "1.15rem", maxWidth: "650px", margin: "0 auto 50px", lineHeight: "1.6" }}>
          Everything you need to host a broadcast-quality auction event, packed into an intuitive platform for organizers and bidders alike.
        </p>
        
        <div style={styles.featuresGrid}>
          {/* Card 1 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><Activity size={24} color="#3b82f6" /></div>
            <h3 style={styles.cardTitle}>Live Economic Analytics</h3>
            <p style={styles.cardText}>Track team budgets, see real-time player data, and manage your economy effortlessly as the auction progresses.</p>
          </BorderGlow>
          
          {/* Card 2 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><Zap size={24} color="#eab308" /></div>
            <h3 style={styles.cardTitle}>Remote Online Bidding</h3>
            <p style={styles.cardText}>Allow teams to bid directly from their mobile devices with zero latency. Fast, secure, and globally synced over WebSockets.</p>
          </BorderGlow>

          {/* Card 3 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><Trophy size={24} color="#10b981" /></div>
            <h3 style={styles.cardTitle}>Co-Organizer Delegation</h3>
            <p style={styles.cardText}>Invite trusted members to manage the board with you. Our real-time locking system ensures only one admin edits the podium at a time.</p>
          </BorderGlow>

          {/* Card 4 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><DollarSign size={24} color="#ec4899" /></div>
            <h3 style={styles.cardTitle}>Automated Failsafes</h3>
            <p style={styles.cardText}>Smart constraints actively monitor team purses, automatically blocking bids that exceed maximum allowed budgets instantly.</p>
          </BorderGlow>

          {/* Card 5 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><Server size={24} color="#8b5cf6" /></div>
            <h3 style={styles.cardTitle}>Persistent Cloud Data</h3>
            <p style={styles.cardText}>Powered by MongoDB, your auction state is continuously saved. Accidental server restarts or browser crashes? Recover instantly.</p>
          </BorderGlow>

          {/* Card 6 */}
          <BorderGlow className="glass-card feature-card-hover" style={styles.featureCard} animated={false} backgroundColor="transparent" fillOpacity={0} borderRadius={24}>
            <div style={styles.iconBox}><PlayCircle size={24} color="#f97316" /></div>
            <h3 style={styles.cardTitle}>Broadcast-Ready Interface</h3>
            <p style={styles.cardText}>Dedicated spectator views ensure audiences and managers receive beautiful, distraction-free visual updates as the action unfolds.</p>
          </BorderGlow>
        </div>
      </div>

      {/* How it works Section */}
      <div className="stagger-4" style={styles.howItWorksBox}>
        <div style={{ textAlign: "center", marginBottom: "50px" }}>
          <h2 style={{ fontSize: "2.8rem", fontWeight: 900, marginBottom: "15px", letterSpacing: "-1px" }}>From Setup to <span className="text-gradient-success">Sold</span></h2>
          <p style={{ color: "#94a3b8", fontSize: "1.15rem", maxWidth: "600px", margin: "0 auto", lineHeight: "1.6" }}>
            A fast overview of how the auction orchestrates from start to finish, empowering organizers with maximum control.
          </p>
        </div>

        <div style={styles.timelineGrid}>
          {/* Step 1 */}
          <div style={styles.stepCard} className="glass-card feature-card-hover">
            <div style={styles.stepNumber}>1</div>
            <Settings size={36} color="#3b82f6" style={{ marginBottom: "20px" }} />
            <h4 style={styles.stepTitle}>Configure Rules</h4>
            <p style={styles.stepDesc}>The organizer sets the number of teams, maximum starting budgets, and decides between Manual or Online bidding.</p>
          </div>
          {/* Step 2 */}
          <div style={styles.stepCard} className="glass-card feature-card-hover">
            <div style={styles.stepNumber}>2</div>
            <FileText size={36} color="#8b5cf6" style={{ marginBottom: "20px" }} />
            <h4 style={styles.stepTitle}>Build Roster</h4>
            <p style={styles.stepDesc}>Populate the player pool effortlessly. Upload names and base prices directly into the upcoming platform queue.</p>
          </div>
          {/* Step 3 */}
          <div style={styles.stepCard} className="glass-card feature-card-hover">
            <div style={styles.stepNumber}>3</div>
            <Zap size={36} color="#eab308" style={{ marginBottom: "20px" }} />
            <h4 style={styles.stepTitle}>Run the Podium</h4>
            <p style={styles.stepDesc}>Go Live! A player is brought up. Teams aggressively bid using connected devices until the highest bid is legally locked.</p>
          </div>
          {/* Step 4 */}
          <div style={styles.stepCard} className="glass-card feature-card-hover">
            <div style={styles.stepNumber}>4</div>
            <CheckCircle size={36} color="#10b981" style={{ marginBottom: "20px" }} />
            <h4 style={styles.stepTitle}>Transfer & Archive</h4>
            <p style={styles.stepDesc}>The organizer drops the hammer. The player is marked SOLD, budget is safely deducted, and real-time ledgers are instantly archived.</p>
          </div>
        </div>
      </div>

      {/* About & Contact Section */}
      <div className="stagger-4" style={styles.footerLayout}>
        <div style={styles.footerSection}>
          <h3 style={{ fontSize: "1.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", marginBottom: "20px" }}>
            <Sparkles size={22} color="#3b82f6"/> About AuctionX
          </h3>
          <p style={{ color: "#94a3b8", lineHeight: "1.7", fontSize: "1.05rem" }}>
            AuctionX is crafted for tech enthusiasts and event managers seeking to revolutionize how sports drafts, corporate bidding, and professional auctions are hosted. We blend broadcast-quality design with ultra-low latency technology to guarantee an unforgettable experience.
          </p>
        </div>

        <div style={styles.footerSection}>
          <h3 style={{ fontSize: "1.5rem", color: "#fff", display: "flex", alignItems: "center", gap: "10px", fontWeight: "900", marginBottom: "20px" }}>
            <MessageSquare size={22} color="#10b981"/> Contact & Support
          </h3>
          <p style={{ color: "#94a3b8", lineHeight: "1.7", fontSize: "1.05rem", marginBottom: "20px" }}>
            Need help configuring a custom event or facing access issues? Contact our engineering team.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <a href="mailto:support@auctionx.com" style={styles.contactLink}><Mail size={18}/> support@auctionx.com</a>
          </div>
        </div>
      </div>
      
      {/* Absolute Bottom Footer text */}
      <div style={{ textAlign: "center", color: "#475569", padding: "30px 0 10px", marginTop: "30px", borderTop: "1px solid rgba(255,255,255,0.05)"}}>
        <p style={{ fontWeight: 600 }}>&copy; {new Date().getFullYear()} AuctionX Orchestration. All rights reserved.</p>
      </div>

    </div>
    </PageTransition>
  );
}

const styles = {
  container: {
    padding: "60px 40px",
    display: "flex",
    flexDirection: "column",
    gap: "80px",
    position: "relative",
    overflow: "hidden",
    minHeight: "calc(100vh - 60px)",
    maxWidth: "1400px",
    margin: "0 auto"
  },
  glowOrbRight: {
    position: "absolute",
    right: "-10%",
    top: "20%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, rgba(0,0,0,0) 70%)",
    zIndex: -1,
    animation: "float 6s ease-in-out infinite"
  },
  glowOrbLeft: {
    position: "absolute",
    left: "-10%",
    bottom: "20%",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, rgba(0,0,0,0) 70%)",
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
    fontSize: "4.8rem",
    lineHeight: "1.1",
    fontWeight: "900",
    margin: 0,
    letterSpacing: "-1.5px"
  },
  subtitle: {
    fontSize: "1.3rem",
    color: "#94a3b8",
    lineHeight: "1.6",
    maxWidth: "750px",
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
    fontSize: "2.5rem",
    fontWeight: 900,
    color: "white"
  },
  statLabel: {
    color: "#9ca3af",
    fontSize: "0.95rem",
    fontWeight: 700,
    textTransform: "uppercase",
    letterSpacing: "1px"
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
    gap: "30px",
    width: "100%"
  },
  featureCard: {
    padding: "40px",
    display: "flex",
    flexDirection: "column",
    gap: "15px",
    textAlign: "left"
  },
  iconBox: {
    width: "60px",
    height: "60px",
    borderRadius: "16px",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "15px",
    border: "1px solid rgba(255,255,255,0.1)",
    boxShadow: "inset 0 0 15px rgba(255,255,255,0.02)"
  },
  cardTitle: {
    fontSize: "1.5rem",
    margin: 0,
    fontWeight: "800",
    color: "white"
  },
  cardText: {
    color: "#94a3b8",
    lineHeight: "1.7",
    margin: 0,
    fontSize: "1.05rem"
  },
  howItWorksBox: {
    background: "rgba(15, 23, 42, 0.4)",
    borderRadius: "32px",
    padding: "80px 60px",
    border: "1px solid rgba(255,255,255,0.05)",
    boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
  },
  timelineGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "25px",
    position: "relative"
  },
  stepCard: {
    padding: "40px 30px",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    overflow: "hidden"
  },
  stepNumber: {
    position: "absolute",
    top: "-20px",
    right: "-10px",
    fontSize: "8rem",
    fontWeight: 900,
    color: "rgba(255,255,255,0.03)",
    lineHeight: 1,
    zIndex: 0
  },
  stepTitle: {
    fontSize: "1.4rem",
    fontWeight: 800,
    color: "#fff",
    margin: "0 0 15px",
    zIndex: 1
  },
  stepDesc: {
    color: "#94a3b8",
    lineHeight: "1.6",
    fontSize: "1rem",
    margin: 0,
    zIndex: 1
  },
  footerLayout: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "50px",
    background: "rgba(17, 24, 39, 0.3)",
    padding: "60px",
    borderRadius: "24px",
    border: "1px solid rgba(255,255,255,0.05)"
  },
  footerSection: {
    display: "flex",
    flexDirection: "column"
  },
  contactLink: {
    color: "#3b82f6",
    textDecoration: "none",
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    transition: "color 0.2s",
    padding: "10px 15px",
    background: "rgba(59, 130, 246, 0.1)",
    borderRadius: "8px",
    width: "fit-content"
  }
};

export default Home;
