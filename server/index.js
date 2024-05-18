const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { generateDeck, shuffle } = require("./utils/deck");
const Player = require("./models/Player");
const GameSession = require("./models/GameSession");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: "*",
	},
});

let connectedUsers = []; // users connected to the server
let gameIdCounter = 1;
const gameSessions = {};

io.on("connection", (socket) => {
	console.log("⚡: User connected: ", socket.id);

	// Check if there is an existing game with an open slot
	let gameId = Object.keys(gameSessions).find((id) => gameSessions[id].players.length < 2);

	// If there is no open slot, create a new game
	if (!gameId) {
		gameId = `game-${gameIdCounter++}`;
		gameSessions[gameId] = new GameSession();
		gameSessions[gameId].deck = shuffle(generateDeck());
		console.log(`🎴: Deck generated for game ${gameId}`);
	}

	const player = new Player(socket.id);
	gameSessions[gameId].addPlayer(player);

	socket.join(gameId);
	console.log(`🎮: User ${socket.id} joined ${gameId}`);

	connectedUsers.push({ id: socket.id, gameId });
	console.log("👥: Connected users: ", connectedUsers);

	io.in(gameId).emit("gameState", {
		players: gameSessions[gameId].players.map((player) => ({
			id: player.id,
			hand: player.hand,
			faceUpCards: player.faceUpCards,
			faceDownCards: player.faceDownCards,
		})),
		deckLength: gameSessions[gameId].deck.length,
	});

	socket.on("addCardToHand", (card) => {
		try {
			const card = gameSessions[gameId].drawCard(player);
			console.log(`Card drawn: ${card}`);
			socket.emit("cardDrawnToHand", card);
		} catch (error) {
			socket.emit("error", error.message);
		}
	});

	socket.on("playCard", (cardIndex) => {
		const gameId = findGameIdByPlayerId(socket.id);
		const gameSession = gameSessions[gameId];

		try {
			const { playedCard, hand } = gameSession.playCard(socket.id, cardIndex);
			socket.emit("handUpdated", hand);

			if (playedCard.rank === 10) {
				io.in(gameId).emit("cardPlayed", gameSession.gameDeck);
				gameSession.gameDeck = [];
				io.in(gameId).emit("gameDeckCleared");
			} else {
				io.in(gameId).emit("cardPlayed", gameSession.gameDeck);
			}
		} catch (error) {
			socket.emit("error", error.message);
		}
	});

	socket.on("pickUpCards", () => {
		const gameId = findGameIdByPlayerId(socket.id);
		const gameSession = gameSessions[gameId];

		try {
			const newHand = gameSession.pickUpCards(socket.id);
			socket.emit("handUpdated", newHand);
			io.in(gameId).emit("gameDeckCleared");
		} catch (error) {
			socket.emit("error", "Failed to pick up cards");
		}
	});

	socket.to(`game-${gameId}`).emit(
		"updateUsers",
		connectedUsers.filter((user) => user.id !== socket.id)
	);

	socket.on("message", (data) => {
		console.log("message data", data);
	});

	socket.on("gambleCards", () => {
		// Example of handling gamble cards, adjust according to your game logic
		const cards = decks[gameId].splice(decks[gameId].length - 3, 3); // Take the last three cards from the deck
		playerGambleCards[socket.id] = cards;
		socket.emit("updateGambleCards", cards); // Update the player who drew the gamble cards
		io.to(gameId).emit("updateDeck", decks[gameId]); // Update all players with the new deck state
	});

	socket.on("submitCard", (card) => {
		const playerId = socket.id;
		const gameId = socket.gameId;

		if (!gameId || !gameSessions[gameId]) {
			console.log("Game not found");
			return;
		}

		const game = gameSessions[gameId];
		const player = game.players.find((player) => player.id === playerId);

		if (!player) {
			console.log("Player not found");
			return;
		}

		try {
			const playerCard = game.placeCard(player, card);
			io.to(gameId).emit("updateGameDeck", game.deck);
		} catch {
			console.log("Failed to submit card");
		}
	});

	socket.on("disconnect", () => {
		console.log("🔥: User disconnected: ", socket.id);
		const index = connectedUsers.findIndex((user) => user.id === socket.id);
		if (index !== -1) {
			connectedUsers.splice(index, 1);
			gameSessions[gameId].removePlayer(socket.id);
		}
		io.to(gameId).emit("updateUsers", connectedUsers);
	});
});

httpServer.listen(3000, () => {
	console.log("🚀: Server listening on port 3000");
});

function findGameIdByPlayerId(playerId) {
	return Object.keys(gameSessions).find((gameId) =>
		gameSessions[gameId].players.some((player) => player.id === playerId)
	);
}
