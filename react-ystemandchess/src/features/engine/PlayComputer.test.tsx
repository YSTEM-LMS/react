import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import PlayComputer from './PlayComputer';
import { io } from 'socket.io-client';

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useLocation: jest.fn(),
}));

import * as ReactRouter from 'react-router';

const renderComponent = () => render(<PlayComputer />);

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock ChessBoard component
jest.mock('../../components/ChessBoard/ChessBoard', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      React.useImperativeHandle(ref, () => ({
        setPosition: jest.fn(),
        highlightMove: jest.fn(),
        reset: jest.fn(),
        flip: jest.fn(),
      }));
      return (
        <div data-testid="chessboard" data-orientation={props.orientation}>
          <button
            data-testid="make-move-button"
            onClick={() => props.onMove && props.onMove({ from: 'e2', to: 'e4' })}
          >
            Make Move
          </button>
        </div>
      );
    }),
  };
});

// Mock environment
jest.mock('../../environments', () => ({
  environment: {
    urls: {
      stockfishServerURL: 'http://localhost:8080',
    },
  },
}));

describe('PlayComputer', () => {
  let mockSocket: any;
  let mockOn: jest.Mock;
  let mockEmit: jest.Mock;
  let mockDisconnect: jest.Mock;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock useLocation
    (ReactRouter.useLocation as jest.Mock).mockReturnValue({ key: 'default', state: null });

    // Create mock socket methods
    mockOn = jest.fn();
    mockEmit = jest.fn();
    mockDisconnect = jest.fn();

    // Create mock socket object
    mockSocket = {
      on: mockOn,
      emit: mockEmit,
      disconnect: mockDisconnect,
    };

    // Mock io to return our mock socket
    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should render the component', () => {
      renderComponent();
      expect(screen.getByText('Game Settings')).toBeInTheDocument();
    });

    it('should show settings panel on initial render', () => {
      renderComponent();
      expect(screen.getByText('Game Settings')).toBeInTheDocument();
      expect(screen.getByText('Play as')).toBeInTheDocument();
      expect(screen.getByText('Difficulty')).toBeInTheDocument();
    });

    it('should connect to Stockfish server on mount', () => {
      renderComponent();
      expect(io).toHaveBeenCalledWith('http://localhost:8080', {
        transports: ['websocket'],
        reconnection: true,
      });
    });

    it('should register socket event listeners', () => {
      renderComponent();

      const registeredEvents = mockOn.mock.calls.map(call => call[0]);
      expect(registeredEvents).toContain('connect');
      expect(registeredEvents).toContain('disconnect');
      expect(registeredEvents).toContain('session-started');
      expect(registeredEvents).toContain('session-error');
      expect(registeredEvents).toContain('evaluation-complete');
      expect(registeredEvents).toContain('evaluation-error');
    });
  });

  describe('Socket Connection', () => {
    it('should update connected state when socket connects', () => {
      renderComponent();

      // Find and call the 'connect' event handler
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Start button should be enabled
      const startButton = screen.getByText('Start Game');
      expect(startButton).not.toBeDisabled();
    });

    it('should show connecting message when not connected', () => {
      renderComponent();

      // Before connect event, button should show "Connecting..."
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });

    it('should handle disconnect event', () => {
      renderComponent();

      // Connect first
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Then disconnect
      const disconnectHandler = mockOn.mock.calls.find(call => call[0] === 'disconnect')?.[1];
      act(() => {
        disconnectHandler();
      });

      // Should show connecting again
      expect(screen.getByText('Connecting...')).toBeInTheDocument();
    });
  });

  describe('Game Settings', () => {
    it('should allow selecting white as player color', () => {
      renderComponent();

      const whiteButton = screen.getByText('White');
      fireEvent.click(whiteButton);

      expect(whiteButton.className).toContain('active');
    });

    it('should allow selecting black as player color', () => {
      renderComponent();

      const blackButton = screen.getByText('Black');
      fireEvent.click(blackButton);

      expect(blackButton.className).toContain('active');
    });

    it('should allow selecting difficulty levels', () => {
      renderComponent();

      const easyButton = screen.getByText('Easy');
      const mediumButton = screen.getByText('Medium');
      const hardButton = screen.getByText('Hard');
      const expertButton = screen.getByText('Expert');
      const masterButton = screen.getByText('Master');

      fireEvent.click(mediumButton);
      expect(mediumButton.className).toContain('active');

      fireEvent.click(hardButton);
      expect(hardButton.className).toContain('active');
    });

    it('should start session when start button is clicked', () => {
      renderComponent();

      // Connect socket first
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      expect(mockEmit).toHaveBeenCalledWith('start-session', expect.objectContaining({
        sessionType: 'player-vs-computer',
        fen: expect.any(String),
      }));
    });

    it('should hide settings panel after starting game', async () => {
      renderComponent();

      // Connect
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Start session
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      // Trigger session-started event
      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      await waitFor(() => {
        expect(screen.queryByText('Game Settings')).not.toBeInTheDocument();
      });
    });
  });

  describe('Session Management', () => {
    it('should handle session-started event', () => {
      renderComponent();

      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];

      act(() => {
        sessionStartedHandler({ success: true, id: 'test-session-id' });
      });

      // Session started, no error should be shown
      expect(screen.queryByText(/Failed to start session/)).not.toBeInTheDocument();
    });

    it('should handle session-error event', () => {
      // Mock window.alert
      const alertMock = jest.spyOn(window, 'alert').mockImplementation();

      renderComponent();

      const sessionErrorHandler = mockOn.mock.calls.find(call => call[0] === 'session-error')?.[1];

      act(() => {
        sessionErrorHandler({ error: 'Session creation failed' });
      });

      expect(alertMock).toHaveBeenCalledWith('Failed to start session: Session creation failed');

      alertMock.mockRestore();
    });
  });

  describe('Game Play', () => {
    const setupGame = () => {
      const { container } = renderComponent();

      // Connect
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Start session as white
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      // Trigger session-started
      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      return container;
    };

    it('should render chessboard after game starts', async () => {
      setupGame();

      await waitFor(() => {
        expect(screen.getByTestId('chessboard')).toBeInTheDocument();
      });
    });

    it('should render control buttons after game starts', async () => {
      setupGame();

      await waitFor(() => {
        expect(screen.getByText('Undo')).toBeInTheDocument();
        expect(screen.getByText('Reset')).toBeInTheDocument();
        expect(screen.getByText('New Game')).toBeInTheDocument();
        expect(screen.getByText('Flip Board')).toBeInTheDocument();
      });
    });

    it('should handle player move and request computer move', async () => {
      setupGame();

      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });

      const moveButton = screen.getByTestId('make-move-button');

      act(() => {
        fireEvent.click(moveButton);
      });

      // Should emit update-fen
      expect(mockEmit).toHaveBeenCalledWith('update-fen', expect.objectContaining({
        fen: expect.any(String),
      }));

      // Should request evaluation
      expect(mockEmit).toHaveBeenCalledWith('evaluate-fen', expect.objectContaining({
        fen: expect.any(String),
        move: '',
        level: expect.any(Number),
      }));
    });

    it('should handle computer move from evaluation-complete event', async () => {
      setupGame();

      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });

      // Trigger computer move
      const evaluationCompleteHandler = mockOn.mock.calls.find(
        call => call[0] === 'evaluation-complete'
      )?.[1];

      act(() => {
        evaluationCompleteHandler({
          mode: 'move',
          move: 'e7e5',
          moveDetails: { from: 'e7', to: 'e5' },
          newFEN: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        });
      });

      // Should hide thinking indicator
      await waitFor(() => {
        expect(screen.queryByText('Computer is thinking...')).not.toBeInTheDocument();
      });
    });

    it('should handle evaluation error', () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation();

      setupGame();

      const evaluationErrorHandler = mockOn.mock.calls.find(
        call => call[0] === 'evaluation-error'
      )?.[1];

      act(() => {
        evaluationErrorHandler({ error: 'Engine timeout' });
      });

      expect(alertMock).toHaveBeenCalledWith('Engine error: Engine timeout');

      alertMock.mockRestore();
    });
  });

  describe('Game Controls', () => {
    const setupGameWithMoves = async () => {
      const container = renderComponent();

      // Connect
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Start session
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      await waitFor(() => {
        expect(screen.getByTestId('make-move-button')).toBeInTheDocument();
      });

      // Make a player move
      const moveButton = screen.getByTestId('make-move-button');
      act(() => {
        fireEvent.click(moveButton);
      });

      // Simulate computer response
      const evaluationCompleteHandler = mockOn.mock.calls.find(
        call => call[0] === 'evaluation-complete'
      )?.[1];
      act(() => {
        evaluationCompleteHandler({
          mode: 'move',
          move: 'e7e5',
          moveDetails: { from: 'e7', to: 'e5' },
          newFEN: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
        });
      });

      return container;
    };

    it('should reset game when reset button is clicked', async () => {
      await setupGameWithMoves();

      const resetButton = screen.getByText('Reset');

      act(() => {
        fireEvent.click(resetButton);
      });

      expect(mockEmit).toHaveBeenCalledWith('update-fen', expect.objectContaining({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      }));
    });

    it('should undo both player and computer moves', async () => {
      await setupGameWithMoves();

      const undoButton = screen.getByText('Undo');
      expect(undoButton).not.toBeDisabled();

      act(() => {
        fireEvent.click(undoButton);
      });

      // Should emit update-fen with position after undoing 2 moves
      expect(mockEmit).toHaveBeenCalledWith('update-fen', expect.any(Object));
    });

    it('should disable undo button when no moves have been made', async () => {
      const container = renderComponent();

      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      await waitFor(() => {
        const undoButton = screen.getByRole('button', { name: /undo/i });
        expect(undoButton).toBeDisabled();
      });
    });

    it('should start new game when New Game button is clicked', async () => {
      await setupGameWithMoves();

      const newGameButton = screen.getByText('New Game');

      act(() => {
        fireEvent.click(newGameButton);
      });

      // Should show settings panel again
      await waitFor(() => {
        expect(screen.getByText('Game Settings')).toBeInTheDocument();
      });
    });
  });

  describe('Game Status Detection', () => {
    it('should detect checkmate', async () => {
      // Mock isCheckmate to return true
      const chess = require('chess.js').Chess;
      jest.spyOn(chess.prototype, 'isCheckmate').mockReturnValue(true);

      renderComponent();

      const connectHandler = mockOn.mock.calls.find(c => c[0] === 'connect')?.[1];
      act(() => connectHandler());

      fireEvent.click(screen.getByText('Start Game'));

      const sessionStartedHandler = mockOn.mock.calls.find(c => c[0] === 'session-started')?.[1];
      act(() => sessionStartedHandler({ success: true, id: 'test-id' }));

      const evaluationCompleteHandler = mockOn.mock.calls.find(
        c => c[0] === 'evaluation-complete'
      )?.[1];

      act(() => evaluationCompleteHandler({
        mode: 'move',
        move: 'e2e4',
        moveDetails: { from: 'e2', to: 'e4' },
        newFEN: 'any-fen',
      }));

      await waitFor(() => {
        expect(screen.getByText(/Checkmate/)).toBeInTheDocument();
      });

      chess.prototype.isCheckmate.mockRestore();
    });
  });

  describe('Component Cleanup', () => {
    it('should disconnect socket on unmount', () => {
      const { unmount } = renderComponent();

      unmount();

      expect(mockDisconnect).toHaveBeenCalled();
    });
  });

  describe('Black Player Auto-Start', () => {
    it('should request computer move immediately when player is black', () => {
      renderComponent();

      // Connect
      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      // Select black before starting game
      const blackButton = screen.getByText('Black');
      fireEvent.click(blackButton);

      // Start game
      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      // Find the session-started handler
      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      
      // Clear emit calls before triggering session-started
      mockEmit.mockClear();

      // Trigger session-started event
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      // Now evaluate-fen should have been called
      expect(mockEmit).toHaveBeenCalledWith(
        'evaluate-fen',
        expect.objectContaining({
          fen: expect.any(String),
          move: '',
          level: expect.any(Number),
        })
      );
    });
  });

  describe('Move History', () => {
    it('should display move history section', async () => {
      const container = renderComponent();

      const connectHandler = mockOn.mock.calls.find(call => call[0] === 'connect')?.[1];
      act(() => {
        connectHandler();
      });

      const startButton = screen.getByText('Start Game');
      fireEvent.click(startButton);

      const sessionStartedHandler = mockOn.mock.calls.find(call => call[0] === 'session-started')?.[1];
      act(() => {
        sessionStartedHandler({ success: true, id: 'test-id' });
      });

      await waitFor(() => {
        expect(screen.getByText('Move History')).toBeInTheDocument();
      });
    });
  });
});
