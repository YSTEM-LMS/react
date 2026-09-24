/**
 * Streak Routes
 * 
 * API endpoints for tracking user activity streaks.
 * Calculates current streak, longest streak, and streak continuity
 * based on daily completion of required activities (lessons and puzzles).
 * 
 * A day is considered "completed" when user finishes both:
 * - At least one lesson
 * - At least one puzzle
 */

const express = require('express');
const router = express.Router();
const TimeTracking = require('../models/timeTracking');
const requireAuth = require('../middleware/requireAuth');

/**
 * Checks if a day's activities meet completion requirements
 * 
 * @param {Array} events - Array of event types completed on a day
 * @returns {boolean} True if both 'lesson' and 'puzzle' are present
 */
function dayCompleted(events) {
  const required = ['lesson', 'puzzle'];
  return required.every((r) => events.includes(r));
}

/**
 * Checks if the user is authorized to access the requested user's streak.
 * Platform mentors, tutors, and admins have read access to student streak progress.
 */
function checkStreakAccess(req, res, next) {
  const targetUsername = req.query.username;
  if (!targetUsername) {
    return res.status(400).json({ error: 'username is required' });
  }
  if (
    req.user.role === 'admin' ||
    req.user.role === 'mentor' ||
    req.user.role === 'tutor' ||
    req.user.username === targetUsername
  ) {
    return next();
  }
  return res.status(403).json({ error: "Forbidden: cannot view another user's streak" });
}
 
/**
 * GET /streak
 * 
 * Calculates and returns streak statistics for a user.
 * 
 * Query Parameters:
 * - username: Required - Username to calculate streak for
 * 
 * Returns:
 * - currentStreak: Consecutive days up to today
 * - longestStreak: Best streak ever achieved
 * - lastCompletedDate: Most recent day with completed activities
 */
router.get('/', requireAuth, checkStreakAccess, async (req, res) => {
  try {
    const username = req.query.username;

    const userEvents = await TimeTracking.find({ username }).lean();

    console.log(`Fetched ${userEvents.length} events for: ${username}`);

    const daysMap = {};
    userEvents.forEach((e) => {
      if (!e.startTime || !e.eventType) return; // Skip incomplete records

      const date = new Date(e.startTime).toISOString().slice(0, 10);
      console.log("Event:", e.eventType, "| Date:", date);

      if (!daysMap[date]) daysMap[date] = [];
      daysMap[date].push(e.eventType);
    });

    console.log("daysMap:", daysMap);

    const allDates = Object.keys(daysMap).sort();
    let currentStreak = 0;
    let longestStreak = 0;
    let running = 0;
    let lastCompletedDate = null;

    allDates.forEach((date) => {
      if (dayCompleted(daysMap[date])) {
        running++;
        longestStreak = Math.max(longestStreak, running);
        lastCompletedDate = date;
      } else {
        running = 0;
      }
    });

    currentStreak = running;

    res.json({ currentStreak, longestStreak, lastCompletedDate });
  } catch (err) {
    console.error('Error in /streak:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /streak/calendar
router.get('/calendar', requireAuth, checkStreakAccess, async (req, res) => {
  try {
    const { username, month } = req.query; 
    if (!month) {
      return res.status(400).json({ error: 'month is required' });
    }

    const start = new Date(`${month}-01T00:00:00Z`);
    const end = new Date(start);
    // setMonth/getMonth operate in the server's local timezone even on a
    // UTC-constructed Date — using the UTC variants here keeps the month
    // window correct regardless of server deployment timezone.
    end.setUTCMonth(end.getUTCMonth() + 1);

    const userEvents = await TimeTracking.find({
      username,
      startTime: { $gte: start, $lt: end },
    }).lean();

    console.log(`Calendar events for ${username} in ${month}: ${userEvents.length}`);

    const daysMap = {};
    userEvents.forEach((e) => {
      if (!e.startTime || !e.eventType) return;

      const date = new Date(e.startTime).toISOString().slice(0, 10);
      if (!daysMap[date]) daysMap[date] = [];
      daysMap[date].push(e.eventType);
    });

    const days = Object.keys(daysMap).map((date) => ({
      date,
      completed: dayCompleted(daysMap[date]),
    }));

    console.log("calendar daysMap:", daysMap);
    res.json({ days });
  } catch (err) {
    console.error('Error in /streak/calendar:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
