import React, { useState, useEffect } from "react";
import "./StudentInventory.scss";
import Images from "../../../assets/images/imageImporter";
import { createChessBoard, isInBounds, getPawnMoves, getRookMoves, getKnightMoves, getBishopMoves, getKingMoves, getQueenMoves } from '../../lessons/lessons-main/Lessons'
import LessonSelection from "../../lessons/lessons-selection/LessonsSelection";
import Lessons from '../../lessons/lessons-main/Lessons';
import ChatWidget from '../../../components/ChatWidget/ChatWidget';

type Board = (string | null)[][];
type Piece = {
  color: string;
  type: string;  // e.g., 'Pawn', 'Rook', etc.
};


const StudentInventory = ({ userPortraitSrc, userName }: any) => {
  // bring chessboard
  const [board, setBoard] = useState(initializeBoard()); // Initialize the board with chess pieces
  const [highlightedSquares, setHighlightedSquares] = useState<any>([]);
  const [draggingPiece, setDraggingPiece] = useState<any>(null); // Track which piece is being dragged

  // Description for each Scenarios
  const [scenarioDescription, setScenarioDescription] = useState("");
  const [scenarioDescription_2, setScenarioDescription_2] = useState("");
  const [pieceDescription, setpieceDescription] = useState("");

  // State for showing scenario buttons for pieces
  const [showScenarios, setShowScenarios] = useState({
    pawn: false,
    rook: false,
    bishop: false,
    knight: false,
    queen: false,
    king: false,
  });

  const [showPopup, setShowPopup] = useState(false); // Popup state
  const [trainingStarted, setTrainingStarted] = useState(false); // Training state

  // Initialize the chessboard
  function initializeBoard(): any {
    return [
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
      [null, null, null, null, null, null, null, null],  // Empty row
    ];
  }

  // Popup
  // Function to check if all black pieces are removed
  const checkBlackPieces = () => {
    const blackPieces = board.flat().filter((piece: string[]) => piece && piece[0] === 'b'); // Filter out black pieces
    if (blackPieces.length === 0 && trainingStarted === true) {
      setShowPopup(true); // Show the popup
    }
  };

  // Reset the chessboard when the popup confirm button is clicked
  const handlePopupConfirm = () => {
    if (trainingStarted === true) {
      setShowPopup(false);
      setBoard(initializeBoard()); // Reset the chessboard
      setTrainingStarted(false); // Reset training state
      setScenarioDescription("");
      setScenarioDescription_2("");
      setpieceDescription("");
    }
  };

  // Check for black pieces every time the board state changes
  useEffect(() => {
    checkBlackPieces();
  }, [board]);

  // Update the setupScenario function to handle both Pawn and Rook
  const setupScenario = (piece: any, scenario: any) => {
    const updatedBoard = initializeBoard(); // Reset board

    // setup the board by scenario
    switch (piece) {
      case 'pawn':
        setpieceDescription("Pawn - It moves forward only")
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[4][0] = 'wP'; // a5
            updatedBoard[5][5] = 'bP'; // f3
            setScenarioDescription_2("Pawns move one square only. But when they reach the other side of the board, they become a stronger piece!");
            setTrainingStarted(true); // Mark training as started
            break;
          case 'capture':
            updatedBoard[5][4] = 'wP'; // e3
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[2][2] = 'bP'; // c6
            updatedBoard[1][3] = 'bP'; // d7
            setScenarioDescription_2("A pawn on the second rank can move 2 squares at once!");
            setTrainingStarted(true); // Mark training as started
            break;
          case 'training_1':
            updatedBoard[5][1] = 'wP'; // b3
            updatedBoard[1][2] = 'bP'; // c7
            updatedBoard[2][1] = 'bP'; // b6
            updatedBoard[2][2] = 'bP'; // c6
            updatedBoard[2][3] = 'bP'; // d6
            updatedBoard[4][1] = 'bP'; // b4
            updatedBoard[4][2] = 'bP'; // c4
            setScenarioDescription_2("Capture black pawns and promote!");
            setTrainingStarted(true); // Mark training as started
            break;
          case 'training_2':
            updatedBoard[5][3] = 'wP'; // d3
            updatedBoard[0][2] = 'bP'; // c8
            updatedBoard[1][3] = 'bP'; // d7
            updatedBoard[2][1] = 'bP'; // b6
            updatedBoard[2][4] = 'bP'; // e6
            updatedBoard[3][1] = 'bP'; // b5
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[4][2] = 'bP'; // c4
            setScenarioDescription_2("Capture black pawns and promote!");
            setTrainingStarted(true); // Mark training as started
            break;
          case 'training_3':
            updatedBoard[5][0] = 'wP'; // a3
            updatedBoard[5][2] = 'wP'; // c3
            updatedBoard[5][3] = 'wP'; // d3
            updatedBoard[5][7] = 'wP'; // h3
            updatedBoard[3][1] = 'bP'; // b5
            updatedBoard[3][2] = 'bP'; // c5
            updatedBoard[3][4] = 'bP'; // e5
            updatedBoard[4][3] = 'bP'; // d4
            updatedBoard[4][6] = 'bP'; // g4
            setScenarioDescription_2("No need to promote. Capture all black pawns.");
            setTrainingStarted(true); // Mark training as started
            break;
          case 'special_move':
            updatedBoard[6][4] = 'wP'; // e2
            updatedBoard[2][3] = 'bP'; // d6
            setScenarioDescription_2("A pawn on the second rank can move two squares forward.");
            setTrainingStarted(true); // Mark training as started
            break;
          default:
            break;
        }
        break;
      case 'rook':
        setpieceDescription("Rook - It moves in straight lines")
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[6][4] = 'wR'; // e2
            updatedBoard[2][4] = 'bP'; // e6
            setScenarioDescription_2("Click on the rook to bring it to the pawn!");
            setTrainingStarted(true);
            break;
          case 'training_1':
            updatedBoard[1][2] = 'wR'; // c7
            updatedBoard[3][2] = 'bP'; // c5
            updatedBoard[3][5] = 'bP'; // f5
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'training_2':
            updatedBoard[5][4] = 'wR'; // e3
            updatedBoard[5][1] = 'bP'; // b3
            updatedBoard[6][7] = 'bP'; // h2
            updatedBoard[5][7] = 'bP'; // h3
            setScenarioDescription_2("The fewer moves you make, the better!");
            setTrainingStarted(true);
            break;
          case 'training_3':
            updatedBoard[0][7] = 'wR'; // h8
            updatedBoard[0][5] = 'bP'; // f8
            updatedBoard[7][6] = 'bP'; // g1
            updatedBoard[1][6] = 'bP'; // g7
            updatedBoard[0][6] = 'bP'; // g8
            updatedBoard[1][7] = 'bP'; // h7
            setScenarioDescription_2("The fewer moves you make, the better!");
            setTrainingStarted(true);
            break;
          case 'training_4':
            updatedBoard[1][2] = 'wR'; // c7
            updatedBoard[4][4] = 'wR'; // e4
            updatedBoard[4][0] = 'bP'; // a4
            updatedBoard[5][6] = 'bP'; // g3
            updatedBoard[1][6] = 'bP'; // g7
            updatedBoard[4][7] = 'bP'; // h4
            setScenarioDescription_2("Use two rooks to speed things up!");
            setTrainingStarted(true);
            break;
          case 'final':
            updatedBoard[7][0] = 'wR'; // a1
            updatedBoard[5][5] = 'wR'; // f3
            updatedBoard[1][1] = 'bP'; // b7
            updatedBoard[7][3] = 'bP'; // d1
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[6][5] = 'bP'; // f2
            updatedBoard[1][5] = 'bP'; // f7
            updatedBoard[3][6] = 'bP'; // g4
            updatedBoard[1][6] = 'bP'; // g7
            setScenarioDescription_2("Use two rooks to speed things up!");
            setTrainingStarted(true);
            break;

          default:
            break;
        }
        break;
      case "bishop":
        setpieceDescription("Bishop - It moves diagonally");
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[6][6] = 'wB'; // g2
            updatedBoard[1][7] = 'bP'; // h7
            updatedBoard[4][4] = 'bP'; // e4
            setScenarioDescription_2("Grab all the black pawns!");
            setTrainingStarted(true);
            break;
          case 'training_1':
            updatedBoard[5][1] = 'wB'; // b3
            updatedBoard[6][0] = 'bP'; // a2
            updatedBoard[7][1] = 'bP'; // b1
            updatedBoard[3][1] = 'bP'; // b5
            updatedBoard[7][3] = 'bP'; // d1
            updatedBoard[5][3] = 'bP'; // d3
            updatedBoard[6][4] = 'bP'; // e2
            setScenarioDescription_2("The fewer moves you make, the better!");
            setTrainingStarted(true);
            break;
          case 'training_2':
            updatedBoard[4][2] = 'wB'; // c4
            updatedBoard[4][0] = 'bP'; // a4
            updatedBoard[7][1] = 'bP'; // b1
            updatedBoard[5][1] = 'bP'; // b3
            updatedBoard[6][2] = 'bP'; // c2
            updatedBoard[5][3] = 'bP'; // d3
            updatedBoard[4][4] = 'bP'; // e2
            setScenarioDescription_2("Grab all the black pawns!");
            setTrainingStarted(true);
            break;
          case 'training_3':
            updatedBoard[7][2] = 'wB'; // c1
            updatedBoard[7][5] = 'wB'; // f1
            updatedBoard[5][3] = 'bP'; // d3
            updatedBoard[5][4] = 'bP'; // e3
            updatedBoard[4][3] = 'bP'; // d4
            updatedBoard[4][4] = 'bP'; // e4
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[3][4] = 'bP'; // e5
            setScenarioDescription_2("One light-squared bishop, one dark-squared bishop. You need both!");
            setTrainingStarted(true);
            break;
          case 'training_4':
            updatedBoard[4][3] = 'wB'; // d4
            updatedBoard[7][0] = 'bP'; // a1
            updatedBoard[2][1] = 'bP'; // b6
            updatedBoard[7][2] = 'bP'; // c1
            updatedBoard[5][4] = 'bP'; // e3
            updatedBoard[1][6] = 'bP'; // g7
            updatedBoard[2][7] = 'bP'; // h6
            setScenarioDescription_2("Grab all the black pawns!");
            setTrainingStarted(true);
            break;
          case 'final':
            updatedBoard[5][2] = 'wB'; // c3
            updatedBoard[1][3] = 'wB'; // d7
            updatedBoard[5][0] = 'bP'; // a3
            updatedBoard[6][2] = 'bP'; // c2
            updatedBoard[1][4] = 'bP'; // e7
            updatedBoard[3][5] = 'bP'; // f5
            updatedBoard[2][5] = 'bP'; // f6
            updatedBoard[0][6] = 'bP'; // g8
            updatedBoard[4][7] = 'bP'; // h4
            updatedBoard[1][7] = 'bP'; // h7
            setScenarioDescription_2("One light-squared bishop, one dark-squared bishop. You need both!");
            setTrainingStarted(true);
            break;
          default:
            break;
        }
        break;

      case 'knight':
        setpieceDescription("Knight - It moves in an 'L' shape");
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[4][4] = 'wN'; // e4
            updatedBoard[3][2] = 'bP'; // c5
            updatedBoard[1][3] = 'bP'; // d7
            setScenarioDescription_2("Knights have a fancy way of jumping around!");
            setTrainingStarted(true);
            break;

          case 'training_1':
            updatedBoard[7][1] = 'wN'; // b1
            updatedBoard[5][2] = 'bP'; // c3
            updatedBoard[4][3] = 'bP'; // d4
            updatedBoard[6][4] = 'bP'; // e2
            updatedBoard[5][5] = 'bP'; // f3
            updatedBoard[3][6] = 'bP'; // g5
            updatedBoard[1][5] = 'bP'; // f7
            updatedBoard[0][7] = 'bP'; // h8
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

          case 'training_2':
            updatedBoard[1][2] = 'wN'; // c7
            updatedBoard[2][1] = 'bP'; // b6
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[1][3] = 'bP'; // d7
            updatedBoard[2][4] = 'bP'; // e6
            updatedBoard[4][5] = 'bP'; // f4
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

          case 'training_3':
            updatedBoard[5][5] = 'wN'; // f3
            updatedBoard[6][4] = 'bP'; // e2
            updatedBoard[5][4] = 'bP'; // e3
            updatedBoard[4][4] = 'bP'; // e4
            updatedBoard[6][5] = 'bP'; // f2
            updatedBoard[4][5] = 'bP'; // f4
            updatedBoard[6][6] = 'bP'; // g2
            updatedBoard[5][6] = 'bP'; // g3
            updatedBoard[4][6] = 'bP'; // g4
            setScenarioDescription_2("Knights can jump over obstacles! Escape and vanquish the pawns!");
            setTrainingStarted(true);
            break;

          case 'training_4':
            updatedBoard[5][3] = 'wN'; // d3
            updatedBoard[5][2] = 'bP'; // c3
            updatedBoard[6][4] = 'bP'; // e2
            updatedBoard[4][4] = 'bP'; // e4
            updatedBoard[6][5] = 'bP'; // f2
            updatedBoard[4][5] = 'bP'; // f4
            updatedBoard[2][6] = 'bP'; // g6
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

          case 'final':
            updatedBoard[1][2] = 'wN'; // c7
            updatedBoard[4][1] = 'bP'; // b4
            updatedBoard[3][1] = 'bP'; // b5
            updatedBoard[2][2] = 'bP'; // c6
            updatedBoard[0][2] = 'bP'; // c8
            updatedBoard[4][3] = 'bP'; // d4
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[5][4] = 'bP'; // e3
            updatedBoard[1][4] = 'bP'; // e7
            updatedBoard[3][5] = 'bP'; // f5
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

        }
        break;

      case 'queen':
        setpieceDescription("Queen - Queen = rook + bishop");
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[6][4] = 'wQ'; // e2
            updatedBoard[1][2] = 'bP'; // c7
            updatedBoard[3][4] = 'bP'; // e5
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'training_1':
            updatedBoard[4][3] = 'wQ'; // d4
            updatedBoard[5][0] = 'bP'; // a3
            updatedBoard[6][5] = 'bP'; // f2
            updatedBoard[0][5] = 'bP'; // f8
            updatedBoard[5][7] = 'bP'; // h3
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'training_2':
            updatedBoard[4][2] = 'wQ'; // c4
            updatedBoard[5][0] = 'bP'; // a3
            updatedBoard[2][3] = 'bP'; // d6
            updatedBoard[7][5] = 'bP'; // f1
            updatedBoard[0][5] = 'bP'; // f8
            updatedBoard[5][6] = 'bP'; // g3
            updatedBoard[2][7] = 'bP'; // h6
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'training_3':
            updatedBoard[1][6] = 'wQ'; // g7
            updatedBoard[6][0] = 'bP'; // a2
            updatedBoard[3][1] = 'bP'; // b5
            updatedBoard[5][3] = 'bP'; // d3
            updatedBoard[7][6] = 'bP'; // g1
            updatedBoard[0][6] = 'bP'; // g8
            updatedBoard[6][7] = 'bP'; // h2
            updatedBoard[3][7] = 'bP'; // h5
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'final':
            updatedBoard[7][4] = 'wQ'; // e1
            updatedBoard[2][0] = 'bP'; // a6
            updatedBoard[7][3] = 'bP'; // d1
            updatedBoard[6][5] = 'bP'; // f2
            updatedBoard[2][5] = 'bP'; // f6
            updatedBoard[2][6] = 'bP'; // g6
            updatedBoard[0][6] = 'bP'; // g8
            updatedBoard[7][7] = 'bP'; // h1
            updatedBoard[4][7] = 'bP'; // h4
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

          default:
            break;
        }
        break;

      case 'king':
        setpieceDescription("King - The most important piece");
        setScenarioDescription("Try this!");
        switch (scenario) {
          case 'basic':
            updatedBoard[6][3] = 'wK'; // d2
            updatedBoard[2][3] = 'bP'; // d6
            setScenarioDescription_2("The king is slow.");
            setTrainingStarted(true);
            break;
          case 'training':
            updatedBoard[7][4] = 'wK'; // e1
            updatedBoard[6][2] = 'bP'; // c2
            updatedBoard[5][3] = 'bP'; // d3
            updatedBoard[6][4] = 'bP'; // e2
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;
          case 'final':
            updatedBoard[3][4] = 'wK'; // e5
            updatedBoard[4][2] = 'bP'; // c4
            updatedBoard[3][2] = 'bP'; // c5
            updatedBoard[3][3] = 'bP'; // d5
            updatedBoard[5][4] = 'bP'; // e3
            updatedBoard[5][5] = 'bP'; // f3
            updatedBoard[4][6] = 'bP'; // g4
            setScenarioDescription_2("Grab all the pawns!");
            setTrainingStarted(true);
            break;

          default:
            break;
        }
        break;

      case 'basic_checkmate_1':
        setpieceDescription("piece checkmate 1 Basic checkmates");
        setScenarioDescription("Try this!");

        switch (scenario) {
          case 'queen_and_rook_mate':
            updatedBoard[7][0] = 'wQ'; // a1
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[7][7] = 'wR'; // h1
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your queen and rook to restrict the king and deliver checkmate. Mate in 3 if played perfectly.");
            setTrainingStarted(true);
            break;

          case 'two_rook_mate':
            updatedBoard[7][0] = 'wR'; // a1
            updatedBoard[7][7] = 'wR'; // h1
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your rooks to restrict the king and deliver checkmate. Mate in 4 if played perfectly.");
            setTrainingStarted(true);
            break;

          case 'queen_and_bishop_mate':
            updatedBoard[5][2] = 'wQ'; // c3
            updatedBoard[5][3] = 'wB'; // d3
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your queen and bishop to restrict the king and deliver checkmate. Mate in 5 if played perfectly.");
            setTrainingStarted(true);
            break;

          case 'queen_and_knight_mate':
            updatedBoard[5][2] = 'wQ'; // c3
            updatedBoard[5][3] = 'wN'; // d3
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your queen and knight to restrict the king and deliver checkmate. Mate in 5 if played perfectly.");
            setTrainingStarted(true);
            break;

          case 'queen_mate':
            updatedBoard[7][4] = 'wQ'; // e1
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your queen to restrict the king, force it to the edge of the board and deliver checkmate. The queen can't do it alone, so use your king to help. Mate in 6 if played perfectly.");
            setTrainingStarted(true);
            break;

          case 'rook_mate':
            updatedBoard[7][4] = 'wR'; // e1
            updatedBoard[5][4] = 'wK'; // e3
            updatedBoard[2][3] = 'bK'; // d6
            setScenarioDescription("Use your rook to restrict the king, force it to the edge of the board and deliver checkmate. The rook can't do it alone, so use your king to help. Mate in 11 if played perfectly.");
            setTrainingStarted(true);
            break;

          default:
            console.error("Scenario not found.");
            break;
        }
        break;


      default:
        break;
    }
    setBoard(updatedBoard);
    setHighlightedSquares([]); // clear highlight
  };

  // Button click handlers
  // Generic function to handle all piece button clicks
  const handlePieceClick = (piece: string) => {
    setShowScenarios({
      pawn: piece === 'pawn',
      rook: piece === 'rook',
      bishop: piece === 'bishop',
      knight: piece === 'knight',
      queen: piece === 'queen',
      king: piece === 'king',
    });
  };

  const handlePawnClick = () => handlePieceClick('pawn');
  const handleRookClick = () => handlePieceClick('rook');
  const handleBishopClick = () => handlePieceClick('bishop');
  const handleKnightClick = () => handlePieceClick('knight');
  const handleQueenClick = () => handlePieceClick('queen');
  const handleKingClick = () => handlePieceClick('king');

  // Helper function to get possible moves for a piece
  const getPieceMoves = (piece: any[], position: { split: any; }) => {
    const color = piece[0]; // Get color from the piece (first character)
    switch (piece[1]) {
      case 'P':
        return getPawnMoves(position, color === 'w', board);
      case 'R':
        return getRookMoves(position, color === 'w', board); // Pass color directly
      case 'N':
        return getKnightMoves(position, color === 'w', board); // Pass color directly
      case 'B':
        return getBishopMoves(position, color === 'w', board); // Pass color directly
      case 'K':
        return getKingMoves(position, color === 'w', board); // Pass color directly
      case 'Q':
        return getQueenMoves(position, color === 'w', board); // Pass color directly
      default:
        return [];
    }
  };

  // Handle hover to show possible moves
  const handleSquareHover = (key: { split: any; }) => {
    const [row, col] = key.split('-').map(Number);
    const piece = board[row][col];

    // Clear previous highlights
    setHighlightedSquares([]);

    if (piece) {
      const possibleMoves = getPieceMoves(piece, key);
      setHighlightedSquares(possibleMoves); // Highlight valid move squares
    } else {
      // Check if the square has an opponent's piece
      const targetPiece = board[row][col];
      if (targetPiece && targetPiece[0] !== draggingPiece?.piece[0]) {
        setHighlightedSquares((prev: any) => [...prev, key]); // Highlight the opponent's piece square
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
    if (highlightedSquares.includes(key)) {
      const [startRow, startCol] = draggingPiece.position.split('-').map(Number);
      const [endRow, endCol] = key.split('-').map(Number);

      const targetPiece = board[endRow][endCol];

      if (targetPiece && targetPiece.color !== draggingPiece.piece.color) {
        console.log(`Captured ${targetPiece.type}`);
      }

      const updatedBoard = [...board];
      updatedBoard[endRow][endCol] = draggingPiece.piece; // Move piece to new square
      updatedBoard[startRow][startCol] = null;            // Clear old square

      // Check if the moved piece is a pawn reaching the promotion rank
      if (draggingPiece.piece[1] === 'P' && (endRow === 0 || endRow === 7)) {
        promotePawn(key); // Call promote function
      } else {
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
  function promotePawn(position: any) {
    const [row, col] = position.split('-').map(Number);
    const updatedBoard = [...board];
    const color = board[row][col][0]; // Determine color of the pawn
    const newPiece = color === 'w' ? 'wQ' : 'bQ'; // Promote to Queen

    updatedBoard[row][col] = newPiece; // Update the board with the new queen
    setBoard(updatedBoard); // Set the new board state
  }

  const [activeTab, setActiveTab] = useState("activity");

  const handleTabClick = (tab: any) => {
    setActiveTab(tab);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "activity":
        return (
          <div
            id="inventory-content-activity"
            className="inventory-content active-content"
          >
            <div className="inventory-content-headingbar">
              <h2>Activity</h2>
              <h4>May 2024</h4>
            </div>
            <div className="inventory-content-body">
              <div className="inventory-content-line"></div>
              <article className="inventory-content-timecard">
                <div className="inventory-content-col1"></div>
                <div className="inventory-content-col2">
                  <p>May 24 2024</p>
                  <p>7:00 PM</p>
                </div>
                <div className="inventory-content-col3">
                  <p>Solved 2 tactical puzzles.</p>
                </div>
              </article>
              <article className="inventory-content-timecard">
                <div className="inventory-content-col1"></div>
                <div className="inventory-content-col2">
                  <p>May 19 2024</p>
                  <p>3:00 PM</p>
                </div>
                <div className="inventory-content-col3">
                  <p>Practiced 7 positions on Piece Checkmates I.</p>
                </div>
              </article>
              <article className="inventory-content-timecard">
                <div className="inventory-content-col1"></div>
                <div className="inventory-content-col2">
                  <p>May 16 2024</p>
                  <p>4:00 PM</p>
                </div>
                <div className="inventory-content-col3">
                  <p>Completed 100 games of chess.</p>
                </div>
              </article>
            </div>
          </div>
        );
      case "mentor":
        return (
          <div id="inventory-content-mentor" className="inventoinventory-content active-contentry-content">
            <h2>Mentor</h2>
            <p>This is the content for the Mentor tab.</p>
          </div>
        );
      case "learning":
        return (
          <div id="inventory-content-learning" className="inventory-content active-content">
            <h2>Learning</h2>
            <p>This is the content for the Learning tab.</p>
          </div>
        );
      case "chessLessons":
        return (
          <div id="inventory-content-lessons" className="inventory-content active-content">
            <h2>Learning</h2>
            <p>This is the content for the Lessons tab.</p>
          </div>
        );
      case "games":
        return (
          <div id="inventory-content-games" className="inventory-content active-content">
            <h2>Games</h2>
            <p>This is the content for the Games tab.</p>
          </div>
        );
      case "puzzles":
        return (
          <div id="inventory-content-puzzles" className="inventory-content active-content">
            <h2>Puzzles</h2>
            <p>This is the content for the Puzzles tab.</p>
          </div>
        );
      case "playComputer":
        return (
          <div id="inventory-content-computer" className="inventory-content active-content">
            <h2>Play with Computer</h2>
            <p>This is the content for the Play with Computer tab.</p>
          </div>
        );
      case "recordings":
        return (
          <div id="inventory-content-recordings" className="inventory-content active-content">
            <h2>Recordings</h2>
            <p>This is the content for the Recordings tab.</p>
          </div>
        );
      case "backpack":
        return (
          <div id="inventory-content-backpack" className="inventory-content active-content">
            <h2>Backpack</h2>
            <p>This is the content for the Backpack tab.</p>
          </div>
        );
      default:
        return (
          <div className="inventory-content active-content">
            <h2>Select a tab to view its content.</h2>
          </div>
        );
    }
  };

  return (
    <main id="main-inventory-content">
      <section className="inv-intro">
        <div className="inv-intro-portrait">
          <img
            className="inv-intro-portrait-face"
            src={userPortraitSrc}
            alt="user portrait"
          ></img>
          <img
            className="inv-intro-portrait-camera"
            src={Images.userPortraitCamera}
            alt="user portrait camera icon"
          ></img>
        </div>
        <div className="inv-intro-welcome">
          <h1>Hello, {userName}!</h1>
        </div>
      </section>

      <section className="inv-inventory">
        <div className="inv-inventory-topbar">
          <h2>Your Progress</h2>
        </div>
        <div className="inv-inventory-content-section">
          <nav className="inv-inventory-content-tabs">
            <ul>
              {["activity", "mentor", "learning",
                "chessLessons", "games", "puzzles",
                "playComputer", "recordings", "backpack"].map((tab) => {                  const displayName =
                    tab === "chessLessons"
                      ? "Chess Lessons"
                      : tab === "playComputer"
                        ? "Play with Computer"
                        : tab.charAt(0).toUpperCase() + tab.slice(1);

                  return (
                    <div
                      key={tab}
                      className={`inventory-tab ${activeTab === tab ? "active-tab" : ""}`}
                      onClick={() => handleTabClick(tab)}
                    >
                <img src={Images[`${tab}Icon` as keyof typeof Images]} alt={`${tab} icon`} />
                <li>{displayName}</li>
                    </div>
                  );
                })}
            </ul>
          </nav>

        </div>
      </section>
      <ChatWidget />
    </main>
  );
};

export default StudentInventory;
