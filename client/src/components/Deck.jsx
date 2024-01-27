import React from "react";
import Card from "./Card.jsx";

const suits = ["Hearts", "Diamonds", "Clubs", "Spades"];
const ranks = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];

export function generateDeck() {
	const deck = [];
	for (const suit of suits) {
		for (const rank of ranks) {
			deck.push({ suit, rank });
		}
	}
	return deck;
}

export function Deck({ cards }) {
	console.log(cards);
	return (
		<div className="deck">
			<Card suit={cards.suit} rank={cards.rank} />
		</div>
	);
}
