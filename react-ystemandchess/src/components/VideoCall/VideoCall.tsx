import { environment } from "../../environments";
import { useAgoraCall } from "./useAgoraCall";
import RemoteVideo from "./RemoteVideo";

/**
 * VideoCall — reusable two-way Agora video panel with mic/camera/screen controls.
 *
 *   <VideoCall channel={meetingId} />
 *
 * Controls are React-only additions (mute, camera off, screen share). Screen
 * sharing keeps the camera on and appears as an extra tile for the other peer.
 */

// environment.js is untyped JS; the appId lives at environment.agora.appId.
const APP_ID = (environment as any)?.agora?.appId as string;

type Props = {
  channel: string;
  uid?: string | number | null;
  className?: string;
};

const ctrlBtn = "rounded-md px-3 py-2 text-sm font-semibold shadow";

const VideoCall = ({ channel, uid = null, className }: Props) => {
  const {
    localVideoRef,
    localScreenRef,
    remoteUsers,
    joined,
    error,
    micOn,
    camOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    startScreenShare,
    stopScreenShare,
  } = useAgoraCall({ appId: APP_ID, channel, token: null, uid, enabled: !!channel });

  if (!APP_ID) {
    return (
      <p className="text-sm text-red-600">
        Video is unavailable: no Agora appId configured in this environment.
      </p>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-3">
        {/* Local camera */}
        <div className="relative h-40 w-56 overflow-hidden rounded-md bg-black">
          <div ref={localVideoRef} className="h-full w-full" />
          <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
            You{!camOn && " (camera off)"}
          </span>
        </div>

        {/* Local screen preview (only while sharing) */}
        {isScreenSharing && (
          <div className="relative h-40 w-56 overflow-hidden rounded-md bg-black">
            <div ref={localScreenRef} className="h-full w-full" />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              Your screen
            </span>
          </div>
        )}

        {/* Remote peers */}
        {remoteUsers.map((user) => (
          <div
            key={String(user.uid)}
            className="relative h-40 w-56 overflow-hidden rounded-md bg-black"
          >
            <RemoteVideo user={user} />
            <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
              {String(user.uid)}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={toggleMic}
          disabled={!joined}
          className={`${ctrlBtn} ${micOn ? "bg-gray-200 text-black" : "bg-red-500 text-white"} disabled:opacity-50`}
        >
          {micOn ? "Mute" : "Unmute"}
        </button>
        <button
          onClick={toggleCam}
          disabled={!joined}
          className={`${ctrlBtn} ${camOn ? "bg-gray-200 text-black" : "bg-red-500 text-white"} disabled:opacity-50`}
        >
          {camOn ? "Camera off" : "Camera on"}
        </button>
        <button
          onClick={isScreenSharing ? stopScreenShare : startScreenShare}
          disabled={!joined}
          className={`${ctrlBtn} ${isScreenSharing ? "bg-red-500 text-white" : "bg-gray-200 text-black"} disabled:opacity-50`}
        >
          {isScreenSharing ? "Stop sharing" : "Share screen"}
        </button>
      </div>

      {!joined && !error && (
        <p className="mt-2 text-sm text-gray">Connecting to video…</p>
      )}
      {joined && remoteUsers.length === 0 && (
        <p className="mt-2 text-sm text-gray">Waiting for the other player to join…</p>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
};

export default VideoCall;
