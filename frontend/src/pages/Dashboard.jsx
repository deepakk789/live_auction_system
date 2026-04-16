import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BACKEND_URL } from "../services/socket";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Trophy, BarChart3, PieChart as PieChartIcon, TrendingUp, Users, Wallet } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import AnimatedCounter from "../components/AnimatedCounter";
import SkeletonLoader from "../components/SkeletonLoader";
import PageTransition from "../components/PageTransition";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#eab308", "#8b5cf6"];

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 30, scale: 0.97 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20, stiffness: 200 } },
};

function Dashboard() {
  const { auctionId } = useParams();
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/sync`);
        if (!res.ok) throw new Error("Failed to fetch analytics");
        const data = await res.json();

        if (data.teamsState) setTeams(data.teamsState);
        if (data.playersState?.players) setPlayers(data.playersState.players);
      } catch (err) {
        console.error("Dashboard error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [auctionId]);

  if (loading) {
    return (
      <PageTransition>
        <div style={pageStyle}>
          <div style={headerStyle}>
            <h1 className="text-gradient">Auction Analytics Hub</h1>
          </div>
          <div style={gridStyle}>
            <SkeletonLoader variant="chart" count={1} />
            <SkeletonLoader variant="chart" count={1} />
          </div>
          <div style={{ marginTop: "20px" }}>
            <SkeletonLoader variant="card" count={1} />
          </div>
        </div>
      </PageTransition>
    );
  }

  /* ---------- DATA AGGREGATION ---------- */
  const budgetData = teams.map((t) => {
    const spent = t.players.reduce((sum, p) => sum + (p.price || 0), 0);
    return { name: t.name, Spent: spent, Remaining: t.budget };
  });

  const soldCount = players.filter(p => p.status === "SOLD").length;
  const unsoldCount = players.filter(p => p.status === "UNSOLD").length;
  const upcomingCount = players.filter(p => p.status === "UPCOMING" || p.status === "LIVE").length;

  const statusData = [
    { name: "SOLD", value: soldCount, color: "#16a34a" },
    { name: "UNSOLD", value: unsoldCount, color: "#f97316" },
    { name: "UPCOMING", value: upcomingCount, color: "#374151" }
  ].filter(d => d.value > 0);

  const sortedPlayers = [...players]
    .filter(p => p.status === "SOLD" && p.soldPrice > 0)
    .sort((a, b) => b.soldPrice - a.soldPrice)
    .slice(0, 5);

  const totalSpent = teams.reduce((s, t) => s + t.players.reduce((ps, p) => ps + (p.price || 0), 0), 0);
  const totalBudgetRemaining = teams.reduce((s, t) => s + t.budget, 0);

  return (
    <PageTransition>
      <div style={pageStyle}>

        {/* HEADER */}
        <motion.div style={headerStyle} initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <BarChart3 size={32} color="#3b82f6" />
            <h1 style={{ margin: 0 }}>Auction <span className="text-gradient">Analytics Hub</span></h1>
          </div>
          <motion.button
            className="btn-glass"
            onClick={() => navigate(-1)}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            style={{ display: "flex", alignItems: "center", gap: "8px" }}
          >
            <ArrowLeft size={18} /> Go Back
          </motion.button>
        </motion.div>

        {/* STAT CHIPS */}
        <motion.div
          style={statsRowStyle}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="glass-card" style={statChipStyle}>
            <Users size={22} color="#3b82f6" />
            <div style={statChipInner}>
              <span style={statLabelStyle}>Total Players</span>
              <AnimatedCounter value={players.length} fontSize="1.5rem" fontWeight="900" color="#f8fafc" />
            </div>
          </div>
          <div className="glass-card" style={statChipStyle}>
            <TrendingUp size={22} color="#ef4444" />
            <div style={statChipInner}>
              <span style={statLabelStyle}>Total Spent</span>
              <AnimatedCounter value={totalSpent} prefix="₹" fontSize="1.5rem" fontWeight="900" color="#f87171" highlight />
            </div>
          </div>
          <div className="glass-card" style={statChipStyle}>
            <Wallet size={22} color="#10b981" />
            <div style={statChipInner}>
              <span style={statLabelStyle}>Budget Left</span>
              <AnimatedCounter value={totalBudgetRemaining} prefix="₹" fontSize="1.5rem" fontWeight="900" color="#34d399" highlight />
            </div>
          </div>
          <div className="glass-card" style={statChipStyle}>
            <Trophy size={22} color="#f59e0b" />
            <div style={statChipInner}>
              <span style={statLabelStyle}>Sold</span>
              <AnimatedCounter value={soldCount} fontSize="1.5rem" fontWeight="900" color="#fbbf24" />
            </div>
          </div>
        </motion.div>

        {/* CHARTS GRID */}
        <motion.div style={gridStyle} variants={containerVariants} initial="hidden" animate="show">

          {/* BUDGET CHART */}
          <motion.div className="glass-panel" style={cardStyle} variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <BarChart3 size={20} color="#3b82f6" />
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Team Budgets Tracker</h2>
            </div>
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={budgetData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b"/>
                  <XAxis dataKey="name" stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <YAxis stroke="#64748b" tick={{ fill: "#94a3b8", fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white", backdropFilter: "blur(8px)" }} />
                  <Legend />
                  <Bar dataKey="Spent" stackId="a" fill="#ef4444" radius={[0,0,4,4]} />
                  <Bar dataKey="Remaining" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* PIE CHART */}
          <motion.div className="glass-panel" style={cardStyle} variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <PieChartIcon size={20} color="#8b5cf6" />
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Player Auction Status</h2>
            </div>
            <div style={{ width: "100%", height: 300, display: "flex", justifyContent: "center" }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "rgba(17,24,39,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", color: "white" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* TOP 5 PLAYERS */}
          <motion.div className="glass-panel" style={{...cardStyle, gridColumn: "1 / -1"}} variants={cardVariants} whileHover={{ y: -4, transition: { duration: 0.2 } }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <Trophy size={20} color="#f59e0b" />
              <h2 style={{ margin: 0, fontSize: "1.2rem" }}>Top Signings — Hall of Fame</h2>
            </div>
            {sortedPlayers.length === 0 ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "40px", color: "#4b5563", gap: "12px" }}>
                <Trophy size={40} color="#374151" />
                <p style={{ margin: 0, fontSize: "1rem" }}>No players sold yet. The hall awaits its legends.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {sortedPlayers.map((p, index) => (
                  <motion.div
                    key={p.id || index}
                    style={topPlayerRow}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.08 }}
                    whileHover={{ x: 6, backgroundColor: "rgba(255,255,255,0.05)", transition: { duration: 0.2 } }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                      <span style={{ fontSize: "1.5rem", width: "36px", textAlign: "center" }}>
                        {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                      </span>
                      <div>
                        <span style={{ fontWeight: 700, fontSize: "1.05rem" }}>{p.name}</span>
                        <span style={{ color: "#64748b", fontSize: "0.85rem", marginLeft: "12px" }}>→ {p.soldTo}</span>
                      </div>
                    </div>
                    <AnimatedCounter value={p.soldPrice} prefix="₹" fontSize="1.2rem" fontWeight="800" color="#fbbf24" highlight />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>

        </motion.div>
      </div>
    </PageTransition>
  );
}

/* ── STYLES ── */
const pageStyle = {
  maxWidth: "1400px",
  margin: "0 auto",
  color: "white",
  padding: "30px 40px 60px"
};
const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px"
};
const statsRowStyle = {
  display: "flex",
  justifyContent: "center",
  gap: "16px",
  flexWrap: "wrap",
  marginBottom: "30px",
};
const statChipStyle = {
  display: "flex",
  alignItems: "center",
  gap: "14px",
  padding: "16px 24px",
  minWidth: "180px",
};
const statChipInner = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};
const statLabelStyle = {
  fontSize: "0.7rem",
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "1px",
  fontWeight: 600,
};
const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "20px"
};
const cardStyle = {
  borderRadius: "20px",
  padding: "28px",
};
const topPlayerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 16px",
  borderRadius: "10px",
  background: "rgba(255,255,255,0.02)",
  border: "1px solid rgba(255,255,255,0.06)",
  cursor: "default",
};

export default Dashboard;
