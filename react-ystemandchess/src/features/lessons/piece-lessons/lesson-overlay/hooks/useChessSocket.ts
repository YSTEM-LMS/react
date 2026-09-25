import { useState, useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { Move, BoardState, MousePosition, GameConfig, GameMode, PlayerColor } from "../../../../../core/types/chess";

interface UseChessSocketOptions {
  student: string;
  mentor?: string;
  role?: "mentor" | "student" | "host" | "guest";
  credentials?: string;
  serverUrl: string;
  mode?: GameMode;
  trackMouse?: boolean;

  // Event callbacks
  onBoardStateChange?: (fen: string, color?: PlayerColor) => void;
  onMove?: (data: { fen: string; move?: Move }) => void;
  onHighlight?: (from: string, to: string) => void;
  onLastMove?: (from: string, to: string) => void;
  onMouseMove?: (position: MousePosition) => void;
  onPieceDrag?: (piece: string) => void;
  onPieceDrop?: () => void;
  onGreySquare?: (square: string) => void;
  onRemoveGrey?: () => void;
  onPromotion?: (from: string, to: string, piece: string) => void;
  onReset?: () => void;
  onError?: (msg: string) => void;
  onMessage?: (msg: string) => void;
  onRoleAssigned?: (role: "host" | "guest") => void;
  onColorAssigned?: (color: PlayerColor) => void;
}

// ======== CENTRALIZED FEN NORMALIZATION ========
const normalizeFen = (fen: string): string => {
  if (!fen || typeof fen !== 'string') {
    console.warn("Invalid FEN input:", fen);
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"; // Default starting position
  }

  const trimmed = fen.trim().toLowerCase();
  if (trimmed === "start") {
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }

  const parts = fen.trim().split(" ");

  // Already a complete 6-field FEN
  if (parts.length === 6) {
    return fen.trim();
  }

  // Board-only FEN (just piece positions)
  if (parts.length === 1 && parts[0].split("/").length === 8) {
    return `${parts[0]} w KQkq - 0 1`;
  }

  // Partial FEN with 2-5 fields - pad to 6 fields
  const defaults = ["w", "KQkq", "-", "0", "1"];
  const paddedParts = [...parts];
  
  while (paddedParts.length < 6) {
    paddedParts.push(defaults[paddedParts.length - 1]);
  }

  return paddedParts.join(" ");
};

export const useChessSocket = ({
  student,
  mentor = "",
  role = "student",
  credentials = "",
  serverUrl,
  mode = "regular",
  trackMouse = false,
  onBoardStateChange,
  onMove,
  onHighlight,
  onLastMove,
  onMouseMove,
  onPieceDrag,
  onPieceDrop,
  onGreySquare,
  onRemoveGrey,
  onReset,
  onError,
  onMessage,
  onRoleAssigned,
  onColorAssigned,
}: UseChessSocketOptions) => {
  // ======== state ========
  const [fen, setFen] = useState<string>("");
  const [connected, setConnected] = useState(false);
  const [playerColor, setPlayerColor] = useState<PlayerColor | null>(null);
  const [assignedRole, setAssignedRole] = useState<"host" | "guest" | null>(null);

  // ======== refs ========
  const socketRef = useRef<Socket | null>(null);
  const currentFenRef = useRef<string>("");
  const expectedMoveRef = useRef<Move | null>(null);
  const isPuzzleRef = useRef<boolean>(mode === "puzzle");
  const mouseTrackingRef = useRef<boolean>(false);
  const highlightFromRef = useRef<string>("");
  const highlightToRef = useRef<string>("");

  // Store mentor/student/role/credentials in refs so they can be updated
  const mentorRef = useRef<string>(mentor);
  const studentRef = useRef<string>(student);
  const roleRef = useRef<"mentor" | "student" | "host" | "guest">(role);
  const credentialsRef = useRef<string>(credentials);

  // ======== connect / listeners ========
  useEffect(() => {
    const socket = io(serverUrl, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    // on connect
    socket.on("connect", () => {
      setConnected(true);
    });

    socket.on("disconnect", (reason: any) => {
      setConnected(false);
    });

    socket.on("connect_error", (error: any) => {
      console.error("Connection error:", error);
      setConnected(false);
      if (onError) onError("Connection failed");
    });

    // host / guest assignment
    socket.on("host", () => {
      console.log("Assigned as HOST");
      setAssignedRole("host");
      isPuzzleRef.current = true;
      if (onRoleAssigned) onRoleAssigned("host");
    });

    socket.on("guest", () => {
      console.log("Assigned as GUEST");
      setAssignedRole("guest");
      isPuzzleRef.current = true;
      if (onRoleAssigned) onRoleAssigned("guest");
    });

    // boardstate - primary source of truth
    socket.on("boardstate", (msg: string) => {
      try {
        const parsed: BoardState = JSON.parse(msg);
        const rawFen = (parsed as any).boardState || (parsed as any).fen;
        const newFen = normalizeFen(rawFen);

        // Update refs/state
        setFen(newFen);
        currentFenRef.current = newFen;

        // Handle color assignment
        if ((parsed as any).color) {
          const color = (parsed as any).color as PlayerColor;
          setPlayerColor(color);
          if (onColorAssigned) onColorAssigned(color);
        }

        // Notify parent component
        if (onBoardStateChange) {
          onBoardStateChange(newFen, (parsed as any).color);
        }

      } catch (err) {
        console.error("Invalid boardstate:", err);
      }
    });

    // color (explicit)
    socket.on("color", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        const color = parsed.color as PlayerColor;
        console.log("Color assigned:", color);
        setPlayerColor(color);
        if (onColorAssigned) onColorAssigned(color);
      } catch (err) {
        console.error("Invalid color message:", err);
      }
    });

    // last move highlight
    socket.on("lastmove", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);

        if (parsed.from && parsed.to) {
          console.log("Last move highlight:", parsed.from, "→", parsed.to);
          if (onLastMove) onLastMove(parsed.from, parsed.to);
        }
      } catch (err) {
        console.error("Invalid lastmove:", err);
      }
    });

    // highlight arrows
    socket.on("highlight", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        console.log("Highlight:", parsed.from, "→", parsed.to);
        if (onHighlight) onHighlight(parsed.from, parsed.to);
      } catch (err) {
        console.error("Invalid highlight:", err);
      }
    });

    // piece drag/drop from remote
    socket.on("piecedrag", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        console.log("Piece drag:", parsed.piece);
        if (onPieceDrag) onPieceDrag(parsed.piece);
      } catch (err) {
        console.error("Invalid piecedrag:", err);
      }
    });

    socket.on("piecedrop", () => {
      console.log("Piece drop");
      if (onPieceDrop) onPieceDrop();
    });

    // grey squares
    socket.on("addgrey", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        if (onGreySquare) onGreySquare(parsed.to);
      } catch (err) {
        console.error("Invalid addgrey:", err);
      }
    });

    socket.on("removegrey", () => {
      if (onRemoveGrey) onRemoveGrey();
    });

    // mouse move with viewport calculations
    socket.on("mousexy", (msg: string) => {
      try {
        const parsed: MousePosition = JSON.parse(msg);

        if (parsed.x && parsed.y) {
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;

          let adjustedX: number;
          let adjustedY: number;

          if (isPuzzleRef.current) {
            adjustedX = parsed.x - 28;
            adjustedY = parsed.y - 28;
          } else {
            adjustedX = -1 * parsed.x + viewportWidth - 28;
            adjustedY = -1 * parsed.y + viewportHeight - 28;
          }

          if (onMouseMove) onMouseMove({ x: adjustedX, y: adjustedY });
        }
      } catch (err) {
        console.error("Invalid mousexy:", err);
      }
    });

    // reset
    socket.on("reset", () => {
      console.log("Game reset");
      setFen("");
      currentFenRef.current = "";
      expectedMoveRef.current = null;
      if (onReset) onReset();
    });

    // message
    socket.on("message", (msg: string) => {
      try {
        const parsed = JSON.parse(msg);
        if (onMessage) onMessage(parsed.message);
      } catch (err) {
        if (onMessage) onMessage(msg);
      }
    });

    // gameerror
    socket.on("gameerror", (msg: string) => {
      console.error("Game error:", msg);
      if (onError) onError(msg);
    });

    // cleanup when component unmounts
    return () => {
      try {
        socket.disconnect();
      } catch (err) {
        /* ignore */
      }
      socketRef.current = null;
      setConnected(false);
      stopMouseTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverUrl]);

  // ======== Outgoing commands ========

  const startNewGame = useCallback(() => {
    const data: GameConfig = {
      mentor: mentorRef.current,
      student: studentRef.current,
      role: roleRef.current
    };
    console.log("Starting new game:", data);
    socketRef.current?.emit("newgame", JSON.stringify(data));
  }, []);

  const startNewPuzzle = useCallback(() => {
    const data: GameConfig = {
      mentor: mentorRef.current,
      student: studentRef.current,
      role: roleRef.current,
      credentials: credentialsRef.current
    };
    console.log("Starting new puzzle:", data);
    socketRef.current?.emit("newPuzzle", JSON.stringify(data));
  }, []);

  const setGameState = useCallback((fenToSet: string) => {
    const normalizedFen = normalizeFen(fenToSet);
    
    // CRITICAL: Update currentFenRef immediately BEFORE sending to server
    currentFenRef.current = normalizedFen;
    
    const data = { state: normalizedFen };
    socketRef.current?.emit("setstate", JSON.stringify(data));
  }, []);

  const setGameStateWithColor = useCallback(
    (fenToSet: string, color: PlayerColor, hints?: string) => {
      const normalizedFen = normalizeFen(fenToSet);
      
      // Update currentFenRef immediately before sending to server
      // This prevents the validation logic from thinking the server's echo is a move response
      currentFenRef.current = normalizedFen;
      
      const data = { state: normalizedFen, color, hints: hints || "" };
      socketRef.current?.emit("setstateColor", JSON.stringify(data));
    },
    []
  );

  const sendMove = useCallback((move: Move) => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current,
      role: roleRef.current,
      from: move.from,
      to: move.to,
      promotion: move.promotion,
      computerMove: move.computerMove,
      username: move.username,
      credentials: move.credentials,
    };
    console.log("Sending move:", data);
    socketRef.current?.emit("move", JSON.stringify(data));
  }, []);

  const sendLastMove = useCallback((from: string, to: string) => {
    const data = {
      from,
      to,
      mentor: mentorRef.current,
      student: studentRef.current
    };
    // Store for puzzle validation
    highlightFromRef.current = from;
    highlightToRef.current = to;
    socketRef.current?.emit("lastmove", JSON.stringify(data));
  }, []);

  const sendHighlight = useCallback((from: string, to: string) => {
    const data = {
      from,
      to,
      mentor: mentorRef.current,
      student: studentRef.current
    };
    socketRef.current?.emit("highlight", JSON.stringify(data));
  }, []);

  const sendMousePosition = useCallback((x: number, y: number) => {
    const data = {
      x,
      y,
      mentor: mentorRef.current,
      student: studentRef.current
    };
    socketRef.current?.emit("mousexy", JSON.stringify(data));
  }, []);

  const sendPieceDrag = useCallback((piece: string) => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current,
      piece
    };
    socketRef.current?.emit("piecedrag", JSON.stringify(data));
  }, []);

  const sendPieceDrop = useCallback(() => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current
    };
    socketRef.current?.emit("piecedrop", JSON.stringify(data));
  }, []);

  const sendGreySquare = useCallback((square: string) => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current,
      to: square
    };
    socketRef.current?.emit("addgrey", JSON.stringify(data));
  }, []);

  const sendRemoveGrey = useCallback(() => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current
    };
    socketRef.current?.emit("removegrey", JSON.stringify(data));
  }, []);

  const undo = useCallback(() => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current,
      role: roleRef.current
    };
    console.log("Sending undo");
    socketRef.current?.emit("undo", JSON.stringify(data));
  }, []);

  const endGame = useCallback(() => {
    const data = {
      mentor: mentorRef.current,
      student: studentRef.current,
      role: roleRef.current
    };
    console.log("Ending game");
    socketRef.current?.emit("endgame", JSON.stringify(data));
  }, []);

  const sendMessage = useCallback((message: string) => {
    const data = { message };
    socketRef.current?.emit("message", JSON.stringify(data));
  }, []);

  const setExpectedMove = useCallback((move: Move | null) => {
    expectedMoveRef.current = move;
  }, []);

  // ======== mouse tracking helpers ========
  const _onMouseMove = useCallback(
    (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      sendMousePosition(x, y);
    },
    [sendMousePosition]
  );

  const startMouseTracking = useCallback(() => {
    if (mouseTrackingRef.current) return;
    mouseTrackingRef.current = true;
    document.addEventListener("mousemove", _onMouseMove);
  }, [_onMouseMove]);

  const stopMouseTracking = useCallback(() => {
    if (!mouseTrackingRef.current) return;
    mouseTrackingRef.current = false;
    document.removeEventListener("mousemove", _onMouseMove);
  }, [_onMouseMove]);

  // auto-start if requested
  useEffect(() => {
    if (trackMouse && connected) startMouseTracking();
    return () => {
      if (trackMouse) stopMouseTracking();
    };
  }, [trackMouse, connected, startMouseTracking, stopMouseTracking]);

  // Update refs when props change
  useEffect(() => {
    mentorRef.current = mentor;
    studentRef.current = student;
    roleRef.current = role;
    credentialsRef.current = credentials;
  }, [mentor, student, role, credentials]);

  // allow runtime change of mentor/student/role
  const setUserInfo = useCallback(
    (info: {
      mentor?: string;
      student?: string;
      role?: "mentor" | "student" | "host" | "guest"
    }) => {
      if (info.mentor) mentorRef.current = info.mentor;
      if (info.student) studentRef.current = info.student;
      if (info.role) roleRef.current = info.role;
    },
    []
  );

  // ======== Public API ========
  return {
    // State
    fen,
    connected,
    playerColor,
    assignedRole,

    // Game control
    startNewGame,
    startNewPuzzle,
    endGame,

    // Move operations
    sendMove,
    undo,
    setExpectedMove,

    // State management
    setGameState,
    setGameStateWithColor,

    // Visual feedback
    sendHighlight,
    sendLastMove,
    sendGreySquare,
    sendRemoveGrey,

    // Piece interaction
    sendPieceDrag,
    sendPieceDrop,

    // Communication
    sendMousePosition,
    sendMessage,

    // Mouse tracking helpers
    startMouseTracking,
    stopMouseTracking,

    // Registration / user info
    setUserInfo,

    // Refs for direct access
    socketRef,
    currentFenRef,
  };
};
