import { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { environment } from "./environments";
import { useCookies } from "react-cookie";
import { SetPermissionLevel } from "./globals";
import NavBar from "./components/navbar/NavBar";
import Footer from "./components/footer/Footer";
import AppRoutes from "./AppRoutes";
import "./App.css";

/**
 * Main App component that serves as the root of the application
 * 
 * This component handles:
 * - Application routing setup
 * - User time tracking for analytics
 * - Global layout structure (NavBar, Content, Footer)
 * - User session management
 * 
 * @returns JSX element representing the entire application
 */
function App() {
  // Hook to manage browser cookies, specifically the login token
  const [cookies] = useCookies(["login"]);
  
  // Variables to track user session and time spent on website
  // These are used for analytics and user engagement tracking
  let username = null;     // Stores the authenticated username
  let eventID = null;      // Unique identifier for this browsing session
  let startTime = null;    // Timestamp when user started browsing

  /**
   * Initiates time tracking for authenticated users
   * 
   * This function checks if a user is logged in and starts recording
   * their browsing session for analytics purposes. It creates a new
   * time tracking event in the backend and stores the session details.
   * 
   * @returns Promise<void> - Resolves when recording setup is complete
   */
  async function startRecording() {
    // Validate user authentication and get user information
    const uInfo = await SetPermissionLevel(cookies);

    // Exit early if user is not authenticated - no tracking for anonymous users
    if (uInfo.error) return;
    
    // Store the authenticated username for tracking purposes
    username = uInfo.username;

    // Make API call to start time tracking session
    const response = await fetch(
      `${environment.urls.middlewareURL}/timeTracking/start?username=${username}&eventType=website`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${cookies.login}` },
      }
    );
    
    // Log any HTTP errors for debugging purposes
    if (response.status !== 200) console.log(response);

    // Extract session data from successful response
    const data = await response.json();
    eventID = data.eventId;      // Store event ID for later updates
    startTime = data.startTime;  // Store start time for duration calculation
  }

  /**
   * Handles cleanup when user exits the website
   * 
   * This function is called when the user navigates away from the site
   * or closes the browser tab. It calculates the total time spent and
   * updates the backend with the final session duration.
   * 
   * @returns Promise<void> - Resolves when cleanup is complete
   */
  const handleUnload = async () => {
    try {
      // Calculate the total time spent on the website
      const startDate = new Date(startTime);
      const endDate = new Date();
      
      // Calculate time difference in milliseconds
      const diffInMs = endDate.getTime() - startDate.getTime();
      
      // Convert to seconds for backend storage
      const diffInSeconds = Math.floor(diffInMs / 1000);

      // Send the final time tracking update to the backend
      const response = await fetch(
        `${environment.urls.middlewareURL}/timeTracking/update?username=${username}&eventType=website&eventId=${eventID}&totalTime=${diffInSeconds}`,
        {
          method: "PUT",
          headers: { Authorization: `Bearer ${cookies.login}` },
        }
      );
      
      // Log any errors that occur during the update
      if (response.status !== 200) console.log(response);
    } catch (err) {
      // Log any unexpected errors during cleanup
      console.log(err);
    }
  };

  /**
   * Effect hook for component initialization and cleanup
   * 
   * This effect runs once when the component mounts and sets up:
   * - Initial time tracking for authenticated users
   * - Event listener for browser unload to handle cleanup
   * - Cleanup function to remove event listeners on unmount
   */
  useEffect(() => {
    try {
      // Initialize time tracking when component mounts
      startRecording();
    } catch (err) {
      // Log any errors during initialization
      console.log(err);
    }

    // Add event listener to handle user leaving the website
    window.addEventListener("beforeunload", handleUnload);
    
    // Cleanup function to remove event listeners when component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array ensures this runs only once on mount

  /**
   * Render the main application structure
   * 
   * The application consists of:
   * - Router: Enables client-side routing
   * - NavBar: Top navigation component
   * - AppRoutes: Main content area with route-based components
   * - Footer: Bottom footer component
   */
  return (
    <Router>
      <div className="App flex flex-col min-h-screen">
        <NavBar />
        <main className="flex-1">
          <AppRoutes />
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;