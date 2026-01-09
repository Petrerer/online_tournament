import { Routes, Route, Link } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth";
import Register from "./components/Register.jsx";
import Login from "./components/Login.jsx";
import TournamentDetails from "./components/TournamentDetails.jsx";
import TournamentList from "./components/TournamentList.jsx";
import TournamentEdit from "./components/TournamentEdit.jsx";
import TournamentCreate from "./components/TournamentCreate.jsx";
import TournamentApplication from "./components/TournamentApplication.jsx";

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
        </Routes>
      </>
    );
  }

  return (
    <>
      <h1>Welcome, {user.name}</h1>
      <button onClick={logout}>Logout</button>
      <br></br>
      <a href={`/`}>Home</a>

      <Routes>
        <Route path="/" element={<TournamentList />} />
        <Route path="/tournaments/:id" element={<TournamentDetails />} />
        <Route path="/tournaments/:id/edit" element={<TournamentEdit />} />
        <Route path="/tournaments/create" element={<TournamentCreate />} />
        <Route path="/tournaments/application/:id" element={<TournamentApplication />} />
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