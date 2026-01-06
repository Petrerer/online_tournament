import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";

function Register() {
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    
    try {
      await register(name, surname, email, password);
      alert("Registration successful! Please login.");
      navigate("/login");
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Register</h2>
      {error && <div style={{ color: "red" }}>{error}</div>}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        required
        minLength={3}
      />
      <input
        type="text"
        value={surname}
        onChange={(e) => setSurname(e.target.value)}
        placeholder="Surname"
        required
        minLength={3}
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min 8 chars)"
        required
        minLength={8}
      />
      <button type="submit">Register</button>
    </form>
  );
}

export default Register;