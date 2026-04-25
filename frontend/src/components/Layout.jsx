import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Archive, Plus, Shield, LogOut, Radio, Calendar, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import socket, { BACKEND_URL } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import ProfileDropdown from "./ProfileDropdown";
import "../styles/layout.css";
import "../styles/design-system.css";

const LogoIcon = () => (
  <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%" }}>
    <defs>
      <linearGradient id="grad1" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#3b82f6" />
        <stop offset="100%" stopColor="#0284c7" />
      </linearGradient>
      <linearGradient id="grad2" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#2563eb" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
    </defs>
    <polygon points="15,20 40,20 85,85 60,85" fill="#ffffff" />
    <polygon points="85,20 60,20 15,85 40,85" fill="#ffffff" />
    <polygon points="5,75 70,10 85,10 20,85" fill="url(#grad1)" stroke="#0b132b" strokeWidth="5" strokeLinejoin="round" />
    <polygon points="20,95 85,30 100,30 35,105" fill="url(#grad2)" stroke="#0b132b" strokeWidth="5" strokeLinejoin="round" />
  </svg>
);

function Layout() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [liveAuctionCount, setLiveAuctionCount] = useState(0);
  const [upcomingAuctionCount, setUpcomingAuctionCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Changed to false to hide by default

  useEffect(() => {

    // Count live auctions
    const fetchLiveCount = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/list`);
        if (res.ok) {
          const data = await res.json();
          const live = data.filter(a => a.state === "LIVE" || a.state === "BREAK");
          const upcoming = data.filter(a => a.state === "UPCOMING");
          setLiveAuctionCount(live.length);
          setUpcomingAuctionCount(upcoming.length);
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
      {/* GLOBAL NOTIFICATION MENU TOGGLE */}
      {!isSidebarOpen && (
        <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)} style={{ padding: "8px", background: "rgba(17,24,39,0.8)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "28px", height: "28px" }}><LogoIcon /></div>
        </button>
      )}

      {/* SIDEBAR */}
      <nav className={`sidebar ${!isSidebarOpen ? "collapsed" : ""}`}>
        <div className="sidebar-logo">
          {/* CUSTOM AUCTION X LOGO */}
          <div 
            style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer", transition: "opacity 0.2s" }}
            onClick={() => setIsSidebarOpen(false)}
            title="Collapse Menu"
          >
            <div style={{ 
              padding: "8px", 
              background: "rgba(17,24,39,0.8)", 
              border: "1px solid rgba(255,255,255,0.1)", 
              borderRadius: "12px", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              flexShrink: 0
            }}>
              <div style={{ width: "28px", height: "28px" }}>
                <LogoIcon />
              </div>
            </div>
            <div style={{ fontSize: "1.45rem", fontWeight: 900, letterSpacing: "1.5px", display: "flex", gap: "6px", fontFamily: "'Inter', system-ui, sans-serif", marginTop: "2px" }}>
              <span style={{ color: "#ffffff", transition: "color 0.2s" }}>AUCTION</span>
              <span style={{ color: "#3b82f6" }}>X</span>
            </div>
          </div>
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
            to="/upcoming" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <Calendar size={20} />
            <span>Upcoming Auctions</span>
            {upcomingAuctionCount > 0 && (
              <span className="live-badge" style={{background: "rgba(59,130,246,0.2)", color: "#3b82f6"}}>{upcomingAuctionCount}</span>
            )}
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

        <div style={{ padding: "0 15px", marginTop: "auto", display: "flex", flexDirection: "column", gap: "10px" }}>
          {user ? (
            <ProfileDropdown />
          ) : (
            <button className="btn-glass" onClick={() => navigate("/login")}>
              Sign In
            </button>
          )}

          <NavLink to="/create-auction" className="btn-premium" style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", textDecoration: "none" }}>
            <Plus size={20} />
            ORGANISE AN AUCTION
          </NavLink>
        </div>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">

        {/* INJECTED PAGE */}
        <main className="content-area" style={{ paddingTop: "20px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
