/**
 * useConnectionStatus - Hook for monitoring connection status
 * Provides UI feedback for network and WebSocket state
 */

import { useState, useEffect, useCallback } from 'react';
import wsService from '../services/WebSocketService';
import { getOnlineStatus, getPendingOrdersCount } from '../services/OrderService';

export function useConnectionStatus(standId) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wsState, setWsState] = useState('disconnected');
  const [pendingOrders, setPendingOrders] = useState(0);
  const [lastError, setLastError] = useState(null);
  const [reconnectAttempt, setReconnectAttempt] = useState(0);

  useEffect(() => {
    // Monitor browser online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor WebSocket state
    const unsubConnect = wsService.on(standId, 'connected', () => {
      setWsState('connected');
      setLastError(null);
      setReconnectAttempt(0);
    });

    const unsubDisconnect = wsService.on(standId, 'disconnected', () => {
      setWsState('disconnected');
    });

    const unsubReconnect = wsService.on(standId, 'reconnecting', ({ attempt }) => {
      setWsState('reconnecting');
      setReconnectAttempt(attempt);
    });

    const unsubError = wsService.on(standId, 'error', ({ error }) => {
      setLastError(error?.message || 'Verbindungsfehler');
    });

    const unsubMaxReconnect = wsService.on(standId, 'max_reconnect_reached', () => {
      setWsState('failed');
      setLastError('Maximale Wiederverbindungsversuche erreicht');
    });

    // Check pending orders periodically
    const pendingInterval = setInterval(() => {
      setPendingOrders(getPendingOrdersCount());
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubConnect();
      unsubDisconnect();
      unsubReconnect();
      unsubError();
      unsubMaxReconnect();
      clearInterval(pendingInterval);
    };
  }, [standId]);

  const forceReconnect = useCallback(() => {
    wsService.forceReconnect(standId);
  }, [standId]);

  // Computed status
  const status = !isOnline ? 'offline' 
    : wsState === 'connected' ? 'connected' 
    : wsState === 'reconnecting' ? 'reconnecting'
    : wsState === 'failed' ? 'failed'
    : 'connecting';

  const statusText = {
    offline: 'Offline',
    connected: 'Verbunden',
    reconnecting: `Verbinde... (${reconnectAttempt})`,
    failed: 'Verbindung fehlgeschlagen',
    connecting: 'Verbinde...',
  }[status];

  const statusColor = {
    offline: 'bg-yellow-500',
    connected: 'bg-green-500',
    reconnecting: 'bg-yellow-500',
    failed: 'bg-red-500',
    connecting: 'bg-yellow-500',
  }[status];

  return {
    isOnline,
    wsState,
    status,
    statusText,
    statusColor,
    pendingOrders,
    lastError,
    reconnectAttempt,
    forceReconnect,
  };
}

export default useConnectionStatus;
