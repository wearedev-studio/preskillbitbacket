export type GameType = 'Chess' | 'Checkers' | 'Backgammon' | 'Tic-Tac-Toe' | 'Durak' | 'Domino' | 'Dice' | 'Bingo';

export interface IGameRecord {
  _id: string;
  gameName: 'Checkers' | 'Chess' | 'Backgammon' | 'Tic-Tac-Toe' | 'Durak' | 'Domino' | 'Dice' | 'Bingo';
  status: 'WON' | 'LOST' | 'DRAW';
  amountChanged: number;
  opponent: string;
  createdAt: string;
}

export interface ITransaction {
  _id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL' | 'WAGER_LOSS' | 'WAGER_WIN';
  status: 'COMPLETED' | 'PENDING' | 'CANCELLED';
  amount: number;
  createdAt: string;
}

// Domino-specific types
export interface Domino {
  left: number;
  right: number;
  id: string;
}

export interface PlacedDomino extends Domino {
  position: { x: number; y: number };
  orientation: 'horizontal' | 'vertical';
  rotation: number; // 0, 90, 180, 270 degrees
}

export interface DominoGameState {
  players: {
    hand: Domino[];
    score: number;
  }[];
  boneyard: Domino[];
  board: Domino[];
  placedDominoes: PlacedDomino[]; // Visual chain representation
  currentPlayerIndex: number;
  turn: string;
  gameOver: boolean;
  winner?: string;
  lastAction?: string;
  mustDraw: boolean;
  gamePhase: 'DEALING' | 'PLAYING' | 'GAME_OVER';
  chainEnds: {
    left: { value: number; position: { x: number; y: number }; direction: 'up' | 'down' | 'left' | 'right' };
    right: { value: number; position: { x: number; y: number }; direction: 'up' | 'down' | 'left' | 'right' };
  };
}