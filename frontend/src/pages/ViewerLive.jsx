import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import socket, { BACKEND_URL } from "../services/socket";
import DrinksBreak from "./DrinksBreak";

function ViewerLive() {
  const { auctionId } = useParams();
  const navigate = useNavigate();
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [isHydrated, setIsHydrated] = useState(false);
  const [teamsState, setTeamsState] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  const [selectedFields, setSelectedFields] = useState([]);

  const getBasePrice = (details) => {
    if (!details) return 0;
    const value = Object.values(details).find((v) => {
      if (typeof v !== "string") return false;
      const val = v.toLowerCase();
      if (val.includes("marquee")) return true;
      if (val.includes("uncapped")) return true;
      if (val.includes("capped") && !val.includes("uncapped")) return true;
      return false;
    });

    if (!value) return 0;
    const v = value.toLowerCase();
    if (v.includes("marquee")) return 50;
    if (v.includes("uncapped")) return 10;
    if (v.includes("capped")) return 20;

    return 0;
  };

  const getPlayerPhoto = (details) => {
    if (!details) return null;
    const driveLink = Object.values(details).find(
      (val) => typeof val === "string" && val.includes("drive.google.com")
    );
    if (!driveLink) return null;
    let match = driveLink.match(/id=([^&]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    match = driveLink.match(/\/d\/([^/]+)/);
    if (match) return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    return null;
  };

  /* ---------- SOCKET LISTENERS (REAL TIME) ---------- */
  useEffect(() => {
    const syncFromServer = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auction/sync`);
        if (!res.ok) throw new Error("Failed to sync");
        const data = await res.json();
        
        if (data.playersState) setPlayersState(data.playersState);
        if (data.auctionState) setAuctionState(data.auctionState);
        if (data.auctionConfig?.selectedFields) setSelectedFields(data.auctionConfig.selectedFields);
        if (data.teamsState) setTeamsState(data.teamsState);
        
        setIsHydrated(true);
      } catch (err) {
        console.error("Hydration DB error:", err);
      }
    };
    syncFromServer();

    const handleReconnect = () => {
      syncFromServer();
    };

    socket.on("connect", handleReconnect);

    socket.on("auction_update", (data) => {
      setPlayersState(data);
    });

    socket.on("auction_config", (config) => {
      const fields = config?.selectedFields || [];
      setSelectedFields(fields);
    });

    socket.on("auction_state", (state) => {
      setAuctionState(state);
    });
    
    socket.on("auction_reset", () => {
       alert("Auction was completely reset by the Organizer.");
       navigate("/");
    });

    socket.on("teams_update", (teams) => {
       setTeamsState(teams);
    });

    socket.on("sync_full_state", (data) => {
      if (data.playersState) setPlayersState(data.playersState);
      if (data.auctionState) setAuctionState(data.auctionState);
      if (data.auctionConfig?.selectedFields) setSelectedFields(data.auctionConfig.selectedFields);
      if (data.teamsState) setTeamsState(data.teamsState);
    });

    return () => {
      socket.off("connect", handleReconnect);
      socket.off("auction_update");
      socket.off("auction_state");
      socket.off("auction_config");
      socket.off("auction_reset");
      socket.off("teams_update");
      socket.off("sync_full_state");
    };
  }, [navigate]);


  if (!isHydrated) {
    return null; // or a spinner
  }

  if (!playersState || !playersState.players?.length) {
    return (
      <h2 style={{ textAlign: "center", marginTop: "40px" }}>
        Waiting for auction to start…
      </h2>
    );
  }


  const player = playersState.players[playersState.currentIndex];
  if (!player) return null;

  const basePrice = getBasePrice(player.details);

  if (auctionState === "BREAK") {
    return (
      <DrinksBreak
        readOnly
      />
    );

  }


  return (

    <div style={page}>
      {/* AUCTION STATE REMOVED - GLOBAL LAYOUT HANDLES IT */}
      
      {/* Top action bar */}
      <div style={{ position: 'absolute', top: '20px', right: '30px' }}>
         <button onClick={() => setShowAnalytics(true)} style={analyticsBtn}>
            📊 View Auction Analytics
         </button>
      </div>

      {/* CURRENT BID */}
      {auctionState === "LIVE" && (
        <div style={bigBid}>{player.currentBid || 0}</div>
      )}


      {/* PLAYER CARD */}
      <div style={card}>
        <div className="stamp-container">
          <img
            src={getPlayerPhoto(player.details) || fallbackPhoto}
            alt="player"
            style={photo}
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = fallbackPhoto;
            }}
          />
          {player.status === "SOLD" && (
            <div className="stamp-overlay stamp-sold">
              <h2>SOLD</h2>
              <p>TO {player.soldTo}</p>
            </div>
          )}
          {player.status === "UNSOLD" && (
            <div className="stamp-overlay stamp-unsold">
              <h2>UNSOLD</h2>
            </div>
          )}
        </div>


        <h1>{player.name}</h1>
        {/* <div style={{ marginTop: "10px", color: "#d1d5db" }}>
          {auctionConfig?.selectedFields?.map((field) => (
            <p key={field}>
              <strong>{field}:</strong>{" "}
              {player.details?.[field] ?? "-"}
            </p>
          ))}
        </div> */}

        {/* <div style={{ marginTop: "10px", color: "#d1d5db" }}>
          {player.details &&
            Object.entries(player.details).map(([key, value]) => {
              if (!value) return null;

              // hide photo links
              if (key.toLowerCase().includes("photo")) return null;

              return (
                <p key={key}>
                  <strong>{key}:</strong> {value}
                </p>
              );
            })}
        </div> */}

        <div style={{ marginTop: "10px", color: "#d1d5db" }}>
          {selectedFields.map((field) => (
            <p key={field}>
              <strong>{field}:</strong>{" "}
              {player.details?.[field] ?? "-"}
            </p>
          ))}
        </div>



        <p
          style={{
            marginTop: "10px",
            fontSize: "16px",
            fontWeight: "bold",
            color: "#9ca3af"
          }}
        >
          Base Price: {basePrice}
        </p>



        {player.status === "SOLD" && (
          <p style={{ ...badge, background: "#16a34a" }}>
            SOLD to {player.soldTo} for {player.soldPrice}
          </p>
        )}

        {player.status === "UNSOLD" && (
          <p style={{ ...badge, background: "#f97316" }}>
            UNSOLD
          </p>
        )}
      </div>

      {showAnalytics && (
        <div style={modalOverlay} onClick={() => setShowAnalytics(false)}>
          <div style={modalContent} onClick={e => e.stopPropagation()}>
             <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0, color: '#60a5fa' }}>Auction Analytics</h2>
                <button onClick={() => setShowAnalytics(false)} style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '24px', cursor: 'pointer' }}>×</button>
             </div>
             
             {teamsState.length === 0 ? (
                <p>No teams configured.</p>
             ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', textAlign: 'left' }}>
                   {teamsState.map(team => (
                      <div key={team.name} style={{ background: '#1f2937', padding: '15px', borderRadius: '8px', border: '1px solid #374151' }}>
                         <h3 style={{ marginTop: 0, borderBottom: '1px solid #4b5563', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                            {team.name}
                            <span style={{ color: '#10b981' }}>{team.budget} Left</span>
                         </h3>
                         <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                            {team.players.length === 0 ? (
                               <p style={{ color: '#9ca3af', fontSize: '14px' }}>No players signed yet.</p>
                            ) : (
                               <ul style={{ margin: 0, paddingLeft: '20px', color: '#d1d5db', fontSize: '14px' }}>
                                  {team.players.map((p, i) => (
                                     <li key={i}>{p.name} <span style={{ color: '#9ca3af' }}>({p.price})</span></li>
                                  ))}
                               </ul>
                            )}
                         </div>
                      </div>
                   ))}
                </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- STYLES ---------- */

const page = {
  minHeight: "100vh",
  background: "#0b132b",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  position: "relative"
};

const analyticsBtn = {
  background: "#3b82f6",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "8px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
  transition: "all 0.3s ease",
};

const modalOverlay = {
  position: "fixed",
  top: 0, left: 0, right: 0, bottom: 0,
  background: "rgba(0,0,0,0.8)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 1000,
  padding: "20px"
}

const modalContent = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "16px",
  padding: "30px",
  width: "100%",
  maxWidth: "800px",
  maxHeight: "80vh",
  overflowY: "auto"
}

const bigBid = {
  fontSize: "72px",
  fontWeight: "900",
  marginTop: "80px",
  marginBottom: "20px",
  color: "#facc15"
};

const card = {
  background: "#111827",
  border: "2px solid #374151",
  borderRadius: "16px",
  padding: "25px",
  width: "340px",
  textAlign: "center"
};

const photo = {
  width: "100%",
  height: "320px",
  objectFit: "cover",
  borderRadius: "12px"
};

const badge = {
  marginTop: "15px",
  padding: "10px",
  borderRadius: "8px",
  fontWeight: "bold",
  color: "#fff"
};

export default ViewerLive;
