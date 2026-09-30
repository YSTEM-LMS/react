import React, { useState, useRef, useImperativeHandle, useEffect, forwardRef } from "react";
import Chessboard, { ChessMode } from "chessboardjsx";
import { Chess, Square } from "chess.js";
import { Move } from "../../core/types/chess";
import "./ChessBoard.css";

interface ChessBoardProps {
  mode?: ChessMode;
  fen?: string;
  lessonMoves?: Move[];
  orientation?: "white" | "black";
  disabled?: boolean;

  // Event handlers
  onMove?: (move: Move) => void;
  onInvalidMove?: () => void;
  onPromotion?: (from: string, to: string, piece: string) => void;

  // Highlighting
  highlightSquares?: string[];
  onHighlightChange?: (squares: string[]) => void;
}

export interface ChessBoardRef {
  handlePromotion: (from: string, to: string, piece: string) => void;
  reset: () => void;
  getFen: () => string;
  setOrientation: (color: "white" | "black") => void;
  flip: () => void;
  undo: () => void;
  loadPosition: (fen: string) => void;
  setPosition: (fen: string) => void;
  highlightMove: (from: string, to: string) => void;
  clearHighlights: () => void;
}

const ChessBoard = forwardRef<ChessBoardRef, ChessBoardProps>(
  (
    {
      mode = "multiplayer",
      fen,
      lessonMoves = [],
      orientation: propOrientation = "white",
      disabled = false,
      onMove,
      onInvalidMove,
      onPromotion,
      highlightSquares: externalHighlights = [],
      onHighlightChange,
    },
    ref
  ) => {
    // Internal chess engine for move validation and UI hints (grey dots)
    // This is kept in sync with the authoritative FEN prop from parent/socket
    const gameRef = useRef<Chess>(new Chess());
    const start_fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

    const [internalHighlights, setInternalHighlights] = useState<string[]>([]);
    const [lessonIndex, setLessonIndex] = useState<number>(0);
    const [isShaking, setIsShaking] = useState<boolean>(false);
    const [orientation, setOrientationState] = useState<"white" | "black">(propOrientation);
    // Helper to check if a FEN is shorthand for the starting position
    const isStartFen = (f?: string): boolean => {
      if (!f) return true;
      const t = f.trim().toLowerCase();
      return t === "start" || t === start_fen;
    };
    const [boardPosition, setBoardPosition] = useState<string>(
      fen && !isStartFen(fen) ? fen : start_fen
    );
    const [boardWidth, setBoardWidth] = useState(600);
    const [greySquares, setGreySquares] = useState<string[]>([]);

    const boardRef = useRef<HTMLDivElement | null>(null);

    // Responsive sizing
    useEffect(() => {
      const handleResize = () => {
        if (boardRef.current) {
          const containerWidth = boardRef.current.offsetWidth;
          setBoardWidth(Math.min(containerWidth, 600));
        }
      };

      requestAnimationFrame(handleResize);
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Sync orientation from props
    useEffect(() => {
      setOrientationState(propOrientation);
    }, [propOrientation]);

        // Always keep gameRef.current in sync with the authoritative FEN prop
    useEffect(() => {
      if (fen && !isStartFen(fen)) {
        try {
          const currentFen = gameRef.current.fen();

          // Only update if FEN has actually changed
          if (fen !== currentFen) {
            gameRef.current.load(fen);
            setBoardPosition(fen || start_fen);
          }
        } catch (err) {
          // Invalid FEN: keep the current board rather than resetting it.
          console.error("ChessBoard: Invalid FEN from props:", fen, err);
        }
      }
    }, [fen]);

    // Combine highlights from props and internal state
    const allHighlights = [...externalHighlights, ...internalHighlights];

    useImperativeHandle(ref, () => ({
      handlePromotion: (from: string, to: string, piece: string) => {
        if (onPromotion) onPromotion(from, to, piece);
      },

      reset: () => {
        gameRef.current.reset();
        setBoardPosition(gameRef.current.fen());
        setInternalHighlights([]);
        setLessonIndex(0);
      },

      getFen: () => gameRef.current.fen(),

      setOrientation: (color: "white" | "black") => setOrientationState(color),

      flip: () => setOrientationState((o) => (o === "white" ? "black" : "white")),

      undo: () => {
        gameRef.current.undo();
        setBoardPosition(gameRef.current.fen());
        setInternalHighlights([]);
        setLessonIndex((prev) => Math.max(0, prev - 1));
      },

      loadPosition: (newFen: string) => {
        try {
          gameRef.current.load(newFen);
          setBoardPosition(newFen);
          setGreySquares([]);
        } catch (err) {
          console.error("Failed to load FEN:", newFen, err);
        }
      },

      setPosition: (newFen: string) => {
        try {
          gameRef.current.load(newFen);
          setBoardPosition(newFen);
          setGreySquares([]);
        } catch (err) {
          console.error("Failed to set position:", newFen, err);
        }
      },

      highlightMove: (from: string, to: string) => {
        const highlights = [from, to];
        setInternalHighlights(highlights);
        if (onHighlightChange) onHighlightChange(highlights);
      },

      clearHighlights: () => {
        setInternalHighlights([]);
        setGreySquares([]);
        if (onHighlightChange) onHighlightChange([]);
      },
    }));

    const handleDrop = ({
      sourceSquare,
      targetSquare,
    }: {
      sourceSquare: string;
      targetSquare: string;
    }) => {
      // If they drop it on the same square, snap it back!
      if (sourceSquare === targetSquare) return "snapback";

      try {
        // Ignore if board is disabled
        if (disabled) {
          return "snapback";
        }

        const piece = gameRef.current.get(sourceSquare as Square);
        if (!piece) {
          return "snapback";
        }

        // Check for pawn promotion
        const isPromotion =
          piece.type === "p" &&
          (targetSquare[1] === "8" || targetSquare[1] === "1");

        // Construct move object
        const move: Move = {
          from: sourceSquare,
          to: targetSquare,
          promotion: isPromotion ? "q" : undefined,
        };

        // Lesson mode: validate expected moves BEFORE making the move
        if (lessonMoves.length > 0 && lessonIndex < lessonMoves.length) {
          const expected = lessonMoves[lessonIndex];

          if (move.from !== expected.from || move.to !== expected.to) {
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 400);
            if (onInvalidMove) onInvalidMove();
            return "snapback";
          }
        }

        // Validate move locally for instant feedback (optimistic UI)
        const moveResult = gameRef.current.move({
          from: sourceSquare as Square,
          to: targetSquare as Square,
          promotion: move.promotion,
        });

        if (!moveResult) {
          // Invalid move - shake animation and snapback
          setIsShaking(true);
          setTimeout(() => setIsShaking(false), 400);
          if (onInvalidMove) onInvalidMove();
          return "snapback";
        }

        // Valid move - update UI immediately (optimistic update)
        setBoardPosition(gameRef.current.fen());

        // Highlight the move locally for instant feedback
        setInternalHighlights([sourceSquare, targetSquare]);

        // Increment lesson index if in lesson mode
        if (lessonMoves.length > 0 && lessonIndex < lessonMoves.length) {
          setLessonIndex((idx) => idx + 1);
        }

        // Send move to server/parent (server will send back authoritative FEN)
        if (onMove) onMove(move);

        // Note: Server response will trigger FEN prop update, which will sync gameRef
        // If server rejects the move, the FEN prop won't change and we stay in sync
      } catch (error) {
        console.error("Error in handleDrop:", error);
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 400);
        if (onInvalidMove) onInvalidMove();
        return "snapback";
      }
    };

    const allowDrag = ({ piece }: { piece: string }) => {
      if (disabled) return false;

      const pieceColor = piece.startsWith('w') ? 'white' : 'black';

      if (mode === "puzzle") {
        return pieceColor === orientation;
      }

      if (mode === "lesson") {
        return true;
      }

      return pieceColor === orientation;
    };

    const onMouseOverSquare = (square: string) => {
      if (disabled) {
        setGreySquares([]);
        return;
      }

      const moves = gameRef.current.moves({
        square: square as Square,
        verbose: true,
      });

      if (moves.length === 0) {
        setGreySquares([]);
        return;
      }

      const newGreySquares = moves.map((move) => move.to);
      setGreySquares(newGreySquares);
    };

    const onMouseOutSquare = () => {
      setGreySquares([]);
    };

    const squareStyles = (): Record<string, React.CSSProperties> => {
      const styles: Record<string, React.CSSProperties> = {};

      // Highlight selected/moved squares
      allHighlights.forEach((sq) => {
        styles[sq] = {
          background: "rgba(255, 251, 0, 0.75)",
        };
      });

      // Move hints
      greySquares.forEach((sq) => {
        const hasHighlight = !!styles[sq]?.background;
        const hasPiece = !!gameRef.current.get(sq as Square);

        let hint: string;
        if (hasPiece) {
          hint = 'radial-gradient(circle, transparent 55%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0.18) 67%, transparent 67%)';
        } else {
          hint = 'radial-gradient(circle, rgba(0,0,0,0.18) 17%, transparent 17%)';
        }

        styles[sq] = {
          background: hasHighlight ? `${hint}, ${styles[sq].background}` : hint,
        };
      });

      return styles;
    };

    return (
      <div
        ref={boardRef}
        className={`chessboard-wrapper ${isShaking ? "shake" : ""}`}
        style={{ width: '100%', maxWidth: '600px', margin: '0 auto' }}
      >
        <Chessboard
          width={boardWidth}
          position={boardPosition || start_fen}
          onDrop={handleDrop}
          orientation={orientation}
          squareStyles={squareStyles()}
          allowDrag={allowDrag}
          onMouseOverSquare={onMouseOverSquare}
          onMouseOutSquare={onMouseOutSquare}
        />
      </div>
    );
  }
);

export default ChessBoard;
