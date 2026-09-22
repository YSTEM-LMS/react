import React, { useState, useEffect, useRef, useMemo } from "react";
import "./NewMentorProfile.scss";
import Images from "../../../assets/images/imageImporter";
import { SetPermissionLevel } from '../../../globals'; 
import { useCookies } from 'react-cookie';
import { environment } from "../../../environments";
import { useNavigate } from "react-router";
import StatsChart from "../../student/student-profile/StatsChart";
import Lessons from "../../lessons/lessons-main/Lessons";
import LessonSelection from "../../lessons/lessons-selection/LessonsSelection";
import LessonOverlay from "../../lessons/piece-lessons/lesson-overlay/Lesson-overlay";
import Puzzles from "../../puzzles/Puzzles";

interface NewMentorProfileProps {
  userPortraitSrc: string;
  student?: Student; // optional student prop
}

interface Student {
  username: string;
  firstName: string;
  lastName: string;
}

const NewMentorProfile: React.FC<NewMentorProfileProps> = ({ userPortraitSrc }) => {

  const [activeTab, setActiveTab] = useState("activity");
  const [cookies] = useCookies(['login']);
  const navigate = useNavigate();

  // mentor info
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState(" ");
  const [lastName, setLastName] = useState(" ");
  const [hasStudent, setHasStudent] = useState(false); // if the mentor has a student

  // student usage stats in different modules
  const [webTime, setWebTime] = useState(0);
  const [playTime, setPlayTime] = useState(0);
  const [lessonTime, setLessonTime] = useState(0);
  const [puzzleTime, setPuzzleTime] = useState(0);
  const [mentorTime, setMentorTime] = useState(0);

  // data for chart plotting
  const [displayMonths, setDisplayMonths] = useState(6); // display data from 6 many months back 
  const [displayEvents, setDisplayEvents] = useState(["website", "play", "lesson", "puzzle", "mentor"])
  const [monthAxis, setMonthAxis] = useState(["Jan", "Feb", "Mar", "Apr", "May"]); // display the time as X-axis
  const [dataAxis, setDataAxis] = useState<{[key: string]: number[]}>({website: [0, 0, 0, 0, 0],}); // time spent on events each month

  // student info
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");

  // event tracking for pagination
  const [events, setEvents] = useState([]);
  const [page, setPage] = useState(0); // page number
  const [loading, setLoading] = useState(false); // if loading for more events
  const [hasMore, setHasMore] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // current date for display
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
  );

  // states for lessons tab
  const [lessonSelected, setLessonSelected] = useState(false); // whether user has navigated into a lesson
  const [piece, setPiece] = useState(""); // lesson name for props
  const [lessonNum, setLessonNum] = useState(0); // lesson number for props

  // Educator Dashboard states
  const [sessions, setSessions] = useState<any[]>([]);
  const [totalSessions, setTotalSessions] = useState(0);
  const [studentSearch, setStudentSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState("All Topics");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dashboardPage, setDashboardPage] = useState(1);
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [selectedTranscript, setSelectedTranscript] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentCoachingSessions, setStudentCoachingSessions] = useState<any[]>([]);
  const [isFetchingCoaching, setIsFetchingCoaching] = useState(false);

  const fetchStudentCoachingSessions = (resolvedStudentId: string) => {
    setIsFetchingCoaching(true);
    fetch(`${environment.urls.middlewareURL}/chat/sessions?userId=${resolvedStudentId}&limit=20`, {
      headers: { 'Authorization': `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          const completed = data.sessions.filter((s: any) => s.status === 'completed');
          setStudentCoachingSessions(completed);
        }
      })
      .catch(err => console.error("Error fetching student coaching sessions:", err))
      .finally(() => setIsFetchingCoaching(false));
  };

  const fetchSessions = () => {
    const limit = 10;
    const skip = (dashboardPage - 1) * limit;
    let url = `${environment.urls.middlewareURL}/chat/educator/sessions?skip=${skip}&limit=${limit}`;
    if (topicFilter && topicFilter !== 'All Topics') {
      url += `&topic=${encodeURIComponent(topicFilter)}`;
    }
    if (studentSearch) {
      url += `&student=${encodeURIComponent(studentSearch)}`;
    }
    if (startDate) {
      url += `&startDate=${encodeURIComponent(startDate)}`;
    }
    if (endDate) {
      url += `&endDate=${encodeURIComponent(endDate)}`;
    }

    fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.sessions) {
          setSessions(data.sessions);
          setTotalSessions(data.total);
        }
      })
      .catch(err => console.error("Error fetching educator sessions:", err));
  };

  useEffect(() => {
    fetchSessions();
  }, [topicFilter, studentSearch, startDate, endDate, dashboardPage]);

  const handleViewTranscript = (sessionId: string, session: any) => {
    fetch(`${environment.urls.middlewareURL}/chat/educator/session/${sessionId}/transcript`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${cookies.login}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.messages) {
          setSelectedTranscript(data.messages);
          setSelectedSession(session);
          setIsModalOpen(true);
        }
      })
      .catch(err => console.error("Error fetching transcript:", err));
  };

  const handleCopyLMS = (session: any) => {
    const text = `STUDENT: ${session.userId ? `${session.userId.firstName} ${session.userId.lastName} (${session.userId.username})` : 'Unknown'}
DATE: ${new Date(session.createdAt).toLocaleDateString()}
TOPIC: ${session.topic}
SUMMARY: ${session.summary || 'N/A'}
ACTION ITEMS:
${session.actions && session.actions.length > 0 ? session.actions.map((act: any, idx: any) => `${idx + 1}. ${act}`).join('\n') : 'None'}`;
    
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("Session summary successfully copied to clipboard for LMS/CRM import!");
      })
      .catch(err => {
        console.error("Failed to copy summary:", err);
      });
  };
  // Runs once upon first render
  useEffect(()=>{
    fetchStudentData().catch(err => console.log(err)); // fetch student data when the component mounts
    fetchUserData().catch(err => console.log(err)); // fetch user data when the component mounts
  }, [])

  // Loads student data only after hasStudent has been updated
  useEffect(() => {
    if (hasStudent && studentUsername) {
        // fetch student usage time stats to disaply in header
        fetchUsageTime(studentUsername)
        // fetch student data for graph plotting
        fetchGraphData(studentUsername)
        // fetch latest usage history to show in Activity tab
        fetchActivity(studentUsername)
        // Resolve student MongoDB _id for fetching coaching sessions
        fetch(`${environment.urls.middlewareURL}/user/getUser?username=${encodeURIComponent(studentUsername)}`, {
          headers: { 'Authorization': `Bearer ${cookies.login}` }
        })
          .then(res => res.json())
          .then(data => {
            if (data && data._id) {
              setStudentId(data._id);
              fetchStudentCoachingSessions(data._id);
            }
          })
          .catch(err => console.error("Error resolving student ID:", err));
      }
  }, [hasStudent, studentUsername])

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
        fetchActivity(studentUsername);
      }
    };

    el.addEventListener("scroll", handleScroll);
    return () => el.removeEventListener("scroll", handleScroll);
  }, [loading]);


  const fetchUserData = async () => {
      const uInfo = await SetPermissionLevel(cookies); // get logged-in user info
      if (uInfo.error) {
        console.log("Error: user not logged in.") // error if the user is not logged in
        navigate("/login"); // redirect to login page
      } else {
        // record user info
        setUsername(uInfo.username);
        setFirstName(uInfo.firstName);
        setLastName(uInfo.lastName)
      }
  }

  // fetch usage time stats to display in header
  const fetchUsageTime = async (username) => {
    // fetch from back end
    const responseStats = await fetch(
      `${environment.urls.middlewareURL}/timeTracking/statistics?username=${username}`,
      {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${cookies.login}` }
      }
    );
    const dataStats = await responseStats.json();
    // update time usage for different events in header display
    setWebTime(dataStats.website);
    setLessonTime(dataStats.lesson);
    setPlayTime(dataStats.play);
    setMentorTime(dataStats.mentor);
    setPuzzleTime(dataStats.puzzle);
  }

  const fetchStudentData = async () => {
    try {
      const res = await fetch(`${environment.urls.middlewareURL}/user/getMentorship`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${cookies.login}` }
      });
      if (res.status === 404) {
        console.warn("Mentorship not set. Automatically setting default student 'student'...");
        await setStubStudent("student");
        // Retry fetch once mentorship is established
        setTimeout(() => {
          fetchStudentData();
        }, 500);
        return;
      }
      const data = await res.json();
      if (data && data.username) {
        setStudentFirstName(data.firstName || "Test");
        setStudentLastName(data.lastName || "Student");
        setStudentUsername(data.username);
        setHasStudent(true);
      }
    } catch (err) {
      console.error("Error fetching student data:", err);
    }
  }

  const setStubStudent = async (stubStudentUsername) => {
    console.log("Setting stub student:", stubStudentUsername);
    try {
      const response = await fetch(`${environment.urls.middlewareURL}/user/updateMentorship?mentorship=${stubStudentUsername}`, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${cookies.login}`,
          'Content-Type': 'application/json'
        }
      });
      const data = await response.json();
      console.log("Set student response:", data);
      return data;
    } catch (err) {
      console.error("Error updating mentorship:", err);
    }
  }

// fetch latest usage history (Activity Tab)
  const fetchActivity = async (username) => {
    if (loading || !hasMore) return; // return if already fetching or no more activity left

    setLoading(true);
    const limit = 6; // fetch at most 6 activities at a time
    const skip = page * limit; // skip over previously fetched data

    try {
      // fetch another batch of usage history
      const responseLatest = await fetch(
        `${environment.urls.middlewareURL}/timeTracking/latest?username=${username}&limit=${limit}&skip=${skip}`, 
        {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${cookies.login}` }
        }
      );
      const dataLatest = await responseLatest.json();

      setEvents(prev => [...prev, ...dataLatest]); // append more events to old list
      setPage(prev => prev + 1); // update pagination number
      setHasMore(dataLatest.length === limit && dataLatest.length > 0); // if there are more activities
      setLoading(false);
    } catch (err) {
      console.error("Failed to fetch events", err);
    }
  }

  // fetch data needed for updating graph plot
  const fetchGraphData = async (username) => {
    try {
      // fetch the time spent on the website in the past few months
      const response = await fetch(
        `${environment.urls.middlewareURL}/timeTracking/graph-data?username=${username}&events=${displayEvents.join(",")}&months=${displayMonths}`, 
        {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${cookies.login}` }
        }
      );
      const data = await response.json(); 

      const newDataAxis = {} as {[key: string]: number[]};
      for(let i = 0; i < displayEvents.length; i++)
      {
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

  const handleTabClick = (tab: any) => {
    setActiveTab(tab);
  };

  const handleNavigateEvent = (type: string, name: string) => {
    if(type == "lesson") {
      navigate("/lessons", { state: { piece: name } });
    }
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return (
          <div
            id="inventory-content-activity"
            className="inventory-content active-content"
          >
            <div className="inventory-content-headingbar">
              <h2>Activity</h2>
              <h4>{date}</h4>
            </div>
            <div className="inventory-content-line"></div>
            <div className="inventory-content-body" ref={containerRef}>
              {events && events.map((event, index) => { // render list of usage history
                const dateObj = new Date(event.startTime);
                const dateStr = dateObj.toLocaleDateString('en-US', { // date of each history
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                });
                const timeStr = dateObj.toLocaleTimeString('en-US', { // time of each history
                  hour: 'numeric',
                  minute: '2-digit'
                });

                return (
                  <article key={index} className="inventory-content-timecard">
                    <div className="inventory-content-col1"></div>
                    <div className="inventory-content-col2">
                      <p>{dateStr} {timeStr}</p>
                    </div>
                    <div className="inventory-content-col3">
                      <p>
                        Working on {event.eventType}:{' '}
                        <strong onClick={() => handleNavigateEvent(event.eventType, event.eventName)}>{event.eventName}</strong>
                      </p>
                    </div>
                  </article>
                );
              })}
              {loading && <p>Loading more...</p>}
              {!hasMore && <p>No more activity left!</p>}
            </div>
          </div>
        );
      case "mentor":
        return (
          <div id="inventory-content-mentor" className="inventory-content active-content">
            <div className="inventory-content-headingbar">
              <h2>Student Completed AI Coaching</h2>
              <h4>Recent completed sessions & committed plans</h4>
            </div>
            
            {isFetchingCoaching ? (
              <p>Loading coaching sessions...</p>
            ) : studentCoachingSessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
                <p>No completed AI Coaching sessions found for {studentFirstName}.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', marginTop: '1rem' }}>
                {studentCoachingSessions.map((session, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      background: 'white', 
                      border: '2px solid #1F1F1F', 
                      borderRadius: '12px', 
                      padding: '1.5rem', 
                      boxShadow: '4px 4px 0px #1F1F1F'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                      {/* Mini AI Coach Logo Icon */}
                      <div style={{ background: '#7FCC26', padding: '8px', borderRadius: '50%', border: '1.5px solid #1F1F1F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg viewBox="0 0 120 120" width="24" height="24">
                          <circle cx="60" cy="60" r="50" fill="#1E293B" />
                          <circle cx="60" cy="50" r="22" fill="#f5cbb5" />
                          <rect x="44" y="72" width="32" height="32" rx="4" fill="#46515c" />
                        </svg>
                      </div>
                      <div>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 'bold', color: '#1F1F1F', textTransform: 'capitalize' }}>
                          Topic: {session.topic}
                        </h3>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#666' }}>
                          Completed on: {new Date(session.createdAt).toLocaleDateString()} at {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                    
                    <div style={{ borderBottom: '1px solid #D6D6D6', marginBottom: '1rem' }}></div>

                    {session.summary && (
                      <div style={{ marginBottom: '1rem' }}>
                        <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#5C5C5C', display: 'block', marginBottom: '0.25rem' }}>Summary</strong>
                        <p style={{ margin: 0, fontSize: '0.9rem', color: '#333', lineHeight: '1.4' }}>
                          {session.summary}
                        </p>
                      </div>
                    )}

                    {session.actions && session.actions.length > 0 && (
                      <div style={{ background: '#F9FAF7', border: '1.5px solid #D6D6D6', borderRadius: '8px', padding: '1rem' }}>
                        <strong style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#4c820f', display: 'block', marginBottom: '0.5rem' }}>Committed If-Then Plans</strong>
                        <ul style={{ margin: 0, paddingLeft: '1.25rem', fontSize: '0.9rem', color: '#333', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {session.actions.map((act: string, idx: number) => (
                            <li key={idx}>{act}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                      <button
                        onClick={() => handleViewTranscript(session._id, session)}
                        style={{ 
                          background: '#7FCC26', 
                          color: '#1F1F1F', 
                          border: '1.5px solid #1F1F1F', 
                          borderRadius: '6px', 
                          padding: '6px 12px', 
                          fontSize: '11px', 
                          fontWeight: 'bold', 
                          cursor: 'pointer',
                          boxShadow: '2px 2px 0px #1F1F1F'
                        }}
                      >
                        View Full Transcript 💬
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case "learning":
        return (
          <div id="inventory-content-learning" className="inventory-content active-content">
            <Lessons styleType={"profile"}/>
          </div>
        );
      case "chessLessons":
        return (
          <div id="inventory-content-lessons" className="inventory-content active-content">
            {lessonSelected ? (
              <LessonOverlay propPieceName={piece} propLessonNumber={lessonNum} navigateFunc={() => {
                setLessonSelected(false);
              }} styleType="profile"/>
            ) : (
              <LessonSelection styleType="profile" onGo={(selectedScenario, lessonNum) => { 
                setLessonSelected(true);
                setPiece(selectedScenario);
                setLessonNum(lessonNum);
              }}/>
            )}
          </div>
        );
      case "games":
        return (
          <div id="inventory-content-games" className="inventory-content active-content">
            <h2>Games</h2>
            <p>This is the content for the Games tab.</p>
          </div>
        );
      case "puzzles":
        return (
          <div id="inventory-content-puzzles" className="inventory-content active-content">
            <Puzzles student={studentUsername} mentor={username} role={"mentor"} styleType="profile"/>
          </div>
        );
      case "playComputer":
        return (
          <div id="inventory-content-computer" className="inventory-content active-content">
            <h2>Play with Computer</h2>
            <p>This is the content for the Play with Computer tab.</p>
          </div>
        );
      case "recordings":
        return (
          <div id="inventory-content-recordings" className="inventory-content active-content">
            <h2>Recordings</h2>
            <p>This is the content for the Recordings tab.</p>
          </div>
        );
      case "backpack":
        return (
          <div id="inventory-content-backpack" className="inventory-content active-content">
            <h2>Backpack</h2>
            <p>This is the content for the Backpack tab.</p>
          </div>
        );
      default:
        return (
          <div className="inventory-content active-content">
            <h2>Select a tab to view its content.</h2>
          </div>
        );
    }
  };

  const tabContent = useMemo(() => renderTabContent(), [activeTab, events, loading, hasMore]);

  return (
    <main id="main-inventory-content">
      <section className="inv-intro">
        <div className="inv-intro-portrait">
          <img
            className="inv-intro-portrait-face"
            src={userPortraitSrc}
            alt="user portrait"
          ></img>
          <img
            className="inv-intro-portrait-camera"
            src={Images.userPortraitCamera}
            alt="user portrait camera icon"
          ></img>
        </div>
        <div className="inv-intro-welcome">
          <h1>Hello, {firstName} {lastName}!</h1>
        </div>
      </section>

      { hasStudent ? (
      <section className="inv-inventory">
        <div className="inv-inventory-topbar">
            <h1 className="topbar-greeting">Check in on <strong>{studentFirstName} {studentLastName}'s</strong> progress! </h1>
        </div>
        <div className="inv-inventory-analytics">
          <div className="inv-inventory-analytics-graph">
            <StatsChart key={monthAxis.join(',')} monthAxis={monthAxis} dataAxis={dataAxis}/>
          </div>
          <div className="inv-inventory-analytics-metrics">
            <h3>Time Spent:</h3>
            <ul>
              <li>Website: <strong>{webTime} minutes</strong></li>
              <li>Playing: <strong>{playTime} minutes</strong></li>
              <li>Lessons: <strong>{lessonTime} minutes</strong></li>
              <li>Puzzle: <strong>{puzzleTime} minutes</strong></li>
              <li>Mentoring: <strong>{mentorTime} minutes</strong></li>
            </ul>
          </div>
        </div>
        <div className="inv-inventory-content-section">
          <nav className="inv-inventory-content-tabs">
            <ul>
              {["activity", "mentor", "learning",
                "chessLessons", "games", "puzzles",
                "playComputer", "recordings", "backpack"].map((tab) => { 
                    const displayName =
                    tab === "chessLessons"
                      ? "Chess Lessons"
                      : tab === "playComputer"
                        ? "Play with Computer"
                        : tab.charAt(0).toUpperCase() + tab.slice(1);

                  return (
                    <div
                      key={tab}
                      className={`inventory-tab ${activeTab === tab ? "active-tab" : ""}`}
                      onClick={() => handleTabClick(tab)}
                    >
                      <img src={Images[`${tab}Icon` as keyof typeof Images]} alt={`${tab} icon`} />
                      <li>{displayName}</li>
                    </div>
                  );
                })}
            </ul>
          </nav>

          <div className="inv-inventory-content-content">{tabContent}</div>
        </div>
      </section>
      ) : (
      <section className="no-student-message">
        <h1>No Student Selected</h1>
        <p>Please select a student to view their progress.</p>
      </section>
      )}

      {isModalOpen && selectedSession && (
        <div className="transcript-modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100000,
          padding: '20px',
          boxSizing: 'border-box'
        }} onClick={() => setIsModalOpen(false)}>
          <div className="transcript-modal-window" style={{
            width: '90vw',
            maxWidth: '650px',
            maxHeight: '80vh',
            background: '#F9FAF7',
            borderRadius: '20px',
            border: '3px solid #1F1F1F',
            boxShadow: '8px 8px 0px rgba(31, 31, 31, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }} onClick={(e) => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="modal-header" style={{
              padding: '20px',
              borderBottom: '3px solid #1F1F1F',
              background: '#E5F3D2',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold', color: '#1F1F1F', textTransform: 'capitalize' }}>
                  Topic: {selectedSession.topic}
                </h3>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#555' }}>
                  Session with AI Tutor on {new Date(selectedSession.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} style={{
                background: 'none',
                border: 'none',
                fontSize: '28px',
                cursor: 'pointer',
                color: '#1F1F1F',
                fontWeight: 'bold',
                lineHeight: 1
              }}>&times;</button>
            </div>

            {/* Modal Body / Chat Messages */}
            <div className="modal-body" style={{
              flex: 1,
              padding: '20px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              background: '#F1F5F9'
            }}>
              {selectedTranscript.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>No messages in this session.</p>
              ) : (
                selectedTranscript.map((msg, idx) => {
                  const isUser = msg.role === 'user';
                  return (
                    <div key={idx} style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '80%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      <span style={{
                        fontSize: '10px',
                        fontWeight: 'bold',
                        color: '#64748B',
                        marginBottom: '2px',
                        alignSelf: isUser ? 'flex-end' : 'flex-start',
                        textTransform: 'uppercase'
                      }}>
                        {isUser ? 'Student' : 'AI Tutor'}
                      </span>
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: '16px',
                        fontSize: '13.5px',
                        lineHeight: '1.45',
                        background: isUser ? '#7FCC26' : '#ffffff',
                        color: '#1F1F1F',
                        border: '2px solid #1F1F1F',
                        borderBottomRightRadius: isUser ? '4px' : '16px',
                        borderBottomLeftRadius: isUser ? '16px' : '4px',
                        boxShadow: '2px 2px 0px rgba(31, 31, 31, 0.1)'
                      }}>
                        {msg.content.split('\n').map((line: string, i: number) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Modal Footer */}
            <div className="modal-footer" style={{
              padding: '16px 20px',
              borderTop: '2px solid #D6D6D6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#F9FAF7'
            }}>
              <span style={{ fontSize: '12px', color: '#666' }}>
                Status: <strong style={{ color: '#4c820f' }}>{selectedSession.status}</strong>
              </span>
              <button 
                onClick={() => handleCopyLMS(selectedSession)}
                style={{
                  background: '#F1F5F9',
                  color: '#1F1F1F',
                  border: '2px solid #1F1F1F',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer',
                  boxShadow: '2px 2px 0px #1F1F1F',
                  transition: 'all 0.2s'
                }}
              >
                Copy for LMS/CRM 📋
              </button>
            </div>

          </div>
        </div>
      )}
    </main>
  );
};

export default NewMentorProfile;
