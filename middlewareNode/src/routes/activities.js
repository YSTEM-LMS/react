/**
 * Activities Routes
 * 
 * API endpoints for managing daily student activities.
 * Handles retrieval and completion status of activities.
 * 
 * Features:
 * - Get user's daily activities
 * - Mark activities as completed
 * - Track activity completion for streaks and badges
 */

const config = require("config");
const express = require('express');
const router = express.Router({mergeParams: true});
const { MongoClient, ObjectId } = require('mongodb');
const requireAuth = require('../middleware/requireAuth');
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
 * Helper function to get user ID from username
 * @param {MongoDB.Db} db - Database instance
 * @param {string} username - Username to lookup
 * @returns {ObjectId} User's MongoDB _id
 */
async function getUserId(db, username) {
    const users = db.collection("users");
    const currentUser = await users.findOne(
        { username },
    );
    if(!currentUser) {
        return;
    }
    const userId = currentUser._id;
    return userId;
}

/**
 * Middleware to check read access on activity routes (self, mentor, tutor, or admin).
 * Note: Platform mentors, tutors, and admins have read access to monitor student activity
 * progress across the platform.
 */
function requireActivityReadAccess(req, res, next) {
    const targetUsername = req.params.username;
    if (
        req.user.role === 'admin' ||
        req.user.role === 'mentor' ||
        req.user.role === 'tutor' ||
        req.user.username === targetUsername
    ) {
        return next();
    }
    return res.status(403).json({ error: "Forbidden: cannot access another user's activities" });
}

/**
 * Middleware to check write access on activity routes (self or admin)
 */
function requireActivityWriteAccess(req, res, next) {
    const targetUsername = req.params.username;
    if (
        req.user.role === 'admin' ||
        req.user.username === targetUsername
    ) {
        return next();
    }
    return res.status(403).json({ error: "Forbidden: cannot modify another user's activities" });
}

/**
 * GET /activities/:username
 * Retrieves all daily activities for a user
 */
router.get("/:username", requireAuth, requireActivityReadAccess, async (req, res) => {
    try {
        const db = await getDb();
        const { username } = req.params;
        const userId = await getUserId(db, username);
        if(!userId) {
            return res.status(404).json({error:'User not found'});
        }
        const activities = db.collection("activities");
        const userActivities = await activities.findOne(
            { userId }, { projection: {activities: 1, _id: 0}}
        );
        return res.status(200).json({activities: userActivities});

    } catch (err) {
        console.error('Error fetching activities: ', err);
        return res.status(500).json({error: 'Server error'});
    }
});

router.get("/:username/dates", requireAuth, requireActivityReadAccess, async (req, res) => {
    try {
        const db = await getDb(); 
        const { username } = req.params;
        const userId = await getUserId(db, username);
        if(!userId) {
            return res.status(404).json({error: "User not found"});
        }
        const activities = db.collection("activities");
        const completedDates = await activities.findOne(
            { userId }, {projection: {_id: 0, completedDates: 1}}
        );
        return res.status(200).json({dates: completedDates});
    } catch (err) {
        console.error("Error fetching activity completion dates: ", err);
        return res.status(500).json({error: 'Server error'});
    }
});

router.put("/:username/activity", requireAuth, requireActivityWriteAccess, async (req, res) => {
    try {
        const db = await getDb();
        const { username } = req.params;
        const { activityName } = req.body;
        const userId = await getUserId(db, username);
        if(!userId) {
            return res.status(404).json({error:'User not found'});
        }
        const activities = db.collection("activities");
        const activityIncomplete = await activities.findOne(
            { userId, "activities.name": activityName }, 
            { activities: {$elemMatch: { name: activityName }}, _id:0},
        );
        if(activityIncomplete) {
            console.log('incomplete activity: ', activityName);
        }
        await activities.updateOne(
            { userId, "activities.name": activityName },
            { $set: { "activities.$.completed": true } }
        );
        return res.status(200).json({message:'success'});
    } catch (err) {
        console.error('Error updating activities: ', err);
        return res.status(500).json({error: 'Server error'});
    }
});

module.exports = router;