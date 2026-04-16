import { createContext, useState, useEffect, useContext } from "react";
import { BACKEND_URL } from "../services/socket";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Validate the session on app mount
  useEffect(() => {
    const validateSession = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          localStorage.setItem("authUser", JSON.stringify(data.user));
        } else {
          // Token is invalid/expired
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          setUser(null);
        }
      } catch (err) {
        console.error("Session validation network error:", err);
        // On network error, we can optionally keep the user logged in locally
        const storedUser = localStorage.getItem("authUser");
        if (storedUser) setUser(JSON.parse(storedUser));
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (email, password) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        // Distinguish network error
        if (res.status === 502 || res.status === 503 || res.status === 504) {
             throw new Error("Backend unavailable");
        }
        throw new Error(data.error || "Login failed");
    }

    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const register = async (username, email, password) => {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
        if (res.status === 502 || res.status === 503 || res.status === 504) {
             throw new Error("Backend unavailable");
        }
        throw new Error(data.error || "Registration failed");
    }

    localStorage.setItem("authToken", data.token);
    localStorage.setItem("authUser", JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
