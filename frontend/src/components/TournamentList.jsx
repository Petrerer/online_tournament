import { useEffect, useState } from "react"
import { Link } from "react-router-dom";

function TournamentList() {
  const [tournaments, setTournaments] = useState([])
  const [users, setUsers] = useState([])
  
  useEffect(() => {
    fetch("http://localhost:3000/tournaments")
        .then(res => res.json())
        .then(data => setTournaments(data))
    }, [])

  useEffect(() => {
    fetch("http://localhost:3000/users")
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  // Map organizer IDs to names
  const tournamentsWithOrganizers = tournaments.map(t => {
    const organizer = users.find(u => u._id === t.organizer);
    return {
      ...t,
      organizer: organizer ? `${organizer.name} ${organizer.surname}` : "Unknown"
    };
  });


  return (
    <div>
      <h1>Tournaments</h1>
      <Link to="/tournaments/create">
        <button>Create New Tournament</button>
      </Link>

      {tournamentsWithOrganizers.map(t => (
        <div key={t._id}>
          {t.name} – {t.organizer} - <a href={`/tournaments/${t._id}`}>Details</a>
        </div>
      ))}
    </div>
  )
}

export default TournamentList
