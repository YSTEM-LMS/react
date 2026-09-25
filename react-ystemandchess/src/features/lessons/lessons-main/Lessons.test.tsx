import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import Lessons from "./Lessons";
import { MemoryRouter } from "react-router";
import * as Scenarios from "./Scenarios";
import * as ReactRouter from "react-router";
import { act } from "react-dom/test-utils";
import { useChessSocket } from "../piece-lessons/lesson-overlay/hooks/useChessSocket";

// Mock the Scenarios module
jest.mock("./Scenarios", () => ({
  getScenario: jest.fn(),
  getScenarioByName: jest.fn(),
}));

// Mock react-router's useLocation
jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useLocation: jest.fn(),
}));

// Mock SVGs
jest.mock("./icon_redo.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="icon-redo" />,
}));
jest.mock("./icon_back.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="icon-back" />,
}));
jest.mock("./icon_back_inactive.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="icon-back-inactive" />,
}));
jest.mock("./icon_next.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="icon-next" />,
}));
jest.mock("./icon_next_inactive.svg?react", () => ({
  __esModule: true,
  default: () => <svg data-testid="icon-next-inactive" />,
}));

// Mock PromotionPopup
jest.mock("./PromotionPopup", () => {
  const React = require("react");
  return ({ position, promoteToPiece }: any) => {
    React.useEffect(() => {
      if (position) promoteToPiece(position, "Q");
    }, [position, promoteToPiece]);
    return <div data-testid="promotion-popup" />;
  };
});

// Mock socket.io-client for socket lifecycle tests
jest.mock("socket.io-client", () => {
  const io = jest.fn();
  return { io };
});

describe("Lessons Component", () => {
  const mockBoard = Array(8)
    .fill(null)
    .map(() => Array(8).fill(null));
  // Place a white pawn at a2 (6, 0) for interaction tests
  const interactiveBoard = JSON.parse(JSON.stringify(mockBoard));
  interactiveBoard[6][0] = "wP";

  const mockScenario1 = {
    name: "Scenario 1",
    subSections: [
      {
        name: "Lesson 1.1",
        info: "Info 1.1",
        board: interactiveBoard,
        left_ended: true,
        right_ended: false,
      },
      {
        name: "Lesson 1.2",
        info: "Info 1.2",
        board: mockBoard,
        left_ended: true,
        right_ended: false,
      },
    ],
  };

  const mockScenario2 = {
    name: "Scenario 2",
    subSections: [
      {
        name: "Lesson 2.1",
        info: "Info 2.1",
        board: mockBoard,
        left_ended: false,
        right_ended: true,
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ReactRouter.useLocation as jest.Mock).mockReturnValue({ state: null });

    // Default mock implementation for getScenario
    (Scenarios.getScenario as jest.Mock).mockImplementation((index) => {
      if (index === 0) return mockScenario1;
      if (index === 1) return mockScenario2;
      return mockScenario1;
    });
  });

  test("socket connection and disconnection handling via useChessSocket", async () => {
    const { io } = require("socket.io-client");
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);

    const SocketStatus: React.FC = () => {
      const socket = useChessSocket({
        student: "student",
        serverUrl: "http://localhost",
        onMove: () => {},
      });
      return (
        <div data-testid="socket-connected">{String(socket.connected)}</div>
      );
    };

    const { unmount } = render(<SocketStatus />);

    const connectHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "connect"
    )?.[1];
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "disconnect"
    )?.[1];

    expect(screen.getByTestId("socket-connected")).toHaveTextContent("false");

    act(() => {
      connectHandler && connectHandler();
    });
    expect(screen.getByTestId("socket-connected")).toHaveTextContent("true");

    act(() => {
      disconnectHandler && disconnectHandler("io client disconnect");
    });
    expect(screen.getByTestId("socket-connected")).toHaveTextContent("false");

    unmount();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  test("handles network failures: connect_error and gameerror", async () => {
    const { io } = require("socket.io-client");
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);

    const onError = jest.fn();

    const SocketStatus: React.FC = () => {
      useChessSocket({
        student: "student",
        serverUrl: "http://localhost",
        onMove: () => {},
        onError,
      });
      return null;
    };

    render(<SocketStatus />);

    const connectErrorHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "connect_error"
    )?.[1];
    const gameErrorHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "gameerror"
    )?.[1];

    act(() => {
      connectErrorHandler && connectErrorHandler(new Error("Network down"));
    });
    expect(onError).toHaveBeenCalledWith("Connection failed");

    act(() => {
      gameErrorHandler && gameErrorHandler("Bad move");
    });
    expect(onError).toHaveBeenCalledWith("Bad move");
  });

  test("normalizes empty FEN to starting position", async () => {
    const { io } = require("socket.io-client");
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);

    const onBoardStateChange = jest.fn();

    const FenStatus: React.FC = () => {
      const socket = useChessSocket({
        student: "student",
        serverUrl: "http://localhost",
        onBoardStateChange,
      });
      return <div data-testid="fen">{socket.fen}</div>;
    };

    render(<FenStatus />);

    const boardstateHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "boardstate"
    )?.[1];

    act(() => {
      boardstateHandler &&
        boardstateHandler(JSON.stringify({ boardState: "" }));
    });

    const defaultFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    await waitFor(() => {
      expect(screen.getByTestId("fen")).toHaveTextContent(defaultFen);
    });
    expect(onBoardStateChange).toHaveBeenCalledWith(defaultFen, undefined);
  });

  test("normalizes non-string FEN to starting position", async () => {
    const { io } = require("socket.io-client");
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);

    const onBoardStateChange = jest.fn();

    const FenStatus: React.FC = () => {
      const socket = useChessSocket({
        student: "student",
        serverUrl: "http://localhost",
        onBoardStateChange,
      });
      return <div data-testid="fen">{socket.fen}</div>;
    };

    render(<FenStatus />);

    const boardstateHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "boardstate"
    )?.[1];

    act(() => {
      boardstateHandler &&
        boardstateHandler(JSON.stringify({ boardState: null }));
    });

    const defaultFen =
      "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
    await waitFor(() => {
      expect(screen.getByTestId("fen")).toHaveTextContent(defaultFen);
    });
    expect(onBoardStateChange).toHaveBeenCalledWith(defaultFen, undefined);
  });

  test("shows lesson completion popup and advances after confirm", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const okButton = await screen.findByRole("button", { name: "OK" });
    fireEvent.click(okButton);

    expect(screen.getByTestId("subheading")).toHaveTextContent("Lesson 1.2");
  });

  test("promotes a pawn to a new piece upon reaching last rank", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
      setDragImage: jest.fn(),
    };

    // Move pawn step-by-step from 6-0 to 1-0
    for (let row = 6; row > 1; row--) {
      const sourceSquare = screen.getByTestId(`square-${row}-0`);
      fireEvent.mouseEnter(sourceSquare);
      const pawnImg = within(sourceSquare).getByTestId("piece-wP");
      fireEvent.dragStart(pawnImg, { dataTransfer });

      const targetSquare = screen.getByTestId(`square-${row - 1}-0`);
      fireEvent.dragOver(targetSquare, { preventDefault: () => {} });
      fireEvent.drop(targetSquare);

      await waitFor(() => {
        expect(
          within(targetSquare).getByTestId("piece-wP")
        ).toBeInTheDocument();
      });
    }

    // Final move from 1-0 to 0-0 triggers promotion
    const preFinalSource = screen.getByTestId("square-1-0");
    fireEvent.mouseEnter(preFinalSource);
    const pawnImg = within(preFinalSource).getByTestId("piece-wP");
    fireEvent.dragStart(pawnImg, { dataTransfer });
    const finalSquare = screen.getByTestId("square-0-0");
    fireEvent.dragOver(finalSquare, { preventDefault: () => {} });
    fireEvent.drop(finalSquare);

    // Mocked PromotionPopup auto-selects Queen; verify a queen now occupies the promotion square
    await waitFor(() => {
      const queenImg =
        within(finalSquare).queryByTestId("piece-wQ") ||
        within(finalSquare).queryByTestId("piece-bQ");
      expect(queenImg).not.toBeNull();
    });
  });

  test("renders Lessons component with default scenario", () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 1"
    );
    expect(screen.getByTestId("subheading")).toHaveTextContent("Lesson 1.1");
    expect(screen.getByTestId("lesson-description")).toHaveTextContent(
      "Info 1.1"
    );
    expect(screen.getByTestId("chessboard-L")).toBeInTheDocument();
  });

  test("renders correct lesson buttons", () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const buttons = screen.getAllByTestId("lesson-button");
    expect(buttons).toHaveLength(2);
    expect(buttons[0]).toHaveTextContent("Lesson 1.1");
    expect(buttons[1]).toHaveTextContent("Lesson 1.2");
  });

  test("navigates to next lesson within scenario", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    // Click on the second lesson button
    const buttons = screen.getAllByTestId("lesson-button");
    fireEvent.click(buttons[1]);

    expect(screen.getByTestId("subheading")).toHaveTextContent("Lesson 1.2");
    expect(screen.getByTestId("lesson-description")).toHaveTextContent(
      "Info 1.2"
    );
  });

  test("navigates to next scenario using Next button", () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const nextButton = screen.getByTestId("prevNextLessonButton");
    fireEvent.click(nextButton);

    // Should switch to Scenario 2
    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 2"
    );
    expect(screen.getByTestId("subheading")).toHaveTextContent("Lesson 2.1");
  });

  test("navigates to previous scenario using Back button", () => {
    // Start at Scenario 2
    (Scenarios.getScenario as jest.Mock).mockImplementation((index) => {
      // Mocking behavior where we start at index 1 conceptually
      // But the component starts at index 0 ref.
      // We need to simulate the state where we are at Scenario 2.
      // However, the component initializes `counterRef` to 0.
      // So we can simulate navigating forward then backward.
      if (index === 0) return mockScenario1;
      if (index === 1) return mockScenario2;
      return mockScenario1;
    });

    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    // Move to Scenario 2
    const nextButton = screen.getByTestId("prevNextLessonButton");
    fireEvent.click(nextButton);
    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 2"
    );

    // Move back to Scenario 1
    const backButton = screen.getByTestId("backLessonButton");
    fireEvent.click(backButton);
    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 1"
    );
  });

  test("initializes with passed location state", () => {
    (ReactRouter.useLocation as jest.Mock).mockReturnValue({
      state: { piece: "Scenario 2", lessonNum: 0 },
    });
    (Scenarios.getScenarioByName as jest.Mock).mockReturnValue(mockScenario2);

    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    expect(Scenarios.getScenarioByName).toHaveBeenCalledWith("Scenario 2");
    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 2"
    );
  });

  test("handles reset board", () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const resetButton = screen.getByTestId("reset-lesson");
    fireEvent.click(resetButton);

    // Since we can't easily check internal state, we ensure no crash and elements persist
    expect(screen.getByTestId("chessboard-L")).toBeInTheDocument();
  });

  test("highlights squares on piece hover", () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    // Hover over the pawn at 6-0
    const squareKey = "6-0";
    const square = screen.getByTestId(`square-${squareKey}`);

    fireEvent.mouseEnter(square);

    // Check if highlight style is applied (brightness(80%))
    // Note: The component applies style inline.
    // We expect the square itself or possible moves to be highlighted.
    // For a pawn at 6-0 (white), it moves to 5-0 and 4-0.
    const moveSquare1 = screen.getByTestId("square-5-0");
    const moveSquare2 = screen.getByTestId("square-4-0");

    expect(moveSquare1).toHaveStyle("filter: brightness(80%)");
    expect(moveSquare2).toHaveStyle("filter: brightness(80%)");
  });

  test("drags and drops a chess piece onto a valid square", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    // Source square contains a white pawn at 6-0 by default in mockScenario1
    const sourceSquare = screen.getByTestId("square-6-0");

    // Hover to populate highlightedSquares (valid targets for the pawn)
    fireEvent.mouseEnter(sourceSquare);

    // Create a compatible dataTransfer stub used in drag events
    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
      setDragImage: jest.fn(),
    };

    // Drag the pawn image
    const pawnImg = within(sourceSquare).getByTestId("piece-wP");
    fireEvent.dragStart(pawnImg, { dataTransfer });

    // Drop on the valid forward square (5-0)
    const targetSquare = screen.getByTestId("square-5-0");
    fireEvent.dragOver(targetSquare, { preventDefault: () => {} });
    fireEvent.drop(targetSquare);

    // Assert the pawn moved: now present in target square, absent in source
    await waitFor(() => {
      expect(within(targetSquare).getByTestId("piece-wP")).toBeInTheDocument();
    });
    expect(within(sourceSquare).queryByTestId("piece-wP")).toBeNull();
  });

  test("does not move piece when dropping onto a non-highlighted square", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const dataTransfer = {
      setData: jest.fn(),
      getData: jest.fn(),
      setDragImage: jest.fn(),
    };

    const sourceSquare = screen.getByTestId("square-6-0");
    fireEvent.mouseEnter(sourceSquare);
    const pawnImg = within(sourceSquare).getByTestId("piece-wP");
    fireEvent.dragStart(pawnImg, { dataTransfer });

    const invalidTarget = screen.getByTestId("square-6-1");
    fireEvent.dragOver(invalidTarget, { preventDefault: () => {} });
    fireEvent.drop(invalidTarget);

    await waitFor(() => {
      expect(within(sourceSquare).getByTestId("piece-wP")).toBeInTheDocument();
    });
    expect(within(invalidTarget).queryByTestId("piece-wP")).toBeNull();
  });

  test("drop without draggingPiece does nothing gracefully", async () => {
    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    const sourceSquare = screen.getByTestId("square-6-0");
    const targetSquare = screen.getByTestId("square-5-0");

    fireEvent.drop(targetSquare);

    expect(within(sourceSquare).getByTestId("piece-wP")).toBeInTheDocument();
    expect(within(targetSquare).queryByTestId("piece-wP")).toBeNull();
  });

  test("handles invalid location state gracefully", () => {
    (ReactRouter.useLocation as jest.Mock).mockReturnValue({
      state: { piece: "NonExistent", lessonNum: 0 },
    });
    (Scenarios.getScenarioByName as jest.Mock).mockReturnValue(undefined);

    const consoleErrorSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    render(
      <MemoryRouter>
        <Lessons />
      </MemoryRouter>
    );

    expect(Scenarios.getScenario).toHaveBeenCalledWith(0); // Fallback to default
    expect(screen.getByTestId("piece_description")).toHaveTextContent(
      "Scenario 1"
    );

    consoleErrorSpy.mockRestore();
  });
});
