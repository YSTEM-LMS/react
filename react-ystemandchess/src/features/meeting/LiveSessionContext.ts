import { createContext, useContext } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";
import { AgoraCall } from "../../components/VideoCall";
import { MeetingState } from "./useMeeting";

export type SessionRole = "mentor" | "student";

export const CAMERA_UID: Record<SessionRole, number> = { mentor: 123, student: 456 };

export type LiveSession = {
  role: SessionRole;
  peerRole: SessionRole;
  meetingState: MeetingState;
  hasOngoingMeeting: boolean;
  meetingError: string | null;
  isVideoConfigured: boolean;
  /** Why the video can't connect (credentials or Agora), if it can't. */
  videoError: string | null;
  call: AgoraCall;
  peerCamera?: IAgoraRTCRemoteUser;
  peerScreen?: IAgoraRTCRemoteUser;
  joinSession: () => Promise<void>;
  cancelSearch: () => Promise<void>;
  leaveSession: () => void;
  endSession: () => Promise<void>;
};

const LiveSessionContext = createContext<LiveSession | null>(null);

export function useLiveSession(): LiveSession {
  const ctx = useContext(LiveSessionContext);
  if (!ctx) throw new Error("useLiveSession must be used inside <LiveSessionProvider>");
  return ctx;
}

export default LiveSessionContext;
