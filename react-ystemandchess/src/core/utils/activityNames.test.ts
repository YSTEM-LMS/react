/**
 * Unit tests — parseActivities
 *
 * Covers Task 7: display names come from the backend's displayName field,
 * not a duplicate frontend map (removed).
 */

import { parseActivities } from "./activityNames";

describe("parseActivities", () => {
  test("uses the backend-provided displayName", () => {
    const [result] = parseActivities([
      {
        name: "captureQueen",
        type: "puzzle",
        completed: false,
        taskId: "captureQueen",
        route: "/puzzles",
        displayName: "Capture a Queen",
      },
    ]);

    expect(result.displayName).toBe("Capture a Queen");
  });

  test("falls back to activity.name when displayName is absent (pre-existing seeded activities)", () => {
    const [result] = parseActivities([
      {
        name: "captureQueen",
        type: "puzzle",
        completed: false,
        taskId: "captureQueen",
        route: "/puzzles",
      },
    ]);

    expect(result.displayName).toBe("captureQueen");
  });

  test("carries id, type, completed, and route through from the backend record", () => {
    const [result] = parseActivities([
      {
        name: "playMatch",
        type: "match",
        completed: true,
        taskId: "playMatch",
        route: "/play",
        displayName: "Play a Match",
      },
    ]);

    expect(result).toEqual({
      id: "playMatch",
      displayName: "Play a Match",
      type: "match",
      completed: true,
      route: "/play",
    });
  });

  test("maps a list of activities in order", () => {
    const results = parseActivities([
      { name: "a", type: "puzzle", completed: false, taskId: "a", route: "/puzzles", displayName: "A" },
      { name: "b", type: "puzzle", completed: true, taskId: "b", route: "/puzzles", displayName: "B" },
    ]);

    expect(results.map((r) => r.displayName)).toEqual(["A", "B"]);
  });
});
