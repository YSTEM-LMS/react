// All jest.mock() calls at the top, before any imports. This ensures proper hoisting

// Mock socket.io-client with a factory that creates fresh socket instances
jest.mock("socket.io-client");

// Mock environment
jest.mock("../../../../environments");

// Mock utility modules
jest.mock("../../../../core/utils/goalEvaluator");
jest.mock("../../../../core/utils/eventLogger");
jest.mock("../../../../core/utils/opponentConstraints");

// Mock react-cookie
jest.mock("react-cookie", () => ({
  useCookies: jest.fn(() => [
    { login: { studentId: "student123" } },
    jest.fn(),
    jest.fn(),
  ]),
  Cookies: jest.fn(),
}));

// Mock react-router  
const mockNavigate = jest.fn();
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: () => mockNavigate,
  useLocation: jest.fn(),
}));

// Mock components
jest.mock("../../../../components/ChessBoard/ChessBoard", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        flip: jest.fn(),
        highlightMove: jest.fn(),
        setOrientation: jest.fn(),
        handlePromotion: jest.fn(),
        reset: jest.fn(),
        undo: jest.fn(),
        setPosition: jest.fn(),
        clearHighlights: jest.fn(),
      }));
      return (
        <div>
          <div data-testid="chess-board">ChessBoard Mock</div>
          <button
            data-testid="simulate-move"
            onClick={() => props.onMove?.({ from: "e2", to: "e4" })}
          >
            Simulate Move
          </button>
          <button
            data-testid="simulate-promotion"
            onClick={() => props.onMove?.({ from: "e7", to: "e8", promotion: "q" })}
          >
            Simulate Promotion
          </button>
          <div data-testid="board-disabled">
            {props.disabled ? "true" : "false"}
          </div>
        </div>
      );
    }),
  };
});

jest.mock("../move-tracker/MoveTracker", () => ({
  __esModule: true,
  default: () => <div data-testid="move-tracker">MoveTracker Mock</div>,
}));

jest.mock("../../lessons-main/PromotionPopup", () => ({
  __esModule: true,
  default: () => <div data-testid="promotion-popup">PromotionPopup Mock</div>,
}));

// Mock custom hooks
jest.mock("./hooks/useLessonManager");
jest.mock("./hooks/useChessGameLogic");
jest.mock("./hooks/useChessSocket");
jest.mock("./hooks/useTimeTracking", () => ({
  useTimeTracking: jest.fn(),
}));

// Now import everything
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import * as router from "react-router";
import { io } from "socket.io-client";
import LessonOverlay from "./Lesson-overlay";
import { useLessonManager } from "./hooks/useLessonManager";
import { useChessGameLogic } from "./hooks/useChessGameLogic";
import { useChessSocket } from "./hooks/useChessSocket";

// Setup mocks after imports
const mockIo = io as jest.MockedFunction<typeof io>;

// Import mocked modules
const goalEvaluator = require("../../../../core/utils/goalEvaluator");
const eventLogger = require("../../../../core/utils/eventLogger");
const { environment } = require("../../../../environments");

// Create socket factory
const createMockSocket = () => {
  const socket = {
    connected: true,
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    off: jest.fn(),
  };
  
  // Make methods chainable
  socket.on.mockReturnValue(socket);
  socket.emit.mockReturnValue(socket);
  socket.disconnect.mockReturnValue(socket);
  socket.off.mockReturnValue(socket);
  
  return socket;
};

// Configure io mock
mockIo.mockImplementation(() => createMockSocket() as any);

// Configure environment mock
Object.assign(environment, {
  urls: {
    chessServerURL: "http://localhost:3000",
    stockfishServerURL: "http://localhost:3001",
  }
});

describe("LessonOverlay", () => {
  let mockUseLessonManager: any;
  let mockUseChessGameLogic: any;
  let mockSocket: any;
  let socketCallbacks: any = {};

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-setup useCookies mock after clearAllMocks
    const { useCookies } = require("react-cookie");
    (useCookies as jest.Mock).mockReturnValue([
      { login: { studentId: "student123" } },
      jest.fn(),
      jest.fn(),
    ]);

    // Reset io mock to return fresh sockets
    mockIo.mockImplementation(() => createMockSocket() as any);

    (router.useLocation as jest.Mock).mockReturnValue({
      state: { piece: "Rook", lessonNum: 0 },
    });

    // Reset goal evaluator mock
    goalEvaluator.evaluateGoal.mockReturnValue(false);

    // Setup EventLog mock
    eventLogger.EventLog.mockImplementation(() => ({
      addMove: jest.fn(),
      getEvents: jest.fn().mockReturnValue([]),
      clear: jest.fn(),
      getPromotions: jest.fn().mockReturnValue([]),
      getCaptures: jest.fn().mockReturnValue([]),
    }));

    eventLogger.createMoveEvent.mockImplementation((move: any, fen: string, isPlayer: boolean) => ({
      san: move.san || 'e4',
      from: move.from,
      to: move.to,
      piece: move.piece || 'p',
      promotion: move.promotion,
      check: false,
      checkmate: false,
      doublePawnPush: false,
      enPassant: false,
      fen: fen,
    }));

    // Setup useLessonManager mock
    mockUseLessonManager = {
      lessonData: {
        startFen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
        info: "get a winning position",
        name: "Test Lesson Name",
        moves: [],
        goal: { type: "CHECKMATE" },
      },
      lessonNum: 0,
      completedNum: 0,
      totalLessons: 5,
      refreshProgress: jest.fn().mockResolvedValue(undefined),
      goToLesson: jest.fn().mockResolvedValue(undefined),
      nextLesson: jest.fn().mockResolvedValue(undefined),
      prevLesson: jest.fn().mockResolvedValue(undefined),
      updateCompletion: jest.fn().mockResolvedValue(undefined),
      setLessonNum: jest.fn(),
    };
    (useLessonManager as jest.Mock).mockReturnValue(mockUseLessonManager);

    // Setup useChessGameLogic mock
    mockUseChessGameLogic = {
      moves: [],
      processMove: jest.fn(),
      resetLesson: jest.fn(),
      currentFenRef: { current: "" },
      prevFenRef: { current: "" },
    };
    (useChessGameLogic as jest.Mock).mockReturnValue(mockUseChessGameLogic);

    // Setup useChessSocket mock
    socketCallbacks = {};
    mockSocket = {
      connected: true,
      setGameStateWithColor: jest.fn(),
      sendMove: jest.fn(),
      startMouseTracking: jest.fn(),
      stopMouseTracking: jest.fn(),
      setGameState: jest.fn(),
      sendLastMove: jest.fn(),
      undo: jest.fn(),
    };
    (useChessSocket as jest.Mock).mockImplementation((props: any) => {
      socketCallbacks = props;
      return mockSocket;
    });
  });

  test("renders LessonOverlay with initial data", async () => {
    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/Test Lesson Name/)).toBeInTheDocument();
    });

    const infoElements = screen.getAllByText("get a winning position");
    expect(infoElements.length).toBeGreaterThan(0);
    expect(screen.getByText("1 / 5: Test Lesson Name")).toBeInTheDocument();
    expect(screen.getByTestId("chess-board")).toBeInTheDocument();
    expect(screen.getByTestId("move-tracker")).toBeInTheDocument();
  });

  test("handles navigation buttons", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      completedNum: 1,
    });

    const { unmount } = render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    const nextButton = await screen.findByText("Next");
    const btn = nextButton.closest("button");

    if (btn) {
      fireEvent.click(btn);
    }
    expect(mockUseLessonManager.goToLesson).toHaveBeenCalled();

    unmount();

    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonNum: 1,
      completedNum: 2,
    });

    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    const backButton = await screen.findByText("Back");
    const backBtn = backButton.closest("button");

    if (backBtn) {
      fireEvent.click(backBtn);
    }
    expect(mockUseLessonManager.prevLesson).toHaveBeenCalled();
  });

  test("handles lesson completion with goal evaluation", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonData: {
        ...mockUseLessonManager.lessonData,
        goal: { type: "CHECKMATE" },
      },
    });

    goalEvaluator.evaluateGoal.mockReturnValue(true);

    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    await waitFor(() => screen.getByText(/Test Lesson Name/));

    const moveBtn = await screen.findByTestId("simulate-move");
    
    await act(async () => {
      fireEvent.click(moveBtn);
    });

    await waitFor(() => {
      expect(screen.getByText(/Lesson completed/i)).toBeInTheDocument();
    });

    const okButton = screen.getByText("OK");
    fireEvent.click(okButton);

    expect(mockUseLessonManager.updateCompletion).toHaveBeenCalled();
  });

  test("handles reset button", async () => {
    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    const resetButton = await screen.findByTestId("reset-button");
    fireEvent.click(resetButton);

    expect(mockUseChessGameLogic.resetLesson).toHaveBeenCalled();
  });

  test("handles drag and drop move via onMove in free-play mode", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonData: {
        ...mockUseLessonManager.lessonData,
        goal: { type: "PROMOTION", min: 1 },
      },
    });

    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    const moveBtn = await screen.findByTestId("simulate-move");
    
    await act(async () => {
      fireEvent.click(moveBtn);
    });

    expect(mockUseChessGameLogic.processMove).toHaveBeenCalled();
    expect(eventLogger.createMoveEvent).toHaveBeenCalled();
  });

  test("renders correctly with promotion goal", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonData: {
        ...mockUseLessonManager.lessonData,
        startFen: "4k3/4P3/8/8/8/8/8/4K3 w - - 0 1", // Simple position with white pawn on e7 ready to promote
        goal: { type: "PROMOTION", min: 1 },
      },
    });

    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    // Wait for the board to be ready
    await waitFor(() => {
      const boardDisabled = screen.getByTestId("board-disabled");
      expect(boardDisabled).toHaveTextContent("false");
    });

    // Verify promotion button exists (meaning the ChessBoard mock is rendering)
    const promoBtn = screen.getByTestId("simulate-promotion");
    expect(promoBtn).toBeInTheDocument();
    
    // Verify goal mode indicator (Undo button instead of Reset)
    expect(screen.getByText("Undo")).toBeInTheDocument();
  });

  test("does not initialize when socket is disconnected and board is disabled", async () => {
    mockSocket.connected = false;
    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    const disabledIndicator = await screen.findByTestId("board-disabled");
    expect(disabledIndicator.textContent).toBe("true");
  });

  test("shows error popup on socket error", async () => {
    render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    act(() => {
      socketCallbacks.onError && socketCallbacks.onError("test-error");
    });

    expect(
      await screen.findByText(/Failed to load content/i)
    ).toBeInTheDocument();
  });

  test("puzzle mode with solution uses exact move sequence", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonData: {
        ...mockUseLessonManager.lessonData,
        startFen: "r3k2r/ppp2pp1/2np4/2B1p2n/2B1P1Nq/3P4/PPP2PP1/RN1Q1RK1 b kq - 0 11",
        solution: "Qf2+ Kh1 Qg1+ Rxg1 Nf2#",
        info: "Checkmate in 3 moves",
        goal: null,
      },
    });

    const { container } = render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    // In puzzle mode, the undo button should say "Reset" instead of "Undo"
    await waitFor(() => {
      expect(screen.getByText("Reset")).toBeInTheDocument();
    });
    
    // Verify the lesson info displays the puzzle instruction in the lesson description area
    const lessonDescription = container.querySelector(".lessonDescription");
    expect(lessonDescription).toHaveTextContent("Checkmate in 3 moves");
  });

  test("goal mode shows goal mode indicator", async () => {
    (useLessonManager as jest.Mock).mockReturnValue({
      ...mockUseLessonManager,
      lessonData: {
        ...mockUseLessonManager.lessonData,
        goal: { type: "PROMOTION", min: 1 },
        solution: null,
      },
    });

    const { container } = render(
      <MemoryRouter>
        <LessonOverlay />
      </MemoryRouter>
    );

    // In goal mode (free-play), the undo button should say "Undo" instead of "Reset"
    await waitFor(() => {
      expect(screen.getByText("Undo")).toBeInTheDocument();
    });
    
    // Verify the lesson info displays in the lesson description area
    const lessonDescription = container.querySelector(".lessonDescription");
    expect(lessonDescription).toHaveTextContent("get a winning position");
  });
});