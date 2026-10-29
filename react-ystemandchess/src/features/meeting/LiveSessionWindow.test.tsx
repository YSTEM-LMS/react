import { fireEvent, screen } from "@testing-library/react";
import LiveSessionWindow from "./LiveSessionWindow";
import { makeSession, renderWithSession } from "./testUtils";

describe("LiveSessionWindow", () => {
  test("waits for the other side before their video arrives", () => {
    renderWithSession(<LiveSessionWindow />, makeSession());

    expect(screen.getByText("Waiting for your mentor to join…")).toBeInTheDocument();
  });

  test("a student leaves without ending the session", () => {
    const session = makeSession();
    renderWithSession(<LiveSessionWindow />, session);

    fireEvent.click(screen.getByRole("button", { name: "Leave" }));

    expect(session.leaveSession).toHaveBeenCalledTimes(1);
    expect(session.endSession).not.toHaveBeenCalled();
  });

  test("a mentor must confirm before ending the session", () => {
    const session = makeSession({ role: "mentor", peerRole: "student" });
    renderWithSession(<LiveSessionWindow />, session);

    fireEvent.click(screen.getByRole("button", { name: "End Session" }));
    expect(screen.getByRole("alertdialog")).toHaveTextContent("Are you sure you want to leave?");
    expect(session.endSession).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "End Session" }));
    fireEvent.click(screen.getAllByRole("button", { name: "End Session" })[1]);
    expect(session.endSession).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("wires mute, sound and share to the call", () => {
    const session = makeSession();
    renderWithSession(<LiveSessionWindow />, session);

    fireEvent.click(screen.getByRole("button", { name: "Mute" }));
    fireEvent.click(screen.getByRole("button", { name: "Sound" }));
    fireEvent.click(screen.getByRole("button", { name: "Share" }));

    expect(session.call.toggleMic).toHaveBeenCalled();
    expect(session.call.toggleSpeaker).toHaveBeenCalled();
    expect(session.call.startScreenShare).toHaveBeenCalled();
  });

  test("reflects a muted mic and an active screen share", () => {
    const base = makeSession();
    const session = makeSession({
      call: { ...base.call, micOn: false, isScreenSharing: true },
    });
    renderWithSession(<LiveSessionWindow />, session);

    expect(screen.getByRole("button", { name: "Unmute" })).toBeInTheDocument();
    expect(screen.getByText("You (muted)")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Stop" }));
    expect(session.call.stopScreenShare).toHaveBeenCalled();
  });

  test("controls are disabled until the call has joined", () => {
    const base = makeSession();
    renderWithSession(
      <LiveSessionWindow />,
      makeSession({ call: { ...base.call, joined: false } }),
    );

    expect(screen.getByRole("button", { name: "Mute" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Leave" })).toBeEnabled();
  });

  test("minimizes to just the header and expands again", () => {
    renderWithSession(<LiveSessionWindow />, makeSession());

    fireEvent.click(screen.getByRole("button", { name: "Minimize live session" }));
    expect(screen.queryByRole("button", { name: "Mute" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Expand live session" }));
    expect(screen.getByRole("button", { name: "Mute" })).toBeInTheDocument();
  });

  test("shows why the video cannot connect", () => {
    renderWithSession(
      <LiveSessionWindow />,
      makeSession({ videoError: "Could not get access to the video call." }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Could not get access to the video call.");
  });
});
