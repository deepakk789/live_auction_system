import { io } from "socket.io-client";

export const BACKEND_URL = "http://localhost:5000";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
