import React, { useState } from 'react';
import { useParams } from "react-router-dom";
import axios from 'axios';


export default function TournamentApplication() {
    const { id } = useParams();
    const [licenseNumber, setLicenseNumber] = useState('');
    const [ranking, setRanking] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`http://localhost:3000/tournaments/${id}/join`, {
                method: "POST",
                credentials: "include",
                headers: { 
                    "Content-Type": "application/json" 
                },
                body: JSON.stringify({
                    licenseNumber,
                    ranking
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to join tournament');
            }

            const updatedTournament = await response.json();
            setMessage('Application submitted successfully!');
            setLicenseNumber('');
            setRanking('');
            
            // Optionally redirect after successful join
            setTimeout(() => {
                window.location.href = `/tournaments/${id}`;
            }, 100);
        } catch (error) {
            setMessage(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="tournament-application">
            <h1>Tournament Application</h1>
            <form onSubmit={handleSubmit}>
                <div>
                    <label>License Number:</label>
                    <input
                        type="text"
                        value={licenseNumber}
                        onChange={(e) => setLicenseNumber(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Ranking:</label>
                    <input
                        type="number"
                        value={ranking}
                        onChange={(e) => setRanking(e.target.value)}
                        required
                    />
                </div>
                <button type="submit" disabled={loading}>
                    {loading ? 'Submitting...' : 'Apply'}
                </button>
            </form>
            {message && <p>{message}</p>}
        </div>
    );
}