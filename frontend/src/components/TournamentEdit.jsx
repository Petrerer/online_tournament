import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function TournamentEdit() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    time: "",
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
      .then(async (data) => {
        setTournament(data.tournament);
        
        if (!data.canEdit) {
          navigate(`/tournaments/${id}`);
          return;
        }
        
        const tournamentDate = new Date(data.tournament.time);
        const formattedTime = tournamentDate.toISOString().slice(0, 16);
        
        setFormData({
          name: data.tournament.name,
          time: formattedTime,
          discipline: data.tournament.discipline,
          maxParticipants: data.tournament.maxParticipants
        });

        if (data.tournament.participants.length > 0) {
          const userIds = data.tournament.participants.map(p => p.userId);
          
          const usersRes = await fetch("http://localhost:3000/users/by-ids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: userIds })
          });
          const usersData = await usersRes.json();
          
          const enrichedParticipants = data.tournament.participants.map(p => {
            const user = usersData.find(u => u._id === p.userId);
            return {
              ...p,
              userName: user ? `${user.name} ${user.surname}` : 'Unknown User',
              userEmail: user?.email
            };
          });
          
          setParticipants(enrichedParticipants);
        }
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

  const handleRemoveParticipant = async (userId) => {
    if (!confirm("Are you sure you want to remove this participant?")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/tournaments/${id}/remove-participant`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to remove participant");
      }

      setParticipants(participants.filter(p => p.userId !== userId));
      setTournament({
        ...tournament,
        participants: tournament.participants.filter(p => p.userId !== userId)
      });

    } catch (err) {
      setError(err.message);
    }
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

      navigate("/");
    } catch (err) {
      setError(err.message);
    }
  };

  if (!tournament) return <p>Loading...</p>;

  return (
    <div>
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
            min="1"
            required
          />
        </div>

        <div>
          <label>Participants:</label>
          <p>{participants.length} / {tournament.maxParticipants} participants registered</p>
          
          {participants.length === 0 ? (
            <p>No participants yet</p>
          ) : (
            participants.map((participant, index) => (
              <div key={participant.userId || index}>
                <span>
                  <strong>{participant.userName}</strong>
                  {participant.userEmail && ` (${participant.userEmail})`}
                  <br />
                  License: {participant.licenseNumber}
                  {participant.ranking && ` | Ranking: ${participant.ranking}`}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveParticipant(participant.userId)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
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