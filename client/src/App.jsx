import react, { useState, useEffect } from "react";
import { io } from "socket.io-client";
import { Deck, generateDeck } from "./components/Deck";

const socket = io("http://localhost:3000");

function App() {
	const [count, setCount] = useState(0);
	const [deck, setDeck] = useState(generateDeck());

	useEffect(() => {
		socket.on("updateDeck", (updatedDeck) => {
			setDeck(updatedDeck);
		});

		return () => {
			socket.off("updateDeck");
		};
	}, []);

	const drawCard = () => {
		const updatedDeck = [...deck];
		const drawnCard = updatedDeck.pop();
		setDeck(updatedDeck);
		socket.emit("drawCard", { updatedDeck, drawnCard });
	};

	return (
		<>
			<div className="countBtn">
				<button onClick={() => setCount((count) => count + 1)}>count is {count}</button>
			</div>
			<div className="drawBtn">
				<button onClick={drawCard}>Draw Card</button>
			</div>
			<div className="deck">
				<Deck cards={deck[deck.length - 1]} />
			</div>
		</>
	);
}

export default App;
