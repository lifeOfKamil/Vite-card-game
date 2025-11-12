import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";
import type { PlayingCard } from "../types/game";
import Card from "../components/Card";
import Popup from "../components/Popup";

interface Card {
	rank: string;
	suit: string;
	id?: string;
}
interface Player {
	id: string;
	hand: Card[];
	faceUpCards: Card[];
	faceDownCards: Card[];
}
interface GameStateData {
	players: Player[];
	deckLength: number;
	currentPlayerId: string;
	pileTop?: Card | null;
	pileLength?: number;
}
type BareCard = { rank: string; suit: string; id?: string };

function toPlayingCards(
	cards: BareCard[] | undefined,
	faceUp: boolean,
	owner: "me" | "opp",
	group: "down" | "up"
): PlayingCard[] {
	return (cards ?? []).map((c, i) => ({
		id: c.id ?? `${owner}-${group}-${c.rank}-${c.suit}-${i}`,
		rank: c.rank,
		suit: c.suit,
		faceUp,
	}));
}

function CardFaceUp({ card }: { card: Card }) {
	return (
		<Card
			card={{ ...card, faceUp: true } as PlayingCard}
			className="rounded-lg shadow-sm w-24 h-32"
			// onClick, disabled, etc if needed
		/>
	);
}

function CardFaceDown({
	onClick,
	clickable = false,
	className = "",
}: {
	onClick?: () => void;
	clickable?: boolean;
	className?: string;
}) {
	return (
		<Card
			card={{ id: "down", rank: "?", suit: "?", faceUp: false } as PlayingCard}
			onClick={clickable ? onClick : undefined}
			disabled={!clickable}
			className={`w-24 h-32 ${clickable ? "hover:scale-[1.03] transition-transform" : ""} ${className}`}
		/>
	);
}

function FaceStacks({
	down,
	up,
	canFlipIndex,
	onFlip,
	owner = "me",
}: {
	down: PlayingCard[];
	up: PlayingCard[];
	canFlipIndex?: (i: number) => boolean;
	onFlip?: (i: number) => void;
	owner?: "me" | "opponent";
	compact?: boolean;
}) {
	return (
		<div className="relative flex flex-col mt-14 items-center">
			{/* face-down row */}
			<div className="flex justify-center gap-2">
				{down.map((_c, i) => {
					const clickable = owner === "me" && !!canFlipIndex?.(i);
					return (
						<CardFaceDown
							key={`down-${i}`}
							clickable={clickable}
							onClick={clickable ? () => onFlip?.(i) : undefined}
							className="w-24 h-32"
						/>
					);
				})}
			</div>

			{/* face-up row */}
			{up.length > 0 && (
				<div className="absolute -top-7 left-1/2 -translate-x-1/2 flex justify-center gap-2" style={{ zIndex: 10 }}>
					{up.map((c, i) => (
						<CardFaceUp key={`up-${i}`} card={c} />
					))}
				</div>
			)}

			<div className="h-8" />
		</div>
	);
}

export default function GameBoard() {
	const { gameId } = useParams<{ gameId: string }>();
	const navigate = useNavigate();

	const [players, setPlayers] = useState<Player[]>([]);
	const [deckLength, setDeckLength] = useState<number>(0);
	const [gameDeck, setGameDeck] = useState<Card[]>([]);
	const [pileTop, setPileTop] = useState<Card | null>(null);
	const [pileLength, setPileLength] = useState<number>(0);
	const [isMyTurn, setIsMyTurn] = useState<boolean>(false);
	const [mustPlayAnotherCard, setMustPlayAnotherCard] = useState<boolean>(false);
	const [popupMessage, setPopupMessage] = useState<{
		text: string;
		variant: "info" | "success" | "warning" | "error";
	} | null>(null);
	const [selectedIdx, setSelectedIdx] = useState<number[]>([]);

	// derived
	const me = useMemo(() => players.find((p) => p.id === socket.id) || null, [players]);
	const opp = useMemo(() => players.find((p) => p.id !== socket.id) || null, [players]);

	useEffect(() => {
		if (!gameId) {
			navigate("/");
			return;
		}

		socket.emit("requestGameState");

		const onGameState = (data: GameStateData) => {
			setPlayers(data.players);
			setDeckLength(data.deckLength);
			setIsMyTurn(data.currentPlayerId === socket.id);
			setPileTop(data.pileTop ?? null);
			setPileLength(data.pileLength ?? 0);
			console.log("Game state received:", data);
		};

		socket.on("gameState", onGameState);

		socket.on("handUpdated", (newHand: Card[]) => {
			// update only my hand locally
			setPlayers((prev) => prev.map((p) => (p.id === socket.id ? { ...p, hand: newHand } : p)));
		});

		socket.on("cardDrawnToHand", (card: Card) => {
			setPlayers((prev) => prev.map((p) => (p.id === socket.id ? { ...p, hand: [...p.hand, card] } : p)));
		});

		socket.on("cardPlayed", (newGameDeck: Card[]) => setGameDeck(newGameDeck));
		socket.on("gameDeckUpdated", (newGameDeck: Card[]) => setGameDeck(newGameDeck));

		socket.on("gameDeckCleared", ({ reason }) => {
			setGameDeck([]);
			console.log("Game deck has been cleared", gameDeck);

			const msg = reason === "fourOfAKind" ? "Game deck cleared by 4 of a kind!" : "Game deck cleared by a 10!";

			setPopupMessage({
				text: `Pile cleared by ${msg}`,
				variant: "success",
			});
		});

		socket.on("gameDeckEmpty", () => setGameDeck([]));

		socket.on("playAnotherCard", () => {
			setMustPlayAnotherCard(true);
			setPopupMessage({
				text: "You played a 2 — play another card!",
				variant: "info",
			});
		});

		socket.on("error", (msg: string) => {
			setPopupMessage({
				text: msg || "Something went wrong",
				variant: "error",
			});
		});

		socket.on("playerDisconnected", ({ message }: { message: string }) => {
			setPopupMessage({
				text: "Opponent disconnected: " + message,
				variant: "warning",
			});
		});

		const onGameWon = ({ winnerId }: { winnerId: string }) => {
			const msg = winnerId === socket.id ? "You win! 🎉" : "Opponent wins! 👏";
			setPopupMessage({ text: msg, variant: "success" });
			setIsMyTurn(false);
		};

		socket.on("gameWon", onGameWon);

		return () => {
			socket.off("gameState");
			socket.off("handUpdated");
			socket.off("cardDrawnToHand");
			socket.off("cardPlayed");
			socket.off("gameDeckUpdated");
			socket.off("gameDeckCleared");
			socket.off("gameDeckEmpty");
			socket.off("playAnotherCard");
			socket.off("error");
			socket.off("playerDisconnected");
			socket.off("gameWon");
		};
	}, [gameId, navigate]);

	const submitSelected = () => {
		if (!isMyTurn) return;
		if (selectedIdx.length === 0) {
			setPopupMessage({ text: "Select at least one card", variant: "warning" });
			return;
		}
		socket.emit("playCards", { indices: selectedIdx }); // server is source of truth
		setSelectedIdx([]);
	};

	const playFaceDownCard = (index: number) => {
		if (!isMyTurn) return;
		// only allowed when hand & face-up are empty OR after a 2
		const canFlip = mustPlayAnotherCard || ((me?.hand.length ?? 0) === 0 && (me?.faceUpCards.length ?? 0) === 0);
		if (!canFlip) return;

		socket.emit("playFaceDownCard", { index, playerId: socket.id });

		// remove locally for snappy UX (server will re-sync)
		if (me) {
			setPlayers((prev) =>
				prev.map((p) => {
					if (p.id !== me.id) return p;
					const next = [...p.faceDownCards];
					next.splice(index, 1);
					return { ...p, faceDownCards: next };
				})
			);
		}
		setMustPlayAnotherCard(false);
	};

	const toggleSelect = (i: number) => {
		setSelectedIdx((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i].sort((a, b) => a - b)));
	};

	const pickUpCards = () => {
		if (!isMyTurn) return;
		setGameDeck([]);
		socket.emit("pickUpCards");
	};

	const leaveGame = () => {
		socket.emit("leaveGame");
		navigate("/");
	};

	return (
		<div className="min-h-screen sm:px-10 px-6 bg-neutral-900 text-slate-100">
			{/* header */}
			<div className="max-w-6xl mx-auto py-3 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<span className="text-xl font-semibold">Haan</span>
					<span
						className={`px-2 py-0.5 rounded text-xs border
            ${isMyTurn ? "bg-emerald-600/20 text-emerald-300 border-emerald-600/40" : "bg-slate-700/50 text-slate-300 border-slate-600/50"}`}
					>
						{isMyTurn ? "Your turn" : "Opponent turn"}
					</span>
					<span className="text-xs text-slate-400">Game Id: {gameId}</span>
				</div>
				<button onClick={leaveGame} className="px-3 py-1.5 rounded-md bg-rose-600 hover:bg-rose-700 text-white text-sm">
					Leave
				</button>
			</div>

			{/* table: 3-column on md+, stacked on mobile */}
			<div
				className="max-w-6xl mx-auto sm:pb-8 grid gap-6
                      grid-cols-1 xl:grid-cols-[minmax(240px,50%)_minmax(220px,50%)] 3xl:mt-10 xl:justify-items-normal"
			>
				{/* LEFT COLUMN: opponent (top) + you (bottom) */}
				<div className="flex flex-col justify-between gap-8">
					{/* Opponent */}
					<section className="rounded-xl bg-neutral-800/60 border border-neutral-700 p-4">
						<div className="text-sm mb-3">
							<div className="font-semibold">Opponent</div>
							<div className="text-xs text-slate-400">{opp ? `ID: ${opp.id.slice(0, 6)}` : "Waiting…"}</div>
						</div>
						<FaceStacks
							down={toPlayingCards(opp?.faceDownCards, false, "opp", "down")}
							up={toPlayingCards(opp?.faceUpCards, true, "opp", "up")}
							compact
							owner="opponent"
						/>
					</section>

					{/* CENTER: deck + pile */}
					<section className="rounded-xl bg-neutral-800/60 border border-neutral-700 p-4 flex flex-row items-center justify-center gap-6 ">
						{/* Deck */}
						<div className="flex flex-col items-center gap-2">
							{deckLength > 0 ? (
								<div className="relative my-8">
									<CardFaceDown clickable={isMyTurn} />
									<span className="absolute -top-2 -right-2 text-xs bg-neutral-900 border border-neutral-700 rounded-full px-2 py-0.5">
										{deckLength}
									</span>
								</div>
							) : (
								<span className="text-xs text-slate-400 italic">Deck empty</span>
							)}
							<span className="text-[11px] text-slate-400">Deck</span>
						</div>

						{/* Pile */}
						<div className="flex flex-col items-center gap-2">
							{pileLength > 0 && pileTop ? (
								<CardFaceUp card={pileTop} />
							) : (
								<span className="text-xs text-slate-400 italic">Pile empty</span>
							)}
							<span className="text-[11px] text-slate-400">Pile{pileLength ? ` (${pileLength})` : ""}</span>
						</div>

						{/* Actions */}
						<div className="flex gap-2 flex-col">
							<button
								onClick={pickUpCards}
								disabled={!isMyTurn}
								className="px-3 py-1.5 text-sm rounded-md border border-neutral-600 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50"
							>
								Pick Up
							</button>
							<button
								onClick={submitSelected}
								disabled={!isMyTurn || selectedIdx.length === 0}
								className="px-3 py-1.5 text-sm rounded-md border border-neutral-600 bg-neutral-700 hover:bg-neutral-600 disabled:opacity-50"
							>
								Play
							</button>
						</div>
					</section>
					{/* You */}
					<section className="rounded-xl bg-neutral-800/60 border border-neutral-700 p-4">
						<div className="text-sm mb-3">
							<div className="font-semibold">You</div>
							<div className="text-xs text-slate-400">{socket?.id?.slice(0, 6)}</div>
						</div>
						<FaceStacks
							down={toPlayingCards(me?.faceDownCards, false, "me", "down")}
							up={toPlayingCards(me?.faceUpCards, true, "me", "up")}
							compact
							owner="me"
							canFlipIndex={(_i) => {
								const handCount = me?.hand?.length ?? 0;
								const upCount = me?.faceUpCards?.length ?? 0;
								return isMyTurn && (mustPlayAnotherCard || (handCount === 0 && upCount === 0));
							}}
							onFlip={(i) => playFaceDownCard(i)}
						/>
					</section>
				</div>

				{popupMessage && (
					<Popup
						message={popupMessage.text}
						variant={popupMessage.variant} // "info" | "success" | "warning" | "error"
						autoCloseMs={3500}
						onClose={() => setPopupMessage(null)}
					/>
				)}

				{/* RIGHT: hand */}
				<section className="hand-section sm:rounded-xl p-4 pb-20 xl:min-h-[726px]">
					<div className="text-sm pb-4 font-semibold">Cards in Hand</div>

					<div className="mx-auto w-full max-w-5xl flex flex-wrap justify-center gap-2">
						{me?.hand?.map((c, idx) => {
							const selected = selectedIdx.includes(idx);
							return (
								<Card
									key={`${c.id ?? `${c.rank}${c.suit}`}-${idx}`}
									card={{ ...c, faceUp: true } as PlayingCard}
									onClick={() => isMyTurn && toggleSelect(idx)}
									disabled={!isMyTurn}
									className={[
										"w-24 h-32 basis-27 shrink-0 rounded-lg shadow-sm transition-transform",
										isMyTurn ? "hover:-translate-y-1" : "cursor-not-allowed",
										selected ? "ring-3 ring-blue-500 -translate-y-2" : "",
									].join(" ")}
								/>
							);
						})}
					</div>
				</section>
			</div>
		</div>
	);
}
