import React, { useEffect, useState, useRef, useCallback } from 'react';
// chess.js can export either a default/module object or a named Chess export depending on build.
// import it first (satisfies import/first rule) then normalize below.
import { Chess as ChessClass } from 'chess.js';
import { io } from 'socket.io-client';
import { useLocation } from 'react-router';
import { Move } from '../../core/types/chess';
import ChessBoard, { ChessBoardRef } from '../../components/ChessBoard/ChessBoard';
import { environment } from "../../environments";
import { cn } from '../../core/utils/cn';
import StockfishTutor from './StockfishTutor';

// chess.js exposes a named export `Chess`; normalize to a local constructor variable.
const Chess: any = ChessClass;

type Difficulty = 1 | 5 | 10 | 15 | 20;

// SVG Icons matching user mock-up
const CpuIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A991E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <rect x="9" y="9" width="6" height="6" />
    <line x1="9" y1="1" x2="9" y2="4" />
    <line x1="15" y1="1" x2="15" y2="4" />
    <line x1="9" y1="20" x2="9" y2="23" />
    <line x1="15" y1="20" x2="15" y2="23" />
    <line x1="20" y1="9" x2="23" y2="9" />
    <line x1="20" y1="15" x2="23" y2="15" />
    <line x1="1" y1="9" x2="4" y2="9" />
    <line x1="1" y1="15" x2="4" y2="15" />
  </svg>
);

const UserIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#5A991E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const StarIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F2C94C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

const GearIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4A5568" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

const RibbonIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#7FCC26" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
  </svg>
);

const UndoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6" />
    <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
  </svg>
);

const ResetIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
);

const PlayIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const SwapIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 3 21 3 21 8" />
    <line x1="4" y1="20" x2="21" y2="3" />
    <polyline points="8 21 3 21 3 16" />
  </svg>
);

const PlayComputer: React.FC = () => {
  const chessBoardRef = useRef<ChessBoardRef>(null);
  const socketRef = useRef<any>(null);
  const gameRef = useRef<any>(new Chess());
  const playerColorRef = useRef<'white' | 'black'>('white');
  const sessionStartedRef = useRef<boolean>(false);
  const difficultyRef = useRef<Difficulty>(10);
  const movesContainerRef = useRef<HTMLDivElement>(null);

  const [fen, setFen] = useState<string>("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [playerColor, setPlayerColor] = useState<'white' | 'black'>('white');
  const [difficulty, setDifficulty] = useState<Difficulty>(10);
  const location = useLocation();
  const [isThinking, setIsThinking] = useState(false);
  const [connected, setConnected] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);
  const [fenHistory, setFenHistory] = useState<string[]>([gameRef.current.fen()]);
  const [uciHistoryArr, setUciHistoryArr] = useState<string[]>([]);
  const [showSettings, setShowSettings] = useState(true);
  const [showGameEndModal, setShowGameEndModal] = useState(false);
  const [gameEndMessage, setGameEndMessage] = useState('');
  // status text shown in the status bar (e.g. check, checkmate, draw messages)
  const [gameStatus, setGameStatus] = useState<string>('');
  const [tutorEnabled, setTutorEnabled] = useState<boolean>(true);
  const [tutorTrigger, setTutorTrigger] = useState<number>(0);
  const [tutorFenBefore, setTutorFenBefore] = useState<string | undefined>(undefined);
  const [tutorMoveUci, setTutorMoveUci] = useState<string | undefined>(undefined);
  const [tutorFenAfter, setTutorFenAfter] = useState<string | undefined>(undefined);


  // When the user clicks "Play" in the navbar while a game is active, reset to settings
  useEffect(() => {
    if (!sessionStartedRef.current) return;
    socketRef.current?.emit('end-session');
    gameRef.current.reset();
    setFen(gameRef.current.fen());
    setMoveHistory([]);
    setHighlightSquares([]);
    setIsThinking(false);
    if (chessBoardRef.current) chessBoardRef.current.reset();
    setShowSettings(true);
    setSessionStarted(false);
    sessionStartedRef.current = false;
  }, [location.key]);

  useEffect(() => { playerColorRef.current = playerColor; }, [playerColor]);
  useEffect(() => { sessionStartedRef.current = sessionStarted; }, [sessionStarted]);
  useEffect(() => { difficultyRef.current = difficulty; }, [difficulty]);
  useEffect(() => {
    if (movesContainerRef.current) {
      movesContainerRef.current.scrollTop = movesContainerRef.current.scrollHeight;
    }
  }, [moveHistory]);

  const requestComputerMove = useCallback((currentFen: string) => {
    if (!socketRef.current || !sessionStartedRef.current) return;
    setIsThinking(true);
    socketRef.current.emit('evaluate-fen', {
      fen: currentFen,
      move: '',
      level: difficultyRef.current,
    });
  }, []);

  useEffect(() => {
    const socket = io(environment.urls.stockfishServerURL, {
      transports: ['websocket'],
      reconnection: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => {
      setConnected(false);
      setSessionStarted(false);
      sessionStartedRef.current = false;
    });
    socket.on('session-started', ({ success }) => {
      setSessionStarted(true);
      sessionStartedRef.current = true;
      if (success && playerColorRef.current === 'black') {
        requestComputerMove(gameRef.current.fen());
      }
    });
    socket.on('session-error', ({ error }) => {
      console.error('Session error:', error);
      alert('Failed to start session: ' + error);
    });
    socket.on('evaluation-complete', ({ mode, move }) => {
      if (mode === 'move' && move) {
        try {
          const moveResult = gameRef.current.move(move);
          if (moveResult) {
            const updatedFen = gameRef.current.fen();
            setFen(updatedFen);
            setHighlightSquares([moveResult.from, moveResult.to]);
            setMoveHistory(prev => [...prev, `${moveResult.from} -> ${moveResult.to}`]);
            setFenHistory(prev => [...prev, updatedFen]);
            setUciHistoryArr(prev => [...prev, `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`]);
            if (chessBoardRef.current) {
              chessBoardRef.current.setPosition(updatedFen);
              chessBoardRef.current.highlightMove(moveResult.from, moveResult.to);
            }
            checkGameStatus();
            // Trigger tutor to analyze the player's move now that the computer has responded
            setTutorTrigger(t => t + 1);
          }
        } catch (err) {
          console.error('Failed to apply computer move:', err);
        }
        setIsThinking(false);
      }
    });
    socket.on('evaluation-error', ({ error }) => {
      console.error('Evaluation error:', error);
      setIsThinking(false);
      alert('Engine error: ' + error);
    });

    return () => { socket.disconnect(); };
  }, [requestComputerMove]);

  const startSession = useCallback(() => {
    if (!connected || !socketRef.current) {
      alert('Not connected to server');
      return;
    }
    socketRef.current.emit('start-session', {
      sessionType: 'player-vs-computer',
      fen: gameRef.current.fen(),
    });
    setShowSettings(false);
  }, [connected]);

  const handleMove = useCallback((move: Move) => {
    try {
      // capture fen before the move so the tutor can analyze the player's move
      const fenBefore = gameRef.current.fen();

      const moveResult = gameRef.current.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      if (!moveResult) return;

      const newFen = gameRef.current.fen();
      setFen(newFen);
      setHighlightSquares([move.from, move.to]);
      setMoveHistory(prev => [...prev, `${move.from} -> ${move.to}`]);
      setFenHistory(prev => [...prev, newFen]);
      setUciHistoryArr(prev => [...prev, `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`]);

      // set tutor context for this player move (but don't trigger analysis yet)
      const currentMoveUci = `${moveResult.from}${moveResult.to}${moveResult.promotion ?? ''}`;
      setTutorFenBefore(fenBefore);
      setTutorMoveUci(currentMoveUci);
      setTutorFenAfter(newFen);

      // Check if game ended
      if (checkGameStatus()) {
        // Trigger tutor immediately if the game ends because the computer won't make a move
        setTutorTrigger(t => t + 1);
        return;
      }

      if (socketRef.current) {
        socketRef.current.emit('update-fen', { fen: newFen });
        requestComputerMove(newFen);
      }
    } catch (error) {
      console.error('Error handling move:', error);
    }
  }, [requestComputerMove]);

  const checkGameStatus = useCallback((): boolean => {
    const game = gameRef.current;
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      setGameEndMessage(`Checkmate! ${winner} wins!`);
      setShowGameEndModal(true);
      return true;
    }
    if (game.isDraw() || game.isStalemate()) {
      setGameEndMessage(game.isStalemate() ? 'Stalemate! Draw!' : 'Game over: Draw!');
      setShowGameEndModal(true);
      return true;
    }
    if (game.isThreefoldRepetition()) {
      setGameEndMessage('Draw by threefold repetition!');
      setShowGameEndModal(true);
      return true;
    }
    if (game.isInsufficientMaterial()) {
      setGameEndMessage('Draw by insufficient material!');
      setShowGameEndModal(true);
      return true;
    }
    return false;
  }, []);

  const resetGame = useCallback(() => {
    gameRef.current.reset();
    const startFen = gameRef.current.fen();
    setFen(startFen);
    setMoveHistory([]);
    setHighlightSquares([]);
    setIsThinking(false);
    setTutorFenBefore(undefined);
    setTutorMoveUci(undefined);
    setFenHistory([startFen]);
    setUciHistoryArr([]);

    if (chessBoardRef.current) chessBoardRef.current.reset();
    if (socketRef.current && sessionStartedRef.current) {
      socketRef.current.emit('update-fen', { fen: startFen });
      if (playerColorRef.current === 'black') {
        setTimeout(() => requestComputerMove(startFen), 500);
      }
    }
  }, [requestComputerMove]);

  const newGame = useCallback(() => {
    if (socketRef.current && sessionStartedRef.current) {
      socketRef.current.emit('end-session');
    }
    resetGame();
    setShowSettings(true);
    setSessionStarted(false);
    sessionStartedRef.current = false;
    setTutorFenBefore(undefined);
    setTutorMoveUci(undefined);
  }, [resetGame]);

  const undoMove = useCallback(() => {
    if (moveHistory.length < 2) return;
    gameRef.current.undo();
    gameRef.current.undo();
    const newFen = gameRef.current.fen();
    setFen(newFen);
    setMoveHistory(prev => prev.slice(0, -2));
    setHighlightSquares([]);
    setGameStatus('');
    setTutorFenBefore(undefined);
    setTutorMoveUci(undefined);

    if (chessBoardRef.current) {
      chessBoardRef.current.setPosition(newFen);
    }

    // Update server
    if (socketRef.current) {
      socketRef.current.emit('update-fen', { fen: newFen });
    }
    try {
      setFenHistory(prev => prev.slice(0, -2));
      setUciHistoryArr(prev => prev.slice(0, -2));
    } catch (e) {}
  }, [moveHistory.length]);

  const gotoPly = useCallback((plyIndex: number) => {
    try {
      const targetFen = fenHistory[plyIndex + 1];
      const uci = uciHistoryArr[plyIndex];
      if (!targetFen) return;
      // Load the target FEN into the game engine so subsequent moves continue from here
      try {
        if (gameRef.current && typeof gameRef.current.load === 'function') {
          gameRef.current.load(targetFen);
        } else {
          // Some builds of chess.js may not expose a .load method on the instance; recreate the game from FEN
          try {
            // eslint-disable-next-line new-cap
            gameRef.current = new Chess(targetFen);
          } catch (e) {
            // As a last resort, leave the engine as-is; the board UI will still reflect the chosen FEN
          }
        }
      } catch (e) { /* ignore load errors */ }

      setFen(targetFen);
      if (uci && uci.length >= 4) {
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        setHighlightSquares([from, to]);
        if (chessBoardRef.current) {
          chessBoardRef.current.setPosition(targetFen);
          chessBoardRef.current.highlightMove(from, to);
        }
      } else {
        setHighlightSquares([]);
        if (chessBoardRef.current) chessBoardRef.current.setPosition(targetFen);
      }
      // Trim histories so the app state reflects continuing from this ply
      try {
        setFenHistory(prev => prev.slice(0, plyIndex + 2)); // keep starting fen + positions up to target
        setUciHistoryArr(prev => prev.slice(0, plyIndex + 1)); // keep UCIs up to target
        setMoveHistory(prev => prev.slice(0, plyIndex + 1));
      } catch (e) {}

      const fenBefore = fenHistory[plyIndex];
      setTutorFenBefore(fenBefore);
      setTutorMoveUci(uci);
      setTutorTrigger(t => t + 1);

      // Notify server so remote engine state can be updated to match this new position
      try {
        if (socketRef.current) socketRef.current.emit('update-fen', { fen: targetFen });
      } catch (e) {}
    } catch (e) { console.error('gotoPly failed', e); }
  }, [fenHistory, uciHistoryArr]);

  const difficulties: { label: string; value: Difficulty }[] = [
    { label: 'Easy', value: 1 },
    { label: 'Medium', value: 5 },
    { label: 'Hard', value: 10 },
    { label: 'Expert', value: 15 },
    { label: 'Master', value: 20 },
  ];

  return (
    <div className="flex min-h-[calc(100vh-100px)] w-full flex-col items-center justify-center bg-[#e2f0d9] px-4 py-10 font-sans box-border">
      {showSettings ? (
        <div className="w-full max-w-[500px] rounded-[24px] border-[3px] border-[#1F1F1F] bg-white p-10 shadow-[6px_6px_0_rgba(31,31,31,0.15)]">
          <h2 className="mb-8 text-center text-[24px] font-extrabold text-[#1F1F1F]">Game Settings</h2>

          <div className="mb-6 w-full">
            <label className="mb-3 block text-[16px] font-bold uppercase tracking-[0.5px] text-slate-600">Play as</label>
            <div className="grid w-full grid-cols-2 gap-4">
              <button
                className={cn('rounded-2xl border-[3px] border-[#1F1F1F] outline outline-[3px] outline-[#1F1F1F] bg-white px-0 py-5 text-lg font-extrabold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5', playerColor === 'white' && 'scale-[1.02] border-[#7FCC26] outline-[#7FCC26]')}
                onClick={() => setPlayerColor('white')}
                aria-pressed={playerColor === 'white'}
              >
                White
              </button>
              <button
                className={cn('rounded-2xl border-[3px] border-[#1F1F1F] outline outline-[3px] outline-[#1F1F1F] bg-[#1F1F1F] px-0 py-5 text-lg font-extrabold text-white transition-all duration-200 hover:-translate-y-0.5', playerColor === 'black' && 'scale-[1.02] border-[#7FCC26] outline-[#7FCC26]')}
                onClick={() => setPlayerColor('black')}
                aria-pressed={playerColor === 'black'}
              >
                Black
              </button>
            </div>
          </div>

          <div className="mb-6 w-full">
            <label className="mb-3 block text-[16px] font-bold uppercase tracking-[0.5px] text-slate-600">Difficulty</label>
            <div className="grid w-full grid-cols-3 gap-3">
              {difficulties.slice(0, 3).map(({ label, value }) => (
                <button
                  key={value}
                  className={cn('rounded-2xl border-[2px] border-[#1F1F1F] outline outline-2 outline-[#1F1F1F] bg-white px-0 py-3 text-sm font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5', difficulty === value && 'bg-[#7FCC26]')}
                  onClick={() => setDifficulty(value)}
                  aria-pressed={difficulty === value}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="mt-3 grid w-full grid-cols-2 gap-3">
              {difficulties.slice(3).map(({ label, value }) => (
                <button
                  key={value}
                  className={cn('rounded-2xl border-[2px] border-[#1F1F1F] outline outline-2 outline-[#1F1F1F] bg-white px-0 py-3 text-sm font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5', difficulty === value && 'bg-[#7FCC26]')}
                  onClick={() => setDifficulty(value)}
                  aria-pressed={difficulty === value}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            className="mt-4 w-full rounded-2xl border-[3px] border-[#1F1F1F] bg-[#7FCC26] px-0 py-4 text-[20px] font-extrabold text-[#1F1F1F] shadow-[4px_4px_0_#1F1F1F] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_#1F1F1F] active:translate-y-0 active:shadow-[2px_2px_0_#1F1F1F] disabled:cursor-not-allowed disabled:opacity-50"
            onClick={startSession}
            disabled={!connected}
          >
            {connected ? 'Start Game' : 'Connecting...'}
          </button>
        </div>
      ) : (
        <div className="flex w-full max-w-[1300px] gap-6 rounded-[24px] border-2 border-[#1F1F1F] bg-white p-6 shadow-[10px_10px_0_#7FCC26] box-border max-[840px]:flex-col max-[840px]:items-center">
          <div className="flex w-full min-w-0 flex-1 flex-col gap-4">
            <div className="flex w-full items-center justify-between rounded-2xl border-2 border-[#1F1F1F] bg-white px-4 py-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#E5F3D2]">
                  <CpuIcon />
                </div>
                <div className="flex flex-col">
                  <div className="text-[15px] font-extrabold text-[#1F1F1F]">Stockfish Computer</div>
                  <div className="text-[12px] font-semibold text-slate-600">Level {difficulty} ({difficulty === 1 ? 'Easy' : difficulty === 5 ? 'Medium' : difficulty === 10 ? 'Hard' : difficulty === 15 ? 'Expert' : 'Master'})</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-[#E5F3D2] px-3.5 py-1.5 text-[13px] font-extrabold text-[#6EB21E]">
                <span className="h-2 w-2 rounded-full bg-[#7FCC26]" />
                Ready
              </div>
            </div>

            <div className="w-full">
              <div className="mb-2 flex justify-end">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-white px-2.5 py-1 text-[13px] font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={tutorEnabled}
                    onChange={(e) => setTutorEnabled(e.target.checked)}
                    className="h-3.5 w-3.5 accent-[#7FCC26]"
                  />
                  <span>Show AI Tutor</span>
                </label>
              </div>

              <StockfishTutor
                enabled={tutorEnabled}
                trigger={tutorTrigger}
                fenBefore={tutorFenBefore}
                fenAfter={tutorFenAfter || fen}
                moveUci={tutorMoveUci}
                uciHistory={uciHistoryArr.join(' ')}
                onRequestGotoFen={(fen: string, highlights?: string[] | null) => {
                  try {
                    setFen(fen);
                    setHighlightSquares(highlights || []);
                    if (chessBoardRef.current) {
                      chessBoardRef.current.setPosition(fen);
                      if (highlights && highlights.length === 2) chessBoardRef.current.highlightMove(highlights[0], highlights[1]);
                    }
                  } catch (e) {}
                }}
              />
            </div>

            <div className="w-full rounded-[20px] border-2 border-[#1F1F1F] bg-white p-3">
              <div className="mb-2 w-full">
                {gameStatus && (
                  <div className="w-full rounded-lg border-[1.5px] border-[#FC8181] bg-[#FFF5F5] px-2 py-2 text-center text-[14px] font-bold text-[#C53030]">
                    {gameStatus}
                  </div>
                )}
              </div>

              <div className="flex w-full justify-center">
                <ChessBoard
                  mode="engine"
                  ref={chessBoardRef}
                  fen={fen}
                  orientation={playerColor}
                  highlightSquares={highlightSquares}
                  onMove={handleMove}
                  disabled={isThinking || gameStatus.includes('wins') || gameStatus === 'Draw!'}
                />
              </div>
            </div>

            <div className="flex w-full items-center justify-between rounded-2xl border-2 border-[#1F1F1F] bg-white px-4 py-3">
              <div className="flex items-center gap-3.5">
                <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[#E5F3D2]">
                  <UserIcon />
                </div>
                <div className="flex flex-col">
                  <div className="text-[15px] font-extrabold text-[#1F1F1F]">You</div>
                  <div className="text-[12px] font-semibold text-slate-600">Playing as {playerColor.charAt(0).toUpperCase() + playerColor.slice(1)}</div>
                </div>
              </div>
              {playerColor === (gameRef.current.turn() === 'w' ? 'white' : 'black') ? (
                <div className="rounded-full bg-[#7FCC26] px-3.5 py-1.5 text-[13px] font-extrabold text-[#1F1F1F]">Your Turn</div>
              ) : (
                <div className="rounded-full bg-slate-200 px-3.5 py-1.5 text-[13px] font-bold text-slate-500">Opponent Thinking</div>
              )}
            </div>
          </div>

          <div className="flex w-[330px] shrink-0 flex-col gap-4 max-[840px]:w-full">
            <div className="w-full rounded-[20px] border-2 border-[#1F1F1F] bg-white p-5">
              <div className="mb-5 flex items-center gap-2 text-[16px] font-extrabold text-[#1F1F1F]">
                <StarIcon />
                <span>Game Info</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex min-h-[80px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-4">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-normal text-slate-400">Active Turn</div>
                  <div className="flex items-center gap-2 text-[15px] font-extrabold text-[#1F1F1F]">
                    <span className={cn('inline-block h-3 w-3 rounded-full border-[1.5px] border-[#1F1F1F]', gameRef.current.turn() === 'w' ? 'bg-white' : 'bg-[#1F1F1F]')} />
                    {gameRef.current.turn() === 'w' ? 'White' : 'Black'}
                  </div>
                </div>
                <div className="flex min-h-[80px] flex-col items-center justify-center rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-4">
                  <div className="mb-2 text-[11px] font-extrabold uppercase tracking-normal text-slate-400">Total Moves</div>
                  <div className="text-[24px] font-black text-[#1F1F1F]">{moveHistory.length}</div>
                </div>
              </div>
            </div>

            <div className="w-full rounded-[20px] border-2 border-[#1F1F1F] bg-white p-5">
              <div className="mb-5 flex items-center gap-2 text-[16px] font-extrabold text-[#1F1F1F]">
                <GearIcon />
                <span>Actions</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-3.5 text-[13px] font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1F1F1F] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={undoMove}
                  disabled={moveHistory.length < 2 || isThinking}
                >
                  <UndoIcon />
                  <span>Undo</span>
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-3.5 text-[13px] font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1F1F1F] disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={resetGame}
                  disabled={isThinking}
                >
                  <ResetIcon />
                  <span>Reset</span>
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-3.5 text-[13px] font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1F1F1F]"
                  onClick={newGame}
                >
                  <PlayIcon />
                  <span>New Game</span>
                </button>
                <button
                  className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-[#F9FAF7] px-3 py-3.5 text-[13px] font-bold text-[#1F1F1F] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#1F1F1F]"
                  onClick={() => chessBoardRef.current?.flip()}
                >
                  <SwapIcon />
                  <span>Flip Board</span>
                </button>
              </div>
            </div>

            <div className="w-full rounded-[20px] border-2 border-[#1F1F1F] bg-white p-5">
              <div className="mb-5 flex items-center gap-2 text-[16px] font-extrabold text-[#1F1F1F]">
                <RibbonIcon />
                <span>Move History</span>
              </div>
              <div ref={movesContainerRef} className="flex max-h-[200px] flex-col gap-2 overflow-y-auto pr-1.5">
                {moveHistory.reduce((acc: JSX.Element[], move, idx) => {
                  if (idx % 2 === 0) {
                    const moveNumber = Math.floor(idx / 2) + 1;
                    acc.push(
                      <div key={idx} className="grid grid-cols-[32px_1fr_1fr] items-center gap-2.5">
                        <span className="text-right text-[13px] font-extrabold text-[#7FCC26]">{moveNumber}.</span>
                        <button
                          onClick={() => {
                            const hasOpponent = moveHistory.length > idx + 1;
                            const target = hasOpponent ? idx + 1 : idx;
                            gotoPly(target);
                          }}
                          className="rounded-lg border border-[#1F1F1F] bg-white px-3 py-1.5 font-mono text-[13px] font-bold text-[#1F1F1F] transition-all duration-150 hover:-translate-y-0.5 hover:bg-slate-100"
                        >
                          {move}
                        </button>
                        {moveHistory[idx + 1] ? (
                          <button
                            onClick={() => gotoPly(idx + 1)}
                            className="rounded-lg border border-[#1F1F1F] bg-[#1F1F1F] px-3 py-1.5 font-mono text-[13px] font-bold text-white transition-all duration-150 hover:-translate-y-0.5 hover:bg-neutral-800"
                          >
                            {moveHistory[idx + 1]}
                          </button>
                        ) : (
                          <span className="h-[31px]" />
                        )}
                      </div>
                    );
                  }
                  return acc;
                }, [])}
              </div>
            </div>
          </div>
        </div>
      )}

      {showGameEndModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1F1F1F]/40 p-4 backdrop-blur-sm" onClick={() => setShowGameEndModal(false)}>
          <div className="w-full max-w-[380px] rounded-[24px] border-[3px] border-[#1F1F1F] bg-white p-10 text-center shadow-[8px_8px_0_#1F1F1F] animate-modal-in" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-6 text-[24px] font-black text-[#1F1F1F]">{gameEndMessage}</h2>
            <div className="flex gap-3">
              <button className="flex-1 rounded-xl border-2 border-[#1F1F1F] bg-[#7FCC26] px-0 py-3 font-extrabold text-[#1F1F1F] shadow-[2px_2px_0_#1F1F1F] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#1F1F1F] active:translate-y-0 active:shadow-[1px_1px_0_#1F1F1F]" onClick={() => { setShowGameEndModal(false); newGame(); }}>New Game</button>
              <button className="flex-1 rounded-xl border-2 border-slate-200 bg-white px-0 py-3 font-bold text-slate-600 transition-all duration-150 hover:border-[#1F1F1F] hover:text-[#1F1F1F]" onClick={() => setShowGameEndModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayComputer;
