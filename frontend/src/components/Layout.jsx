import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Archive, Plus, Shield, LogOut, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import socket, { BACKEND_URL } from "../services/socket";
import "../styles/layout.css";
import "../styles/design-system.css";

function Layout() {
  const navigate = useNavigate();
  const [liveAuctionCount, setLiveAuctionCount] = useState(0);
  
  // Auth State
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Validate session — auto-login if token is valid
    const validateSession = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          // Token invalid/expired — clear
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          setUser(null);
        }
      } catch (err) {
        console.error("Session validation error:", err);
        // Keep existing localStorage data on network error
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) setUser(JSON.parse(storedUser));
      }
    };
    validateSession();

    // Count live auctions
    const fetchLiveCount = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/list`);
        if (res.ok) {
          const data = await res.json();
          const live = data.filter(a => a.state === "LIVE" || a.state === "BREAK");
          setLiveAuctionCount(live.length);
        }
      } catch (err) {
        console.error("Layout fetch error:", err);
      }
    };
    fetchLiveCount();

    // Refresh live count periodically
    const interval = setInterval(fetchLiveCount, 15000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
    navigate("/login");
  };

  return (
    <div className="app-shell animate-fade-in">
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <Shield size={32} color="#8b5cf6" style={{ filter: "drop-shadow(0 0 10px rgba(139, 92, 246, 0.5))" }} />
          <span className="text-gradient" style={{ fontSize: "1.5rem", fontWeight: 900, letterSpacing: "-1px" }}>AuctionX</span>
        </div>

        <div className="sidebar-nav">
          <NavLink 
            to="/" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
            end
          >
            <Activity size={20} />
            <span>Home</span>
          </NavLink>

          <NavLink 
            to="/live" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <Radio size={20} />
            <span>Live Auctions</span>
            {liveAuctionCount > 0 && (
              <span className="live-badge">{liveAuctionCount}</span>
            )}
          </NavLink>

          <NavLink 
            to="/past" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <Archive size={20} />
            <span>Past Auctions</span>
          </NavLink>
        </div>

        {liveAuctionCount > 0 && (
          <div className="sidebar-live-indicator glass-card" onClick={() => navigate("/live")}>
            <Radio size={18} className="pulse-icon" color="#10b981" />
            <span>{liveAuctionCount} Live Now</span>
          </div>
        )}

        <NavLink to="/create-auction" className="btn-premium" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "auto", textDecoration: "none" }}>
          <Plus size={20} />
          CREATE AUCTION
        </NavLink>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        {/* TOP NAVBAR */}
        <header className="glass-panel" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 30px", margin: "15px 20px 0", borderRadius: "16px", zIndex: 50, position: "sticky", top: "15px" }}>
          <div className="topbar-left">
            {liveAuctionCount > 0 ? (
              <div className="global-state-badge pulse-glow" onClick={() => navigate("/live")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "10px", background: "rgba(16, 185, 129, 0.1)", border: "1px solid rgba(16, 185, 129, 0.3)", padding: "6px 16px", borderRadius: "20px" }}>
                <span className="status-dot live" style={{ width: "8px", height: "8px", background: "#10b981", borderRadius: "50%", boxShadow: "0 0 10px #10b981" }}></span>
                <span style={{ color: "#10b981", fontWeight: "bold", fontSize: "0.9rem" }}>
                  {liveAuctionCount} Auction{liveAuctionCount !== 1 ? "s" : ""} Live
                </span>
              </div>
            ) : <div></div>}
          </div>
          
          <div style={{ display: "flex", gap: "15px", alignItems: "center" }}>
            {user ? (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", background: "rgba(255,255,255,0.05)", padding: "4px 16px 4px 4px", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{user.username}</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="btn-glass"
                  style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", width: "40px", height: "40px" }}
                  title="Logout"
                >
                  <LogOut size={18} color="#ef4444" />
                </button>
              </>
            ) : (
              <>
                <button 
                  className="btn-glass"
                  onClick={() => navigate("/login")}
                >
                  Sign In
                </button>
                <button 
                  className="btn-premium"
                  onClick={() => navigate("/register")}
                >
                  Register
                </button>
              </>
            )}
          </div>
        </header>

        {/* INJECTED PAGE */}
        <main className="content-area" style={{ paddingTop: "20px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
