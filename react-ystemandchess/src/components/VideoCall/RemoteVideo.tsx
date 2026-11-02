import { useEffect, useRef } from "react";
import { IAgoraRTCRemoteUser } from "agora-rtc-sdk-ng";

type Props = {
  user: IAgoraRTCRemoteUser;
  /** "cover" crops to fill (camera tiles); "contain" letterboxes (shared screens). */
  fit?: "cover" | "contain";
  className?: string;
};

/** Plays a single remote peer's camera (or shared screen) into its own element. */
const RemoteVideo = ({ user, fit = "cover", className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (user.videoTrack && ref.current) user.videoTrack.play(ref.current, { fit });
    return () => {
      user.videoTrack?.stop();
    };
  }, [user, user.videoTrack, fit]);
  return <div ref={ref} className={className ?? "h-full w-full rounded-md bg-black"} />;
};

export default RemoteVideo;
