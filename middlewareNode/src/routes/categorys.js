/**
 * Categories Routes
 * 
 * API endpoints for managing chess lesson categories.
 * Categories organize lessons into groups for better navigation.
 * 
 * Features:
 * - Retrieve all available lesson categories
 * - Category information includes name and ID
 */

const express = require("express");
const router = express.Router();
const categorys = require("../models/categorys");

/**
 * GET /category/list
 * 
 * Retrieves all lesson categories from the database.
 * Used to populate category selection menus in the UI.
 * 
 * @returns {Array} Array of all category objects
 */
router.get("/list", async (req, res) => {
  try {
    // Find all categories in the database
    const categoryArray = await categorys.find({});
    res.status(200).json(categoryArray);
  } catch (error) {
    console.error(error.message);
    res.status(500).json("Server error");
  }
});

module.exports = router;
