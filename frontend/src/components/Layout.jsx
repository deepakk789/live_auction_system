import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Activity, Archive, Plus, Shield, Settings, LogOut, ChevronDown } from "lucide-react";
import "../styles/layout.css";

function Layout() {
  const location = useLocation();
  
  // Do not show layout for Viewer mode to keep it fullscreen and distraction-free
  if (location.pathname.startsWith("/viewer/")) {
    return <Outlet />;
  }

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

        <NavLink to="/create-auction" className="nav-link-special">
          <Plus size={20} />
          CREATE AN AUCTION
        </NavLink>
      </nav>

      {/* MAIN CONTENT AREA */}
      <div className="main-content">
        {/* TOP NAVBAR */}
        <header className="topbar">
          <div className="profile-widget">
            <div className="profile-avatar">O</div>
            <span style={{ fontWeight: 600 }}>Organizer</span>
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
