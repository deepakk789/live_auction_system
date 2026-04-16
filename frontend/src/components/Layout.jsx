import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Archive, Plus, Shield, LogOut, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import socket, { BACKEND_URL } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";
import "../styles/layout.css";
import "../styles/design-system.css";

function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [liveAuctionCount, setLiveAuctionCount] = useState(0);

  useEffect(() => {

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
    logout();
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
              <ProfileDropdown />
            ) : (
              <>
                <button 
                  className="btn-premium"
                  onClick={() => navigate("/login")}
                >
                  Sign In
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
