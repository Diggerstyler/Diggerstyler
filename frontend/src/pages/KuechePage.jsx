import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Clock, ChefHat, Check, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function KuechePage() {
  const { standId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standName, setStandName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, standsRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}`),
        axios.get(`${API}/stands`)
      ]);
      
      // Filter for created and in_progress orders
      const relevantOrders = ordersRes.data.filter(
        o => o.status === "created" || o.status === "in_progress"
      );
      setOrders(relevantOrders);
      
      const stand = standsRes.data.find(s => s.id === standId);
      if (stand) setStandName(stand.name);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

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
      fetchOrders();
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
  const inProgressOrders = orders.filter(o => o.status === "in_progress");

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/")}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <ChefHat className="w-6 h-6 text-secondary" />
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-tight">
              Küche
            </h1>
            <p className="text-sm text-muted-foreground">{standName}</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={fetchOrders}
          data-testid="refresh-btn"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Aktualisieren
        </Button>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Incoming Orders */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-lg font-bold uppercase">Eingehend</h2>
              <Badge variant="secondary" className="neon-secondary">
                {createdOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {createdOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
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
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="font-mono text-2xl">
                              #{order.order_number}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{getTimeDiff(order.created_at)} Min.</span>
                            </div>
                          </div>
                          <Badge variant="outline">Neu</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 mb-4">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span className="font-medium">
                                {item.quantity}x {item.article_name}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full neon-secondary bg-secondary"
                          onClick={() => updateOrderStatus(order.id, "in_progress")}
                          disabled={isLoading}
                          data-testid={`start-order-${order.id}`}
                        >
                          Zubereitung starten
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* In Progress Orders */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-lg font-bold uppercase">In Arbeit</h2>
              <Badge variant="default" className="neon-primary">
                {inProgressOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-200px)]">
              <div className="space-y-4 pr-4">
                {inProgressOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
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
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="font-mono text-2xl">
                              #{order.order_number}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                              <Clock className="w-4 h-4" />
                              <span>{getTimeDiff(order.created_at)} Min.</span>
                            </div>
                          </div>
                          <Badge className="bg-primary">In Arbeit</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1 mb-4">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span className="font-medium">
                                {item.quantity}x {item.article_name}
                              </span>
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 neon-success"
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
        </div>
      </main>
    </div>
  );
}
