import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { API_BASE } from "../api";

/** Single Socket.IO connection for the chat session. */
export function useSocket() {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // An empty base must be undefined: io("") does not fall back to the page's origin.
    const socket = io(API_BASE || undefined, {
      transports: ["websocket"],
      withCredentials: true,
    });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));

    return () => {
      try {
        socket.disconnect();
      } catch {
        // ignore
      }
    };
  }, []);

  return { socketRef, connected };
}
