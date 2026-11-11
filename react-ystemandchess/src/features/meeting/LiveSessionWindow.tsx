import { PointerEvent, ReactNode, useEffect, useRef, useState } from "react";
import {
  Maximize2,
  Mic,
  MicOff,
  Minus,
  MonitorUp,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import RemoteVideo from "../../components/VideoCall/RemoteVideo";
import { useLiveSession } from "./LiveSessionContext";

/**
 * LiveSessionWindow — the floating "Live session" picture-in-picture shown while
 * a mentor⇄student call is connected. It lives above the whole profile page so
 * the call keeps going while the user opens lessons, games, puzzles, etc.
 *
 * Drag it by the green header; the header button collapses it to just the bar.
 * Students "Leave" (the session stays open to rejoin); mentors "End Session",
 * which ends it for both sides after a confirmation.
 */

type DragState = {
  pointerX: number;
  pointerY: number;
  baseX: number;
  baseY: number;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const LiveSessionWindow = () => {
  const {
    role,
    peerRole,
    isVideoConfigured,
    videoError,
    call,
    peerCamera,
    leaveSession,
    endSession,
  } = useLiveSession();
  const [isMinimized, setIsMinimized] = useState(false);
  const [isConfirmingEnd, setIsConfirmingEnd] = useState(false);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const windowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  // Keep the window fully on screen while dragging.
  const handlePointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("button") || !windowRef.current) return;
    const rect = windowRef.current.getBoundingClientRect();
    dragRef.current = {
      pointerX: e.clientX,
      pointerY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      minX: offset.x - rect.left,
      maxX: offset.x + (window.innerWidth - rect.right),
      minY: offset.y - rect.top,
      maxY: offset.y + (window.innerHeight - rect.bottom),
    };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    setOffset({
      x: clamp(drag.baseX + e.clientX - drag.pointerX, drag.minX, drag.maxX),
      y: clamp(drag.baseY + e.clientY - drag.pointerY, drag.minY, drag.maxY),
    });
  };

  const handlePointerUp = () => {
    dragRef.current = null;
  };

  const handleShareClick = () =>
    call.isScreenSharing ? call.stopScreenShare() : call.startScreenShare();

  const handleLeaveClick = () => {
    if (role === "mentor") setIsConfirmingEnd(true);
    else leaveSession();
  };

  return (
    <>
      <div
        ref={windowRef}
        role="region"
        aria-label="Live session"
        className="fixed bottom-4 right-4 z-[1000] w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl bg-dark shadow-2xl"
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      >
        <div
          className="flex cursor-move touch-none select-none items-center justify-between bg-primary px-3 py-1.5"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <span className="flex items-center gap-2 text-xs font-bold text-dark">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red" aria-hidden="true" />
            Live session
          </span>
          <button
            type="button"
            onClick={() => setIsMinimized((m) => !m)}
            aria-label={isMinimized ? "Expand live session" : "Minimize live session"}
            className="rounded p-1 text-dark transition-colors hover:bg-dark/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dark"
          >
            {isMinimized ? <Maximize2 size={14} /> : <Minus size={14} />}
          </button>
        </div>

        {/* Hidden rather than unmounted: Agora plays the local camera into this
            element once, at join time. */}
        <div hidden={isMinimized}>
          <div className="relative aspect-video bg-black">
            {peerCamera ? (
              <RemoteVideo user={peerCamera} className="absolute inset-0" />
            ) : (
              <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-light/80">
                {isVideoConfigured
                  ? `Waiting for your ${peerRole} to join…`
                  : "Video is unavailable: no Agora appId is configured."}
              </p>
            )}
            <div className="absolute bottom-2 right-2 aspect-video w-24 overflow-hidden rounded-md border border-light/30 bg-dark shadow-lg">
              <div ref={call.localVideoRef} className="h-full w-full" />
              <span className="absolute bottom-0.5 left-1 text-[10px] font-semibold text-light">
                You{!call.micOn && " (muted)"}
              </span>
            </div>
          </div>

          {videoError && (
            <p role="alert" className="bg-redLight px-3 py-1.5 text-xs text-red">
              {videoError}
            </p>
          )}

          <div className="flex justify-around px-2 py-2">
            <ControlButton
              label={call.micOn ? "Mute" : "Unmute"}
              isOff={!call.micOn}
              disabled={!call.joined}
              onClick={call.toggleMic}
            >
              {call.micOn ? <Mic size={18} /> : <MicOff size={18} />}
            </ControlButton>
            <ControlButton
              label="Sound"
              isOff={!call.speakerOn}
              disabled={!call.joined}
              onClick={call.toggleSpeaker}
            >
              {call.speakerOn ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </ControlButton>
            <ControlButton
              label={call.isScreenSharing ? "Stop" : "Share"}
              isActive={call.isScreenSharing}
              disabled={!call.joined}
              onClick={handleShareClick}
            >
              <MonitorUp size={18} />
            </ControlButton>
            <ControlButton
              label={role === "mentor" ? "End Session" : "Leave"}
              isOff
              onClick={handleLeaveClick}
            >
              <X size={18} />
            </ControlButton>
          </div>
        </div>
      </div>

      {isConfirmingEnd && (
        <EndSessionDialog
          peerRole={peerRole}
          onCancel={() => setIsConfirmingEnd(false)}
          onConfirm={() => {
            setIsConfirmingEnd(false);
            endSession();
          }}
        />
      )}
    </>
  );
};

type ControlButtonProps = {
  label: string;
  onClick: () => void;
  children: ReactNode;
  isOff?: boolean;
  isActive?: boolean;
  disabled?: boolean;
};

const ControlButton = ({
  label,
  onClick,
  children,
  isOff = false,
  isActive = false,
  disabled = false,
}: ControlButtonProps) => {
  const tone = isOff
    ? "bg-red text-light hover:brightness-110"
    : isActive
      ? "bg-primary text-dark hover:brightness-110"
      : "bg-gray text-light hover:bg-muted";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group flex w-16 flex-col items-center gap-1 disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full transition-all group-active:scale-90 group-focus-visible:ring-2 group-focus-visible:ring-primary ${tone}`}
      >
        {children}
      </span>
      <span className="text-[10px] font-semibold text-light">{label}</span>
    </button>
  );
};

type EndSessionDialogProps = {
  peerRole: string;
  onCancel: () => void;
  onConfirm: () => void;
};

const EndSessionDialog = ({ peerRole, onCancel, onConfirm }: EndSessionDialogProps) => {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel]);

  return (
    <div
      className="fixed inset-0 z-[1001] flex items-center justify-center bg-dark/40 p-4"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="end-session-title"
        className="w-full max-w-xs rounded-xl bg-light p-6 text-center shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="end-session-title" className="text-lg font-bold text-dark">
          Are you sure you want to leave?
        </h2>
        <p className="mt-1 text-sm text-gray">This ends the session for your {peerRole} too.</p>
        <div className="mt-5 flex justify-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-dark hover:bg-soft"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className="rounded-lg bg-red px-4 py-2 text-sm font-bold text-light shadow hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red"
          >
            End Session
          </button>
        </div>
      </div>
    </div>
  );
};

export default LiveSessionWindow;
