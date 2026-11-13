/**
 * Regression test: PuzzleStreak.tsx must import `environment` from the
 * dev/prod selector ("../../environments"), not the dev config file
 * directly ("../../environments/environment") — importing the dev file
 * would make production builds talk to localhost.
 *
 * Mocks the selector and the dev file with distinguishable URLs and checks
 * which one actually reached useChessSocket's serverUrl — a behavioral
 * check, not just a source-text grep, so it still catches a regression if
 * someone re-imports the dev file under a different alias.
 */

jest.mock("../../environments", () => ({
  environment: { urls: { chessServerURL: "SELECTOR_CHESS_URL", middlewareURL: "SELECTOR_MIDDLEWARE_URL" } },
}));

jest.mock("../../environments/environment", () => ({
  environment: { urls: { chessServerURL: "DEV_CHESS_URL", middlewareURL: "DEV_MIDDLEWARE_URL" } },
}));

jest.mock("../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket", () => ({
  useChessSocket: jest.fn(() => ({
    connected: false,
    startNewPuzzle: jest.fn(),
    setGameStateWithColor: jest.fn(),
  })),
}));

jest.mock("react-cookie", () => ({
  useCookies: () => [{}, jest.fn(), jest.fn()],
}));

jest.mock("../../globals", () => ({
  SetPermissionLevel: jest.fn().mockResolvedValue({ username: null }),
}));

jest.mock("../../components/ChessBoard/ChessBoard", () => {
  const React = require("react");
  return {
    __esModule: true,
    default: React.forwardRef(() => <div data-testid="chess-board-mock" />),
  };
});

import { render } from "@testing-library/react";

test("PuzzleStreak uses the environment selector, not the dev config file directly", () => {
  // require() inside the test body, not a top-level import: requiring
  // PuzzleStreak and useChessSocket at module scope left useChessSocket
  // unmocked inside PuzzleStreak's own render (returned undefined) even
  // though the mock was correctly applied everywhere else — a require/
  // import-timing interaction with this Babel/CRA setup, not a real
  // behavioral difference.
  const PuzzleStreak = require("./PuzzleStreak").default;
  const { useChessSocket } = require("../lessons/piece-lessons/lesson-overlay/hooks/useChessSocket");

  render(<PuzzleStreak />);

  expect(useChessSocket).toHaveBeenCalledWith(
    expect.objectContaining({ serverUrl: "SELECTOR_CHESS_URL" }),
  );
});
