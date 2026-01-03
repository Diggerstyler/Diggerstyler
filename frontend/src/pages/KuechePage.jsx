import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Clock, Hammer, Check, RefreshCw, ListOrdered } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KuechePage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standInfo, setStandInfo] = useState(null);
  const [kitchenSummary, setKitchenSummary] = useState({ total_items: {}, total_orders: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [ordersRes, standRes, summaryRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}`),
        axios.get(`${API}/stands/${standId}`),
        axios.get(`${API}/stands/${standId}/kitchen-summary`)
      ]);
      
      // Filter for created and in_progress orders (sorted oldest first by backend)
      const relevantOrders = ordersRes.data.filter(
        o => o.status === "created" || o.status === "in_progress"
      );
      setOrders(relevantOrders);
      setStandInfo(standRes.data);
      setKitchenSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [standId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, [fetchData]);

  const updateOrderStatus = async (orderId, newStatus) => {
    setIsLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status: newStatus,
        updated_by: "Küche"
      });
      toast.success(
        newStatus === "in_progress" 
          ? "Bestellung wird zubereitet" 
          : "Bestellung ist fertig!"
      );
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeDiff = (createdAt) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
    return diff;
  };

  const createdOrders = orders.filter(o => o.status === "created");
  // No more in_progress state needed - orders go directly from "created" to "ready"

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
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
            <Hammer className="w-5 sm:w-6 h-5 sm:h-6 text-secondary" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
                Macher
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">{standInfo?.name}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {skipPreparation && (
            <Badge variant="outline" className="text-accent border-accent text-xs">
              Schnellmodus
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            data-testid="refresh-btn"
            className="ml-auto sm:ml-0"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aktualisieren</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Incoming Orders - Always visible */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-base sm:text-lg font-bold uppercase">Eingehend</h2>
              <Badge variant="secondary" className="neon-secondary">
                {createdOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-250px)] sm:h-[calc(100vh-200px)]">
              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                {createdOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                      Keine neuen Bestellungen
                    </CardContent>
                  </Card>
                ) : (
                  createdOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="bg-card border-secondary/30"
                      data-testid={`order-created-${order.id}`}
                    >
                      <CardHeader className="pb-2 p-3 sm:p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="font-mono text-xl sm:text-2xl">
                              #{order.order_number}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                              <Clock className="w-3 sm:w-4 h-3 sm:h-4" />
                              <span>{getTimeDiff(order.created_at)} Min.</span>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">Neu</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        <ul className="space-y-1 mb-3 sm:mb-4 text-sm">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="font-medium">
                              {item.quantity}x {item.article_name}
                            </li>
                          ))}
                        </ul>
                        {skipPreparation ? (
                          /* Skip mode: Show "Fertig" button directly */
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 neon-success text-sm"
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            disabled={isLoading}
                            data-testid={`finish-order-${order.id}`}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Fertig
                          </Button>
                        ) : (
                          /* Normal mode: Show "Zubereitung" button */
                          <Button
                            className="w-full neon-secondary bg-secondary text-sm"
                            onClick={() => updateOrderStatus(order.id, "in_progress")}
                            disabled={isLoading}
                            data-testid={`start-order-${order.id}`}
                          >
                            Zubereitung
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* In Progress Orders - Only visible in normal mode */}
          {!skipPreparation && (
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display text-base sm:text-lg font-bold uppercase">In Arbeit</h2>
                <Badge variant="default" className="neon-primary">
                  {inProgressOrders.length}
                </Badge>
              </div>
              <ScrollArea className="h-[calc(100vh-250px)] sm:h-[calc(100vh-200px)]">
                <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                  {inProgressOrders.length === 0 ? (
                    <Card className="bg-card border-dashed">
                      <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                        Keine Bestellungen in Arbeit
                      </CardContent>
                    </Card>
                  ) : (
                    inProgressOrders.map(order => (
                      <Card 
                        key={order.id} 
                        className="bg-card border-primary/30"
                        data-testid={`order-progress-${order.id}`}
                      >
                        <CardHeader className="pb-2 p-3 sm:p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="font-mono text-xl sm:text-2xl">
                                #{order.order_number}
                              </CardTitle>
                              <div className="flex items-center gap-2 mt-1 text-xs sm:text-sm text-muted-foreground">
                                <Clock className="w-3 sm:w-4 h-3 sm:h-4" />
                                <span>{getTimeDiff(order.created_at)} Min.</span>
                              </div>
                            </div>
                            <Badge className="bg-primary text-xs">In Arbeit</Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4 pt-0">
                          <ul className="space-y-1 mb-3 sm:mb-4 text-sm">
                            {order.items.map((item, idx) => (
                              <li key={idx} className="font-medium">
                                {item.quantity}x {item.article_name}
                              </li>
                            ))}
                          </ul>
                          <Button
                            className="w-full bg-green-600 hover:bg-green-700 neon-success text-sm"
                            onClick={() => updateOrderStatus(order.id, "ready")}
                            disabled={isLoading}
                            data-testid={`finish-order-${order.id}`}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Fertig melden
                          </Button>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Kitchen Summary - Total Open Items */}
          <div className={skipPreparation ? "lg:col-span-2" : "lg:col-span-1"}>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-base sm:text-lg font-bold uppercase">Gesamt Offen</h2>
              <Badge variant="outline" className="border-accent text-accent">
                {kitchenSummary.total_orders} Bestellungen
              </Badge>
            </div>
            <Card className="bg-card border-accent/30">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-accent" />
                  <CardTitle className="font-display text-base uppercase">
                    Zu Produzieren
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {Object.keys(kitchenSummary.total_items).length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    Alles erledigt!
                  </p>
                ) : (
                  <ScrollArea className="h-[calc(100vh-350px)] sm:h-[calc(100vh-300px)]">
                    <div className="space-y-2 pr-2">
                      {Object.entries(kitchenSummary.total_items).map(([name, qty]) => (
                        <div 
                          key={name}
                          className="flex items-center justify-between p-3 rounded-sm bg-muted/50"
                        >
                          <span className="font-medium text-sm sm:text-base">{name}</span>
                          <Badge className="bg-accent text-accent-foreground font-mono text-lg px-3">
                            {qty}x
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
