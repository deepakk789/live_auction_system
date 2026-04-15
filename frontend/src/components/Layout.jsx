import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Activity, Archive, Plus, Shield, Settings, LogOut, ChevronDown, Radio } from "lucide-react";
import { useEffect, useState } from "react";
import socket, { BACKEND_URL } from "../services/socket";
import "../styles/layout.css";

function Layout() {
  const navigate = useNavigate();
  const [auctionState, setAuctionState] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/sync`);
        if (res.ok) {
          const data = await res.json();
          if (data.auctionState) setAuctionState(data.auctionState);
        }
      } catch (err) {
        console.error("Layout DB error:", err);
      }
    };
    checkStatus();

    const handleReconnect = () => {
      checkStatus();
    };

    socket.on("connect", handleReconnect);

    socket.on("auction_state", (state) => {
      setAuctionState(state);
    });

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("auction_state");
    };
  }, []);

  
  // We intentionally kept the Layout persistent for all screens now.

  return (
    <div className="app-shell animate-fade-in">
      {/* SIDEBAR */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <Shield size={28} color="#3b82f6" />
          <span>AuctionX</span>
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
            <Activity size={20} />
            <span>Live Auctions</span>
          </NavLink>

          <NavLink 
            to="/past" 
            className={({ isActive }) => isActive ? "nav-link active" : "nav-link"}
          >
            <Archive size={20} />
            <span>Past Auctions</span>
          </NavLink>
        </div>

        {auctionState && auctionState !== "ENDED" && (
          <div className="sidebar-live-indicator" onClick={() => navigate("/viewer/global")}>
            <Radio size={18} className="pulse-icon" color="#10b981" />
            <span>Watch Live</span>
          </div>
        )}

        <NavLink to="/create-auction" className="nav-link-special">
          <Plus size={20} />
          CREATE AN AUCTION
        </NavLink>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        {/* TOP NAVBAR */}
        <header className="topbar">
          <div className="topbar-left">
            {auctionState && (
              <div className="global-state-badge">
                <span className={`status-dot ${auctionState.toLowerCase()}`}></span>
                <span className="status-text">
                  {auctionState === "LIVE" ? "Live Auction" : auctionState === "BREAK" ? "Drinks Break" : "Ended"}
                </span>
              </div>
            )}
          </div>
          
          <div className="profile-widget">
            <div className="profile-avatar">S</div>
            <span style={{ fontWeight: 600 }}>Studio</span>
            <ChevronDown size={16} color="#9ca3af" />
          </div>
        </header>

        {/* INJECTED PAGE */}
        <main className="content-area">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default Layout;
