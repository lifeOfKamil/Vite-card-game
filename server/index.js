const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const { generateDeck, shuffle } = require("./utils/Deck");
const Player = require("./models/Player");
const GameSession = require("./models/GameSession");

const app = express();
const httpServer = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL
const io = new Server(httpServer, {
	cors: {
		origin: frontend_url,
		methods: ["GET", "POST"],
		credentials: false,
	},
});

io.engine.on("connection_error", (err) => {
  console.error("[engine connection_error]", { code: err.code, message: err.message });
});

io.on("connection", (socket) => {
  console.log("socket connected:", socket.id);
});

const gameSessions = {};
const playerGameMap = {}; // Maps socket.id to gameId

// Generate a unique 6-character game ID
function generateGameId() {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluded similar looking chars
	let id;
	do {
		id = "";
		for (let i = 0; i < 6; i++) {
			id += chars.charAt(Math.floor(Math.random() * chars.length));
		}
	} while (gameSessions[id]); // Ensure uniqueness
	return id;
}

function buildGameState(session) {
  return {
    currentPlayerId: session.currentPlayerId,
    players: session.players.map(p => ({
      id: p.id,
      hand: p.hand,
      faceUpCards: p.faceUpCards,
      faceDownCards: p.faceDownCards,
      isTurn: p.id === session.currentPlayerId,
    })),
    deckLength: session.deck.length,
  };
}

io.on("connection", (socket) => {
  console.log("⚡: User connected: ", socket.id);

  // Create a new game (supports ack)
  socket.on("createGame", (ack) => {
    try {
      const gameId = generateGameId();
      gameSessions[gameId] = new GameSession();
      gameSessions[gameId].deck = shuffle(generateDeck());

      const player = new Player(socket.id, socket);
      gameSessions[gameId].addPlayer(player);

      socket.join(gameId);
      playerGameMap[socket.id] = gameId;

      console.log(`🎮: Game ${gameId} created by ${socket.id}`);

      const data = {
        gameId,
        players: gameSessions[gameId].players.length,
        maxPlayers: 2,
      };

      // call ack first so the emitter gets an immediate response
      if (typeof ack === "function") ack(null, data);

      // still emit the event for non-ack clients (or if you want both)
      socket.emit("gameCreated", data);
    } catch (e) {
      console.error("createGame error:", e);
      if (typeof ack === "function") ack("Failed to create game");
      socket.emit("lobbyError", "Failed to create game");
    }
  });

	socket.on("requestGameState", () => {
		const gameId = playerGameMap[socket.id];
		if (!gameId) return;
		const s = gameSessions[gameId];
		if (!s) return;

		socket.emit("gameState", {
			currentPlayerId: s.currentPlayerId,
			players: s.players.map(p => ({
				id: p.id,
				hand: p.hand,
				faceUpCards: p.faceUpCards,
				faceDownCards: p.faceDownCards,
			})),
			deckLength: s.deck.length,
		});
	});

  // Join game (supports ack)
  socket.on("joinGame", (gameId, ack) => {
    try {
      const upperGameId = String(gameId || "").toUpperCase();

      if (!gameSessions[upperGameId]) {
        if (typeof ack === "function") ack("Game not found. Please check the game ID.");
        socket.emit("lobbyError", "Game not found. Please check the game ID.");
        return;
      }

      if (gameSessions[upperGameId].players.length === 2) {
				const session = gameSessions[upperGameId];
				if (!session.hasDealt) {
					session.hasDealt = true;
					session.setInitialPlayer();
				}
				io.in(upperGameId).emit("gameStarted", { gameId: upperGameId });
				// immediately send a fresh snapshot to everyone in-room
				io.in(upperGameId).emit("gameState", buildGameState(session));
			}

      const player = new Player(socket.id, socket);
      gameSessions[upperGameId].addPlayer(player);

      socket.join(upperGameId);
      playerGameMap[socket.id] = upperGameId;

      console.log(`🎮: User ${socket.id} joined game ${upperGameId}`);

      const data = {
        gameId: upperGameId,
        players: gameSessions[upperGameId].players.length,
        maxPlayers: 2,
      };

      if (typeof ack === "function") ack(null, data); // immediate response to the joiner

      io.in(upperGameId).emit("lobbyUpdate", data);
      socket.emit("gameJoined", data);

      if (gameSessions[upperGameId].players.length === 2) {
        gameSessions[upperGameId].setInitialPlayer();
        io.in(upperGameId).emit("gameStarted", { gameId: upperGameId });
        io.in(upperGameId).emit("gameState", {
          currentPlayerId: gameSessions[upperGameId].currentPlayerId,
          players: gameSessions[upperGameId].players.map((p) => ({
            id: p.id,
            hand: p.hand,
            faceUpCards: p.faceUpCards,
            faceDownCards: p.faceDownCards,
          })),
          deckLength: gameSessions[upperGameId].deck.length,
        });
        console.log(`🎴: Game ${upperGameId} started with 2 players`);
      }
    } catch (e) {
      console.error("joinGame error:", e);
      if (typeof ack === "function") ack("Failed to join game");
      socket.emit("lobbyError", "Failed to join game");
    }
  });

	// Leave game lobby
	socket.on("leaveGame", () => {
		const gameId = playerGameMap[socket.id];
		if (gameId && gameSessions[gameId]) {
			const gameSession = gameSessions[gameId];
			gameSession.removePlayer(socket.id);
			socket.leave(gameId);
			delete playerGameMap[socket.id];
			
			// Notify remaining player
			io.in(gameId).emit("lobbyUpdate", {
				gameId,
				players: gameSession.players.length,
				maxPlayers: 2
			});
			
			// Delete game if empty
			if (gameSession.players.length === 0) {
				delete gameSessions[gameId];
				console.log(`🗑️: Game ${gameId} deleted (empty)`);
			}
		}
	});

	socket.on("addCardToHand", () => {
		const gameId = playerGameMap[socket.id];
		if (!gameId) return;
		
		const player = gameSessions[gameId].players.find(p => p.id === socket.id);
		
		try {
			const card = gameSessions[gameId].drawCard(player);
			console.log(`Card drawn: ${card}`);
			socket.emit("cardDrawnToHand", card);
		} catch (error) {
			socket.emit("error", error.message);
		}
	});

	socket.on("playCard", (cardIndex) => {
		const gameId = playerGameMap[socket.id];
		if (!gameId) return;
		
		const gameSession = gameSessions[gameId];

		try {
			const { playedCard, hand } = gameSession.playCard(socket.id, cardIndex);
			socket.emit("handUpdated", hand);
			console.log("Played card: ", playedCard);

			if (playedCard.rank === "10") {
				console.log("Received rank 10, clearing deck on server");
				gameSession.gameDeck = [];
				io.in(gameId).emit("gameDeckCleared");
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

	socket.on("playCards", ({ indices }) => {
		const gameId = playerGameMap[socket.id];
		if (!gameId) return;
		const session = gameSessions[gameId];

		try {
			session.playCards(socket.id, indices);
			// playCards should take care of updateGameState / nextPlayer
		} catch (e) {
			socket.emit("error", e?.message || "Failed to play selected cards");
		}
	});

	socket.on("playFaceDownCard", ({ index }) => {
  const gameId = playerGameMap[socket.id];
  if (!gameId) return;

  const session = gameSessions[gameId];
  try {
    const res = session.playFaceDownCard(socket.id, index);
    // session methods already called updateGameState() and/or nextPlayer()
    // Nothing else needed here unless you want to log res:
    console.log("[faceDown result]", res);

  } catch (err) {
    console.error("[playFaceDownCard]", err);
    socket.emit("error", err?.message || "Failed to play face-down card");
  }
});

	socket.on("pickUpCards", () => {
		const gameId = playerGameMap[socket.id];
		if (!gameId) return;
		
		const gameSession = gameSessions[gameId];

		try {
			const newHand = gameSession.pickUpCards(socket.id);
			socket.emit("handUpdated", newHand);
			io.in(gameId).emit("gameDeckEmpty");
		} catch (error) {
			socket.emit("error", "Failed to pick up cards");
		}
	});

	socket.on("message", (data) => {
		console.log("message data", data);
	});

	socket.on("disconnect", () => {
		console.log("🔥: User disconnected: ", socket.id);
		const gameId = playerGameMap[socket.id];
		
		if (gameId && gameSessions[gameId]) {
			const gameSession = gameSessions[gameId];
			gameSession.removePlayer(socket.id);
			
			// Notify remaining player
			io.in(gameId).emit("playerDisconnected", {
				message: "Your opponent has disconnected"
			});
			
			// Clean up empty games
			if (gameSession.players.length === 0) {
				delete gameSessions[gameId];
				console.log(`🗑️: Game ${gameId} deleted (empty)`);
			}
			
			delete playerGameMap[socket.id];
		}
	});
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, '0.0.0.0', () => {
	console.log("🚀: Server listening on port {PORT}");
});