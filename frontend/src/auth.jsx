import { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext(null);
const API_URL = "http://localhost:3000";

// API functions
const api = {
  async call(endpoint, options = {}) {
    const res = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  },
  
  register: (name, surname, email, password) => 
    api.call("/auth/register", { 
      method: "POST", 
      body: JSON.stringify({ name, surname, email, password }) 
    }),
    
  login: (email, password) => 
    api.call("/auth/login", { 
      method: "POST", 
      body: JSON.stringify({ email, password }) 
    }),
  
  logout: () => 
    api.call("/auth/logout", { method: "POST" }),
  
  getMe: () => 
    api.call("/auth/me")
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.getMe()
      .then(data => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);
  
  const register = async (name, surname, email, password) => {
    const data = await api.register(name, surname, email, password);
    return data;
  };
  
  const login = async (email, password) => {
    const data = await api.login(email, password);
    setUser(data.user);
    return data;
  };
  
  const logout = async () => {
    await api.logout();
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, register, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

export { api };