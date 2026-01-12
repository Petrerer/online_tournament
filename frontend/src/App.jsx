import { Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import TournamentDetails from "./components/TournamentDetails.jsx";
import TournamentList from "./components/TournamentList.jsx";
import TournamentEdit from "./components/TournamentEdit.jsx";
import TournamentCreate from "./components/TournamentCreate.jsx";
import TournamentApplication from "./components/TournamentApplication.jsx";
import UserDetails from "./components/UserDetails.jsx";
import VerifyEmail from "./components/VerifyEmail.jsx";
import ForgotPassword from "./components/ForgotPassword.jsx";
import ResetPassword from "./components/ResetPassword.jsx";

function AppContent() {
  const { user, loading, logout } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return (
      <>
        <Link to="/login">Login</Link>{" | "}
        <Link to="/register">Register</Link>

        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email/:token" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
        </Routes>
      </>
    );
  }

  return (
    <>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
      <a href={`/`}>Home</a>
      <a href={`/details`} style={{ marginLeft: "10px" }}>My Matches</a>

      <Routes>
        <Route path="/" element={<TournamentList />} />
        <Route path="/tournaments/:id" element={<TournamentDetails />} />
        <Route path="/tournaments/:id/edit" element={<TournamentEdit />} />
        <Route path="/tournaments/create" element={<TournamentCreate />} />
        <Route path="/tournaments/application/:id" element={<TournamentApplication />} />
        <Route path="/details" element={<UserDetails />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;