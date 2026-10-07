import { useEffect, useRef, useState } from "react";
import { environment } from "../../../../../environments";
import { SetPermissionLevel } from "../../../../../globals";

export function useTimeTracking(piece: string, cookies: any) {
	const [username, setUsername] = useState<string | null>(null);
  	const [eventID, setEventID] = useState<string | null>(null);
  	const [startTime, setStartTime] = useState<Date | null>(null);

  	const handleUnloadRef = useRef<() => void>(() => {});

  	useEffect(() => {
		startRecording();

		// Use an indirection so the listener always calls the most-recent version
		// of handleUnloadRef.current (which captures the latest state via closure).
		const handleUnload = () => handleUnloadRef.current();
		window.addEventListener("beforeunload", handleUnload);
		return () => {
	  		window.removeEventListener("beforeunload", handleUnload);
	  		handleUnloadRef.current();
		};
  	}, []);

  	async function startRecording() {
		const uInfo = await SetPermissionLevel(cookies);

		// do nothing if the user is not logged in
		if (uInfo.error) return;

		setUsername(uInfo.username);

		// start recording user's time spent browsing the website
		const response = await fetch(
	  		`${environment.urls.middlewareURL}/timeTracking/start?username=${uInfo.username}&eventType=lesson&eventName=${piece}`,
	  		{ 
				method: "POST", 
				headers: { Authorization: `Bearer ${cookies.login}` } 
			}
		);

        // if data is fetched, record for later updates
		const data = await response.json();
		setEventID(data.eventId);
		setStartTime(new Date(data.startTime));
  	}

  	handleUnloadRef.current = async () => {
		if (!startTime || !username || !eventID) return;
		const diffInSeconds = Math.floor((Date.now() - startTime.getTime()) / 1000);

		await fetch(
	  		`${environment.urls.middlewareURL}/timeTracking/update?username=${username}&eventType=lesson&eventId=${eventID}&totalTime=${diffInSeconds}&eventName=${piece}`,
	  		{ 
				method: "PUT", 
				headers: { Authorization: `Bearer ${cookies.login}` }
			}
		);
  	};
}
