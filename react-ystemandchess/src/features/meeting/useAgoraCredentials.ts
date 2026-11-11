import { useEffect, useState } from "react";
import { useCookies } from "react-cookie";
import { environment } from "../../environments";

/**
 * useAgoraCredentials — fetches the Agora join credentials for the caller's
 * current meeting from GET /meetings/agoraToken. The server decides the
 * channel (the user's own ongoing meeting), the uids, and — when the Agora
 * project has an App Certificate — the tokens. Tokens are null for
 * App-ID-only projects, and the call then joins without one.
 */

const MIDDLEWARE = environment.urls.middlewareURL;

export type AgoraCredentials = {
  appId: string | null;
  channel: string;
  uid: number;
  screenUid: number;
  token: string | null;
  screenToken: string | null;
};

type State =
  | { status: "idle" | "loading"; credentials: null; error: null }
  | { status: "ready"; credentials: AgoraCredentials; error: null }
  | { status: "error"; credentials: null; error: string };

const IDLE: State = { status: "idle", credentials: null, error: null };

export function useAgoraCredentials(meetingId: string | null): State {
  const [cookies] = useCookies(["login"]);
  const token = cookies.login;
  const [state, setState] = useState<State>(IDLE);

  useEffect(() => {
    if (!meetingId || !token) {
      setState(IDLE);
      return;
    }
    let cancelled = false;
    setState({ status: "loading", credentials: null, error: null });

    fetch(`${MIDDLEWARE}/meetings/agoraToken`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`agoraToken failed: ${res.status}`);
        const credentials: AgoraCredentials = await res.json();
        if (!cancelled) setState({ status: "ready", credentials, error: null });
      })
      .catch(() => {
        if (!cancelled) {
          setState({
            status: "error",
            credentials: null,
            error: "Could not get access to the video call. Please leave and rejoin.",
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [meetingId, token]);

  return state;
}
