export type Suit = '♥' | '♦' | '♣' | '♠'

export type Rank =
  | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10'
  | 'J' | 'Q' | 'K' | 'A'

export type Card = {
  rank: string;
  suit: string;
}

export type PlayingCard = {
  id: string;
  rank: string;
  suit: string;
  faceUp: boolean;
}

export interface Player {
  id: string;
  hand: Card[];
  faceUpCards: Card[];
  faceDownCards: Card[];
}

export interface GameStateData {
  players: Player[];
  deckLength: number;
  currentPlayerId: string;
}

export interface User {
  id: string;
}

export interface GameData {
  gameId: string;
  users: User[];
}

export interface StartGameData {
  playerNumber: number;
  p1_faceUpCards: Card[];
  p2_faceUpCards: Card[];
}