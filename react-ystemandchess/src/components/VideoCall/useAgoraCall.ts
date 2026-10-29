import { useCallback, useEffect, useRef, useState } from "react";
import AgoraRTC, {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  ICameraVideoTrack,
  ILocalVideoTrack,
  IMicrophoneAudioTrack,
} from "agora-rtc-sdk-ng";

/**
 * useAgoraCall — two-way Agora video for the React app.
 *
 *   - App-ID-only auth (no token), channel = the shared meeting/game id.
 *   - codec "h264" so a peer on the old Angular client interoperates.
 *   - Publishes local mic + camera and subscribes to remote peers.
 *
 * Controls (React-only; these never existed in the old app):
 *   - toggleMic / toggleCam — mute audio / turn the camera off, in place.
 *   - toggleSpeaker — silence the other side's audio locally (they're unaffected).
 *   - startScreenShare / stopScreenShare — share the screen WHILE keeping the
 *     camera on, via a second Agora client that joins the same channel with its
 *     own uid. That second publisher would otherwise echo back to us, so we
 *     filter our own screen uid out of the remote list.
 */

type Options = {
  appId: string;
  channel: string;
  token?: string | null;
  uid?: string | number | null;
  /** Fixed uid/token for the screen-share client (server-issued); random/`token` if omitted. */
  screenUid?: number | null;
  screenToken?: string | null;
  enabled?: boolean;
};

export type AgoraCall = {
  localVideoRef: React.RefObject<HTMLDivElement>;
  localScreenRef: React.RefObject<HTMLDivElement>;
  remoteUsers: IAgoraRTCRemoteUser[];
  joined: boolean;
  error: string | null;
  // controls
  micOn: boolean;
  camOn: boolean;
  speakerOn: boolean;
  isScreenSharing: boolean;
  toggleMic: () => Promise<void>;
  toggleCam: () => Promise<void>;
  toggleSpeaker: () => void;
  startScreenShare: () => Promise<void>;
  stopScreenShare: () => Promise<void>;
};

export function useAgoraCall({
  appId,
  channel,
  token = null,
  uid = null,
  screenUid = null,
  screenToken = null,
  enabled = true,
}: Options): AgoraCall {
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const camTrackRef = useRef<ICameraVideoTrack | null>(null);
  const localVideoRef = useRef<HTMLDivElement>(null);

  // Screen share runs on its own client so the camera can stay published.
  const screenClientRef = useRef<IAgoraRTCClient | null>(null);
  const screenTrackRef = useRef<ILocalVideoTrack | null>(null);
  const screenUidRef = useRef<number | null>(null);
  const localScreenRef = useRef<HTMLDivElement>(null);

  const [remoteUsers, setRemoteUsers] = useState<IAgoraRTCRemoteUser[]>([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  // Read by the user-published handler, so peers who join later honour it.
  const speakerOnRef = useRef(true);
  const [speakerOn, setSpeakerOn] = useState(true);

  useEffect(() => {
    if (!enabled || !appId || !channel) return;

    let cancelled = false;
    setError(null);
    const client = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    clientRef.current = client;

    // Exclude our own screen-share publisher from the peers we render.
    const syncRemotes = () =>
      setRemoteUsers(
        client.remoteUsers.filter((u) => u.uid !== screenUidRef.current),
      );

    const handleUserPublished = async (
      user: IAgoraRTCRemoteUser,
      mediaType: "audio" | "video",
    ) => {
      if (user.uid === screenUidRef.current) return; // our own screen
      try {
        await client.subscribe(user, mediaType);
      } catch {
        return;
      }
      if (mediaType === "audio") {
        user.audioTrack?.setVolume(speakerOnRef.current ? 100 : 0);
        user.audioTrack?.play();
      }
      syncRemotes();
    };

    const handleUserUnpublished = () => syncRemotes();
    const handleUserLeft = () => syncRemotes();

    client.on("user-published", handleUserPublished);
    client.on("user-unpublished", handleUserUnpublished);
    client.on("user-left", handleUserLeft);

    (async () => {
      try {
        await client.join(appId, channel, token ?? null, uid ?? null);
        const [micTrack, camTrack] =
          await AgoraRTC.createMicrophoneAndCameraTracks();
        if (cancelled) {
          micTrack.close();
          camTrack.close();
          return;
        }
        micTrackRef.current = micTrack;
        camTrackRef.current = camTrack;
        if (localVideoRef.current) camTrack.play(localVideoRef.current);
        await client.publish([micTrack, camTrack]);
        setJoined(true);
      } catch (err: any) {
        // A cleanup that ran mid-join (unmount, StrictMode re-run) aborts the
        // join on purpose — that is not an error the user should see.
        if (cancelled) return;
        setError(err?.message || "Failed to join the video call.");
      }
    })();

    return () => {
      cancelled = true;
      client.off("user-published", handleUserPublished);
      client.off("user-unpublished", handleUserUnpublished);
      client.off("user-left", handleUserLeft);

      // Tear down screen share if it's running.
      screenTrackRef.current?.stop();
      screenTrackRef.current?.close();
      screenClientRef.current?.leave().catch(() => {});
      screenTrackRef.current = null;
      screenClientRef.current = null;
      screenUidRef.current = null;

      micTrackRef.current?.stop();
      micTrackRef.current?.close();
      camTrackRef.current?.stop();
      camTrackRef.current?.close();
      micTrackRef.current = null;
      camTrackRef.current = null;

      client.removeAllListeners();
      client.leave().catch(() => {});
      clientRef.current = null;
      setJoined(false);
      setRemoteUsers([]);
      setIsScreenSharing(false);
      setMicOn(true);
      setCamOn(true);
      speakerOnRef.current = true;
      setSpeakerOn(true);
    };
  }, [appId, channel, token, uid, enabled]);

  const toggleSpeaker = useCallback(() => {
    const next = !speakerOnRef.current;
    speakerOnRef.current = next;
    clientRef.current?.remoteUsers.forEach((u) =>
      u.audioTrack?.setVolume(next ? 100 : 0),
    );
    setSpeakerOn(next);
  }, []);

  const toggleMic = useCallback(async () => {
    const track = micTrackRef.current;
    if (!track) return;
    const next = !micOn;
    await track.setMuted(!next); // next = on → not muted
    setMicOn(next);
  }, [micOn]);

  const toggleCam = useCallback(async () => {
    const track = camTrackRef.current;
    if (!track) return;
    const next = !camOn;
    await track.setMuted(!next);
    setCamOn(next);
  }, [camOn]);

  const stopScreenShare = useCallback(async () => {
    const track = screenTrackRef.current;
    const sClient = screenClientRef.current;
    try {
      if (track && sClient) await sClient.unpublish(track).catch(() => {});
      track?.stop();
      track?.close();
      await sClient?.leave().catch(() => {});
    } finally {
      screenTrackRef.current = null;
      screenClientRef.current = null;
      screenUidRef.current = null;
      setIsScreenSharing(false);
    }
  }, []);

  const startScreenShare = useCallback(async () => {
    if (isScreenSharing || !appId || !channel) return;
    // The call this share belongs to; if it is torn down (Leave) while we are
    // still awaiting the picker or the join, the share must clean itself up.
    const mainClient = clientRef.current;
    const isStale = () => clientRef.current !== mainClient || !mainClient;
    const sClient = AgoraRTC.createClient({ mode: "rtc", codec: "h264" });
    let screenTrack: ILocalVideoTrack | null = null;
    const discard = () => {
      screenTrack?.stop();
      screenTrack?.close();
      sClient.leave().catch(() => {});
    };
    try {
      // A distinct uid so our main client can identify (and ignore) our screen.
      const shareUid = screenUid ?? Math.floor(Math.random() * 900000) + 100000;
      screenUidRef.current = shareUid;
      await sClient.join(appId, channel, screenToken ?? token ?? null, shareUid);
      if (isStale()) return discard();

      screenTrack = await AgoraRTC.createScreenVideoTrack({}, "disable");
      if (isStale()) return discard();
      screenClientRef.current = sClient;
      screenTrackRef.current = screenTrack;

      // Fires when the user clicks the browser's native "Stop sharing".
      screenTrack.on("track-ended", () => {
        stopScreenShare();
      });

      if (localScreenRef.current) screenTrack.play(localScreenRef.current);
      await sClient.publish(screenTrack);
      setIsScreenSharing(true);
    } catch (err: any) {
      // User cancelling the share picker throws here — treat as a no-op, but
      // the already-joined screen client must still leave the channel.
      discard();
      if (isStale()) return;
      screenUidRef.current = null;
      screenClientRef.current = null;
      screenTrackRef.current = null;
      setIsScreenSharing(false);
      if (err?.code !== "PERMISSION_DENIED") {
        setError(err?.message || "Could not start screen sharing.");
      }
    }
  }, [appId, channel, token, screenUid, screenToken, isScreenSharing, stopScreenShare]);

  return {
    localVideoRef,
    localScreenRef,
    remoteUsers,
    joined,
    error,
    micOn,
    camOn,
    speakerOn,
    isScreenSharing,
    toggleMic,
    toggleCam,
    toggleSpeaker,
    startScreenShare,
    stopScreenShare,
  };
}
