import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import { ArrowLeft, Trophy, Users, Wallet, Activity, Archive } from "lucide-react";

const COLORS = ["#16a34a", "#f97316", "#3b82f6", "#eab308", "#8b5cf6", "#ec4899"];

function AuctionAnalytics() {
  const { auctionId } = useParams();
  const navigate = useNavigate();

  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/${auctionId}/analytics`);
        if (!res.ok) throw new Error("Auction not found");
        const json = await res.json();
        setData(json);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, [auctionId]);

  if (loading) return (
    <div style={S.center}>
      <div style={S.spinner} />
      <p style={{ color: "#9ca3af", marginTop: "20px" }}>Loading analytics…</p>
    </div>
  );

  if (error) return (
    <div style={S.center}>
      <Archive size={52} color="#374151" style={{ marginBottom: "16px" }} />
      <h2 style={{ color: "#d1d5db" }}>Failed to load analytics</h2>
      <p style={{ color: "#6b7280" }}>{error}</p>
      <button style={S.backBtn} onClick={() => navigate("/past")}>
        ← Back to Past Auctions
      </button>
    </div>
  );

  const { teams = [], players = [] } = { teams: data.teamsState, players: data.playersState?.players || [] };

  /* ── DERIVED DATA ── */
  const budgetData = teams.map(t => {
    const spent = t.players.reduce((sum, p) => sum + (p.price || 0), 0);
    return { name: t.name, Spent: spent, Remaining: t.budget };
  });

  const soldCount     = players.filter(p => p.status === "SOLD").length;
  const unsoldCount   = players.filter(p => p.status === "UNSOLD").length;
  const upcomingCount = players.filter(p => !["SOLD","UNSOLD"].includes(p.status)).length;

  const statusData = [
    { name: "Sold",     value: soldCount,     color: "#16a34a" },
    { name: "Unsold",   value: unsoldCount,   color: "#f97316" },
    { name: "Remaining",value: upcomingCount, color: "#374151" }
  ].filter(d => d.value > 0);

  const topPlayers = [...players]
    .filter(p => p.status === "SOLD" && (p.soldPrice || 0) > 0)
    .sort((a, b) => b.soldPrice - a.soldPrice)
    .slice(0, 5);

  const totalSpend = teams.reduce((sum, t) =>
    sum + t.players.reduce((s, p) => s + (p.price || 0), 0), 0);

  const endedDate = data.endedAt
    ? new Date(data.endedAt).toLocaleDateString("en-IN", { day:"numeric",month:"long",year:"numeric" })
    : new Date(data.createdAt).toLocaleDateString("en-IN", { day:"numeric",month:"long",year:"numeric" });

  return (
    <div style={S.page} className="animate-fade-in">

      {/* ── Header ── */}
      <div style={S.header}>
        <div>
          <button style={S.backBtn} onClick={() => navigate("/past")}>
            <ArrowLeft size={16} style={{ marginRight: "6px" }} /> Back to Past Auctions
          </button>
          <h1 style={S.title}>{data.auctionName || "Auction"} — Analytics</h1>
          <p style={{ color: "#6b7280", marginTop: "6px", fontSize: "0.9rem" }}>
            Ended on {endedDate}
          </p>
        </div>
        <span style={S.endedBadge}>✓ ENDED</span>
      </div>

      {/* ── KPI Cards ── */}
      <div style={S.kpiRow}>
        <KpiCard icon={<Users size={22} color="#3b82f6"/>} label="Teams" value={teams.length} accent="#3b82f6" />
        <KpiCard icon={<Activity size={22} color="#10b981"/>} label="Players Sold" value={soldCount} accent="#10b981" />
        <KpiCard icon={<Activity size={22} color="#f97316"/>} label="Players Unsold" value={unsoldCount} accent="#f97316" />
        <KpiCard icon={<Wallet size={22} color="#eab308"/>} label="Total Spend" value={`₹${totalSpend.toLocaleString()}`} accent="#eab308" />
      </div>

      {/* ── Charts ── */}
      <div style={S.grid}>

        {/* Budget Bar */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Team Budget Overview</h2>
          <div style={{ height: 280 }}>
            <ResponsiveContainer>
              <BarChart data={budgetData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                <XAxis dataKey="name" stroke="#6b7280" tick={{ fontSize: 12 }} />
                <YAxis stroke="#6b7280" tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", color: "white", borderRadius:"8px" }} />
                <Legend wrapperStyle={{ color: "#9ca3af", fontSize:"12px" }} />
                <Bar dataKey="Spent"     stackId="a" fill="#ef4444" radius={[0,0,4,4]} />
                <Bar dataKey="Remaining" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status Pie */}
        <div style={S.card}>
          <h2 style={S.cardTitle}>Player Auction Status</h2>
          <div style={{ height: 280, display:"flex", justifyContent:"center" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%" cy="50%"
                  innerRadius={70} outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                  labelLine={{ stroke:"#4b5563" }}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor:"#1f2937", border:"1px solid #374151", color:"white", borderRadius:"8px" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Players */}
        <div style={{ ...S.card, gridColumn: "1 / -1" }}>
          <h2 style={S.cardTitle}>
            <Trophy size={18} color="#eab308" style={{ marginRight:"8px", verticalAlign:"middle" }} />
            Top Signings
          </h2>
          {topPlayers.length === 0 ? (
            <p style={{ color:"#6b7280" }}>No sold players recorded.</p>
          ) : (
            <table style={S.table}>
              <thead>
                <tr>
                  {["Rank","Player","Sold To","Price"].map(h => (
                    <th key={h} style={S.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topPlayers.map((p, i) => (
                  <tr key={i} style={S.tr}>
                    <td style={S.td}>{["🥇","🥈","🥉"][i] || `#${i+1}`}</td>
                    <td style={{ ...S.td, fontWeight: 700 }}>{p.name}</td>
                    <td style={S.td}>{p.soldTo}</td>
                    <td style={{ ...S.td, color:"#facc15", fontWeight:700 }}>₹{(p.soldPrice||0).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Per-Team Rosters */}
        {teams.length > 0 && (
          <div style={{ ...S.card, gridColumn: "1 / -1" }}>
            <h2 style={S.cardTitle}>Team Rosters</h2>
            <div style={S.rosterGrid}>
              {teams.map((team, idx) => {
                const spent = team.players.reduce((s, p) => s + (p.price||0), 0);
                return (
                  <div key={team.name} style={{ ...S.rosterCard, borderColor: COLORS[idx % COLORS.length] + "55" }}>
                    <div style={S.rosterHeader}>
                      <span style={{ fontWeight: 800, fontSize: "1rem", color: COLORS[idx % COLORS.length] }}>{team.name}</span>
                      <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>₹{team.budget.toLocaleString()} left</span>
                    </div>
                    <div style={S.rosterMeta}>
                      <span style={{ color:"#9ca3af", fontSize:"0.8rem" }}>{team.players.length} players · ₹{spent.toLocaleString()} spent</span>
                    </div>
                    {team.players.length === 0 ? (
                      <p style={{ color:"#4b5563", fontSize:"0.85rem", margin:"8px 0 0" }}>No players acquired.</p>
                    ) : (
                      <ul style={S.rosterList}>
                        {team.players.map((p, pi) => (
                          <li key={pi} style={S.rosterItem}>
                            <span>{p.name}</span>
                            <span style={{ color:"#facc15", fontSize:"0.8rem" }}>₹{(p.price||0).toLocaleString()}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

/* ── KPI Card ── */
function KpiCard({ icon, label, value, accent }) {
  return (
    <div style={{ ...S.kpiCard, borderColor: accent + "33" }}>
      <div style={{ ...S.kpiIcon, background: accent + "20" }}>{icon}</div>
      <div>
        <p style={{ margin:0, color:"#6b7280", fontSize:"0.8rem", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.5px" }}>{label}</p>
        <p style={{ margin:"4px 0 0", fontSize:"1.5rem", fontWeight:800, color:"#f9fafb" }}>{value}</p>
      </div>
    </div>
  );
}

/* ── Styles ── */
const S = {
  page: {
    padding: "40px 40px 60px",
    color: "white",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  center: {
    display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
    minHeight:"60vh", color:"white", textAlign:"center", padding:"40px"
  },
  spinner: {
    width:"44px", height:"44px",
    border:"3px solid rgba(255,255,255,0.1)",
    borderTopColor:"#8b5cf6",
    borderRadius:"50%", margin:"0 auto",
    animation:"spin 0.8s linear infinite"
  },
  header: {
    display:"flex", justifyContent:"space-between", alignItems:"flex-start",
    marginBottom:"32px", flexWrap:"wrap", gap:"16px"
  },
  title: {
    margin:"16px 0 0", fontSize:"2rem", fontWeight:800
  },
  backBtn: {
    background:"rgba(55,65,81,0.5)", border:"1px solid rgba(255,255,255,0.1)",
    color:"#9ca3af", padding:"8px 16px", borderRadius:"50px", cursor:"pointer",
    display:"inline-flex", alignItems:"center", fontSize:"0.85rem", transition:"all 0.2s"
  },
  endedBadge: {
    padding:"6px 16px", borderRadius:"50px", fontSize:"0.85rem",
    fontWeight:700, background:"rgba(139,92,246,0.15)",
    color:"#a78bfa", border:"1px solid #8b5cf6", alignSelf:"flex-start"
  },
  kpiRow: {
    display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px, 1fr))",
    gap:"16px", marginBottom:"28px"
  },
  kpiCard: {
    background:"rgba(17,24,39,0.7)", border:"1px solid",
    borderRadius:"14px", padding:"20px 22px",
    display:"flex", alignItems:"center", gap:"16px",
    backdropFilter:"blur(10px)", boxShadow:"0 4px 20px rgba(0,0,0,0.2)"
  },
  kpiIcon: {
    width:"48px", height:"48px", borderRadius:"12px",
    display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0
  },
  grid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(380px, 1fr))",
    gap:"24px"
  },
  card: {
    background:"rgba(17,24,39,0.7)", border:"1px solid rgba(255,255,255,0.08)",
    borderRadius:"16px", padding:"28px",
    backdropFilter:"blur(10px)", boxShadow:"0 4px 20px rgba(0,0,0,0.2)"
  },
  cardTitle: {
    margin:"0 0 20px", fontSize:"1.1rem", fontWeight:700,
    color:"#e5e7eb", display:"flex", alignItems:"center"
  },
  table: {
    width:"100%", borderCollapse:"collapse", marginTop:"8px"
  },
  th: {
    padding:"10px 14px", color:"#6b7280", fontSize:"0.8rem",
    textTransform:"uppercase", letterSpacing:"0.5px",
    textAlign:"left", borderBottom:"1px solid rgba(255,255,255,0.06)"
  },
  tr: {
    borderBottom:"1px solid rgba(255,255,255,0.04)"
  },
  td: {
    padding:"12px 14px", fontSize:"0.95rem", color:"#d1d5db"
  },
  rosterGrid: {
    display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(240px, 1fr))",
    gap:"16px", marginTop:"4px"
  },
  rosterCard: {
    background:"rgba(31,41,55,0.6)", border:"1px solid",
    borderRadius:"12px", padding:"16px"
  },
  rosterHeader: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    marginBottom:"4px"
  },
  rosterMeta: {
    borderBottom:"1px solid rgba(255,255,255,0.06)",
    paddingBottom:"10px", marginBottom:"10px"
  },
  rosterList: {
    listStyle:"none", margin:0, padding:0, display:"flex",
    flexDirection:"column", gap:"6px", maxHeight:"160px", overflowY:"auto"
  },
  rosterItem: {
    display:"flex", justifyContent:"space-between", alignItems:"center",
    color:"#9ca3af", fontSize:"0.85rem",
    padding:"4px 0", borderBottom:"1px solid rgba(255,255,255,0.04)"
  }
};

export default AuctionAnalytics;
