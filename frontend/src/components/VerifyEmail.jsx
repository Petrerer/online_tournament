import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

function VerifyEmail() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Verifying...");

  useEffect(() => {
    fetch(`http://localhost:3000/auth/verify-email/${token}`)
      .then(res => res.json())
      .then(data => {
        setMessage(data.message || data.error);
        if (!data.error) {
          setTimeout(() => navigate("/login"), 3000);
        }
      })
      .catch(() => setMessage("Verification failed"));
  }, [token, navigate]);

  return <div><h2>{message}</h2></div>;
}

export default VerifyEmail;