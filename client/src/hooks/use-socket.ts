import { useEffect, useState, useRef, useCallback } from "react";

export function useSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // In development, Vite dev server proxies to the Express server
    // So we should connect to the same host that served the page
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log('Attempting WebSocket connection to:', wsUrl);
    console.log('Current location:', window.location.href);

    try {
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      // Add a small delay before marking as connected to ensure WebSocket is ready
      let connectionTimeout: NodeJS.Timeout;

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        // Add small delay to ensure connection is fully ready
        connectionTimeout = setTimeout(() => {
          setIsConnected(true);
        }, 100);
      };

      socket.onclose = (event) => {
        console.log('WebSocket disconnected. Code:', event.code, 'Reason:', event.reason);
        setIsConnected(false);
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      return () => {
        if (connectionTimeout) {
          clearTimeout(connectionTimeout);
        }
        if (socketRef.current) {
          socketRef.current.close();
        }
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setIsConnected(false);
    }
  }, []);

  // Safe send function that checks connection state
  const safeSend = useCallback((data: string) => {
    const socket = socketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
      return true;
    } else {
      console.warn('WebSocket not ready. Current state:', socket?.readyState);
      return false;
    }
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    safeSend
  };
}