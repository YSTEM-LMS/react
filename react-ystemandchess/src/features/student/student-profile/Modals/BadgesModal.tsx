/**
 * Badges Modal Component
 * 
 * Displays a modal showing all available badges and which ones the user has earned.
 * Fetches badge catalog and user's earned badges from the API.
 * Earned badges are displayed in color, unearned badges are grayed out.
 * 
 * Features:
 * - Fetches badge catalog and user's earned badges
 * - Visual distinction between earned and unearned badges
 * - Badge details including name, description, and icon
 * - Loading state while fetching data
 * - Click outside to close functionality
 */

import React, { useEffect, useState, useMemo } from "react";
import { useCookies } from "react-cookie";
import "./BadgesModal.scss";
import { getBadgeCatalog, getUserBadges } from "../../../../core/services/badgesApi";
import { BadgeCard } from "../../../../components/BadgeCard";

/**
 * BadgesModal component - displays user's badge achievements
 * @param {Function} onClose - Callback to close the modal
 * @param {string} username - Username to fetch earned badges for (must match the JWT)
 */
const BadgesModal = ({ onClose, username }: { onClose: () => void; username: string }) => {
  const [cookies] = useCookies(['login']);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [earnedIds, setEarnedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const [badges, earned] = await Promise.all([
          getBadgeCatalog(),
          getUserBadges(username, cookies.login)
        ]);
        setCatalog(badges);
        setEarnedIds(earned.map((b: any) => b.badgeId));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username]);

  const badgeList = useMemo(() => {
    return catalog.map(b => ({
      ...b,
      isEarned: earnedIds.includes(b.id)
    }));
  }, [catalog, earnedIds]);

  console.log(" catalog:", catalog);
  console.log(" earnedIds:", earnedIds);
  console.log(" badgeList:", badgeList);

  return (
    // Same shell as LeaderboardModal: this popup used to get its look from
    // LeaderboardModal.scss (deleted in #317), so it keeps that look with tokens.
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-dark/25 py-20"
      onClick={handleOverlayClick}
    >
      <div
        data-testid="badges-modal"
        className="relative max-h-full w-11/12 max-w-4xl animate-modal-in overflow-y-auto overflow-x-hidden rounded-2xl bg-soft bg-none px-3 pb-3 pt-5 shadow-2xl sm:px-4 sm:pt-6"
      >
        <button
          className="absolute right-2 top-2 z-10 inline-flex h-10 w-10 items-center justify-center text-3xl font-extrabold leading-none text-red hover:opacity-75"
          onClick={onClose}
          aria-label="Close modal"
        >
          &times;
        </button>
        <h2>Badges</h2>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="badges-grid">
            {badgeList.map(b => (
              <BadgeCard
                key={b.id}
                icon={b.icon}
                label={b.name}
                state={b.isEarned ? "earned" : "locked"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BadgesModal;
