import { io } from "socket.io-client";

export const socket = io("https://nuvro-dtao9.ondigitalocean.app", {
  transports: ['websocket'],
  withCredentials: true,
});
