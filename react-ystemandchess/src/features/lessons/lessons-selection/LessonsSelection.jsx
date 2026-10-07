import { useNavigate } from "react-router";
import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { environment } from "../../../environments";
import { getAllScenarios } from "../lessons-main/Scenarios";
import { useCookies } from "react-cookie";

const itemClass =
  "flex w-full min-h-[3rem] items-center justify-start px-6 py-3 bg-light font-bold text-dark " +
  "cursor-pointer hover:bg-soft border-b border-borderLight last:border-b-0 transition-colors duration-150";

const ScenarioItem = memo(({ scenario, onClick }) => (
  <div className={itemClass} onClick={onClick}>
    {scenario.name}
  </div>
));

const LessonItem = memo(({ lesson, onClick }) => (
  <div className={itemClass} onClick={onClick}>
    {lesson.name}
  </div>
));

const selectorClass =
  "flex items-center justify-between w-full min-h-[3.5rem] rounded-xl border-2 border-dark bg-light " +
  "px-4 py-3 font-bold text-xl text-dark cursor-pointer hover:border-gray hover:shadow-sm transition-colors duration-150";

const dropdownClass =
  "absolute top-full left-0 mt-1 w-full z-[1000] flex flex-col max-h-[45vh] overflow-y-auto " +
  "rounded-xl border border-borderLight bg-light shadow-md activity-scrollbar";

export default function LessonSelection({ onGo, styleType = "page" }) {
  const isProfile = styleType === "profile";

  const navigate = useNavigate();
  const [showScenarios, setShowScenarios] = useState(false);
  const [showLessons, setShowLessons] = useState(false);
  const [cookies] = useCookies(['piece', 'login']);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [isLessonsLoading, setLoadingLessons] = useState(false);
  const [unlockedLessonCount, setUnlockedLessonCount] = useState(0);
  const [scenarios, setScenarios] = useState([]);
  const [lessons, setLessons] = useState([]);
  const scenarioRef = useRef(null);
  const lessonRef = useRef(null);
  const [error, setError] = useState("");
  const [errorKey, setErrorKey] = useState(0);

  const showError = useCallback((msg) => {
    setError(msg);
    setErrorKey(k => k + 1);
  }, []);

  useEffect(() => {
    setScenarios(getAllScenarios());
  }, []);

  const getLessonIndex = useCallback((scenarioName, lessonName) => {
    const scenario = scenarios.find(s => s.name === scenarioName);
    if (!scenario) return -1;
    return scenario.subSections.findIndex(sub => sub.name === lessonName);
  }, [scenarios]);

  const handleScenarioClick = useCallback((scenarioName) => {
    setShowLessons(false);
    setShowScenarios(false);
    setSelectedLesson(null);
    setSelectedScenario(scenarioName);
    setLoadingLessons(true);
  }, []);

  const handleLessonClick = useCallback((lessonName) => {
    setShowLessons(false);
    setShowScenarios(false);
    setSelectedLesson(lessonName);
  }, []);

  const handleSubmit = async () => {
    if (!selectedLesson || !selectedScenario) {
      showError("Please select a scenario and a lesson.");
      return;
    }
    const lessonNum = getLessonIndex(selectedScenario, selectedLesson);
    if (lessonNum === -1) {
      showError("Could not find the selected lesson's index.");
      return;
    }
    if (onGo) {
      onGo(selectedScenario, lessonNum);
    } else {
      navigate("/lessons", { state: { piece: selectedScenario, lessonNum } });
    }
  };

  useEffect(() => {
    async function fetchLessonsForScenario() {
      if (!selectedScenario) {
        setLessons([]);
        setLoadingLessons(false);
        return;
      }
      const currentScenario = scenarios.find(s => s.name === selectedScenario);
      if (!currentScenario) {
        setLessons([]);
        setLoadingLessons(false);
        return;
      }
      setLoadingLessons(true);
      let unlocked = 0;
      if (!cookies.login) {
        unlocked = currentScenario.subSections.length;
      } else {
        try {
          const response = await fetch(
            `${environment.urls.middlewareURL}/lessons/getCompletedLessonCount?piece=${selectedScenario}`,
            { method: 'GET', headers: { 'Authorization': `Bearer ${cookies.login}` } }
          );
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          unlocked = await response.json();
        } catch (err) {
          console.error('Error fetching unlocked lesson count:', err);
          unlocked = 0;
        }
      }
      const maxIndex = Math.min(unlocked, currentScenario.subSections.length - 1);
      const availableLessons = currentScenario.subSections.slice(0, maxIndex + 1);
      if (availableLessons.length === 0 && currentScenario.subSections[0]) {
        availableLessons.push(currentScenario.subSections[0]);
      }
      setLessons(availableLessons);
      setUnlockedLessonCount(unlocked);
      setLoadingLessons(false);
    }
    fetchLessonsForScenario();
  }, [selectedScenario, cookies.login, scenarios]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (scenarioRef.current && !scenarioRef.current.contains(event.target)) {
        setShowScenarios(false);
      }
      if (lessonRef.current && !lessonRef.current.contains(event.target)) {
        setShowLessons(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const renderedScenarios = useMemo(() =>
    scenarios.map((s) => (
      <ScenarioItem key={s.name} scenario={s} onClick={() => handleScenarioClick(s.name)} />
    )), [scenarios, handleScenarioClick]);

  const renderedLessons = useMemo(() =>
    lessons.map((l) => (
      <LessonItem key={l.name} lesson={l} onClick={() => handleLessonClick(l.name)} />
    )), [lessons, handleLessonClick]);

  // Profile mode: narrower selectors (80% of a 50vw container)
  // Page mode: full-width selectors up to 70vw
  const wrapperMaxWidth = isProfile ? "max-w-[50vw]" : "max-w-[70vw] sm:max-w-[90vw]";
  const innerWidth = isProfile ? "w-4/5" : "w-full";

  return (
    <div className={
      isProfile
        ? "mt-[20%] flex flex-col items-center"
        : "flex flex-col items-center pt-[15vh] px-4"
    }>
      <h1
        className="text-3xl font-bold text-dark mb-8 text-center"
        data-testid="title"
      >
        Lesson Selection
      </h1>

      {/* Scenario dropdown */}
      <div className={`w-full mb-5 flex flex-col items-center ${wrapperMaxWidth}`}>
        <div className={`relative ${innerWidth}`}>
          <div
            ref={scenarioRef}
            className={selectorClass}
            data-testid="scenario-selector"
            onClick={() => setShowScenarios(!showScenarios)}
          >
            <span>{selectedScenario || "Select a scenario"}</span>
            <span className="mr-2 select-none">{showScenarios ? "▼" : "▲"}</span>
          </div>
          {showScenarios && (
            <div className={dropdownClass}>
              {renderedScenarios}
            </div>
          )}
        </div>
      </div>

      {/* Lesson dropdown */}
      <div className={`w-full mb-5 flex flex-col items-center ${wrapperMaxWidth}`}>
        <div className={`relative ${innerWidth}`}>
          <div
            ref={lessonRef}
            className={selectorClass}
            data-testid="lesson-selector"
            onClick={() => {
              if (!selectedScenario) {
                showError("Please select a scenario first.");
                return;
              }
              setShowLessons(!showLessons);
            }}
          >
            <span>{selectedLesson || "Select a lesson"}</span>
            <span className="mr-2 select-none">{showLessons ? "▼" : "▲"}</span>
          </div>
          {showLessons && (
            <div className={dropdownClass}>
              {isLessonsLoading
                ? <div className={itemClass}>Loading...</div>
                : renderedLessons
              }
            </div>
          )}
        </div>
      </div>

      {/* Inline error message */}
      <div className={`w-full min-h-[3rem] flex items-center ${isProfile ? "max-w-[40vw]" : "max-w-[70vw] sm:max-w-[90vw]"}`}>
        {error && (
          <div key={errorKey} className="w-full text-md text-red bg-redLight border-l-4 border-red px-3 py-2 rounded animate-fade-out">
            {error}
          </div>
        )}
      </div>

      <button className="btn-green mt-4 mb-12" data-testid="enterInfo" onClick={handleSubmit}>
        Go!
      </button>
    </div>
  );
}
