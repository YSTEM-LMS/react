import React from 'react';

interface ConfettiProps {
  show: boolean;
  pieceCount?: number;
}

const Confetti: React.FC<ConfettiProps> = ({ show, pieceCount = 50 }) => {
  if (!show) return null;

  const colors = ['#3a7cca', '#d64309', '#ffd700', '#ff6b6b', '#4ecdc4'];

  return (
    <div className="pointer-events-none fixed inset-0 z-[1000] overflow-hidden" aria-hidden="true">
      {[...Array(pieceCount)].map((_, i) => (
        <div
          key={i}
          className="absolute h-[10px] w-[10px] animate-confetti-fall"
          style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: colors[Math.floor(Math.random() * colors.length)],
          }}
        />
      ))}
    </div>
  );
};

export default Confetti;
