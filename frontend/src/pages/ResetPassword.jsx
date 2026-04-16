import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import { Lock, CheckCircle, ShieldCheck } from "lucide-react";
import "../styles/design-system.css";

function ResetPassword() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // A very basic strength calculator
  const checkStrength = (pass) => {
    let score = 0;
    if (pass.length === 0) return 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return Math.min(score, 4);
  };

  const strength = checkStrength(newPassword);

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
      setError(err.message === "Failed to fetch" ? "Backend unavailable" : err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div style={page} className="animate-fade-in">
        <div className="glass-panel" style={card}>
          <CheckCircle size={60} color="#10b981" style={{ marginBottom: "20px" }} />
          <h1 style={heading}>Password Reset!</h1>
          <p style={subtext}>
            Your password has been successfully reset. You can now sign in with your new password.
          </p>
          <button onClick={() => navigate("/login")} className="btn-premium" style={{ width: "100%" }}>
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={page} className="animate-fade-in">
      <div className="glass-panel stagger-1" style={card}>
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <div style={iconCircle}>
            <Lock size={32} color="#3b82f6" />
          </div>
          <h1 style={heading}>Set New Password</h1>
          <p style={subtext}>
            Enter your new password below
          </p>
        </div>

        {error && (
          <div style={errorBanner}>{error}</div>
        )}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
          <div>
            <input
              type="password"
              placeholder="New Password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              className="input-premium"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
            {newPassword.length > 0 && (
              <div style={strengthContainer}>
                <div style={strengthBars}>
                  {[1, 2, 3, 4].map(level => (
                    <div
                      key={level}
                      style={{
                        ...strengthBar,
                        background: strength >= level 
                          ? (strength < 2 ? "#ef4444" : strength < 3 ? "#f59e0b" : "#10b981") 
                          : "#374151"
                      }}
                    />
                  ))}
                </div>
                <span style={strengthText}>
                  {strength < 2 ? "Weak" : strength < 4 ? "Good" : "Strong"}
                </span>
              </div>
            )}
          </div>
          <div>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="input-premium"
              style={{ width: "100%", boxSizing: "border-box" }}
            />
          </div>
          <button className="btn-premium" type="submit" disabled={loading} style={{ marginTop: "10px" }}>
            {loading ? <div className="spinner-small" style={{ margin: "auto" }}></div> : "Reset Password"}
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
  width: "100%",
  maxWidth: "400px",
  padding: "40px",
  textAlign: "center"
};

const iconCircle = {
  width: "60px",
  height: "60px",
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  margin: "0 auto 20px"
};

const heading = {
  margin: 0,
  fontSize: "2rem",
  fontWeight: 800,
  letterSpacing: "-0.5px"
};

const subtext = {
  color: "#9ca3af",
  marginTop: "10px",
  marginBottom: "24px",
  fontSize: "1rem"
};

const errorBanner = {
  background: "rgba(239, 68, 68, 0.1)",
  color: "#ef4444",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid rgba(239, 68, 68, 0.3)",
  textAlign: "center",
  marginBottom: "15px",
  fontWeight: 600
};

const strengthContainer = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: "8px",
  padding: "0 4px"
};

const strengthBars = {
  display: "flex",
  gap: "4px",
  flex: 1,
  marginRight: "10px"
};

const strengthBar = {
  height: "4px",
  flex: 1,
  borderRadius: "2px",
  transition: "background 0.3s ease"
};

const strengthText = {
  fontSize: "0.75rem",
  color: "#9ca3af",
  fontWeight: 600,
  width: "40px",
  textAlign: "right"
};

export default ResetPassword;
