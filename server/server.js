const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
require("dotenv").config();
const connectDB = require("./database/db");
const { initScheduler } = require("./utils/tournamentScheduler");

const tournamentRoutes = require("./routes/tournaments");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");

const app = express();

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

const startServer = async () => {
  try {
    await connectDB();
    console.log("Database connected");
    
    const count = await initScheduler();
    console.log(`Tournament scheduler initialized for ${count} tournaments`);
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Error starting server:", error);
    process.exit(1);
  }
};

startServer();