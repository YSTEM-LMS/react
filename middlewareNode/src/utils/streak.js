/**
 * Pure helpers for grouping activity events by UTC day and calculating streaks.
 */

function dayCompleted(events) {
  const required = ['lesson', 'puzzle'];
  return required.every((eventType) => events.includes(eventType));
}

function bucketEventsByDay(events) {
  const daysMap = {};
  events.forEach((event) => {
    if (!event.startTime || !event.eventType) return;

    const date = new Date(event.startTime).toISOString().slice(0, 10);
    if (!daysMap[date]) daysMap[date] = [];
    daysMap[date].push(event.eventType);
  });
  return daysMap;
}

function calculateStreaks(daysMap) {
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
  return { currentStreak, longestStreak, lastCompletedDate };
}

module.exports = { dayCompleted, bucketEventsByDay, calculateStreaks };
