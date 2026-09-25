/**
 * Streak Modal Component
 * 
 * Displays a modal showing the user's daily activity streak progress.
 * Features animated characters (Stemette and Stemmy) with encouraging messages,
 * a visual streak tracker with clock icon, and a real calendar view fetched
 * from the streak API.
 * 
 * Features:
 * - Animated character mascots with speech bubbles
 * - Visual streak progress indicator, fetched from GET /streak
 * - Monthly calendar tracking completed days, fetched from GET /streak/calendar
 * - Click outside to close functionality
 */

import React, { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import "./StreakModal.scss";
import { ReactComponent as Polygon } from "../../../../assets/images/StreakProgressAssets/polygon.svg";
import { ReactComponent as Polygon_2 } from "../../../../assets/images/StreakProgressAssets/polygon_2.svg";
import streakClock from "../../../../assets/images/StreakProgressAssets/streak_progress_clock.png";
import { ReactComponent as Stemette } from "../../../../assets/images/StreakProgressAssets/stemette.svg";
import { ReactComponent as Stemmy } from "../../../../assets/images/StreakProgressAssets/stemmy.svg";
import { environment } from "../../../../environments/environment";

/**
 * StreakModal component - displays user's streak progress
 * @param {Function} onClose - Callback to close the modal
 * @param {string} username - Username to fetch streak data for
 */
const StreakModal = ({ onClose, username }: { onClose: () => void; username: string }) => {
  const [cookies] = useCookies(["login"]);
  const [currentStreak, setCurrentStreak] = useState<number>(0);
  const [calendarDays, setCalendarDays] = useState<{ date: string; completed: boolean }[]>([]);
  const [loading, setLoading] = useState(true);

  // Overlay click handler - closes modal only if clicking outside modal content
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  useEffect(() => {
    const fetchStreakData = async () => {
      try {
        const streakRes = await fetch(
          `${environment.urls.middlewareURL}/streak?username=${username}`,
          { headers: { Authorization: `Bearer ${cookies.login}` } }
        );
        const streakData = await streakRes.json();
        setCurrentStreak(streakData.currentStreak ?? 0);

        const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"
        const calRes = await fetch(
          `${environment.urls.middlewareURL}/streak/calendar?username=${username}&month=${month}`,
          { headers: { Authorization: `Bearer ${cookies.login}` } }
        );
        const calData = await calRes.json();
        setCalendarDays(calData.days || []);
      } catch (err) {
        console.error("Failed to fetch streak data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStreakData();
  }, [username, cookies.login]);

  return (
    <div className="streak-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Close button in top-right */}
        <button className="close-button" onClick={onClose} aria-label="Close modal">
          &times;
        </button>

        {/* Left speech bubble with tail and character */}
        <div className="speech-bubble-container left">
          <div className="speech-box">Keep up the great work!</div>
          <Polygon className="speech-tail" />
        </div>

        <Stemette className="leaning-left-inside" />

        {/* Right speech bubble with tail and character */}
        <div className="speech-bubble-container right">
          <div className="speech-box">
            You are almost at the end<br />of the week!
          </div>
          <Polygon_2 className="speech-tail" />
        </div>

        <Stemmy className="leaning-right-inside" />

        {/* Streak header with clock and stats */}
        <div className="streak-header">
          <img src={streakClock} alt="Streak Clock" className="streak-clock" />

          <div className="streak-text streak-left">
            <p className="big">{loading ? "…" : currentStreak}</p>
            <p className="small">Day Streak</p>
          </div>

          <div className="streak-text streak-right">
            <p className="small">Today is</p>
            <p className="big">
              {new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
            </p>
          </div>
        </div>

        {/* Monthly calendar, fetched from GET /streak/calendar */}
        <div className="calendar-image-wrapper">
          <div className="calendar-grid">
            {calendarDays.map((day) => (
              <div
                key={day.date}
                className={`calendar-day ${day.completed ? "completed" : ""}`}
                title={day.date}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StreakModal;