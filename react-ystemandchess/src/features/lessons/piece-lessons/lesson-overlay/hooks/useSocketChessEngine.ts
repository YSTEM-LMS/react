import { environment } from "../../../../../environments";
import { useEffect, useRef } from "react";
import io from "socket.io-client";

export function useSocketChessEngine(onEvaluationComplete: (data: any) => void) {
    const socketRef = useRef<any>(null);
    // Keep ref in sync so the listener always calls the latest callback
    // without reconnecting the socket when the callback identity changes.
    const onEvaluationCompleteRef = useRef(onEvaluationComplete);
    useEffect(() => {
        onEvaluationCompleteRef.current = onEvaluationComplete;
    }, [onEvaluationComplete]);

    useEffect(() => {
        const socket = io(environment.urls.stockfishServerURL, { transports: ["websocket"] });
        socketRef.current = socket;

        socket.on("connect", () => {
            socket.emit("start-session", { sessionType: "lesson", fen: "", infoMode: false });
        });

        socket.on("evaluation-complete", (data) => onEvaluationCompleteRef.current(data));

        socket.on("evaluation-error", (msg) => {
            console.error("Error from socket:", msg.error);
        });

        return () => {
            socket.disconnect();
        };
    }, []); // connect once — callback updates go through the ref

    return socketRef;
}
