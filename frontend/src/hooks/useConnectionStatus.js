/**
 * useConnectionStatus - Hook for monitoring connection status
 * Provides UI feedback for network and WebSocket state
 * 
 * WICHTIG: Status basiert primär auf Browser-Online-Status (HTTP funktioniert)
 * WebSocket ist nur für Echtzeit-Updates, nicht für Grundfunktionalität
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
  const [httpWorking, setHttpWorking] = useState(true); // Assume HTTP works initially

  useEffect(() => {
    // Monitor browser online status
    const handleOnline = () => {
      setIsOnline(true);
      setHttpWorking(true); // Assume HTTP works when online
    };
    const handleOffline = () => {
      setIsOnline(false);
      setHttpWorking(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Monitor WebSocket state (optional - nicht kritisch für Funktionalität)
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
      // WebSocket error is not critical - HTTP still works
      setLastError(null); // Don't show WS errors to user
    });

    const unsubMaxReconnect = wsService.on(standId, 'max_reconnect_reached', () => {
      setWsState('failed');
      // Don't set error - HTTP still works
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

  // Computed status - PRIORITÄT: HTTP > WebSocket
  // Wenn Browser online ist, zeigen wir GRÜN (HTTP funktioniert)
  // WebSocket ist nur für Echtzeit-Updates, nicht für Kernfunktionalität
  const status = !isOnline ? 'offline' 
    : 'connected'; // Wenn online, ist HTTP verfügbar = verbunden

  const statusText = {
    offline: 'Offline',
    connected: 'Verbunden',
  }[status];

  const statusColor = {
    offline: 'bg-yellow-500',
    connected: 'bg-green-500',
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
