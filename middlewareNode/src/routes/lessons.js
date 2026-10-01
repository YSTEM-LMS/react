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
