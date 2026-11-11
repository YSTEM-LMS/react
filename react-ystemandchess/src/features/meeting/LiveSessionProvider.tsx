import { ReactNode } from "react";
import { environment } from "../../environments";
import { useAgoraCall } from "../../components/VideoCall";
import { useMeeting } from "./useMeeting";
import { useAgoraCredentials } from "./useAgoraCredentials";
import LiveSessionContext, { CAMERA_UID, LiveSession, SessionRole } from "./LiveSessionContext";
import LiveSessionWindow from "./LiveSessionWindow";

/**
 * LiveSessionProvider — owns the mentor⇄student video session for a whole
 * profile page, so the call keeps running while the user switches tabs.
 *
 *   <LiveSessionProvider role="student"> …profile… </LiveSessionProvider>
 *
 * Inside it:
 *   - <MentorSessionPanel /> (the "Mentor Session" tab) starts / joins a session
 *   - <LiveSessionWindow />  floats over the page while connected (rendered here)
 *   - <SharedScreenView />   shows the other side's shared screen, if any
 *
 * Join credentials (app id, uids, and tokens when the Agora project has an App
 * Certificate) come from the server once the meeting exists, so the call only
 * starts after they arrive. Camera UIDs mirror the Angular client (mentor 123,
 * student 456); any other uid in the channel is the peer's screen share.
 */

// environment.js is untyped JS; the appId lives at environment.agora.appId.
const APP_ID = ((environment as any)?.agora?.appId as string) || "";

const LiveSessionProvider = ({
  role,
  children,
}: {
  role: SessionRole;
  children: ReactNode;
}) => {
  const meeting = useMeeting({ role });
  const peerRole: SessionRole = role === "mentor" ? "student" : "mentor";
  const isConnected = meeting.state === "in-meeting" && !!meeting.meeting;
  const { credentials, error: credentialsError } = useAgoraCredentials(
    isConnected ? meeting.meeting!.meetingId : null,
  );
  // The server's app id must win: tokens are only valid for the app they were signed for.
  const appId = credentials?.appId || APP_ID;

  const call = useAgoraCall({
    appId,
    channel: credentials?.channel ?? "",
    token: credentials?.token ?? null,
    uid: credentials?.uid ?? CAMERA_UID[role],
    screenUid: credentials?.screenUid ?? null,
    screenToken: credentials?.screenToken ?? null,
    enabled: isConnected && !!credentials,
  });

  const peerUid = CAMERA_UID[peerRole];
  const peerCamera = call.remoteUsers.find((u) => u.uid === peerUid);
  const peerScreen = call.remoteUsers.find((u) => u.uid !== peerUid && u.hasVideo);

  const value: LiveSession = {
    role,
    peerRole,
    meetingState: meeting.state,
    hasOngoingMeeting: meeting.hasOngoingMeeting,
    meetingError: meeting.error,
    isVideoConfigured: !!appId,
    videoError: credentialsError ?? call.error,
    call,
    peerCamera,
    peerScreen,
    joinSession: meeting.startLesson,
    cancelSearch: meeting.cancelSearch,
    leaveSession: meeting.leave,
    endSession: meeting.endLesson,
  };

  return (
    <LiveSessionContext.Provider value={value}>
      {children}
      {isConnected && <LiveSessionWindow />}
    </LiveSessionContext.Provider>
  );
};

export default LiveSessionProvider;
