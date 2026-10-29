import { useCallback, useEffect, useRef, useState } from "react";
import { useCookies } from "react-cookie";
import { environment } from "../../environments";

/**
 * useMeeting — drives the mentor⇄student live-session lifecycle against the
 * existing middleware /meetings endpoints. This is the React port of the meeting
 * side of the legacy Angular play page.
 *
 * Recording is NOT started here: the server starts cloud recording (best-effort)
 * inside POST /meetings/pairUp and stops it in PUT /meetings/endMeeting.
 * The client only drives the lifecycle:
 *
 *   idle ── startLesson ─▶ searching ──(paired)──▶ in-meeting ── endLesson ─▶ ended
 *                            │                       │  └─ other side ends ─▶ ended
 *                            └── cancelSearch ─▶ idle └─ leave ─▶ idle (can rejoin)
 *
 * Pairing: both sides join their queue (POST /queue) and poll POST /pairUp; whoever
 * calls pairUp while the opposite queue is non-empty creates the meeting. We also
 * poll GET /inMeeting so the side that DIDN'T create it still discovers the meeting.
 */

const MIDDLEWARE = environment.urls.middlewareURL;
export const PAIR_POLL_MS = 2500;
export const END_POLL_MS = 5000;
const NO_MEETING = "There are no current meetings with this user.";

export type MeetingState = "idle" | "searching" | "in-meeting" | "ended";

export type Meeting = {
  meetingId: string;
  mentorUsername?: string;
  studentUsername?: string;
};

export function useMeeting({
  role,
  enabled = true,
}: {
  role: "mentor" | "student";
  enabled?: boolean;
}) {
  const [cookies] = useCookies(["login"]);
  const token = cookies.login;

  const [state, setState] = useState<MeetingState>("idle");
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [error, setError] = useState<string | null>(null);
  // An ongoing meeting we are not connected to (after a refresh, or after Leave).
  const [hasOngoingMeeting, setHasOngoingMeeting] = useState(false);

  const auth = useCallback(
    (extra?: RequestInit): RequestInit => ({
      ...extra,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(extra?.headers || {}),
      },
    }),
    [token],
  );

  // GET /inMeeting → the meeting if we're in one, else null. Throws on a failed
  // request so a transient server error is never mistaken for "meeting over".
  const checkInMeeting = useCallback(async (): Promise<Meeting | null> => {
    const res = await fetch(`${MIDDLEWARE}/meetings/inMeeting`, auth());
    if (!res.ok) throw new Error(`inMeeting failed: ${res.status}`);
    const data = await res.json();
    if (!data || data === NO_MEETING || !Array.isArray(data) || data.length === 0) {
      return null;
    }
    const m = data[0];
    return {
      meetingId: m.meetingId,
      mentorUsername: m.mentorUsername,
      studentUsername: m.studentUsername,
    };
  }, [auth]);

  // On mount: note an ongoing meeting so the UI can offer to rejoin it. We don't
  // auto-join — that would switch the camera on without the user asking.
  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    checkInMeeting()
      .then((m) => {
        if (!cancelled) setHasOngoingMeeting(!!m);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, token, checkInMeeting]);

  const stateRef = useRef(state);
  stateRef.current = state;

  // Poll while searching: attempt to pair, then see if a meeting now exists.
  // One poll at a time, and a poll that finishes after the user cancelled
  // must not drag them into a call.
  const isPolling = useRef(false);
  const pollPair = useRef<() => void>(() => {});
  pollPair.current = async () => {
    if (isPolling.current) return;
    isPolling.current = true;
    try {
      // Fire pairUp (creates the meeting if the opposite queue has someone).
      await fetch(`${MIDDLEWARE}/meetings/pairUp`, auth({ method: "POST" })).catch(
        () => {},
      );
      const m = await checkInMeeting();
      if (m && stateRef.current === "searching") {
        setMeeting(m);
        setState("in-meeting");
      }
    } catch {
      /* transient; keep polling */
    } finally {
      isPolling.current = false;
    }
  };

  useEffect(() => {
    if (state !== "searching") return;
    pollPair.current();
    const id = setInterval(() => pollPair.current(), PAIR_POLL_MS);
    return () => clearInterval(id);
  }, [state]);

  // Poll while in a meeting: notice when the other side ends it.
  useEffect(() => {
    if (state !== "in-meeting") return;
    const id = setInterval(async () => {
      try {
        if ((await checkInMeeting()) === null) {
          setMeeting(null);
          setHasOngoingMeeting(false);
          setState("ended");
        }
      } catch {
        /* transient; keep the call up */
      }
    }, END_POLL_MS);
    return () => clearInterval(id);
  }, [state, checkInMeeting]);

  // Leaving the page mid-search must drop us from the queue, or the other side
  // could be paired with someone who is no longer there.
  const authRef = useRef(auth);
  authRef.current = auth;
  useEffect(() => {
    const dequeueIfSearching = () => {
      if (stateRef.current !== "searching") return;
      fetch(
        `${MIDDLEWARE}/meetings/dequeue`,
        authRef.current({ method: "DELETE", keepalive: true }),
      ).catch(() => {});
    };
    window.addEventListener("pagehide", dequeueIfSearching);
    return () => {
      window.removeEventListener("pagehide", dequeueIfSearching);
      dequeueIfSearching();
    };
  }, []);

  const startLesson = useCallback(async () => {
    setError(null);
    try {
      // Already in a meeting (rejoin after Leave or a refresh): jump straight in.
      const existing = await checkInMeeting();
      if (existing) {
        setMeeting(existing);
        setState("in-meeting");
        return;
      }
      const res = await fetch(`${MIDDLEWARE}/meetings/queue`, auth({ method: "POST" }));
      if (!res.ok) {
        const msg = await res.json().catch(() => null);
        setError(typeof msg === "string" ? msg : "Could not join the queue.");
        return;
      }
      setHasOngoingMeeting(false);
      setState("searching");
    } catch {
      setError("Network error joining the session. Please try again.");
    }
  }, [auth, checkInMeeting]);

  const cancelSearch = useCallback(async () => {
    setState("idle");
    await fetch(`${MIDDLEWARE}/meetings/dequeue`, auth({ method: "DELETE" })).catch(
      () => {},
    );
  }, [auth]);

  // Drop out of the call but keep the meeting open so either side can rejoin.
  const leave = useCallback(() => {
    setMeeting(null);
    setHasOngoingMeeting(true);
    setState("idle");
  }, []);

  // End the meeting for both sides (stops the recording server-side).
  const endLesson = useCallback(async () => {
    setError(null);
    const res = await fetch(
      `${MIDDLEWARE}/meetings/endMeeting`,
      auth({ method: "PUT" }),
    ).catch(() => null);
    // 4xx means the meeting is already over (ended by the other side, or the
    // server ended it but failed a follow-up step) — only retry on 5xx/network.
    if (!res || res.status >= 500) {
      setError("Could not end the session. Please try again.");
      return;
    }
    setMeeting(null);
    setHasOngoingMeeting(false);
    setState("ended");
  }, [auth]);

  return {
    state,
    meeting,
    error,
    role,
    hasOngoingMeeting,
    startLesson,
    cancelSearch,
    leave,
    endLesson,
  };
}
