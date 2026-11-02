import { ReactNode } from "react";
import { render } from "@testing-library/react";
import LiveSessionContext, { LiveSession } from "./LiveSessionContext";

/** A LiveSession with every action mocked; override any field per test. */
export function makeSession(overrides: Partial<LiveSession> = {}): LiveSession {
  const call = {
    localVideoRef: { current: null },
    localScreenRef: { current: null },
    remoteUsers: [],
    joined: true,
    error: null,
    micOn: true,
    camOn: true,
    speakerOn: true,
    isScreenSharing: false,
    toggleMic: jest.fn(() => Promise.resolve()),
    toggleCam: jest.fn(() => Promise.resolve()),
    toggleSpeaker: jest.fn(),
    startScreenShare: jest.fn(() => Promise.resolve()),
    stopScreenShare: jest.fn(() => Promise.resolve()),
  };
  return {
    role: "student",
    peerRole: "mentor",
    meetingState: "idle",
    hasOngoingMeeting: false,
    meetingError: null,
    isVideoConfigured: true,
    videoError: null,
    call,
    joinSession: jest.fn(() => Promise.resolve()),
    cancelSearch: jest.fn(() => Promise.resolve()),
    leaveSession: jest.fn(),
    endSession: jest.fn(() => Promise.resolve()),
    ...overrides,
  };
}

export function renderWithSession(ui: ReactNode, session: LiveSession) {
  return render(
    <LiveSessionContext.Provider value={session}>{ui}</LiveSessionContext.Provider>,
  );
}
