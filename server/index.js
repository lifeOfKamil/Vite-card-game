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

let connectedUsers = []; // users connected to the server
let decks = {}; // game decks
let gameDeck = []; // cards submitted by players; cards in play
let playerCards = []; // cards in players current hand
let playerGambleCards = [];
let p1_faceUpCards = []; // cards facing up for player 1
let p2_faceUpCards = []; // cards facing up for player 2
let gameIdCounter = 1;

io.on("connection", (socket) => {
	console.log("⚡: User connected: ", socket.id);

	let gameId = ``; // game id

	if (connectedUsers.length / 2 === 1) {
		gameId = `game-${gameIdCounter++}`;
	} else {
		gameId = `game-${gameIdCounter}`;
	}

	socket.join(gameId);
	connectedUsers.push({ id: socket.id, gameId });
	console.log("👥: Connected users: ", connectedUsers);
	console.log(`🎮: User ${socket.id} joined ${gameId}`);

	if (!decks[gameId]) {
		decks[gameId] = generateDeck();
		console.log(`🎴: Deck generated for game ${gameId}`);
	}

	socket.on("startGame", () => {
		const p1_faceUpCards = decks[gameId].splice(decks[gameId].length - 3, 3);
		const p2_faceUpCards = decks[gameId].splice(decks[gameId].length - 3, 3);

		let players = connectedUsers.filter((user) => user.gameId === gameId);

		const playersInGame = connectedUsers.filter((user) => user.gameId === gameId);
		if (playersInGame.length === 2) {
			players.forEach((player, index) => {
				io.to(player.id).emit("playerNumber", index + 1);
				io.to(player.id).emit("startGame", {
					playerNumber: index + 1,
					p1_faceUpCards,
					p2_faceUpCards,
				});
				console.log(`Player ${player.id} with face up cards: `, index === 0 ? p1_faceUpCards : p2_faceUpCards);
			});

			console.log(`Game started: gameID: ${gameId}`);

			io.to(gameId).emit("updateDeck", decks[gameId]);
			io.to(gameId).emit("updateGambleCards", p1_faceUpCards, p2_faceUpCards);
		} else {
			console.log(`Waiting for more players to join the game : gameID: ${gameId}`);
		}
	});

	io.emit("gameData", {
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
		io.to(`game-${gameId}`).emit("updatePlayerCards", cards);
	});

	socket.on("updateGameDeck", (updatedGameDeck) => {
		let currentGameID = connectedUsers.find((user) => user.id === socket.id).gameId;
		gameDeck[currentGameID] = updatedGameDeck; // Update the game deck with the new
		io.to(currentGameID).emit("updateGameDeck", updatedGameDeck);
	});

	socket.on("submitCard", (card) => {
		gameDeck.push(card);
		io.emit("updateGameDeck", gameDeck);
		console.log("Game Deck: ", gameDeck);
	});

	socket.on("disconnect", () => {
		console.log("🔥: User disconnected: ", socket.id);
		connectedUsers = connectedUsers.filter((user) => user.id !== socket.id);
		if (connectedUsers.length === 1) {
			// Reset the game if all users have disconnected
			delete decks[gameId];
			delete playerGambleCards[socket.id];
			delete playerCards[socket.id];
			delete p1_faceUpCards;
			delete p2_faceUpCards;
			delete gameDeck;
			gameIdCounter = 1; // Reset gameIdCounter or adjust according to your needs
		}
		io.to(gameId).emit("updateUsers", connectedUsers);
	});
});

httpServer.listen(3000, () => {
	console.log("🚀: Server listening on port 3000");
});
