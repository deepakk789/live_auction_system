import { io } from "socket.io-client";

const BACKEND_URL = "https://live-auction-system-hslw.onrender.com";

const socket = io(BACKEND_URL, {
  transports: ["websocket"],
  autoConnect: true,
});

export default socket;
