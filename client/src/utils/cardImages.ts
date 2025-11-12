import type { PlayingCard } from "@/types/game";

const BASE = import.meta.env.BASE_URL || "/";

function stripVS(s: string) {
  // remove variation selectors that can sneak in with emoji suits
  return s.replace(/\uFE0F/g, "");
}

function normSuit(raw: unknown): "hearts" | "diamonds" | "clubs" | "spades" | undefined {
  const s = stripVS(String(raw ?? "")).trim().toLowerCase();

  // common forms
  if (s === "❤" || s === "♥" || s === "heart" || s === "hearts" || s === "h") return "hearts";
  if (s === "♦" || s === "diamond" || s === "diamonds" || s === "d") return "diamonds";
  if (s === "♣" || s === "club" || s === "clubs" || s === "c") return "clubs";
  if (s === "♠" || s === "spade" || s === "spades" || s === "s") return "spades";

  // title-case variants (e.g., "Hearts")
  if (s === "hearts") return "hearts";
  if (s === "diamonds") return "diamonds";
  if (s === "clubs") return "clubs";
  if (s === "spades") return "spades";

  return undefined;
}

function normRank(raw: unknown): string | undefined {
  const r = String(raw ?? "").trim();
  const lower = r.toLowerCase();

  // numeric 2..10
  const asNum = Number(r);
  if (!Number.isNaN(asNum)) {
    if (asNum >= 2 && asNum <= 10) return String(asNum);
    if (asNum === 11) return "jack";
    if (asNum === 12) return "queen";
    if (asNum === 13) return "king";
    if (asNum === 14 || asNum === 1) return "ace"; // allow 1->Ace too
  }

  // common faces / aliases
  if (lower === "a" || lower === "ace") return "ace";
  if (lower === "k" || lower === "king") return "king";
  if (lower === "q" || lower === "queen") return "queen";
  if (lower === "j" || lower === "jack") return "jack";
  if (lower === "t") return "10";

  // already-normalized numeric strings "2".."10"
  if (/^(?:[2-9]|10)$/.test(r)) return r;

  return undefined;
}

export function getCardImagePath(card: PlayingCard): string {
  const suit = normSuit((card).suit);
  const rank = normRank((card).rank);

  if (!suit || !rank) {
    // Helpful debug to see which card failed to map
    // (Keep this during dev; remove later if too chatty)
     
    console.warn("[card image] fallback to back.png — bad mapping:", {
      rank: (card).rank,
      suit: (card).suit,
      normRank: rank,
      normSuit: suit,
    });
    return `${BASE}cards/back.png`;
  }

  return `${BASE}cards/${rank}_of_${suit}.png`;
}

export const CARD_BACK = `${BASE}cards/back.png`;
