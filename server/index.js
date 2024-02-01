import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
	cors: {
		origin: "*",
	},
});

let connectedUsers = [];
let playerCards = [];
let playerGambleCards = [];
let gameIdCounter = 1;

io.on("connection", (socket) => {
	const gameId = gameIdCounter;

	socket.join(`game-${gameId}`);

	if (connectedUsers.length >= 2) {
		socket.emit("reject", "Game is full. Try again later.");
		socket.disconnect(true);
		console.log("User rejected, server full.");
		return;
	}
	// Add user to connectedUsers array
	connectedUsers.push({ id: socket.id, gameId });

	console.log("⚡: User connected: ", socket.id);

	console.log("👥: Connected users: ", connectedUsers);

	// Send gameId to connected clients
	socket.emit("gameId", gameId);

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

	socket.on("drawCard", ({ updatedDeck, drawnCard }) => {
		if (!playerCards[socket.id]) {
			playerCards[socket.id] = [];
		}

		playerCards[socket.id].push(drawnCard);

		console.log("Player: " + socket.id + " has cards: ", playerCards[socket.id]);

		socket.to(`game-${gameId}`).emit("updateDeck", updatedDeck);
		socket.to(`game-${gameId}`).emit("updatePlayerCards", playerCards);
	});

	socket.on("gambleCards", ({ updatedDeck, cards }) => {
		if (!playerGambleCards[socket.id]) {
			playerGambleCards[socket.id] = [];
		}

		playerGambleCards[socket.id] = cards;

		io.to(socket.id).emit("updateGambleCards", cards);

		socket.to(`game-${gameId}`).emit("updateDeck", updatedDeck);

		console.log("Player: " + socket.id + " has gamble cards: ", playerGambleCards[socket.id]);

		socket.to(`game-${gameId}`).emit("updateGambleCards", playerGambleCards);
	});

	socket.on("updatePlayerCards", (cards) => {
		playerCards[socket.id] = cards;
		socket.broadcast.to(`game-${gameId}`).emit("updatePlayerCards", cards);
	});

	socket.on("disconnect", () => {
		connectedUsers = connectedUsers.filter((user) => user.id !== socket.id);
		socket.broadcast.to(`game-${gameId}`).emit("updateUsers", connectedUsers);
		console.log("🔥: User disconnected: ", socket.id);
	});
});

httpServer.listen(3000, () => {
	console.log("🚀: Server listening on port 3000");
});
