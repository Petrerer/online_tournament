import { useEffect, useState } from "react"

function TournamentList() {
  const [tournaments, setTournaments] = useState([])

  useEffect(() => {
    fetch("http://localhost:3000/tournaments")
        .then(res => res.json())
        .then(data => setTournaments(data))
    }, [])


  return (
    <div>
      <h2>Tournaments</h2>

      {tournaments.map(t => (
        <div key={t._id}>
          {t.name} – {t.organizer} - <a href={`/tournaments/${t._id}`}>Details</a>
        </div>
      ))}
    </div>
  )
}

export default TournamentList
