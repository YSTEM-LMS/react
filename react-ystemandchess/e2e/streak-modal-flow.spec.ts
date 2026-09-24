/**
 * E2E flow — StreakModal (PR #201 / #202).
 *
 * Traces a real student session: seed one completed day via the backend API
 * (matching exactly how the app's own lesson/puzzle screens record it), then
 * drive the actual UI to confirm GET /streak and GET /streak/calendar are
 * rendered live — no mocked network responses, no hardcoded 9-day figure.
 *
 * Requires BOTH servers running:
 *   middlewareNode:        npm start   (or nodemon src/server.js), port 8000
 *   react-ystemandchess:   npm start                               port 3000
 * against a real (ideally disposable/staging) MongoDB — set mongoURI in
 * middlewareNode/config accordingly. Do not run against production data.
 */

import { test, expect } from '@playwright/test';
import { signupTestStudent, loginAndGetToken, recordDayCompleted } from './seed';

test.describe.configure({ mode: 'serial' });

const RUN_ID = Date.now();
const USERNAME = `e2e_streak_${RUN_ID}`;
const PASSWORD = 'E2eTestPassword!23';

let token: string;

test.beforeAll(async () => {
  await signupTestStudent({
    username: USERNAME,
    password: PASSWORD,
    first: 'E2E',
    last: 'Streak',
    email: `${USERNAME}@example.test`,
  });
  token = await loginAndGetToken(USERNAME, PASSWORD);
  expect(token).toBeTruthy();

  // A single completed "today" is enough to prove currentStreak === 1 end
  // to end without needing several real calendar days of seeded history.
  await recordDayCompleted(token, USERNAME);
});

test.beforeEach(async ({ context }) => {
  // Seed the auth cookie directly — login itself isn't the subject under
  // test here (covered elsewhere); this starts the session already
  // authenticated as the real seeded student.
  await context.addCookies([
    {
      name: 'login',
      value: token,
      url: process.env.FRONTEND_URL || 'http://localhost:3000',
    },
  ]);
});

test('opens with the real streak figure from GET /streak, not the old hardcoded 9', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Streak', exact: true }).click();

  const streakModal = page.locator('.streak-modal-overlay');
  await expect(streakModal).toBeVisible();

  // The seeded student has exactly one completed day today — a real 1,
  // never the old hardcoded 9-day placeholder this PR replaced. Scoped to
  // .streak-left .big specifically (not a bare getByText('1')) — a plain
  // text match also catches the calendar's "1st of the month" day cell
  // whenever a run happens to land on the 1st, the same scoping
  // StreakModal's own unit test already uses for this exact reason.
  await expect(streakModal.locator('.streak-left .big')).toHaveText('1');
  await expect(streakModal.getByText('Day Streak')).toBeVisible();
});

test('calendar marks today as completed, from real GET /streak/calendar data', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Streak', exact: true }).click();

  const streakModal = page.locator('.streak-modal-overlay');
  await expect(streakModal).toBeVisible();

  // Today's cell carries both classes once the calendar response resolves:
  // is-today (always, from client-side date math) and is-completed (only
  // if the backend actually reported the seeded day back).
  const todayCell = streakModal.locator('.calendar-day.is-today');
  await expect(todayCell).toBeVisible();
  await expect(todayCell).toHaveClass(/is-completed/);
});

test('month navigation refetches the calendar for the newly selected month', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Streak', exact: true }).click();

  const streakModal = page.locator('.streak-modal-overlay');
  await expect(streakModal).toBeVisible();

  const monthLabel = streakModal.locator('.calendar-month');
  const initialLabel = await monthLabel.textContent();

  await streakModal.getByRole('button', { name: 'Previous month' }).click();
  await expect(monthLabel).not.toHaveText(initialLabel || '');

  // Last month has no seeded activity for this student, so no cell should
  // be marked completed — confirms the grid actually refetched instead of
  // reusing the current month's completed-day set.
  await expect(streakModal.locator('.calendar-day.is-completed')).toHaveCount(0);
});

test('closes when the overlay is clicked', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Streak', exact: true }).click();

  const streakModal = page.locator('.streak-modal-overlay');
  await expect(streakModal).toBeVisible();

  // Click the overlay itself, not the modal content, to match
  // handleOverlayClick's e.target === e.currentTarget check.
  await streakModal.click({ position: { x: 5, y: 5 } });
  await expect(streakModal).not.toBeVisible();
});
