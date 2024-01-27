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

io.on("connection", (socket) => {
	if (connectedUsers.length >= 2) {
		socket.emit("reject", "Game is full. Try again later.");
		socket.disconnect(true);
		console.log("User rejected, server full.");
		return;
	}
	connectedUsers.push(socket.id);
	console.log("connectedUsers", connectedUsers);

	console.log("⚡: User connected: ", socket.id);

	socket.on("message", (data) => {
		console.log("message data", data);
	});

	socket.on("drawCard", ({ updatedDeck, drawnCard }) => {
		console.log("Drawn card: ", drawnCard);

		socket.broadcast.emit("updateDeck", updatedDeck);

		let card = drawnCard;
		playerCards.push(card);
		console.log("Player: " + socket.id + " has cards: ", playerCards);
	});

	socket.on("disconnect", () => {
		connectedUsers = connectedUsers.filter((user) => user !== socket.id);
		console.log("🔥: User disconnected: ", socket.id);
	});
});

httpServer.listen(3000);
