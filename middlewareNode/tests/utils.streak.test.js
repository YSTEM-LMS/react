const { dayCompleted, bucketEventsByDay, calculateStreaks } = require('../src/utils/streak');

describe('streak utility functions', () => {
  test('dayCompleted requires both a lesson and a puzzle', () => {
    expect(dayCompleted(['lesson', 'puzzle'])).toBe(true);
    expect(dayCompleted(['lesson'])).toBe(false);
    expect(dayCompleted(['puzzle'])).toBe(false);
  });

  test('bucketEventsByDay groups event types by UTC date and skips incomplete events', () => {
    const daysMap = bucketEventsByDay([
      { eventType: 'lesson', startTime: '2026-07-01T23:58:00Z' },
      { eventType: 'puzzle', startTime: '2026-07-01T23:59:00Z' },
      { eventType: 'lesson', startTime: '2026-07-02T00:02:00Z' },
      { eventType: 'puzzle', startTime: '2026-07-02T00:05:00Z' },
      { eventType: 'lesson' },
      { startTime: '2026-07-02T10:00:00Z' },
    ]);

    expect(daysMap).toEqual({
      '2026-07-01': ['lesson', 'puzzle'],
      '2026-07-02': ['lesson', 'puzzle'],
    });
  });

  test('calculateStreaks returns the current and longest runs and last completed date', () => {
    expect(
      calculateStreaks({
        '2026-07-01': ['lesson', 'puzzle'],
        '2026-07-02': ['lesson'],
        '2026-07-03': ['lesson', 'puzzle'],
        '2026-07-04': ['lesson', 'puzzle'],
      })
    ).toEqual({
      currentStreak: 2,
      longestStreak: 2,
      lastCompletedDate: '2026-07-04',
    });
  });

  test('days with no events are absent and do not break a streak', () => {
    expect(
      calculateStreaks({
        '2026-07-01': ['lesson', 'puzzle'],
        '2026-07-02': ['lesson', 'puzzle'],
        '2026-07-04': ['lesson', 'puzzle'],
      })
    ).toEqual({
      currentStreak: 3,
      longestStreak: 3,
      lastCompletedDate: '2026-07-04',
    });
  });

  test('calculateStreaks returns zero values when there are no days', () => {
    expect(calculateStreaks({})).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastCompletedDate: null,
    });
  });
});
