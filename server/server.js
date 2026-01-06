const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./database/db"); // Add this

const tournamentRoutes = require("./routes/tournaments");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");

const app = express();

// Connect to MongoDB
connectDB(); // Add this

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

// Routes
app.use("/auth", authRoutes);
app.use("/tournaments", tournamentRoutes);
app.use("/users", userRoutes);

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});