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

	const player = new Player(socket.id, socket);
	gameSessions[gameId].addPlayer(player);
	gameSessions[gameId].setInitialPlayer();

	socket.join(gameId);
	console.log(`🎮: User ${socket.id} joined ${gameId}`);

	connectedUsers.push({ id: socket.id, gameId });
	console.log("👥: Connected users: ", connectedUsers);

	io.in(gameId).emit("gameState", {
		currentPlayerId: gameSessions[gameId].currentPlayerId,
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

			if (playedCard.rank === "10") {
				//io.in(gameId).emit("cardPlayed", gameSession.gameDeck);
				console.log("Received rank 10, clearing deck on server");
				gameSession.gameDeck = [];
				io.in(gameId).emit("gameDeckCleared");
				//socket.emit("gameDeckUpdated", gameSession.gameDeck);
			} else if (playedCard.rank === "7") {
				console.log("Received rank 7, next card must be 7 or lower");
			} else if (playedCard.rank === "2") {
				console.log("Received rank 2, must play another card");
				socket.emit("playAnotherCard");
				return;
			}

			gameSession.nextPlayer();

			io.in(gameId).emit("cardPlayed", gameSession.gameDeck);
			io.in(gameId).emit("gameState", {
				currentPlayerId: gameSession.currentPlayerId,
				players: gameSessions[gameId].players.map((player) => ({
					id: player.id,
					hand: player.hand,
					faceUpCards: player.faceUpCards,
					faceDownCards: player.faceDownCards,
				})),
				deckLength: gameSessions[gameId].deck.length,
			});
		} catch (error) {
			socket.emit("error", error.message);
		}
	});

	socket.on("playFaceDownCard", ({ index, playerId }) => {
		try {
			const card = gameSession.playFaceDownCard(playerId, index);
			socket.emit("cardPlayed", { card });
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
			io.in(gameId).emit("gameDeckEmpty");
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
