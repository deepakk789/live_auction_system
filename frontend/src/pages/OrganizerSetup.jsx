import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/organizer.css";

function OrganizerSetup() {
  const navigate = useNavigate();

  const [auctionName, setAuctionName] = useState("");
  const [teamCount, setTeamCount] = useState(2);
  const [teams, setTeams] = useState(["", ""]);
  const [maxBudget, setMaxBudget] = useState("");
  const [bidSteps, setBidSteps] = useState([10, 20, 50]);

  const handleTeamCountChange = (e) => {
    const count = Number(e.target.value);
    setTeamCount(count);
    setTeams(Array(count).fill(""));
  };

  const handleTeamNameChange = (index, value) => {
    const updated = [...teams];
    updated[index] = value;
    setTeams(updated);
  };

  const handleClear = () => {
    setAuctionName("");
    setTeamCount(2);
    setTeams(["", ""]);
    setMaxBudget("");
    setBidSteps([10, 20, 50]);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    /* ---------- VALIDATION ---------- */
    if (!auctionName.trim()) {
      alert("Enter auction name");
      return;
    }

    if (teams.some((t) => !t.trim())) {
      alert("Please enter all team names");
      return;
    }

    const budgetValue = Number(maxBudget);
    if (!budgetValue || budgetValue <= 0) {
      alert("Enter valid max budget per team");
      return;
    }

    /* ---------- AUCTION SETUP ---------- */
    const auctionSetup = {
      auctionName,
      teamCount,
      bidSteps,
      maxBudget: budgetValue
    };

    /* ---------- TEAMS STATE (SOURCE OF TRUTH) ---------- */
    const teamsState = teams.map((teamName) => ({
      name: teamName.trim(),
      budget: budgetValue,   // ✅ THIS IS THE MAX BUDGET INPUT
      players: []
    }));

    /* ---------- SAVE ---------- */
    localStorage.setItem("auctionSetup", JSON.stringify(auctionSetup));
    localStorage.setItem("teamsState", JSON.stringify(teamsState));

    /* ---------- NEXT STEP ---------- */
    navigate("/organizer/upload");
  };

  return (
    <div className="setup-container">
      <h1>Auction Setup</h1>

      <form onSubmit={handleSubmit} className="setup-form">
        <label>
          Auction Name
          <input
            type="text"
            value={auctionName}
            onChange={(e) => setAuctionName(e.target.value)}
            required
          />
        </label>

        <label>
          Number of Teams
          <input
            type="number"
            min="2"
            value={teamCount}
            onChange={handleTeamCountChange}
          />
        </label>

        <div className="teams-section">
          <h3>Team Names</h3>
          {teams.map((team, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Team ${i + 1}`}
              value={team}
              onChange={(e) =>
                handleTeamNameChange(i, e.target.value)
              }
              required
            />
          ))}
        </div>

        <label>
          Max Budget per Team
          <input
            type="number"
            value={maxBudget}
            onChange={(e) => setMaxBudget(e.target.value)}
            required
          />
        </label>

        <h3>Bid Increment Options</h3>

        <div style={{ display: "flex", gap: "10px" }}>
          {bidSteps.map((step, index) => (
            <input
              key={index}
              type="number"
              value={step}
              min="1"
              onChange={(e) => {
                const updated = [...bidSteps];
                updated[index] = Number(e.target.value);
                setBidSteps(updated);
              }}
              style={{ width: "80px" }}
            />
          ))}
        </div>

        <div className="button-row">
          <button
            type="button"
            className="clear-btn"
            onClick={handleClear}
          >
            Clear Details
          </button>

          <button type="submit" className="start-btn">
            Start Auction
          </button>
        </div>
      </form>
    </div>
  );
}

export default OrganizerSetup;
