/**
 * Seed helpers for gamification E2E specs.
 *
 * Talk to the real, running middlewareNode backend over HTTP — no direct
 * DB access from the frontend test process — so specs stay black-box
 * against the actual API surface a real student session would use.
 *
 * NOTE: signup (POST /user) and check-and-award
 * (POST /badges/:userId/check-and-award) both read from req.query, not a
 * JSON body — matching routes/users.js and routes/badges.js exactly, not
 * REST convention. Login (POST /auth/login) is the exception: it reads a
 * JSON body. Getting either wrong silently 400s.
 */

const MIDDLEWARE_URL = process.env.MIDDLEWARE_URL || 'http://localhost:8000';

export async function signupTestStudent(opts: {
  username: string;
  password: string;
  first: string;
  last: string;
  email: string;
}) {
  const params = new URLSearchParams({
    username: opts.username,
    password: opts.password,
    first: opts.first,
    last: opts.last,
    email: opts.email,
    role: 'student',
  });
  const res = await fetch(`${MIDDLEWARE_URL}/user?${params.toString()}`, { method: 'POST' });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Signup failed (${res.status}): ${body}`);
  }
}

export async function loginAndGetToken(username: string, password: string): Promise<string> {
  // Unlike signup, /auth/login reads a JSON body (not req.query).
  const res = await fetch(`${MIDDLEWARE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Login failed (${res.status}): ${body}`);
  }
  const { token } = await res.json();
  return token;
}

/**
 * Records a lesson+puzzle TimeTracking event pair for "today" (server time)
 * via the real /start then /update flow — matches exactly how the app's
 * own lesson/puzzle screens record time, not a synthetic shortcut.
 */
export async function recordDayCompleted(token: string, username: string) {
  const headers = { Authorization: `Bearer ${token}` };

  for (const eventType of ['lesson', 'puzzle']) {
    const startParams = new URLSearchParams({ username, eventType, eventName: `e2e-${eventType}` });
    const startRes = await fetch(`${MIDDLEWARE_URL}/timeTracking/start?${startParams.toString()}`, {
      method: 'POST',
      headers,
    });
    if (!startRes.ok) throw new Error(`timeTracking/start failed (${startRes.status})`);
    const startBody = await startRes.json(); // full Mongoose doc, per routes/timeTracking.js res.json(newEvent)
    const eventId: string = startBody.eventId;
    if (!eventId) throw new Error(`timeTracking/start response missing eventId: ${JSON.stringify(startBody)}`);

    const updateParams = new URLSearchParams({ username, eventType, eventId, totalTime: '600' });
    const updateRes = await fetch(`${MIDDLEWARE_URL}/timeTracking/update?${updateParams.toString()}`, {
      method: 'PUT',
      headers,
    });
    if (!updateRes.ok) throw new Error(`timeTracking/update failed (${updateRes.status})`);
  }
}

export async function triggerBadgeCheck(token: string, username: string) {
  const res = await fetch(`${MIDDLEWARE_URL}/badges/${username}/check-and-award`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

/** Sets country/state/school (and optionally demographic fields) via the real profile endpoint. */
export async function updateProfile(
  token: string,
  fields: { country?: string; state?: string; school?: string }
) {
  const res = await fetch(`${MIDDLEWARE_URL}/user/profile`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(fields),
  });
  if (!res.ok) throw new Error(`updateProfile failed (${res.status}): ${await res.text()}`);
}

/** Uploads a tiny real PNG as the student's avatar via the real upload endpoint. */
export async function uploadAvatar(token: string): Promise<string> {
  // 1x1 transparent PNG, valid image bytes (not a placeholder string) so
  // the real multer fileFilter + S3 putObject path is genuinely exercised.
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const bytes = Buffer.from(pngBase64, 'base64');

  const form = new FormData();
  form.append('avatar', new Blob([bytes], { type: 'image/png' }), 'avatar.png');

  const res = await fetch(`${MIDDLEWARE_URL}/user/avatar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) throw new Error(`uploadAvatar failed (${res.status}): ${await res.text()}`);
  const body = await res.json();
  return body.avatarUrl;
}

export { MIDDLEWARE_URL };
