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
			document.getElementById("card-back").src = cardBack;
			document.getElementById("card-back").style.width = "168px";
			document.getElementById("card-back").style.height = "245px";
		});

		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		socket.on("updatePlayerCards", (cards) => {
			setPlayerCards(cards);
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
			socket.off("updateDeck");
			socket.off("updatePlayerCards");
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

	return (
		<>
			<div className="gameBoard">
				<div className="cardsInPlay">
					<div className="userArea">
						<h4>Player 2</h4>
						<p>{users.length > 1 ? users[1].id : "Waiting for Player 2"}</p>
					</div>
					<div className="dealerArea">
						<div className="buttonContainer">
							<button onClick={drawCard} class="playerButton">
								Draw Card
							</button>
							<button onClick={drawCard} class="playerButton">
								Start
							</button>
						</div>
						<img id="card-back" alt="card_back" />
						<div className="deck">
							<Deck cards={deck[deck.length - 1]} />
						</div>
					</div>
					<div className="userArea">
						<h4>Player 1</h4>
						<p>{users.length > 0 ? users[0].id : "Waiting for Player 1"}</p>
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
