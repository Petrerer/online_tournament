const mongoose = require("mongoose");
const dotenv = require("dotenv");
const Tournament = require("../models/Tournament");
const connectDB = require("./db");

dotenv.config();

const tournaments = [
  {
    name: "City Chess Championship 1",
    discipline: "Chess",
    organizer: "695b96dac4e9059e6b81a116",
    time: new Date("2024-09-15T10:00:00"),
    location: "123 Main St, Hometown",
    maxParticipants: 50,
    applicationDeadline: new Date("2024-09-01T23:59:59"),
    sponsorLogos: [],
    participants: []
  },
  {
    name: "City Chess Championship 2",
    discipline: "Chess",
    organizer: "695b96dac4e9059e6b81a116",
    time: new Date("2024-09-15T10:00:00"),
    location: "123 Main St, Hometown",
    maxParticipants: 50,
    applicationDeadline: new Date("2024-09-01T23:59:59"),
    sponsorLogos: [],
    participants: []
  },
  {
    name: "City Chess Championship 3",
    discipline: "Chess",
    organizer: "695b96dac4e9059e6b81a116",
    time: new Date("2024-09-15T10:00:00"),
    location: "123 Main St, Hometown",
    maxParticipants: 50,
    applicationDeadline: new Date("2024-09-01T23:59:59"),
    sponsorLogos: [],
    participants: []
  }
];

const seedTournaments = async () => {
  try {
    console.log("Connecting to database...");
    await connectDB();

    console.log("Clearing tournaments...");
    await Tournament.deleteMany({});

    console.log("Inserting tournaments...");
    await Tournament.insertMany(tournaments);

    console.log("Tournaments seeded successfully!");
  } catch (err) {
    console.error("Seeder error:", err);
  } finally {
    await mongoose.connection.close();
  }
};

seedTournaments();
