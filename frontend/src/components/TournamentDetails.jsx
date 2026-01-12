// TournamentDetails.jsx
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import "./bracket.css";

function TournamentDetails() {
  const { id } = useParams();
  const [tournament, setTournament] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [bracket, setBracket] = useState([]);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`http://localhost:3000/tournaments/${id}`, { credentials: "include" })
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
          
          setParticipants(data.tournament.participants.map(p => {
            const user = usersData.find(u => u._id === p.userId);
            return {
              ...p,
              userName: user ? `${user.name} ${user.surname}` : 'Unknown User'
            };
          }));
        }

        if (data.tournament.bracket?.length > 0) {
          const allPlayerIds = [];
          data.tournament.bracket.forEach(round => {
            round.matches.forEach(match => {
              if (match.player1) allPlayerIds.push(match.player1);
              if (match.player2) allPlayerIds.push(match.player2);
              if (match.winner) allPlayerIds.push(match.winner);
            });
          });
          
          const uniqueIds = [...new Set(allPlayerIds)];
          
          if (uniqueIds.length > 0) {
            const bracketUsersRes = await fetch("http://localhost:3000/users/by-ids", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ids: uniqueIds })
            });
            const bracketUsersData = await bracketUsersRes.json();
            
            setBracket(data.tournament.bracket.map(round => ({
              ...round,
              matches: round.matches.map(match => {
                const p1 = bracketUsersData.find(u => u._id === match.player1);
                const p2 = bracketUsersData.find(u => u._id === match.player2);
                const w = bracketUsersData.find(u => u._id === match.winner);
                
                return {
                  ...match,
                  player1Name: p1 ? `${p1.name} ${p1.surname}` : null,
                  player2Name: p2 ? `${p2.name} ${p2.surname}` : null,
                  winnerName: w ? `${w.name} ${w.surname}` : null
                };
              })
            })));
          }
        }
      })
      .catch(console.error);
  }, [id]);

  const handleGenerateBracket = async () => {
    if (!confirm("Generate tournament bracket? This will create a single-elimination tournament.")) return;

    try {
      const res = await fetch(`http://localhost:3000/tournaments/${id}/generate-bracket`, {
        method: "POST",
        credentials: "include"
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate bracket");
      }
      window.location.reload();
    } catch (err) {
      setError(err.message);
    }
  };

  const getRoundName = (roundNumber, totalRounds) => {
    const roundsFromEnd = totalRounds - roundNumber;
    if (roundsFromEnd === 0) return "Finals";
    if (roundsFromEnd === 1) return "Semi-Finals";
    if (roundsFromEnd === 2) return "Quarter-Finals";
    return `Round ${roundNumber}`;
  };

  const calculateBracketPositions = (bracket) => {
    const matchHeight = 70, matchWidth = 220, roundGap = 280;
    const positions = [], roundLabels = [];

    bracket.forEach((round, roundIndex) => {
      const verticalSpacing = Math.pow(2, roundIndex + 1) * matchHeight;
      const startY = verticalSpacing / 2 - matchHeight / 2;

      roundLabels.push({
        name: getRoundName(round.roundNumber, bracket.length),
        x: roundIndex * roundGap
      });

      round.matches.forEach((match, matchIndex) => {
        const y = startY + matchIndex * verticalSpacing;
        positions.push({
          ...match,
          roundIndex,
          matchIndex,
          x: roundIndex * roundGap,
          y,
          width: matchWidth,
          height: matchHeight,
          centerY: y + matchHeight / 2
        });
      });
    });

    return { positions, roundLabels };
  };

  const calculateConnectingLines = (positions) => {
    const lines = [];
    
    positions.forEach((match, idx) => {
      if (match.roundIndex >= bracket.length - 1) return;
      
      const nextRoundMatches = positions.filter(m => m.roundIndex === match.roundIndex + 1);
      const nextMatch = nextRoundMatches[Math.floor(match.matchIndex / 2)];
      
      if (nextMatch) {
        const x1 = match.x + match.width;
        const x2 = x1 + 30;
        
        lines.push({ x1, y1: match.centerY, x2, y2: match.centerY, key: `h1-${idx}` });
        
        const siblingIndex = match.matchIndex % 2 === 0 ? match.matchIndex + 1 : match.matchIndex - 1;
        const sibling = positions.find(m => m.roundIndex === match.roundIndex && m.matchIndex === siblingIndex);
        
        if (sibling && match.matchIndex % 2 === 0) {
          lines.push({ x1: x2, y1: match.centerY, x2, y2: sibling.centerY, key: `v-${idx}` });
        }
        
        lines.push({ x1: x2, y1: nextMatch.centerY, x2: nextMatch.x, y2: nextMatch.centerY, key: `h2-${idx}` });
      }
    });
    
    return lines;
  };

  const bracketData = bracket.length > 0 ? calculateBracketPositions(bracket) : { positions: [], roundLabels: [] };
  const lines = bracketData.positions.length > 0 ? calculateConnectingLines(bracketData.positions) : [];
  
  const containerHeight = bracketData.positions.length > 0 
    ? Math.max(...bracketData.positions.map(m => m.y + m.height)) + 100 
    : 400;
  const containerWidth = bracketData.positions.length > 0 ? (bracket.length * 280) + 220 : 800;

  if (!tournament) return <p>Loading...</p>;

  return (
    <div className="tournament-details">
      <a href="/">Back to Tournaments</a>
      <h2>{tournament.name}</h2>
      
      {error && <div className="error">{error}</div>}
      
      <div className="actions">
        <Link to={`/tournaments/${id}/edit`}>
          <button disabled={!canEdit}>Edit Tournament</button>
        </Link>
        <Link to={`/tournaments/application/${id}`}>
          <button>Apply to Tournament</button>
        </Link>
      </div>

      <div className="tournament-info">
        <p><strong>Date:</strong> {new Date(tournament.time).toLocaleString()}</p>
        <p><strong>Organizer:</strong> {tournament.organizer}</p>
        <p><strong>Discipline:</strong> {tournament.discipline}</p>
        <p><strong>Max Participants:</strong> {tournament.maxParticipants}</p>
        <p><strong>Current Participants:</strong> {participants.length}/{tournament.maxParticipants}</p>
      </div>
      
      <h3>Participants:</h3>
      {participants.length === 0 ? (
        <p>No participants yet</p>
      ) : (
        <ul>
          {participants.map((p, i) => (
            <li key={p.userId || i}>
              <strong>{p.userName}</strong> - License: {p.licenseNumber}
              {p.ranking && ` | Ranking: ${p.ranking}`}
            </li>
          ))}
        </ul>
      )}

      <hr />

      <h3>Tournament Bracket:</h3>
      {canEdit && (!tournament.bracket || tournament.bracket.length === 0) && (
        <button onClick={handleGenerateBracket}>Generate Bracket</button>
      )}
      {bracket.length === 0 ? (
        <p>No bracket generated yet</p>
      ) : (
        <div className="bracket-scroll">
          <div className="bracket-container" style={{ height: `${containerHeight}px`, width: `${containerWidth}px` }}>
            <svg className="bracket-lines">
              {lines.map(line => (
                <line
                  key={line.key}
                  x1={line.x1}
                  y1={line.y1 + 50}
                  x2={line.x2}
                  y2={line.y2 + 50}
                  stroke="#999"
                  strokeWidth="2"
                />
              ))}
            </svg>

            {bracketData.roundLabels.map((label, idx) => (
              <div key={`label-${idx}`} className="round-label" style={{ left: `${label.x}px` }}>
                {label.name}
              </div>
            ))}

            {bracketData.positions.map((match, idx) => (
              <div
                key={idx}
                className={`match-box ${match.winner ? 'completed' : ''}`}
                style={{ left: `${match.x}px`, top: `${match.y + 50}px`, width: `${match.width}px`, height: `${match.height}px` }}
              >
                <div className={`player ${match.winner === match.player1 ? 'winner' : ''}`}>
                  <span className="player-name">{match.player1Name || "TBD"}</span>
                  {match.submission_player1 !== null && (
                    <span className="score">{match.submission_player1}</span>
                  )}
                </div>
                
                <div className={`player ${match.winner === match.player2 ? 'winner' : ''}`}>
                  <span className="player-name">{match.player2Name || "TBD"}</span>
                  {match.submission_player2 !== null && (
                    <span className="score">{match.submission_player2}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default TournamentDetails;