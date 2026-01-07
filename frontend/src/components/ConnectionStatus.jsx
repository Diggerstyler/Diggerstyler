/**
 * ConnectionStatus - Visual indicator for connection state
 * Zeigt Verbindungsstatus basierend auf Browser-Online-Status (HTTP)
 * WebSocket ist optional für Echtzeit-Updates
 */

import { Wifi, WifiOff, CloudOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useConnectionStatus } from '@/hooks/useConnectionStatus';

export function ConnectionStatus({ standId, showDetails = false }) {
  const {
    status,
    statusText,
    statusColor,
    pendingOrders,
  } = useConnectionStatus(standId);

  const StatusIcon = status === 'offline' ? WifiOff : Wifi;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            {/* Status Indicator */}
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
              status === 'connected' ? 'bg-green-500/10' : 'bg-yellow-500/10'
            }`}>
              <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <StatusIcon className={`w-3.5 h-3.5 ${
                status === 'connected' ? 'text-green-500' : 'text-yellow-500'
              }`} />
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
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{statusText}</p>
            {pendingOrders > 0 && (
              <p className="text-xs text-yellow-400">
                {pendingOrders} Bestellung{pendingOrders > 1 ? 'en' : ''} werden gesendet sobald verbunden
              </p>
            )}
            {status === 'connected' && (
              <p className="text-xs text-green-400">Bestellungen werden übertragen</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Compact status indicator for headers - Punkt + Wifi Icon
 */
export function ConnectionStatusDot({ standId }) {
  const { status, statusColor } = useConnectionStatus(standId);
  const StatusIcon = status === 'offline' ? WifiOff : Wifi;
  
  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
        status === 'connected' ? 'bg-green-500/10' : 'bg-yellow-500/10'
      }`}
      title={status === 'connected' ? 'Verbunden' : 'Offline'}
    >
      <div className={`w-2 h-2 rounded-full ${statusColor}`} />
      <StatusIcon className={`w-3.5 h-3.5 ${
        status === 'connected' ? 'text-green-500' : 'text-yellow-500'
      }`} />
    </div>
  );
}

/**
 * Full-screen offline banner - nur wenn wirklich offline
 */
export function OfflineBanner({ standId }) {
  const { status, pendingOrders } = useConnectionStatus(standId);
  
  // Nur anzeigen wenn wirklich offline (kein Internet)
  if (status === 'connected') return null;
  
  return (
    <div className="fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium bg-yellow-500 text-yellow-950">
      <div className="flex items-center justify-center gap-2">
        <WifiOff className="w-4 h-4" />
        <span>Offline - Bestellungen werden lokal gespeichert</span>
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
