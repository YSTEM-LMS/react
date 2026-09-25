/**
 * Activities Utility
 * 
 * Provides functions for managing daily student activities.
 * Handles random selection of activities from the activity types catalog.
 */

const config = require("config");
const { MongoClient } = require('mongodb');
const { getActivityCatalogEntry } = require("../config/activityCatalog");
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
 * Selects 4 random unique activities for a user's daily challenges
 * 
 * Randomly picks activities from the activityTypes collection without duplicates.
 * Each activity is initialized with completed: false.
 * 
 * @returns {Array} Array of 4 activity objects with name, type, and completed fields
 */
const selectActivities = async () => {
    const db = await getDb();
    
    // Fetch all available activity types
    const activityList = await (db.collection("activityTypes").find({})).toArray();
    const chosenActivites = [];
    const newActivities = [];

    // Select up to 4 unique random activities, capped by how many types exist
    const target = Math.min(4, activityList.length);
    while (newActivities.length < target) {
        const activity = {};
        
        // Randomly select an activity
        const selectedActivity = activityList[Math.floor(Math.random() * activityList.length)];
        
        // Only add if not already selected (avoid duplicates)
        if(!chosenActivites.includes(selectedActivity._id)) {
          chosenActivites.push(selectedActivity._id);
          const catalogEntry = getActivityCatalogEntry(selectedActivity._id);
          activity.name = selectedActivity._id;
          activity.type = selectedActivity.type;
          activity.completed = false;
          activity.taskId = catalogEntry.taskId;
          activity.route = catalogEntry.route;
          // Catalog is the single source of truth for the user-facing name
          // (see config/activityCatalog.js) — stored here so the frontend
          // never needs its own copy of this map to fall out of sync with.
          activity.displayName = catalogEntry.displayName;
          newActivities.push(activity);
        }
    }
    return newActivities;
}

module.exports = { selectActivities };