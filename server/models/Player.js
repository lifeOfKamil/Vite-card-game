class Player {
	constructor(id) {
		this.id = id;
		this.hand = [];
		this.faceUpCards = [];
		this.faceDownCards = [];
	}

	isGameOver() {
		return this.hand.length === 0 && this.faceUpCards.length === 0 && this.faceDownCards.length === 0;
	}
}

module.exports = Player;
