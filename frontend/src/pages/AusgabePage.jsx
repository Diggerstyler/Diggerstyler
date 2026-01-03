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
  const [standName, setStandName] = useState("");
  const [standTypeName, setStandTypeName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const [ordersRes, standsRes, typesRes] = await Promise.all([
        axios.get(`${API}/orders?stand_id=${standId}&status=ready`),
        axios.get(`${API}/stands`),
        axios.get(`${API}/stand-types`)
      ]);
      
      setOrders(ordersRes.data);
      
      const stand = standsRes.data.find(s => s.id === standId);
      if (stand) setStandName(stand.name);
      
      const type = typesRes.data.find(t => t.id === standType);
      if (type) setStandTypeName(type.name);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId, standType]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000);
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
          <Package className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-tight">
              Ausgabe
            </h1>
            <p className="text-sm text-muted-foreground">{standName} • {standTypeName}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-4 py-2 border-green-500 text-green-500 neon-success">
            {orders.length} Fertig
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </header>

      <main className="p-6">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Package className="w-16 h-16 text-muted-foreground mb-4" />
            <h2 className="font-display text-2xl font-bold mb-2">Keine fertigen Bestellungen</h2>
            <p className="text-muted-foreground">
              Warte auf fertige Bestellungen aus der Küche
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {orders.map(order => (
              <Card
                key={order.id}
                className="bg-card border-2 border-green-500/50 pulse-ready cursor-pointer hover:border-green-500 transition-colors"
                onClick={() => completeOrder(order.id, order.order_number)}
                data-testid={`order-ready-${order.id}`}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className="font-mono text-5xl font-bold text-green-500 mb-4">
                    #{order.order_number}
                  </div>
                  <ul className="text-sm text-muted-foreground mb-4 w-full">
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
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isLoading}
                    data-testid={`complete-order-${order.id}`}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Übergeben
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
