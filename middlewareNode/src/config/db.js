const mongoose = require("mongoose");
const config = require("config");
const crypto = require("crypto");
let db = config.get("mongoURI");

/**
 * Seed initial test users into the database
 */
const seedTestUsers = async () => {
  try {
    const db = mongoose.connection.db;

    // 1. Seed Users
    const usersCollection = db.collection("users");
    const count = await usersCollection.countDocuments({ username: { $in: ["mentor", "student"] } });
    let studentId;
    
    const defaultLessonsCompleted = [
      "Piece Checkmate 1 Basic checkmates",
      "Checkmate Pattern 1 Recognize the patterns",
      "Checkmate Pattern 2 Recognize the patterns",
      "Checkmate Pattern 3 Recognize the patterns",
      "Checkmate Pattern 4 Recognize the patterns",
      "Piece checkmates 2 Challenging checkmates",
      "Knight and Bishop Mate interactive lesson",
      "The Pin Pin it to win it",
      "The Skewer Yum - Skewers!",
      "The Fork Use the fork, Luke",
      "Discovered Attacks Including discovered checks",
      "Double Check A very powerfull tactic",
      "Overloaded Pieces They have too much work",
      "Zwischenzug In-between moves",
      "X-Ray Attacking through an enemy piece",
      "Zugzwang Being forced to move",
      "Interference Interpose a piece to great effect",
      "Greek Gift Study the greek gift scrifice",
      "Deflection Distracting a defender",
      "Attraction Lure a piece to bad square",
      "Underpromotion Promote - but not to a queen!",
      "Desperado A piece is lost, but it can still help",
      "Counter Check Respond to a check with a check",
      "Undermining Remove the defending piece",
      "Clearance Get out of the way!",
      "Key Squares Reach the key square",
      "Opposition take the opposition",
      "7th-Rank Rook Pawn Versus a Queen",
      "7th-Rank Rook Pawn And Passive Rook vs Rook",
      "Basic Rook Endgames Lucena and Philidor"
    ].map(piece => ({ piece, lessonNumber: 0 }));

    if (count === 0) {
      console.log("Seeding test users into the database...");
      const mentorPassword = crypto.createHash("sha384").update("123123123").digest("hex");
      const mentor = {
        username: "mentor",
        password: mentorPassword,
        firstName: "Test",
        lastName: "Mentor",
        email: "mentor@test.com",
        role: "mentor",
        mentorshipUsername: "student",
        accountCreatedAt: new Date().toLocaleString(),
        timePlayed: 0
      };

      const studentPassword = crypto.createHash("sha384").update("123123123").digest("hex");
      const student = {
        username: "student",
        password: studentPassword,
        firstName: "Test",
        lastName: "Student",
        email: "student@test.com",
        role: "student",
        mentorshipUsername: "mentor",
        accountCreatedAt: new Date().toLocaleString(),
        timePlayed: 0,
        lessonsCompleted: defaultLessonsCompleted
      };

      const mentorResult = await usersCollection.insertOne(mentor);
      const studentResult = await usersCollection.insertOne(student);
      studentId = studentResult.insertedId;
      console.log("✅ Test users seeded successfully!");
    } else {
      const studentDoc = await usersCollection.findOne({ username: "student" });
      if (studentDoc) {
        studentId = studentDoc._id;
      }
    }

    // 2. Seed activityTypes
    const activityTypesCollection = db.collection("activityTypes");
    const activityTypesCount = await activityTypesCollection.countDocuments({});
    if (activityTypesCount === 0) {
      console.log("Seeding mock activityTypes...");
      const mockActivityTypes = [
        { _id: "Solve 3 puzzles", type: "puzzle" },
        { _id: "Play 1 game", type: "game" },
        { _id: "Complete 1 lesson", type: "lesson" },
        { _id: "Checkmate with a Rook", type: "checkmate" },
        { _id: "Solve a hard puzzle", type: "puzzle" }
      ];
      await activityTypesCollection.insertMany(mockActivityTypes);
      console.log("✅ Activity types seeded successfully!");
    }

    // 3. Seed activities for student
    if (studentId) {
      const activitiesCollection = db.collection("activities");
      const activitiesCount = await activitiesCollection.countDocuments({ userId: studentId });
      if (activitiesCount === 0) {
        console.log("Seeding mock activities for student...");
        const studentActivities = {
          userId: studentId,
          activities: [
            { name: "Solve 3 puzzles", type: "puzzle", completed: false },
            { name: "Play 1 game", type: "game", completed: false },
            { name: "Complete 1 lesson", type: "lesson", completed: false },
            { name: "Checkmate with a Rook", type: "checkmate", completed: false }
          ],
          completedDates: []
        };
        await activitiesCollection.insertOne(studentActivities);
        console.log("✅ Student activities seeded successfully!");
      }
    }

    // 4. Seed newLessons
    const lessonsCollection = db.collection("newLessons");
    const lessonsCount = await lessonsCollection.countDocuments({});
    if (lessonsCount === 0) {
      console.log("Seeding mock newLessons...");
      const pieces = [
        "pawn",
        "Piece Checkmate 1 Basic checkmates",
        "The Pin Pin it to win it",
        "The Skewer Yum - Skewers!",
        "The Fork Use the fork, Luke",
        "Discovered Attacks Including discovered checks",
        "Double Check A very powerfull tactic",
        "Overloaded Pieces They have too much work",
        "Zwischenzug In-between moves",
        "X-Ray Attacking through an enemy piece",
        "Zugzwang Being forced to move",
        "Interference Interpose a piece to great effect",
        "Greek Gift Study the greek gift scrifice",
        "Deflection Distracting a defender",
        "Attraction Lure a piece to bad square",
        "Underpromotion Promote - but not to a queen!",
        "Desperado A piece is lost, but it can still help",
        "Counter Check Respond to a check with a check",
        "Undermining Remove the defending piece",
        "Clearance Get out of the way!",
        "Key Squares Reach the key square",
        "Opposition take the opposition",
        "7th-Rank Rook Pawn Versus a Queen",
        "7th-Rank Rook Pawn And Passive Rook vs Rook",
        "Basic Rook Endgames Lucena and Philidor"
      ];
      const mockLessonsDocs = pieces.map(pieceName => ({
        piece: pieceName,
        lessons: [
          {
            startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            name: "Introduction",
            info: `Welcome to the ${pieceName} lesson! Let's get started.`,
            solution: "e2e4",
            goal: 1,
            opponentConstraints: [],
            maxMoves: 10,
            moves: []
          },
          {
            startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
            name: "Challenge",
            info: `Solve the ${pieceName} tactical challenge.`,
            solution: "d2d4",
            goal: 1,
            opponentConstraints: [],
            maxMoves: 10,
            moves: []
          }
        ]
      }));
      await lessonsCollection.insertMany(mockLessonsDocs);
      console.log("✅ Mock lessons seeded successfully!");
    }

    // 5. Seed puzzles
    const puzzlesCollection = db.collection("puzzles");
    const puzzlesCount = await puzzlesCollection.countDocuments({});
    if (puzzlesCount === 0) {
      console.log("Seeding mock puzzles...");
      const mockPuzzles = [];
      for (let i = 1; i <= 25; i++) {
        mockPuzzles.push({
          puzzleId: `mock_${i}`,
          FEN: "r3k2r/ppp2ppp/2n5/1B1p4/3P4/2P5/PP3PPP/R3K2R w KQkq - 0 1",
          moves: "e1g1 e8g8",
          rating: 1000 + i * 50,
          popularity: 90,
          nbPlays: 100,
          themes: "crushing middlegame short",
          gameUrl: `https://lichess.org/mock_${i}`,
          openingTags: "Queens Pawn Game",
          // Support both casing styles
          Moves: "e1g1 e8g8",
          Themes: "crushing middlegame short",
          Rating: 1000 + i * 50
        });
      }
      await puzzlesCollection.insertMany(mockPuzzles);
      console.log("✅ Mock puzzles seeded successfully!");
    }
  } catch (err) {
    console.error("Failed to seed mock data:", err.message);
  }
};

/**
 * Establishes connection to MongoDB database
 * Exits process if connection fails
 */
/**
 * Creates compound indexes on timeTrackings collection for analytics query performance.
 * Background:true so existing data isn't locked during creation.
 * Safe to call on every startup — MongoDB is idempotent for existing indexes.
 */
async function ensureIndexes() {
  try {
    const tt = mongoose.connection.collection("timeTrackings");
    await tt.createIndex({ username: 1, startTime: -1 }, { background: true });
    await tt.createIndex({ startTime: -1 },               { background: true });
    await tt.createIndex({ eventType: 1, startTime: -1 }, { background: true });

    const users = mongoose.connection.collection("users");
    await users.createIndex({ role: 1 },    { background: true });
    await users.createIndex({ zipcode: 1 }, { background: true });

    // Leaderboard filter indexes — compound with role since /leaderboard
    // always filters on role: "student" alongside these.
    await users.createIndex({ role: 1, country: 1 }, { background: true });
    await users.createIndex({ role: 1, state: 1 },   { background: true });
    await users.createIndex({ role: 1, school: 1 },  { background: true });

    console.log("Analytics indexes ensured");
  } catch (err) {
    console.error("Index creation warning:", err.message);
  }
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";

const connectDB = async () => {
  try {
    const target = new URL(
      db.replace("mongodb+srv://", "https://").replace("mongodb://", "http://")
    );
    console.log(
      `[boot] env=${process.env.NODE_ENV || "undefined"} db_host=${target.hostname}${target.pathname}`
    );
  } catch (_) {
    console.log(
      `[boot] env=${process.env.NODE_ENV || "undefined"} db_host=<unparsable URI>`
    );
  }

  try {
    console.log(`Connecting to MongoDB...`);
    await mongoose.connect(db, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Production has no fallback (a failure here calls process.exit(1)),
      // so it gets a longer timeout to ride out a network blip or an Atlas
      // cold-start during deploy. Dev/test fail fast to the in-memory
      // fallback below.
      serverSelectionTimeoutMS: IS_PRODUCTION ? 10000 : 1000,
    });
    console.log("MongoDB Connected...");
    await ensureIndexes();

    if (!IS_PRODUCTION) {
      await seedTestUsers();
    }
  } catch (err) {
    console.warn(`Connection to configured MongoDB failed: ${err.message}`);

    if (IS_PRODUCTION) {
      console.error(
        "Refusing to fall back to in-memory MongoDB in production. Exiting."
      );
      process.exit(1);
    }

    console.warn("Starting local in-memory MongoDB server as fallback...");
    try {
      const { MongoMemoryServer } = require("mongodb-memory-server");
      const mongoServer = await MongoMemoryServer.create({
        binary: {
          version: "4.4.26"
        }
      });
      const localURI = mongoServer.getUri();
      console.log(`Connecting to in-memory MongoDB...`);
      await mongoose.connect(localURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB Connected (In-Memory)...");
      await ensureIndexes();
      await seedTestUsers();
    } catch (fallbackErr) {
      console.error("In-memory MongoDB startup failed:", fallbackErr.message);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
