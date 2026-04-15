import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import { Lock, CheckCircle } from "lucide-react";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Reset failed");
      }

      setSuccess(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={page}>
        <div style={card}>
          <CheckCircle size={60} color="#10b981" style={{ marginBottom: "20px" }} />
          <h1 style={{ margin: 0, fontSize: "28px", color: "#f3f4f6" }}>Password Reset!</h1>
          <p style={{ color: "#9ca3af", marginTop: "12px", marginBottom: "24px" }}>
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button onClick={() => navigate("/login")} style={btnStyle}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page}>
      <div style={card}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <Lock size={48} color="#3b82f6" style={{ marginBottom: "10px" }} />
          <h1 style={{ margin: 0, fontSize: "28px", color: "#f3f4f6" }}>Set New Password</h1>
          <p style={{ color: "#9ca3af", marginTop: "8px" }}>
            Enter your new password below
          </p>
        </div>

        {error && (
          <div style={errorBanner}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            style={inputStyle}
          />
          <button type="submit" disabled={loading} style={btnStyle}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

const page = {
  minHeight: "calc(100vh - 70px)",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  background: "transparent",
  padding: "20px"
};

const card = {
  background: "#111827",
  border: "1px solid #374151",
  borderRadius: "16px",
  padding: "40px",
  width: "100%",
  maxWidth: "400px",
  boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
  textAlign: "center"
};

const inputStyle = {
  padding: "12px 15px",
  borderRadius: "8px",
  border: "1px solid #4b5563",
  background: "#1f2937",
  color: "#fff",
  fontSize: "16px"
};

const btnStyle = {
  padding: "14px",
  marginTop: "10px",
  borderRadius: "8px",
  border: "none",
  background: "linear-gradient(135deg, #2563eb, #9333ea)",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "bold",
  cursor: "pointer",
  boxShadow: "0 4px 15px rgba(126, 34, 206, 0.4)"
};

const errorBanner = {
  background: "rgba(239, 68, 68, 0.1)",
  color: "#ef4444",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  textAlign: "center",
  marginBottom: "15px"
};

export default ResetPassword;
