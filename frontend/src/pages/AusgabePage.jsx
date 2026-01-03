import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Package, CheckCircle, RefreshCw, ChevronLeft, ChevronRight, Undo2, Archive, Clock, Maximize, Minimize } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fullscreen utility functions
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || 
    document.documentElement.webkitRequestFullscreen?.() ||
    document.documentElement.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() || 
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.();
  }
};

export default function AusgabePage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standInfo, setStandInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const VISIBLE_COUNT = 2; // Show only 2 bons at a time

  // Reclaim functionality
  const [completedOrders, setCompletedOrders] = useState([]);
  const [lastReclaimableOrder, setLastReclaimableOrder] = useState(null);
  
  // Archive functionality
  const [showArchive, setShowArchive] = useState(false);
  const [archiveOrders, setArchiveOrders] = useState([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveOrder, setSelectedArchiveOrder] = useState(null);

  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, standRes, completedRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}&status=ready`),
        axios.get(`${API}/stands/${standId}`),
        axios.get(`${API}/stands/${standId}/completed-orders?limit=5`)
      ]);
      
      setOrders(ordersRes.data);
      setStandInfo(standRes.data);
      setCompletedOrders(completedRes.data);
      
      // Set last reclaimable order (most recent completed)
      if (completedRes.data.length > 0) {
        setLastReclaimableOrder(completedRes.data[0]);
      } else {
        setLastReclaimableOrder(null);
      }
      
      // Reset index if it's out of bounds
      if (visibleStartIndex >= ordersRes.data.length && ordersRes.data.length > 0) {
        setVisibleStartIndex(Math.max(0, ordersRes.data.length - VISIBLE_COUNT));
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId, visibleStartIndex]);

  const fetchArchive = async () => {
    setIsLoadingArchive(true);
    try {
      const response = await axios.get(`${API}/stands/${standId}/archive?limit=50`);
      setArchiveOrders(response.data);
    } catch (error) {
      toast.error("Fehler beim Laden des Archivs");
    } finally {
      setIsLoadingArchive(false);
    }
  };

  const openArchive = () => {
    setShowArchive(true);
    fetchArchive();
  };

  useEffect(() => {
    fetchOrders();
    
    // WebSocket for real-time updates
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws')}/api/ws/${standId}`;
    let ws = null;
    let reconnectTimeout = null;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'order_created' || data.type === 'order_updated' || data.type === 'new_order') {
            fetchOrders();
          }
        };
        
        ws.onclose = () => {
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = () => ws?.close();
      } catch (e) {
        console.log('WebSocket not available');
      }
    };
    
    connectWebSocket();
    
    // Fallback polling every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [fetchOrders, standId]);

  const completeOrder = async (orderId, orderNumber) => {
    setIsLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status: "completed",
        updated_by: "Ausgabe"
      });
      toast.success(`Bestellung #${orderNumber} übergeben!`);
      fetchOrders();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setIsLoading(false);
    }
  };

  const reclaimOrder = async () => {
    if (!lastReclaimableOrder) return;
    
    setIsLoading(true);
    try {
      await axios.put(`${API}/orders/${lastReclaimableOrder.id}/reclaim`);
      toast.success(`Bestellung #${lastReclaimableOrder.order_number} zurückgeholt!`);
      fetchOrders();
    } catch (error) {
      toast.error("Fehler beim Zurückholen");
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatOrderNumber = (num) => {
    return num.toString().padStart(2, '0');
  };

  // Get visible orders (only 2 at a time)
  const visibleOrders = orders.slice(visibleStartIndex, visibleStartIndex + VISIBLE_COUNT);
  const hasMore = orders.length > VISIBLE_COUNT;
  const canGoBack = visibleStartIndex > 0;
  const canGoForward = visibleStartIndex + VISIBLE_COUNT < orders.length;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Package className="w-5 sm:w-6 h-5 sm:h-6 text-accent" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
                Ausgabe
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{standInfo?.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto sm:ml-auto flex-wrap">
          <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 border-green-500 text-green-500 neon-success">
            {orders.length} Fertig
          </Badge>
          
          {/* Reclaim last order button */}
          {lastReclaimableOrder && (
            <Button
              variant="outline"
              size="sm"
              onClick={reclaimOrder}
              disabled={isLoading}
              className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              data-testid="reclaim-btn"
            >
              <Undo2 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">#{formatOrderNumber(lastReclaimableOrder.order_number)} zurück</span>
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={openArchive}
            data-testid="archive-btn"
          >
            <Archive className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Archiv</span>
          </Button>
          
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="shrink-0 w-9 h-9"
            title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aktualisieren</span>
          </Button>
        </div>
      </header>

      {/* Archive Dialog */}
      <Dialog open={showArchive} onOpenChange={setShowArchive}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <Archive className="w-5 h-5" />
              Bestellungsarchiv - {standInfo?.name}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {isLoadingArchive ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : archiveOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Bestellungen im Archiv
              </div>
            ) : (
              <div className="space-y-3">
                {archiveOrders.map(order => (
                  <Card 
                    key={order.id} 
                    className="bg-muted/30 border-border cursor-pointer hover:border-primary/50 transition-colors"
                    onClick={() => setSelectedArchiveOrder(order)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                            <span className="font-mono text-xl font-bold text-primary">
                              {formatOrderNumber(order.order_number)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {formatTime(order.created_at)}
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`mt-1 text-xs ${
                                order.status === 'completed' ? 'border-green-500 text-green-500' :
                                order.status === 'ready' ? 'border-blue-500 text-blue-500' :
                                order.status === 'in_progress' ? 'border-yellow-500 text-yellow-500' :
                                'border-muted-foreground'
                              }`}
                            >
                              {order.status === 'completed' ? 'Abgeschlossen' :
                               order.status === 'ready' ? 'Fertig' :
                               order.status === 'in_progress' ? 'In Arbeit' :
                               order.status === 'created' ? 'Neu' : order.status}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-lg font-bold text-primary">
                            {order.total?.toFixed(2)} €
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {order.items?.filter(i => !i.is_deposit_return).length || 0} Artikel
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
          <div className="pt-4 border-t border-border flex justify-between items-center">
            <p className="text-sm text-muted-foreground">
              {archiveOrders.length} Bestellungen
            </p>
            <Button variant="outline" onClick={() => setShowArchive(false)}>
              Schließen
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Archive Order Detail Dialog */}
      <Dialog open={selectedArchiveOrder !== null} onOpenChange={() => setSelectedArchiveOrder(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                <span className="font-mono text-xl font-bold">#{selectedArchiveOrder?.order_number}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Bon Details</p>
                <p className="font-mono text-lg">{selectedArchiveOrder?.total?.toFixed(2)} €</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {selectedArchiveOrder?.items?.filter(i => !i.is_deposit_return).map((item, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{item.quantity}x</Badge>
                  <span>{item.article_name}</span>
                </div>
                <span className="font-mono text-muted-foreground">{(item.price * item.quantity).toFixed(2)} €</span>
              </div>
            ))}
            {selectedArchiveOrder?.items?.filter(i => i.is_deposit_return).length > 0 && (
              <>
                <p className="text-xs text-muted-foreground pt-2">Pfand zurück:</p>
                {selectedArchiveOrder?.items?.filter(i => i.is_deposit_return).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 text-green-500">
                    <span className="text-sm">{item.quantity}x {item.article_name}</span>
                    <span className="font-mono text-sm">-{Math.abs(item.price * item.quantity).toFixed(2)} €</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status: {selectedArchiveOrder?.status === 'completed' ? 'Abgeschlossen' : selectedArchiveOrder?.status}</span>
            <span>{selectedArchiveOrder?.created_at && formatTime(selectedArchiveOrder.created_at)}</span>
          </div>
        </DialogContent>
      </Dialog>

      <main className="p-4 sm:p-6 h-[calc(100vh-80px)] flex flex-col">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
            <Package className="w-16 sm:w-24 h-16 sm:h-24 text-muted-foreground mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Keine fertigen Bestellungen</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Warte auf fertige Bestellungen aus der Küche
            </p>
            
            {/* Show reclaim button even when no ready orders */}
            {lastReclaimableOrder && (
              <Button
                variant="outline"
                size="lg"
                onClick={reclaimOrder}
                disabled={isLoading}
                className="mt-6 border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
              >
                <Undo2 className="w-5 h-5 mr-2" />
                Letzte Bestellung #{formatOrderNumber(lastReclaimableOrder.order_number)} zurückholen
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Navigation for more orders */}
            {hasMore && (
              <div className="flex items-center justify-between mb-4">
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleStartIndex(Math.max(0, visibleStartIndex - VISIBLE_COUNT))}
                  disabled={!canGoBack}
                  className="h-12"
                >
                  <ChevronLeft className="w-6 h-6 mr-2" />
                  Vorherige
                </Button>
                <div className="text-center">
                  <span className="text-lg font-medium">
                    {visibleStartIndex + 1}-{Math.min(visibleStartIndex + VISIBLE_COUNT, orders.length)} von {orders.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setVisibleStartIndex(visibleStartIndex + VISIBLE_COUNT)}
                  disabled={!canGoForward}
                  className="h-12"
                >
                  Nächste
                  <ChevronRight className="w-6 h-6 ml-2" />
                </Button>
              </div>
            )}

            {/* Large Bon Cards - only 2 at a time */}
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {visibleOrders.map(order => (
                <Card
                  key={order.id}
                  className="bg-card border-4 border-green-500/50 pulse-ready cursor-pointer hover:border-green-500 transition-all hover:scale-[1.02] flex flex-col"
                  onClick={() => completeOrder(order.id, order.order_number)}
                  data-testid={`order-ready-${order.id}`}
                >
                  <CardContent className="p-6 sm:p-8 flex flex-col items-center text-center flex-1 justify-center">
                    {/* Large Bonnummer */}
                    <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-green-500/20 border-4 border-green-500 flex items-center justify-center mb-6">
                      <span className="font-mono text-6xl sm:text-7xl font-black text-green-500">
                        {order.order_number.toString().padStart(2, '0')}
                      </span>
                    </div>
                    
                    {/* Items list */}
                    <div className="w-full max-w-sm space-y-2 mb-6">
                      {order.items.filter(i => !i.is_deposit_return).map((item, idx) => (
                        <div 
                          key={idx} 
                          className={`flex items-center justify-between p-3 rounded-lg ${item.is_linked_article ? 'bg-muted/30 text-muted-foreground text-sm' : 'bg-green-500/10'}`}
                        >
                          <span className={item.is_linked_article ? '' : 'font-medium text-lg'}>{item.article_name}</span>
                          <span className={`font-mono ${item.is_linked_article ? '' : 'text-lg font-bold'}`}>{item.quantity}x</span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="mb-6">
                      <span className="text-muted-foreground text-sm">Gesamt:</span>
                      <span className="font-mono text-2xl sm:text-3xl font-bold text-green-500 ml-2">
                        {order.total.toFixed(2)} €
                      </span>
                    </div>
                    
                    <Button
                      className="w-full max-w-sm h-16 bg-green-600 hover:bg-green-700 text-xl font-bold"
                      disabled={isLoading}
                      data-testid={`complete-order-${order.id}`}
                    >
                      <CheckCircle className="w-6 h-6 mr-3" />
                      Übergeben
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Hidden orders indicator */}
            {orders.length > VISIBLE_COUNT && (
              <div className="mt-4 text-center text-muted-foreground">
                <Badge variant="outline" className="text-base px-4 py-2">
                  +{orders.length - VISIBLE_COUNT} weitere Bestellungen warten
                </Badge>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
