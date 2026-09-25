/**
 * Activity Names Utility
 *
 * Shapes raw activity records from GET /activities into what ActivitiesModal
 * renders. Display names come from the backend's activityCatalog
 * (middlewareNode/src/config/activityCatalog.js) via activity.displayName —
 * there is no separate frontend name map to keep in sync with it anymore.
 *
 * activity.name is kept only as a last-resort fallback, for activity
 * documents seeded before displayName existed on stored records.
 */

/**
 * Type definition for an activity object as returned by GET /activities
 */
type Activity = {
    name: string,        // Activity identifier (e.g., 'captureQueen')
    type: string,        // Activity category (e.g., 'puzzle', 'lesson')
    completed: boolean,   // Whether the activity is completed
    taskId: string,       // Stable identifier from the backend activity catalog
    route: string,        // Backend-provided route for the specific activity
    displayName?: string, // Backend-provided user-facing name (may be absent on activities seeded before this field existed)
}

/**
 * Converts an array of activity objects into the shape ActivitiesModal renders.
 *
 * @param {Array<Activity>} names - Array of activity objects
 * @returns Array of activities with a guaranteed displayName
 */
export const parseActivities = (names: Array<Activity>) => {
    return names.map((activity) => ({
        id: activity.taskId, // Stable per-activity ID from the backend catalog
        displayName: activity.displayName || activity.name,
        type: activity.type,
        completed: activity.completed,
        route: activity.route, // Backend-provided, specific to this activity (not just its type)
    }));
}
