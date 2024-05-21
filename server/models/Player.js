class Player {
	constructor(id, socket) {
		this.id = id;
		this.socket = socket;
		this.hand = [];
		this.faceUpCards = [];
		this.faceDownCards = [];
	}

	isGameOver() {
		return this.hand.length === 0 && this.faceUpCards.length === 0 && this.faceDownCards.length === 0;
	}
}

module.exports = Player;
