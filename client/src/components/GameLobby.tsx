import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { socket } from "../lib/socket";

type GameId = string;

type GameStatePayload = {
	gameId: string;
	players: Array<{ id: string }>;
};

export default function GameLobby() {
	const [games, setGames] = useState<GameId[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();
	const API = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

	useEffect(() => {
		let cancelled = false;

		// Fetch available games
		(async () => {
			try {
				const res = await fetch(`${API}/games`);
				if (!res.ok) throw new Error(`HTTP ${res.status}`);
				const data: GameId[] = await res.json();
				if (!cancelled) setGames(data);
			} catch (e) {
				if (e instanceof Error) setError(e.message);
				else setError("Failed to load games");
			} finally {
				if (!cancelled) setLoading(false);
			}
		})();

		// Connect socket and subscribe
		if (!socket.connected) socket.connect();

		const onGameState = (data: GameStatePayload) => {
			const isInGame = data.players.some((p) => p.id === socket.id);
			if (isInGame) navigate(`/game/${data.gameId}`);
		};

		socket.on("gameState", onGameState);

		return () => {
			socket.off("gameState", onGameState);
			// keep connection if you share socket across pages; otherwise:
			// socket.disconnect()
			cancelled = true;
		};
	}, [API, navigate]);

	const createGame = async () => {
		try {
			const res = await fetch(`${API}/games`, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
			});
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const data: { gameId: string } = await res.json();
			joinGame(data.gameId);
		} catch (e) {
			if (e instanceof Error) setError(e.message);
			else setError("Failed to create games");
		}
	};

	const joinGame = (gameId: string) => {
		// server should handle adding the current socket to the game,
		// then emit 'gameState' which will navigate on success
		socket.emit("joinGame", gameId);
	};

	if (loading) return <div>Loading games…</div>;
	if (error) return <div style={{ color: "crimson" }}>Error: {error}</div>;

	return (
		<div className="space-y-4">
			<h1>Game Lobby</h1>

			<button type="button" onClick={createGame}>
				Create Game
			</button>

			<h2>Available Games</h2>
			{games.length === 0 ? (
				<p>No games yet—create one!</p>
			) : (
				<ul className="space-y-2">
					{games.map((gameId) => (
						<li key={gameId}>
							<span style={{ marginRight: 8 }}>{gameId}</span>
							<button type="button" onClick={() => joinGame(gameId)}>
								Join
							</button>
						</li>
					))}
				</ul>
			)}
		</div>
	);
}
