import { useState, useEffect, useRef, useMemo, lazy, Suspense } from "react";
import { SetPermissionLevel } from '../../../globals';
import { useCookies } from 'react-cookie';
import { environment } from "../../../environments";
import { useNavigate } from "react-router";
import StatsChart from "./StatsChart";
import Puzzles from "../../puzzles/Puzzles";
import PlayComputer from "../../engine/PlayComputer";
import PlayStudent from "./PlayStudent";
import StreakModal from "./Modals/StreakModal";
import ActivitiesModal from "./Modals/ActivitiesModal";
import BadgesModal from "./Modals/BadgesModal";
import LeaderboardModal from "./Modals/LeaderboardModal";
import Confetti from "../../../components/animations/Confetti/Confetti";
import ChatWidget from '../../../components/ChatWidget/ChatWidget';
import { ReactComponent as StreakIcon } from "../../../assets/images/student/streak_button.svg";
import { ReactComponent as ActivitiesIcon } from "../../../assets/images/student/activities_button.svg";
import { ReactComponent as BadgesIcon } from "../../../assets/images/student/badges_button.svg";
import { ReactComponent as LeaderboardIcon } from "../../../assets/images/student/leaderboard_button.svg";

import userPortraitCamera from "../../../assets/images/camera.svg";
import activityIcon from "../../../assets/images/StudentInventoryIcons/activity-icon.svg";
import mentorIcon from "../../../assets/images/StudentInventoryIcons/mentor-icon.svg";
import learningIcon from "../../../assets/images/StudentInventoryIcons/learning-icon.svg";
import chessLessonsIcon from "../../../assets/images/StudentInventoryIcons/chess-lessons-icon.svg";
import gamesIcon from "../../../assets/images/StudentInventoryIcons/games-icon.svg";
import puzzlesIcon from "../../../assets/images/StudentInventoryIcons/puzzles-icon.svg";
import playComputerIcon from "../../../assets/images/StudentInventoryIcons/play-computer-icon.svg";
import recordingsIcon from "../../../assets/images/StudentInventoryIcons/recordings-icon.svg";

const TABS = {
  activity: {
    label: "Activity",
    icon: activityIcon,
  },
  mentor: {
    label: "Mentor",
    icon: mentorIcon,
  },
  prodev: {
    label: "Learning",
    icon: learningIcon,
  },
  chessLessons: {
    label: "Chess Lessons",
    icon: chessLessonsIcon,
  },
  mathLessons: {
    label: "Math Lessons",
    icon: learningIcon,
  },
  games: {
    label: "Games",
    icon: gamesIcon,
  },
  puzzles: {
    label: "Puzzles",
    icon: puzzlesIcon,
  },
  playComputer: {
    label: "Play with Computer",
    icon: playComputerIcon,
  },
  playStudent: {
    label: "Play a Student",
    icon: gamesIcon,
  },
  recordings: {
    label: "Recordings",
    icon: recordingsIcon,
  },
} as const;

type TabKey = keyof typeof TABS;

const Lessons = lazy(() => import("../../lessons/lessons-main/Lessons"));
const LessonsSelection = lazy(() => import("../../lessons/lessons-selection/LessonsSelection"));
const LessonOverlay = lazy(() => import("../../lessons/piece-lessons/lesson-overlay/Lesson-overlay"));

const NewStudentProfile = ({ userPortraitSrc }: any) => {

  const [activeModal, setActiveModal] = useState<null | "streak" | "activities" | "badges" | "leaderboard">(null);
  const [activeTab, setActiveTab] = useState("activity");
  const [cookies] = useCookies(['login']);
  const navigate = useNavigate();

  // User info
  const [username, setUsername] = useState(" ");
  const [firstName, setFirstName] = useState(" ");
  const [lastName, setLastName] = useState(" ");
  const [mentorUsername, setMentorUsername] = useState("");

  // Time spent on different activities (header display)
  const [webTime, setWebTime] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [lessonTime, setLessonTime] = useState(0);
  const [puzzleTime, setPuzzleTime] = useState(0);
  const [mentorTime, setMentorTime] = useState(0);

  // data for chart plotting
  const [displayMonths, setDisplayMonths] = useState(6); // display data from 6 many months back 
  const [displayEvents, setDisplayEvents] = useState(["website", "play", "lesson", "puzzle", "mentor"])
  const [monthAxis, setMonthAxis] = useState(["Jan", "Feb", "Mar", "Apr", "May"]); // display the time as X-axis
  const [dataAxis, setDataAxis] = useState<{ [key: string]: number[] }>({ website: [0, 0, 0, 0, 0], }); // time spent on events each month

  // Event tracking for pagination
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Avatar upload state
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploadError, setAvatarUploadError] = useState<string | null>(null);

  // Animation states
  const [showConfetti, setShowConfetti] = useState(false);
  const [celebrateAction, setCelebrateAction] = useState(false);

  // states for lessons tab
  const [lessonSelected, setLessonSelected] = useState(false); // whether user has navigated into a lesson
  const [piece, setPiece] = useState(""); // lesson name for props
  const [lessonNum, setLessonNum] = useState(0); // lesson number for props

  // Current date for display
  const [date, setDate] = useState(() =>
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
  );

  // Fetch user data and stats when component mounts
  useEffect(() => {
    try {
      fetchUserData(); // asynchronously fetch user data upon mounting
      fetchMentorData();
    } catch (err) {
      console.log(err)
    }
  }, [])

  // Add scroll listener to activity feed container for infinite scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handleScroll = () => {
      // If scrolling within 50px of displayed height
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        fetchActivity(username); // Fetch new activity
      }
    };
    el.addEventListener("scroll", handleScroll); // Add listener to the updated activity element
    return () => el.removeEventListener("scroll", handleScroll); // Remove listener when dependencies are updated
  }, [loading]);

  // Fetch user info, usage stats, and activity history
  const fetchUserData = async () => {
    const uInfo = await SetPermissionLevel(cookies);
    if (uInfo.error) {
      navigate("/login");
      return;
    }
    // A parent can open a specific child's profile via ?student=<username>
    const params = new URLSearchParams(window.location.search);
    const studentParam = params.get("student");
    const targetUsername = studentParam || uInfo.username;

    setUsername(targetUsername);
    if (studentParam) {
      setFirstName(params.get("name") || studentParam);
      setLastName("");
    } else {
      setFirstName(uInfo.firstName);
      setLastName(uInfo.lastName);
    }

    fetchUsageTime(targetUsername);
    fetchGraphData(targetUsername);
    fetchActivity(targetUsername);
    // GET /user/avatar is self-only (returns the authenticated user's own
    // avatar) — there's no backend support yet for a parent fetching a
    // child's avatar by username, so only call this when viewing your own
    // profile. Showing the parent's own avatar while viewing a child's
    // profile would be wrong, so skip it entirely rather than guess.
    if (!studentParam) fetchAvatarUrl();
  }

  // Fetch the current user's uploaded avatar, if any
  const fetchAvatarUrl = async () => {
    try {
      const res = await fetch(`${environment.urls.middlewareURL}/user/avatar`, {
        headers: { Authorization: `Bearer ${cookies.login}` },
      });
      const body = await res.json();
      if (res.ok) setAvatarUrl(body.avatarUrl);
    } catch (err) {
      console.error("Failed to fetch avatar:", err);
    }
  }

  // Fetch mentor data
  const fetchMentorData = async () => {
    fetch(`${environment.urls.middlewareURL}/user/getMentorship`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cookies.login}` }
    }).then(data => data.json())
      .then(data => {
        if (data) {
          setMentorUsername(data.username);
        }
      });
  }

  // Fetch time spent on different categories
  const fetchUsageTime = async (username) => {
    const responseStats = await fetch(
      `${environment.urls.middlewareURL}/timeTracking/statistics?username=${username}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${cookies.login}` }
      }
    );
    const dataStats = await responseStats.json();
    // Update time usage for different events in header display
    setWebTime(dataStats.website);
    setLessonTime(dataStats.lesson);
    setPlayTime(dataStats.play);
    setMentorTime(dataStats.mentor);
    setPuzzleTime(dataStats.puzzle);
  }

  // Fetch latest usage history (Activity Tab)
  const fetchActivity = async (username) => {
    if (loading || !hasMore) return; // Return if already fetching or no more activity left
    setLoading(true);
    const limit = 6; // Fetch at most 6 activities at a time
    const skip = page * limit; // Skip over previously fetched data
    try {
      // Fetch another batch of usage history
      const responseLatest = await fetch(
        `${environment.urls.middlewareURL}/timeTracking/latest?username=${username}&limit=${limit}&skip=${skip}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${cookies.login}` }
        }
      );
      const dataLatest = await responseLatest.json();
      setEvents(prev => [...prev, ...dataLatest]); //Append more events to old list
      setPage(prev => prev + 1); // Update pagination number
      setHasMore(dataLatest.length === limit && dataLatest.length > 0); // If there are more activities
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }

  // Fetch data for graph visualization
  const fetchGraphData = async (username) => {
    try {
      // Fetch time spent on the website in the past few months
      const response = await fetch(
        `${environment.urls.middlewareURL}/timeTracking/graph-data?username=${username}&events=${displayEvents.join(",")}&months=${displayMonths}`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${cookies.login}` }
        }
      );
      const data = await response.json();

      const newDataAxis = {} as { [key: string]: number[] };
      for (let i = 0; i < displayEvents.length; i++) {
        // get time spent for each event for plotting
        let event = displayEvents[i];
        let value = data[event];
        let months = value.map(item => item.monthText); // month list for ploting
        let times = value.map(item => item.timeSpent); // timeSpent for plotting

        setMonthAxis(months);
        newDataAxis[event] = times;
      }

      // update for graph plotting
      setDataAxis(newDataAxis);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }

  // Handle tab switch
  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab);
    // Add celebration animation for learning tabs
    if (tab === "prodev" || tab === "chessLessons") {
      setCelebrateAction(true);
      setTimeout(() => setCelebrateAction(false), 1000);
    }
  };

  // Redirect user when clicking on an activity item (e.g., lesson)
  const handleNavigateEvent = (type: string, name: string) => {
    if (type === "lesson") {
      navigate("/lessons", { state: { piece: name } });
    } else if (type === "puzzle") {
      navigate("/puzzles");
    }
  }

  // Opens the hidden file picker for changing the profile avatar
  const handlePortraitClick = () => {
    avatarFileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setAvatarUploadError(null);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const res = await fetch(`${environment.urls.middlewareURL}/user/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${cookies.login}` },
        body: formData,
      });
      const body = await res.json();
      if (!res.ok) {
        setAvatarUploadError(body.error || "Failed to upload avatar");
        return;
      }
      setAvatarUrl(body.avatarUrl);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    } catch (err) {
      console.error("Avatar upload failed:", err);
      setAvatarUploadError("Failed to upload avatar");
    }
  };

  // Render content based on active tab
  const renderTabContent = () => {
  switch (activeTab) {
    case "activity":
      return (
        <div className="w-full h-full">
          <div className="flex justify-between items-baseline border-b border-borderLight mb-4 pb-2">
            <h2 className="text-2xl font-bold text-dark">Activity</h2>
            <h4 className="text-sm text-gray">{date}</h4>
          </div>
          <div className="relative">
            <div 
              ref={containerRef}
              className="relative max-h-[700px] overflow-y-auto pr-2 activity-scrollbar"
            >
              {/* Timeline line */}
              <div className="absolute left-4 top-0 bottom-0 w-0.5">
                <div className="absolute top-0 bottom-0 left-0 w-full border-l-[3px] border-dotted border-gray" />
              </div>

              {/* Activity cards */}
              <div className="space-y-4 pl-12">
                {events && events.map((event, index) => {
                  const dateObj = new Date(event.startTime);
                  const dateStr = dateObj.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  });
                  const timeStr = dateObj.toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit'
                  });

                  return (
                    <article 
                      key={index}
                      className="relative bg-light border border-borderLight p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Timeline dot */}
                      <div className="absolute -left-9 top-6 w-3 h-3 bg-primary rounded-full border-2 border-light shadow-sm" />
                      
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 min-w-[120px]">
                          <p className="m-0">
                            <span className="block text-base font-medium text-dark">{dateStr}</span>
                            <span className="block text-sm text-gray mt-1">{timeStr}</span>
                          </p>
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="m-0 text-base text-dark">
                            Working on:{' '}
                            <strong 
                              className="text-primary underline cursor-pointer hover:text-secondary transition-colors"
                              onClick={() => handleNavigateEvent(event.eventType, event.eventName)}
                            >
                              {event.eventName === "Untitled event" ? event.eventType : event.eventName}
                            </strong>
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              
              {loading && (
                <div className="text-center p-4 pl-12">
                  <div className="inline-block w-5 h-5 border-[3px] border-primary/30 border-t-primary rounded-full animate-spin 1s linear infinite" />
                  <p className="mt-2 text-gray">Loading more activities...</p>
                </div>
              )}
              
              {!hasMore && events.length > 0 && (
                <p className="text-center p-4 pl-12 text-gray">
                  🎉 You've seen all your activities!
                </p>
              )}
            </div>
          </div>
        </div>
      );
    
    case "mentor":
      return (
        <div className="w-full h-full">
          <h2 className="text-2xl font-bold text-dark mb-4">Mentor</h2>
          <p className="text-gray">This is the content for the Mentor tab.</p>
        </div>
      );
    
    case "prodev":
      return (
        <div className="w-full h-full">
          <Suspense fallback={<h2 className="text-xl text-gray">Loading learning page...</h2>}>
            <Lessons styleType={"profile"} />
          </Suspense>
        </div>
      );
    
    case "chessLessons":
      return (
        <div className="w-full h-full">
          {lessonSelected ? (
            <Suspense fallback={<h2 className="text-xl text-gray">Loading lessons page...</h2>}>
              <LessonOverlay 
                propPieceName={piece} 
                propLessonNumber={lessonNum} 
                navigateFunc={() => setLessonSelected(false)} 
                styleType="profile" 
              />
            </Suspense>
          ) : (
            <Suspense fallback={<h2 className="text-xl text-gray">Loading lesson selection page...</h2>}>
              <LessonsSelection 
                styleType="profile" 
                onGo={(selectedScenario, lessonNum) => {
                  setLessonSelected(true);
                  setPiece(selectedScenario);
                  setLessonNum(lessonNum);
                }} 
              />
            </Suspense>
          )}
        </div>
      );
    
    case "mathLessons":
      return (
        <div className="w-full h-full">
          <h2 className="text-2xl font-bold text-dark mb-4">Math lessons</h2>
          <p className="text-gray">This is the content for the Math lessons tab.</p>
        </div>
      );
    
    case "games":
      return (
        <div className="w-full h-full">
          <h2 className="text-2xl font-bold text-dark mb-4">Games</h2>
          <p className="text-gray">This is the content for the Games tab.</p>
        </div>
      );
    
    case "puzzles":
      return (
        <div className="w-full h-full">
          <Puzzles student={username} mentor={mentorUsername} role={"student"} styleType="profile" />
        </div>
      );
    
    case "playComputer":
      return (
        <div className="w-full h-full">
          <PlayComputer />
        </div>
      );

    case "playStudent":
      return (
        <div className="w-full h-full">
          <PlayStudent username={username} />
        </div>
      );
    
    case "recordings":
      return (
        <div className="w-full h-full">
          <h2 className="text-2xl font-bold text-dark mb-4">Recordings</h2>
          <p className="text-gray">This is the content for the Recordings tab.</p>
        </div>
      );
    
    default:
      return (
        <div className="w-full h-full">
          <h2 className="text-xl text-gray">Select a tab to view its content.</h2>
        </div>
      );
  }
};

  const tabContent = useMemo(() => renderTabContent(), [activeTab, lessonSelected, piece, lessonNum, events, loading, hasMore]);

  return (
  <main className="bg-soft min-h-screen relative mb-12">
    {/* Toolbar with modal triggers */}
    <section className="w-full bg-primary py-4">
      <div className="w-full max-w-screen-2xl mx-auto px-6 flex justify-center gap-4">
        <button
          className="btn-toolbar"
          aria-label="Streak"
          onClick={() => setActiveModal(activeModal === "streak" ? null : "streak")}
        >
          <StreakIcon className={`w-full h-20 transition-colors duration-200 ${
            activeModal === "streak" ? "text-accent" : "text-secondary hover:text-accent"
          }`} />
        </button>
        <button
          className="btn-toolbar"
          aria-label="Activities"
          onClick={() => setActiveModal(activeModal === "activities" ? null : "activities")}
        >
          <ActivitiesIcon className={`w-full h-20 transition-colors duration-200 ${
            activeModal === "activities" ? "text-accent" : "text-secondary hover:text-accent"
          }`} />
        </button>
        <button
          className="btn-toolbar"
          aria-label="Badges"
          onClick={() => setActiveModal(activeModal === "badges" ? null : "badges")}
        >
          <BadgesIcon className={`w-full h-20 transition-colors duration-200 ${
            activeModal === "badges" ? "text-accent" : "text-secondary hover:text-accent"
          }`} />
        </button>
        <button
          className="btn-toolbar"
          aria-label="Leaderboard"
          onClick={() => setActiveModal(activeModal === "leaderboard" ? null : "leaderboard")}
        >
          <LeaderboardIcon className={`w-full h-20 transition-colors duration-200 ${
            activeModal === "leaderboard" ? "text-accent" : "text-secondary hover:text-accent"
          }`} />
        </button>
      </div>
    </section>

    {/* Confetti effect */}
    <Confetti show={showConfetti} />

    {/* Compact header with avatar */}
    <section className="bg-light border-b border-borderLight">
      <div className="w-full max-w-screen-2xl mx-auto px-6 py-4 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-dark">
          Hello {firstName}!
        </h1>
        <div className="flex flex-col items-end gap-1">
          <div
            className="relative w-14 h-14 rounded-full bg-light border-2 border-primary flex items-center justify-center shadow-sm cursor-pointer transition-transform hover:scale-105 active:scale-95"
            onClick={handlePortraitClick}
            title="Change profile photo"
          >
            <img
              className={avatarUrl ? "w-full h-full object-cover rounded-full" : "w-8 h-8 object-contain"}
              src={avatarUrl || userPortraitSrc}
              alt="Profile"
            />
            <img
              className="absolute -bottom-1 -right-1 w-5 h-5 bg-light border-2 border-primary rounded-full p-0.5"
              src={userPortraitCamera}
              alt=""
            />
          </div>
          <input
            ref={avatarFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarFileChange}
          />
          {avatarUploadError && (
            <span className="text-xs text-red-600">{avatarUploadError}</span>
          )}
        </div>
      </div>
    </section>

    {/* Main section */}
    <section className={`w-full max-w-screen-2xl mx-auto my-8 px-6 transition-transform ${
      celebrateAction ? 'celebrate-pulse 1s ease-in-out' : ''
    }`}>
      <div className="bg-light rounded-2xl overflow-hidden shadow-lg">
        <div className="bg-primary p-6">
          <h2 className="font-bold text-3xl text-light m-0">Your Progress</h2>
        </div>
        
        <div className="flex flex-wrap items-center justify-center border-b-2 border-primary p-8 gap-12">
          <div className="h-72 w-full max-w-2xl">
            <StatsChart key={monthAxis.join(',')} monthAxis={monthAxis} dataAxis={dataAxis} />
          </div>
          
          <div className="text-left">
            <h3 className="text-xl font-bold mb-4 text-dark">Time Spent:</h3>
            <ul className="list-none p-0 space-y-2">
              <li className="text-dark font-medium">
                Website: <strong className="text-primary">{webTime} min</strong>
              </li>
              <li className="text-dark font-medium">
                Playing: <strong className="text-primary">{playTime} min</strong>
              </li>
              <li className="text-dark font-medium">
                Lessons: <strong className="text-primary">{lessonTime} min</strong>
              </li>
              <li className="text-dark font-medium">
                Puzzle: <strong className="text-primary">{puzzleTime} min</strong>
              </li>
              <li className="text-dark font-medium">
                Mentoring: <strong className="text-primary">{mentorTime} min</strong>
              </li>
            </ul>
          </div>
        </div>

        {/* Tab section */}
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr]">
          <nav className="relative bg-primary border-r border-borderLight">
            <ul className="list-none p-4 m-0 space-y-2">
              {(Object.keys(TABS) as TabKey[]).map((tab) => {
                const { label, icon } = TABS[tab];
                const isActive = activeTab === tab;

                return (
                  <li key={tab}>
                    <button
                      className={`w-full flex items-center gap-3 p-4 rounded-lg transition-all ${
                        isActive 
                          ? 'bg-light shadow-sm' 
                          : 'hover:bg-light'
                      }`}
                      onClick={() => handleTabClick(tab)}
                      aria-label={tab}
                    >
                      <img 
                        src={icon} 
                        alt={`${label} icon`}
                        className={`w-12 h-12 object-contain flex-shrink-0 transition-all ${
                          isActive ? 'grayscale-0' : 'grayscale'
                        }`}
                      />
                      <span className="text-base font-bold text-dark">
                        {label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          
          <div className="bg-light p-8 overflow-y-auto min-h-[600px]">
            {tabContent}
          </div>
        </div>
      </div>
    </section>

    {/* Modals */}
    {activeModal === "streak" && <StreakModal onClose={() => setActiveModal(null)} />}
    {activeModal === "activities" && <ActivitiesModal onClose={() => setActiveModal(null)} username={username} />}
    {activeModal === "badges" && <BadgesModal onClose={() => setActiveModal(null)} username={username} />}
    {activeModal === "leaderboard" && <LeaderboardModal onClose={() => setActiveModal(null)} />}
    <ChatWidget />
  </main>
);
};

export default NewStudentProfile;
