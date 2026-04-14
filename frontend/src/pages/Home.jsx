import { useNavigate } from "react-router-dom";
import { Zap, Activity, Users } from "lucide-react";

function Home() {
  const navigate = useNavigate();

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Hero Section */}
      <div style={styles.hero}>
        <div style={styles.badge}>Welcome to the Future of Bidding</div>
        <h1 style={styles.title}>The Ultimate <br/> <span style={styles.highlight}>Auction Orchestration</span> Platform</h1>
        <p style={styles.subtitle}>
          Seamlessly manage your players, teams, and live bids with our state-of-the-art interactive dashboard. Built for organizers, trusted by viewers.
        </p>
        <button style={styles.primaryBtn} onClick={() => navigate("/create-auction")}>
          Launch New Auction 🚀
        </button>
      </div>

      {/* General Introduction Features */}
      <div style={styles.featuresGrid}>
        <div style={styles.featureCard}>
          <div style={styles.iconBox}><Activity size={24} color="#3b82f6" /></div>
          <h3 style={styles.cardTitle}>Live Analytics</h3>
          <p style={styles.cardText}>Track team budgets, see real-time player data, and manage your economy effortlessly during the auction.</p>
        </div>
        
        <div style={styles.featureCard}>
          <div style={styles.iconBox}><Zap size={24} color="#eab308" /></div>
          <h3 style={styles.cardTitle}>Instant Remote Sync</h3>
          <p style={styles.cardText}>Viewers around the world get instantaneous updates directly connected via WebSockets to the central organizer.</p>
        </div>

        <div style={styles.featureCard}>
          <div style={styles.iconBox}><Users size={24} color="#10b981" /></div>
          <h3 style={styles.cardTitle}>Team Management</h3>
          <p style={styles.cardText}>Create up to dozens of unique teams. Assign players permanently into squads with automatic budget calculation.</p>
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
    gap: "60px",
    color: "white"
  },
  hero: {
    textAlign: "center",
    maxWidth: "800px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "20px"
  },
  badge: {
    background: "rgba(59, 130, 246, 0.2)",
    color: "#60a5fa",
    padding: "6px 16px",
    borderRadius: "20px",
    fontWeight: "bold",
    fontSize: "0.9rem",
    border: "1px solid rgba(59, 130, 246, 0.3)"
  },
  title: {
    fontSize: "4rem",
    lineHeight: "1.2",
    fontWeight: "800",
    margin: 0
  },
  highlight: {
    background: "linear-gradient(to right, #3b82f6, #8b5cf6)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  subtitle: {
    fontSize: "1.2rem",
    color: "#9ca3af",
    lineHeight: "1.6",
    maxWidth: "600px"
  },
  primaryBtn: {
    background: "linear-gradient(135deg, #1d4ed8, #7e22ce)",
    color: "white",
    padding: "16px 32px",
    fontSize: "1.1rem",
    fontWeight: "bold",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    marginTop: "20px",
    boxShadow: "0 10px 25px rgba(126, 34, 206, 0.4)",
    transition: "transform 0.2s, box-shadow 0.2s"
  },
  featuresGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: "24px",
    marginTop: "40px"
  },
  featureCard: {
    background: "rgba(17, 24, 39, 0.6)",
    backdropFilter: "blur(10px)",
    border: "1px solid rgba(255,255,255,0.05)",
    borderRadius: "16px",
    padding: "30px",
    transition: "transform 0.3s"
  },
  iconBox: {
    width: "50px",
    height: "50px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "20px"
  },
  cardTitle: {
    fontSize: "1.3rem",
    marginBottom: "10px",
    fontWeight: "600"
  },
  cardText: {
    color: "#9ca3af",
    lineHeight: "1.5"
  }
};

export default Home;
