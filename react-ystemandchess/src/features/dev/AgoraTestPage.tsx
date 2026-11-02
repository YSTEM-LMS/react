import { useState } from "react";
import { VideoCall } from "../../components/VideoCall";

/**
 * AgoraTestPage — DEV/TEST HARNESS for the Agora → React video port.
 *
 * The real <VideoCall> only renders after the student-vs-student challenge
 * handshake (two accounts + middleware). This page mounts it directly so the
 * call can be exercised end-to-end without matchmaking.
 *
 * How to run a live end-to-end test:
 *   1. Start the React dev server and open  /agora-test  in a browser.
 *   2. Keep the default room (or set your own) and click "Join".
 *   3. Open the SAME url + room in a second tab, window, or device
 *      (e.g. /agora-test?room=agora-e2e-test) and Join there too.
 *   4. Grant camera/mic permission in both — each side should see the other.
 *
 * This route is gated to non-production environments (see AppRoutes.tsx) and
 * should not ship to prod.
 */

const DEFAULT_ROOM = "agora-e2e-test";

const AgoraTestPage = () => {
  const params = new URLSearchParams(window.location.search);
  const [room, setRoom] = useState(params.get("room") || DEFAULT_ROOM);
  const [joined, setJoined] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-dark">Agora video — E2E test harness</h1>
      <p className="mt-1 text-sm text-gray">
        Open this page in two tabs/devices with the same room to verify two-way video.
        (Dev only — not part of the real student flow.)
      </p>

      <div className="mt-4 flex items-end gap-3">
        <label className="flex flex-col text-sm font-semibold text-dark">
          Room / channel
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            disabled={joined}
            className="mt-1 w-64 rounded-md border border-gray-300 px-3 py-2 font-normal"
          />
        </label>
        {joined ? (
          <button
            onClick={() => setJoined(false)}
            className="rounded-md bg-gray-200 px-4 py-2 font-semibold"
          >
            Leave
          </button>
        ) : (
          <button
            onClick={() => setJoined(true)}
            disabled={!room.trim()}
            className="rounded-md bg-yellow-300 px-4 py-2 font-bold text-black disabled:opacity-50"
          >
            Join
          </button>
        )}
      </div>

      <div className="mt-6">
        {joined ? (
          <VideoCall channel={room.trim()} />
        ) : (
          <p className="text-sm text-gray">Not connected. Click Join to start the call.</p>
        )}
      </div>
    </div>
  );
};

export default AgoraTestPage;
