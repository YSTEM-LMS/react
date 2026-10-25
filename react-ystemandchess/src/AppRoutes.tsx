import { useState, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { useCookies } from "react-cookie";
import { SetPermissionLevel } from "./globals";

import AnalyticsLayout from "./Pages/Analytics/AnalyticsLayout";
import Home from "./features/home/Home";
import { Programs } from "./features/programs/Programs";

// About Us section pages
import CSBenefitPage from "./features/about-us/benefit-of-cs/CSBenefitPage";
import ChessBenefitPage from "./features/about-us/benefit-of-chess/ChessBenefitPage";
import MathTutBenefitPage from "./features/about-us/benefit-of-math-tut/MathTutBenefitPage";
import MentoringBenefitPage from "./features/about-us/benefit-of-mentoring/MentoringBenefitPage";
import Mission from "./features/about-us/mission/Mission";
import SponsorsPartners from "./features/about-us/sponsors-partners/SponsorsPartners";
import Board from "./features/about-us/board/Board";
import Financial from "./features/about-us/financial/Financial";
import AboutUs from "./features/about-us/aboutus/AboutUs";
import OnlineExpansion from "./features/about-us/online-expansion/OnlineExpansion";

// Educational content pages
import PlayComputer from "./features/engine/PlayComputer";
import Lessons from "./features/lessons/lessons-main/Lessons";
import Puzzles from './features/puzzles/Puzzles';
import LessonSelection from "./features/lessons/lessons-selection/LessonsSelection";
import LessonOverlay from "./features/lessons/piece-lessons/lesson-overlay/Lesson-overlay";
import Login from "./features/auth/login/Login";
import ParentSignUp from "./features/auth/signup/ParentSignUp";
import MentorSignUp from "./features/auth/signup/MentorSignUp";
import AddChild from "./features/auth/signup/AddChild";
import ParentSection from "./features/auth/signup/ParentSection";
import ResetPassword from "./features/auth/reset-password/Reset-Password/reset-password";
import SetPassword from "./features/auth/set-password/Set-Password/set-password";
import Student from "./features/student/student-page/Student";
import Mentor from "./features/mentor/mentor-page/Mentor";
import StudentInventory from "./features/student/student-inventory/StudentInventory";
import NewMentorProfile from "./features/mentor/mentor-profile/NewMentorProfile";
  
import NewStudentProfile from "./features/student/student-profile/NewStudentProfile";
import AdminProfile from "./features/admin/AdminProfile";
import userPortraitImg from "./assets/images/user-portrait-placeholder.svg";

const userName = "Nimesh Patel";

/**
 * Route guard that validates admin role via server-side JWT check before
 * rendering child routes. Renders null while loading, redirects to /login
 * if the user is not an admin.
 */
const AdminRoute = () => {
  const [cookies, , removeCookie] = useCookies(["login"]);
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const info = await SetPermissionLevel(cookies, removeCookie);
      if (cancelled) return;
      setStatus(info && !info.error && info.role === "admin" ? "allowed" : "denied");
    })();
    return () => { cancelled = true; };
  }, [cookies.login]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "loading") return null;
  if (status === "denied") return <Navigate to="/login" replace />;
  return <Outlet />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/programs" element={<Programs />} />

      <Route path="/benefit-of-computer-science" element={<CSBenefitPage />} />
      <Route path="/benefit-of-chess" element={<ChessBenefitPage />} />
      <Route path="/benefit-of-math-tutoring" element={<MathTutBenefitPage />} />
      <Route path="/benefit-of-mentoring" element={<MentoringBenefitPage />} />

      <Route path="/about-us" element={<AboutUs />} />
      <Route path="/mission" element={<Mission />} />
      <Route path="/financial" element={<Financial />} />
      <Route path="/board" element={<Board />} />
      <Route path="/sponsors&partners" element={<SponsorsPartners />} />
      <Route path="/online-expansion" element={<OnlineExpansion />} />

      <Route path="/play" element={<PlayComputer />} />
      <Route path="/puzzles" element={<Puzzles />} />
      <Route path="/lessons-selection" element={<LessonSelection />} />
      <Route path="/lessons" element={<LessonOverlay />} />
      <Route path="/learnings" element={<Lessons />} />

      <Route path="/mentor" element={<Mentor />} />
      <Route path="/student" element={<Student />} />

      <Route path="/login" element={<Login />} />
      <Route path="/signup/parent" element={<ParentSignUp />} />
      <Route path="/signup/parent/add-child" element={<AddChild />} />
      <Route path="/signup/parent/section" element={<ParentSection />} />
      <Route path="/signup/mentor" element={<MentorSignUp />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/set-password" element={<SetPassword />} />

      <Route
        path="/mentor-profile"
        element={<NewMentorProfile userPortraitSrc={userPortraitImg} />}
      />
      <Route
        path="/student-profile"
        element={<NewStudentProfile userPortraitSrc={userPortraitImg} />}
      />
      <Route
        path="/admin-profile"
        element={<AdminProfile />}
      />
      <Route
        path="/tutor-profile"
        element={<AdminProfile />}
      />
      
      {/* Student inventory/dashboard page with user data */}
      <Route
        path="/student-inventory"
        element={<StudentInventory userName={userName} userPortraitSrc={userPortraitImg} />}
      />

      {/* Admin analytics — guarded by server-side role validation */}
      <Route path="/analytics" element={<AdminRoute />}>
        <Route index element={<AnalyticsLayout />} />
      </Route>
    </Routes>
  );
};

export default AppRoutes;
