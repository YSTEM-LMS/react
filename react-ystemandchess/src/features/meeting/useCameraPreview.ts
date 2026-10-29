import { useEffect, useRef, useState } from "react";

/**
 * useCameraPreview — shows the user's own camera (no audio, nothing published)
 * while they wait to be matched, then releases the device when disabled so the
 * Agora call can open it.
 */
export function useCameraPreview(enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    if (!navigator.mediaDevices?.getUserMedia) {
      setIsUnavailable(true);
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;
    setIsUnavailable(false);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((s) => {
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop());
          return;
        }
        stream = s;
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(() => {
        if (!cancelled) setIsUnavailable(true);
      });

    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  return { videoRef, isUnavailable };
}
