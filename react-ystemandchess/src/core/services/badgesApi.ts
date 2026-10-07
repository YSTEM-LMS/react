/**
 * Badges API Service
 * 
 * Provides functions to interact with the badges API endpoints.
 * Handles fetching badge catalog and user's earned badges.
 * 
 * Functions:
 * - getBadgeCatalog: Fetches all available badges
 * - getUserBadges: Fetches badges earned by a specific user
 */

import { environment } from "../../environments";
/**
 * Fetches the complete catalog of all available badges
 *
 * @returns {Promise<Array>} Array of badge objects with id, name, description, icon, criteria
 * @throws {Error} If the API request fails
 */
export async function getBadgeCatalog() {
  // Public endpoint (no auth middleware) — no credentials needed. Sending
  // credentials: "include" here fails outright against a CORS config using
  // origin: "*" (wildcard origin + credentials is invalid per spec and
  // rejected by browsers), even though curl/server-to-server calls succeed.
  const res = await fetch(`${environment.urls.middlewareURL}/badges/catalog`);
  if (!res.ok) throw new Error("Failed to fetch badge catalog");
  return (await res.json()).badges;
}

/**
 * Fetches all badges earned by a specific user.
 *
 * The backend only permits a caller to read their own badges (:userId must
 * match the authenticated JWT's username), so token is required here.
 *
 * @param {string} userId - User's own username (must match the JWT)
 * @param {string} token - Bearer token (e.g. from the 'login' cookie)
 * @returns {Promise<Array>} Array of earned badge objects with badgeId, earnedAt, meta
 * @throws {Error} If the API request fails
 */
export async function getUserBadges(userId: string, token: string) {
  // Auth is carried by the Bearer header, not cookies — omit
  // credentials: "include" for the same reason noted in getBadgeCatalog
  // above (wildcard-origin CORS rejects credentialed requests).
  const res = await fetch(`${environment.urls.middlewareURL}/badges/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch earned badges");
  return (await res.json()).earned;
}
