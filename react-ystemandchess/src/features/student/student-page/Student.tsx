import React, { useState, useRef } from "react";
import "./Student.scss";
import ChessBoard, { ChessBoardRef } from "../../../components/ChessBoard/ChessBoard";
import { useChessSocket } from "../../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket";
import { environment } from "../../../environments";
import { Move } from "../../../core/types/chess";
import { v4 as uuidv4 } from "uuid";
import ChatWidget from '../../../components/ChatWidget/ChatWidget';

const Student = () => {
  const chessBoardRef = useRef<ChessBoardRef>(null);
  const [movesAhead, setMovesAhead] = useState(5);
  const [currentFEN, setCurrentFEN] = useState<string>(
    "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
  );
  const [studentId] = useState(uuidv4());
  const [mentorId] = useState("computer");

  // Socket connection for multiplayer
  const socket = useChessSocket({
    student: studentId,
    mentor: mentorId,
    role: "student",
    serverUrl: environment.urls.chessServerURL,
    mode: "regular",

    onBoardStateChange: (newFEN) => {
      setCurrentFEN(newFEN);
    },

    onLastMove: (from, to) => {
      if (chessBoardRef.current) {
        chessBoardRef.current.highlightMove(from, to);
      }
    },

    onError: (msg) => {
      console.error("Chess error:", msg);
      alert(`Error: ${msg}`);
    },
  });

  const handleMove = (move: Move) => {
    console.log("Move made:", move);
    socket.sendMove(move);
  };

  const handleNewGame = () => {
    socket.startNewGame();
    // Set local state immediately for fast visual feedback (optimistic UI)
    setCurrentFEN("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  };

  const handlePlayComputer = () => {
    // TODO: Integrate with Stockfish server
    alert(`Computer mode with ${movesAhead} moves ahead - Coming soon!`);
  };

  const handleUndo = () => {
    socket.undo();
  };

  return (
    <div className="chess-body">
      <br />
      <br />
      <br />

      <ChessBoard
        ref={chessBoardRef}
        fen={currentFEN}
        onMove={handleMove}
        orientation="white"
        disabled={!socket.connected}
      />

      <br />
      <br />
      <br />

      <button onClick={handleNewGame} disabled={!socket.connected}>New Game</button>
      <button onClick={handlePlayComputer} disabled={!socket.connected}>Play with a computer</button>
      <button onClick={handleUndo} disabled={!socket.connected}>Undo</button>

      <br />
      <p>
        The computer will think
        <input
          type="number"
          min="1"
          step="1"
          max="30"
          value={movesAhead}
          onChange={(e) => setMovesAhead(parseInt(e.target.value) || 5)}
          disabled={!socket.connected}
        />
        moves ahead of you
      </p>
      <br />

      {!socket.connected && (
        <p style={{ color: "red" }}>Disconnected from server</p>
      )}
      <ChatWidget />
    </div>
  );
};

export default Student;