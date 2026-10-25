import { render, screen, act } from "@testing-library/react";
import { useChessSocket } from "./useChessSocket";

jest.mock("socket.io-client");

const SocketStatus = () => {
  const socket = useChessSocket({
    student: "test-student",
    serverUrl: "http://localhost",
    onMove: () => {},
  });
  return <div data-testid="socket-connected">{String(socket.connected)}</div>;
};

describe("useChessSocket connection/disconnection", () => {
  it("updates connected state on connect/disconnect and disconnects on unmount", () => {
    const { io } = require("socket.io-client");
    const mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    io.mockReturnValue(mockSocket);

    const { unmount } = render(<SocketStatus />);

    const connectHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "connect",
    )?.[1];
    const disconnectHandler = mockSocket.on.mock.calls.find(
      (c: any[]) => c[0] === "disconnect",
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
});
