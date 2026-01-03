import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Package, CheckCircle, RefreshCw } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AusgabePage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standInfo, setStandInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, standRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}&status=ready`),
        axios.get(`${API}/stands/${standId}`)
      ]);
      
      setOrders(ordersRes.data);
      setStandInfo(standRes.data);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId]);

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

      <main className="p-4 sm:p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <Package className="w-12 sm:w-16 h-12 sm:h-16 text-muted-foreground mb-4" />
            <h2 className="font-display text-xl sm:text-2xl font-bold mb-2">Keine fertigen Bestellungen</h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Warte auf fertige Bestellungen aus der Küche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
            {orders.map(order => (
              <Card
                key={order.id}
                className="bg-card border-2 border-green-500/50 pulse-ready cursor-pointer hover:border-green-500 transition-colors"
                onClick={() => completeOrder(order.id, order.order_number)}
                data-testid={`order-ready-${order.id}`}
              >
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className="font-mono text-3xl sm:text-5xl font-bold text-green-500 mb-3 sm:mb-4">
                    #{order.order_number}
                  </div>
                  <ul className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 w-full">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="truncate">
                        {item.quantity}x {item.article_name}
                      </li>
                    ))}
                    {order.items.length > 3 && (
                      <li className="text-xs">+{order.items.length - 3} weitere</li>
                    )}
                  </ul>
                  <Button
                    className="w-full bg-green-600 hover:bg-green-700 text-sm"
                    disabled={isLoading}
                    data-testid={`complete-order-${order.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Übergeben</span>
                    <span className="sm:hidden">OK</span>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
