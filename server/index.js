const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { generateDeck } = require("./utils/deck");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: "*",
	},
});

let connectedUsers = [];
let decks = {};
let playerCards = [];
let playerGambleCards = [];
let gameIdCounter = 1;

io.on("connection", (socket) => {
	let gameId = ``;
	if (connectedUsers.length >= 2) {
		gameId = `game-${gameIdCounter++}`;
		socket.join(gameId);
		connectedUsers.push({ id: socket.id, gameId });
	} else {
		gameId = `game-${gameIdCounter}`;
		socket.join(gameId);
		connectedUsers.push({ id: socket.id, gameId });
	}

	console.log("⚡: User connected: ", socket.id);
	console.log("👥: Connected users: ", connectedUsers);

	decks[gameId] = generateDeck();
	playerGambleCards[socket.id] = [];

	socket.emit("gameData", {
		gameId,
		users: connectedUsers,
		deck: decks[gameId],
	});

	socket.on("requestDeck", () => {
		decks[gameId] = generateDeck();
		io.to(gameId).emit("deckGenerated", decks[gameId]);
	});

	socket.to(`game-${gameId}`).emit("gameData", {
		gameId,
		users: connectedUsers,
		playerCards,
	});

	socket.to(`game-${gameId}`).emit(
		"updateUsers",
		connectedUsers.filter((user) => user.id !== socket.id)
	);

	socket.on("message", (data) => {
		console.log("message data", data);
	});

	socket.on("drawCard", () => {
		if (decks[gameId] && decks[gameId].length > 0) {
			const card = decks[gameId].pop();
			socket.emit("cardDrawn", card); // Notify the drawing player
			io.to(gameId).emit("updateDeck", decks[gameId]); // Update all players in the game with the new deck state
		}
	});

	socket.on("gambleCards", () => {
		// Example of handling gamble cards, adjust according to your game logic
		const cards = decks[gameId].splice(decks[gameId].length - 3, 3); // Take the last three cards from the deck
		playerGambleCards[socket.id] = cards;
		socket.emit("updateGambleCards", cards); // Update the player who drew the gamble cards
		io.to(gameId).emit("updateDeck", decks[gameId]); // Update all players with the new deck state
	});

	socket.on("updatePlayerCards", (cards) => {
		playerCards[socket.id] = cards;
		socket.broadcast.to(`game-${gameId}`).emit("updatePlayerCards", cards);
	});

	socket.on("disconnect", () => {
		console.log("🔥: User disconnected: ", socket.id);
		connectedUsers = connectedUsers.filter((user) => user.id !== socket.id);
		if (connectedUsers.length === 0) {
			// Reset the game if all users have disconnected
			delete decks[gameId];
			delete playerGambleCards[socket.id];
			gameIdCounter = 1; // Reset gameIdCounter or adjust according to your needs
		}
		io.to(gameId).emit("updateUsers", connectedUsers);
	});
});

httpServer.listen(3000, () => {
	console.log("🚀: Server listening on port 3000");
});
