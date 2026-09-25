import React from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import Puzzles from "./Puzzles";
import { MemoryRouter } from "react-router";
import { useCookies } from "react-cookie";
import { useChessSocket } from "../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket";

// Mock dependencies
jest.mock("react-cookie", () => ({
  useCookies: jest.fn(),
}));

jest.mock(
  "../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket",
  () => ({
    useChessSocket: jest.fn(),
  })
);

jest.mock("react-router", () => ({
  ...jest.requireActual("react-router"),
  useNavigate: jest.fn(),
}));

// Mock ChessBoard component
jest.mock("../../components/ChessBoard/ChessBoard", () => {
  const React = require("react");
  return React.forwardRef((props: any, ref: any) => (
    <div
      data-testid="chess-board-mock"
      data-disabled={props.disabled ? "true" : "false"}
    >
      ChessBoard Mock
      <button
        onClick={() => props.onMove({ from: "e2", to: "e4" })}
        data-testid="mock-move-btn"
      >
        Make Move
      </button>
      <button
        onClick={() => props.onMove({ from: "e2", to: "e4" })}
        data-testid="mock-drop-btn"
      >
        Simulate Drop
      </button>
      <button
        onClick={() => props.onMove({ from: "e7", to: "e5" })}
        data-testid="mock-final-move-btn"
      >
        Make Final Move
      </button>
      <button
        onClick={() => props.onInvalidMove?.()}
        data-testid="mock-invalid-btn"
      >
        Illegal Move
      </button>
      <div>
        <span>Promotion Options:</span>
        <button
          onClick={() => props.onMove({ from: "a7", to: "a8", promotion: "q" })}
          data-testid="promote-queen"
        >
          Promote to Queen
        </button>
        <button
          onClick={() => props.onMove({ from: "a7", to: "a8", promotion: "r" })}
          data-testid="promote-rook"
        >
          Promote to Rook
        </button>
        <button
          onClick={() => props.onMove({ from: "a7", to: "a8", promotion: "b" })}
          data-testid="promote-bishop"
        >
          Promote to Bishop
        </button>
        <button
          onClick={() => props.onMove({ from: "a7", to: "a8", promotion: "n" })}
          data-testid="promote-knight"
        >
          Promote to Knight
        </button>
      </div>
    </div>
  ));
});

// Mock Modal — exposes data-type so tests can assert which variant is shown,
// and a confirm button that fires both onClose and onConfirm (matching real behaviour).
jest.mock("../../components/modal/Modal", () => {
  const React = require("react");
  return function MockModal({ type, title, message, onConfirm, onClose }: any) {
    return (
      <div data-testid="mock-modal" data-type={type}>
        <span>{title}</span>
        {message && <span>{message}</span>}
        {type !== "loading" && (
          <button
            data-testid="modal-confirm-btn"
            onClick={() => { onClose(); onConfirm?.(); }}
          >
            OK
          </button>
        )}
      </div>
    );
  };
});

// Mock themes service
jest.mock("../../core/services/themesService", () => ({
  themesName: { theme1: "Theme 1" },
  themesDescription: { theme1: "Description 1" },
}));

const mockSocket = {
  connected: true,
  setGameStateWithColor: jest.fn(),
  sendMove: jest.fn(),
  sendLastMove: jest.fn(),
  sendMessage: jest.fn(),
  startNewPuzzle: jest.fn(),
  clearHighlights: jest.fn(),
};

const renderPuzzles = () =>
  render(
    <MemoryRouter>
      <Puzzles />
    </MemoryRouter>
  );

const renderPuzzlesWithTheme = async (theme = "fork") => {
  renderPuzzles();

  fireEvent.click(screen.getByTestId(`puzzle-theme-${theme}`));

  await waitFor(() => {
    expect(screen.getByTestId("chess-board-container")).toBeInTheDocument();
  });
};

const renderWithRoleAndTheme = async (role: string, theme = "fork") => {
  render(
    <MemoryRouter>
      <Puzzles role={role} />
    </MemoryRouter>
  );
  fireEvent.click(screen.getByTestId(`puzzle-theme-${theme}`));
  await waitFor(() => {
    expect(screen.getByTestId("chess-board-container")).toBeInTheDocument();
  });
};

describe("Puzzles Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (useCookies as jest.Mock).mockReturnValue([
      {
        login:
          "header.eyJ1c2VybmFtZSI6InRlc3QtdXNlciIsInJvbGUiOiJzdHVkZW50In0=.signature",
      },
      jest.fn(),
      jest.fn(),
    ]);

    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) {
          props.onRoleAssigned("host");
        }
      }, []);
      return mockSocket;
    });

    global.fetch = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                Moves: "e2e4 e7e5",
                Themes: "theme1",
                Rating: 1500,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;
  });

  test("handles invalid FEN strings", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP w KQkq - 0 1",
                Moves: "e2e4 e7e5",
                Themes: "theme1",
                Rating: 1500,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme();

    // Board is always rendered; invalid FEN means the puzzle won't start
    // but the board container is still present showing the start position.
    await waitFor(() => {
      expect(screen.getByTestId("chess-board-container")).toBeInTheDocument();
    });
    expect(warnSpy).toHaveBeenCalledWith(
      "Invalid or missing FEN:",
      expect.any(String)
    );
    warnSpy.mockRestore();
  });

  test("handles puzzles API network failure gracefully", async () => {
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve([]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme();

    // Board is always rendered, showing the start position while no puzzle is loaded.
    expect(screen.getByTestId("chess-board-container")).toBeInTheDocument();
    expect(screen.queryByText(/Loading puzzle.../i)).not.toBeInTheDocument();
  });

  test("renders puzzle theme selection before the board", () => {
    renderPuzzles();

    expect(screen.getByText("Choose what you want to practice")).toBeInTheDocument();
    expect(screen.getByTestId("puzzle-theme-fork")).toBeInTheDocument();
    expect(screen.queryByTestId("chess-board-container")).not.toBeInTheDocument();
    expect(screen.queryByText(/Loading puzzle.../i)).not.toBeInTheDocument();
  });

  test("renders Puzzles page", async () => {
    await renderPuzzlesWithTheme();

    expect(screen.getByTestId("next-puzzle-button")).toBeInTheDocument();
    expect(screen.getByTestId("hint-button")).toBeInTheDocument();
  });

  test("renders chess board when puzzle is loaded", async () => {
    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });
  });

  test("calls startNewPuzzle if connected and status is empty", async () => {
    (useChessSocket as jest.Mock).mockReturnValue(mockSocket);

    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(mockSocket.startNewPuzzle).toHaveBeenCalled();
    });
  });

  test("handle 'Get New Puzzle' button click", async () => {
    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    const newPuzzleBtn = screen.getByText("Get New Puzzle");
    fireEvent.click(newPuzzleBtn);

    expect(mockSocket.sendMessage).toHaveBeenCalledWith("next puzzle");
  });

  test("shows the theme overview with the puzzle rating on load", async () => {
    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("puzzle-overview")).toBeInTheDocument();
    });

    expect(screen.getByTestId("puzzle-overview")).toHaveTextContent(
      "Puzzle Rating:"
    );
    // The overview is context, so it is broadcast to anyone else in the room.
    expect(mockSocket.sendMessage).toHaveBeenCalledWith(
      expect.stringContaining("Puzzle Rating:")
    );
  });

  test("locks the hint until the player attempts a move, then reveals it", async () => {
    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    // Locked before any attempt.
    expect(screen.getByTestId("hint-button")).toBeDisabled();
    expect(screen.getByTestId("hint-locked-note")).toBeInTheDocument();

    // Any attempt — even an illegal drag — unlocks the hint.
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-invalid-btn"));
    });

    expect(screen.getByTestId("hint-button")).not.toBeDisabled();
    expect(screen.queryByTestId("hint-locked-note")).not.toBeInTheDocument();

    // Clicking it reveals the solution (the piece to move).
    await act(async () => {
      fireEvent.click(screen.getByTestId("hint-button"));
    });

    expect(screen.getByTestId("hint-solution")).toBeInTheDocument();
  });

  test("handles player move correctly", async () => {
    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    const moveBtn = screen.getByTestId("mock-move-btn");

    await act(async () => {
      fireEvent.click(moveBtn);
    });

    expect(mockSocket.sendMove).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "e2",
        to: "e4",
      })
    );
  });

  test("drag and drop interaction triggers move callbacks", async () => {
    jest.useFakeTimers();
    await renderPuzzlesWithTheme("promotion");
    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });
    const dropBtn = screen.getByTestId("mock-drop-btn");
    await act(async () => {
      fireEvent.click(dropBtn);
    });
    expect(mockSocket.sendMove).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "e2",
        to: "e4",
      })
    );
    expect(mockSocket.sendLastMove).toHaveBeenCalledWith("e2", "e4");
    jest.useRealTimers();
  });

  test("pawn promotion offers piece options and forwards chosen promotion", async () => {
    jest.useFakeTimers();
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "8/8/8/8/8/8/P7/4k3 w - - 0 1",
                Moves: "e2e4 a7a8q",
                Themes: "promotion",
                Rating: 1800,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme("promotion");

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    expect(screen.getByTestId("promote-queen")).toBeInTheDocument();
    expect(screen.getByTestId("promote-rook")).toBeInTheDocument();
    expect(screen.getByTestId("promote-bishop")).toBeInTheDocument();
    expect(screen.getByTestId("promote-knight")).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByTestId("promote-queen"));
    });

    expect(mockSocket.sendMove).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "a7",
        to: "a8",
        promotion: "q",
      })
    );
    expect(mockSocket.sendLastMove).toHaveBeenCalledWith("a7", "a8");
    jest.useRealTimers();
  });

  test("pawn underpromotion to rook is accepted and forwarded", async () => {
    jest.useFakeTimers();
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) props.onRoleAssigned("host");
        if (props.onBoardStateChange)
          props.onBoardStateChange("8/8/8/8/8/8/P7/4k3 w - - 0 1");
      }, []);
      return mockSocket;
    });
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "8/8/8/8/8/8/P7/4k3 w - - 0 1",
                Moves: "e2e4 a7a8q",
                Themes: "promotion",
                Rating: 1800,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme("promotion");

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(mockSocket.sendMove).toHaveBeenCalledWith(
        expect.objectContaining({ from: "e2", to: "e4" })
      );
    });

    expect(screen.getByTestId("promote-rook")).toBeInTheDocument();
    jest.useRealTimers();
  });

  test("pawn underpromotion to bishop is accepted and forwarded", async () => {
    jest.useFakeTimers();
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) props.onRoleAssigned("host");
        if (props.onBoardStateChange)
          props.onBoardStateChange("8/8/8/8/8/8/P7/4k3 w - - 0 1");
      }, []);
      return mockSocket;
    });
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "8/8/8/8/8/8/P7/4k3 w - - 0 1",
                Moves: "e2e4 a7a8q",
                Themes: "promotion",
                Rating: 1800,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme("promotion");

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(mockSocket.sendMove).toHaveBeenCalledWith(
        expect.objectContaining({ from: "e2", to: "e4" })
      );
    });

    expect(screen.getByTestId("promote-bishop")).toBeInTheDocument();
    jest.useRealTimers();
  });

  test("pawn underpromotion to knight is accepted and forwarded", async () => {
    jest.useFakeTimers();
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) props.onRoleAssigned("host");
        if (props.onBoardStateChange)
          props.onBoardStateChange("8/8/8/8/8/8/P7/4k3 w - - 0 1");
      }, []);
      return mockSocket;
    });
    (global.fetch as jest.Mock) = jest.fn((url) => {
      if (typeof url === "string" && url.includes("puzzles/random")) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              {
                FEN: "8/8/8/8/8/8/P7/4k3 w - - 0 1",
                Moves: "e2e4 a7a8q",
                Themes: "promotion",
                Rating: 1800,
              },
            ]),
        });
      }
      if (typeof url === "string" && url.includes("timeTracking")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({
              eventId: "123",
              startTime: new Date().toISOString(),
            }),
        });
      }
      if (typeof url === "string" && url.includes("auth/validate")) {
        return Promise.resolve({
          status: 200,
          json: () =>
            Promise.resolve({ username: "test-user", role: "student" }),
          text: () =>
            Promise.resolve(
              JSON.stringify({ username: "test-user", role: "student" })
            ),
        });
      }
      return Promise.reject(new Error(`Unhandled fetch: ${url}`));
    }) as jest.Mock;

    await renderPuzzlesWithTheme("promotion");

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    act(() => {
      jest.advanceTimersByTime(600);
    });

    await waitFor(() => {
      expect(mockSocket.sendMove).toHaveBeenCalledWith(
        expect.objectContaining({ from: "e2", to: "e4" })
      );
    });

    expect(screen.getByTestId("promote-knight")).toBeInTheDocument();
    jest.useRealTimers();
  });

  test("puzzle completion flow shows success modal and loads next puzzle", async () => {
    jest.useFakeTimers();
    await renderPuzzlesWithTheme();
    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });
    act(() => {
      jest.advanceTimersByTime(600);
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("mock-final-move-btn"));
    });
    expect(mockSocket.sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ from: "e7", to: "e5" })
    );
    expect(mockSocket.sendMessage).toHaveBeenCalledWith("puzzle completed");

    act(() => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => {
      expect(screen.getByTestId("mock-modal")).toBeInTheDocument();
      expect(screen.getByTestId("mock-modal")).toHaveAttribute("data-type", "success");
    });

    // Clicking OK closes the modal and sends "next puzzle"
    fireEvent.click(screen.getByTestId("modal-confirm-btn"));

    await waitFor(() => {
      expect(mockSocket.sendMessage).toHaveBeenCalledWith("next puzzle");
    });
    jest.useRealTimers();
  });

  test("disables controls and board when socket is disconnected", async () => {
    const disconnectedSocket = { ...mockSocket, connected: false };
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) props.onRoleAssigned("host");
      }, []);
      return disconnectedSocket;
    });

    await renderPuzzlesWithTheme();

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    const newPuzzleBtn = screen.getByTestId("next-puzzle-button");
    const showHintBtn = screen.getByTestId("hint-button");
    expect(newPuzzleBtn).toBeDisabled();
    expect(showHintBtn).toBeDisabled();
    expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
      "data-disabled",
      "true"
    );
  });

  test("enables controls and board when socket reconnects", async () => {
    let currentSocket = { ...mockSocket, connected: false };
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      React.useEffect(() => {
        if (props.onRoleAssigned) props.onRoleAssigned("host");
      }, []);
      return currentSocket;
    });

    const { rerender } = render(
      <MemoryRouter>
        <Puzzles />
      </MemoryRouter>
    );
    fireEvent.click(screen.getByTestId("puzzle-theme-fork"));

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    expect(screen.getByTestId("next-puzzle-button")).toBeDisabled();
    expect(screen.getByTestId("hint-button")).toBeDisabled();
    expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
      "data-disabled",
      "true"
    );

    currentSocket = { ...mockSocket, connected: true };
    rerender(
      <MemoryRouter>
        <Puzzles />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
        "data-disabled",
        "false"
      );
    });

    expect(screen.getByTestId("next-puzzle-button")).not.toBeDisabled();
    // The hint has its own gate: it stays locked until the player attempts a
    // move, so it is still disabled here even though the socket reconnected.
    expect(screen.getByTestId("hint-button")).toBeDisabled();
  });

  // ==========================================================================
  // Mentor feedback (mentor -> student)
  // ==========================================================================

  test("student does not see the feedback control", async () => {
    await renderPuzzlesWithTheme(); // default role = student
    expect(screen.queryByTestId("give-feedback-button")).not.toBeInTheDocument();
  });

  test("mentor sees the feedback control", async () => {
    await renderWithRoleAndTheme("mentor");
    expect(screen.getByTestId("give-feedback-button")).toBeInTheDocument();
  });

  test("mentor's board is view-only with no solving controls", async () => {
    await renderWithRoleAndTheme("mentor");

    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toBeInTheDocument();
    });

    // The mentor watches only — the board never becomes playable for them.
    expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
      "data-disabled",
      "true"
    );
    // Student-only solving controls are hidden from the mentor.
    expect(screen.queryByTestId("next-puzzle-button")).not.toBeInTheDocument();
    expect(screen.queryByTestId("hint-button")).not.toBeInTheDocument();
    expect(screen.getByTestId("mentor-watch-note")).toBeInTheDocument();
  });

  test("mentor composes and sends feedback over the room channel", async () => {
    await renderWithRoleAndTheme("mentor");

    fireEvent.click(screen.getByTestId("give-feedback-button"));
    fireEvent.change(screen.getByTestId("feedback-textarea"), {
      target: { value: "Look for a fork!" },
    });
    fireEvent.click(screen.getByTestId("send-feedback-button"));

    expect(mockSocket.sendMessage).toHaveBeenCalledWith(
      "MENTOR_FEEDBACK::Look for a fork!"
    );
    expect(screen.getByTestId("feedback-sent-note")).toBeInTheDocument();
  });

  test("student gets a blocking popup that pauses the board until acknowledged", async () => {
    let captured: ((msg: string) => void) | undefined;
    (useChessSocket as jest.Mock).mockImplementation((props) => {
      captured = props.onMessage;
      React.useEffect(() => {
        props.onRoleAssigned?.("host");
      }, []);
      return mockSocket;
    });

    await renderPuzzlesWithTheme(); // student
    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
        "data-disabled",
        "false"
      );
    });

    await act(async () => {
      captured?.("MENTOR_FEEDBACK::Try attacking the king");
    });

    const modal = screen.getByTestId("mock-modal");
    expect(modal).toHaveAttribute("data-type", "info");
    expect(screen.getByText("Try attacking the king")).toBeInTheDocument();
    // Board is paused while the message is up.
    expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
      "data-disabled",
      "true"
    );

    // Acknowledging unblocks the board.
    fireEvent.click(screen.getByTestId("modal-confirm-btn"));
    await waitFor(() => {
      expect(screen.getByTestId("chess-board-mock")).toHaveAttribute(
        "data-disabled",
        "false"
      );
    });
  });
});
