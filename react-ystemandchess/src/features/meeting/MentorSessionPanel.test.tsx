import { fireEvent, screen } from "@testing-library/react";
import MentorSessionPanel from "./MentorSessionPanel";
import SharedScreenView from "./SharedScreenView";
import { makeSession, renderWithSession } from "./testUtils";

describe("MentorSessionPanel", () => {
  test("lets a student join a session", () => {
    const session = makeSession();
    renderWithSession(<MentorSessionPanel />, session);

    fireEvent.click(screen.getByRole("button", { name: "Join Session" }));

    expect(screen.getByText("Join a live video session with your mentor.")).toBeInTheDocument();
    expect(session.joinSession).toHaveBeenCalledTimes(1);
  });

  test("tells a mentor they are starting a session with their student", () => {
    renderWithSession(
      <MentorSessionPanel />,
      makeSession({ role: "mentor", peerRole: "student" }),
    );

    expect(screen.getByText("Start a live video session with your student.")).toBeInTheDocument();
  });

  test("offers to rejoin a session that is still open", () => {
    renderWithSession(<MentorSessionPanel />, makeSession({ hasOngoingMeeting: true }));

    expect(screen.getByRole("button", { name: "Rejoin Session" })).toBeInTheDocument();
  });

  test("shows that the last session ended", () => {
    renderWithSession(<MentorSessionPanel />, makeSession({ meetingState: "ended" }));

    expect(screen.getByText("Your session has ended.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join Session" })).toBeInTheDocument();
  });

  test("shows a join error", () => {
    renderWithSession(
      <MentorSessionPanel />,
      makeSession({ meetingError: "Could not join the queue." }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not join the queue.");
  });

  test("while searching, shows the waiting screen and Leave cancels the search", () => {
    const session = makeSession({ meetingState: "searching" });
    renderWithSession(<MentorSessionPanel />, session);

    expect(screen.getByText("Looking for your mentor…")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(session.cancelSearch).toHaveBeenCalledTimes(1);
  });

  test("while connected, points the user at the floating window", () => {
    renderWithSession(<MentorSessionPanel />, makeSession({ meetingState: "in-meeting" }));

    expect(screen.getByText("Waiting for your mentor to join…")).toBeInTheDocument();
    expect(screen.getByText(/floating window/)).toBeInTheDocument();
  });
});

describe("SharedScreenView", () => {
  test("renders nothing when the other side is not sharing", () => {
    const { container } = renderWithSession(<SharedScreenView />, makeSession());

    expect(container).toBeEmptyDOMElement();
  });

  test("shows the other side's screen when they share it", () => {
    const peerScreen = { uid: 777, hasVideo: true, videoTrack: { play: jest.fn(), stop: jest.fn() } };
    renderWithSession(
      <SharedScreenView />,
      makeSession({ role: "mentor", peerRole: "student", peerScreen: peerScreen as any }),
    );

    expect(screen.getByRole("region", { name: "Your student's screen" })).toBeInTheDocument();
    expect(peerScreen.videoTrack.play).toHaveBeenCalled();
  });
});
