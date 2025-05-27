// WebSocket instance
let ws = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_INTERVAL = 3000;

// Initialize WebSocket connection
export const initWebSocket = () => {
  if (!ws) {
    try {
      ws = new WebSocket(`ws://${window.location.hostname}:3000`);
      
      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        reconnectAttempts = 0; // Reset attempts on successful connection
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      ws.onclose = (event) => {
        console.log('WebSocket disconnected:', event.code, event.reason);
        
        // Attempt to reconnect if not a normal closure
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
            setTimeout(() => {
              reconnectAttempts++;
              ws = null; // Reset ws instance
              initWebSocket();
            }, RECONNECT_INTERVAL);
          } else {
            console.error('Max reconnection attempts reached');
          }
        }
      };
    } catch (error) {
      console.error('Error initializing WebSocket:', error);
    }
  }
  return ws;
};

// Send message through WebSocket
export const sendWebSocketMessage = (message) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      const messageString = JSON.stringify(message);
      console.log('Sending WebSocket message:', messageString);
      ws.send(messageString);
    } catch (error) {
      console.error('Error sending WebSocket message:', error);
    }
  } else {
    console.warn('WebSocket is not connected. Message not sent:', message);
    // Try to reconnect if disconnected
    if (!ws || ws.readyState === WebSocket.CLOSED) {
      ws = null;
      initWebSocket();
    }
  }
};

// Close WebSocket connection
export const closeWebSocket = () => {
  if (ws) {
    try {
      ws.close(1000, 'Normal closure');
      ws = null;
      reconnectAttempts = 0;
    } catch (error) {
      console.error('Error closing WebSocket:', error);
    }
  }
}; 