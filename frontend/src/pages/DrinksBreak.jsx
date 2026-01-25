import { useEffect, useState } from "react";
import socket from "../services/socket";

function DrinksBreak({ readOnly = false }) {
  const [teams, setTeams] = useState([]);

  useEffect(() => {
    console.log("🍹 DrinksBreak mounted — requesting teams");

    const savedTeams = JSON.parse(localStorage.getItem("teamsState"));
    setTeams(savedTeams);


    socket.emit("request_teams");

    socket.on("teams_update", (data) => {
      console.log("📥 Viewer received teams data:", data);
      setTeams(data);
      localStorage.setItem("teamsState", JSON.stringify(data));
    });

    return () => {
      socket.off("teams_update");
    };
  }, []);


  if (!teams.length) {
    return <h2 style={{ textAlign: "center" }}>No team data available</h2>;
  }

  return (
    <div style={{ padding: "30px" }}>
      <h1 style={{ textAlign: "center", marginBottom: "30px" }}>
        🍹 Drinks Break — Auction Summary
      </h1>

      {teams.map((team) => {
        const totalSpent = team.players.reduce(
          (sum, p) => sum + p.price,
          0
        );

        return (
          <div
            key={team.name}
            style={{
              marginBottom: "30px",
              padding: "20px",
              border: "1px solid #374151",
              borderRadius: "8px"
            }}
          >
            <h2>{team.name}</h2>

            <p><strong>Total Spent:</strong> {totalSpent}</p>
            <p><strong>Remaining Budget:</strong> {team.budget}</p>

            {team.players.length === 0 ? (
              <p style={{ color: "#9ca3af" }}>No players bought</p>
            ) : (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  marginTop: "15px"
                }}
              >
                <thead>
                  <tr>
                    <th style={th}>#</th>
                    <th style={th}>Player Name</th>
                    <th style={th}>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {team.players.map((player, index) => (
                    <tr key={index}>
                      <td style={td}>{index + 1}</td>
                      <td style={td}>{player.name}</td>
                      <td style={td}>{player.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}

const th = {
  border: "1px solid #374151",
  padding: "10px",
  background: "#111827",
  textAlign: "left"
};

const td = {
  border: "1px solid #374151",
  padding: "10px"
};

export default DrinksBreak;
