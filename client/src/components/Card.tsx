import React from "react";
import type { PlayingCard } from "../types/game";
import { getCardImagePath, CARD_BACK } from "../utils/cardImages";
import "../App.css";

type CardProps = {
	card: PlayingCard;
	onClick?: (card: PlayingCard) => void;
	disabled?: boolean;
	className?: string;
};

const baseStyle: React.CSSProperties = {
	border: "None",
	backgroundColor: "#fff",
	width: "108px",
	height: "auto",
	cursor: "pointer",
	display: "flex",
	alignItems: "center",
	justifyContent: "center",
	padding: "0",
};

export default function Card({ card, onClick, disabled, className }: CardProps) {
	const label = `${card.rank} of ${card.suit}`;
	const front = getCardImagePath(card);
	const src = card.faceUp === false ? CARD_BACK : front;
	//console.log('card->', card, 'img src->', src);

	return (
		<button
			type="button"
			style={baseStyle}
			className={`card ${className ?? ""}`}
			onClick={() => onClick?.(card)}
			disabled={disabled}
			aria-label={label}
		>
			<img
				src={src}
				alt={label}
				onError={(e) => {
					(e.currentTarget as HTMLImageElement).src = CARD_BACK;
				}}
				style={{ width: "100%", height: "100%", objectFit: "cover", pointerEvents: "none" }}
			/>
		</button>
	);
}
