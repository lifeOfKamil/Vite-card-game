const suits = ["❤", "♦", "♣", "♠"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

let deck = [];

function generateDeck() {
	deck = [];
	for (const suit of suits) {
		for (const rank of ranks) {
			deck.push({ suit, rank, id: `${rank}${suit}` });
		}
	}
	return deck;
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
