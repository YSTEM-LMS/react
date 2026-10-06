import { useState, useEffect, useRef } from "react";
import { useCookies } from "react-cookie";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCaretDown, faCaretUp } from "@fortawesome/free-solid-svg-icons";
import { SetPermissionLevel } from "../../globals";
import FullLogo from "../../assets/images/full_logo.png";

/**
 * Animation variants configuration for Framer Motion
 */
const navbarVariants = {
  parentInitial: {
    opacity: 0,
    translateY: -25,
  },
  
  parentAnimate: {
    opacity: 1,
    translateY: -10,
    transition: {
      duration: 0.3,
    },
  },

  childInitial: {
    opacity: 0,
    translateY: -25,
  },
  
  childAnimate: {
    opacity: 1,
    translateY: 0,
    transition: {
      duration: 0.3,
      staggerChildren: 0.125,
    },
  },
};

const NavBar = () => {
  // Cookie management hooks for handling user authentication tokens
  const [cookies, setCookie, removeCookie] = useCookies([
    "login",      // Authentication JWT token
    "eventId",    // Current session/event identifier
    "timerStatus", // Timer state for user activity tracking
  ]);

  // State variables for managing dropdown menu visibility
  const [mobileMenuDropDown, setMobileMenuDropDown] = useState(false);
  const [aboutUsDropDown, setAboutUsDropDown] = useState(false);
  const [signupDropDown, setSignupDropDown] = useState(false);
  const [profileDropdown, setProfileDropdown] = useState(false);

  // Navigation and user state variables
  const [logged, setLogged] = useState(false);
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");

  // Ref objects for managing click-outside behavior for dropdowns
  const aboutUsRef = useRef<any>(null);
  const signupRef = useRef<any>(null);
  const profileDropdownRef = useRef<any>(null);
  const mobileMenuRef = useRef<any>(null);
  const hamburgerRef = useRef<any>(null);


  const toggleMobileMenu = () => {
    setMobileMenuDropDown((prev) => !prev);
  };

  const toggleAboutUs = () => {
    setAboutUsDropDown((prev) => !prev);
  };

  const toggleSignup = () => {
    setSignupDropDown((prev) => !prev);
  };

  const profileToggleDropdown = () => {
    setProfileDropdown((prevDropdown) => !prevDropdown);
  };

  const closeDropdown = (event: { target: any }) => {
      // Close "About Us" dropdown if click is outside its container
      if (aboutUsRef.current && !aboutUsRef.current.contains(event.target)) {
        setAboutUsDropDown(false);
      }

      // Close "Sign Up" dropdown if click is outside its container
      if (signupRef.current && !signupRef.current.contains(event.target)) {
        setSignupDropDown(false);
      }
      
      // Close mobile menu if click is outside both the menu and hamburger button
      if (
        mobileMenuRef.current &&
        !mobileMenuRef.current.contains(event.target) &&
        hamburgerRef.current &&
        !hamburgerRef.current.contains(event.target) &&
        aboutUsRef.current &&
        !aboutUsRef.current.contains(event.target)
      ) {
        setMobileMenuDropDown(false);
      }
    };

  const closeProfileDropdown = (event: { target: any }) => {
    if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target)) {
      setProfileDropdown(false);
    }
  };

  useEffect(() => {
    // Check user authentication status on component mount
    checkSessionInfo();

    // Add event listeners for click-outside behavior
    document.addEventListener("mousedown", closeDropdown);
    document.addEventListener("mousedown", closeProfileDropdown);

    // Cleanup function to remove event listeners when component unmounts
    return () => {
      document.removeEventListener("mousedown", closeDropdown);
      document.removeEventListener("mousedown", closeProfileDropdown);
    };
  }, []); // Empty dependency array ensures this runs only once on mount


  async function checkSessionInfo() {
    // Default permission level for non-authenticated users
    let pLevel = "nLogged";
    
    // Validate user session using the global authentication function
    let uInfo = await SetPermissionLevel(cookies, removeCookie);
    
    // If no error in user info, user is authenticated
    if (uInfo["error"] === undefined) {
      setLogged(true);                    // Mark user as logged in
      pLevel = uInfo["role"];             // Store user's role
      setUsername(uInfo["username"]);     // Store username for display
      setRole(uInfo["role"]);             // Store role for conditional rendering

      // Note: Event ID and timer status handling could be added here
      // const eventId = cookies.eventId
      // const timerStatus = cookies.timerStatus
    }
  }

  const logout = () => {
    removeCookie("login");        // Remove JWT authentication token
    removeCookie("eventId");      // Remove current session event ID
    removeCookie("timerStatus");  // Remove timer status information
    
    // Redirect to login page using pathname (hard navigation)
    window.location.pathname = "/login";
  };


  const renderLinks = () => (
    <>
      {/* Programs page link */}
      <Link
        to="/programs"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Programs
      </Link>

      {/* About Us dropdown menu container */}
      <div ref={aboutUsRef} className="relative">
        {/* About Us dropdown trigger button */}
        <div
          onClick={toggleAboutUs}
          className="flex items-center cursor-pointer justify-center px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
          aria-haspopup="true"
          aria-expanded={aboutUsDropDown}
          aria-controls="aboutus-menu"
        >
          About Us
          {/* Dropdown indicator icon that changes based on menu state */}
          <FontAwesomeIcon
            icon={aboutUsDropDown ? faCaretUp : faCaretDown}
            className={`ml-2 ${aboutUsDropDown ? "translate-y-[2px]" : "translate-y-[-1px]"}`}
          />
        </div>
        
        {/* About Us dropdown menu content (conditionally rendered) */}
        {aboutUsDropDown && (
          <motion.div
            id="aboutus-menu"
            className="absolute z-20 mt-3 w-64 rounded-md bg-light p-4 shadow-lg"
            initial="parentInitial"
            animate="parentAnimate"
            variants={navbarVariants}
          >
            {/* Education section */}
            <h3 className="mb-2 text-base font-bold uppercase tracking-wide text-dark">Education</h3>
            <div className="flex flex-col gap-3">
              <Link
                to="/benefit-of-computer-science"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Benefit of Computer Science
              </Link>
              <Link
                to="/benefit-of-chess"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Benefit of Chess
              </Link>
              <Link
                to="/benefit-of-math-tutoring"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Benefit of Math Tutoring
              </Link>
              <Link
                to="/benefit-of-mentoring"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Benefit of Mentoring
              </Link>
            </div>

            {/* What We Do section */}
            <h3 className="mt-4 mb-2 text-base font-bold uppercase tracking-wide text-dark">What We Do</h3>
            <div className="flex flex-col gap-2">
              <Link
                to="/online-expansion"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Online Expansion
              </Link>
              <Link
                to="/about-us"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                About Us
              </Link>
              <Link
                to="/mission"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Mission
              </Link>
              <Link
                to="/financial"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Financial
              </Link>
              <Link
                to="/board"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Board
              </Link>
              <Link
                to="/sponsors&partners"
                onClick={toggleAboutUs}
                className="text-base text-gray transition-colors hover:text-primary"
              >
                Sponsors & Partners
              </Link>
            </div>
          </motion.div>
        )}
      </div>

      {/* Main navigation links */}
      <Link
        to="/mentor"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Mentor
      </Link>
      <Link
        to="/learnings"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Learn
      </Link>
      <Link
        to="/play"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Play
      </Link>
      <Link
        to="/lessons-selection"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Lessons
      </Link>
      <Link
        to="/puzzles"
        className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
      >
        Puzzles
      </Link>

      {/* Analytics link — visible only to admin users */}
      {role === "admin" && (
        <Link
          to="/analytics"
          className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
        >
          Analytics
        </Link>
      )}

      {/* Conditional rendering: Show login link only when user is not authenticated */}
      {!username && (
        <Link
          to="/login"
          className="px-4 text-lg font-medium text-dark transition-colors hover:text-primary"
        >
          Login
        </Link>
      )}

      {/* Sign Up dropdown with parent and mentor options, only when not authenticated */}
      {!username && (
        <div ref={signupRef} className="relative">
          {/* Sign Up dropdown trigger button */}
          <button
            type="button"
            onClick={toggleSignup}
            className="flex items-center rounded-lg bg-accent px-5 py-2 text-lg font-semibold text-dark transition-transform hover:scale-105"
            aria-haspopup="true"
            aria-expanded={signupDropDown}
            aria-controls="signup-menu"
          >
            Sign Up
            {/* Dropdown indicator icon that changes based on menu state */}
            <FontAwesomeIcon
              icon={signupDropDown ? faCaretUp : faCaretDown}
              className={`ml-2 ${signupDropDown ? "translate-y-[2px]" : "translate-y-[-1px]"}`}
            />
          </button>

          {/* Sign Up dropdown menu content (conditionally rendered) */}
          {signupDropDown && (
            <motion.div
              id="signup-menu"
              className="absolute z-20 mt-3 w-48 rounded-md bg-light p-4 shadow-lg"
              initial="parentInitial"
              animate="parentAnimate"
              variants={navbarVariants}
            >
              <div className="flex flex-col gap-3">
                <Link
                  to="/signup/parent"
                  onClick={toggleSignup}
                  className="text-base text-gray transition-colors hover:text-primary"
                >
                  Parent Signup
                </Link>
                <Link
                  to="/signup/mentor"
                  onClick={toggleSignup}
                  className="text-base text-gray transition-colors hover:text-primary"
                >
                  Mentor Signup
                </Link>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* Conditional rendering: Show user profile dropdown when user is authenticated */}
      {username && (
        <div className="w-full lg:w-fit flex justify-center">
          <div ref={profileDropdownRef} className="relative w-fit">
            {/* Profile dropdown trigger button showing username */}
            <button
              onClick={profileToggleDropdown}
              className="flex items-center gap-1 px-3 py-1 text-lg font-medium text-dark hover:text-primary"
              aria-haspopup="true"
              aria-expanded={profileDropdown}
              aria-controls="login-menu"
            >
              {username}
              {/* Dropdown indicator icon */}
              <FontAwesomeIcon
                icon={profileDropdown ? faCaretUp : faCaretDown}
                className={`ml-1 ${profileDropdown ? "translate-y-[2px]" : "translate-y-[-1px]"}`}
              />
            </button>

            {/* Profile dropdown menu (conditionally rendered) */}
            {profileDropdown && (
              <motion.div
                id="login-menu"
                className="absolute bg-light right-0 shadow-lg mt-2 w-48 rounded-lg p-3 z-20"
                initial="parentInitial"
                animate="parentAnimate"
                variants={navbarVariants}
              >
                <div className="flex flex-col gap-2">
                  {/* Dynamic profile link based on user role */}
                  <Link
                    to={role === "parent" ? "/signup/parent/section" : `/${role}-profile`}
                    onClick={profileToggleDropdown}
                    className="text-base text-gray transition-colors hover:text-primary"
                  >
                    Profile
                  </Link>
                  
                  {/* Conditional link for parent users only */}
                  {role === "parent" && (
                    <Link
                      to="/signup/parent/add-child"
                      onClick={profileToggleDropdown}
                      className="text-base text-gray transition-colors hover:text-primary"
                    >
                      Add Student
                    </Link>
                  )}
                  
                  {/* Logout button */}
                  <button
                    onClick={logout}
                    className="text-base text-gray transition-colors hover:text-primary"
                  >
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      )}
    </>
  );

  return (
    <header className="bg-light border-b-2 border-dark sticky top-0 z-50">
      <div className="max-w-full mx-auto">
        <div className="flex justify-between items-center h-24 pr-8">
          
          {/* Logo section - always visible, links to home page */}
          <Link to="/">
            <img src={FullLogo} alt="YSTEM Logo" className="h-20 pl-4 w-auto" />
          </Link>

          {/* Mobile hamburger menu button - only visible on mobile devices */}
          <div className="flex md:hidden">
            <button
              ref={hamburgerRef}
              type="button"
              className="text-dark hover:text-primary focus:outline-none"
              onClick={toggleMobileMenu}
              aria-label="Toggle menu"
            >
              {/* SVG icon that changes between hamburger and X based on menu state */}
              <svg
                className="h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                {/* Conditional rendering of icon paths */}
                {mobileMenuDropDown ? (
                  // X icon when menu is open
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  // Hamburger icon when menu is closed
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>

          {/* Desktop navigation links - hidden on mobile, visible on medium screens and up */}
          <nav className="hidden md:flex md:items-center md:gap-6">
            {renderLinks()}
          </nav>
        </div>
      </div>

      {/* Mobile dropdown menu - conditionally rendered based on mobileMenuDropDown state */}
      {mobileMenuDropDown && (
        <div ref={mobileMenuRef} className="border-t border-light md:hidden px-4 py-4">
          {/* Mobile navigation using vertical layout */}
          <nav className="flex flex-col gap-4">{renderLinks()}</nav>
        </div>
      )}
    </header>
  );
};

export default NavBar;
