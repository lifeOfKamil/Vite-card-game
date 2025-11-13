const Player = require("./Player");
const { generateDeck, shuffle } = require("../utils/Deck");

class GameSession {
  constructor() {
    this.deck = shuffle(generateDeck());
		console.log("[INIT] deck size = ", this.deck.length);
    this.gameDeck = [];
    this.players = [];
    this.currentTurnIndex = 0;
    this.currentPlayerId = null;
    this.sevenPlayed = false;
    this.twoPlayed = false;
    this.hasDealt = false; // <--- NEW
  }

  setInitialPlayer() {
    if (this.players.length > 0) {
      // choose first player for now (you can randomize if you want)
      this.currentTurnIndex = 0;
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
		console.log("[ADD] players now =", this.players.length, "deck =", this.deck.length);

		// Only deal after both players are present
		if (this.players.length === 2 && !this.hasDealt) {
    console.log("[DEAL] before dealForAll deck =", this.deck.length);
    this.dealInitialCardsForAll();
    console.log("[DEAL] after  dealForAll deck =", this.deck.length);
    this.hasDealt = true;
    this.setInitialPlayer();
    this.updateGameState();
  } else if (this.players.length >= 2 && this.hasDealt) {
    console.warn("[SKIP] deal already done");
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
        deckLength: this.deck.length,
        pileTop: this.gameDeck[this.gameDeck.length - 1],
        pileLength: this.gameDeck.length,
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
    const index = this.players.findIndex((player) => player.id === playerId);
    if (index !== -1) {
      const [removedPlayer] = this.players.splice(index, 1);
      if (this.players.length === 0) {
        this.resetGame();
      } else {
        // keep turn index sane
        if (this.currentTurnIndex >= this.players.length) {
          this.currentTurnIndex = 0;
          this.currentPlayerId = this.players[0].id;
        }
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
    this.hasDealt = false;       // <--- reset
    console.log("Game has been reset");
  }

  dealInitialCards(player) {
    // 3 face-down, 3 face-up, 3 hand (draw from end/pile top)
    // Using pop() improves clarity
    const draw = () => this.deck.pop();

    player.faceDownCards = [draw(), draw(), draw()];
    player.faceUpCards   = [draw(), draw(), draw()];
    player.hand          = [draw(), draw(), draw()];

    console.log("Dealt to player", player.id, {
      faceUp: player.faceUpCards,
      faceDown: player.faceDownCards.length,
      hand: player.hand.length,
    });

		console.log("Remaining cards: ", this.deck);
  }

	dealInitialCardsForAll() {
		if (this.hasDealt) {
			console.warn("[GUARD] dealInitialCardsForAll called again — skipped");
			return;
		}
		const draw = () => this.deck.pop();
		for (const p of this.players) {
			p.faceDownCards = [draw(), draw(), draw()];
			p.faceUpCards   = [draw(), draw(), draw()];
			p.hand          = [draw(), draw(), draw()];
		}
		console.log("[DEAL] 9 per player; deck left =", this.deck.length);
	}

  drawCard(player) {
    if (this.gameOver) return;
    if (this.deck.length > 0) {
      const card = this.deck.pop();
      player.hand.push(card);
      return card;
    } else {
      throw new Error("No more cards in the deck");
    }
  }

  playCard(playerId, cardIndex) {
    if (this.gameOver) return;
    const player = this.players.find((p) => p.id === playerId);
    const currentTopCard = this.gameDeck[this.gameDeck.length - 1] || null;

    if (player && cardIndex >= 0 && cardIndex < player.hand.length) {
      const playedCard = player.hand.splice(cardIndex, 1)[0];
      const result = this.processPlayedCard(playedCard, player, currentTopCard);

      // If invalid, we already put the card back and emitted state; do nothing else
      if (result?.action === "invalid") {
        return { playedCard: null, hand: player.hand };
      }

      // For valid plays, you can still return playedCard/hand if your UI uses it
      return { playedCard, hand: player.hand };
    } else {
      throw new Error("Player or card not found");
    }
  }

  playCards(playerId, indices) {
    if (this.gameOver) return;

    const player = this.players.find(p => p.id === playerId);
    if (!player) throw new Error("Player not found");
    if (!Array.isArray(indices) || indices.length === 0) throw new Error("No cards selected");

    // Work from highest → lowest to splice safely
    const sorted = [...indices].sort((a, b) => b - a);

    // Peek cards and validate
    const selected = sorted.map(i => {
      if (i < 0 || i >= player.hand.length) throw new Error("Invalid card index");
      return player.hand[i];
    });

    const rank0 = selected[0].rank;
    if (!selected.every(c => c.rank === rank0)) {
      throw new Error("Selected cards must be the same rank");
    }

    const playedRank = parseInt(rank0, 10);
    const top = this.gameDeck[this.gameDeck.length - 1] || null;

    const invalidateGroup = (msg) => {
      if (msg) player.socket.emit("error", msg);
      this.updateGameState();
      return;
    };

    // 7 rule – reject but DON'T auto-pickup, don't touch pile
    if (
      this.sevenPlayed &&
      playedRank > 7 &&
      playedRank !== 10 &&
      playedRank !== 2
    ) {
      return invalidateGroup(
        "After a 7, you must play 7 or lower (except 2 or 10). You may choose to pick up the pile instead."
      );
    }

    // Normal ≥ top unless special – reject but DON'T auto-pickup
    if (
      !this.sevenPlayed &&
      top &&
      playedRank < parseInt(top.rank, 10) &&
      ![2, 10].includes(playedRank)
    ) {
      return invalidateGroup(
        `Must play ≥ ${top.rank} (unless 2 or 10). You can click 'Pick Up' if you want the pile.`
      );
    }

    // --- From here on, move is valid ---

    // Remove from hand
    for (const i of sorted) player.hand.splice(i, 1);

    // Place on pile
    this.gameDeck.push(...selected);

    if (this.checkFourOfAKind()) {
      this.updateGameState();
      this.maybeEndGame?.(player);
      return;
    }

    if (playedRank === 10) {
      this.gameDeck = [];
      this.sevenPlayed = false;
      this.twoPlayed = false;
      this.players.forEach(p => p.socket.emit("gameDeckCleared", { reason: "ten" }));
    } else if (playedRank === 7) {
      this.sevenPlayed = true;
      this.twoPlayed = false;
    } else if (playedRank === 2) {
      this.sevenPlayed = false;
      this.twoPlayed = true;

      if (player.hand.length === 0) {
        if (player.faceUpCards.length > 0) {
          player.hand.push(...player.faceUpCards);
          player.faceUpCards = [];
        } else if (player.faceDownCards.length > 0) {
          player.socket.emit("playFaceDownCard");
        }
      }

      this.updateGameState();
      this.maybeEndGame?.(player);
      return; // same player keeps turn after 2
    } else {
      this.sevenPlayed = (playedRank === 7);
    }

    // Refill to 3 or promote if needed
    if (this.deck.length > 0 && player.hand.length < 3) {
      while (player.hand.length < 3 && this.deck.length > 0) this.drawCard(player);
    } else if (this.deck.length === 0 && player.hand.length === 0) {
      if (player.faceUpCards.length > 0) {
        player.hand.push(...player.faceUpCards);
        player.faceUpCards = [];
      }
    }

    this.updateGameState();
    this.maybeEndGame?.(player);
    this.nextPlayer();
  }

  playFaceDownCard(playerId, cardIndex) {
    if (this.gameOver) return;
    const player = this.players.find((p) => p.id === playerId);
    if (!player) throw new Error("Player not found");
    if (cardIndex < 0 || cardIndex >= player.faceDownCards.length) {
      throw new Error("Invalid card index");
    }

    const playedCard = player.faceDownCards.splice(cardIndex, 1)[0];
    const currentTopCard = this.gameDeck[this.gameDeck.length - 1] || null;

    const res = this.processPlayedCard(playedCard, player, currentTopCard);
    
    if (res?.mustPlayAnother) {
      return res;
    }

    if (res) this.nextPlayer();
    
    console.log(`Face-down card index: ${cardIndex}`);
    
    if (!this.gameOver && this.hasNoCards(player)) {
      this.endGame(player);
      return { playedCard, hand: player.hand };
    }

  }

  processPlayedCard(playedCard, player, currentTopCard) {
    const playedRank = parseInt(playedCard.rank, 10);

    const invalidatePlay = (msg) => {
      player.hand.push(playedCard);
      if (msg) player.socket.emit("error", msg);
      this.updateGameState();
      return { action: "invalid", mustPlayAnother: false };
    };

    // 7-restriction violation → pickup
    if (
      this.sevenPlayed &&
      playedRank > 7 &&
      playedRank !== 10 &&
      playedRank !== 2
    ) {
      return invalidatePlay("You must play a 7 or lower after a 7 has been played. You may choose to pick up the pile instead.");
    }

    // Normal rule violation → pickup
    if (
      !this.sevenPlayed &&
      currentTopCard &&
      playedRank < parseInt(currentTopCard.rank, 10) &&
      ![2, 10].includes(playedRank)
    ) {
      return invalidatePlay(
        `Must play ≥ ${currentTopCard.rank} (unless 2 or 10). You can click 'Pick Up' if you want the pile.`
      );
    }

    // Place on pile
    this.gameDeck.push(playedCard);

    if (this.checkFourOfAKind()) {
      this.updateGameState();
      this.maybeEndGame?.(player);
      this.nextPlayer();
      return { action: "cleared", mustPlayAnother: false };
    }

    if (playedRank === 10) {
      this.gameDeck = [];
      this.sevenPlayed = false;
      this.twoPlayed = false;
      this.players.forEach(p => p.socket.emit("gameDeckCleared", { reason: "ten" }));
      this.updateGameState();
      return { action: "cleared", mustPlayAnother: false };
    }

    if (playedRank === 7) {
      this.sevenPlayed = true;
      this.twoPlayed = false;
    } else if (playedRank === 2) {
      this.sevenPlayed = false;
      this.twoPlayed = true;

      if (player.hand.length === 0) {
        if (player.faceUpCards.length > 0) {
          player.hand = player.hand.concat(player.faceUpCards);
          player.faceUpCards = [];
        } else if (player.faceDownCards.length > 0) {
          player.socket.emit("playFaceDownCard"); // prompt flip
          this.updateGameState();
          // Still same player's turn; they must play again due to '2'
          return { action: "played", mustPlayAnother: true };
        }
      } else {
        player.socket.emit("playAnotherCard");
      }
      this.updateGameState();

      // refill-from-deck / promotions after updateGameState
      if (this.deck.length > 0 && player.hand.length < 3) {
        while (player.hand.length < 3 && this.deck.length > 0) this.drawCard(player);
        this.updateGameState();
      } else if (this.deck.length === 0 && player.hand.length === 0 && player.faceUpCards.length > 0) {
        player.hand = player.hand.concat(player.faceUpCards);
        player.faceUpCards = [];
        this.updateGameState();
      }

      this.maybeEndGame(player);
      return { action: "played", mustPlayAnother: true };
    } else {
      this.sevenPlayed = (playedRank === 7);
    }

    // Refill/promote if needed (non-2 path)
    if (this.deck.length > 0 && player.hand.length < 3) {
      while (player.hand.length < 3 && this.deck.length > 0) this.drawCard(player);
    } else if (this.deck.length === 0 && player.hand.length === 0 && player.faceUpCards.length > 0) {
      player.hand = player.hand.concat(player.faceUpCards);
      player.faceUpCards = [];
    }

    this.updateGameState();
    this.maybeEndGame(player);

    return { action: "played", mustPlayAnother: false };
  }

  pickUpCards(playerId) {
    if (this.gameOver) return;
    const player = this.players.find((p) => p.id === playerId);
    this.sevenPlayed = false;
    this.twoPlayed = false;

    if (player) {
      player.hand = player.hand.concat(this.gameDeck);
      this.gameDeck = [];
      this.nextPlayer();         // advances turn + emits state
      return player.hand;
    } else {
      throw new Error("Player not found");
    }
  }

  placeCard(player, cardIndex) {
    if (player.hand.length > 0) {
      const playedCard = player.hand.splice(cardIndex, 1)[0];
      this.drawCard(player);
      return playedCard;
    } else {
      throw new Error("No cards in hand to play");
    }
  }

  hasNoCards(p) {
    return (p.hand.length === 0 && p.faceUpCards.length === 0 && p.faceDownCards.length === 0);
  }

  checkFourOfAKind() {
    const n = this.gameDeck.length;
    if (n === 0) return false;

    const top = this.gameDeck[n - 1];
    const rank = top.rank;

    let count = 0;
    for (let i = n - 1; i >= 0; i--) {
      if (this.gameDeck[i].rank === rank) count++;
      else break;
    }

    if (count === 4) {
      this.gameDeck = [];
      this.sevenPlayed = false;
      this.twoPlayed = false;
      this.players.forEach(p => p.socket.emit("gameDeckCleared", { reason: "fourOfAKind"}));
      return true;
    }
    return false;
  }

  endGame(winner) {
    this.gameOver = true;
    this.winnerId = winner.id;
    // final snapshot (optional)
    this.updateGameState();
    // tell both clients
    this.players.forEach(pl => pl.socket.emit("gameWon", { winnerId: winner.id }));
  }

  maybeEndGame(player) {
    if (!this.gameOver && this.hasNoCards(player)) this.endGame(player);
  }
}

module.exports = GameSession;
