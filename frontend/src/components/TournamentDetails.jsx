import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";

function TournamentDetails() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [pairings, setPairings] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
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
        setCanEdit(data.canEdit);
        
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
              userName: user?.name || user?.email || 'Unknown User'
            };
          });
          
          setParticipants(enrichedParticipants);
        }

        // Handle pairings if they exist
        if (data.tournament.pairings && data.tournament.pairings.length > 0) {
          const allPlayerIds = [];
          data.tournament.pairings.forEach(pairing => {
            if (pairing.player1) allPlayerIds.push(pairing.player1);
            if (pairing.player2) allPlayerIds.push(pairing.player2);
            if (pairing.winner) allPlayerIds.push(pairing.winner);
          });
          
          const uniqueIds = [...new Set(allPlayerIds)];
          
          if (uniqueIds.length > 0) {
            const pairingUsersRes = await fetch("http://localhost:3000/users/by-ids", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: uniqueIds })
            });
            const pairingUsersData = await pairingUsersRes.json();
            
            const enrichedPairings = data.tournament.pairings.map(pairing => {
              const player1Data = pairingUsersData.find(u => u._id === pairing.player1);
              const player2Data = pairingUsersData.find(u => u._id === pairing.player2);
              const winnerData = pairingUsersData.find(u => u._id === pairing.winner);
              
              return {
                ...pairing,
                player1Name: player1Data ? `${player1Data.name} ${player1Data.surname}` : 'Unknown',
                player2Name: player2Data ? `${player2Data.name} ${player2Data.surname}` : 'BYE',
                winnerName: winnerData ? `${winnerData.name} ${winnerData.surname}` : null
              };
            });
            
            setPairings(enrichedPairings);
          }
        }
      })
      .catch(console.error);
  }, [id]);

  const handleGeneratePairings = async () => {
    if (!confirm("Generate random pairings for this tournament? This will overwrite existing pairings.")) {
      return;
    }

    try {
      const res = await fetch(`http://localhost:3000/tournaments/${id}/generate-pairings`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate pairings");
      }

      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!tournament) return <p>Loading...</p>;

  // Group pairings by round
  const pairingsByRound = pairings.reduce((acc, pairing) => {
    const round = pairing.round || 1;
    if (!acc[round]) acc[round] = [];
    acc[round].push(pairing);
    return acc;
  }, {});

  return (
    <div>
      <a href="/">Back to Tournaments</a>
      <h2>{tournament.name}</h2>
      
      {error && <div style={{ color: "red" }}>{error}</div>}
      
      <Link to={`/tournaments/${id}/edit`}>
        <button disabled={!canEdit}>Edit Tournament</button>
      </Link>

      <p>Date: {new Date(tournament.time).toLocaleString()}</p>
      <p>Organizer: {tournament.organizer}</p>
      <p>Discipline: {tournament.discipline}</p>
      <p>Max Participants: {tournament.maxParticipants}</p>
      <p>Current Participants: {participants.length}/{tournament.maxParticipants}</p>
      
      <h3>Participants:</h3>
      {participants.length === 0 ? (
        <p>No participants yet</p>
      ) : (
        <ul>
          {participants.map((participant, index) => (
            <li key={participant.userId || index}>
              <strong>{participant.userName}</strong>
              <br />
              License: {participant.licenseNumber}
              {participant.ranking && ` | Ranking: ${participant.ranking}`}
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h3>Match Pairings:</h3>
      {canEdit && (
        <button onClick={handleGeneratePairings} disabled={!canEdit} style={{ marginBottom: "10px" }}>
          Generate Random Pairings
        </button>
      )}

      {pairings.length === 0 ? (
        <p>No pairings generated yet</p>
      ) : (
        <div>
          {Object.keys(pairingsByRound).sort().map(round => (
            <div key={round} style={{ marginBottom: "20px" }}>
              <h4>Round {round}</h4>
              {pairingsByRound[round].map((pairing, index) => (
                <div key={index} style={{ 
                  padding: "10px", 
                  border: "1px solid #ccc", 
                  marginBottom: "10px",
                  backgroundColor: pairing.winner ? "#f0f0f0" : "white"
                }}>
                  <strong>Match {index + 1}:</strong>
                  <br />
                  {pairing.player1Name} vs {pairing.player2Name}
                  {pairing.winner && (
                    <div style={{ marginTop: "5px", color: "green" }}>
                      <strong>Winner: {pairing.winnerName}</strong>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <hr />

      <Link to={`/tournaments/application/${id}`}>
        <button>Apply to Tournament</button>
      </Link>
    </div>
  );
}

export default TournamentDetails;