import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, CheckCircle, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AusgabePage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standInfo, setStandInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const VISIBLE_COUNT = 2; // Show only 2 bons at a time

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, standRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}&status=ready`),
        axios.get(`${API}/stands/${standId}`)
      ]);
      
      setOrders(ordersRes.data);
      setStandInfo(standRes.data);
      
      // Reset index if it's out of bounds
      if (visibleStartIndex >= ordersRes.data.length && ordersRes.data.length > 0) {
        setVisibleStartIndex(Math.max(0, ordersRes.data.length - VISIBLE_COUNT));
      }
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId, visibleStartIndex]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto sm:ml-auto">
          <Badge variant="outline" className="text-sm sm:text-lg px-3 sm:px-4 py-1 sm:py-2 border-green-500 text-green-500 neon-success">
            {orders.length} Fertig
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            data-testid="refresh-btn"
            className="ml-auto sm:ml-0"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aktualisieren</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 h-[calc(100vh-80px)] flex flex-col">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-center px-4">
            <Package className="w-16 sm:w-24 h-16 sm:h-24 text-muted-foreground mb-4" />
            <h2 className="font-display text-2xl sm:text-3xl font-bold mb-2">Keine fertigen Bestellungen</h2>
            <p className="text-muted-foreground text-base sm:text-lg">
              Warte auf fertige Bestellungen aus der Küche
            </p>
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
