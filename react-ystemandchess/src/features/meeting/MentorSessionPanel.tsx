import { useLiveSession } from "./LiveSessionContext";
import { useCameraPreview } from "./useCameraPreview";

/**
 * MentorSessionPanel — the "Mentor Session" tab on the student and mentor
 * profiles. Must render inside <LiveSessionProvider>.
 *
 *   idle / ended → Join Session (or Rejoin, if a session is still open)
 *   searching    → own camera preview while we wait to be matched
 *   in-meeting   → pointer to the floating Live session window
 */
const MentorSessionPanel = () => {
  const { meetingState } = useLiveSession();

  return (
    <section aria-labelledby="mentor-session-title" className="mx-auto w-full max-w-xl">
      {meetingState === "searching" ? (
        <SearchingView />
      ) : meetingState === "in-meeting" ? (
        <ConnectedView />
      ) : (
        <JoinView />
      )}
    </section>
  );
};

const Title = () => (
  <h2 id="mentor-session-title" className="text-center text-2xl font-bold text-dark">
    Mentor Session
  </h2>
);

const JoinView = () => {
  const { role, meetingState, hasOngoingMeeting, meetingError, joinSession } =
    useLiveSession();

  const subtitle =
    role === "mentor"
      ? "Start a live video session with your student."
      : "Join a live video session with your mentor.";

  return (
    <div className="flex flex-col items-center gap-4 text-center">
      <Title />
      <p className="text-gray">{subtitle}</p>
      {meetingState === "ended" && (
        <p className="rounded-lg bg-soft px-4 py-2 text-sm font-medium text-dark">
          Your session has ended.
        </p>
      )}
      <button
        type="button"
        onClick={joinSession}
        className="w-full max-w-xs rounded-lg bg-accent px-6 py-3 font-bold text-dark shadow transition-all hover:brightness-95 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-dark"
      >
        {hasOngoingMeeting ? "Rejoin Session" : "Join Session"}
      </button>
      {hasOngoingMeeting && (
        <p className="text-xs text-gray">Your session is still open — rejoin to reconnect.</p>
      )}
      {meetingError && (
        <p role="alert" className="text-sm text-red">
          {meetingError}
        </p>
      )}
    </div>
  );
};

const SearchingView = () => {
  const { peerRole, cancelSearch } = useLiveSession();
  const { videoRef, isUnavailable } = useCameraPreview(true);

  return (
    <div className="overflow-hidden rounded-xl bg-dark shadow-lg">
      <div className="relative aspect-[4/3] bg-black">
        {isUnavailable ? (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-light/70">
            Camera preview unavailable
          </p>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-label="Your camera preview"
            className="h-full w-full -scale-x-100 object-cover"
          />
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-dark/90 to-transparent px-6 pb-5 pt-16 text-center">
          <span className="mb-1 flex items-center gap-1.5 rounded-full bg-dark/70 px-2.5 py-0.5 text-[11px] font-semibold text-light">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red" aria-hidden="true" />
            Live session
          </span>
          <h2 id="mentor-session-title" className="text-xl font-bold text-light" aria-live="polite">
            Looking for your {peerRole}…
          </h2>
          <p className="text-xs text-light/80">
            {isUnavailable ? "" : "Your camera is on. "}
            We'll connect you the moment your {peerRole} joins.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={cancelSearch}
        className="w-full py-3 font-semibold text-light transition-colors hover:bg-gray focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary"
      >
        Leave
      </button>
    </div>
  );
};

const ConnectedView = () => {
  const { peerRole, peerCamera } = useLiveSession();
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <Title />
      <p className="flex items-center gap-2 rounded-full bg-soft px-4 py-1.5 text-sm font-semibold text-dark">
        <span className="h-2 w-2 animate-pulse rounded-full bg-red" aria-hidden="true" />
        {peerCamera ? `You're live with your ${peerRole}` : `Waiting for your ${peerRole} to join…`}
      </p>
      <p className="max-w-sm text-sm text-gray">
        Your call is in the floating window. Open any activity from the list — the
        session keeps going while you switch.
      </p>
    </div>
  );
};

export default MentorSessionPanel;
