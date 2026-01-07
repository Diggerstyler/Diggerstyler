/**
 * WebSocketService - Robust WebSocket connection management
 * Features:
 * - Auto-reconnect with exponential backoff
 * - Connection state monitoring
 * - Message queuing during reconnection
 * - Heartbeat/ping-pong
 * - Event-based architecture
 */

const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

class WebSocketService {
  constructor() {
    this.connections = new Map(); // standId -> connection info
    this.listeners = new Map(); // standId -> Set of listeners
    this.messageQueue = new Map(); // standId -> queued messages
  }

  /**
   * Connect to WebSocket for a specific stand
   */
  connect(standId, options = {}) {
    if (this.connections.has(standId)) {
      const conn = this.connections.get(standId);
      if (conn.ws.readyState === WebSocket.OPEN || conn.ws.readyState === WebSocket.CONNECTING) {
        return conn;
      }
    }

    const conn = {
      standId,
      ws: null,
      reconnectAttempts: 0,
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      reconnectDelay: options.reconnectDelay || 1000,
      maxReconnectDelay: options.maxReconnectDelay || 30000,
      isIntentionallyClosed: false,
      lastMessageTime: Date.now(),
      heartbeatInterval: null,
      reconnectTimeout: null,
    };

    this.connections.set(standId, conn);
    this.messageQueue.set(standId, []);
    
    this._establishConnection(standId);
    
    return conn;
  }

  /**
   * Establish WebSocket connection
   */
  _establishConnection(standId) {
    const conn = this.connections.get(standId);
    if (!conn || conn.isIntentionallyClosed) return;

    try {
      conn.ws = new WebSocket(`${WS_URL}/ws/${standId}`);

      conn.ws.onopen = () => {
        console.log(`[WS] Connected to stand ${standId}`);
        conn.reconnectAttempts = 0;
        conn.lastMessageTime = Date.now();
        
        // Start heartbeat
        this._startHeartbeat(standId);
        
        // Process queued messages
        this._processQueue(standId);
        
        // Notify listeners
        this._emit(standId, 'connected', { standId });
      };

      conn.ws.onclose = (event) => {
        console.log(`[WS] Disconnected from stand ${standId}:`, event.code, event.reason);
        this._stopHeartbeat(standId);
        
        if (!conn.isIntentionallyClosed) {
          this._scheduleReconnect(standId);
        }
        
        this._emit(standId, 'disconnected', { standId, code: event.code });
      };

      conn.ws.onerror = (error) => {
        console.error(`[WS] Error for stand ${standId}:`, error);
        this._emit(standId, 'error', { standId, error });
      };

      conn.ws.onmessage = (event) => {
        conn.lastMessageTime = Date.now();
        
        try {
          const data = JSON.parse(event.data);
          this._emit(standId, 'message', data);
          
          // Handle specific message types
          if (data.type === 'pong') {
            // Heartbeat response
          } else if (data.type === 'order_update') {
            this._emit(standId, 'order_update', data);
          } else if (data.type === 'stock_update') {
            this._emit(standId, 'stock_update', data);
          }
        } catch (e) {
          console.warn('[WS] Failed to parse message:', e);
        }
      };
    } catch (error) {
      console.error(`[WS] Failed to create connection for stand ${standId}:`, error);
      this._scheduleReconnect(standId);
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  _scheduleReconnect(standId) {
    const conn = this.connections.get(standId);
    if (!conn || conn.isIntentionallyClosed) return;

    if (conn.reconnectAttempts >= conn.maxReconnectAttempts) {
      console.error(`[WS] Max reconnect attempts reached for stand ${standId}`);
      this._emit(standId, 'max_reconnect_reached', { standId });
      return;
    }

    // Exponential backoff with jitter
    const delay = Math.min(
      conn.reconnectDelay * Math.pow(2, conn.reconnectAttempts) + Math.random() * 1000,
      conn.maxReconnectDelay
    );

    console.log(`[WS] Reconnecting to stand ${standId} in ${delay}ms (attempt ${conn.reconnectAttempts + 1})`);
    
    conn.reconnectTimeout = setTimeout(() => {
      conn.reconnectAttempts++;
      this._establishConnection(standId);
    }, delay);
    
    this._emit(standId, 'reconnecting', { standId, attempt: conn.reconnectAttempts + 1, delay });
  }

  /**
   * Start heartbeat to detect connection issues
   */
  _startHeartbeat(standId) {
    const conn = this.connections.get(standId);
    if (!conn) return;

    this._stopHeartbeat(standId);
    
    conn.heartbeatInterval = setInterval(() => {
      if (conn.ws.readyState === WebSocket.OPEN) {
        // Check if we haven't received anything in 30 seconds
        const timeSinceLastMessage = Date.now() - conn.lastMessageTime;
        if (timeSinceLastMessage > 30000) {
          console.warn(`[WS] No activity for 30s on stand ${standId}, sending ping`);
          try {
            conn.ws.send(JSON.stringify({ type: 'ping' }));
          } catch (e) {
            console.error('[WS] Failed to send ping:', e);
          }
        }
        
        // If no response for 45 seconds, force reconnect
        if (timeSinceLastMessage > 45000) {
          console.warn(`[WS] Connection stale for stand ${standId}, forcing reconnect`);
          conn.ws.close();
        }
      }
    }, 10000);
  }

  /**
   * Stop heartbeat
   */
  _stopHeartbeat(standId) {
    const conn = this.connections.get(standId);
    if (conn?.heartbeatInterval) {
      clearInterval(conn.heartbeatInterval);
      conn.heartbeatInterval = null;
    }
  }

  /**
   * Process queued messages
   */
  _processQueue(standId) {
    const queue = this.messageQueue.get(standId);
    const conn = this.connections.get(standId);
    
    if (!queue || !conn || conn.ws.readyState !== WebSocket.OPEN) return;

    while (queue.length > 0) {
      const message = queue.shift();
      try {
        conn.ws.send(JSON.stringify(message));
      } catch (e) {
        console.error('[WS] Failed to send queued message:', e);
        queue.unshift(message);
        break;
      }
    }
  }

  /**
   * Send message (queues if not connected)
   */
  send(standId, message) {
    const conn = this.connections.get(standId);
    
    if (conn?.ws?.readyState === WebSocket.OPEN) {
      try {
        conn.ws.send(JSON.stringify(message));
        return true;
      } catch (e) {
        console.error('[WS] Send failed:', e);
      }
    }
    
    // Queue message if not connected
    const queue = this.messageQueue.get(standId) || [];
    queue.push(message);
    this.messageQueue.set(standId, queue);
    
    return false;
  }

  /**
   * Add event listener
   */
  on(standId, event, callback) {
    const key = `${standId}_${event}`;
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => this.off(standId, event, callback);
  }

  /**
   * Remove event listener
   */
  off(standId, event, callback) {
    const key = `${standId}_${event}`;
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to listeners
   */
  _emit(standId, event, data) {
    const key = `${standId}_${event}`;
    const listeners = this.listeners.get(key);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error('[WS] Listener error:', e);
        }
      });
    }
  }

  /**
   * Disconnect from stand
   */
  disconnect(standId) {
    const conn = this.connections.get(standId);
    if (!conn) return;

    conn.isIntentionallyClosed = true;
    this._stopHeartbeat(standId);
    
    if (conn.reconnectTimeout) {
      clearTimeout(conn.reconnectTimeout);
    }
    
    if (conn.ws) {
      conn.ws.close();
    }
    
    this.connections.delete(standId);
    this.messageQueue.delete(standId);
  }

  /**
   * Get connection state
   */
  getState(standId) {
    const conn = this.connections.get(standId);
    if (!conn) return 'disconnected';
    
    switch (conn.ws?.readyState) {
      case WebSocket.CONNECTING: return 'connecting';
      case WebSocket.OPEN: return 'connected';
      case WebSocket.CLOSING: return 'disconnecting';
      default: return 'disconnected';
    }
  }

  /**
   * Force reconnect
   */
  forceReconnect(standId) {
    const conn = this.connections.get(standId);
    if (conn) {
      conn.reconnectAttempts = 0;
      conn.isIntentionallyClosed = false;
      if (conn.ws) {
        conn.ws.close();
      } else {
        this._establishConnection(standId);
      }
    }
  }
}

// Singleton instance
export const wsService = new WebSocketService();

export default wsService;
