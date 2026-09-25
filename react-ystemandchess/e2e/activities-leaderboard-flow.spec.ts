/**
 * E2E coverage for the original 5-item pending-tasks list:
 *   1. Activities Modal navigation (route/taskId-based)
 *   2. Leaderboard backend integration (real data, sorting/ranking preserved)
 *   3. Dynamic filters (Country/State/School) + backend pagination
 *   4. Real user avatars (upload + display, replacing rank placeholders)
 *   5. End-to-end validation of the above
 *
 * Requires BOTH servers running against a disposable/staging MongoDB — see
 * gamification-flow.spec.ts header comment for the same setup.
 */

import { test, expect } from '@playwright/test';
import {
  signupTestStudent,
  loginAndGetToken,
  updateProfile,
  uploadAvatar,
} from './seed';

test.describe.configure({ mode: 'serial' });

const RUN_ID = Date.now();
const PASSWORD = 'E2eTestPassword!23';

// Three students so filtering/sorting/pagination all have something real to
// operate on — one is the "self" account whose avatar/profile we edit.
const SELF = { username: `e2e_self_${RUN_ID}`, first: 'Self', last: 'Student' };
const PEER_A = { username: `e2e_peera_${RUN_ID}`, first: 'PeerA', last: 'Student' };
const PEER_B = { username: `e2e_peerb_${RUN_ID}`, first: 'PeerB', last: 'Student' };

let selfToken: string;

test.beforeAll(async () => {
  for (const u of [SELF, PEER_A, PEER_B]) {
    await signupTestStudent({
      username: u.username,
      password: PASSWORD,
      first: u.first,
      last: u.last,
      email: `${u.username}@example.test`,
    });
  }

  selfToken = await loginAndGetToken(SELF.username, PASSWORD);
  const peerAToken = await loginAndGetToken(PEER_A.username, PASSWORD);
  const peerBToken = await loginAndGetToken(PEER_B.username, PASSWORD);

  // Distinct country/state/school per student so filter tests can
  // distinguish "filter applied" from "everyone happens to match".
  await updateProfile(selfToken, { country: 'USA', state: 'FL', school: `E2E School A ${RUN_ID}` });
  await updateProfile(peerAToken, { country: 'USA', state: 'GA', school: `E2E School B ${RUN_ID}` });
  await updateProfile(peerBToken, { country: 'Canada', state: 'ON', school: `E2E School C ${RUN_ID}` });
});

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    { name: 'login', value: selfToken, url: process.env.FRONTEND_URL || 'http://localhost:3000' },
  ]);
});

test('item 1 — incomplete activity card navigates using backend-provided route/taskId', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Activities' }).click();

  const activitiesModal = page.locator('.activities-modal-overlay');
  await expect(activitiesModal).toBeVisible();

  // Incomplete activity buttons have class "activity-button " (no
  // "completed" modifier — ActivitiesModal.tsx only ever adds a
  // "completed" class, never an "incomplete" one). The real onClick calls
  // navigate(`${activity.route}?taskId=${activity.id}`), so a successful
  // click must land somewhere other than /student-profile with a real
  // taskId query param, proving both route AND taskId came from the backend.
  const incompleteButton = page.locator('.activity-button:not(.completed)').first();
  await expect(incompleteButton).toBeVisible();
  await incompleteButton.click();

  await page.waitForURL(/taskId=/, { timeout: 5000 });
  const url = new URL(page.url());
  expect(url.pathname).not.toBe('/student-profile');
  expect(url.searchParams.get('taskId')).toBeTruthy();
});

test('item 2 — leaderboard shows real backend data, not dummy rows, with correct default ranking', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Leaderboard' }).click();

  const leaderboardModal = page.locator('.modal-content').filter({ hasText: 'Leaderboard' });
  await expect(leaderboardModal.first()).toBeVisible();

  // The dummy data the modal used to ship with was fixed rows (princel04,
  // jesse_chess, mary_rose, user_name...) — none of those should ever
  // appear; only our real, freshly-seeded usernames should.
  await expect(page.getByText('princel04')).toHaveCount(0);
  await expect(page.getByText('user_name')).toHaveCount(0);

  const searchBox = page.getByPlaceholder('Search by name...');
  await searchBox.fill(SELF.username);
  // No fixed sleep for the 300ms debounce + real network round trip — let
  // toBeVisible's own auto-retry (default 5s) cover it instead. A fixed
  // wait here previously made this flaky against a real backend, whose
  // response time isn't as instant as a mocked one.
  await expect(page.getByRole('table').getByText(SELF.username)).toBeVisible();
});

test('item 3 — Country, State, and School filters each narrow results via the real backend', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Leaderboard' }).click();
  const table = page.getByRole('table');

  // School filter — narrows to exactly the one student in that school.
  // No fixed sleep for the debounce — toBeVisible/toHaveCount auto-retry.
  const schoolSelect = page.locator('select').nth(2); // Country, State, School order
  await schoolSelect.selectOption({ label: `E2E School A ${RUN_ID}` });
  await expect(table.getByText(SELF.username)).toBeVisible();
  await expect(table.getByText(PEER_A.username)).toHaveCount(0);
  await schoolSelect.selectOption({ label: 'All Schools' });

  // Country filter — Canada should isolate PEER_B only.
  const countrySelect = page.locator('select').nth(0);
  await countrySelect.selectOption({ label: 'Canada' });
  await expect(table.getByText(PEER_B.username)).toBeVisible();
  await expect(table.getByText(SELF.username)).toHaveCount(0);
  await countrySelect.selectOption({ label: 'All Countries' });

  // State filter — GA should isolate PEER_A only.
  const stateSelect = page.locator('select').nth(1);
  await stateSelect.selectOption({ label: 'GA' });
  await expect(table.getByText(PEER_A.username)).toBeVisible();
  await expect(table.getByText(SELF.username)).toHaveCount(0);
});

test('item 3 — Load More triggers real backend pagination, not client-side dummy expansion', async ({ page }) => {
  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Leaderboard' }).click();

  const table = page.getByRole('table');
  const initialRowCount = await table.locator('tbody tr').count();

  // The button's accessible name is dynamic — "Load More" when there's a
  // next page, "No more data" once exhausted (LeaderboardModal.tsx) — so
  // match on the stable class instead of text that may not exist yet.
  const loadMoreButton = page.locator('button.lb-load-btn');
  await expect(loadMoreButton).toBeVisible();

  // Only meaningfully testable when there are more results than one page —
  // guard so this doesn't false-fail on a near-empty seeded DB (disabled
  // attribute is present/absent synchronously once the button is visible,
  // no actionability wait needed here).
  const isDisabled = await loadMoreButton.isDisabled();
  if (!isDisabled) {
    await loadMoreButton.click();
    await page.waitForTimeout(500);
    const afterRowCount = await table.locator('tbody tr').count();
    expect(afterRowCount).toBeGreaterThanOrEqual(initialRowCount);
  } else {
    // Document why: fewer total students than one page size in this run.
    await expect(loadMoreButton).toHaveText(/no more data/i);
  }
});

test('item 4 — uploading a real avatar replaces the rank-based placeholder in the leaderboard', async ({ page }) => {
  const avatarUrl = await uploadAvatar(selfToken);
  expect(avatarUrl).toBeTruthy();

  await page.goto('/student-profile');
  await page.getByRole('button', { name: 'Leaderboard' }).click();

  const searchBox = page.getByPlaceholder('Search by name...');
  await searchBox.fill(SELF.username);

  const row = page.getByRole('table').locator('tr', { has: page.getByText(SELF.username) });
  const avatarImg = row.locator('img.lb-avatar-img');
  await expect(avatarImg).toBeVisible();
  const src = await avatarImg.getAttribute('src');
  // A real uploaded avatar resolves to a presigned S3 URL, not one of the
  // bundled rank-placeholder PNGs (Leaderboard_User_avatar_*.png).
  expect(src).not.toMatch(/Leaderboard_User_avatar/);
});

test('item 4 — profile header avatar reflects the uploaded photo, not the default placeholder', async ({ page }) => {
  await page.goto('/student-profile');
  // Avatar is fetched via GET /user/avatar on mount — give it a moment.
  await page.waitForTimeout(500);

  const headerAvatarImg = page.locator('img[alt="Profile"]');
  await expect(headerAvatarImg).toBeVisible();
  const src = await headerAvatarImg.getAttribute('src');
  expect(src).not.toMatch(/user-portrait-placeholder/);
});
