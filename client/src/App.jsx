import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck, generateDeck } from "./components/Deck";

const socket = io("http://localhost:3000");

function App() {
	const [count, setCount] = useState(0);
	const [deck, setDeck] = useState(generateDeck());
	const [playerCards, setPlayerCards] = useState([]);

	useEffect(() => {
		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		socket.on("updatePlayerCards", (cards) => {
			setPlayerCards(cards);
		});

		socket.on("reject", (message) => {
			alert(message);
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
			<div className="user-area">
				<h4>User 1</h4>
				<p></p>
			</div>
			<div className="countBtn">
				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
			</div>
			<div className="drawBtn">
				<button onClick={drawCard}>Draw Card</button>
			</div>
			<div className="deck">
				<Deck cards={deck[deck.length - 1]} />
			</div>
			<div className="playerCards">
				{playerCards.map((cards) => (
					<Deck cards={cards} />
				))}
			</div>
		</>
	);
}

export default App;
