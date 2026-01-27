import { useEffect, useState } from "react";
import socket from "../services/socket";
import { useNavigate } from "react-router-dom";



function OrganizerLive() {
  const [setup, setSetup] = useState(null);
  const [auctionConfig, setAuctionConfig] = useState(null);
  const [teams, setTeams] = useState([]);
  const [playersState, setPlayersState] = useState(null);
  const [auctionState, setAuctionState] = useState("LIVE");
  const [selectedTeam, setSelectedTeam] = useState("");
  const navigate = useNavigate();
  const fallbackPhoto = "https://cdn-icons-png.flaticon.com/512/861/861512.png";
  const [maxBid, setMaxBid] = useState(null);



  const getBasePrice = (details) => {
    if (!details) return 0;

    // Find any field value that matches category keywords
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


  const getMaxBid = (details) => {
    if (!details) return Infinity;

    // find a numeric value that can act as max bid
    const value = Object.values(details).find(
      (v) => !isNaN(Number(v)) && Number(v) > 0
    );

    const max = Number(value);
    return max > 0 ? max : Infinity;
  };




  const getPlayerPhoto = (details) => {
    if (!details) return null;

    for (const value of Object.values(details)) {
      if (typeof value !== "string") continue;

      if (value.includes("drive.google.com")) {
        // open?id=
        let match = value.match(/id=([^&]+)/);
        if (match) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }

        // /d/FILE_ID
        match = value.match(/\/d\/([^/]+)/);
        if (match) {
          return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
        }
      }
    }

    return null;
  };


  /* ---------- LOAD DATA ---------- */
  useEffect(() => {
    const s = JSON.parse(localStorage.getItem("auctionSetup"));
    const c = JSON.parse(localStorage.getItem("auctionConfig"));
    const p = JSON.parse(localStorage.getItem("playersState"));
    const t = JSON.parse(localStorage.getItem("teamsState"));
    const a = localStorage.getItem("auctionState");
    const storedMaxBid = localStorage.getItem("maxBid");
    if (storedMaxBid) setMaxBid(Number(storedMaxBid));


    if (s) setSetup(s);
    if (c) setAuctionConfig(c);
    if (p) setPlayersState(p);
    if (t) {
      socket.emit("teams_update", t);
    }

    if (a) setAuctionState(a);

  }, []);

  
  useEffect(() => {
    socket.on("teams_update", (data) => {
      console.log("📥 Organizer received teams_update:", data);
      setTeams(data);
      localStorage.setItem("teamsState", JSON.stringify(data));
    });

    return () => {
      socket.off("teams_update");
    };
  }, []);


  useEffect(() => {
    if (auctionConfig?.selectedFields?.length) {
      console.log("📤 Emitting selectedFields:", auctionConfig.selectedFields);
      socket.emit("auction_config", {
        selectedFields: auctionConfig.selectedFields
      });
    }

  }, [auctionConfig]);

  useEffect(() => {//the new change for refresh viewers state
    if (!playersState || !auctionConfig) return;

    console.log("📤 Syncing full auction state to server");

    socket.emit("sync_full_state", {
      playersState,
      auctionState,
      teamsState: teams,
      auctionConfig
    });
  }, [playersState, auctionState, teams, auctionConfig]);



  /* ---------- ROUTE GUARD ---------- */
  useEffect(() => {
    if (
      !localStorage.getItem("auctionSetup") ||
      !localStorage.getItem("auctionConfig") ||
      !localStorage.getItem("playersState")
    ) {
      navigate("/");
    }
  }, [navigate]);

  /* ---------- AUTO BASE PRICE ---------- */
  useEffect(() => {
    if (!playersState) return;

    const index = playersState.currentIndex;
    const player = playersState.players[index];
    const base = getBasePrice(player.details);

    if (!player.currentBid || player.currentBid < base) {
      const playersCopy = playersState.players.map((p, i) =>
        i === index
          ? { ...p, currentBid: base, status: "LIVE" }
          : p
      );

      const updated = { ...playersState, players: playersCopy };

      setPlayersState(updated);
      localStorage.setItem("playersState", JSON.stringify(updated));
      socket.emit("auction_update", updated);
    }
  }, [playersState?.currentIndex]);




  /* ---------- GUARDS ---------- */
  if (!setup) return <h2>Loading auction setup…</h2>;
  if (!auctionConfig) return <h2>Loading card config…</h2>;
  if (!playersState || !playersState.players?.length)
    return <h2>No players loaded.</h2>;

  const { players, currentIndex } = playersState;
  const currentPlayer = players[currentIndex];
  const bidSteps = setup.bidSteps || [10, 20, 50];

  /* ---------- HELPERS ---------- */
  const persistPlayers = (ps) =>
    localStorage.setItem("playersState", JSON.stringify(ps));
  const persistTeams = (ts) =>
    localStorage.setItem("teamsState", JSON.stringify(ts));

  /* ---------- AUCTION STATE ---------- */
  // const updateState = (state) => {
  //   setAuctionState(state);
  //   localStorage.setItem("auctionState", state);
  //   socket.emit("auction_state", state);

  // };

  const updateState = (state) => {
    setAuctionState(state);
    localStorage.setItem("auctionState", state);
    socket.emit("auction_state", state);

    if (state === "BREAK") {
      console.log("📤 Emitting teams on BREAK");
      socket.emit("teams_update", teams);
    }
  };


  /* ---------- NAV ---------- */
  const goNext = () => {
    setPlayersState((prev) => {
      const nextIndex = Math.min(prev.currentIndex + 1, prev.players.length - 1);
      const updated = { ...prev, currentIndex: nextIndex };
      persistPlayers(updated);
      socket.emit("auction_update", updated);
      return updated;
    });
  };

  const goPrev = () => {
    setPlayersState((prev) => {
      const updated = {
        ...prev,
        currentIndex: Math.max(prev.currentIndex - 1, 0)
      };
      persistPlayers(updated);
      socket.emit("auction_update", updated);
      return updated;
    });
  };

  /* ---------- BIDDING ---------- */
  const increaseBid = (amt) => {
    if (currentPlayer.status === "SOLD") return;

    const base = getBasePrice(currentPlayer.details);
    const limit = maxBid ?? Infinity;

    setPlayersState((prev) => {
      const playersCopy = prev.players.map((p, i) => {
        if (i !== prev.currentIndex) return p;

        const nextBid = Math.max(base, (p.currentBid || base) + amt);

        // GLOBAL MAX BID CHECK
        if (nextBid > limit) return p;

        return { ...p, currentBid: nextBid };
      });

      const updated = { ...prev, players: playersCopy };
      localStorage.setItem("playersState", JSON.stringify(updated));
      socket.emit("auction_update", updated);
      return updated;
    });
  };


  const decreaseBid = (amt) => {
    if (currentPlayer.status === "SOLD") return;

    const base = getBasePrice(currentPlayer.details);

    setPlayersState((prev) => {
      const playersCopy = prev.players.map((p, i) =>
        i === prev.currentIndex
          ? {
            ...p,
            currentBid: Math.max(base, p.currentBid - amt)
          }
          : p
      );

      const updated = { ...prev, players: playersCopy };
      persistPlayers(updated);
      socket.emit("auction_update", updated);
      return updated;
    });
  };



  /* ---------- SOLD ---------- */
  const sellPlayer = () => {
    if (!selectedTeam) return alert("Please select a team");

    const teamIndex = teams.findIndex((t) => t.name === selectedTeam);
    if (teamIndex === -1) return alert("Invalid team");

    const price = currentPlayer.currentBid;
    if (!price || price <= 0) return alert("Start bidding first");
    if (teams[teamIndex].budget < price)
      return alert("Not enough budget");

    const playersCopy = players.map((p, i) =>
      i === currentIndex
        ? { ...p, status: "SOLD", soldTo: selectedTeam, soldPrice: price }
        : p
    );

    const teamsCopy = teams.map((t, i) =>
      i === teamIndex
        ? {
          ...t,
          budget: t.budget - price,
          players: [...t.players, { name: currentPlayer.name, price }]
        }
        : t
    );

    const updatedPlayers = { ...playersState, players: playersCopy };
    setPlayersState(updatedPlayers);
    setTeams(teamsCopy);
    persistPlayers(updatedPlayers);
    persistTeams(teamsCopy);
    socket.emit("teams_update", teamsCopy);

    socket.emit("auction_update", updatedPlayers);
    setSelectedTeam("");
  };

  /* ---------- UNSOLD ---------- */
  const markUnsold = () => {
    const base = getBasePrice(currentPlayer.details);

    const playersCopy = players.map((p, i) =>
      i === currentIndex
        ? {
          ...p,
          status: "UNSOLD",
          currentBid: base,
          soldTo: null,
          soldPrice: null
        }
        : p
    );

    const updated = { ...playersState, players: playersCopy };
    setPlayersState(updated);
    persistPlayers(updated);
    socket.emit("auction_update", updated);
  };


  /* ---------- UNDO SOLD ---------- */
  const undoSold = () => {
    if (currentPlayer.status !== "SOLD") return;

    const teamIndex = teams.findIndex((t) => t.name === currentPlayer.soldTo);
    if (teamIndex === -1) return;

    const teamsCopy = teams.map((t, i) =>
      i === teamIndex
        ? {
          ...t,
          budget: t.budget + currentPlayer.soldPrice,
          players: t.players.filter(
            (p) => p.name !== currentPlayer.name
          )
        }
        : t
    );

    const playersCopy = players.map((p, i) =>
      i === currentIndex
        ? { ...p, status: "LIVE", soldTo: null, soldPrice: null }
        : p
    );

    const updated = { ...playersState, players: playersCopy };
    setTeams(teamsCopy);
    setPlayersState(updated);
    persistTeams(teamsCopy);
    socket.emit("teams_update", teamsCopy);

    persistPlayers(updated);
    socket.emit("auction_update", updated);
  };

  /* ---------- JSX ---------- */
  return (
    <div style={page}>
      <div style={container}>
        <h1>Organizer Live</h1>

        <div style={topBar}>
          <button
            onClick={() => {
              updateState("BREAK");      // this controls viewers
              navigate("/organizer/teams");
            }}
            style={teamsBtn}
          >
            Teams
          </button>

        </div>


        <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
          <button onClick={() => updateState("LIVE")}>LIVE</button>
          <button onClick={() => updateState("BREAK")}>BREAK</button>
          <button onClick={() => updateState("ENDED")}>END</button>
        </div>

        <div style={{ marginTop: "15px", marginBottom: "16px" }}>
          <label style={{ color: "#d1d5db", fontWeight: "bold" }}>
            Max Bid (Global):&nbsp;
          </label>

          <input
            type="number"
            min="0"
            value={maxBid ?? ""}
            placeholder="No limit"
            onChange={(e) => {
              const value = e.target.value === "" ? null : Number(e.target.value);

              setMaxBid(value);
              localStorage.setItem("maxBid", value ?? "");
              socket.emit("max_bid_update", value);
            }}
            style={{
              width: "140px",
              padding: "6px",
              borderRadius: "6px"
            }}
          />
        </div>


        <hr />

        <button onClick={goPrev}>⬅ Prev</button>
        <button onClick={goNext} style={{ marginLeft: "10px" }}>
          Next ➡
        </button>

        <hr />

        <img
          src={getPlayerPhoto(currentPlayer.details) || fallbackPhoto}
          alt="player"
          style={{ width: "300px", borderRadius: "8px" }}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = fallbackPhoto;
          }}
        />


        <h2>{currentPlayer.name}</h2>

        <div style={{ marginTop: "10px", color: "#d1d5db" }}>
          {auctionConfig?.selectedFields?.map((field) => (
            <p key={field}>
              <strong>{field}:</strong>{" "}
              {currentPlayer.details?.[field] ?? "-"}
            </p>
          ))}
        </div>

        <h3>{currentPlayer.currentBid}</h3>


        {bidSteps.map((b) => (
          <button
            key={b}
            onClick={() => increaseBid(b)}
            disabled={maxBid != null && currentPlayer.currentBid >= maxBid}
            style={{
              opacity:
                maxBid != null && currentPlayer.currentBid >= maxBid ? 0.4 : 1,
              cursor:
                maxBid != null && currentPlayer.currentBid >= maxBid
                  ? "not-allowed"
                  : "pointer"
            }}
          >
            +{b}
          </button>
        ))}



        {bidSteps.map((b) => (
          <button key={`d${b}`} onClick={() => decreaseBid(b)}>
            −{b}
          </button>
        ))}

        <br /><br />

        {/* TEAM DROPDOWN */}
        <select
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
          style={{ padding: "10px", borderRadius: "6px", marginRight: "10px" }}
        >
          <option value="">Select Team</option>
          {teams.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name} ({t.budget})
            </option>
          ))}
        </select>

        <button
          onClick={sellPlayer}
          disabled={currentPlayer.status === "SOLD"}
          style={{
            opacity: currentPlayer.status === "SOLD" ? 0.5 : 1,
            cursor: currentPlayer.status === "SOLD" ? "not-allowed" : "pointer"
          }}
        >
          SOLD
        </button>


        {currentPlayer.status === "SOLD" && (
          <button onClick={undoSold} style={{ marginLeft: "10px" }}>
            UNDO SOLD
          </button>
        )}

        <button onClick={markUnsold} style={{ marginLeft: "10px" }}>
          UNSOLD
        </button>
      </div>
    </div>
  );
}

/* ---------- STYLES ---------- */
const page = {
  minHeight: "100vh",
  background: "#0b132b",
  display: "flex",
  justifyContent: "center",
  paddingTop: "40px"
};

const topBar = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "20px"
};

const teamsBtn = {
  padding: "8px 14px",
  borderRadius: "6px",
  background: "#1f2937",
  color: "#fff",
  border: "1px solid #374151",
  cursor: "pointer"
};

const container = {
  width: "100%",
  maxWidth: "600px",
  textAlign: "center"
};

export default OrganizerLive;
