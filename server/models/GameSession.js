const Player = require("./Player");
const { generateDeck, shuffle } = require("../utils/deck");

class GameSession {
	constructor() {
		this.deck = shuffle(generateDeck());
		this.gameDeck = [];
		this.players = [];
		this.currentTurnIndex = 0;
		this.sevenPlayed = false;
	}

	addPlayer(player) {
		this.players.push(player);
		this.dealInitialCards(player);
		if (this.players.length === 1) {
			this.currentTurnIndex = 0;
		}
	}

	nextTurn() {
		this.currentTurnIndex = (this.currentTurnIndex + 1) % this.players.length;
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

			if (this.sevenPlayed && parseInt(playedCard.rank) > 7 && parseInt(playedCard.rank) !== 10) {
				player.hand.splice(cardIndex, 0, playedCard); // Put the card back in hand
				const errorMessage = "You must play a 7 or lower after a 7 has been played";
				player.socket.emit("error", errorMessage);
				throw new Error(errorMessage);
			}

			this.gameDeck.push(playedCard);

			if (playedCard.rank === "10") {
				// Discard deck if a 10 is played
				this.gameDeck = [];
				this.sevenPlayed = false; // Reset sevenPlayed state
				if (this.deck.length > 0) {
					this.drawCard(player);
				}
			} else if (playedCard.rank === "7") {
				this.sevenPlayed = true;
			} else {
				this.sevenPlayed = false; // Reset sevenPlayed state
			}

			if (player.hand.length < 3 && this.deck.length > 0) {
				this.drawCard(player);
			}

			console.log("Game deck: ", this.gameDeck);
			return { playedCard, hand: player.hand };
		} else {
			throw new Error("Player or card not found");
		}
	}

	pickUpCards(playerId) {
		const player = this.players.find((p) => p.id === playerId);

		if (player) {
			player.hand = player.hand.concat(this.gameDeck);
			this.gameDeck = [];
			return player.hand;
		} else {
			throw new Error("Player not found");
		}
	}

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
