import { Archive } from "lucide-react";

function PastAuctions() {
  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>Past Auctions</h1>
        <p style={styles.subtitle}>Review history, player data, and finances from previous auctions.</p>
      </div>

      <div style={styles.emptyState}>
        <Archive size={48} color="#9ca3af" style={{ marginBottom: "20px" }} />
        <h2 style={{ color: "#d1d5db" }}>History is Empty</h2>
        <p style={{ color: "#6b7280", maxWidth: "400px", margin: "10px auto 25px" }}>
          You haven't completed any auctions yet. Finished auctions will be archived here for your records.
        </p>
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
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "16px",
    padding: "80px 20px",
    textAlign: "center"
  }
};

export default PastAuctions;
