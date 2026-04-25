import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Activity, Search, SlidersHorizontal, ArrowUpDown, Radio, Users, Wallet, X, Hash, Copy, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BACKEND_URL } from "../services/socket";
import PageTransition from "../components/PageTransition";
import SkeletonLoader from "../components/SkeletonLoader";
import BorderGlow from "../components/BorderGlow";
import { Calendar } from "lucide-react";

function UpcomingAuctions() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Current user
  const [currentUser, setCurrentUser] = useState(null);

  // Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [codeQuery, setCodeQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [filterState, setFilterState] = useState("ALL");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem("authUser");
    if (storedUser) setCurrentUser(JSON.parse(storedUser));

    const fetchLiveAuctions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/list`);
        if (!res.ok) throw new Error("Failed to fetch auctions");
        const data = await res.json();
        setAuctions(data.filter(a => a.state === "UPCOMING"));
      } catch (err) {
        console.error("UpcomingAuctions fetch error:", err);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveAuctions();
  }, []);

  // Smart navigation: organizer → organizer page, else → viewer page
  const handleAuctionClick = (auction) => {
    const isOrganizer = currentUser && auction.organizer &&
      (currentUser.id === auction.organizer._id || currentUser.id === auction.organizer);

    if (isOrganizer) {
      // For UPCOMING auctions, go to upload first; for LIVE, go to live board
      if (auction.state === "UPCOMING") {
        navigate(`/organizer/${auction._id}/upload`);
      } else {
        navigate(`/organizer/${auction._id}/live`);
      }
    } else {
      navigate(`/viewer/${auction._id}`);
    }
  };

  // Rejoin by code
  const handleCodeSearch = async () => {
    if (!codeQuery.trim()) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/auction/code/${codeQuery.trim().toUpperCase()}`);
      if (!res.ok) {
        alert("No auction found with that code.");
        return;
      }
      const auction = await res.json();
      
      if (auction.state === "ENDED") {
        navigate(`/past/${auction._id}/analytics`);
      } else {
        handleAuctionClick(auction);
      }
    } catch (err) {
      console.error("Code search error:", err);
      alert("Error searching for auction.");
    }
  };

  const filteredAuctions = useMemo(() => {
    let list = [...auctions];

    if (filterState !== "ALL") {
      list = list.filter(a => a.state === filterState);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.auctionName || "").toLowerCase().includes(q) ||
        (a.auctionCode || "").toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date_asc")  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name_asc")  return (a.auctionName || "").localeCompare(b.auctionName || "");
      if (sortBy === "name_desc") return (b.auctionName || "").localeCompare(a.auctionName || "");
      return 0;
    });

    return list;
  }, [auctions, searchQuery, sortBy, filterState]);

  const clearFilters = () => {
    setSearchQuery("");
    setSortBy("date_desc");
    setFilterState("ALL");
  };
  const hasActiveFilters = searchQuery || sortBy !== "date_desc" || filterState !== "ALL";

  return (
    <PageTransition>
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Calendar size={28} color="#3b82f6" style={{ marginRight: "12px", verticalAlign: "middle" }} />
            Upcoming Auctions
          </h1>
          <p style={styles.subtitle}>View auctions that are approved and waiting to begin.</p>
        </div>
        <div style={{...styles.liveCount, background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6"}}>
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {filteredAuctions.length} Upcoming
          </span>
        </div>
      </div>

      {/* ── Rejoin by Code ── */}
      <div style={styles.rejoinBar}>
        <Hash size={18} color="#6b7280" />
        <input
          id="code-search"
          style={styles.codeInput}
          type="text"
          placeholder="Enter auction code to rejoin…"
          value={codeQuery}
          onChange={e => setCodeQuery(e.target.value.toUpperCase())}
          maxLength={6}
          onKeyDown={e => e.key === "Enter" && handleCodeSearch()}
        />
        <button style={styles.codeBtn} onClick={handleCodeSearch}>
          Join
        </button>
      </div>

      {/* ── Search & Controls ── */}
      <div style={styles.controlBar}>
        <div style={styles.searchWrapper}>
          <Search size={16} color="#6b7280" style={styles.searchIcon} />
          <input
            id="live-search"
            style={styles.searchInput}
            type="text"
            placeholder="Search by name or code…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <X size={14} color="#6b7280" style={styles.clearIcon} onClick={() => setSearchQuery("")} />
          )}
        </div>

        <div style={{ position: "relative" }}>
          <button
            id="sort-btn"
            style={styles.iconBtn}
            onClick={() => {
              const opts = ["date_desc","date_asc","name_asc","name_desc"];
              const idx = opts.indexOf(sortBy);
              setSortBy(opts[(idx + 1) % opts.length]);
            }}
            title="Cycle sort order"
          >
            <ArrowUpDown size={16} />
          </button>
          <span style={styles.sortLabel}>{
            { date_desc: "Newest", date_asc: "Oldest", name_asc: "A→Z", name_desc: "Z→A" }[sortBy]
          }</span>
        </div>

        <button
          id="filter-btn"
          style={{ ...styles.iconBtn, ...(showFilters ? styles.iconBtnActive : {}) }}
          onClick={() => setShowFilters(v => !v)}
          title="Filter"
        >
          <SlidersHorizontal size={16} />
          {filterState !== "ALL" && <span style={styles.filterDot} />}
        </button>

        {hasActiveFilters && (
          <button style={styles.clearBtn} onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* ── Filter Drawer ── */}
      {showFilters && (
        <div style={styles.filterDrawer}>
          <span style={styles.filterLabel}>Status:</span>
          {["ALL"].map(opt => (
            <button
              key={opt}
              style={{ ...styles.filterChip, ...(filterState === opt ? styles.filterChipActive : {}) }}
              onClick={() => setFilterState(opt)}
            >
              {opt === "ALL" ? "All" : opt}
            </button>
          ))}
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={{ marginTop: "20px" }}>
          <SkeletonLoader variant="card" count={3} />
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div style={styles.emptyState}>
          <Calendar size={52} color="#374151" style={{ marginBottom: "20px" }} />
          <h2 style={{ color: "#d1d5db", marginBottom: "10px" }}>
            {auctions.length === 0 ? "No Upcoming Auctions" : "No Results Found"}
          </h2>
          <p style={{ color: "#6b7280", maxWidth: "380px", margin: "0 auto 24px" }}>
            {auctions.length === 0
              ? "There are no pending auctions waiting to start right now."
              : "Try adjusting your search or filter options."}
          </p>
        </div>
      ) : (
        <motion.div
          style={styles.grid}
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
        >
          {filteredAuctions.map(auction => (
            <motion.div
              key={auction._id}
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.97 },
                show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", damping: 20 } },
              }}
            >
              <AuctionCard
                auction={auction}
                isOrganizer={currentUser && auction.organizer && (currentUser.id === auction.organizer._id || currentUser.id === auction.organizer)}
                onClick={() => handleAuctionClick(auction)}
              />
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
    </PageTransition>
  );
}

/* ── Auction Card ── */
function AuctionCard({ auction, isOrganizer, onClick }) {
  const isLive = auction.state === "LIVE";
  const [codeCopied, setCodeCopied] = useState(false);
  const date = new Date(auction.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  });

  const copyCode = (e) => {
    e.stopPropagation();
    if (auction.auctionCode) {
      navigator.clipboard.writeText(auction.auctionCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  return (
    <BorderGlow style={styles.card} className="auction-card" onClick={onClick} id={`card-${auction._id}`} animated={false}>
      {/* Status Badge */}
      <div style={styles.cardHeader}>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span style={{ ...styles.stateBadge, background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: `1px solid #3b82f6` }}>
            📅 UPCOMING
          </span>
          {isOrganizer && (
            <span style={styles.organizerBadge}>👑 Organizer</span>
          )}
        </div>
        <span style={styles.dateText}>{date}</span>
      </div>

      {/* Auction Name */}
      <h2 style={styles.cardTitle}>{auction.auctionName || "Untitled Auction"}</h2>

      {/* Code */}
      <div style={styles.codeLine} onClick={copyCode}>
        <Hash size={12} color="#6b7280" />
        <span style={{ color: "#60a5fa", fontFamily: "monospace", fontWeight: 700, letterSpacing: "2px" }}>
          {auction.auctionCode || "—"}
        </span>
        {codeCopied ? <Check size={12} color="#10b981" /> : <Copy size={12} color="#6b7280" />}
      </div>

      {/* Meta */}
      <div style={styles.cardMeta}>
        <span style={styles.metaItem}>
          <Users size={14} style={{ marginRight: "5px" }} />
          {auction.teamCount} Teams
        </span>
        <span style={styles.metaItem}>
          <Wallet size={14} style={{ marginRight: "5px" }} />
          ₹{auction.maxBudget?.toLocaleString() || 0} budget
        </span>
      </div>

      {/* Organizer name */}
      {auction.organizer && auction.organizer.username && (
        <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "12px" }}>
          Organized by <span style={{ color: "#9ca3af", fontWeight: 600 }}>{auction.organizer.username}</span>
        </div>
      )}

      {/* Scheduled Date */}
      {auction.scheduledDate && (
        <div style={{ 
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(59, 130, 246, 0.08)", border: "1px solid rgba(59,130,246,0.2)",
          padding: "8px 14px", borderRadius: "8px", marginBottom: "12px",
          fontSize: "0.85rem", color: "#60a5fa"
        }}>
          <Calendar size={14} />
          <span>Scheduled: <strong>{new Date(auction.scheduledDate).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</strong></span>
        </div>
      )}

      {/* CTA */}
      <div style={styles.cardFooter}>
        <button style={isOrganizer ? styles.manageBtn : styles.watchBtn} onClick={onClick}>
          <Calendar size={14} style={{ marginRight: "6px" }} />
          {isOrganizer ? "Manage Setup" : "View Lobby"}
        </button>
      </div>
    </BorderGlow>
  );
}

/* ── Styles ── */
const styles = {
  container: {
    padding: "40px 40px 60px",
    color: "white",
    maxWidth: "1200px",
    margin: "0 auto"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: "36px",
    flexWrap: "wrap",
    gap: "16px"
  },
  title: {
    margin: 0,
    fontSize: "2.2rem",
    fontWeight: 800,
    display: "flex",
    alignItems: "center"
  },
  subtitle: {
    color: "#6b7280",
    marginTop: "8px",
    fontSize: "1rem"
  },
  liveCount: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(16,185,129,0.1)",
    border: "1px solid rgba(16,185,129,0.3)",
    padding: "8px 16px",
    borderRadius: "50px",
    color: "#10b981"
  },
  pulseDot: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#10b981",
    display: "inline-block",
    boxShadow: "0 0 0 3px rgba(16,185,129,0.3)",
    animation: "pulse 2s infinite"
  },
  rejoinBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(17,24,39,0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "12px 16px",
    marginBottom: "20px"
  },
  codeInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#fff",
    fontSize: "1rem",
    fontFamily: "monospace",
    letterSpacing: "3px",
    outline: "none",
    textTransform: "uppercase"
  },
  codeBtn: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    border: "none",
    padding: "8px 20px",
    borderRadius: "8px",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: "0.9rem"
  },
  controlBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "16px",
    flexWrap: "wrap"
  },
  searchWrapper: {
    position: "relative",
    flex: 1,
    minWidth: "200px"
  },
  searchIcon: {
    position: "absolute",
    left: "14px",
    top: "50%",
    transform: "translateY(-50%)"
  },
  clearIcon: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    cursor: "pointer"
  },
  searchInput: {
    width: "100%",
    background: "rgba(17,24,39,0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "50px",
    padding: "10px 40px 10px 40px",
    color: "white",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    transition: "border 0.2s"
  },
  iconBtn: {
    background: "rgba(17,24,39,0.8)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#d1d5db",
    padding: "10px 14px",
    borderRadius: "50px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "6px",
    fontSize: "0.85rem",
    position: "relative",
    transition: "all 0.2s"
  },
  iconBtnActive: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid rgba(59,130,246,0.5)",
    color: "#60a5fa"
  },
  filterDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#ef4444",
    position: "absolute",
    top: "6px",
    right: "6px"
  },
  sortLabel: {
    position: "absolute",
    bottom: "-18px",
    left: "50%",
    transform: "translateX(-50%)",
    fontSize: "0.7rem",
    color: "#6b7280",
    whiteSpace: "nowrap"
  },
  clearBtn: {
    background: "transparent",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "8px 14px",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "0.85rem"
  },
  filterDrawer: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    background: "rgba(17,24,39,0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "14px 20px",
    marginBottom: "24px",
    flexWrap: "wrap"
  },
  filterLabel: {
    color: "#6b7280",
    fontSize: "0.85rem",
    marginRight: "4px"
  },
  filterChip: {
    background: "rgba(55,65,81,0.5)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "#9ca3af",
    padding: "6px 16px",
    borderRadius: "50px",
    cursor: "pointer",
    fontSize: "0.85rem",
    transition: "all 0.2s"
  },
  filterChipActive: {
    background: "rgba(59,130,246,0.15)",
    border: "1px solid #3b82f6",
    color: "#60a5fa"
  },
  emptyState: {
    background: "rgba(17,24,39,0.4)",
    border: "1px dashed rgba(255,255,255,0.1)",
    borderRadius: "20px",
    padding: "80px 24px",
    textAlign: "center",
    marginTop: "20px"
  },
  spinner: {
    width: "44px",
    height: "44px",
    border: "3px solid rgba(255,255,255,0.1)",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 0.8s linear infinite"
  },
  ctaBtn: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    border: "none",
    padding: "12px 28px",
    borderRadius: "50px",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    boxShadow: "0 4px 20px rgba(59,130,246,0.3)"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: "24px",
    marginTop: "28px"
  },
  card: {
    background: "rgba(17,24,39,0.7)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "24px",
    cursor: "pointer",
    transition: "all 0.25s ease",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  stateBadge: {
    padding: "4px 12px",
    borderRadius: "50px",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.5px"
  },
  organizerBadge: {
    padding: "4px 10px",
    borderRadius: "50px",
    fontSize: "0.7rem",
    fontWeight: 700,
    background: "rgba(251,191,36,0.15)",
    color: "#fbbf24",
    border: "1px solid rgba(251,191,36,0.3)"
  },
  dateText: {
    color: "#6b7280",
    fontSize: "0.8rem"
  },
  cardTitle: {
    margin: "0 0 10px",
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#f9fafb"
  },
  codeLine: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    background: "rgba(0,0,0,0.2)",
    padding: "6px 12px",
    borderRadius: "6px",
    marginBottom: "14px",
    width: "fit-content",
    cursor: "pointer",
    fontSize: "0.85rem"
  },
  cardMeta: {
    display: "flex",
    gap: "16px",
    marginBottom: "12px",
    flexWrap: "wrap"
  },
  metaItem: {
    display: "flex",
    alignItems: "center",
    color: "#6b7280",
    fontSize: "0.85rem"
  },
  cardFooter: {
    borderTop: "1px solid rgba(255,255,255,0.06)",
    paddingTop: "16px",
    marginTop: "auto"
  },
  watchBtn: {
    background: "linear-gradient(135deg, #059669, #10b981)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "50px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "0.9rem",
    boxShadow: "0 4px 12px rgba(16,185,129,0.3)",
    transition: "all 0.2s"
  },
  manageBtn: {
    background: "linear-gradient(135deg, #2563eb, #7c3aed)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "50px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "0.9rem",
    boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
    transition: "all 0.2s"
  }
};

export default UpcomingAuctions;
