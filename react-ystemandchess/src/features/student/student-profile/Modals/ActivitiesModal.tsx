/**
 * Activities Modal Component
 * 
 * Displays a modal showing the user's daily activities in a garden-themed interface.
 * Each completed activity is represented by a watered plant growing on vines.
 * The modal fetches activities from the backend and visualizes progress.
 * 
 * Features:
 * - Fetches daily activities from API
 * - Garden/plant theme with animated vines and growth
 * - Water meter visualization for progress
 * - Interactive activity checkboxes
 * - Stemmy character mascot
 * - Click outside to close functionality
 */

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./ActivitiesModal.scss";
import { ReactComponent as GrowthBox } from "../../../../assets/images/ActivitiesAssets/growth_box.svg";
import { ReactComponent as WaterMeter } from "../../../../assets/images/ActivitiesAssets/water_meter.svg";
import { ReactComponent as MiddleVine} from "../../../../assets/images/ActivitiesAssets/middle_vine.svg";
import { ReactComponent as TopVine} from "../../../../assets/images/ActivitiesAssets/top_vine.svg";
import { ReactComponent as HangingVine} from "../../../../assets/images/ActivitiesAssets/hanging_vine.svg";
import { ReactComponent as TopicBag } from "../../../../assets/images/ActivitiesAssets/topic_bag.svg";
import { ReactComponent as ShortBottomVine} from "../../../../assets/images/ActivitiesAssets/short_bottom_vine.svg";
import { ReactComponent as BottomVine} from "../../../../assets/images/ActivitiesAssets/bottom_vine.svg";
import { ReactComponent as Stemmy} from "../../../../assets/images/ActivitiesAssets/stemmy.svg";
import { environment } from "../../../../environments"; 
import { useCookies } from "react-cookie";
import { parseActivities } from "../../../../core/utils/activityNames";

/**
 * ActivitiesModal component - displays daily activities in garden theme
 * @param {Function} onClose - Callback to close the modal
 * @param {string} username - Username to fetch activities for
 */
const ActivitiesModal = ({ onClose, username }: { onClose: () => void; username: string }) => {
  const navigate = useNavigate();

  // Close modal only when clicking the background overlay (not child elements)
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const [cookies] = useCookies(['login']);
  const [activities, setActivities] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchActivities = async () => {
    try {
      const url = `${environment.urls.middlewareURL}/activities/${username}`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          'Authorization': `Bearer ${cookies.login}`,
          'Content-Type': 'application/json',
        },
      })
      const json = await response.json();
      // json.activities can be null for an account with no seeded
      // Activities document — fall back to an empty list instead of
      // throwing and leaving the modal stuck in a permanent loading state.
      const data = json.activities?.activities || [];
      const activityNames = parseActivities(data);
      setActivities(activityNames);
    } catch (err) {
      console.error("Error fetching activities:", err);
      setActivities([]);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
      fetchActivities()
        .catch(err => {
          console.error(err)
        });
  }, []);

  return ( 
    !loading && 
    <div className="activities-modal-overlay" onClick={handleOverlayClick}>
      <div className="modal-content">
        {/* Close (X) button */}
        <button className="close-button" onClick={onClose} aria-label="Close modal">
          &times;
        </button>

        {/* Growth Box section with vine, SVG, buttons, and water meter */}
        <div className="growth-box-container">
          <MiddleVine className="middle-vine" />
          <GrowthBox className="growth-box" />
          <div className="button-row">
            <button className="growth-btn">Practice</button>
            <button className="growth-btn">Puzzle</button>
          </div>
          <div className="water-meter">
            <WaterMeter />
          </div>
        </div>

        {/* Top vine area with hanging vine, task button, and daily activity buttons */}
        <div className="top-vine-container">
          <div className="top-vine-wrapper">
            <TopVine className="top-vine" />
            <HangingVine className="hanging-vine" />

            {/* Task banner button */}
            <button className="task-button">
              Complete Tasks to Water<br />and Grow your Seed!
            </button>

            {/* Stack of daily activity buttons. Activities are hard coded for now.*/}
            <div className="button-stack">
              {activities.map((activity, idx) => {
                //Use activity.completed to change visual for complete or incomplete task
                return (
                  <button 
                    className={`activity-button ${activity.completed ? 'completed' : ''}`} 
                    key={idx}
                    onClick={() => {
                      // Only route if the task isn't completed yet
                      if (!activity.completed) {
                        onClose(); // Close the modal overlay first
                        // If you ever need to pass the specific task ID to the next page:
                        navigate(`${activity.route}?taskId=${activity.id}`);
                        // navigate(activity.route);
                      }
                    }}
                  >
                    <span className="label">Daily Activity</span><br />
                    <span className="action">{activity.displayName}</span>
                    {activity.completed ? <div className="status-icon">✅</div> : <div className="status-icon">⏳</div>}
                  </button>
                  //check completed status, display conditional, then complete task in puzzles to check
                )
              })}
            </div>
          </div>
        </div>

        {/* Topic bag area with clickable topic buttons and bottom vines */}
        <div className="topic-bag-container">
          <TopicBag className="bag-image" />
          <button className="topic-button btn-1">Seed Growth</button>
          <button className="topic-button btn-2">Seed Tracker</button>
          <button className="topic-button btn-3">Earning Water</button>
          <button className="topic-button btn-4">Daily Activities</button>
          <ShortBottomVine className="short-bottom-vine" />
          <BottomVine className="bottom-vine" />
        </div>

        {/* Decorative stem character */}
        <div className="stemmy-container">
          <Stemmy className="stemmy" />
        </div>
      </div>
    </div>
  );
};

export default ActivitiesModal;
