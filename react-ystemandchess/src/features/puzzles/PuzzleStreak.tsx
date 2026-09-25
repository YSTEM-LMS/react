import React, { useRef, useState, useEffect, useCallback } from "react";
import Modal, { ModalProps } from "../../components/modal/Modal";
import { environment } from "../../environments/environment";
import { v4 as uuidv4 } from "uuid";
import { useCookies } from "react-cookie";
import ChessBoard, { ChessBoardRef } from "../../components/ChessBoard/ChessBoard";
import { useChessSocket } from "../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket";
import { Move } from "../../core/types/chess";
import { SetPermissionLevel } from "../../globals";

const normalizeFen = (fen: string): string => {
  if (!fen || typeof fen !== "string") 
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
  const trimmed = fen.trim().toLowerCase();
  if (trimmed === "start") 
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  
  const parts = fen.trim().split(/[\s,]+/);

  if (parts.length === 6) 
    return parts.join(" ");
  if (parts.length === 1 && parts[0].split("/").length === 8) 
    return `${parts[0]} w KQkq - 0 1`;
  
  const defaults = ["w", "KQkq", "-", "0", "1"];
  const paddedParts = [...parts];
  
  while (paddedParts.length < 6) 
    paddedParts.push(defaults[paddedParts.length - 1]);

  return paddedParts.join(" ");
};

const PuzzleStreak = () => {
  const chessBoardRef = useRef<ChessBoardRef>(null);
  const moveListRef = useRef<string[]>([]);
  const isPuzzleEndRef = useRef(false);
  const currentPuzzleRef = useRef<any>(null);

  const [currentFEN, setCurrentFEN] = useState<string>("");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [status, setStatus] = useState<string>("");
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);
  const [cookies] = useCookies(["login"]);
  const [modal, setModal] = useState<Omit<ModalProps, "onClose"> | null>(null);
  const [username, setUsername] = useState<string | null>(null);

  // STREAK LOGIC STATE
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false); 
  const [showHint, setShowHint] = useState(false);
  const [isFailed, setIsFailed] = useState(false);

  const studentId = cookies.login?.studentId || uuidv4();
  const mentorId = "puzzle_mentor_" + studentId;

  const closeModal = () => setModal(null);

  const socket = useChessSocket({
    student: studentId,
    mentor: mentorId,
    role: "student",
    serverUrl: environment.urls.chessServerURL,
    mode: "puzzle",
    onBoardStateChange: (newFEN) => setCurrentFEN(newFEN),
    onRoleAssigned: (r) => setStatus(r),
    onLastMove: (from, to) => {
      setHighlightSquares([from, to]);
      chessBoardRef.current?.highlightMove(from, to);
    },
  });

  useEffect(() => {
    SetPermissionLevel(cookies).then((uInfo) => {
      if (!uInfo?.error) setUsername(uInfo.username);
    });
  }, [cookies]);

  // Escalating difficulty based on streak
  const fetchSinglePuzzle = async (streakNumber: number) => {
    const minRating = 600 + (streakNumber * 50);
    const maxRating = minRating + 200; 

    try {
      const res = await fetch(`${environment.urls.middlewareURL}/puzzles/random?limit=1&minRating=${minRating}&maxRating=${maxRating}`);
      if (res.ok) {
        const data = await res.json();
        return data[0];
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const loadNextPuzzleInStreak = async (streakNumber: number) => {
    setShowHint(false); 
    setIsFailed(false); 
    
    const puzzle = await fetchSinglePuzzle(streakNumber);
    if (puzzle) {
      currentPuzzleRef.current = puzzle;
      moveListRef.current = puzzle.Moves.split(" ");
      
      const normalizedFen = normalizeFen(puzzle.FEN);
      const sideToMove = normalizedFen.split(" ")[1]; 
      const newPlayerColor = sideToMove === "w" ? "black" : "white";

      setPlayerColor(newPlayerColor);
      setCurrentFEN(normalizedFen);

      isPuzzleEndRef.current = false;
      setHighlightSquares([]);
      
      socket.setGameStateWithColor(normalizedFen, newPlayerColor, puzzle.Themes);
      chessBoardRef.current?.clearHighlights();
      
      setTimeout(playComputerMove, 500);
    } else {
      setModal({ type: "error", title: "Error", message: "Failed to load puzzle." });
    }
  };

  // Automatically start the first puzzle room when the socket connects!
  useEffect(() => {
    if (socket.connected && status === "" && !isInitialized && !isFailed) {
      socket.startNewPuzzle();
    }
  }, [socket.connected, status, isInitialized, isFailed, socket]);

  // Wait for the backend socket to be completely ready before loading the puzzle
  useEffect(() => {
    if (socket.connected && status === "host" && !isInitialized) {
      setIsInitialized(true);
      loadNextPuzzleInStreak(currentStreak);
    }
  }, [socket.connected, status, isInitialized, currentStreak, socket]);

  const handleStartStreak = () => {
    setCurrentStreak(0);
    setIsInitialized(false);
    setIsFailed(false);
    
    // Tell the backend we are starting a fresh room!
    if (socket.connected) {
      socket.startNewPuzzle(); 
    }
  };

  const saveHighScore = async (score: number) => {
    if (!username || score === 0) return;
    try {
      await fetch(`${environment.urls.middlewareURL}/user/updateHighScore`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${cookies.login}`,
        },
        body: JSON.stringify({ streakScore: score }),
      });
    } catch (err) {
      console.error("Failed to save high score", err);
    }
  };

  const playComputerMove = () => {
    if (moveListRef.current.length === 0) return;
    const computerMoveStr = moveListRef.current.shift();
    if (!computerMoveStr) return;

    const computerMove: Move = {
      from: computerMoveStr.substring(0, 2),
      to: computerMoveStr.substring(2, 4),
      promotion: computerMoveStr.length > 4 ? (computerMoveStr[4] as any) : undefined,
    };

    socket.sendMove(computerMove);
    socket.sendLastMove(computerMove.from, computerMove.to);
    setHighlightSquares([computerMove.from, computerMove.to]);
    chessBoardRef.current?.highlightMove(computerMove.from, computerMove.to);
  };

  const handlePlayerMove = (move: Move) => {
    if (isPuzzleEndRef.current || moveListRef.current.length === 0) return;

    const playerAttemptedMove = `${move.from}${move.to}${move.promotion || ""}`;
    const expectedPlayerMove = moveListRef.current[0];

    const isCorrect =
      playerAttemptedMove === expectedPlayerMove ||
      playerAttemptedMove === expectedPlayerMove.substring(0, 4);

    if (isCorrect) {
      moveListRef.current.shift();
      setHighlightSquares([move.from, move.to]);
      const newFen = chessBoardRef.current?.getFen();
      if (newFen) setCurrentFEN(newFen);
      
      move.username = username;
      move.credentials = cookies.login;
      socket.sendMove(move);
      socket.sendLastMove(move.from, move.to);

      if (moveListRef.current.length === 0) {
        // Increases Streak
        isPuzzleEndRef.current = true;
        const newStreak = currentStreak + 1;
        setCurrentStreak(newStreak);
        
        setTimeout(() => {
          setIsInitialized(false); 
          socket.startNewPuzzle(); 
        }, 800); 
      } else {
        setTimeout(playComputerMove, 300);
      }
    } else {
      // STREAK ENDS!
      isPuzzleEndRef.current = true; // Lock the board
      setIsFailed(true);             // Trigger the UI Restart Button
      setShowHint(true);             // Auto-show the hint text
      saveHighScore(currentStreak);

      // Snap the incorrectly placed piece back to where it was so they can study the board!
      chessBoardRef.current?.undo();

      setModal({
        type: "error",
        title: "Streak Broken!",
        message: `Incorrect move! Your final streak was ${currentStreak}.`,
        onConfirm: () => closeModal(),
      });
    }
  };

  return (
    <div className="flex flex-col items-center mt-12 w-full max-w-4xl mx-auto px-4">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-extrabold text-dark uppercase tracking-widest">Puzzle Streak</h1>
        <p className="text-gray mt-2 text-lg">Solve as many puzzles in a row as you can without making a mistake.</p>
        
        <div className="mt-4 text-3xl font-bold text-primary transition-all">
          🔥 Streak: {currentStreak}
        </div>
      </div>

      {/* The board renders immediately without a starting button block! */}
      <div className="flex flex-col items-center w-full max-w-[600px]">
        {/* THE CHESS BOARD */}
        <div className="w-full aspect-square">
          <ChessBoard
            mode="puzzle"
            ref={chessBoardRef}
            fen={currentFEN}
            orientation={playerColor}
            highlightSquares={highlightSquares}
            onMove={handlePlayerMove}
            disabled={isPuzzleEndRef.current || !socket.connected}
          />
        </div>

        {/* THE POST-PUZZLE ACTIONS / HINT SYSTEM */}
        <div className="mt-6 flex flex-col items-center gap-4 w-full">
          
          {isFailed ? (
            <button
              className="btn-green text-xl px-12 py-3 shadow-lg hover:scale-105 transition-transform animate-fade-in"
              onClick={handleStartStreak}
            >
              Start New Streak
            </button>
          ) : (
            <button
              className="btn-green w-full md:w-auto px-8 py-3"
              onClick={() => setShowHint(!showHint)}
              disabled={!socket.connected}
            >
              {showHint ? "Hide Hint" : "Show Hint"}
            </button>
          )}

          {showHint && currentPuzzleRef.current && (
            <div className="w-full p-6 bg-light rounded-lg shadow border-2 border-primary text-base leading-relaxed text-dark text-center animate-fade-in">
              <div className="mb-2">
                <span className="font-bold text-primary">Puzzle Rating:</span> {currentPuzzleRef.current.Rating || "N/A"}
              </div>
              <div>
                <span className="font-bold text-primary">Themes:</span> {currentPuzzleRef.current.Themes ? currentPuzzleRef.current.Themes.split(" ").join(", ") : "Mixed"}
              </div>
            </div>
          )}
        </div>
      </div>

      {modal && <Modal {...modal} onClose={closeModal} />}
    </div>
  );
};

export default PuzzleStreak;
