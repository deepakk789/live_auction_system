import { useEffect, useState } from "react";
import { BACKEND_URL } from "../services/socket";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#eab308", "#8b5cf6"];

function Dashboard() {
  const [teams, setTeams] = useState([]);
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/sync`);
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
  }, []);

  if (loading) return <h2 style={{ textAlign: "center", marginTop: "40px", color: "white" }}>Loading Analytics...</h2>;

  /* ---------- DATA AGGREGATION ---------- */
  
  // 1. Budget Overview Data
  const budgetData = teams.map((t) => {
    const spent = t.players.reduce((sum, p) => sum + (p.price || 0), 0);
    return {
      name: t.name,
      Spent: spent,
      Remaining: t.budget
    };
  });

  // 2. Player Status Distribution
  const soldCount = players.filter(p => p.status === "SOLD").length;
  const unsoldCount = players.filter(p => p.status === "UNSOLD").length;
  const upcomingCount = players.filter(p => p.status === "UPCOMING" || p.status === "LIVE").length;
  
  const statusData = [
    { name: "SOLD", value: soldCount, color: "#16a34a" },
    { name: "UNSOLD", value: unsoldCount, color: "#f97316" },
    { name: "UPCOMING", value: upcomingCount, color: "#374151" }
  ].filter(d => d.value > 0);

  // 3. Top 5 Most Expensive Players
  const sortedPlayers = [...players]
    .filter(p => p.status === "SOLD" && p.soldPrice > 0)
    .sort((a, b) => b.soldPrice - a.soldPrice)
    .slice(0, 5);


  return (
    <div style={pageStyle}>
      <div style={headerStyle}>
        <h1>Auction Analytics Hub</h1>
        <button className="back-btn" onClick={() => navigate(-1)} style={backBtnStyle}>Go Back</button>
      </div>

      <div style={gridStyle}>
        
        {/* CARD 1: BUDGET CHART */}
        <div style={cardStyle}>
          <h2>Team Budgets Tracker</h2>
          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={budgetData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151"/>
                <XAxis dataKey="name" stroke="#d1d5db" />
                <YAxis stroke="#d1d5db" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", color: "white" }} />
                <Legend />
                <Bar dataKey="Spent" stackId="a" fill="#ef4444" radius={[0,0,4,4]} />
                <Bar dataKey="Remaining" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 2: PIE CHART */}
        <div style={cardStyle}>
          <h2>Player Auction Status</h2>
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
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "none", color: "white" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 3: TOP 5 PLAYERS */}
        <div style={{...cardStyle, gridColumn: "1 / -1"}}>
          <h2>Top Signings Hall of Fame</h2>
          {sortedPlayers.length === 0 ? (
            <p style={{ color: "#9ca3af" }}>No players sold yet.</p>
          ) : (
            <table style={tableStyle}>
              <thead>
                <tr style={{ borderBottom: "1px solid #374151", textAlign: "left" }}>
                  <th style={thStyle}>Rank</th>
                  <th style={thStyle}>Player Name</th>
                  <th style={thStyle}>Sold To</th>
                  <th style={thStyle}>Price</th>
                </tr>
              </thead>
              <tbody>
                {sortedPlayers.map((p, index) => (
                  <tr key={p.id || index} style={{ borderBottom: "1px solid #374151" }}>
                    <td style={tdStyle}>
                       {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`}
                    </td>
                    <td style={tdStyle}><strong>{p.name}</strong></td>
                    <td style={tdStyle}>{p.soldTo}</td>
                    <td style={{...tdStyle, color: "#facc15", fontWeight: "bold"}}>{p.soldPrice}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

      </div>
    </div>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0b132b",
  color: "white",
  padding: "40px"
};

const headerStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "30px"
};

const backBtnStyle = {
  padding: "10px 20px",
  background: "#374151",
  color: "white",
  border: "none",
  borderRadius: "8px",
  cursor: "pointer",
  fontWeight: "bold"
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
  gap: "20px"
};

const cardStyle = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "12px",
  padding: "25px",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)"
};

const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  marginTop: "10px"
};

const thStyle = {
  padding: "12px 15px",
  color: "#9ca3af"
};

const tdStyle = {
  padding: "12px 15px"
};

export default Dashboard;
