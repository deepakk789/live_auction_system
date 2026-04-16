import { useState, useEffect, useRef } from "react";
import { User, Shield, LogOut, Radio } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BACKEND_URL } from "../services/socket";
import { motion, AnimatePresence } from "framer-motion";
import "../styles/design-system.css";

function ProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState({ organizedCount: 0 });
  const dropdownRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch stats when dropdown opens
  useEffect(() => {
    if (isOpen && user) {
      const fetchStats = async () => {
        try {
          const token = localStorage.getItem("authToken");
          const res = await fetch(`${BACKEND_URL}/api/auth/stats`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            setStats(data);
          }
        } catch (error) {
          console.error("Failed to fetch stats", error);
        }
      };
      fetchStats();
    }
  }, [isOpen, user]);

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    navigate("/login");
  };

  if (!user) return null;

  return (
    <div className="profile-dropdown-container" ref={dropdownRef} style={{ position: "relative" }}>
      {/* TRIGGER BUTTON */}
      <div 
        className="profile-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "10px", 
          background: isOpen ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.05)", 
          padding: "4px 16px 4px 4px", 
          borderRadius: "30px", 
          border: "1px solid rgba(255,255,255,0.1)",
          cursor: "pointer",
          transition: "background 0.2s"
        }}
      >
        <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
          {user.username.charAt(0).toUpperCase()}
        </div>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{user.username}</span>
      </div>

      {/* DROPDOWN MENU */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{
              position: "absolute",
              top: "calc(100% + 10px)",
              right: 0,
              width: "280px",
              padding: "10px",
              zIndex: 100,
              boxShadow: "0 20px 40px rgba(0,0,0,0.8)",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "#0f172a",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)"
            }}
          >
            {/* Header info */}
            <div style={{ padding: "10px 15px 15px", borderBottom: "1px solid rgba(255,255,255,0.05)", marginBottom: "10px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: "bold", fontSize: "1.1rem" }}>{user.username}</p>
              <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem" }}>{user.email}</p>
            </div>

            {/* Stats list */}
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginBottom: "10px" }}>
              <div style={dropdownItemStyle} onClick={() => { setIsOpen(false); navigate("/past"); }}>
                <Shield size={18} color="#a78bfa" />
                <div style={{ flex: 1 }}>
                  <span style={{ display: "block" }}>Organized Events</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>{stats.organizedCount} Auctions</span>
                </div>
              </div>
              <div style={dropdownItemStyle} onClick={() => { setIsOpen(false); navigate("/live"); }}>
                <Radio size={18} color="#10b981" />
                <div style={{ flex: 1 }}>
                  <span style={{ display: "block" }}>Participated</span>
                  <span style={{ color: "#94a3b8", fontSize: "0.8rem" }}>Available in Live Board</span>
                </div>
              </div>
            </div>

            {/* Logout Action */}
            <motion.button 
              className="btn-glass"
              style={{ width: "100%", justifyContent: "flex-start", gap: "10px", color: "#ef4444", borderColor: "rgba(239, 68, 68, 0.2)", background: "rgba(239, 68, 68, 0.05)" }}
              onClick={handleLogout}
              whileHover={{ scale: 1.02, background: "rgba(239, 68, 68, 0.15)" }}
              whileTap={{ scale: 0.98 }}
            >
              <LogOut size={18} />
              Sign Out
            </motion.button>
            
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const dropdownItemStyle = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  padding: "10px 15px",
  borderRadius: "8px",
  cursor: "pointer",
  transition: "background 0.2s",
  ":hover": {
    background: "rgba(255,255,255,0.05)"
  }
};

export default ProfileDropdown;
