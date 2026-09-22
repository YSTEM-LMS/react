import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { useCookies } from 'react-cookie';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import ChessBoard, { ChessBoardRef } from '../../../../components/ChessBoard/ChessBoard';
import PromotionPopup from '../../lessons-main/PromotionPopup';
import MoveTracker from '../move-tracker/MoveTracker';
import { environment } from "../../../../environments";

import { Move } from "../../../../core/types/chess";
import { EvaluationContext, Goal } from '../../../../core/types/goals';
import { evaluateGoal } from '../../../../core/utils/goalEvaluator';
import { EventLog, createMoveEvent } from '../../../../core/utils/eventLogger';
import { getConstrainedMove } from '../../../../core/utils/opponentConstraints';

import { useChessGameLogic } from './hooks/useChessGameLogic';
import { useLessonManager } from './hooks/useLessonManager';
import { useChessSocket } from './hooks/useChessSocket';
import { useTimeTracking } from './hooks/useTimeTracking';

import { ReactComponent as RedoIcon } from '../../../../assets/images/icons/icon_redo.svg';
import { ReactComponent as BackIcon } from '../../../../assets/images/icons/icon_back.svg';
import { ReactComponent as BackIconInactive } from '../../../../assets/images/icons/icon_back_inactive.svg';
import { ReactComponent as NextIcon } from '../../../../assets/images/icons/icon_next.svg';
import { ReactComponent as NextIconInactive } from '../../../../assets/images/icons/icon_next_inactive.svg';

import pageStyles from './Lesson-overlay.module.scss';
import profileStyles from './Lesson-overlay-profile.module.scss';


type LessonOverlayProps = {
  propPieceName?: any;
  propLessonNumber?: any;
  navigateFunc?: any;
  styleType?: any;
  onChessMove?: (fen: string) => void;
  onChessReset?: (fen: string) => void;
};

interface SolutionMove {
  san: string;
  isPlayerMove: boolean;
}

function parsePGNSolution(pgn: string, fenTurn: 'white' | 'black', playerColor: 'white' | 'black'): SolutionMove[] {
  if (!pgn) return [];

  // Remove move numbers and clean up
  const cleanPgn = pgn.replace(/\d+\./g, '').trim();
  const moves = cleanPgn.split(/\s+/).filter(m => m.length > 0);
  const firstMoveIsPlayer = fenTurn === playerColor;

  return moves.map((san, index) => ({
    san,
    isPlayerMove: index % 2 === 0 ? firstMoveIsPlayer : !firstMoveIsPlayer
  }));
}

function sanToMove(san: string, game: Chess): Move | null {
  try {
    const move = game.move(san);
    if (!move) return null;

    game.undo(); // Undo to keep game state unchanged

    return {
      from: move.from,
      to: move.to,
      promotion: move.promotion
    };
  } catch (e) {
    return null;
  }
}

function movesMatch(move1: Move, move2: Move): boolean {
  return move1.from === move2.from && move1.to === move2.to && (move1.promotion || '') === (move2.promotion || '');
}

const LessonOverlay: React.FC<LessonOverlayProps> = ({
  propPieceName = null,
  propLessonNumber = null,
  navigateFunc = null,
  styleType = "page",
  onChessMove,
  onChessReset,
}) => {
  const styles = styleType === 'profile' ? profileStyles : pageStyles;
  const navigate = useNavigate();
  const location = useLocation();
  const [cookies] = useCookies(['login']);

  const chessBoardRef = useRef<ChessBoardRef>(null);

  // Lesson information
  const [piece, setPiece] = useState(propPieceName || location.state?.piece || "");
  const [initialLessonNum] = useState(propLessonNumber ?? location.state?.lessonNum ?? 0);
  const [currentFEN, setCurrentFEN] = useState<string>("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [name, setName] = useState("");
  const [info, setInfo] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isInfoOnly, setIsInfoOnly] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Move tracking
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [highlightSquares, setHighlightSquares] = useState<string[]>([]);

  // Puzzle/Solution tracking
  const [solutionMoves, setSolutionMoves] = useState<SolutionMove[]>([]);
  const [currentSolutionIndex, setCurrentSolutionIndex] = useState(0);
  const [isPuzzleMode, setIsPuzzleMode] = useState(false);

  // Popups
  const [showVPopup, setShowVPopup] = useState(false);
  const [showXPopup, setShowXPopup] = useState(false);
  const [popupMessage, setPopupMessage] = useState("Game Over!")
  const [ShowError, setShowError] = useState(false);
  const [showLPopup, setShowLPopup] = useState(true);
  const [showInstruction, setShowInstruction] = useState(false);
  const [allLessonsDone, setAllLessonsDone] = useState(false);

  // Promotion
  const [isPromoting, setIsPromoting] = useState(false);
  const [promotionSource, setPromotionSource] = useState("");
  const [promotionTarget, setPromotionTarget] = useState("");

  const [hidePieces, setHidePieces] = useState(true);

  // Refs for lesson data
  const lessonStartFENRef = useRef<string>("");
  const playerColorRef = useRef<'white' | 'black'>('white');
  const isInitializedRef = useRef<boolean>(false);
  const gameRef = useRef<Chess>(new Chess());

  // Stockfish socket for free-play mode
  const stockfishSocketRef = useRef<any>(null);
  const [stockfishConnected, setStockfishConnected] = useState(false);
  const [stockfishSessionStarted, setStockfishSessionStarted] = useState(false);

  const eventLogRef = useRef<EventLog>(new EventLog());
  const [lessonGoal, setLessonGoal] = useState<Goal | null>(null);
  const xPopupShouldResetRef = useRef(true);
  const [isNavigating, setIsNavigating] = useState(false);

  // Initialize socket
  const socket = useChessSocket({
    student: styleType === 'profile' ? cookies.login?.studentId : "guest_student",
    mentor: "mentor_" + piece,
    role: 'student',
    serverUrl: environment.urls.chessServerURL,
    mode: 'lesson',

    onBoardStateChange: (newFEN, color) => {
      try {
        gameRef.current.load(newFEN);
        setCurrentFEN(newFEN);
        if (color) setBoardOrientation(color);
        if (onChessMove) onChessMove(newFEN);
      } catch (e) {
        console.error("Invalid FEN received", e);
      }
    },

    onLastMove: (from, to) => {
      setHighlightSquares([from, to]);
      if (chessBoardRef.current) {
        chessBoardRef.current.highlightMove(from, to);
      }
    },

    onColorAssigned: (color) => {
      setBoardOrientation(color);
      if (chessBoardRef.current) {
        chessBoardRef.current.setOrientation(color);
      }
    },

    onReset: () => {
      handleReset();
    },

    onError: (msg) => {
      console.error("Socket error:", msg);
      setShowError(true);
    },
  });

  const {
    lessonData,
    lessonNum,
    completedNum,
    totalLessons,
    refreshProgress,
    goToLesson,
    prevLesson: managerPrevLesson,
    updateCompletion,
    setLessonNum,
  } = useLessonManager(piece, cookies, initialLessonNum);

  const {
    moves,
    processMove,
    resetLesson,
    prevFenRef,
    currentFenRef,
  } = useChessGameLogic();

  useTimeTracking(piece, cookies);

  // Initialize Stockfish socket for free-play mode
  useEffect(() => {
    const stockfishSocket = io(environment.urls.stockfishServerURL, {
      transports: ['websocket'],
      reconnection: true,
    });

    stockfishSocketRef.current = stockfishSocket;

    stockfishSocket.on('connect', () => {
      setStockfishConnected(true);

      // Start session immediately after connection for free-play lessons
      if (!isPuzzleMode && lessonGoal && lessonStartFENRef.current) {
        console.log('[Stockfish] Starting session immediately after connect');
        stockfishSocket.emit('start-session', {
          sessionType: 'player-vs-computer',
          fen: lessonStartFENRef.current,
        });
      }
    });

    stockfishSocket.on('disconnect', () => {
      setStockfishConnected(false);
      setStockfishSessionStarted(false);
    });

    stockfishSocket.on('session-started', ({ success }: any) => {
      console.log('[Stockfish] Session started event received:', success);
      setStockfishSessionStarted(true);
    });

    stockfishSocket.on('session-error', ({ error }: any) => {
      console.error('[Stockfish] Session error event received:', error);
      setStockfishSessionStarted(false);
    });

    stockfishSocket.on('evaluation-complete', ({ mode, move }: any) => {
      if (mode === 'move' && move) {
        handleStockfishMove(move);
      }
    });

    stockfishSocket.on('evaluation-error', ({ error }: any) => {
      console.error('Stockfish evaluation error:', error);
    });

    return () => {
      if (stockfishSocket.connected) {
        stockfishSocket.emit('end-session');
      }
      stockfishSocket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (
      !isPuzzleMode &&
      lessonGoal &&
      stockfishConnected &&
      !stockfishSessionStarted &&
      stockfishSocketRef.current &&
      lessonStartFENRef.current
    ) {
      console.log('[Stockfish] Starting session after lesson data available');
      stockfishSocketRef.current.emit('start-session', {
        sessionType: 'player-vs-computer',
        fen: lessonStartFENRef.current,
      });
    }
  }, [lessonGoal, stockfishConnected, stockfishSessionStarted, isPuzzleMode]);


  const handleStockfishMove = useCallback((move: string) => {
    try {
      const prevFen = gameRef.current.fen();
      const moveResult = gameRef.current.move(move);

      if (moveResult) {
        const newFen = gameRef.current.fen();

        // LOG OPPONENT MOVE EVENT
        const event = createMoveEvent(moveResult, newFen, false); // false = opponent move
        eventLogRef.current.addMove(event);

        prevFenRef.current = prevFen;
        currentFenRef.current = newFen;
        setCurrentFEN(newFen);
        processMove();
        setHighlightSquares([moveResult.from, moveResult.to]);

        if (chessBoardRef.current) {
          chessBoardRef.current.highlightMove(moveResult.from, moveResult.to);
        }

        if (onChessMove) onChessMove(newFen);

        // Check if opponent promoted when that's a declared fail condition
        if (moveResult.promotion && lessonData?.failConditions?.some(c => c.type === 'OPPONENT_PROMOTION')) {
          setPopupMessage("The pawn promoted! Try again.");
          setShowXPopup(true);
          return;
        }

        // Check if student lost after computer's move
        if (gameRef.current.isCheckmate() || gameRef.current.isStalemate()) {
          const turn = gameRef.current.turn();
          const playerLost = (playerColorRef.current === 'white' && turn === 'w') ||
            (playerColorRef.current === 'black' && turn === 'b');

          if (playerLost) {
            setPopupMessage("Game Over!");
            xPopupShouldResetRef.current = true;
            setShowXPopup(true);
          }
        }
      }
    } catch (error) {
      console.error('Error applying Stockfish move:', error);
    }
  }, [onChessMove, lessonData]);


  // Fallback: Get random legal move
  const getRandomLegalMove = useCallback((fen: string) => {
    const tempGame = new Chess(fen);
    const moves = tempGame.moves({ verbose: true });

    if (moves.length === 0) return null;

    const randomMove = moves[Math.floor(Math.random() * moves.length)];
    return {
      from: randomMove.from,
      to: randomMove.to,
      promotion: randomMove.promotion
    };
  }, []);


  const requestStockfishMove = useCallback((fen: string, depth: number = 5) => {
    console.log('[Stockfish] requestStockfishMove called');

    // 1. CONSTRAINT-BASED (for free-play lessons with constraints)
    if (lessonData?.opponentConstraints && lessonData.opponentConstraints.length > 0) {
      console.log('[Opponent] Using constraint-based move');
      const constrainedMove = getConstrainedMove(fen, lessonData.opponentConstraints);
      if (constrainedMove) {
        setTimeout(() => {
          handleStockfishMove(`${constrainedMove.from}${constrainedMove.to}${constrainedMove.promotion || ''}`);
        }, 300);
      }
      return;
    }

    // 2. STOCKFISH (for tactical lessons or advanced goals)
    if (stockfishSocketRef.current && stockfishConnected && stockfishSessionStarted) {
      console.log('[Opponent] Using Stockfish engine at depth:', depth);
      stockfishSocketRef.current.emit('evaluate-fen', {
        fen,
        move: '',
        level: depth,
      });
      return;
    }

    // 3. FALLBACK (if Stockfish not ready)
    console.warn('[Opponent] Stockfish not ready, using random move');
    const randomMove = getRandomLegalMove(fen);
    if (randomMove) {
      setTimeout(() => {
        handleStockfishMove(`${randomMove.from}${randomMove.to}${randomMove.promotion || ''}`);
      }, 300);
    }
  }, [lessonData, stockfishConnected, stockfishSessionStarted, handleStockfishMove, getRandomLegalMove]);

  // Update piece from props
  useEffect(() => {
    if (propPieceName) setPiece(propPieceName);
  }, [propPieceName]);

  // Initialize lesson progress
  useEffect(() => {
    setShowLPopup(true);
    refreshProgress(initialLessonNum).finally(() => {
      setShowLPopup(false);
    });
  }, [piece, initialLessonNum, refreshProgress]);

  // Main lesson initialization
  useEffect(() => {
    if (!lessonData?.startFen) return;
    if (!socket.connected) return;

    setHidePieces(false);
    setShowLPopup(false);
    setShowInstruction(true);

    // Check if all lessons completed
    if (!lessonData.lessonNum && lessonNum >= totalLessons - 1) {
      setAllLessonsDone(true);
      return;
    }

    // Update lesson refs
    lessonStartFENRef.current = lessonData.startFen;

    // Determine player color from FEN
    const turn = getTurnFromFEN(lessonData.startFen);
    setBoardOrientation(turn);
    playerColorRef.current = turn;

    // Initialize game position
    gameRef.current = new Chess(lessonData.startFen);
    setCurrentFEN(lessonData.startFen);
    // Immediately sync ChessBoard's internal game so hover dots work without
    // waiting for the fen prop → useEffect render cycle
    chessBoardRef.current?.setPosition(lessonData.startFen);

    // Update lesson info
    setInfo(lessonData.info || "");
    setName(lessonData.name || "");
    setVideoUrl(lessonData.videoUrl || null);

    // Determine lesson mode: puzzle (has solution) or free-play (has goal)
    const hasSolution = lessonData.solution && lessonData.solution.trim().length > 0;
    const hasGoal = lessonData.goal != null;

    if (hasSolution) {
      // PUZZLE MODE: Exact move sequence required
      setIsPuzzleMode(true);
      setLessonGoal(null);
      setIsInfoOnly(false);

      const parsedMoves = parsePGNSolution(lessonData.solution, turn, playerColorRef.current);
      setSolutionMoves(parsedMoves);
      setCurrentSolutionIndex(0);

      console.log('[Lesson Mode] Puzzle mode - solution:', lessonData.solution);
    } else if (hasGoal) {
      // FREE-PLAY MODE: Goal-based validation
      setIsPuzzleMode(false);
      setLessonGoal(lessonData.goal);
      setIsInfoOnly(false);
      setSolutionMoves([]);
      setCurrentSolutionIndex(0);

      console.log('[Lesson Mode] Free-play mode - goal:', lessonData.goal);
    } else {
      // INFO-ONLY MODE: No interaction required, student reads and continues
      setIsPuzzleMode(false);
      setLessonGoal(null);
      setIsInfoOnly(true);
      setSolutionMoves([]);
      setCurrentSolutionIndex(0);

      console.log('[Lesson Mode] Info-only mode');
    }

    // Clear event log for new lesson
    eventLogRef.current.clear();

    // Initialize game on server
    isInitializedRef.current = false;
    const initTimer = setTimeout(() => {
      initializeLessonOnServer();
    }, 100);

    return () => clearTimeout(initTimer);

  }, [lessonData, socket.connected]);

  // Instruction popup with progress bar
  useEffect(() => {
    if (!showInstruction) return;

    const wordCount = info ? info.split(/\s+/).length : 0;
    const totalTime = Math.min(20000, 3000 + wordCount * 300);

    let startTime = Date.now();

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / totalTime) * 100, 100);
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setIsFading(true);
        setTimeout(() => setShowInstruction(false), 500);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showInstruction, info]);

  const initializeLessonOnServer = useCallback(() => {
    if (!lessonData || isInitializedRef.current) return;
    if (!socket.connected) return;

    isInitializedRef.current = true;

    socket.setGameStateWithColor(
      lessonData.startFen,
      playerColorRef.current,
      lessonData.info
    );

  }, [lessonData, socket]);

  function getTurnFromFEN(fen: string): 'white' | 'black' {
    if (!fen || typeof fen !== 'string') {
      return 'white';
    }
    const parts = fen.split(' ');
    return parts[1] === 'w' ? 'white' : 'black';
  }

  // Check lesson completion for free-play mode
  const checkFreePlayCompletion = useCallback((fen: string) => {
    const game = new Chess(fen);
    const infoLower = info.toLowerCase();

    // Checkmate goal
    if (infoLower.includes('checkmate')) {
      if (game.isCheckmate()) {
        // Verify correct side is checkmated
        const turn = game.turn(); // Current turn (the checkmated player)
        const playerWon = (playerColorRef.current === 'white' && turn === 'b') || (playerColorRef.current === 'black' && turn === 'w');

        if (playerWon) {
          setShowVPopup(true);
          return true;
        }
      }
    }

    // Promotion goal
    if (infoLower.includes('promote')) {
      const startQueens = (lessonStartFENRef.current.match(/[Qq]/g) || []).length;
      const currentQueens = (fen.match(/[Qq]/g) || []).length;

      if (currentQueens > startQueens) {
        setShowVPopup(true);
        return true;
      }
    }

    // Winning position goal
    if (infoLower.includes('winning position')) {
      const materialDiff = calculateMaterialDifference(fen);

      if ((playerColorRef.current === 'white' && materialDiff <= -5) ||
        (playerColorRef.current === 'black' && materialDiff >= 5)) {
        setShowVPopup(true);
        return true;
      }
    }

    return false;
  }, [info]);

  const calculateMaterialDifference = (fen: string): number => {
    const pieceValues: { [key: string]: number } = {
      'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
      'P': -1, 'N': -3, 'B': -3, 'R': -5, 'Q': -9
    };

    const position = fen.split(' ')[0];
    let material = 0;

    for (const char of position) {
      if (pieceValues[char]) {
        material += pieceValues[char];
      }
    }

    return material; // Positive = black ahead, negative = white ahead
  };

  const handlePuzzleMove = useCallback((move: Move) => {
    if (currentSolutionIndex >= solutionMoves.length) {
      console.error('Solution index out of bounds');
      return;
    }

    const expectedSolutionMove = solutionMoves[currentSolutionIndex];

    if (!expectedSolutionMove.isPlayerMove) {
      console.error('Not player turn in solution');
      return;
    }

    const tempGame = new Chess(currentFEN);
    const expectedMove = sanToMove(expectedSolutionMove.san, tempGame);

    if (!expectedMove) {
      console.error('Could not parse solution move:', expectedSolutionMove.san);
      setShowError(true);
      return;
    }

    // Check if player's move matches expected move
    if (!movesMatch(move, expectedMove)) {
      setPopupMessage("Wrong Move!");
      xPopupShouldResetRef.current = false;
      setShowXPopup(true);
      return;
    }

    // Correct move! Apply it
    try {
      gameRef.current.move(move);
      const newFen = gameRef.current.fen();

      prevFenRef.current = currentFEN;
      currentFenRef.current = newFen;
      setCurrentFEN(newFen);
      processMove();
      setMoveHistory(prev => [...prev, `${move.from}-${move.to}`]);
      setHighlightSquares([move.from, move.to]);

      if (onChessMove) onChessMove(newFen);

      // Move to next solution move
      const nextIndex = currentSolutionIndex + 1;

      // Check if this was the last move
      if (nextIndex >= solutionMoves.length) {
        // Puzzle complete!
        setShowVPopup(true);
        return;
      }

      setCurrentSolutionIndex(nextIndex);

      // Auto-play opponent's response if there is one
      const nextSolutionMove = solutionMoves[nextIndex];
      if (nextSolutionMove && !nextSolutionMove.isPlayerMove) {
        setTimeout(() => {
          playOpponentSolutionMove(nextIndex);
        }, 500);
      }

    } catch (error) {
      console.error("Error applying puzzle move:", error);
      setShowError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSolutionIndex, solutionMoves, currentFEN, processMove, onChessMove]);

  // Play opponent's predetermined move from solution
  const playOpponentSolutionMove = useCallback((index: number) => {
    if (index >= solutionMoves.length) return;

    const opponentSolutionMove = solutionMoves[index];
    if (opponentSolutionMove.isPlayerMove) {
      console.error('Expected opponent move but got player move');
      return;
    }

    try {
      const move = gameRef.current.move(opponentSolutionMove.san);
      if (!move) {
        console.error('Could not play opponent move:', opponentSolutionMove.san);
        return;
      }

      const newFen = gameRef.current.fen();
      setCurrentFEN(newFen);
      setHighlightSquares([move.from, move.to]);

      if (chessBoardRef.current) {
        chessBoardRef.current.highlightMove(move.from, move.to);
      }

      if (onChessMove) onChessMove(newFen);

      // Move to next index
      setCurrentSolutionIndex(index + 1);

      // Check if game ended
      if (gameRef.current.isCheckmate() || gameRef.current.isStalemate()) {
        const turn = gameRef.current.turn();
        const playerLost = (playerColorRef.current === 'white' && turn === 'w') ||
          (playerColorRef.current === 'black' && turn === 'b');

        if (playerLost) {
          setPopupMessage("Game Over!")
          setShowXPopup(true);
        }
      }

    } catch (error) {
      console.error("Error playing opponent move:", error);
      setShowError(true);
    }
  }, [solutionMoves, onChessMove]);

  // Handle move in free-play mode (with Stockfish opponent)
  const handleFreePlayMove = useCallback(async (move: Move) => {
    try {
      // Apply student move
      const moveResult = gameRef.current.move(move);
      if (!moveResult) {
        console.error('Invalid move');
        return;
      }

      const afterFen = gameRef.current.fen();

      if (stockfishSocketRef.current && stockfishSessionStarted) {
        stockfishSocketRef.current.emit('update-fen', { fen: afterFen });
      }

      const event = createMoveEvent(moveResult, afterFen, true); // true = player move
      eventLogRef.current.addMove(event);

      prevFenRef.current = currentFEN;
      currentFenRef.current = afterFen;
      setCurrentFEN(afterFen);
      processMove();
      setMoveHistory(prev => [...prev, `${move.from}-${move.to}`]);
      setHighlightSquares([move.from, move.to]);

      if (onChessMove) onChessMove(afterFen);

      const moveCount = eventLogRef.current.getEvents().length;
      if (lessonData?.maxMoves && moveCount > lessonData.maxMoves) {
        setPopupMessage('Too many moves!');
        xPopupShouldResetRef.current = true;
        setShowXPopup(true);
        return;
      }

      if (lessonGoal) {
        const context: EvaluationContext = {
          events: eventLogRef.current.getEvents(),
          currentGame: gameRef.current,
          startFen: lessonStartFENRef.current,
          currentFen: afterFen,
          playerColor: playerColorRef.current,
          moveCount: eventLogRef.current.getEvents().length
        };

        const goalAchieved = evaluateGoal(lessonGoal, context);

        if (goalAchieved) {
          setShowVPopup(true);
          return;
        }
      } else {
        if (checkFreePlayCompletion(afterFen)) {
          return;
        }
      }

      // Check if game ended in student's favor
      if (gameRef.current.isCheckmate() || gameRef.current.isStalemate()) {
        const turn = gameRef.current.turn();
        const playerWon = (playerColorRef.current === 'white' && turn === 'b') || (playerColorRef.current === 'black' && turn === 'w');

        if (playerWon) {
          setShowVPopup(true);
        } else {
          setPopupMessage("Game Over!");
          xPopupShouldResetRef.current = true;
          setShowXPopup(true);
        }
        return;
      }

      // Request opponent move from Stockfish
      setTimeout(() => {
        const currentFen = gameRef.current.fen();
        requestStockfishMove(currentFen, 5);
      }, 500);

    } catch (error) {
      console.error("Error handling free play move:", error);
      setShowError(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonGoal, lessonData, processMove, onChessMove, checkFreePlayCompletion, requestStockfishMove, stockfishSessionStarted, currentFEN]);

  // Main move handler - routes to puzzle or free-play
  const handleMove = useCallback((move: Move) => {
    if (isPuzzleMode) {
      handlePuzzleMove(move);
    } else {
      handleFreePlayMove(move);
    }
  }, [isPuzzleMode, handlePuzzleMove, handleFreePlayMove]);

  const handleInvalidMove = useCallback(() => {
    // Could show a toast notification here
    console.log("Invalid move attempted");
  }, []);

  const undoMove = useCallback(() => {
    if (!chessBoardRef.current) return;
    if (moveHistory.length === 0) return;

    if (isPuzzleMode) {
      handleReset();
      return;
    }

    // In free-play, if it's the player's turn the opponent already responded → undo 2 half-moves.
    // If it's the opponent's turn the player just moved → undo 1 half-move.
    const currentTurn = gameRef.current.turn();
    const playerTurn = playerColorRef.current === 'white' ? 'w' : 'b';
    const movesToUndo = currentTurn === playerTurn ? 2 : 1;

    for (let i = 0; i < movesToUndo; i++) {
      if (gameRef.current.history().length > 0) {
        gameRef.current.undo();
        eventLogRef.current.popMove();
      }
    }

    const newFen = gameRef.current.fen();
    setCurrentFEN(newFen);
    setMoveHistory(prev => prev.slice(0, -1));
    setHighlightSquares([]);

    if (chessBoardRef.current) {
      chessBoardRef.current.setPosition(newFen);
      chessBoardRef.current.clearHighlights();
    }

  }, [moveHistory.length, isPuzzleMode]);

  const handleReset = useCallback(() => {
    gameRef.current = new Chess(lessonStartFENRef.current);
    setCurrentFEN(lessonStartFENRef.current);
    setMoveHistory([]);
    setHighlightSquares([]);
    setCurrentSolutionIndex(0);

    eventLogRef.current.clear();

    if (chessBoardRef.current) {
      chessBoardRef.current.setPosition(lessonStartFENRef.current);
      chessBoardRef.current.clearHighlights();
    }

    if (onChessReset) onChessReset(lessonStartFENRef.current);
    resetLesson(lessonStartFENRef.current);

  }, [onChessReset, resetLesson]);

  const previousLesson = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      if (stockfishSocketRef.current && stockfishSessionStarted) {
        stockfishSocketRef.current.emit('end-session');
        setStockfishSessionStarted(false);
      }

      isInitializedRef.current = false;
      chessBoardRef.current?.clearHighlights();
      await managerPrevLesson();
      resetLesson(null);
      setMoveHistory([]);
      setHighlightSquares([]);
      setCurrentSolutionIndex(0);
      eventLogRef.current.clear();
    } finally {
      setIsNavigating(false);
    }
  };

  const nextLesson = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      if (stockfishSocketRef.current && stockfishSessionStarted) {
        stockfishSocketRef.current.emit('end-session');
        setStockfishSessionStarted(false);
      }

      isInitializedRef.current = false;
      chessBoardRef.current?.clearHighlights();
      await goToLesson(lessonNum + 1);
      resetLesson(null);
      setMoveHistory([]);
      setHighlightSquares([]);
      setCurrentSolutionIndex(0);
      eventLogRef.current.clear();
    } finally {
      setIsNavigating(false);
    }
  };

  const handleVPopup = async () => {
    setShowVPopup(false);
    setShowXPopup(false);

    const nextNum = lessonNum + 1;
    await updateCompletion(); // backend update for logged-in users

    if (nextNum >= totalLessons) {
      setAllLessonsDone(true);
      return;
    }

    await goToLesson(nextNum);
    resetLesson(null);
    setMoveHistory([]);
    setHighlightSquares([]);
    chessBoardRef.current?.clearHighlights();
    setCurrentSolutionIndex(0);
    eventLogRef.current.clear();
  };

  const handleXPopup = () => {
    setShowXPopup(false);
    if (xPopupShouldResetRef.current) {
      handleReset();
    }
  };

  const toAbsoluteUrl = (url: string): string => {
    const markdownMatch = url.match(/\[.*?\]\((.*?)\)/);
    const clean = markdownMatch ? markdownMatch[1] : url;
    return clean.startsWith('http') ? clean : `https://${clean}`;
  };

  const promotePawn = (to: string, piece: string) => {
    setIsPromoting(false);

    if (chessBoardRef.current) {
      chessBoardRef.current.handlePromotion(promotionSource, promotionTarget, piece.toLowerCase());
    }

    const move: Move = {
      from: promotionSource,
      to: promotionTarget,
      promotion: piece.toLowerCase()
    };

    handleMove(move);
  };

  return (
    <div className={styles.lessonContainer}>
      <div className={styles.buttonContainer}>
        {!isInfoOnly && (
          <div className={styles.controlButtonsWrapper}>
            <button
              className={styles.controlButton}
              onClick={() => chessBoardRef.current?.flip()}
            >
              Flip board
            </button>
            <button
              className={styles.controlButton}
              onClick={undoMove}
              disabled={moveHistory.length === 0}
            >
              {isPuzzleMode ? 'Reset' : 'Undo'}
            </button>
          </div>
        )}
        <div
          className={styles.switchLesson}
          onClick={() => {
            if (navigateFunc) navigateFunc();
            else navigate("/lessons-selection");
          }}
        >
          Switch Lesson
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.rightContainer}>
          {/* Lesson info */}
          <div className={styles.lessonHeader}>
            <h1 className={styles.pieceDescription}>{piece}</h1>
            <button
              className={styles.resetLesson}
              data-testid="reset-button"
              onClick={handleReset}
            >
              <RedoIcon />
            </button>
          </div>

          <h1 className={styles.subheading}>
            {lessonNum + 1} / {totalLessons}: {name}
          </h1>

          <p className={styles.lessonDescription}>{info}</p>

          {isInfoOnly && (
            <button
              className={styles.continueButton}
              onClick={async () => {
                await updateCompletion();
                await nextLesson();
              }}
            >
              Continue
            </button>
          )}

          {/* Navigation buttons */}
          <div className={styles.prevNextContainer}>
            {lessonNum <= 0 || isNavigating ? (
              <button className={[styles.prevNextLessonButtonInactive, styles.prev].join(' ')}>
                <BackIconInactive />
                <p className={styles.buttonDescription}>Back</p>
              </button>
            ) : (
              <button
                className={[styles.prevNextLessonButton, styles.prev].join(' ')}
                onClick={previousLesson}
              >
                <BackIcon />
                <p className={styles.buttonDescription}>Back</p>
              </button>
            )}

            {(isNavigating || lessonNum >= totalLessons - 1 || (!!cookies.login && lessonNum >= completedNum)) ? (
              <button className={[styles.prevNextLessonButtonInactive, styles.next].join(' ')}>
                <p className={styles.buttonDescription}>Next</p>
                <NextIconInactive />
              </button>
            ) : (
              <button
                className={[styles.prevNextLessonButton, styles.next].join(' ')}
                onClick={nextLesson}
              >
                <p className={styles.buttonDescription}>Next</p>
                <NextIcon />
              </button>
            )}
          </div>

          {/* Move tracker */}
          {styleType !== 'profile' && <MoveTracker moves={moves} />}
        </div>

        {/* Chessboard or video embed */}
        {isInfoOnly && videoUrl ? (
          <div className={styles.videoContainer}>
            <div
              className={styles.videoThumbnail}
              onClick={() => window.open(toAbsoluteUrl(videoUrl), '_blank')}
            >
              <div className={styles.playButton}>▶</div>
              <p className={styles.watchLabel}>Watch on YouTube</p>
            </div>
          </div>
        ) : (
          <div className={`${styles.chessboardContainer} ${hidePieces ? styles.hidePieces : ""}`}>
            <ChessBoard
              mode="lesson"
              ref={chessBoardRef}
              fen={currentFEN}
              orientation={boardOrientation}
              lessonMoves={lessonData?.moves || []}
              highlightSquares={highlightSquares}
              onMove={handleMove}
              onInvalidMove={handleInvalidMove}
              onPromotion={promotePawn}
              disabled={!socket.connected}
            />
          </div>
        )}
      </div>

      {/* POPUPS */}

      {/* Connection error */}
      {ShowError && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <div className={styles.errorCross}>
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle className={styles.circle} cx="60" cy="60" r="54" fill="none" stroke="#f57c7c" strokeWidth="6" />
                <path d="M40 40 L80 80" fill="none" stroke="#f57c7c" strokeWidth="8" strokeLinecap="round" />
                <path d="M80 40 L40 80" fill="none" stroke="#f57c7c" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.popupHeader}>Failed to load content</p>
            <p className={styles.popupSubheading}>Please reload page</p>
          </div>
        </div>
      )}

      {/* Lesson completed */}
      {showVPopup && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <div className={styles.successCheckmark}>
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle className={styles.circle} cx="60" cy="60" r="54" fill="none" stroke="#beea8b" strokeWidth="6" />
                <path className={styles.checkmark} d="M35 60 L55 80 L85 40" fill="none" stroke="#beea8b" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className={styles.popupHeader}>Lesson completed!</p>
            <p className={styles.popupSubheading}>Good job!</p>
            <button className={styles.popupButton} onClick={handleVPopup}>OK</button>
          </div>
        </div>
      )}

      {/* Lesson failed */}
      {showXPopup && !showVPopup && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <div className={styles.errorCross}>
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle className={styles.circle} cx="60" cy="60" r="54" fill="none" stroke="#f57c7c" strokeWidth="6" />
                <path d="M40 40 L80 80" fill="none" stroke="#f57c7c" strokeWidth="8" strokeLinecap="round" />
                <path d="M80 40 L40 80" fill="none" stroke="#f57c7c" strokeWidth="8" strokeLinecap="round" />
              </svg>
            </div>
            <p className={styles.popupHeader}>{popupMessage}</p>
            <p className={styles.popupSubheading}>Please try again.</p>
            <button className={styles.popupButton} onClick={handleXPopup}>OK</button>
          </div>
        </div>
      )}

      {/* Loading */}
      {showLPopup && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <div className={styles.loadingSpinner}>
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle className={styles.spinner} cx="60" cy="60" r="54" fill="none" stroke="#7fcc26" strokeWidth="6" />
              </svg>
            </div>
            <p className={styles.popupHeader}>Loading lesson...</p>
            <p className={styles.popupSubheading}>Please wait</p>
          </div>
        </div>
      )}

      {/* Instructions */}
      {showInstruction && (
        <div className={`${styles.popup} ${isFading ? styles.fadeOut : ''}`} style={{ pointerEvents: 'none' }}>
          <div className={styles.popupContent} style={{ pointerEvents: 'auto' }}>
            <p className={styles.popupHeader}>Lesson Instructions</p>
            <p className={styles.popupSubheading}>{info}</p>
            <div className={styles.loadingBarContainer}>
              <div className={styles.loadingBar} style={{ width: `${progress}%` }} />
            </div>
            <button
              className={styles.popupButton}
              onClick={() => { setIsFading(true); setTimeout(() => setShowInstruction(false), 500); }}
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* All lessons done */}
      {allLessonsDone && (
        <div className={styles.popup}>
          <div className={styles.popupContent}>
            <p className={styles.popupHeader}>🎉 Congratulations!</p>
            <p className={styles.popupSubheading}>You have completed all lessons for this scenario.</p>
            <button className={styles.popupButton} onClick={() => {
            setAllLessonsDone(false);
            if (navigateFunc) navigateFunc();
            else navigate("/lessons-selection");
          }}>Go to Lessons</button>
          </div>
        </div>
      )}

      {/* Promotion popup */}
      {isPromoting && (
        <PromotionPopup
          position={promotionSource}
          promoteToPiece={promotePawn}
        />
      )}
    </div>
  );
};

export default LessonOverlay;
