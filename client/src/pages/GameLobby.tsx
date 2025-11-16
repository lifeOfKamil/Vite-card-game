import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../lib/socket";

interface LobbyData {
	gameId: string;
	players: number;
	maxPlayers: number;
}

export function GameLobby() {
	const navigate = useNavigate();
	const [gameId, setGameId] = useState<string>("");
	const [lobbyInfo, setLobbyInfo] = useState<LobbyData | null>(null);
	const [inputGameId, setInputGameId] = useState<string>("");
	const [error, setError] = useState<string>("");
	const [isCreating, setIsCreating] = useState<boolean>(false);
	const [copied, setCopied] = useState<boolean>(false);
	const [connected, setConnected] = useState<boolean>(socket.connected);

	useEffect(() => {
		const onConnect = () => setConnected(true);
		const onDisconnect = () => setConnected(false);
		const onConnectError = (err: unknown) => {
			console.error("[socket connect_error]", err);
			setError("Cannot reach the game server. Please try again.");
			setIsCreating(false);
		};

		// If your socket was created with autoConnect: false, ensure we connect
		if (!socket.connected) {
			try {
				socket.connect();
			} catch (e) {
				console.error("socket.connect() failed", e);
			}
		}

		socket.on("connect", onConnect);
		socket.on("disconnect", onDisconnect);
		socket.on("connect_error", onConnectError);

		// existing handlers
		socket.on("gameCreated", (data: LobbyData) => {
			setGameId(data.gameId);
			setLobbyInfo(data);
			setError("");
			setIsCreating(false); // stop spinner on success
		});

		socket.on("gameJoined", (data: LobbyData) => {
			setGameId(data.gameId);
			setLobbyInfo(data);
			setError("");
			setIsCreating(false);
		});

		socket.on("lobbyUpdate", (data: LobbyData) => setLobbyInfo(data));

		socket.on("gameStarted", (data: { gameId: string }) => {
			navigate(`/game/${data.gameId}`);
		});

		socket.on("lobbyError", (errorMessage: string) => {
			setError(errorMessage);
			setIsCreating(false);
		});

		return () => {
			socket.off("connect", onConnect);
			socket.off("disconnect", onDisconnect);
			socket.off("connect_error", onConnectError);
			socket.off("gameCreated");
			socket.off("gameJoined");
			socket.off("lobbyUpdate");
			socket.off("gameStarted");
			socket.off("lobbyError");
		};
	}, [navigate]);

	// 2) robust create with ack + timeout
	const createGame = () => {
		if (!connected) {
			setError("Not connected to server. Please wait a moment and try again.");
			return;
		}
		setIsCreating(true);
		setError("");

		// timeout if server never responds
		const t = setTimeout(() => {
			setIsCreating(false);
			setError("Server didn’t respond. Please try again.");
		}, 7000);

		// Use Socket.IO ack to get immediate response (if your server supports it)
		socket.emit("createGame", (err: string | null, data?: LobbyData) => {
			clearTimeout(t);
			if (err) {
				setIsCreating(false);
				setError(err);
				return;
			}
			if (data) {
				setGameId(data.gameId);
				setLobbyInfo(data);
				setIsCreating(false);
			}
		});
	};

	const joinGame = () => {
		if (!inputGameId.trim()) {
			setError("Please enter a game ID");
			return;
		}
		setError("");
		socket.emit("joinGame", inputGameId.trim().toUpperCase());
	};

	const copyGameId = () => {
		if (gameId) {
			navigator.clipboard.writeText(gameId);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const leaveGame = () => {
		socket.emit("leaveGame");
		setGameId("");
		setLobbyInfo(null);
		setIsCreating(false);
		setError("");
	};

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === "Enter") {
			joinGame();
		}
	};

	// Waiting in lobby view
	if (lobbyInfo) {
		return (
			<div className="min-h-screen bg-linear-to-br from-[#064e3b] to-[#020617] flex items-center justify-center p-4">
				<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
					<h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Game Lobby</h1>

					<div className="bg-linear-to-r from-indigo-50 to-purple-50 rounded-xl p-6 mb-6">
						<h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">Game ID</h2>
						<div className="flex items-center gap-3 justify-center">
							<code className="text-3xl font-bold tracking-wider text-indigo-600 bg-white px-6 py-3 rounded-lg shadow-sm">
								{gameId}
							</code>
							<button
								onClick={copyGameId}
								className={`px-4 py-2 rounded-lg font-semibold transition-all duration-200 ${
									copied ? "bg-green-500 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
								}`}
							>
								{copied ? "✓ Copied!" : "Copy"}
							</button>
						</div>
						<p className="text-sm text-gray-600 text-center mt-3">Share this ID with your opponent</p>
					</div>

					<div className="bg-gray-50 rounded-xl p-6 mb-6">
						<h3 className="text-lg font-semibold text-gray-700 mb-3 text-center">Players</h3>
						<p className="text-5xl font-bold text-center text-indigo-600 mb-3">
							{lobbyInfo.players} / {lobbyInfo.maxPlayers}
						</p>
						{lobbyInfo.players < lobbyInfo.maxPlayers ? (
							<div className="flex items-center justify-center gap-2 text-yellow-600">
								<div className="animate-pulse">⏳</div>
								<p className="font-medium">Waiting for opponent...</p>
							</div>
						) : (
							<div className="flex items-center justify-center gap-2 text-green-600">
								<div className="animate-bounce">✓</div>
								<p className="font-bold">Starting game...</p>
							</div>
						)}
					</div>

					<button
						onClick={leaveGame}
						className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
					>
						Leave Game
					</button>
				</div>
			</div>
		);
	}

	// Initial lobby view (create or join)
	return (
		<div className="min-h-screen bg-linear-to-br from-[#064e3b] to-[#020617] flex items-center justify-center p-4">
			<div className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full">
				<h1 className="text-4xl font-bold text-center text-gray-800 mb-8">🃏 Haan Card Game</h1>

				<div className="space-y-6">
					{/* Create Game Section */}
					<div className="bg-linear-to-r from-indigo-50 to-indigo-100 rounded-xl p-6 border-2 border-indigo-200">
						<h2 className="text-2xl font-bold text-indigo-700 mb-2">Create a New Game</h2>
						<p className="text-gray-600 mb-4">Start a new game and share the ID with your opponent</p>
						<button
							onClick={createGame}
							disabled={isCreating}
							className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
						>
							{isCreating ? (
								<span className="flex items-center justify-center gap-2">
									<svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
										<circle
											className="opacity-25"
											cx="12"
											cy="12"
											r="10"
											stroke="currentColor"
											strokeWidth="4"
											fill="none"
										/>
										<path
											className="opacity-75"
											fill="currentColor"
											d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
										/>
									</svg>
									Creating...
								</span>
							) : (
								"Create Game"
							)}
						</button>
					</div>

					{/* Divider */}
					<div className="relative">
						<div className="absolute inset-0 flex items-center">
							<div className="w-full border-t-2 border-gray-300"></div>
						</div>
						<div className="relative flex justify-center">
							<span className="bg-white px-4 text-lg font-bold text-gray-500">OR</span>
						</div>
					</div>

					{/* Join Game Section */}
					<div className="bg-linear-to-r from-purple-50 to-purple-100 rounded-xl p-6 border-2 border-purple-200">
						<h2 className="text-2xl font-bold text-purple-700 mb-2">Join a Game</h2>
						<p className="text-gray-600 mb-4">Enter the game ID shared by your opponent</p>
						<div className="space-y-3">
							<input
								type="text"
								placeholder="Enter Game ID"
								value={inputGameId}
								onChange={(e) => setInputGameId(e.target.value.toUpperCase())}
								onKeyPress={handleKeyPress}
								maxLength={6}
								className="w-full px-4 py-3 text-center text-2xl font-mono font-bold text-gray-500 border-2 border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent uppercase"
							/>
							<button
								onClick={joinGame}
								className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 hover:shadow-lg"
							>
								Join Game
							</button>
						</div>
					</div>
				</div>

				{/* Error Message */}
				{error && (
					<div className="mt-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
						<div className="flex items-center">
							<div className="shrink-0">
								<svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<p className="text-sm font-medium text-red-800">{error}</p>
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}

export default GameLobby;
