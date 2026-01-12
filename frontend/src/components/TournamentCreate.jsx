import { useState } from "react";
import { useNavigate } from "react-router-dom";

function TournamentCreate() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: "",
    time: "",
    discipline: "",
    maxParticipants: ""
  });
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await fetch("http://localhost:3000/tournaments", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create tournament");
      }

      const data = await res.json();
      navigate(`/`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <h2>Create New Tournament</h2>

      {error && <div style={{ color: "red" }}>{error}</div>}

      <form onSubmit={handleSubmit}>
        <div>
          <label>Name:</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Date & Time:</label>
          <input
            type="datetime-local"
            name="time"
            value={formData.time}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Discipline:</label>
          <input
            type="text"
            name="discipline"
            value={formData.discipline}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label>Max Participants:</label>
          <input
            type="number"
            name="maxParticipants"
            value={formData.maxParticipants}
            onChange={handleChange}
            min="2"
            required
          />
        </div>

        <button type="submit">Create Tournament</button>
        <button type="button" onClick={() => navigate("/")}>
          Cancel
        </button>
      </form>
    </div>
  );
}

export default TournamentCreate;