import { useState } from "react";
import * as XLSX from "xlsx";
import PlayerCardPreview from "../components/PlayerCardPreview";
import "../styles/organizer.css";
import { useNavigate, useParams } from "react-router-dom";
import socket, { BACKEND_URL } from "../services/socket";

function UploadPlayers() {
  const { auctionId } = useParams();
  const [file, setFile] = useState(null);
  const [columns, setColumns] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [parsedPlayers, setParsedPlayers] = useState([]);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (
      !selectedFile.name.endsWith(".xlsx") &&
      !selectedFile.name.endsWith(".xls")
    ) {
      alert("Please upload an Excel (.xlsx) file");
      return;
    }

    setFile(selectedFile);
    setColumns([]);
    setSelectedFields([]);
  };

  const handleReadColumns = () => {
    if (!file) {
      alert("Please upload the Excel file first");
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

      // Extract columns
      const headers = Object.keys(jsonData[0]);
      setColumns(headers);

      // Build players
      const players = jsonData.map((row, index) => {
        const photoKey = headers.find(h =>
          h.toLowerCase().includes("photo")
        );

        return {
          id: index,
          name: row["NAME"],
          photo: row[photoKey] || "",
          details: row,
          status: "UPCOMING",
          currentBid: 0,
          soldTo: null,
          soldPrice: null
        };
      });

      // Save players state
      setParsedPlayers(players);

    };

    reader.readAsArrayBuffer(file);
  };

  const addField = (field) => {
    if (!selectedFields.includes(field)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  const removableColumns = columns.filter(
    (col) =>
      col !== "NAME" &&
      !col.toLowerCase().includes("photo")
  );

  const proceedToLive = async () => {
    if (selectedFields.length === 0) {
      alert("Please select at least one field to show on player card");
      return;
    }

    const auctionConfig = {
      selectedFields,
      columns,
      uploadedFileName: file?.name || ""
    };

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${BACKEND_URL}/api/auction/upload-players`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ players: parsedPlayers, auctionConfig, auctionId })
      });
      
      if (!response.ok) throw new Error("Failed to upload players to DB");
      
      // Navigate to live with auctionId
      navigate(`/organizer/${auctionId}/live`);
    } catch (err) {
      console.error(err);
      alert("Error saving players: " + err.message);
    }
  };

  return (
    <div className="setup-container">
      <h1>Upload Player Data</h1>

      <label>
        Upload Excel File (.xlsx)
        <input type="file" accept=".xlsx,.xls" onChange={handleFileChange} />
      </label>

      {file && <p>📄 {file.name}</p>}

      <div className="button-row">
        <button className="clear-btn" onClick={() => setFile(null)}>
          Clear File
        </button>
        <button className="start-btn" onClick={handleReadColumns}>
          Read Columns
        </button>
      </div>

      {columns.length > 0 && (
        <>
          <h3 style={{ marginTop: "20px" }}>Add Fields to Player Card</h3>

          <select
            onChange={(e) => {
              addField(e.target.value);
              e.target.value = "";
            }}
            defaultValue=""
          >
            <option value="" disabled>
              + Add Field
            </option>
            {removableColumns
              .filter((col) => !selectedFields.includes(col))
              .map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
          </select>

          <PlayerCardPreview selectedFields={selectedFields} />
          <div className="button-row" style={{ marginTop: "20px" }}>
            <button className="start-btn" onClick={proceedToLive}>
              Proceed to Live Auction
            </button>
          </div>

        </>
      )}
    </div>
  );
}

export default UploadPlayers;
