import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BACKEND_URL } from "../services/socket";
import { useAuth } from "../context/AuthContext";
import { Shield, Mail, ArrowLeft, LogIn, UserPlus, Eye, EyeOff, Home } from "lucide-react";
import "../styles/design-system.css";

function AuthPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, register } = useAuth();
  const isRegisterParam = location.pathname === "/register";

  const [isRegister, setIsRegister] = useState(isRegisterParam);
  const [formData, setFormData] = useState({ username: "", email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (isRegister) {
      if (formData.username.trim().length < 3) {
        return setError("Username must be at least 3 characters.");
      }
      if (formData.password.length < 6) {
        return setError("Password must be at least 6 characters.");
      }
      if (formData.password !== formData.confirmPassword) {
        return setError("Passwords do not match.");
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register(formData.username, formData.email, formData.password);
      } else {
        await login(formData.email, formData.password);
      }
      navigate("/");
    } catch (err) {
      setError(err.message === "Failed to fetch" ? "Backend unavailable" : err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotMsg(null);
    setForgotLoading(true);

    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      setForgotMsg({ type: "success", text: data.message });
    } catch (err) {
      setForgotMsg({ type: "error", text: err.stack ? "Backend unavailable" : err.message });
    } finally {
      setForgotLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // --- Forgot Password View ---
  if (showForgotPassword) {
    return (
      <div style={styles.pageContainer} className="animate-fade-in">
        <div className="glass-panel stagger-1" style={styles.authCard}>
          
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <div style={styles.iconCircle}>
              <Mail size={32} color="#3b82f6" />
            </div>
            <h1 style={styles.heading}>Reset Password</h1>
            <p style={styles.subtext}>Enter your email to receive a reset link</p>
          </div>

          {forgotMsg && (
            <div style={{
              ...styles.errorBanner,
              ...(forgotMsg.type === "success" ? styles.successBanner : {})
            }}>
              {forgotMsg.text}
            </div>
          )}

          <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div>
              <label style={styles.label}>Email Address</label>
              <input
                className="input-premium"
                type="email"
                placeholder="Enter your registered email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <button className="btn-premium" type="submit" disabled={forgotLoading}>
              {forgotLoading ? "Sending..." : "Send Reset Link"}
            </button>
          </form>

          <button className="btn-glass" style={{ width: "100%", marginTop: "20px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }} onClick={() => setShowForgotPassword(false)}>
            <ArrowLeft size={16} /> Back to Sign In
          </button>
        </div>
      </div>
    );
  }

  // --- Login / Register View ---
  return (
    <div style={styles.pageContainer} className="animate-fade-in">
      <div className="glass-panel stagger-1" style={styles.authCard}>
        
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={styles.iconCircle}>
            <Shield size={32} color="#8b5cf6" />
          </div>
          <h1 style={styles.heading}>{isRegister ? "Create Account" : "Welcome Back"}</h1>
          <p style={styles.subtext}>
            {isRegister ? "Register to start hosting amazing auctions" : "Sign in to manage your live auctions"}
          </p>
        </div>

        {error && <div style={styles.errorBanner}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {isRegister && (
            <div>
              <label style={styles.label}>Username</label>
              <input
                className="input-premium"
                type="text"
                name="username"
                placeholder="Choose a username"
                value={formData.username}
                onChange={handleChange}
                required
              />
            </div>
          )}

          <div>
            <label style={styles.label}>Email Address</label>
            <input
              className="input-premium"
              type="email"
              name="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <label style={styles.label}>Password</label>
              {!isRegister && (
                <span 
                  style={{ color: "#3b82f6", fontSize: "0.85rem", cursor: "pointer" }}
                  onClick={() => setShowForgotPassword(true)}
                  className="hover-underline"
                >
                  Forgot Password?
                </span>
              )}
            </div>
            <div style={{ position: "relative" }}>
              <input
                className="input-premium"
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                style={{ width: "100%", paddingRight: "40px" }}
                required
              />
              <button
                type="button"
                style={styles.eyeIcon}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex="-1"
              >
                {showPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label style={styles.label}>Confirm Password</label>
              <div style={{ position: "relative" }}>
                <input
                  className="input-premium"
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  style={{ width: "100%", paddingRight: "40px" }}
                  required
                />
                <button
                  type="button"
                  style={styles.eyeIcon}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff size={18} color="#9ca3af" /> : <Eye size={18} color="#9ca3af" />}
                </button>
              </div>
            </div>
          )}

          <button className="btn-premium" type="submit" disabled={loading} style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", marginTop: "10px" }}>
             {loading ? <div className="spinner-small"></div> : (isRegister ? <><UserPlus size={20}/> Register</> : <><LogIn size={20}/> Sign In</>)}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: "30px" }}>
          <p style={{ color: "#9ca3af" }}>
            {isRegister ? "Already have an account?" : "Don't have an account?"}
            <span
              style={{ color: "#60a5fa", fontWeight: "bold", marginLeft: "8px", cursor: "pointer" }}
              onClick={() => {
                setIsRegister(!isRegister);
                setError(null);
                setFormData({ username: "", email: "", password: "", confirmPassword: "" });
                setShowPassword(false);
                setShowConfirmPassword(false);
              }}
            >
              {isRegister ? "Sign In" : "Register Now"}
            </span>
          </p>
        </div>

        {/* Home button */}
        <button
          className="btn-glass"
          style={{ width: "100%", marginTop: "15px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
          onClick={() => navigate("/")}
        >
          <Home size={18} /> Back to Home
        </button>
      </div>
    </div>
  );
}

const styles = {
  pageContainer: {
    minHeight: "calc(100vh - 60px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "40px 20px"
  },
  authCard: {
    width: "100%",
    maxWidth: "450px",
    padding: "50px 40px",
  },
  iconCircle: {
    width: "60px",
    height: "60px",
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    margin: "0 auto 20px"
  },
  heading: {
    margin: 0,
    fontSize: "2.2rem",
    fontWeight: 800,
    letterSpacing: "-0.5px"
  },
  subtext: {
    color: "#94a3b8",
    marginTop: "10px",
    fontSize: "1.05rem"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    color: "#cbd5e1",
    fontSize: "0.95rem",
    fontWeight: 600
  },
  errorBanner: {
    background: "rgba(239, 68, 68, 0.1)",
    border: "1px solid #ef4444",
    color: "#ef4444",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "25px",
    textAlign: "center",
    fontWeight: 600
  },
  successBanner: {
    background: "rgba(16, 185, 129, 0.1)",
    border: "1px solid #10b981",
    color: "#10b981"
  },
  eyeIcon: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }
};

export default AuthPage;
