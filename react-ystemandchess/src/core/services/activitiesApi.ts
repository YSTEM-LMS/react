import { environment } from "../../environments/environment";

/**
 * Marks a specific activity as completed for the given user via
 * PUT /activities/:username/activity.
 *
 * @param {string} username - User's own username (must match the JWT)
 * @param {string} token - Bearer token (e.g. from the 'login' cookie)
 * @param {string} activityId - ID of the activity being completed
 * @returns {Promise<any>} Updated activities payload
 * @throws {Error} If the API request fails
 */
export async function completeActivity(username: string, token: string, activityName: string) {
  const res = await fetch(
    `${environment.urls.middlewareURL}/activities/${username}/activity`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activityName }),
    }
  );
  if (!res.ok) throw new Error("Failed to update activity");
  return res.json();
}

/**
 * Resolves the activity name matching a taskId by fetching the user's
 * activities. Needed because the ?taskId= deep link carries the catalog
 * taskId, but PUT /activities/:username/activity matches on activities.name.
 *
 * @param {string} username
 * @param {string} token
 * @param {string} taskId
 * @returns {Promise<string | undefined>} Matching activity name, if found
 */
export async function getActivityNameByTaskId(username: string, token: string, taskId: string) {
  const res = await fetch(`${environment.urls.middlewareURL}/activities/${username}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch activities");
  const json = await res.json();
  const match = json.activities?.activities?.find((a: any) => a.taskId === taskId);
  return match?.name;
}