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
		if (this.players.length > 0) {
			this.currentPlayerId = this.players[0].id;
		}
	}

	nextPlayer() {
		if (this.players.length > 0) {
			this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
			this.currentPlayerId = this.players[this.currentTurnIndex].id;
			this.updateGameState();
		}
	}

	addPlayer(player) {
		this.players.push(player);
		this.dealInitialCards(player);
		if (this.players.length === 2) {
			this.emitInitialGamesState();
		}
	}

	emitInitialGamesState() {
		if (this.players.length > 0) {
			this.currentTurnIndex = 0; // Ensure the first player starts
			this.currentPlayerId = this.players[this.currentTurnIndex].id;
			this.updateGameState();
		}
	}

	updateGameState() {
		if (this.players.length > 0 && this.currentTurnIndex < this.players.length) {
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
		} else {
			console.error("Cannot update game state: No players or invalid currentTurnIndex");
		}
	}

	removePlayer(playerId) {
		// Find the player index using their ID
		const index = this.players.findIndex((player) => player.id === playerId);

		if (index !== -1) {
			const [removedPlayer] = this.players.splice(index, 1);
			if (this.players.length === 0) {
				this.resetGame();
			} else {
				this.updateGameState();
			}
			return removedPlayer;
		} else {
			throw new Error("Player not found");
		}
	}

	resetGame() {
		this.deck = shuffle(generateDeck());
		this.gameDeck = [];
		this.currentTurnIndex = 0;
		this.currentPlayerId = null;
		this.sevenPlayed = false;
		this.twoPlayed = false;
		console.log("Game has been reset");
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
		const playedRank = parseInt(playedCard.rank);

		if (
			currentTopCard &&
			parseInt(playedCard.rank) < parseInt(currentTopCard.rank) &&
			![2, 10].includes(playedCard.rank)
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

		if (playedRank === 2) {
			player.socket.emit("playAnotherCard");
		}
		this.updateGameState();
		return playedCard;
	}

	processPlayedCard(playedCard, player, currentTopCard) {
		const playedRank = parseInt(playedCard.rank);

		if (this.sevenPlayed && playedRank > 7 && playedRank !== 10 && playedRank !== 2) {
			player.hand.push(playedCard);
			const errorMessage = "You must play a 7 or lower after a 7 has been played";
			player.socket.emit("error", errorMessage);
			throw new Error(errorMessage);
		}

		// 10 can be played at any time and clears the deck
		if (playedRank === 10) {
			this.gameDeck = [];
			this.sevenPlayed = false;
			this.twoPlayed = false;
			this.updateGameState();
			return;
		}

		if (
			!this.sevenPlayed &&
			currentTopCard &&
			playedRank < parseInt(currentTopCard.rank) &&
			![2, 10].includes(playedRank)
		) {
			player.hand.push(playedCard);
			player.hand = player.hand.concat(this.gameDeck);
			this.gameDeck = [];
			const errorMessage = `You must play a card of equal or higher rank than the current top card (${currentTopCard.rank}). You picked up the game deck.`;
			player.socket.emit("error", errorMessage);
			this.updateGameState();
			return;
		}

		this.gameDeck.push(playedCard);

		if (playedRank === 7) {
			this.sevenPlayed = true;
		} else if (playedRank === 2) {
			this.sevenPlayed = false;
			this.twoPlayed = true;
			// Check if this was the last card in the player's hand
			if (player.hand.length === 0) {
				if (player.faceUpCards.length > 0) {
					player.hand = player.hand.concat(player.faceUpCards);
					player.faceUpCards = [];
				} else if (player.faceDownCards.length > 0) {
					player.socket.emit("playFaceDownCard"); // Prompt player to play a face-down card
					return;
				}
			} else {
				player.socket.emit("playAnotherCard");
			}
		} else {
			this.sevenPlayed = playedCard.rank === "7";
		}

		if (!this.twoPlayed) {
			this.updateGameState();
		}

		if (this.deck.length > 0 && player.hand.length < 3 && playedRank !== 2) {
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
