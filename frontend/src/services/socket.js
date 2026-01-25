import { io } from "socket.io-client";

const BACKEND_URL = "https://live-auction-system-hslw.onrender.com";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
});

export default socket;
