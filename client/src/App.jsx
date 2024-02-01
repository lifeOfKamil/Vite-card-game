import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck, generateDeck } from "./components/Deck";
import cardBack from "./assets/Card_back.png";

const socket = io("http://localhost:3000");

function App() {
	const [deck, setDeck] = useState(generateDeck());
	const [playerCards, setPlayerCards] = useState([]);
	const [playerGambleCards, setPlayerGambleCards] = useState([]);
	const [users, setUsers] = useState([]);

	useEffect(() => {
		socket.on("connect", () => {
			const cardBackElements = document.getElementsByClassName("card-back");
			for (let i = 0; i < cardBackElements.length; i++) {
				cardBackElements[i].src = cardBack;
				cardBackElements[i].style.width = "168px";
				cardBackElements[i].style.height = "245px";
			}
		});

		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		socket.on("updatePlayerCards", (cards) => {
			setPlayerCards(cards);
		});

		socket.on("updateGambleCards", (cards) => {
			setPlayerGambleCards(cards);
		});

		socket.on("gameData", ({ gameId, users }) => {
			setUsers(users);
		});

		socket.on("reject", (message) => {
			alert(message);
		});

		socket.on("startGame", () => {
			const updatedDeck = [...deck];
			setDeck(updatedDeck);
			socket.emit("updatePlayerCards", cards);
		});

		return () => {
			socket.off("connect");
			socket.off("updateDeck");
			socket.off("updatePlayerCards");
			socket.off("updateGambleCards");
			socket.off("gameData");
			socket.off("reject");
		};
	}, []);

	const drawCard = () => {
		const updatedDeck = [...deck];
		const drawnCard = updatedDeck.pop();
		setDeck(updatedDeck);
		socket.emit("drawCard", { updatedDeck, drawnCard });
	};

	const updatePlayerCards = (cards) => {
		socket.emit("updatePlayerCards", cards);
	};

	const startGame = () => {
		const updatedDeck = [...deck];
		const cards = [];
		for (let i = 0; i < 3; i++) {
			cards.push(updatedDeck.pop());
		}
		setDeck(updatedDeck);
		socket.emit("gambleCards", { updatedDeck, cards });
		socket.emit("updateGambleCards", cards);
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
								{playerGambleCards.length > 0
									? `${playerGambleCards[0].rank} of ${playerGambleCards[0].suit}`
									: "No Card"}
							</button>
							<button className="card face-up">
								{playerGambleCards.length > 0
									? `${playerGambleCards[1].rank} of ${playerGambleCards[1].suit}`
									: "No Card"}
							</button>
							<button className="card face-up">
								{playerGambleCards.length > 0
									? `${playerGambleCards[2].rank} of ${playerGambleCards[2].suit}`
									: "No Card"}
							</button>
							<div className="gamble-cards user-2">
								<img class="card-back" alt="card_back" />
								<img class="card-back" alt="card_back" />
								<img class="card-back" alt="card_back" />
							</div>
						</div>
					</div>
					<div className="dealerArea">
						<div className="buttonContainer">
							<button onClick={drawCard} class="playerButton">
								Draw Card
							</button>
							<button onClick={startGame} class="playerButton">
								Start
							</button>
						</div>
						<img class="card-back" alt="card_back" />
						<div className="deck">
							<Deck cards={deck[deck.length - 1]} />
						</div>
					</div>
					<div className="userArea">
						<div className="userInfo">
							<h4>Player 1</h4>
							<p>{users.length > 0 ? users[0].id : "Waiting for Player 1"}</p>
						</div>
						<div className="user-cards user-1">
							<button className="card face-up">
								{playerGambleCards.length > 0
									? `${playerGambleCards[0].rank} of ${playerGambleCards[0].suit}`
									: "No Card"}
							</button>
							<button className="card face-up">
								{playerGambleCards.length > 0
									? `${playerGambleCards[1].rank} of ${playerGambleCards[1].suit}`
									: "No Card"}
							</button>
							<button className="card face-up">
								{playerGambleCards.length > 0
									? `${playerGambleCards[2].rank} of ${playerGambleCards[2].suit}`
									: "No Card"}
							</button>
							<div className="gamble-cards user-1">
								<img class="card-back" alt="card_back" />
								<img class="card-back" alt="card_back" />
								<img class="card-back" alt="card_back" />
							</div>
						</div>
					</div>
				</div>
				<div className="cardsInHand">
					<p>display cards in hand</p>
				</div>
			</div>
		</>
	);
}

export default App;
