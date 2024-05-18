import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck } from "./components/Deck";
import cardBack from "./assets/Card_back.png";

const socket = io("http://localhost:3000");

function App() {
	const [myCards, setMyCards] = useState([]);
	const [isMyTurn, setIsMyTurn] = useState(false);

	const [deck, setDeck] = useState([]); // dealer deck
	const [users, setUsers] = useState([]);
	const [playerCards, setPlayerCards] = useState([]); // cards in hand
	const [opponent_faceUpCards, setOpponent_faceUpCards] = useState([]);
	const [player2_faceUpCards, setPlayer2_faceUpCards] = useState([]);
	const [playerGambleCards, setPlayerGambleCards] = useState([]); // face down cards
	const [selectedCard, setSelectedCard] = useState(null);
	const [playerNumber, setPlayerNumber] = useState(null);

	const opponentIndex = playerNumber === 1 ? 1 : 0;

	const [players, setPlayers] = useState([]);
	const [gameDeck, setGameDeck] = useState([]);
	const [deckLength, setDeckLength] = useState(0);
	const [hand, setHand] = useState([]);
	const [faceUpCards, setFaceUpCards] = useState([]);
	const [faceDownCards, setFaceDownCards] = useState([]);
	const [selectedCardIndex, setSelectedCardIndex] = useState(null);

	useEffect(() => {
		const handleGameState = (data) => {
			console.log("Game state received:", data);
			setPlayers(data.players);
			setDeckLength(data.deckLength);

			const myPlayer = data.players.find((player) => player.id === socket.id);
			const opponentPlayer = data.players.find((player) => player.id !== socket.id);

			if (myPlayer) {
				setHand(myPlayer.hand);
				setFaceUpCards(myPlayer.faceUpCards);
				setFaceDownCards(myPlayer.faceDownCards);
			}

			if (opponentPlayer) {
				setOpponent_faceUpCards(opponentPlayer.faceUpCards);
			}
		};

		socket.on("gameState", handleGameState);

		return () => {
			socket.off("gameState", handleGameState);
		};
	}, [socket]);

	useEffect(() => {
		if (playerCards.length > 0) {
			socket.emit("updatePlayerCards", playerCards);
		}
	}, [playerCards]);

	useEffect(() => {
		socket.emit("updateGameDeck", gameDeck);
	}, [gameDeck]);

	useEffect(() => {
		socket.on("updateHand", (newHand) => {
			setHand(newHand);
		});

		return () => {
			socket.off("updateHand");
		};
	}, []);

	useEffect(() => {
		socket.on("gameDeckCleared", () => {
			setGameDeck([]);
			console.log("Game deck has been cleared");
		});

		return () => {
			socket.off("gameDeckCleared");
		};
	}, [socket]);

	useEffect(() => {
		socket.emit("requestDeck");
		socket.on("connect", () => {
			const cardBackElements = document.getElementsByClassName("card-back");
			for (let i = 0; i < cardBackElements.length; i++) {
				cardBackElements[i].src = cardBack;
				cardBackElements[i].style.width = "10vw";
				cardBackElements[i].style.height = "calc(10vw * 1.4)";
			}
		});

		socket.on("deckGenerated", (generatedDeck) => {
			setDeck(generatedDeck);
		});

		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		socket.on("updateCards", (cards) => {
			setMyCards(cards);
		});

		socket.on("updateGameDeck", (deck) => {
			setGameDeck(deck);
		});

		socket.on("yourTurn", () => {
			setIsMyTurn(true);
		});

		socket.on("updatePlayerCards", (cards) => {
			setPlayerCards(cards);
			let cardsInHand = document.getElementById("CardsInHand");
			cardsInHand.innerHTML = "";
			for (let i = 0; i < cards.length; i++) {
				let card = document.createElement("button");
				card.className = "card";
				card.innerHTML = `${cards[i].rank} of ${cards[i].suit}`;
				cardsInHand.appendChild(card);
			}
		});

		socket.on(
			"gameData",
			({ gameId, users }) => {
				setUsers(users);
			},
			[]
		);

		socket.on("playerNumber", (playerNumber) => {
			setPlayerNumber(playerNumber);
			console.log("Player Number: ", playerNumber);
		});

		socket.on(
			"startGame",
			({ playerNumber, p1_faceUpCards, p2_faceUpCards }) => {
				const updatedDeck = [...deck];
				setDeck(updatedDeck);
				setPlayer1_faceUpCards(p1_faceUpCards);
				setPlayer2_faceUpCards(p2_faceUpCards);
				//socket.emit("updatePlayerCards", cards);
			},
			[]
		);

		return () => {
			socket.off("connect");
			socket.off("updateDeck");
			socket.off("updateCards");
			socket.off("updateGameDeck");
			socket.off("updatePlayerCards");
			socket.off("updateGambleCards");
			socket.off("gameData");
			socket.off("cardDrawn");
			socket.off("startGame");
			socket.off("playerNumber");
			socket.off("yourTurn");
			socket.off("gameState");
		};
	}, []);

	const drawCard = () => {
		socket.emit("addCardToHand");
	};

	const selectCard = (index) => {
		setSelectedCardIndex(index);
	};

	const playCard = (cardIndex) => {
		socket.emit("playCard", cardIndex);
	};

	const updatePlayerCards = (cards) => {
		socket.emit("updatePlayerCards", cards);
	};

	const submitSelectedCard = () => {
		if (selectedCardIndex !== null) {
			socket.emit("playCard", selectedCardIndex);
			setSelectedCardIndex(null); // Reset selection
		} else {
			alert("No card selected!");
		}
	};

	const pickUpCards = () => {
		socket.emit("pickUpCards");
	};

	/*const renderFaceUpCards = (cards) => {
		cards.map((card, index) => {
			<button key={index} className="card face-up">
				{`${card.rank} of ${card.suit}`}
			</button>;
		});
	};*/

	useEffect(() => {
		socket.on("cardDrawnToHand", (card) => {
			setHand((prev) => [...prev, card]);
		});

		socket.on("handUpdated", (newHand) => {
			setHand(newHand);
		});

		socket.on("cardRemovedFromHand", (removedCard) => {
			setHand((prev) => prev.filter((card) => card !== removedCard));
		});

		socket.on("cardPlayed", (newGameDeck) => {
			setGameDeck(newGameDeck);
		});

		return () => {
			socket.off("cardDrawnToHand");
			socket.off("cardRemovedFromHand");
			socket.off("cardPlayed");
			socket.off("handUpdated");
		};
	}, []);

	return (
		<>
			<div className="gameBody">
				<div className="gameBoard">
					<div className="cardsInPlay">
						<div className="userArea">
							<div className="userInfo">
								<h4>Opponent</h4>
								<p>{users.length > 1 ? users[playerNumber % users.length]?.id : "Waiting for Player"}</p>
							</div>
							<div className="user-cards user-2">
								{opponent_faceUpCards.length > 0 ? (
									opponent_faceUpCards.map((card, index) => (
										<button className="card face-up" key={index}>
											{`${card.rank} of ${card.suit}`}
										</button>
									))
								) : (
									<p>No face-up cards to display</p>
								)}
								<div className="gamble-cards user-2">
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
								</div>
							</div>
						</div>
						<div className="dealerArea">
							<div className="buttonContainer">
								<button onClick={drawCard} className="playerButton">
									Draw Card
								</button>
								<button className="playerButton">Start</button>
								<button onClick={submitSelectedCard} className="playerButton">
									Submit
								</button>
								<button onClick={pickUpCards} className="playerButton">
									Pick Up
								</button>
							</div>
							<img
								className="card-back"
								src={cardBack}
								style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
								alt="card back"
							/>
							<p style={{ color: "#fcfcfc" }}>{deckLength}</p>
							<div className="deck">
								<button className="card">
									{gameDeck.length > 0
										? `${gameDeck[gameDeck.length - 1].rank} of ${gameDeck[gameDeck.length - 1].suit}`
										: "No Card"}
								</button>
							</div>
						</div>
						<div className="userArea">
							<div className="userInfo">
								<h4>You</h4>
								<p>ID: {socket.id}</p>
							</div>
							<div className="user-cards user-1">
								{playerNumber !== 1 &&
									faceUpCards.map((card, index) => (
										<button className="card face-up" key={index}>
											{`${card.rank} of ${card.suit}`}
										</button>
									))}
								<div className="gamble-cards user-1">
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
									<img
										className="card-back"
										src={cardBack}
										style={{ width: "10vw", height: "calc(10vw * 1.4)" }}
										alt="card back"
									/>
								</div>
							</div>
						</div>
					</div>
					<div className="cardsInHand">
						<p>Cards in hand:</p>
						<div className="cards" id="CardsInHand">
							{hand.map((card, index) => (
								<button className="card" key={index} onClick={() => selectCard(index)}>
									{card.rank} of {card.suit}
								</button>
							))}
						</div>
					</div>
				</div>
			</div>
		</>
	);
}

function renderFaceUpCards(player) {
	return player.faceUpCards.map((card, index) => (
		<button key={index} className="card face-up">
			{`${card.rank} of ${card.suit}`}
		</button>
	));
}

export default App;
