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
	deck = [];
	for (const suit of suits) {
		for (const rank of ranks) {
			const rankId = rankMap[rank] || rank;
			deck.push({ suit, rank, id: `${rankId}${suit}` });
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
