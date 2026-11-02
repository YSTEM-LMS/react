import RemoteVideo from "../../components/VideoCall/RemoteVideo";
import { useLiveSession } from "./LiveSessionContext";

/**
 * SharedScreenView — shows the other side's shared screen in the profile's main
 * content area (e.g. the mentor watching the student work through a lesson).
 * Renders nothing unless the peer is sharing. Must render inside
 * <LiveSessionProvider>.
 */
const SharedScreenView = () => {
  const { peerRole, peerScreen } = useLiveSession();
  if (!peerScreen) return null;

  return (
    <section
      aria-label={`Your ${peerRole}'s screen`}
      className="mb-6 overflow-hidden rounded-xl bg-dark shadow-lg"
    >
      <h2 className="px-4 py-2 text-sm font-semibold text-light">
        Your {peerRole}'s screen
      </h2>
      <RemoteVideo user={peerScreen} fit="contain" className="aspect-video w-full bg-black" />
    </section>
  );
};

export default SharedScreenView;
