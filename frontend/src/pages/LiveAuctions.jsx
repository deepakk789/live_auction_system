import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";

function LiveAuctions() {
  const navigate = useNavigate();

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>Live Auctions</h1>
        <p style={styles.subtitle}>View currently ongoing auctions across the platform.</p>
      </div>

      <div style={styles.emptyState}>
        <Activity size={48} color="#3b82f6" style={{ marginBottom: "20px" }} />
        <h2>No Active Auctions</h2>
        <p style={{ color: "#9ca3af", maxWidth: "400px", margin: "10px auto 25px" }}>
          There are currently no auctions running at this moment. You can start a new one to see it appear here.
        </p>
        <button 
          onClick={() => navigate("/create-auction")}
          style={styles.btn}
        >
          Create New Auction
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: "40px",
    color: "white"
  },
  header: {
    marginBottom: "40px"
  },
  title: {
    margin: 0,
    fontSize: "2.5rem"
  },
  subtitle: {
    color: "#9ca3af",
    fontSize: "1.1rem",
    marginTop: "10px"
  },
  emptyState: {
    background: "rgba(17, 24, 39, 0.4)",
    border: "1px dashed rgba(255,255,255,0.2)",
    borderRadius: "16px",
    padding: "60px 20px",
    textAlign: "center"
  },
  btn: {
    background: "#3b82f6",
    color: "white",
    border: "none",
    padding: "12px 24px",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: "bold",
    cursor: "pointer",
    transition: "background 0.2s"
  }
};

export default LiveAuctions;
