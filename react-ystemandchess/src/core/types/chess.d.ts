export type PieceSymbol = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PlayerColor = "white" | "black";
export type GameMode = "regular" | "puzzle" | "lesson";
export type UserRole = "mentor" | "student" | "host" | "guest";

export interface Move {
  from: string;
  to: string;
  promotion?: string;
  piece?: string;
  captured?: string;
  flags?: string;
  computerMove?: boolean;
  username?: string;
  credentials?: string;
}

export interface GameConfig {
  mentor: string;
  student: string;
  role: UserRole;
  credentials?: string;
}

export interface BoardState {
  boardState?: string;
  fen?: string;
  color?: PlayerColor;
  move?: Move;
  hints?: string;
}

export interface MousePosition {
  x: number;
  y: number;
}

export interface LessonData {
  startFen: string;
  endFen: string;
  name: string;
  info: string;
  lessonNum: number;
  moves?: Move[];
}

export interface PuzzleData {
  fen: string;
  moves: Move[];
  hints?: string;
  rating?: number;
}
