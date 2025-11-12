import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import GameLobby from "./pages/GameLobby";
import GameBoard from "./pages/GameBoard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<GameLobby />} />
        <Route path="/game/:gameId" element={<GameBoard />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;