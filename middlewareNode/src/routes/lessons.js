/**
 * Lessons Routes
 * 
 * API endpoints for managing chess lesson progress and content.
 * Handles both authenticated users and guests (tracked by IP).
 * 
 * Main Features:
 * - Get lesson completion counts by piece
 * - Retrieve lesson content
 * - Update user progress
 * - Support for guest users (non-logged-in visitors)
 */

const config = require("config");
const express = require('express');
const passport = require("passport");
const router = express.Router();
const jwt = require('jsonwebtoken');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const mongoose = require("mongoose");

// Cache database client to prevent repeated connections
let cachedClient = null;

/**
 * Gets database client, creating connection if needed
 * @returns {MongoDB.Db} Database instance
 */
async function getDb() {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return mongoose.connection.db;
  }
  if (!cachedClient) {
    cachedClient = new MongoClient(config.get("mongoURI"));
    await cachedClient.connect();
  }
  return cachedClient.db("ystem");
}

/**
 * Development/testing endpoint for database operations
 * Currently used for manual data verification
 */
router.get(
  "/stick",
  async (req, res) => {
    const db = await getDb();
    const lessons = db.collection("newLessons");
    const doc = await lessons.findOne({ piece: "Undermining Remove the defending piece" });
    res.json(doc);


    // for (const item of list) {
    //   const { name, list: fenList } = item;
    //   const doc = await lessons.findOne({ piece: name });
    //   if (!doc) {
    //     console.log(`Not found in DB: ${name}`);
    //     continue;
    //   }

    //   if (!doc.lessons || doc.lessons.length !== fenList.length) {
    //     console.log(`Lesson count mismatch: ${name}`);
    //     continue;
    //   }
    //   const updatedLessons = doc.lessons.map((lesson, index) => ({
    //     ...lesson,
    //     endFen: fenList[index],
    //   }));

    //   await lessons.updateOne(
    //     { _id: doc._id },
    //     { $set: { lessons: updatedLessons } }
    //   );
    // }

    // res.json("successful!");
  }
)

/**
 * GET /lessons/getCompletedLessonCount
 * 
 * Returns the number of lessons completed for a specific chess piece.
 * Works for both authenticated users and guests (tracked by IP).
 * 
 * Query Parameters:
 * - piece: Chess piece name (e.g., 'pawn', 'The Pin Pin it to win it')
 * 
 * Example: `${environment.urls.middlewareURL}/lessons/getCompletedLessonCount?piece=pawn`
 */
router.get(
  "/getCompletedLessonCount",
  async (req, res, next) => {
    passport.authenticate("jwt", { session: false }, async (err, user) => {
      req.user = user || null;
      next();
    })(req, res, next) // authenticate jwt
  },
  async (req, res) => {
    try {
      const piece = req.query.piece ? decodeURIComponent(req.query.piece) : null;
      if (!piece) {
        return res.status(400).json("Error: 400. Please provide a piece.");
      }
      const db = await getDb();
      const users = db.collection("users"); // get users collection

      if (req.user) {
        const { username } = req.user; // get username from jwt

        const userDoc = await users.findOne( // get the userDoc according to username
          { username: username },
          { projection: { lessonsCompleted: 1 } }
        );
        if (!userDoc) throw new Error("User does not exist");
        if (!userDoc.lessonsCompleted) throw new Error("User does not have lesson record");

        // the number of lessons completed for the piece
        const entry = userDoc.lessonsCompleted.find(e => e.piece === piece);
        const lessonNum = entry ? (Number(entry.lessonNumber) || 0) : 0;
        return res.json(lessonNum);

      } else {
        // guest: always return 0 (frontend will show all lessons)
        return res.json(0);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /lessons/getTotalPieceLesson
 * 
 * Returns the total number of lessons available for a chess piece.
 * Used to determine progress percentage (completed / total).
 * 
 * Query Parameters:
 * - piece: Chess piece name
 * 
 * Example: `${environment.urls.middlewareURL}/lessons/getTotalPieceLesson?piece=pawn`
 */
router.get(
  "/getTotalPieceLesson",
  async (req, res, next) => {
    passport.authenticate("jwt", { session: false }, async (err, user, info) => {
      req.user = user || null;
      next();
    })(req, res, next) // authenticate jwt
  },
  async (req, res) => {
    const piece = decodeURIComponent(req.query.piece); // get the chess piece
    if (!piece) {
      return res.status(400).json("Error: 400. Please provide a piece.");
    }

    try {
      const db = await getDb();
      const lessons = db.collection("newLessons"); // get lessons collection
      const lessonDoc = await lessons.findOne({ piece: piece }); // all lessons for that piece

      res.json(lessonDoc.lessons.length); // respond with length of lessons
    } catch (err) {
      console.error(err);
      res.status(500).json("Internal server error.");
    }
  }
);

/**
 * GET /lessons/getLesson
 * 
 * Retrieves the content for a specific lesson.
 * Lesson numbers are 1-indexed (first lesson is lessonNum=1).
 * 
 * Query Parameters:
 * - piece: Chess piece name
 * - lessonNum: Lesson number (1-indexed)
 * 
 * Example: `${environment.urls.middlewareURL}/lessons/getLesson?piece=pawn&lessonNum=1`
 */
router.get(
  "/getLesson",
  async (req, res, next) => {
    passport.authenticate("jwt", { session: false }, async (err, user, info) => {
      req.user = user || null;
      next();
    })(req, res, next) // authenticate jwt
  },
  async (req, res) => {
    // get piece & lessonNum from query
    const piece = decodeURIComponent(req.query.piece);
    const lessonNum = Number(decodeURIComponent(req.query.lessonNum));
    if (!piece || isNaN(lessonNum)) {
      return res.status(400).json("Error: 400. Missing or invalid parameters.");
    }

    try {
      const db = await getDb();
      const lessons = db.collection("newLessons"); // get lessons collection
      const lessonDoc = await lessons.findOne({ piece: piece }); // get doc for the piece
      if (!lessonDoc) return res.status(400).json("Error: 400. Invalid piece.");;

      if (lessonNum <= 0 || lessonNum > lessonDoc.lessons.length) {
        return res.status(404).json("Lesson index out of range");
      } else {
        res.json(lessonDoc.lessons[lessonNum - 1]); // get the lesson at specific index
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /lessons/updateLessonCompletion
 * 
 * Updates user's lesson progress for a chess piece.
 * Only increments if new lesson number is higher than current progress.
 * 
 * Note: lessonNum represents CURRENT progress.
 * Passing lessonNum=0 updates progress to 1 (first lesson completed).
 * 
 * Query Parameters:
 * - piece: Chess piece name
 * - lessonNum: Current lesson number (will be incremented by 1)
 * 
 * Example: `${environment.urls.middlewareURL}/lessons/updateLessonCompletion?piece=pawn&lessonNum=0`
 */
router.get(
  "/updateLessonCompletion",
  async (req, res, next) => {
    passport.authenticate("jwt", { session: false }, async (err, user, info) => {
      req.user = user || null;
      next();
    })(req, res, next) // authenticate jwt
  },
  async (req, res) => {
    // get parameters from query
    const piece = decodeURIComponent(req.query.piece);
    const lessonNum = Number(decodeURIComponent(req.query.lessonNum));

    if (!piece || isNaN(lessonNum)) {
      return res.status(400).json("Error: 400. Missing or invalid parameters.");
    }
    try {
      const db = await getDb();
      const users = db.collection("users"); // get users collection
      const guests = db.collection("guest"); // get users collection

      if (req.user) {
        const { username } = req.user; // get username

        const userDoc = await users.findOne( // get userDoc by username
          { username: username },
          { projection: { lessonsCompleted: 1 } }
        );
        if (!userDoc) throw new Error("User does not exist");
        if (!userDoc.lessonsCompleted) throw new Error("User does not have lesson record");

        let index = -1; // index for that piece
        userDoc.lessonsCompleted.forEach((lesson, i) => { // try finding user's progress for that piece
          if (lesson.piece === piece) {
            index = i;
          }
        });

        if (index === -1) { // piece progress not found
          return res.status(404).json("Piece not found in lessonsCompleted");
        }

        const updateResult = await users.updateOne(
          {
            username,
            $or: [
              { [`lessonsCompleted.${index}.lessonNumber`]: { $lt: lessonNum + 1 } },
              { [`lessonsCompleted.${index}.lessonNumber`]: { $exists: false } }
            ]
          },
          {
            $set: {
              [`lessonsCompleted.${index}`]: {
                piece,
                lessonNumber: lessonNum + 1, // update only if new lesson number is greater
              },
            },
          }
        );

        // check if changes have been made in db
        if (updateResult.modifiedCount > 0) {
          res.status(200).json("Lesson progress updated");
        } else {
          res.status(304).json("No changes made");
        }
      } else {
        const clientIp = getClientIp(req);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await guests.updateOne(
          { ip: clientIp },
          {
            $set: {
              ip: clientIp,
              updatedAt: new Date(), // update date
              expiresAt, // update new expiration date
            },
            $setOnInsert: { // add lessonsCompleted field if ip is not stored before
              lessonsCompleted: [
                {
                  piece: 'Piece Checkmate 1 Basic checkmates',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 1 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 2 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 3 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 4 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Piece checkmates 2 Challenging checkmates',
                  lessonNumber: 0
                },
                {
                  piece: 'Knight and Bishop Mate interactive lesson',
                  lessonNumber: 0
                },
                { piece: 'The Pin Pin it to win it', lessonNumber: 0 },
                { piece: 'The Skewer Yum - Skewers!', lessonNumber: 0 },
                { piece: 'The Fork Use the fork, Luke', lessonNumber: 0 },
                {
                  piece: 'Discovered Attacks Including discovered checks',
                  lessonNumber: 0
                },
                { piece: 'Double Check A very powerfull tactic', lessonNumber: 0 },
                {
                  piece: 'Overloaded Pieces They have too much work',
                  lessonNumber: 0
                },
                { piece: 'Zwischenzug In-between moves', lessonNumber: 0 },
                { piece: 'X-Ray Attacking through an enemy piece', lessonNumber: 0 },
                { piece: 'Zugzwang Being forced to move', lessonNumber: 0 },
                {
                  piece: 'Interference Interpose a piece to great effect',
                  lessonNumber: 0
                },
                {
                  piece: 'Greek Gift Study the greek gift scrifice',
                  lessonNumber: 0
                },
                { piece: 'Deflection Distracting a defender', lessonNumber: 0 },
                { piece: 'Attraction Lure a piece to bad square', lessonNumber: 0 },
                {
                  piece: 'Underpromotion Promote - but not to a queen!',
                  lessonNumber: 0
                },
                {
                  piece: 'Desperado A piece is lost, but it can still help',
                  lessonNumber: 0
                },
                {
                  piece: 'Counter Check Respond to a check with a check',
                  lessonNumber: 0
                },
                { piece: 'Undermining Remove the defending piece', lessonNumber: 0 },
                { piece: 'Clearance Get out of the way!', lessonNumber: 0 },
                { piece: 'Key Squares Reach the key square', lessonNumber: 0 },
                { piece: 'Opposition take the opposition', lessonNumber: 0 },
                { piece: '7th-Rank Rook Pawn Versus a Queen', lessonNumber: 0 },
                {
                  piece: '7th-Rank Rook Pawn And Passive Rook vs Rook',
                  lessonNumber: 0
                },
                { piece: 'Basic Rook Endgames Lucena and Philidor', lessonNumber: 0 }
              ],
            },
          },
          { upsert: true }
        );

        const guestDoc = await guests.findOne( // get userDoc by ip
          { ip: clientIp }
        );

        let index = -1; // index for that piece
        guestDoc.lessonsCompleted.forEach((lesson, i) => { // try finding user's progress for that piece
          if (lesson.piece === piece) {
            index = i;
          }
        });

        if (index === -1) { // piece progress not found
          return res.status(404).json("Piece not found in lessonsCompleted");
        }

        const updateResult = await guests.updateOne(
          {
            ip: clientIp,
            $or: [
              { [`lessonsCompleted.${index}.lessonNumber`]: { $lt: lessonNum + 1 } },
              { [`lessonsCompleted.${index}.lessonNumber`]: { $exists: false } }
            ]
          },
          {
            $set: {
              [`lessonsCompleted.${index}`]: {
                piece,
                lessonNumber: lessonNum + 1, // update only if new lesson number is greater
              },
            },
          }
        );

        // check if changes have been made in db
        if (updateResult.modifiedCount > 0) {
          res.status(200).json("Lesson progress updated");
        } else {
          res.status(304).json("No changes made");
        }
      }
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  }
);

/**
 * GET /lessons/getAllLessonsProgress
 * 
 * Returns a complete map of lesson progress for all chess pieces.
 * Useful for displaying overall progress dashboard.
 * 
 * Returns: Object with piece names as keys and lesson counts as values
 * Example response: { "pawn": 3, "rook": 0, "The Pin Pin it to win it": 5 }
 * 
 * Example: `${environment.urls.middlewareURL}/lessons/getAllLessonsProgress`
 */
router.get(
  "/getAllLessonsProgress",
  async (req, res, next) => {
    passport.authenticate("jwt", { session: false }, async (err, user, info) => {
      req.user = user || null;
      next();
    })(req, res, next) // authenticate jwt
  },
  async (req, res) => {
    try {
      const db = await getDb();
      const users = db.collection("users"); // get users collection
      const guests = db.collection("guest"); // get users collection

      if (req.user) {
        const { username } = req.user;

        const userDoc = await users.findOne( // get userDoc by username
          { username: username },
          { projection: { lessonsCompleted: 1 } }
        );
        if (!userDoc) throw new Error("User does not exist");
        if (!userDoc.lessonsCompleted) throw new Error("User does not have lesson record");

        // create the map
        const lessonsMap = Object.fromEntries(
          userDoc.lessonsCompleted.map(({ piece, lessonNumber }) => [piece, lessonNumber])
        );
        res.json(lessonsMap);

      } else {
        const clientIp = getClientIp(req);
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await guests.updateOne(
          { ip: clientIp },
          {
            $set: {
              ip: clientIp,
              updatedAt: new Date(), // update date
              expiresAt, // update new expiration date
            },
            $setOnInsert: { // add lessonsCompleted field if ip is not stored before
              lessonsCompleted: [
                {
                  piece: 'Piece Checkmate 1 Basic checkmates',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 1 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 2 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 3 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Checkmate Pattern 4 Recognize the patterns',
                  lessonNumber: 0
                },
                {
                  piece: 'Piece checkmates 2 Challenging checkmates',
                  lessonNumber: 0
                },
                {
                  piece: 'Knight and Bishop Mate interactive lesson',
                  lessonNumber: 0
                },
                { piece: 'The Pin Pin it to win it', lessonNumber: 0 },
                { piece: 'The Skewer Yum - Skewers!', lessonNumber: 0 },
                { piece: 'The Fork Use the fork, Luke', lessonNumber: 0 },
                {
                  piece: 'Discovered Attacks Including discovered checks',
                  lessonNumber: 0
                },
                { piece: 'Double Check A very powerfull tactic', lessonNumber: 0 },
                {
                  piece: 'Overloaded Pieces They have too much work',
                  lessonNumber: 0
                },
                { piece: 'Zwischenzug In-between moves', lessonNumber: 0 },
                { piece: 'X-Ray Attacking through an enemy piece', lessonNumber: 0 },
                { piece: 'Zugzwang Being forced to move', lessonNumber: 0 },
                {
                  piece: 'Interference Interpose a piece to great effect',
                  lessonNumber: 0
                },
                {
                  piece: 'Greek Gift Study the greek gift scrifice',
                  lessonNumber: 0
                },
                { piece: 'Deflection Distracting a defender', lessonNumber: 0 },
                { piece: 'Attraction Lure a piece to bad square', lessonNumber: 0 },
                {
                  piece: 'Underpromotion Promote - but not to a queen!',
                  lessonNumber: 0
                },
                {
                  piece: 'Desperado A piece is lost, but it can still help',
                  lessonNumber: 0
                },
                {
                  piece: 'Counter Check Respond to a check with a check',
                  lessonNumber: 0
                },
                { piece: 'Undermining Remove the defending piece', lessonNumber: 0 },
                { piece: 'Clearance Get out of the way!', lessonNumber: 0 },
                { piece: 'Key Squares Reach the key square', lessonNumber: 0 },
                { piece: 'Opposition take the opposition', lessonNumber: 0 },
                { piece: '7th-Rank Rook Pawn Versus a Queen', lessonNumber: 0 },
                {
                  piece: '7th-Rank Rook Pawn And Passive Rook vs Rook',
                  lessonNumber: 0
                },
                { piece: 'Basic Rook Endgames Lucena and Philidor', lessonNumber: 0 }
              ],
            },
          },
          { upsert: true }
        );

        const guestDoc = await guests.findOne( // get userDoc by ip
          { ip: clientIp }
        );
        if (!guestDoc) throw new Error("Guest does not exist");
        if (!guestDoc.lessonsCompleted) throw new Error("Guest does not have lesson record");

        // create the map
        const lessonsMap = Object.fromEntries(
          guestDoc.lessonsCompleted.map(({ piece, lessonNumber }) => [piece, lessonNumber])
        );
        res.json(lessonsMap);
      }
    } catch (err) {
      console.error(err);
      res.status(500).json("Internal server error.");
    }
  }
);

/**
 * Helper function to extract client IP address
 * Handles proxied requests by checking X-Forwarded-For header
 * 
 * @param {Request} req - Express request object
 * @returns {string} Client IP address
 */
function getClientIp(req) {
  return req.headers["x-forwarded-for"] || req.connection.remoteAddress;
}

module.exports = router;

/**
 * Legacy data structure containing end FEN positions for lessons
 * Used for data migration and testing purposes
 * Contains lesson completion states for various chess tactics and pieces
 */
list = [
  {
    name: "Piece Checkmate 1 Basic checkmates",
    list: ["8/8/7R/3k4/3Q4/4K3/8/8 b - - 5 3",
      "8/8/R7/1R6/8/1k1K4/8/8 b - - 7 4",
      "8/5Q2/5k2/8/2B2K2/8/8/8 b - - 9 5",
      "8/kQ6/8/2N5/8/3K4/8/8 b - - 9 5",
      "8/8/8/8/2K5/kQ6/8/8 b - - 11 6",
      "R7/8/k1K5/8/8/8/8/8 b - - 21 11"
    ]
  },
  {
    name: "The Pin Pin it to win it",
    list: ["8/6k1/8/4B3/4P3/8/8/7K b - - 0 2",
      "4k3/p1p2pp1/7p/2B5/8/1P3P2/P1P3PP/1K6 b - - 0 2",
      "1k6/ppp3q1/8/4r3/8/2B5/5PPP/R4QK1 b - - 1 1",
      "8/4k1p1/5p1p/4P3/8/7P/6P1/4R1K1 b - - 0 2",
      "r4rk1/pp1p1ppp/1qp2B2/8/4P3/1P1P2Q1/P1P2PPP/R4RK1 b - - 0 1",
      "4r1r1/2p5/1p1kn3/p1p1R1N1/P6p/7P/1PP1R1PK/8 b - - 0 1",
      "1r1n1rk1/ppq2pQ1/2b5/2pB3p/2P4P/4P3/PB3PP1/1R3RK1 b - - 0 2",
      "q5k1/5pp1/8/1pb1P3/2p5/2P3p1/1P3P2/1N3RK1 w - - 0 4"
    ]
  },
  {
    name: "The Skewer Yum - Skewers!",
    list: ["8/1Bq2k2/4ppp1/8/5P2/4P3/4QK2/5R2 b - - 0 2",
      "r2r2k1/2p2ppp/5n2/4p3/p3P3/P6P/3B1PP1/2RQ2K1 b - - 0 2",
      "5r1k/ppq3p1/3b4/2p2n2/2Pp1P1P/PP1Q2P1/3BN3/R3K2b w Q - 0 25",
      "8/3qk3/8/8/5B2/4Kb2/8/8 w - - 0 3",
      "8/1p4Q1/p2k4/6p1/P3b3/7P/5PP1/6K1 b - - 0 53",
      "3k4/5R2/3b1P2/3p4/3P1p2/2p4P/2P3P1/7K b - - 0 3",
      "8/pp1b4/5pp1/3k4/2p5/Q1P2P2/5KP1/8 b - - 0 42",
      "B7/6p1/7p/2k5/p7/8/2P3P1/2K5 b - - 0 3"
    ]
  },
  {
    name: "The Fork Use the fork, Luke",
    list: ["2N5/5k2/8/8/6P1/7K/8/8 b - - 0 2",
      "7k/5N1p/p7/nppP2q1/2P5/1P2N3/P6P/7K b - - 0 2",
      "7k/5n2/8/4P3/8/8/6PP/5R1K b - - 0 2",
      "r1bqkb1r/ppp2ppp/2n5/4p3/4p3/3B1N2/PPPP1PPP/R1BQK2R w KQkq - 0 4",
      "8/8/R7/5k2/8/8/1K6/8 b - - 0 2",
      "8/5k2/8/8/8/B6P/8/6K1 b - - 0 2",
      "7Q/2nk1p1p/6p1/3n4/8/8/5PPP/6K1 b - - 0 2",
      "N7/3k3p/6p1/5p2/r7/3P4/PPP2PPP/R5K1 b - - 0 3",
      "3r1k2/pp1n2pb/2p2p1N/2P2r2/2QPp2p/P1P1B2P/6P1/1R1R2K1 b - - 0 2",
      "8/5pk1/8/4p3/pp2P3/5P2/PP3K2/2n5 w - - 0 4",
      "R7/5bN1/4k3/p3P3/8/5K2/8/8 b - - 0 4",
      "r5k1/ppp2p1p/6pB/8/3bP2q/2NB2RP/PPP2nP1/R2Q3K w - - 1 5",
      "6k1/1q6/p3p3/2P5/P3P2P/2P5/4Q1PK/8 b - - 0 3",
      "5Bk1/1q1r2p1/5p1p/8/2P5/6PP/P4P2/4R1K1 w - - 0 34",
      "r1bq1rk1/4p1bp/p2p1p2/1PpPn1B1/4PQ2/2N5/PP1N2PP/R3KB1R w KQ - 1 4",
      "4b2r/5kP1/4p2n/pp1p3P/2pP1R2/P1P2B1N/2PK1P2/8 b - - 0 3"
    ]
  },
  {
    name: "Discovered Attacks Including discovered checks",
    list: [
      "4kR2/6pp/8/4N3/8/8/6PP/6K1 b - - 0 2",
      "8/3Nk1pp/8/8/8/8/6PP/5RK1 b - - 0 2",
      "B4k2/3r1pp1/3P3p/8/8/5N2/6PP/5RK1 b - - 0 2",
      "r2q1bnN/pp3kpp/3p1p2/1Bp3B1/8/2Pp4/PP3PPP/RN1bR1K1 b - - 0 13",
      "r1b2rk1/pp1n1p1p/6p1/3p4/3bP3/1PqB3P/P2N2PN/R2Q1R1K w - - 2 17",
      "2k5/8/p2P4/2p1b3/8/2P4r/P4R2/1K2R3 b - - 0 43",
      "8/2N5/4np2/4pk1p/R6P/P3KP2/1P6/8 b - - 0 2",
      "r1bq2rk/1p1p1N2/p1n1pP1p/3n4/8/1N1Bb3/PPP3PP/R4R1K b - - 3 3",
      "8/5ppk/p3p2p/1p1b4/3Pp3/1P2b1P1/P6P/2R2K2 w - - 0 4",
      "4r3/1R2qk1p/1Q4p1/1Pp5/2P5/6P1/6KP/8 b - - 0 53"
    ]
  },
  {
    name: "Double Check A very powerfull tactic",
    list: [
      "",
      "r3k3/ppp2pp1/2np4/2B1p3/2B1P1N1/3P2n1/PPP2PP1/RN1Q1RKr w q - 3 14",
      "",
      "",
      "3r2k1/pp6/6p1/2P1q2p/4p3/4BK2/PP2P2r/R1Q1R2B w - - 0 30",
      "B6r/2qk1P1p/p5p1/1p2p3/8/2P1B3/P1PR2PP/5RK1 b - - 0 25"
    ]
  },
  {
    name: "Overloaded Pieces They have too much work",
    list: [
      "6k1/5pp1/4R1n1/8/8/3B4/5PPP/6K1 b - - 0 1",
      "2r1rbk1/3P1pp1/5n2/8/8/3Q3P/2B2PPK/8 b - - 0 1",
      "6b1/4k2p/7P/1p1pKBP1/1P1P4/8/5P2/8 b - - 2 4",
      "3q3k/pp2R1pp/8/2P5/1P3BQ1/2P5/P4rPp/7K b - - 0 29",
      "8/6Q1/p3p1k1/3nB1r1/8/3q3P/PP6/K1R5 b - - 0 36",
      "4R3/pb1R1p1k/1pn2qpp/8/4B3/P4NP1/1P3PP1/6K1 b - - 0 26",
      "5R2/1p5k/p2pp3/8/7p/8/PP4P1/6K1 b - - 0 4",
      "1r3k1r/p4p2/7p/3pP3/8/4BPN1/6P1/2R3K1 b - - 0 3",
      "5k2/1pp4p/p1n3p1/8/1P2q3/P3P1Pb/3N3P/6K1 w - - 0 4",
      "rk2Q3/5p1p/p1n2p2/P1b5/2p5/2P3P1/5P1P/6K1 b - - 0 32"
    ]
  },
  {
    name: "Zwischenzug In-between moves",
    list: [
      "1rbqk2r/pp3ppp/8/3n4/1bpP4/8/PP2BKPP/RN1Q2NR w k - 0 11",
      "5rk1/pp1b1ppp/4p3/3pP3/1q3Pn1/3B1N2/P2K2PP/RN3Q2 w - - 0 19",
      "B3k3/3b1q2/p2bp3/6Q1/8/4B1P1/PPP4P/6K1 b - - 0 31",
      "2r3k1/B5pp/4p3/1Q1p1p2/1p3P2/1P2P3/P1r3PP/6K1 b - - 0 29",
      "2B2r1k/1pN1Qpbp/p4pp1/q7/8/8/PP3PPP/3R2K1 b - - 0 25"
    ]
  },
  {
    name: "Interference Interpose a piece to great effect",
    list: [
      "4r1k1/p1p1qppp/3b1n2/1r1p4/P2P4/2P5/1P2BPPP/R1B1KN1R w KQ - 0 16",
      "1k6/1pp2pp1/p1p5/8/8/2Pp1Pp1/PP2q1P1/R1BK1N2 w - - 4 27",
      "1R4k1/p3bppp/4p3/8/3r4/6P1/P3PP1P/5RK1 b - - 0 19",
      "3r2k1/pp3p1p/6p1/8/4P3/5P2/PP2nKPP/2B5 w - - 0 26",
      "3B2k1/6p1/3b4/1p1p3q/3P4/2P1pNPb/1P3P1P/R5K1 w - - 0 32",
      "2r4k/5pR1/7p/5q2/4p2P/1Qn1P3/5P1K/8 w - - 0 38",
      "5q2/1b4pk/1p2p1n1/1P1pPp2/P2P1P1p/1N3R1P/1Q4PK/8 b - - 0 47"
    ]
  },
  {
    name: "Greek Gift Study the greek gift scrifice",
    list: [
      "rnb2rk1/pppn1pp1/4p3/3pP1B1/1b1P4/2NQ4/PPP2PPP/R3K2R b KQ - 0 4",
      "rnb2rk1/pp3p1Q/4p3/3pn1N1/3p4/2NB4/PPP2PP1/R3K2R b KQ - 5 16",
      "r3r2k/1b3Qp1/p7/1p1P1R2/1P6/P3q3/6PP/3R3K b - - 4 26",
      "r3rbk1/6p1/pn4p1/np2p1B1/3p4/5Q2/PP3PP1/2R1R1K1 b - - 1 25",
      "3r1B1Q/bpq2k2/p1b1pp2/2P5/1P6/P7/5PPP/2R2RK1 b - - 0 22",
      "r1b2rk1/ppq2pp1/4pn2/2p3NQ/1p1P4/8/PP1N1PPP/R4RK1 w - - 0 16"
    ]
  },
  {
    name: "Deflection Distracting a defender",
    list: [
      "5R2/5ppk/4b3/8/8/7P/5PP1/6K1 b - - 0 2",
      "8/8/8/1k4Q1/8/8/5K2/8 b - - 0 3",
      "4r1k1/1p1Q1p1p/p2p1Pp1/1n1P4/1P6/6P1/P4PKP/4R3 b - - 0 4",
      "rnbQ1b1r/pp2pkpp/5n2/8/4P3/2N5/PPP2PPP/R1B1K2R b - - 0 2",
      "2b2qk1/7Q/3r2p1/8/8/3r3R/6PP/6K1 b - - 0 2",
      "6k1/5p2/3q2pp/8/6P1/5QNP/5P2/4r1K1 w - - 0 3",
      "r3r1k1/p4pp1/1p1Q3p/8/P7/7P/1P3PP1/R5K1 b - - 0 2",
      "r5rk/6qQ/p1p2B1p/PpP5/1P6/2PB2P1/5PKP/8 b - - 1 3",
      "r1bk3r/pppp2p1/1n3p1p/7n/2N4Q/5P2/PPP3PP/R3R1K1 b - - 0 2",
      "6k1/2r2pp1/5q1p/Np6/8/1P5Q/3pbPPR/1R4K1 w - - 0 6"
    ]
  },
  {
    name: "Attraction Lure a piece to bad square",
    list: [
      "3R1k2/5p1p/8/5N2/8/5p1q/8/6K1 b - - 0 3",
      "rnbB1b1r/ppk2ppp/2p5/4q3/4n3/8/PPP2PPP/2KR1BNR b - - 3 11",
      "r2B3r/3n2pp/p2bR3/1b1k1P2/1qpPB3/4P1PP/5P1K/8 b - - 1 2",
      "",
      "",
      "8/5pk1/4p3/1p6/6P1/4P3/PR2KP2/7q w - - 0 4",
      "",
      "6k1/pp4bp/2n2np1/5p2/2P2q2/4KBN1/PP5P/RQ6 w - - 0 24",
      "",
      "7r/6kp/5Rp1/8/8/8/6PP/2B3K1 b - - 0 1"
    ]
  },
  {
    name: "Underpromotion Promote - but not to a queen!",
    list: [
      "5N1n/r6k/5b2/5N1p/8/1q6/PP6/K5R1 b - - 0 1",
      "5R2/7k/8/7K/8/8/8/8 b - - 0 1",
      "1R1B4/8/k7/8/8/5K2/8/8 b - - 0 1",
      "5R2/7k/5K2/8/8/8/8/8 b - - 0 1",
      "8/7p/7B/5k1p/7P/5K2/8/8 b - - 0 2",
      "8/8/8/8/8/k7/1b1n4/KB6 w - - 4 4",
      "B3Q3/1q4pk/5p1p/5P1K/6PP/8/8/8 b - - 0 1",
      "5N2/3q3k/8/8/6p1/6Pp/7P/7K b - - 0 3",
      "6K1/8/5k2/8/8/8/8/8 b - - 0 2",
      "3N4/k7/P7/1K6/8/8/8/8 b - - 0 1"
    ]
  },
  {
    name: "Desperado A piece is lost, but it can still help",
    list: [
      "r3kb1r/pp3ppp/2N1pn2/8/3P4/2P5/P4PPP/R1Bb1RK1 w - - 0 3",
      "r2B2rk/2p2p2/p2p3p/1p1N4/3bP1n1/PB3P2/1P3P2/R3RK2 b - - 0 2",
      "r5k1/ppp1p1rp/8/3P3b/4P3/2N5/PP1nN1P1/2K4R w - - 0 4",
      "r5k1/ppN2pPp/6p1/5R2/1p6/1P2n3/P3K1PP/3R4 b - - 2 4",
      "4br2/6k1/4pn1p/1p1P4/p2BB3/6P1/PP3P2/6K1 w - - 0 4"
    ]
  },
  {
    name: "Counter Check Respond to a check with a check",
    list: [
      "",
      "8/6P1/8/8/1q1QK3/8/8/k7 b - - 1 1",
      "",
      "8/8/8/8/8/1k6/2r5/K7 w - - 0 96",
      "8/5Npp/p1P5/P1R3rk/1p4b1/3r2K1/4pP1P/7R w - - 0 34"
    ]
  },
  {
    name: "Undermining Remove the defending piece",
    list: [
      "4rrk1/R5bp/3qp1p1/3p3Q/2pB1P2/6PP/1P3PB1/4R1K1 b - - 0 24",
      "1b4k1/1p5p/8/1N1p4/P1nBn3/4P3/5q1N/5K1Q w - - 0 33",
      "3qRrk1/1p3ppp/8/p4N2/8/P5QP/1P3PP1/6K1 b - - 0 1",
      "1q3r1k/r4ppp/5Q2/8/5N2/p6R/PPP5/1K5R b - - 0 1",
      "2q1rk2/1p3ppp/p7/2N5/1P6/5RP1/P1Q3KP/8 b - - 2 2"
    ]
  },
  {
    name: "Clearance Get out of the way!",
    list: [
      "8/2k5/5Np1/1p4K1/5P2/8/1R6/3r4 b - - 0 58",
      "8/k7/p1p5/2P1p3/1P6/P3PB2/3K4/6q1 w - - 0 50",
      "1k1r3r/pp1b4/5Ppp/3p4/P2R4/3B2q1/2PB1PPP/R5K1 b - - 0 24",
      "4k2r/1p6/2b1p1pp/2N1P2N/5P1Q/pPp5/Pn4PK/4R3 b - - 0 41",
      ""
    ]
  },
  {
    name: "7th-Rank Rook Pawn And Passive Rook vs Rook",
    list: [
      "8/6k1/8/4K2p/4P2p/5P2/6P1/8 b - - 0 58",
      "R7/P6k/r7/8/8/8/1K6/8 w - - 27 15",
      "R7/P5k1/6P1/8/8/1K6/8/r7 b - - 22 14",
      "8/R7/5k2/8/8/8/6K1/8 b - - 0 6",
      "",
      "",
      "R7/P5k1/5P2/8/8/8/7K/r7 b - - 0 80",
      "8/6k1/8/4K2p/4P2p/5P2/6P1/8 b - - 0 58",
      "R7/P4k2/6p1/r3P2p/4K2P/6P1/8/8 b - - 1 62"
    ]
  },
  {
    name: "Basic Rook Endgames Lucena and Philidor",
    list: [
      "",
      "",
      "",
      "",
      "8/8/8/3k4/8/7r/2K5/R7 b - - 9 11",
      "",
      "",
      "8/8/8/8/R5K1/4k3/8/1r6 w - - 5 21",
      "8/8/4K3/8/2k5/1R6/1p6/8 w - - 4 8",
      ""
    ]

  }
]

module.exports = router;