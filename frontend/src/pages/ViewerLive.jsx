import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import socket from "../services/socket";
import DrinksBreak from "./DrinksBreak";


function ViewerLive() {
  const { auctionId } = useParams();
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [isHydrated, setIsHydrated] = useState(false);

  const [selectedFields, setSelectedFields] = useState([]);



  const getBasePrice = (details) => {
    if (!details) return 0;

    const value = Object.values(details).find(
      (v) =>
        typeof v === "string" &&
        (
          v.toLowerCase().includes("marquee") ||
          v.toLowerCase().includes("capped") ||
          v.toLowerCase().includes("uncapped")
        )
    );

    if (!value) return 0;

    const v = value.toLowerCase();

    if (v.includes("marquee")) return 50;
    if (v.includes("capped")) return 20;
    if (v.includes("uncapped")) return 10;

    return 0;
  };



  const getPlayerPhoto = (details) => {
    if (!details) return null;

    const driveLink = Object.values(details).find(
      (val) =>
        typeof val === "string" &&
        val.includes("drive.google.com")
    );

    if (!driveLink) return null;

    let match = driveLink.match(/id=([^&]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }

    match = driveLink.match(/\/d\/([^/]+)/);
    if (match) {
      return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }

    return null;
  };


  /* ---------- SOCKET LISTENERS (REAL TIME) ---------- */
  useEffect(() => {
    // 🔥 HYDRATE FROM localStorage FIRST

    /* const ac = JSON.parse(localStorage.getItem("auctionConfig"));
    if (ac) setAuctionConfig(ac); */


    const ps = JSON.parse(localStorage.getItem("playersState"));
    const as = localStorage.getItem("auctionState");

    const sf = JSON.parse(localStorage.getItem("selectedFields"));

    if (ps) setPlayersState(ps);
    if (as) setAuctionState(as);
    if (sf) setSelectedFields(sf);

    setIsHydrated(true); // ✅ hydration done

    // SOCKET LISTENERS
    socket.on("auction_update", (data) => {
      setPlayersState(data);
    });

    socket.on("auction_config", (config) => {
      const fields = config?.selectedFields || [];
      setSelectedFields(fields);
      localStorage.setItem("selectedFields", JSON.stringify(fields)); // 👈 fallback
    });

    socket.on("auction_state", (state) => {
      setAuctionState(state);
    });



    return () => {
      socket.off("auction_update");
      socket.off("auction_state");
      socket.off("auction_config");
    };
  }, []);


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
      {/* AUCTION STATE */}
      <div
        style={{
          ...stateBanner,
          background:
            auctionState === "LIVE"
              ? "#16a34a"
              : auctionState === "BREAK"
                ? "#facc15"
                : "#374151",
          color: auctionState === "BREAK" ? "#000" : "#fff"
        }}
      >
        {auctionState === "LIVE" && "🔴 LIVE AUCTION"}
        {auctionState === "BREAK" && "🟡 DRINKS BREAK"}
        {auctionState === "ENDED" && "⚫ AUCTION ENDED"}
      </div>

      {/* CURRENT BID */}
      {auctionState === "LIVE" && (
        <div style={bigBid}>{player.currentBid || 0}</div>
      )}


      {/* PLAYER CARD */}
      <div style={card}>
        <img
          src={getPlayerPhoto(player.details) || fallbackPhoto}
          alt="player"
          style={photo}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackPhoto;
          }}
        />


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
  justifyContent: "center"
};

const stateBanner = {
  position: "fixed",
  top: 0,
  width: "100%",
  padding: "16px",
  fontSize: "22px",
  fontWeight: "bold",
  textAlign: "center",
  zIndex: 10
};

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
