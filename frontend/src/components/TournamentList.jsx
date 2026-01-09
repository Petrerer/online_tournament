import { useEffect, useState } from "react"
import { Link } from "react-router-dom";

function TournamentList() {
  const [tournaments, setTournaments] = useState([])
  const [users, setUsers] = useState([])
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchTerm])
  
  useEffect(() => {
    const searchParam = debouncedSearch ? `&search=${debouncedSearch}` : ""
    fetch(`http://localhost:3000/tournaments?page=${currentPage}&limit=10${searchParam}`)
      .then(res => res.json())
      .then(data => {
        setTournaments(data.tournaments)
        setTotalPages(data.pagination.totalPages)
      })
  }, [currentPage, debouncedSearch])

  useEffect(() => {
    fetch("http://localhost:3000/users")
      .then(res => res.json())
      .then(data => setUsers(data))
  }, [])

  const tournamentsWithOrganizers = tournaments.map(t => {
    const organizer = users.find(u => u._id === t.organizer)
    return {
      ...t,
      organizer: organizer ? `${organizer.name} ${organizer.surname}` : "Unknown"
    }
  })

  return (
    <div>
      <h1>Tournaments</h1>
      
      <Link to="/tournaments/create">
        <button>Create New Tournament</button>
      </Link>

      <div style={{ margin: "20px 0" }}>
        <input
          type="text"
          placeholder="Search tournaments..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "8px", width: "300px" }}
        />
      </div>

      {tournamentsWithOrganizers.map(t => (
        <div key={t._id}>
          {t.name} – {t.organizer} - <a href={`/tournaments/${t._id}`}>Details</a>
        </div>
      ))}

      {totalPages > 1 && (
        <div style={{ marginTop: "20px" }}>
          <button 
            onClick={() => setCurrentPage(p => p - 1)} 
            disabled={currentPage === 1}
          >
            Previous
          </button>

          {[...Array(totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => setCurrentPage(i + 1)}
              style={{
                margin: "0 5px",
                fontWeight: currentPage === i + 1 ? "bold" : "normal"
              }}
            >
              {i + 1}
            </button>
          ))}

          <button 
            onClick={() => setCurrentPage(p => p + 1)} 
            disabled={currentPage === totalPages}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TournamentList