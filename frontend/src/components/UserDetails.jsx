import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";

function UserDetails() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submissionValues, setSubmissionValues] = useState({});

  useEffect(() => {
    setLoading(true);
    fetch(`http://localhost:3000/users/me`, {
      credentials: "include"
    })
      .then(res => {
        if (!res.ok) throw new Error("User not found");
        return res.json();
      })
      .then(async (userdata) => {
        setUser(userdata);

        if (userdata.tournamentsParticipation && userdata.tournamentsParticipation.length > 0) {
          const tournamentsRes = await fetch(
            "http://localhost:3000/tournaments/by-ids",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: userdata.tournamentsParticipation })
            }
          );

          if (!tournamentsRes.ok) {
            throw new Error("Failed to fetch tournaments");
          }

          const tournamentsData = await tournamentsRes.json();
          setTournaments(tournamentsData);
        }
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [id]);

  const getUserMatch = (tournament) => {
    if (!tournament.bracket || tournament.bracket.length === 0) return null;
    
    // Search through all rounds for an active match for this user
    for (const round of tournament.bracket) {
      const match = round.matches.find(m =>
        !m.winner && (m.player1 === user._id || m.player2 === user._id)
      );
      if (match) return match;
    }
    
    return null;
  };

  const hasUserSubmitted = (match) => {
    if (!match) return true;
    if (match.player1 === user._id) {
      return match.submission_player1 !== null;
    }
    if (match.player2 === user._id) {
      return match.submission_player2 !== null;
    }
    return true;
  };

  const isUserEliminated = (tournament) => {
    if (!tournament.bracket || tournament.bracket.length === 0) return false;
    
    // Check if user lost any match
    for (const round of tournament.bracket) {
      for (const match of round.matches) {
        if (match.winner && 
            (match.player1 === user._id || match.player2 === user._id) &&
            match.winner !== user._id) {
          return true;
        }
      }
    }
    return false;
  };

  const handleSubmissionChange = (tournamentId, value) => {
    setSubmissionValues({
      ...submissionValues,
      [tournamentId]: value
    });
  };

  const handleSubmit = async (tournamentId) => {
    const value = submissionValues[tournamentId];
    if (value !== 0 && value !== 1) {
      alert("Please enter 0 or 1");
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/tournaments/${tournamentId}/submit-result`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ result: value })
      });

      if (!res.ok) throw new Error("Failed to submit result");

      const updatedTournament = await res.json();
      
      setTournaments(tournaments.map(t => 
        t._id === tournamentId ? updatedTournament : t
      ));

      setSubmissionValues({
        ...submissionValues,
        [tournamentId]: ""
      });

      alert("Result submitted successfully!");
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <p>Loading...</p>;

  if (error) return (
    <div>
      <a href="/">Back</a>
      <div style={{ color: "red" }}>{error}</div>
    </div>
  );

  return (
    <div>
      <h2>User Details</h2>

      <p><strong>Name:</strong> {user.name} {user.surname}</p>
      <p><strong>Email:</strong> {user.email}</p>

      <hr />

      <h3>Tournaments</h3>

      {tournaments.length === 0 ? (
        <p>User is not registered in any tournaments</p>
      ) : (
        <ul>
          {tournaments.map(tournament => {
            const myMatch = getUserMatch(tournament);
            const needsSubmission = myMatch && !hasUserSubmitted(myMatch);
            const eliminated = isUserEliminated(tournament);

            return (
              <li key={tournament._id}>
                <strong>{tournament.name}</strong>
                {eliminated && (
                  <span style={{ color: "red", marginLeft: "10px" }}>
                    (Eliminated)
                  </span>
                )}
                <br />
                <Link to={`/tournaments/${tournament._id}`}>
                  View Tournament
                </Link>

                {needsSubmission && (
                  <div style={{ marginTop: "10px" }}>
                    <label>
                      Submit your result (0 for loss, 1 for win):{" "}
                      <input
                        type="number"
                        min="0"
                        max="1"
                        value={submissionValues[tournament._id] || ""}
                        onChange={(e) => handleSubmissionChange(tournament._id, parseInt(e.target.value))}
                      />
                    </label>
                    <button onClick={() => handleSubmit(tournament._id)}>
                      Submit
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default UserDetails;