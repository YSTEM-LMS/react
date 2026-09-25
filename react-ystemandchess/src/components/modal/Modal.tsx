import React, { useEffect } from "react";

export type ModalType = "success" | "error" | "loading" | "info";

export interface ModalProps {
  type: ModalType;
  title: string;
  message?: string;
  confirmText?: string;
  /** Called after the modal closes itself (button click). Not used for loading. */
  onConfirm?: () => void;
}

interface Props extends ModalProps {
  /** Called by the modal to close itself — pass your state setter here. */
  onClose: () => void;
}

const icons: Record<ModalType, React.ReactNode> = {
  success: (
    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
      </svg>
    </div>
  ),
  error: (
    <div className="w-16 h-16 rounded-full bg-redLight flex items-center justify-center">
      <svg className="w-8 h-8 text-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
      </svg>
    </div>
  ),
  loading: (
    <div className="w-16 h-16 rounded-full border-4 border-soft border-t-primary animate-spin" />
  ),
  info: (
    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
      <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12a8 8 0 01-11.5 7.2L3 21l1.8-6.5A8 8 0 1121 12z" />
      </svg>
    </div>
  ),
};

const Modal: React.FC<Props> = ({
  type,
  title,
  message,
  confirmText = "OK",
  onConfirm,
  onClose,
}) => {
  // Allow ESC to dismiss non-loading modals
  useEffect(() => {
    if (type === "loading") return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        onConfirm?.();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [type, onClose, onConfirm]);

  const handleConfirm = () => {
    onClose();
    onConfirm?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-dark/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-light w-full max-w-sm rounded-2xl shadow-xl p-8 flex flex-col items-center gap-5 animate-modal-in">
        {icons[type]}

        <h2 id="modal-title" className="text-xl font-bold text-dark text-center">
          {title}
        </h2>

        {message && (
          <p className="text-sm text-gray text-center leading-relaxed">{message}</p>
        )}

        {type !== "loading" && (
          <button
            className="btn-green w-full mt-1"
            onClick={handleConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        )}
      </div>
    </div>
  );
};

export default Modal;
