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

io.on("connection", (socket) => {
	socket.emit("welcome", "Welcome to the game");

	console.log("⚡: User connected: ", socket.id);

	socket.on("message", (data) => {
		console.log("message data", data);
	});

	socket.on("drawCard", ({ updatedDeck, drawnCard }) => {
		console.log("Updated deck: ", updatedDeck);
		console.log("Drawn card: ", drawnCard);

		socket.broadcast.emit("updateDeck", updatedDeck);
	});

	socket.on("disconnect", () => {
		console.log("🔥: User disconnected: ", socket.id);
	});
});

httpServer.listen(3000);
