const suits = ["❤", "♦", "♣", "♠"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];
const rankMap = {
	11: "J",
	12: "Q",
	13: "K",
	14: "A",
};

let deck = [];

function generateDeck() {
  const suits = ["❤","♦","♣","♠"];
  const ranks = Array.from({length:13}, (_,i)=> String(i+2));
  const deck = [];
  for (const s of suits) for (const r of ranks) deck.push({ suit: s, rank: r, id: `${r}${s}` });
  return deck; // length 52
}

function shuffle(deck) {
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
}

function isDeckEmpty() {
	return deck.length === 0;
}

function getDeckLength() {
	return deck.length;
}

module.exports = { generateDeck, shuffle, isDeckEmpty, getDeckLength };
