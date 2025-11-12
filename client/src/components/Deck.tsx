import { useMemo } from "react";
import Card from "./Card";
import { generateDeck } from "../utils/deckUtils";
import type { PlayingCard } from "../types/game";

type DeckProps = {
	cards?: PlayingCard[];
	onCardClick?: (card: PlayingCard) => void;
	className?: string;
};

export function Deck({ cards, onCardClick, className }: DeckProps) {
	const list = useMemo(() => cards ?? generateDeck(), [cards]);

	return (
		<div className={`deck grid gap-3 sm:grid-cols-2 md:grid-cols-3 ${className ?? ""}`}>
			{list.map((c) => (
				<Card key={c.id} card={c} onClick={onCardClick} />
			))}
		</div>
	);
}
