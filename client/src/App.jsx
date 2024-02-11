import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck } from "./components/Deck";
import cardBack from "./assets/Card_back.png";

const socket = io("http://localhost:3000");

function App() {
	const [deck, setDeck] = useState([]); // dealer deck
	const [gameDeck, setGameDeck] = useState([]); // game deck
	const [users, setUsers] = useState([]);
	const [playerCards, setPlayerCards] = useState([]); // cards in hand
	const [player1_faceUpCards, setPlayer1_faceUpCards] = useState([]);
	const [player2_faceUpCards, setPlayer2_faceUpCards] = useState([]);
	const [playerGambleCards, setPlayerGambleCards] = useState([]); // face down cards
	const [selectedCard, setSelectedCard] = useState(null);

	useEffect(() => {
		console.log("Player 1 Face Up Cards: ", player1_faceUpCards);
	}, [player1_faceUpCards]);

	useEffect(() => {
		console.log("Player 2 Face Up Cards: ", player2_faceUpCards);
	}, [player2_faceUpCards]);

	useEffect(() => {
		socket.emit("requestDeck");
		socket.on("connect", () => {
			const cardBackElements = document.getElementsByClassName("card-back");
			for (let i = 0; i < cardBackElements.length; i++) {
				cardBackElements[i].src = cardBack;
				cardBackElements[i].style.width = "168px";
				cardBackElements[i].style.height = "245px";
			}
		});

		socket.on("deckGenerated", (generatedDeck) => {
			setDeck(generatedDeck);
		});

		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		socket.on("updateGameDeck", (updatedGameDeck) => {
			setGameDeck(updatedGameDeck);
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

		socket.on("updateGambleCards", (p1_faceUpCards, p2_faceUpCards) => {
			setPlayer1_faceUpCards(p1_faceUpCards);
			setPlayer2_faceUpCards(p2_faceUpCards);
		});

		socket.on("gameData", ({ gameId, users }) => {
			setUsers(users);
		});

		socket.on("cardDrawn", (card) => {
			setPlayerCards((currentPlayerCards) => [...currentPlayerCards, card]);
			console.log(playerCards);
		});

		socket.on("reject", (message) => {
			alert(message);
		});

		socket.on("startGame", () => {
			const updatedDeck = [...deck];
			setDeck(updatedDeck);
			//socket.emit("updatePlayerCards", cards);
		});

		return () => {
			socket.off("connect");
			socket.off("updateDeck");
			socket.off("updatePlayerCards");
			socket.off("updateGambleCards");
			socket.off("gameData");
			socket.off("cardDrawn");
			socket.off("reject");
			socket.off("updateGameDeck");
		};
	}, []);

	const drawCard = () => {
		const updatedDeck = [...deck];
		setDeck(updatedDeck);
		socket.emit("drawCard");
	};

	const updatePlayerCards = (cards) => {
		socket.emit("updatePlayerCards", cards);
	};

	const selectCard = (card) => {
		setSelectedCard(card);
	};

	const submitSelectedCard = () => {
		if (selectedCard) {
			const updatedDeck = [...deck, selectedCard];
			const updatedPlayerCards = playerCards.filter((card) => card !== selectedCard);
			const updatedGameDeck = [...gameDeck, selectedCard];
			gameDeck.push(selectedCard);
			console.log("Game Deck: ", gameDeck);
			setDeck(updatedDeck);
			setPlayerCards(updatedPlayerCards);
			socket.emit("submitCard", selectedCard);
			setSelectedCard(null);
		} else {
			alert("No card selected.");
		}
	};

	const startGame = () => {
		const updatedDeck = [...deck];
		setDeck(updatedDeck);
		// socket.emit("gambleCards", { updatedDeck, cards });
		// socket.emit("updateGambleCards", cards);
		socket.emit("startGame");
	};

	return (
		<>
			<div className="gameBoard">
				<div className="cardsInPlay">
					<div className="userArea">
						<div className="userInfo">
							<h4>Player 2</h4>
							<p>{users.length > 1 ? users[1].id : "Waiting for Player 2"}</p>
						</div>
						<div className="user-cards user-2">
							<button className="card face-up">
								{player2_faceUpCards.length > 0
									? `${player2_faceUpCards[0].rank} of ${player2_faceUpCards[0].suit}`
									: "-"}
							</button>
							<button className="card face-up">
								{player2_faceUpCards.length > 0
									? `${player2_faceUpCards[1].rank} of ${player2_faceUpCards[1].suit}`
									: "-"}
							</button>
							<button className="card face-up">
								{player2_faceUpCards.length > 0
									? `${player2_faceUpCards[2].rank} of ${player2_faceUpCards[2].suit}`
									: "-"}
							</button>
							<div className="gamble-cards user-2">
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
							</div>
						</div>
					</div>
					<div className="dealerArea">
						<div className="buttonContainer">
							<button onClick={drawCard} className="playerButton">
								Draw Card
							</button>
							<button onClick={startGame} className="playerButton">
								Start
							</button>
							<button onClick={submitSelectedCard} className="playerButton">
								Submit
							</button>
						</div>
						<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
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
							<h4>Player 1</h4>
							<p>{users.length > 0 ? users[0].id : "Waiting for Player 1"}</p>
						</div>
						<div className="user-cards user-1">
							<button className="card face-up">
								{player1_faceUpCards.length > 0
									? `${player1_faceUpCards[0].rank} of ${player1_faceUpCards[0].suit}`
									: "-"}
							</button>
							<button className="card face-up">
								{player1_faceUpCards.length > 0
									? `${player1_faceUpCards[1].rank} of ${player1_faceUpCards[1].suit}`
									: "-"}
							</button>
							<button className="card face-up">
								{player1_faceUpCards.length > 0
									? `${player1_faceUpCards[2].rank} of ${player1_faceUpCards[2].suit}`
									: "-"}
							</button>
							<div className="gamble-cards user-1">
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
								<img className="card-back" src={cardBack} style={{ width: "168px", height: "245px" }} alt="card back" />
							</div>
						</div>
					</div>
				</div>
				<div className="cardsInHand">
					<p>Cards in hand:</p>
					<div className="cards" id="CardsInHand">
						{playerCards
							? playerCards.map((card, index) => (
									<button
										key={index}
										className={`card cardHand ${selectedCard === card ? "selected" : ""}`}
										onClick={() => selectCard(card)}
									>{`${card.rank} of ${card.suit}`}</button>
							  ))
							: null}
					</div>
				</div>
			</div>
		</>
	);
}

export default App;
