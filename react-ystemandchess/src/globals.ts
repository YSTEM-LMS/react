/**
 * Global utilities and functions for the application
 * 
 * This file contains shared utility functions that are used across multiple
 * components, particularly for authentication and permission management.
 */

import { environment } from "./environments";

/**
 * Global variable to store user information after authentication
 * This is populated when SetPermissionLevel successfully validates a user
 */
let information;

/**
 * Type definition for the SetPermissionLevel function
 * Generic type T allows for flexible return types based on usage context
 * 
 * @template T - The expected return type
 * @param a - First parameter (typically cookies object)
 * @param b - Optional second parameter (typically removeCookie function)
 * @returns Promise resolving to type T
 */
type SetPermissionLevelType<T> = (a: any, b?: any) => Promise<T>;

/**
 * Validates user authentication and determines permission level
 * 
 * This function checks if a user has a valid login cookie, validates it with
 * the backend authentication service, and returns either user information
 * or an error object. It's the primary method for determining if a user
 * is authenticated and what permissions they have.
 * 
 * @param cookies - Object containing all browser cookies
 * @param removeCookie - Function to remove cookies when authentication fails
 * @returns Promise resolving to user information object or error object
 * 
 * @example
 * ```typescript
 * const userInfo = await SetPermissionLevel(cookies, removeCookie);
 * if (userInfo.error) {
 *   // Handle authentication error
 *   console.log('User not authenticated:', userInfo.error);
 * } else {
 *   // User is authenticated, access user properties
 *   console.log('Username:', userInfo.username);
 *   console.log('Role:', userInfo.role);
 * }
 * ```
 */
export const SetPermissionLevel: SetPermissionLevelType<any> = async (cookies: any, removeCookie: Function): Promise<any> => {
  // Define the cookie name used for authentication tokens
  let cookieName = "login";
  
  // Check if the login cookie exists in the provided cookies object
  if (Object.keys(cookies).includes(cookieName)) {
    // Variable to store the raw response from the authentication endpoint
    let rawData: any;
    
    // Extract the JWT token from the login cookie
    let cookieContents = cookies.login;
    
    // Construct the URL for the authentication validation endpoint
    let url = `${environment.urls.middlewareURL}/auth/validate`;
    
    // Create headers for the HTTP request, including the authorization token
    let headers = new Headers();
    headers.append("Authorization", `Bearer ${cookieContents}`);
    
    // Make a POST request to validate the authentication token
    await fetch(url, { method: "POST", headers: headers })
      .then((response) => {
        // Convert the response to text format
        return response.text();
      })
      .then((data) => {
        // Store the response data for further processing
        rawData = data;
      });
    
    // Check if the authentication response indicates an invalid or expired token
    if (
      rawData.includes("Unauthorized") ||
      rawData.includes("Error 405: User authentication is not valid or expired")
    ) {
      // Remove the invalid cookie from the browser when a remover is provided
      if (typeof removeCookie === "function") {
        removeCookie(cookieName);
      }
      
      // Return an error object indicating authentication failure
      return {
        error: "Error 405: User authentication is not valid or expired",
      };
    } else {
      // Token is valid - decode the JWT payload to extract user information
      // JWT tokens have three parts separated by dots: header.payload.signature
      // We decode the payload (second part) which contains user data
      information = JSON.parse(atob(cookieContents.split(".")[1]));
      
      // Return the decoded user information
      return information;
    }
  } else {
    // No login cookie found - user is not authenticated
    return { error: "User is not logged in" };
  }
};