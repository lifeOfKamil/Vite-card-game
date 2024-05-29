const Player = require("./Player");
const { generateDeck, shuffle } = require("../utils/deck");

class GameSession {
	constructor() {
		this.deck = shuffle(generateDeck());
		this.gameDeck = [];
		this.players = [];
		this.currentTurnIndex = 0;
		this.currentPlayerId = null;
		this.sevenPlayed = false;
		this.twoPlayed = false;
	}

	setInitialPlayer() {
		this.currentPlayerId = this.players[0].id;
	}

	nextPlayer() {
		if (this.currentTurnIndex === 0) {
			this.currentTurnIndex = 1;
		} else if (this.currentTurnIndex === 1) {
			this.currentTurnIndex = 0;
		}
		console.log("current turn index: ", this.currentTurnIndex);
		this.currentPlayerId = this.players[this.currentTurnIndex].id;
		this.updateGameState();
	}

	addPlayer(player) {
		this.players.push(player);
		this.dealInitialCards(player);
		if (this.players.length === 2) {
			this.emitInitialGamesState();
		}
	}

	emitInitialGamesState() {
		this.nextPlayer();
		this.updateGameState();
	}

	updateGameState() {
		const gameState = {
			currentPlayerId: this.players[this.currentTurnIndex].id,
			players: this.players.map((player) => ({
				id: player.id,
				hand: player.hand,
				faceUpCards: player.faceUpCards,
				faceDownCards: player.faceDownCards,
				isTurn: player.id === this.players[this.currentTurnIndex].id,
			})),
		};
		console.log("Current player's turn: ", this.players[this.currentTurnIndex].id);
		this.players.forEach((player) => {
			player.socket.emit("gameState", gameState);
		});
	}

	removePlayer(playerId) {
		// Find the player index using their ID
		const index = this.players.findIndex((player) => player.id === playerId);

		if (index !== -1) {
			// Optionally handle the player's cards before removal
			const [removedPlayer] = this.players.splice(index, 1);

			return removedPlayer; // Return the removed player object for any further handling
		} else {
			throw new Error("Player not found");
		}
	}

	dealInitialCards(player) {
		// Give each player 3 cards for each type
		player.hand = this.deck.splice(-3);
		player.faceUpCards = this.deck.splice(-3);
		player.faceDownCards = this.deck.splice(-3);
		console.log("Player face up cards: ", player.faceUpCards);
	}

	drawCard(player) {
		if (this.deck.length > 0) {
			const card = this.deck.pop();
			player.hand.push(card);
			return card;
		} else {
			throw new Error("No more cards in the deck");
		}
	}

	playCard(playerId, cardIndex) {
		const player = this.players.find((p) => p.id === playerId);
		const currentTopCard = this.gameDeck[this.gameDeck.length - 1] || null;

		if (player && cardIndex >= 0 && cardIndex < player.hand.length) {
			const playedCard = player.hand.splice(cardIndex, 1)[0];
			this.processPlayedCard(playedCard, player, currentTopCard);
			return { playedCard, hand: player.hand };
		} else {
			throw new Error("Player or card not found");
		}
	}

	playFaceDownCard(playerId, cardIndex) {
		const player = this.players.find((p) => p.id === playerId);
		if (!player) throw new Error("Player not found");

		if (cardIndex < 0 || cardIndex >= player.faceDownCards.length) {
			throw new Error("Invalid card index");
		}

		const playedCard = player.faceDownCards.splice(cardIndex, 1)[0];
		const currentTopCard = this.gameDeck[this.gameDeck.length - 1] || null;
		if (
			currentTopCard &&
			parseInt(playedCard.rank) < parseInt(currentTopCard.rank) &&
			![2, 10].includes(parseInt(playedCard.rank))
		) {
			player.hand.push(playedCard);
			player.hand = player.hand.concat(this.gameDeck);
			this.gameDeck = [];
			player.socket.emit(
				"error",
				`Card ${playedCard.rank} of ${playedCard.suit} added back to hand. You must play a card of equal or higher rank than ${currentTopCard.rank}. You picked up the game deck.`
			);
			this.updateGameState();
		} else {
			this.processPlayedCard(playedCard, player, currentTopCard);
		}
		return playedCard;
	}

	processPlayedCard(playedCard, player, currentTopCard) {
		const playedRank = parseInt(playedCard.rank);

		if (this.sevenPlayed && playedRank > 7 && playedRank !== 10) {
			player.hand.push(playedCard); // Put the card back in hand
			const errorMessage = "You must play a 7 or lower after a 7 has been played";
			player.socket.emit("error", errorMessage);
			throw new Error(errorMessage);
		}

		if (
			!this.sevenPlayed &&
			currentTopCard &&
			playedRank < parseInt(currentTopCard.rank) &&
			![2, 10].includes(playedRank)
		) {
			player.hand.push(playedCard); // Put the card back in hand
			player.hand = player.hand.concat(this.gameDeck);
			this.gameDeck = [];
			const errorMessage = `You must play a card of equal or higher rank than the current top card (${currentTopCard.rank}). You picked up the game deck.`;
			player.socket.emit("error", errorMessage);
			this.updateGameState();
			return;
		}

		this.gameDeck.push(playedCard);

		if (playedRank === 10) {
			this.gameDeck = [];
			this.sevenPlayed = false;
			this.twoPlayed = false;
		} else if (playedRank === 7) {
			this.sevenPlayed = true;
		} else if (playedRank === 2) {
			this.twoPlayed = true;
			if (this.deck.length === 0 && player.hand.length === 0) {
				player.hand = player.hand.concat(player.faceUpCards);
				player.faceUpCards = [];
				if (player.hand.length === 0) {
					player.hand = player.hand.concat(player.faceDownCards);
					player.faceDownCards = [];
				}
				if (player.hand.length > 0) {
					player.socket.emit("playAnotherCard");
				}
			} else {
				player.socket.emit("playAnotherCard");
			}
			return;
		} else {
			this.sevenPlayed = playedCard.rank === "7";
		}

		if (!this.twoPlayed) {
			this.updateGameState();
		}

		if (this.deck.length > 0 && player.hand.length < 3) {
			this.drawCard(player);
		} else if (this.deck.length === 0 && player.hand.length === 0) {
			player.hand = player.hand.concat(player.faceUpCards);
			player.faceUpCards = [];
		}
	}

	pickUpCards(playerId) {
		const player = this.players.find((p) => p.id === playerId);
		this.sevenPlayed = false; // Reset sevenPlayed state
		this.twoPlayed = false; // Reset twoPlayed state

		this.nextPlayer();

		if (player) {
			player.hand = player.hand.concat(this.gameDeck);
			this.gameDeck = [];
			return player.hand;
		} else {
			throw new Error("Player not found");
		}
	}

	// handleSpecialCards(card, playerId) {
	// 	const playedRank = parseInt(card.rank);

	// 	if (playedRank === "10") {
	// 		// Discard the deck if a 10 is played
	// 		this.gameDeck = [];
	// 		this.sevenPlayed = false;
	// 		this.twoPlayed = false;
	// 	} else if (playedRank === "7") {
	// 		this.sevenPlayed = true;
	// 	} else if (playedRank === "2") {
	// 		this.twoPlayed = true;
	// 		const player = this.players.find((p) => p.id === playerId);
	// 		player.socket.emit("playAnotherCard");
	// 	} else {
	// 		this.sevenPlayed = false;
	// 		this.twoPlayed = false;
	// 	}

	// 	console.log("Adding card to deck: ", card);
	// 	this.gameDeck.push(card);
	// 	console.log("Game deck: ", this.gameDeck);

	// 	if (!this.twoPlayed) {
	// 		this.nextPlayer();
	// 	}
	// }

	placeCard(player, cardIndex) {
		if (player.hand.length > 0) {
			const playedCard = player.hand.splice(cardIndex, 1)[0];
			this.drawCard(player); // Draw a new card after playing
			return playedCard;
		} else {
			throw new Error("No cards in hand to play");
		}
	}
}

module.exports = GameSession;
