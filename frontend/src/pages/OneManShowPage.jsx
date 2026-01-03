import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Beer, UtensilsCrossed, 
  Clock, Check, RefreshCw, Zap, CheckCircle
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OneManShowPage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("order");
  const [standName, setStandName] = useState("");
  const [standTypeName, setStandTypeName] = useState("");
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/orders?stand_id=${standId}`);
      // Filter for orders that are not completed
      const activeOrders = response.data.filter(o => o.status !== "completed");
      setOrders(activeOrders);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }, [standId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, standsRes, typesRes] = await Promise.all([
          axios.get(`${API}/articles?active_only=true`),
          axios.get(`${API}/stands`),
          axios.get(`${API}/stand-types`)
        ]);
        
        const stand = standsRes.data.find(s => s.id === standId);
        if (stand) setStandName(stand.name);
        
        const type = typesRes.data.find(t => t.id === standType);
        if (type) {
          setStandTypeName(type.name);
          setAllowedCategories(type.categories);
          
          const filteredArticles = articlesRes.data.filter(
            article => type.categories.includes(article.category)
          );
          setArticles(filteredArticles);
        }
      } catch (error) {
        toast.error("Fehler beim Laden der Daten");
      }
    };
    fetchData();
    fetchOrders();
    
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, [standId, standType, fetchOrders]);

  const filteredArticles = articles.filter(
    article => activeCategory === "all" || article.category === activeCategory
  );

  const addToCart = (article) => {
    setCart(prev => {
      const existing = prev.find(item => item.article_id === article.id);
      if (existing) {
        return prev.map(item =>
          item.article_id === article.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        article_id: article.id,
        article_name: article.name,
        quantity: 1,
        price: article.price
      }];
    });
  };

  const updateQuantity = (articleId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.article_id === articleId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity <= 0) return null;
          return { ...item, quantity: newQuantity };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (articleId) => {
    setCart(prev => prev.filter(item => item.article_id !== articleId));
  };

  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Der Warenkorb ist leer");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = {
        stand_id: standId,
        stand_name: standName,
        items: cart,
        total: total,
        created_by: "OneManShow"
      };

      const response = await axios.post(`${API}/orders`, order);
      toast.success(`Bestellung #${response.data.order_number} erstellt!`);
      setCart([]);
      fetchOrders();
    } catch (error) {
      toast.error("Fehler beim Erstellen der Bestellung");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status: newStatus,
        updated_by: "OneManShow"
      });
      
      const statusMessages = {
        in_progress: "Bestellung wird zubereitet",
        ready: "Bestellung ist fertig!",
        completed: "Bestellung übergeben!"
      };
      
      toast.success(statusMessages[newStatus]);
      fetchOrders();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const getTimeDiff = (createdAt) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
    return diff;
  };

  const categories = [
    { id: "all", name: "Alle", icon: null },
    ...(allowedCategories.includes("getraenke") ? [{ id: "getraenke", name: "Getränke", icon: Beer }] : []),
    ...(allowedCategories.includes("speisen") ? [{ id: "speisen", name: "Speisen", icon: UtensilsCrossed }] : [])
  ];

  const createdOrders = orders.filter(o => o.status === "created");
  const inProgressOrders = orders.filter(o => o.status === "in_progress");
  const readyOrders = orders.filter(o => o.status === "ready");

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
          <Zap className="w-6 h-6 text-green-500" />
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-tight">
              OneManShow
            </h1>
            <p className="text-sm text-muted-foreground">{standName} • {standTypeName}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Badge variant="outline" className="border-secondary text-secondary">
            {createdOrders.length + inProgressOrders.length} Offen
          </Badge>
          <Badge variant="outline" className="border-green-500 text-green-500">
            {readyOrders.length} Fertig
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchOrders}
            data-testid="refresh-btn"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-[calc(100vh-73px)]">
        <div className="glass border-b border-border px-6">
          <TabsList className="bg-transparent h-14">
            <TabsTrigger value="order" className="data-[state=active]:bg-primary/20" data-testid="tab-order">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Bestellen
              {cart.length > 0 && (
                <Badge className="ml-2 bg-primary">{cart.reduce((s, i) => s + i.quantity, 0)}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="kitchen" className="data-[state=active]:bg-secondary/20" data-testid="tab-kitchen">
              <Clock className="w-4 h-4 mr-2" />
              Zubereiten
              {(createdOrders.length + inProgressOrders.length) > 0 && (
                <Badge className="ml-2 bg-secondary">{createdOrders.length + inProgressOrders.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pickup" className="data-[state=active]:bg-green-500/20" data-testid="tab-pickup">
              <CheckCircle className="w-4 h-4 mr-2" />
              Ausgeben
              {readyOrders.length > 0 && (
                <Badge className="ml-2 bg-green-500">{readyOrders.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Order Tab */}
        <TabsContent value="order" className="h-full m-0">
          <div className="flex h-full">
            {/* Categories Sidebar */}
            {categories.length > 1 && (
              <aside className="w-48 border-r border-border p-4 hidden md:block">
                <nav className="space-y-2">
                  {categories.map(cat => {
                    const Icon = cat.icon;
                    return (
                      <Button
                        key={cat.id}
                        variant={activeCategory === cat.id ? "secondary" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => setActiveCategory(cat.id)}
                        data-testid={`category-${cat.id}`}
                      >
                        {Icon && <Icon className="w-4 h-4 mr-2" />}
                        {cat.name}
                      </Button>
                    );
                  })}
                </nav>
              </aside>
            )}

            {/* Articles Grid */}
            <main className="flex-1 p-6 overflow-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredArticles.map(article => (
                  <Card
                    key={article.id}
                    className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors active:scale-95"
                    onClick={() => addToCart(article)}
                    data-testid={`article-${article.id}`}
                  >
                    <CardContent className="p-4">
                      <Badge variant="outline" className="mb-2 text-xs">
                        {article.category === "getraenke" ? "Getränk" : "Speise"}
                      </Badge>
                      <h3 className="font-semibold mb-2">{article.name}</h3>
                      <p className="font-mono text-lg text-primary">
                        {article.price.toFixed(2)} €
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </main>

            {/* Cart Sidebar */}
            <aside className="w-80 border-l border-border flex flex-col hidden md:flex">
              <div className="p-4 border-b border-border">
                <h2 className="font-display text-lg font-bold uppercase">Warenkorb</h2>
              </div>
              
              <ScrollArea className="flex-1 p-4">
                {cart.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Noch keine Artikel
                  </p>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <div 
                        key={item.article_id} 
                        className="flex items-center gap-3 bg-muted/50 p-3 rounded-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.article_name}</p>
                          <p className="font-mono text-sm text-muted-foreground">
                            {item.price.toFixed(2)} €
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.article_id, -1); }}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="font-mono w-6 text-center">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => { e.stopPropagation(); updateQuantity(item.article_id, 1); }}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={(e) => { e.stopPropagation(); removeFromCart(item.article_id); }}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <div className="p-4 border-t border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Gesamt</span>
                  <span className="font-mono text-2xl font-bold text-primary">
                    {total.toFixed(2)} €
                  </span>
                </div>
                <Button
                  className="w-full h-12 font-semibold uppercase neon-primary"
                  onClick={submitOrder}
                  disabled={cart.length === 0 || isSubmitting}
                  data-testid="submit-order-btn"
                >
                  {isSubmitting ? "Wird erstellt..." : "Bestellung aufgeben"}
                </Button>
              </div>
            </aside>
          </div>
        </TabsContent>

        {/* Kitchen Tab */}
        <TabsContent value="kitchen" className="h-full m-0 p-6 overflow-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Created Orders */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display text-lg font-bold uppercase">Eingehend</h2>
                <Badge variant="secondary" className="neon-secondary">
                  {createdOrders.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {createdOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Keine neuen Bestellungen
                    </CardContent>
                  </Card>
                ) : (
                  createdOrders.map(order => (
                    <Card key={order.id} className="bg-card border-secondary/30">
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
                            <li key={idx} className="font-medium">
                              {item.quantity}x {item.article_name}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full neon-secondary bg-secondary"
                          onClick={() => updateOrderStatus(order.id, "in_progress")}
                          data-testid={`start-order-${order.id}`}
                        >
                          Zubereitung starten
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>

            {/* In Progress Orders */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-display text-lg font-bold uppercase">In Arbeit</h2>
                <Badge variant="default" className="neon-primary">
                  {inProgressOrders.length}
                </Badge>
              </div>
              <div className="space-y-4">
                {inProgressOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-8 text-center text-muted-foreground">
                      Keine Bestellungen in Arbeit
                    </CardContent>
                  </Card>
                ) : (
                  inProgressOrders.map(order => (
                    <Card key={order.id} className="bg-card border-primary/30">
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
                            <li key={idx} className="font-medium">
                              {item.quantity}x {item.article_name}
                            </li>
                          ))}
                        </ul>
                        <Button
                          className="w-full bg-green-600 hover:bg-green-700 neon-success"
                          onClick={() => updateOrderStatus(order.id, "ready")}
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
            </div>
          </div>
        </TabsContent>

        {/* Pickup Tab */}
        <TabsContent value="pickup" className="h-full m-0 p-6 overflow-auto">
          {readyOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <CheckCircle className="w-16 h-16 text-muted-foreground mb-4" />
              <h2 className="font-display text-2xl font-bold mb-2">Keine fertigen Bestellungen</h2>
              <p className="text-muted-foreground">
                Fertige Bestellungen erscheinen hier
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {readyOrders.map(order => (
                <Card
                  key={order.id}
                  className="bg-card border-2 border-green-500/50 pulse-ready cursor-pointer hover:border-green-500"
                  onClick={() => updateOrderStatus(order.id, "completed")}
                  data-testid={`complete-order-${order.id}`}
                >
                  <CardContent className="p-6 flex flex-col items-center text-center">
                    <div className="font-mono text-4xl font-bold text-green-500 mb-4">
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
                    <Button className="w-full bg-green-600 hover:bg-green-700">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Übergeben
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
