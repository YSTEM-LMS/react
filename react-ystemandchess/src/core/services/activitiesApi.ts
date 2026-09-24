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