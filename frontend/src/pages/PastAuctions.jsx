import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Archive, Search, SlidersHorizontal, ArrowUpDown, BarChart2, Users, Wallet, X, Trophy, Calendar } from "lucide-react";
import { BACKEND_URL } from "../services/socket";

function PastAuctions() {
  const navigate = useNavigate();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Controls
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const fetchPastAuctions = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/list`);
        if (!res.ok) throw new Error("Failed to fetch auctions");
        const data = await res.json();
        // Only ENDED auctions
        setAuctions(data.filter(a => a.state === "ENDED"));
      } catch (err) {
        console.error("PastAuctions fetch error:", err);
        setAuctions([]);
      } finally {
        setLoading(false);
      }
    };
    fetchPastAuctions();
  }, []);

  const filteredAuctions = useMemo(() => {
    let list = [...auctions];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        (a.auctionName || "").toLowerCase().includes(q) ||
        (a.auctionCode || "").toLowerCase().includes(q)
      );
    }

    // Date range filter
    if (dateFrom) {
      const from = new Date(dateFrom);
      from.setHours(0, 0, 0, 0);
      list = list.filter(a => new Date(a.endedAt || a.createdAt) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      list = list.filter(a => new Date(a.endedAt || a.createdAt) <= to);
    }

    list.sort((a, b) => {
      if (sortBy === "date_desc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date_asc")  return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "name_asc")  return (a.auctionName || "").localeCompare(b.auctionName || "");
      if (sortBy === "name_desc") return (b.auctionName || "").localeCompare(a.auctionName || "");
      return 0;
    });

    return list;
  }, [auctions, searchQuery, sortBy, dateFrom, dateTo]);

  const hasActiveFilters = searchQuery || sortBy !== "date_desc" || dateFrom || dateTo;
  const clearFilters = () => { setSearchQuery(""); setSortBy("date_desc"); setDateFrom(""); setDateTo(""); };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>
            <Archive size={28} color="#8b5cf6" style={{ marginRight: "12px", verticalAlign: "middle" }} />
            Past Auctions
          </h1>
          <p style={styles.subtitle}>Browse completed auctions and explore their full analytics.</p>
        </div>
        <div style={styles.totalCount}>
          <Trophy size={16} color="#8b5cf6" />
          <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>
            {filteredAuctions.length} Completed
          </span>
        </div>
      </div>

      {/* ── Search & Controls ── */}
      <div style={styles.controlBar}>
        <div style={styles.searchWrapper}>
          <Search size={16} color="#6b7280" style={styles.searchIcon} />
          <input
            id="past-search"
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
            id="past-sort-btn"
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
          id="past-filter-btn"
          style={{ ...styles.iconBtn, ...(showFilters ? styles.iconBtnActive : {}) }}
          onClick={() => setShowFilters(v => !v)}
          title="Filter"
        >
          <SlidersHorizontal size={16} />
          {(dateFrom || dateTo) && <span style={styles.filterDot} />}
        </button>

        {hasActiveFilters && (
          <button style={styles.clearBtn} onClick={clearFilters}>Clear</button>
        )}
      </div>

      {/* ── Filter Drawer ── */}
      {showFilters && (
        <div style={styles.filterDrawer}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
            <span style={styles.filterLabel}>Sort by:</span>
            {[
              { key: "date_desc", label: "📅 Newest First" },
              { key: "date_asc",  label: "📅 Oldest First" },
              { key: "name_asc",  label: "🔤 Name A→Z" },
              { key: "name_desc", label: "🔤 Name Z→A" }
            ].map(opt => (
              <button
                key={opt.key}
                style={{ ...styles.filterChip, ...(sortBy === opt.key ? styles.filterChipActive : {}) }}
                onClick={() => setSortBy(opt.key)}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "12px", flexWrap: "wrap" }}>
            <Calendar size={16} color="#6b7280" />
            <span style={styles.filterLabel}>Date range:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              style={styles.dateInput}
            />
            <span style={{ color: "#6b7280" }}>to</span>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              style={styles.dateInput}
            />
            {(dateFrom || dateTo) && (
              <button
                style={{ ...styles.filterChip, color: "#ef4444", borderColor: "#ef4444" }}
                onClick={() => { setDateFrom(""); setDateTo(""); }}
              >
                Clear dates
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Content ── */}
      {loading ? (
        <div style={styles.emptyState}>
          <div style={styles.spinner} />
          <p style={{ color: "#9ca3af", marginTop: "20px" }}>Loading past auctions…</p>
        </div>
      ) : filteredAuctions.length === 0 ? (
        <div style={styles.emptyState}>
          <Archive size={52} color="#374151" style={{ marginBottom: "20px" }} />
          <h2 style={{ color: "#d1d5db", marginBottom: "10px" }}>
            {auctions.length === 0 ? "No Completed Auctions Yet" : "No Results Found"}
          </h2>
          <p style={{ color: "#6b7280", maxWidth: "380px", margin: "0 auto" }}>
            {auctions.length === 0
              ? "Completed auctions will be archived here for you to review and analyze."
              : "Try adjusting your search terms or date filters."}
          </p>
        </div>
      ) : (
        <div style={styles.grid}>
          {filteredAuctions.map((auction, index) => (
            <PastAuctionCard
              key={auction._id}
              auction={auction}
              rank={index + 1}
              onClick={() => navigate(`/past/${auction._id}/analytics`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Past Auction Card ── */
function PastAuctionCard({ auction, rank, onClick }) {
  const endDate = auction.endedAt
    ? new Date(auction.endedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
    : new Date(auction.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div style={styles.card} className="past-auction-card" onClick={onClick} id={`past-card-${auction._id}`}>
      <div style={styles.cardHeader}>
        <span style={styles.endedBadge}>✓ ENDED</span>
        <span style={styles.dateText}>{endDate}</span>
      </div>

      <h2 style={styles.cardTitle}>{auction.auctionName || "Untitled Auction"}</h2>

      {auction.auctionCode && (
        <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "10px", fontFamily: "monospace", letterSpacing: "2px" }}>
          #{auction.auctionCode}
        </div>
      )}

      <div style={styles.cardMeta}>
        <span style={styles.metaItem}>
          <Users size={14} style={{ marginRight: "5px" }} />
          {auction.teamCount} Teams
        </span>
        <span style={styles.metaItem}>
          <Wallet size={14} style={{ marginRight: "5px" }} />
          ₹{auction.maxBudget?.toLocaleString() || 0}
        </span>
      </div>

      {auction.organizer && auction.organizer.username && (
        <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "12px" }}>
          By <span style={{ color: "#9ca3af", fontWeight: 600 }}>{auction.organizer.username}</span>
        </div>
      )}

      <div style={styles.cardFooter}>
        <button style={styles.analyticsBtn} onClick={onClick}>
          <BarChart2 size={14} style={{ marginRight: "6px" }} />
          View Analytics
        </button>
      </div>
    </div>
  );
}

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
  totalCount: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(139,92,246,0.1)",
    border: "1px solid rgba(139,92,246,0.3)",
    padding: "8px 16px",
    borderRadius: "50px",
    color: "#8b5cf6"
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
    background: "rgba(139,92,246,0.15)",
    border: "1px solid rgba(139,92,246,0.5)",
    color: "#a78bfa"
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
    background: "rgba(17,24,39,0.6)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "14px 20px",
    marginBottom: "24px"
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
    background: "rgba(139,92,246,0.15)",
    border: "1px solid #8b5cf6",
    color: "#a78bfa"
  },
  dateInput: {
    background: "rgba(17,24,39,0.8)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "8px",
    padding: "6px 12px",
    color: "white",
    fontSize: "0.85rem",
    outline: "none",
    colorScheme: "dark"
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
    borderTopColor: "#8b5cf6",
    borderRadius: "50%",
    margin: "0 auto",
    animation: "spin 0.8s linear infinite"
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
    boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "16px"
  },
  endedBadge: {
    padding: "4px 12px",
    borderRadius: "50px",
    fontSize: "0.75rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
    background: "rgba(139,92,246,0.15)",
    color: "#a78bfa",
    border: "1px solid #8b5cf6"
  },
  dateText: {
    color: "#6b7280",
    fontSize: "0.8rem"
  },
  cardTitle: {
    margin: "0 0 8px",
    fontSize: "1.3rem",
    fontWeight: 800,
    color: "#f9fafb"
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
    paddingTop: "16px"
  },
  analyticsBtn: {
    background: "linear-gradient(135deg, #7c3aed, #8b5cf6)",
    color: "white",
    border: "none",
    padding: "10px 20px",
    borderRadius: "50px",
    fontWeight: 700,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    fontSize: "0.9rem",
    boxShadow: "0 4px 12px rgba(139,92,246,0.3)",
    transition: "all 0.2s"
  }
};

export default PastAuctions;
