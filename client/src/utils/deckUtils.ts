import type { PlayingCard } from "../types/game";

const SUITS = ["❤", "♦", "♣", "♠"];
const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function generateDeck(): PlayingCard[] {
  const deck: PlayingCard[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ id: `${rank}-${suit}-${deck.length}`, suit, rank, faceUp: true });
    }
  }
  return deck;
}

export function shuffleDeck(): PlayingCard[] {
  return generateDeck().sort(() => Math.random() - 0.5);
}

export { SUITS, RANKS };