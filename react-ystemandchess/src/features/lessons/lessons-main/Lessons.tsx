import React, { useState, useEffect, useRef } from "react";
import RedoIcon from "./icon_redo.svg?react";
import BackIcon from "./icon_back.svg?react";
import BackIconInactive from "./icon_back_inactive.svg?react";
import NextIcon from "./icon_next.svg?react";
import NextIconInactive from "./icon_next_inactive.svg?react";
import { getScenario, getScenarioByName } from "./Scenarios";
import { useLocation } from "react-router";
// @ts-ignore
import PromotionPopup from "./PromotionPopup";

type Board = (string | null)[][];

type LessonsProps = {
  testOverrides?: any;
  styleType?: any;
};

const Lessons = ({ testOverrides, styleType = "page" }: LessonsProps) => {
  // Use memoization to maintain referential equality and avoid unnecessary re-renders
  const isProfile = styleType === "profile";

  const [board, setBoard] = useState(getScenario(0).subSections[0].board); // Initialize the board with chess pieces
  const [highlightedSquares, setHighlightedSquares] = useState([]);
  const [draggingPiece, setDraggingPiece] = useState(null); // Track which piece is being dragged

  const [leftEnded, setLeftEnded] = useState(true); // track whether there are any more previous scenarios
  const [rightEnded, setRightEnded] = useState(false); // track whether there are any more upcoming scenarios
  const [showPopup, setShowPopup] = useState(false); // Popup state

  const [scenario, setScenario] = useState(getScenario(0)); // Current scenario like "pawn", "checkmates", etc.
  const [lesson, setLesson] = useState(getScenario(0).subSections[0]); // Current lesson / subsection under the scenario
  const [lessonEnded, setLessonEnded] = useState(false);

  const counterRef = useRef(0); // Current counter that indexes current scenario in scenariosArray

  const location = useLocation();
  const passedScenarioName = location.state?.piece;
  const passedLessonNum = location.state?.lessonNum;

  const [isPromoting, setIsPromoting] = useState(false); // State to track if a pawn is being promoted
  const [promotionPosition, setPromotionPosition] = useState(null); // Position of the pawn being promoted

  // Initialize the chessboard
  function initializeBoard(): Board {
    return [
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
      [null, null, null, null, null, null, null, null], // Empty row
    ];
  }

  // Popup
  // Function to check if all black pieces are removed
  const checkBlackPieces = () => {
    const blackPieces = board
      .flat()
      .filter((piece) => piece && piece[0] === "b"); // Filter out black pieces
    if (blackPieces.length === 0 && !lessonEnded) {
      setShowPopup(true); // Show the popup
    }
  };

  // Reset the chessboard when the popup confirm button is clicked
  const handlePopupConfirm = () => {
    setShowPopup(false);
    goToNextLesson();
  };

  // Accessibility improvements for popup
  const popupRef = useRef(null);

  useEffect(() => {
    if (showPopup && popupRef.current) {
      popupRef.current.focus();
    }
  }, [showPopup]);

  // Check for black pieces every time the board state changes
  useEffect(() => {
    checkBlackPieces();
  }, [board]);

  // Set up the board for a different lesson, under same scenario
  const setupLesson = (section) => {
    setLessonEnded(false); // start lesson if not
    setLesson(section);
    setBoard(JSON.parse(JSON.stringify(section.board)));
    setHighlightedSquares([]);
  };

  useEffect(() => {
    if (testOverrides?.highlightedSquares) {
      setHighlightedSquares(testOverrides.highlightedSquares);
    }
  }, [testOverrides]);

  useEffect(() => {
    const initializeLesson = () => {
      let scenarioObj;
      if (passedScenarioName && passedLessonNum !== undefined) {
        scenarioObj = getScenarioByName(passedScenarioName);
        if (scenarioObj) {
          const lessonObj = scenarioObj.subSections[passedLessonNum];
          if (lessonObj) {
            setScenario(scenarioObj);
            setLesson(lessonObj);
            setBoard(JSON.parse(JSON.stringify(lessonObj.board)));
            setLeftEnded(lessonObj.left_ended);
            setRightEnded(lessonObj.right_ended);
            return;
          }
          console.error(
            `Lesson ${passedLessonNum} not found in scenario "${passedScenarioName}".`
          );
        } else {
          console.error(`Scenario "${passedScenarioName}" not found.`);
        }
      }

      // fallback to default
      const defaultScenario = getScenario(0);
      const defaultLesson = defaultScenario.subSections[0];
      setScenario(defaultScenario);
      setLesson(defaultLesson);
      setBoard(JSON.parse(JSON.stringify(defaultLesson.board)));
      setLeftEnded(defaultLesson.left_ended);
      setRightEnded(defaultLesson.right_ended);
    };

    initializeLesson();
  }, [location, passedScenarioName, passedLessonNum]);

  // Switching to previous / next scenario, x: -1 or 1
  const setupScenario = (x) => {
    counterRef.current += x; // update scenario index
    setLessonEnded(false); // start lesson if not

    //update lessons & board
    setScenario(getScenario(counterRef.current));
    setLesson(getScenario(counterRef.current).subSections[0]);
    setBoard(
      JSON.parse(
        JSON.stringify(getScenario(counterRef.current).subSections[0].board)
      )
    );

    // check if there are any previous/next scenarios to update button color
    setLeftEnded(getScenario(counterRef.current).subSections[0].left_ended);
    setRightEnded(getScenario(counterRef.current).subSections[0].right_ended);
  };

  // Auto load to next lesson
  const goToNextLesson = () => {
    // get index of current lesson
    const currentLessonIndex = scenario.subSections.findIndex(
      (l) => l.name === lesson.name
    );
    if (currentLessonIndex === -1) {
      console.error("Current lesson not found in scenario.");
      return;
    }

    if (currentLessonIndex >= scenario.subSections.length - 1) {
      // all lessons in this scenario have been displayed, so go to next scenario
      if (!rightEnded) setupScenario(1);
      else {
        // if no more scenarios left
        setBoard(initializeBoard());
        setLessonEnded(true);
      }
    } else {
      // display next lesson in this scenario
      setupLesson(scenario.subSections[currentLessonIndex + 1]);
    }
  };

  // Helper function to get possible moves for a piece
  const getPieceMoves = (piece: string | any[], position: any) => {
    console.log(
      "getPieceMoves called with piece:",
      piece,
      "at position:",
      position
    );
    const color = piece[0]; // Get color from the piece (first character)
    switch (piece[1]) {
      case "P":
        return getPawnMoves(position, color === "w", board);
      case "R":
        return getRookMoves(position, color === "w", board); // Pass color directly
      case "N":
        return getKnightMoves(position, color === "w", board); // Pass color directly
      case "B":
        return getBishopMoves(position, color === "w", board); // Pass color directly
      case "K":
        return getKingMoves(position, color === "w", board); // Pass color directly
      case "Q":
        return getQueenMoves(position, color === "w", board); // Pass color directly
      default:
        return [];
    }
  };

  // Handle hover to show possible moves
  const handleSquareHover = (key: any) => {
    const [row, col] = key.split("-").map(Number);
    const piece = board[row][col];

    // Clear previous highlights
    setHighlightedSquares((prev) => {
      if (prev.length === 0) return prev; // Maintain referential equality to reduce board renders
      return [];
    });

    if (piece) {
      const possibleMoves = getPieceMoves(piece, key);
      setHighlightedSquares(possibleMoves); // Highlight valid move squares
    } else {
      // Check if the square has an opponent's piece
      const targetPiece = board[row][col];
      if (
        targetPiece &&
        draggingPiece?.piece &&
        targetPiece[0] !== draggingPiece.piece.color
      ) {
        setHighlightedSquares((prev) => [...prev, key]); // Highlight the opponent's piece square
      }
    }
  };

  // Handle drag start
  const handleDragStart = (e: any, piece: any, position: any) => {
    setDraggingPiece({ piece, position });
    e.dataTransfer.setDragImage(e.target, 20, 20); // Set the drag image with a specified offset
  };

  // Handle drop on a square
  const handleDrop = (key: any) => {
    console.log("handleDrop called with key:", key);
    if (highlightedSquares.includes(key)) {
      console.log("Square is highlighted, proceeding with drop");

      const [startRow, startCol] =
        draggingPiece !== null
          ? draggingPiece.position.split("-").map(Number)
          : [0, 0];
      const [endRow, endCol] = key.split("-").map(Number);

      const targetPiece = board[endRow][endCol];

      if (
        targetPiece &&
        targetPiece[0] !== (draggingPiece!.piece.color as string)
      ) {
        console.log(`Captured ${targetPiece}`);
      }

      const updatedBoard: any = [...board];
      updatedBoard[endRow][endCol] = draggingPiece ? draggingPiece.piece : ""; // Move piece to new square
      updatedBoard[startRow][startCol] = null; // Clear old square

      // Check if the moved piece is a pawn reaching the promotion rank
      if (
        (draggingPiece.piece === "wP" && endRow === 0) ||
        (draggingPiece.piece === "bP" && endRow === 7)
      ) {
        setPromotionPosition(key); // Set the position for promotion
        setIsPromoting(true); // Set promoting state to true
      } else {
        console.log("Updating board state without promotion");
        setBoard(updatedBoard); // Update board state
      }
    }
    setDraggingPiece(null);
    setHighlightedSquares([]);
  };

  // Handle drag over a square (allow dropping)
  const handleDragOver = (e: any) => {
    e.preventDefault(); // Prevent default behavior to allow dropping
  };

  // Update promotePawn function to set the board state
  function promotePawn(position: any, piece: string) {
    const [row, col] = position.split("-").map(Number);
    const updatedBoard = [...board];
    const color = board[row][col] !== null ? board[row][col]![0] : ""; // Safely accessing the color
    const newPiece = color === "w" ? `w${piece}` : `b${piece}`; // Promote to selected piece

    updatedBoard[row][col] = newPiece; // Update the board with the new queen
    setBoard(updatedBoard); // Set the new board state
    setIsPromoting(false); // Close the promotion popup
  }

  // Reset moved pieces to their original positions to restart the training
  const resetBoard = () => {
    if (lesson) {
      console.log("Resetting board to original lesson state");
      setLessonEnded(false); // start lesson if not
      setBoard(JSON.parse(JSON.stringify(lesson.board)));
    }
  };

  // Determine the classname for the back button based on whether there are previous lessons
  const backButtonClassname = rightEnded
    ? "prevNextLessonButton-inactive prev"
    : "prevNextLessonButton prev";

  // Memoize the calculation of the chess board to avoid unnecessary re-renders
  const chessBoard = React.useMemo(() => {
    return createChessBoard(
      board,
      highlightedSquares,
      setHighlightedSquares,
      handleSquareHover,
      handleDragStart,
      handleDrop,
      handleDragOver,
      draggingPiece
    );
  }, [board, highlightedSquares, draggingPiece]);

  return (
    <div className="py-[3%]">
      <div className="flex flex-row-reverse">
        <div
          className={
            isProfile
              ? "ml-[100px] flex w-full flex-col rounded-xl bg-white/85 p-6 font-bold text-left shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
              : "m-7 w-[87%] rounded-xl bg-white/85 p-4 pl-6 font-bold text-left shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
          }
        >
          <div className="flex items-baseline justify-between">
            <h1 data-testid="piece_description" className={isProfile ? "text-[32px]" : "text-[22px]"}>
              {scenario.name}
            </h1>
            <button
              data-testid="reset-lesson"
              className="flex h-[50px] w-[50px] shrink-0 items-center justify-center rounded-md bg-[#7fcc26] p-1.5 text-4xl text-black transition hover:bg-[#5d971b]"
              onClick={resetBoard}
            >
              <RedoIcon />
            </button>
          </div>

          <h1 data-testid="subheading" className={isProfile ? "mt-1 text-[28px] font-bold" : "mt-1 text-[22px] font-bold"}>
            {lesson.name}
          </h1>
          <p
            data-testid="lesson-description"
            className={isProfile ? "max-h-[500px] overflow-y-auto text-[26px] text-[#7a7a7a]" : "max-h-[500px] overflow-y-auto text-[18px] text-[#7a7a7a]"}
          >
            {lesson.info}
          </p>

          <div className="mt-3 flex justify-between">
            <button
              data-testid="backLessonButton"
              className={
                leftEnded
                  ? "flex h-[35px] w-[100px] items-center gap-1 rounded-md bg-[#d4dddd] px-2 text-slate-400"
                  : "flex h-[35px] w-[100px] items-center gap-1 rounded-md bg-[#d4dddd] px-2 text-black transition hover:bg-[#7a7a7a]"
              }
              onClick={leftEnded ? undefined : () => setupScenario(-1)}
            >
              {leftEnded ? <BackIconInactive className="h-4 w-4 shrink-0" /> : <BackIcon className="h-4 w-4 shrink-0" />}
              <p className="text-[18px] font-bold leading-none">Back</p>
            </button>

            <button
              data-testid="prevNextLessonButton"
              className={
                rightEnded
                  ? "flex h-[35px] w-[100px] items-center justify-end gap-1 rounded-md bg-[#d4dddd] px-2 text-slate-400"
                  : "flex h-[35px] w-[100px] items-center justify-end gap-1 rounded-md bg-[#7fcc26] px-2 text-black transition hover:bg-[#5d971b]"
              }
              onClick={rightEnded ? undefined : () => setupScenario(1)}
            >
              <p className="text-[18px] font-bold leading-none">Next</p>
              {rightEnded ? <NextIconInactive className="h-4 w-4 shrink-0" /> : <NextIcon className="h-4 w-4 shrink-0" />}
            </button>
          </div>
        </div>

        <div className={isProfile ? "ml-[100px]" : "ml-0"}>
          <div className={isProfile ? "ml-[20px] h-full w-[44vw]" : "ml-[40px] h-full w-[44vw]"}>
            <div data-testid="chessboard-L" className="grid h-full w-full grid-cols-8 grid-rows-8 gap-0" style={{ gridTemplateColumns: 'repeat(8, minmax(0, 1fr))', gridTemplateRows: 'repeat(8, minmax(0, 1fr))' }}>
              {chessBoard}
            </div>
            {isPromoting ? (
              <PromotionPopup position={promotionPosition} promoteToPiece={promotePawn} />
            ) : null}
          </div>
        </div>
      </div>

      <div>
        <div className="mt-8 ml-5 flex flex-wrap items-center md:ml-[100px] md:mr-[100px]">
          {scenario.subSections?.map((section, index) => (
            <button
              key={index}
              data-testid="lesson-button"
              className={
                section.name == lesson.name
                  ? "min-h-[40px] min-w-[90px] cursor-pointer rounded-md bg-[#7fcc26] px-4 py-2 text-sm font-bold text-black transition md:min-w-[120px]"
                  : "min-h-[40px] min-w-[90px] cursor-pointer rounded-md bg-[#7a7a7a] px-4 py-2 text-sm font-bold text-white transition hover:bg-slate-600 md:min-w-[120px]"
              }
              onClick={() => setupLesson(section)}
              aria-label={`${section.name}`}
              aria-pressed={section.name == lesson.name}
            >
              {section.name}
            </button>
          ))}
        </div>
      </div>

      {showPopup && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
          <div className="h-[280px] w-[450px] rounded-xl bg-white p-5 text-center">
            <div className="mb-2 flex justify-center">
              <svg width="80" height="80" viewBox="0 0 120 120">
                <circle
                  cx="60"
                  cy="60"
                  r="54"
                  fill="none"
                  stroke="#beea8b"
                  strokeWidth="6"
                  strokeDasharray="410"
                  strokeDashoffset="410"
                  className="animate-pulse"
                ></circle>
                <path
                  d="M35 60 L55 80 L85 40"
                  fill="none"
                  stroke="#beea8b"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray="100"
                  strokeDashoffset="100"
                  className="animate-pulse"
                ></path>
              </svg>
            </div>
            <p className="mb-1 text-[30px] font-bold text-slate-600">Lesson completed</p>
            <p className="text-[20px] text-slate-600">Good job</p>
            <button
              className="mt-4 rounded-lg border-[3px] border-sky-200 bg-sky-500 px-6 py-2 text-white transition hover:bg-sky-600"
              onClick={handlePopupConfirm}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Create chess board
export function createChessBoard(
  board: any[][],
  highlightedSquares: string | string[],
  setHighlightedSquares: any,
  handleSquareHover: any,
  handleDragStart: any,
  handleDrop: any,
  handleDragOver: any,
  draggingPiece: any
) {
  const rows = 8;
  const cols = 8;
  const chessBoard = [];

  const files = ["a", "b", "c", "d", "e", "f", "g", "h"]; // a-h labels
  const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"]; // 1-8 labels, reversed

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const key = `${i}-${j}`;
      const isLightSquare = (i + j) % 2 === 0;
      const squareColor = isLightSquare ? "#f0d9b5" : "#b58863";

      const piece = board[i][j]; // Get piece at current position
      const pieceImage = piece
        ? `/assets/images/chesspieces/wikipedia/${piece}.png`
        : null; // Construct image path

      chessBoard.push(
        <div
          key={key}
          className="relative h-full w-full"
          data-testid={`square-${key}`}
          style={{
            backgroundColor: squareColor,
            filter: highlightedSquares.includes(key)
              ? "brightness(80%)"
              : "brightness(100%)",
            transition: "filter 0.4s ease",
          }}
          onMouseEnter={() => handleSquareHover(key)} // Show possible moves on hover
          onMouseLeave={() =>
            setHighlightedSquares((prev) => {
              if (prev.length === 0) return prev; // Maintain referential equality
              return [];
            })
          } // Clear highlights when mouse leaves
          onDrop={() => handleDrop(key)} // Handle drop
          onDragOver={handleDragOver} // Allow drag-over for dropping
        >
          {highlightedSquares.includes(key) && (
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/70" />
          )}
          {piece &&
            piece[0] !== draggingPiece?.piece[0] &&
            highlightedSquares.includes(key) && (
              <div className="pointer-events-none absolute left-1/2 top-1/2 h-[40%] w-[40%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-500/70" />
            )}
          {/* Add rank and file labels */}
          {j === 0 && <span className="absolute left-1 top-1 text-[10px] font-semibold text-slate-700 md:text-xs">{ranks[i]}</span>}{" "}
          {/* Rank labels (1-8) */}
          {i === 7 && <span className="absolute bottom-1 right-1 text-[10px] font-semibold text-slate-700 md:text-xs">{files[j]}</span>}{" "}
          {/* File labels (a-h) */}
          {/* Display piece image */}
          {pieceImage && (
            <img
              src={pieceImage}
              alt={piece}
              data-testid={`piece-${piece}`}
              className="h-[90%] w-[90%] object-contain"
              draggable // Allow dragging
              onDragStart={(e) => handleDragStart(e, piece, key)} // Dragging starts
            />
          )}
        </div>
      );
    }
  }
  return chessBoard;
}

// Helper to check if a position is within board bounds
export function isInBounds(row: number, col: number) {
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Pawn movement (handles both white and black)
export function getPawnMoves(
  position: { split: any },
  isWhite: boolean,
  board: Board
) {
  // Prevent black pawns from moving
  if (!isWhite) return [];

  const [row, col] = position.split("-").map(Number);
  const direction = -1; // White pawns only move upwards
  const possibleMoves = [];

  // Check forward move (1 square)
  if (
    isInBounds(row + direction, col) &&
    board[row + direction][col] === null
  ) {
    possibleMoves.push(`${row + direction}-${col}`);

    // Check forward move (2 squares) if in starting position
    const startingRow = 6; // White pawns start at row 6
    if (
      row === startingRow &&
      isInBounds(row + 2 * direction, col) &&
      board[row + 2 * direction][col] === null
    ) {
      possibleMoves.push(`${row + 2 * direction}-${col}`);
    }
  }

  // Check for captures (diagonal moves)
  const captureMoves = [
    { row: row + direction, col: col - 1 }, // Capture left
    { row: row + direction, col: col + 1 }, // Capture right
  ];

  captureMoves.forEach(({ row, col }) => {
    if (isInBounds(row, col) && board[row][col] && board[row][col][0] !== "w") {
      // Check color
      possibleMoves.push(`${row}-${col}`); // Add capture move if there's an opponent's piece
    }
  });

  // Check for promotion if the pawn reaches the last row
  if (row === 0) {
    return possibleMoves.concat("promote"); // Indicate promotion to queen for white
  }

  return possibleMoves;
}

// Rook movement (handles both white and black)
export function getRookMoves(
  position: { split: any },
  isWhite: boolean,
  board: Board
) {
  // Prevent black pieces from moving
  if (!isWhite) return [];

  const [row, col] = position.split("-").map(Number);
  const moves: string[] = [];

  // Horizontal and vertical movement
  const directions = [
    { r: 1, c: 0 }, // Down
    { r: -1, c: 0 }, // Up
    { r: 0, c: 1 }, // Right
    { r: 0, c: -1 }, // Left
  ];

  directions.forEach(({ r, c }) => {
    for (let i = 1; i < 8; i++) {
      const newRow = row + r * i;
      const newCol = col + c * i;
      if (!isInBounds(newRow, newCol)) break; // Stop if out of bounds

      if (!board[newRow][newCol]) {
        moves.push(`${newRow}-${newCol}`);
      } else {
        if (board[newRow][newCol][0] !== "w") {
          moves.push(`${newRow}-${newCol}`); // Capture move
        }
        break; // Stop if there's a piece blocking the path
      }
    }
  });

  return moves;
}

// Knight movement (handles both white and black)
export function getKnightMoves(
  position: { split: any },
  isWhite: boolean,
  board: Board
) {
  // Prevent black pieces from moving
  if (!isWhite) return [];

  const [row, col] = position.split("-").map(Number);
  const moves = [];
  const knightMoves = [
    [row - 2, col - 1],
    [row - 2, col + 1],
    [row - 1, col - 2],
    [row - 1, col + 2],
    [row + 1, col - 2],
    [row + 1, col + 2],
    [row + 2, col - 1],
    [row + 2, col + 1],
  ];

  for (const [r, c] of knightMoves) {
    if (isInBounds(r, c) && (!board[r][c] || board[r][c][0] !== "w")) {
      moves.push(`${r}-${c}`);
    }
  }

  return moves;
}

// Bishop movement (handles both white and black)
export function getBishopMoves(
  position: { split: any },
  isWhite: boolean,
  board: Board
) {
  // Prevent black pieces from moving
  if (!isWhite) return [];

  const [row, col] = position.split("-").map(Number);
  const moves: string[] = [];

  // Diagonal movement (Top-right, Top-left, Bottom-right, Bottom-left)
  const directions = [
    { r: 1, c: 1 }, // Bottom-right
    { r: 1, c: -1 }, // Bottom-left
    { r: -1, c: 1 }, // Top-right
    { r: -1, c: -1 }, // Top-left
  ];

  directions.forEach(({ r, c }) => {
    for (let i = 1; i < 8; i++) {
      const newRow = row + r * i;
      const newCol = col + c * i;
      if (!isInBounds(newRow, newCol)) break; // Stop if out of bounds

      if (!board[newRow][newCol]) {
        moves.push(`${newRow}-${newCol}`);
      } else {
        if (board[newRow][newCol][0] !== "w") {
          moves.push(`${newRow}-${newCol}`); // Capture move
        }
        break; // Stop if there's a piece blocking the path
      }
    }
  });

  return moves;
}

// King movement (handles both white and black)
export function getKingMoves(
  position: { split: any },
  isWhite: boolean,
  board: Board
) {
  // Prevent black pieces from moving
  if (!isWhite) return [];

  const [row, col] = position.split("-").map(Number);
  const moves = [];
  const kingMoves = [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1], // Vertical and horizontal
    [row - 1, col - 1],
    [row - 1, col + 1],
    [row + 1, col - 1],
    [row + 1, col + 1], // Diagonal
  ];

  for (const [r, c] of kingMoves) {
    if (isInBounds(r, c) && (!board[r][c] || board[r][c][0] !== "w")) {
      moves.push(`${r}-${c}`);
    }
  }

  return moves;
}

// Queen movement (combines Rook + Bishop) - handles both white and black
export function getQueenMoves(position: any, isWhite: boolean, board: Board) {
  // Prevent black pieces from moving
  if (!isWhite) return [];

  return [
    ...getRookMoves(position, isWhite, board),
    ...getBishopMoves(position, isWhite, board),
  ];
}

export default Lessons;
