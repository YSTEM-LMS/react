/**
 * Application Entry Point
 * 
 * This is the main entry file for the React application.
 * It bootstraps the React app by mounting the root App component
 * to the HTML DOM element with id 'root'.
 */

import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// Suppress legacy context API warnings from chessboardjsx (react-dnd internals).
// These are harmless third-party warnings that cannot be fixed without replacing the library.
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    args[0].includes("uses the legacy") &&
    args[0].includes("contextType")
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};

// Create a root React element and mount it to the DOM
const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

// Render the main App component
root.render(<App />);
