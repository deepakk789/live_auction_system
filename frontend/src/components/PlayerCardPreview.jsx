import "../styles/card.css";

function PlayerCardPreview({ selectedFields }) {
  return (
    <div className="player-card">
      {/* Photo */}
      <div className="player-photo">
        <img
          src=""
          alt="Player"
          onError={(e) => {
            e.target.src =
              "https://cdn-icons-png.flaticon.com/512/861/861512.png";
          }}
        />
      </div>

      {/* Name */}
      <h2 className="player-name">PLAYER NAME</h2>

      {/* Other fields */}
      <div className="player-details">
        {selectedFields.map((field) => (
          <div key={field} className="detail-row">
            <span className="label">{field}:</span>
            <span className="value">Sample Value</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default PlayerCardPreview;
