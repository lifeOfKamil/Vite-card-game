import { io } from "socket.io-client";

const URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create and export socket instance
export const socket = io(URL, {
  autoConnect: true,
  transports: ["websocket", "polling"],
  withCredentials: false,
  path: "/socket.io",
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