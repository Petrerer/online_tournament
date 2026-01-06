import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function TournamentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    time: "",
    organizer: "",
    discipline: "",
    maxParticipants: ""
  });
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:3000/tournaments/${id}`, {
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) throw new Error("Tournament not found");
        return res.json();
      })
      .then(data => {
        setTournament(data.tournament);
        
        // Check if user can edit
        if (!data.canEdit) {
          alert("You don't have permission to edit this tournament");
          navigate(`/tournaments/${id}`);
          return;
        }
        
        // Pre-fill form with existing data
        setFormData({
          name: data.tournament.name,
          time: data.tournament.time.split('T')[0], // Format date for input
          discipline: data.tournament.discipline,
          maxParticipants: data.tournament.maxParticipants
        });
      })
      .catch(err => {
        console.error(err);
        setError(err.message);
      });
  }, [id, navigate]);

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
      const res = await fetch(`http://localhost:3000/tournaments/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update tournament");
      }

      alert("Tournament updated successfully!");
      navigate(`/tournaments/${id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this tournament?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/tournaments/${id}`, {
        method: "DELETE",
        credentials: "include"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete tournament");
      }

      alert("Tournament deleted successfully!");
      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!tournament) return <p>Loading...</p>;

  return (
    <div>
      <a href={`/tournaments/${id}`}>Back to Tournament</a>
      <h2>Edit Tournament</h2>

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
          <label>Date:</label>
          <input
            type="date"
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
            min="1"
            required
          />
        </div>

        <button type="submit">Save Changes</button>
        <button type="button" onClick={() => navigate(`/tournaments/${id}`)}>
          Cancel
        </button>
      </form>

      <hr />
      <button onClick={handleDelete} style={{ color: "red" }}>
        Delete Tournament
      </button>
    </div>
  );
}

export default TournamentEdit;