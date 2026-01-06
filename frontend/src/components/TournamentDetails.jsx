import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";

function TournamentDetails() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    // Fetch tournament
    
    fetch(`http://localhost:3000/tournaments/${id}`,
      {credentials: "include"}
    )
      .then(res => {
        if (!res.ok) throw new Error("Tournament not found");
        return res.json();
      })
      .then(async (data) => {
        setTournament(data.tournament);
        setCanEdit(data.canEdit);
        
        if (data.tournament.participants.length > 0) {
          const usersRes = await fetch("http://localhost:3000/users/by-ids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: data.tournament.participants })
          });
          const usersData = await usersRes.json();
          setParticipants(usersData);
        }
      })
      .catch(console.error);
  }, [id]);

  const handleJoinTournament = async () => {
    try {
      const res = await fetch(`http://localhost:3000/tournaments/${id}/join`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) throw new Error("Failed to join tournament");

      const updatedTournament = await res.json();
      setTournament(updatedTournament);
      
      // Refresh participants
      const usersRes = await fetch("http://localhost:3000/users/by-ids", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: updatedTournament.participants })
      });
      const usersData = await usersRes.json();
      setParticipants(usersData);
    } catch (err) {
      console.error(err);
      alert(err.message);
    }
  };

  if (!tournament) return <p>Loading...</p>;

  return (
    <div>
      <a href="/">Back to Tournaments</a>
      <h2>{tournament.name}</h2>
      
      <Link to={`/tournaments/${id}/edit`}>
        <button disabled={!canEdit}>Edit Tournament</button>
      </Link>

      <p>Date: {tournament.time}</p>
      <p>Organizer: {tournament.organizer}</p>
      <p>Discipline: {tournament.discipline}</p>
      <p>Max Participants: {tournament.maxParticipants}</p>
      
      <h3>Participants:</h3>
      {participants.map((participant) => (
        <p key={participant._id}>
          {participant.name} {participant.surname}
        </p>
      ))}

      <button onClick={handleJoinTournament}>Join Tournament</button>
    </div>
  );
}

export default TournamentDetails;