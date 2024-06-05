import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck } from "./components/Deck";
import cardBack from "./assets/Card_back.png";
import Popup from "./components/Popup";

const socket = io("http://localhost:3000");

function App() {
	const [myCards, setMyCards] = useState([]);
	const [isMyTurn, setIsMyTurn] = useState(false);
	const [mustPlayAnotherCard, setMustPlayAnotherCard] = useState(false); // New state for tracking if another card must be played

	const [deck, setDeck] = useState([]); // dealer deck
	const [users, setUsers] = useState([]);
	const [playerCards, setPlayerCards] = useState([]); // cards in hand
	const [opponent_faceUpCards, setOpponent_faceUpCards] = useState([]);
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
	const [popupMessage, setPopupMessage] = useState("");

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
				setIsMyTurn(data.currentPlayerId === socket.id);
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
			setPopupMessage("Game deck has been cleared by a 10!");
			setTimeout(() => setPopupMessage(""), 2500);
		});

		return () => {
			socket.off("gameDeckCleared");
		};
	}, [socket]);

	useEffect(() => {
		socket.on("gameDeckEmpty", () => {
			setGameDeck([]);
			console.log("Game deck has been cleared");
		});

		return () => {
			socket.off("gameDeckEmpty");
		};
	}, [socket]);

	useEffect(() => {
		socket.on("error", (error) => {
			console.log("Error: ", error);
			setPopupMessage(error);
			setTimeout(() => setPopupMessage(""), 2500);
		});
	}, [socket]);

	useEffect(() => {
		socket.emit("requestDeck");

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
		if (mustPlayAnotherCard) {
			setMustPlayAnotherCard(false);
		}
	};

	const playFaceDownCard = (index) => {
		if (!isMyTurn) {
			alert("It's not your turn!");
			return;
		}
		if (mustPlayAnotherCard) {
			setMustPlayAnotherCard(false);
		}
		socket.emit("playFaceDownCard", { index, playerId: socket.id });
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
		setGameDeck([]);
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

		socket.on("gameDeckUpdated", (newGameDeck) => {
			setGameDeck(newGameDeck);
			console.log("Game deck updated: ", newGameDeck);
		});

		socket.on("cardRemovedFromHand", (removedCard) => {
			setHand((prev) => prev.filter((card) => card !== removedCard));
		});

		socket.on("cardPlayed", (newGameDeck) => {
			setGameDeck(newGameDeck);
		});

		socket.on("playAnotherCard", () => {
			setMustPlayAnotherCard(true);
			setPopupMessage("You must play another card after playing a 2!");
			setTimeout(() => setPopupMessage(""), 2500);
		});

		return () => {
			socket.off("cardDrawnToHand");
			socket.off("cardRemovedFromHand");
			socket.off("cardPlayed");
			socket.off("handUpdated");
			socket.off("gameDeckUpdated");
			socket.off("playAnotherCard");
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
									<p>Face-up cards picked up</p>
								)}
								<div className="gamble-cards user-2">
									<img className="card-back inactive-card" src={cardBack} alt="card back" />
									<img className="card-back inactive-card" src={cardBack} alt="card back" />
									<img className="card-back inactive-card" src={cardBack} alt="card back" />
								</div>
							</div>
						</div>
						<div className="dealerArea">
							<img className="card-back" src={cardBack} alt="card back" />
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
									{faceDownCards.map((card, index) => (
										<img
											key={index}
											src={cardBack}
											alt="card back"
											className={`card-back ${hand?.length === 0 && faceUpCards?.length === 0 ? "" : "inactive-card"}`}
											onClick={() => (hand?.length === 0 && faceUpCards?.length === 0 ? playFaceDownCard(index) : null)}
										/>
									))}
								</div>
							</div>
						</div>
						<div className="buttonContainer">
							<button style={{ display: "none" }} onClick={drawCard} className="playerButton" disabled={!isMyTurn}>
								Draw Card
							</button>
							<button style={{ display: "none" }} className="playerButton" disabled={!isMyTurn}>
								Start
							</button>
							<button onClick={submitSelectedCard} className="playerButton" disabled={!isMyTurn}>
								Submit
							</button>
							<button onClick={pickUpCards} className="playerButton" disabled={!isMyTurn}>
								Pick Up
							</button>
						</div>
					</div>
					<div className="cardsInHand">
						<p>Cards in hand:</p>
						<div className="cards" id="CardsInHand">
							{hand && hand.length > 0 ? (
								hand.map((card, index) => (
									<button className="card" key={index} onClick={() => selectCard(index)}>
										{card.rank} of {card.suit}
									</button>
								))
							) : (
								<p>No cards in hand</p>
							)}
						</div>
					</div>
				</div>
			</div>
			{popupMessage && <Popup message={popupMessage} onClose={() => setPopupMessage("")} />}{" "}
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
