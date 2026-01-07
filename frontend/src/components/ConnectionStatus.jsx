/**
 * ConnectionStatus - Visual indicator for connection state
 * Shows network status, WebSocket state, and pending orders
 */

import { Wifi, WifiOff, Loader2, AlertTriangle, RefreshCw, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export function ConnectionStatus({ standId, showDetails = false }) {
  const {
    status,
    statusText,
    statusColor,
    pendingOrders,
    lastError,
    forceReconnect,
  } = useConnectionStatus(standId);

  const StatusIcon = {
    offline: WifiOff,
    connected: Wifi,
    reconnecting: Loader2,
    failed: AlertTriangle,
    connecting: Loader2,
  }[status];

  const iconClass = status === 'reconnecting' || status === 'connecting' ? 'animate-spin' : '';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              status === 'connected' ? 'bg-green-500/10' :
              status === 'offline' || status === 'failed' ? 'bg-red-500/10' :
              'bg-yellow-500/10'
            }`}>
              <div className={`w-2 h-2 rounded-full ${statusColor} ${
                status === 'reconnecting' || status === 'connecting' ? 'animate-pulse' : ''
              }`} />
              <StatusIcon className={`w-3.5 h-3.5 ${
                status === 'connected' ? 'text-green-500' :
                status === 'offline' || status === 'failed' ? 'text-red-500' :
                'text-yellow-500'
              } ${iconClass}`} />
              {showDetails && (
                <span className="text-xs font-medium">{statusText}</span>
              )}
            </div>

            {/* Pending Orders Badge */}
            {pendingOrders > 0 && (
              <Badge 
                variant="outline" 
                className="border-yellow-500 text-yellow-500 text-xs flex items-center gap-1"
              >
                <CloudOff className="w-3 h-3" />
                {pendingOrders} wartend
              </Badge>
            )}

            {/* Reconnect Button (only when failed) */}
            {status === 'failed' && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={forceReconnect}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Neu verbinden
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{statusText}</p>
            {lastError && (
              <p className="text-xs text-red-400">{lastError}</p>
            )}
            {pendingOrders > 0 && (
              <p className="text-xs text-yellow-400">
                {pendingOrders} Bestellung{pendingOrders > 1 ? 'en' : ''} werden gesendet sobald verbunden
              </p>
            )}
            {status === 'connected' && (
              <p className="text-xs text-green-400">Echtzeit-Updates aktiv</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact status indicator for headers
 */
export function ConnectionStatusDot({ standId }) {
  const { status, statusColor } = useConnectionStatus(standId);
  
  return (
    <div 
      className={`w-2 h-2 rounded-full ${statusColor} ${
        status === 'reconnecting' || status === 'connecting' ? 'animate-pulse' : ''
      }`} 
      title={status}
    />
  );
}

/**
 * Full-screen offline banner
 */
export function OfflineBanner({ standId }) {
  const { status, pendingOrders, forceReconnect } = useConnectionStatus(standId);
  
  if (status === 'connected') return null;
  
  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium ${
      status === 'offline' ? 'bg-yellow-500 text-yellow-950' :
      status === 'failed' ? 'bg-red-500 text-white' :
      'bg-yellow-500/80 text-yellow-950'
    }`}>
      <div className="flex items-center justify-center gap-2">
        {status === 'offline' ? (
          <>
            <WifiOff className="w-4 h-4" />
            <span>Offline - Bestellungen werden lokal gespeichert</span>
          </>
        ) : status === 'failed' ? (
          <>
            <AlertTriangle className="w-4 h-4" />
            <span>Verbindung fehlgeschlagen</span>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs ml-2"
              onClick={forceReconnect}
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Neu verbinden
            </Button>
          </>
        ) : (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Verbinde...</span>
          </>
        )}
        {pendingOrders > 0 && (
          <Badge variant="secondary" className="ml-2 text-xs">
            {pendingOrders} wartend
          </Badge>
        )}
      </div>
    </div>
  );
}

export default ConnectionStatus;
