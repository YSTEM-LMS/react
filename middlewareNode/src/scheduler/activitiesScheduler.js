/**
 * Activities Scheduler
 * 
 * Automated cron job that resets daily activities for all users.
 * Runs every day at midnight to provide fresh daily challenges.
 * 
 * Schedule: '0 0 * * *' (daily at 00:00 - midnight)
 * 
 * Process:
 * 1. Fetches all user activity documents
 * 2. Generates new random activities for each user
 * 3. Updates the database with fresh activities
 * 4. Logs the reset time
 */

const schedule = require("node-schedule");
const config = require("config");
const { MongoClient } = require('mongodb');
const { selectActivities } = require("../utils/activities");
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
 * Daily scheduled job to reset activities
 * Runs at midnight (00:00) every day
 */
const activityScheduler = schedule.scheduleJob('0 0 * * *', 
  async function () {
    const db = await getDb();
    const activities = db.collection("activities");
    
    // Get all user activity documents
    const activitiesArray = await (activities.find({})).toArray();
    
    // Reset activities for each user
    for(const userActivity of activitiesArray) {
        // Generate new random activities for the day
        const newActivities = await selectActivities();
        const id = userActivity._id;
        
        // Update user's activities in database
        await activities.updateOne(
            { _id: id},
            { $set: { activities: newActivities } }
        )
    }
    
   console.log(`Resetting activities (${new Date().toLocaleString()})`);
})
