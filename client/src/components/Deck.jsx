import React from "react";
import Card from "./Card";

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
	return (
		<div className="deck">
			{cards.map((card, index) => (
				<div key={index} className="card">
					{`${card.rank} of ${card.suit}`}
				</div>
			))}
		</div>
	);
}
