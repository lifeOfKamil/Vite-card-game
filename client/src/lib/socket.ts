import { io } from "socket.io-client";

// Create and export socket instance
export const socket = io({
  autoConnect: true,
  transports: ["websocket"],
  withCredentials: false,
});

// Optional: Add connection logging for debugging
socket.on("connect", () => {
  console.log("✅ Connected to server:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ Disconnected from server");
});

socket.on("connect_error", (error) => {
  console.error("🔥 Connection error:", error);
});