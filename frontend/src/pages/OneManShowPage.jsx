import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Minus, ShoppingCart, Beer, UtensilsCrossed, RotateCcw, X, Trash2, Zap, Check } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

export default function OneManShowPage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [depositGroups, setDepositGroups] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [standInfo, setStandInfo] = useState(null);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [swipingItem, setSwipingItem] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const wsRef = useRef(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, standRes, typesRes, depositsRes] = await Promise.all([
          axios.get(`${API}/stands/${standId}/articles`),
          axios.get(`${API}/stands/${standId}`),
          axios.get(`${API}/stand-types`),
          axios.get(`${API}/deposit-groups`)
        ]);
        
        setArticles(articlesRes.data);
        setStandInfo(standRes.data);
        setDepositGroups(depositsRes.data.filter(d => d.active));
        
        const type = typesRes.data.find(t => t.id === (standRes.data?.stand_type || standType));
        if (type) {
          setAllowedCategories(type.categories);
        }
      } catch (error) {
        toast.error("Fehler beim Laden der Daten");
      }
    };
    fetchData();

    // WebSocket connection
    if (WS_URL) {
      wsRef.current = new WebSocket(`${WS_URL}/ws/${standId}`);
      wsRef.current.onopen = () => console.log("WebSocket connected");
      wsRef.current.onclose = () => console.log("WebSocket disconnected");
    }

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, [standId, standType]);

  const filteredArticles = articles.filter(
    article => activeCategory === "all" || article.category === activeCategory
  );

  const addToCart = (article) => {
    setCart(prev => {
      const existing = prev.find(item => item.article_id === article.id && !item.is_deposit_return);
      if (existing) {
        return prev.map(item =>
          item.article_id === article.id && !item.is_deposit_return
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        article_id: article.id,
        article_name: article.name,
        quantity: 1,
        price: article.price,
        deposit_amount: article.deposit?.amount || 0,
        is_deposit_return: false
      }];
    });
  };

  const addDepositReturn = (deposit) => {
    setCart(prev => {
      const existing = prev.find(item => item.article_id === `return_${deposit.id}` && item.is_deposit_return);
      if (existing) {
        return prev.map(item =>
          item.article_id === `return_${deposit.id}` && item.is_deposit_return
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        article_id: `return_${deposit.id}`,
        article_name: `Pfand zurück: ${deposit.name}`,
        quantity: 1,
        price: -deposit.amount,
        deposit_amount: 0,
        is_deposit_return: true
      }];
    });
  };

  const removeOneFromCart = (articleId, isDepositReturn) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.article_id === articleId && item.is_deposit_return === isDepositReturn) {
          if (item.quantity <= 1) return null;
          return { ...item, quantity: item.quantity - 1 };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (articleId, isDepositReturn) => {
    setCart(prev => prev.filter(item => !(item.article_id === articleId && item.is_deposit_return === isDepositReturn)));
  };

  // Touch handlers for swipe to delete
  const handleTouchStart = (e, item) => {
    touchStartX.current = e.touches[0].clientX;
    setSwipingItem(`${item.article_id}_${item.is_deposit_return}`);
  };

  const handleTouchMove = (e) => {
    if (!swipingItem) return;
    const diff = touchStartX.current - e.touches[0].clientX;
    if (diff > 0) {
      setSwipeOffset(Math.min(diff, 100));
    }
  };

  const handleTouchEnd = (item) => {
    if (swipeOffset > 60) {
      removeOneFromCart(item.article_id, item.is_deposit_return);
      toast.success(`1x ${item.article_name} entfernt`);
    }
    setSwipingItem(null);
    setSwipeOffset(0);
  };

  // Calculate totals
  const subtotal = cart.filter(i => !i.is_deposit_return).reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const depositTotal = cart.filter(i => !i.is_deposit_return).reduce((sum, item) => sum + (item.deposit_amount * item.quantity), 0);
  const depositReturnTotal = cart.filter(i => i.is_deposit_return).reduce((sum, item) => sum + (Math.abs(item.price) * item.quantity), 0);
  const total = subtotal + depositTotal - depositReturnTotal;

  // OneManShow: Direct complete - no kitchen workflow
  const submitOrder = async () => {
    if (cart.length === 0) {
      toast.error("Der Warenkorb ist leer");
      return;
    }

    setIsSubmitting(true);
    try {
      const order = {
        stand_id: standId,
        stand_name: standInfo?.name || "Unbekannt",
        items: cart,
        subtotal,
        deposit_total: depositTotal,
        deposit_return_total: depositReturnTotal,
        total,
        created_by: "OneManShow",
        direct_complete: true  // This makes the order go directly to "completed"
      };

      const response = await axios.post(`${API}/orders`, order);
      setLastOrder(response.data);
      toast.success(`Bestellung #${response.data.order_number} abgeschlossen! Kassiert: ${total.toFixed(2)} €`);
      setCart([]);
    } catch (error) {
      toast.error("Fehler beim Erstellen der Bestellung");
    } finally {
      setIsSubmitting(false);
    }
  };

  const categories = [
    { id: "all", name: "Alle", icon: null },
    ...(allowedCategories.includes("getraenke") ? [{ id: "getraenke", name: "Getränke", icon: Beer }] : []),
    ...(allowedCategories.includes("speisen") ? [{ id: "speisen", name: "Speisen", icon: UtensilsCrossed }] : [])
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/")}
          data-testid="back-btn"
          className="shrink-0"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-green-500" />
          <div className="min-w-0">
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight truncate">
              OneManShow
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate">{standInfo?.name}</p>
          </div>
        </div>
        <Badge variant="outline" className="border-green-500 text-green-500 ml-auto shrink-0">
          <Check className="w-4 h-4 mr-1" />
          Direkt fertig
        </Badge>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories + Deposit Sidebar - Desktop */}
        <aside className="w-40 lg:w-48 border-r border-border p-3 sm:p-4 hidden md:block shrink-0">
          <nav className="space-y-2">
            {categories.map(cat => {
              const Icon = cat.icon;
              return (
                <Button
                  key={cat.id}
                  variant={activeCategory === cat.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm"
                  onClick={() => setActiveCategory(cat.id)}
                >
                  {Icon && <Icon className="w-4 h-4 mr-2" />}
                  {cat.name}
                </Button>
              );
            })}
          </nav>
          
          {depositGroups.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-xs text-muted-foreground mb-3 uppercase font-semibold">Pfand zurück</p>
              <div className="space-y-2">
                {depositGroups.map(deposit => (
                  <Button
                    key={deposit.id}
                    variant="outline"
                    className="w-full justify-start text-sm border-green-500/50 text-green-500 hover:bg-green-500/10"
                    onClick={() => addDepositReturn(deposit)}
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    {deposit.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Articles Grid */}
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto pb-52 md:pb-4">
          {/* Mobile Category Tabs */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "secondary" : "outline"}
                size="sm"
                className="shrink-0"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
          </div>

          {/* Mobile Deposit Return */}
          {depositGroups.length > 0 && (
            <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
              {depositGroups.map(deposit => (
                <Button
                  key={deposit.id}
                  variant="outline"
                  size="sm"
                  className="shrink-0 border-green-500/50 text-green-500"
                  onClick={() => addDepositReturn(deposit)}
                >
                  <RotateCcw className="w-3 h-3 mr-1" />
                  {deposit.name} zurück
                </Button>
              ))}
            </div>
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            {filteredArticles.map(article => (
              <Card
                key={article.id}
                className="bg-card border-border cursor-pointer hover:border-green-500/50 transition-colors active:scale-95"
                onClick={() => addToCart(article)}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col h-full">
                    <div className="flex gap-1 mb-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {article.category === "getraenke" ? "Getränk" : "Speise"}
                      </Badge>
                      {article.deposit && (
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-500">
                          +{article.deposit.amount.toFixed(2)}€
                        </Badge>
                      )}
                    </div>
                    <h3 className="font-semibold text-sm sm:text-base mb-2 line-clamp-2">{article.name}</h3>
                    <p className="font-mono text-base sm:text-lg text-primary mt-auto">
                      {article.price.toFixed(2)} €
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        {/* Cart Sidebar - Desktop */}
        <aside className="w-72 lg:w-80 border-l border-border hidden md:flex flex-col shrink-0">
          <div className="p-3 sm:p-4 border-b border-border bg-green-500/10">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-green-500" />
              <h2 className="font-display text-base lg:text-lg font-bold uppercase text-green-500">Kassieren</h2>
            </div>
            <p className="text-xs text-muted-foreground">Direkt abrechnen - kein Küchen-Workflow</p>
          </div>
          
          <ScrollArea className="flex-1 p-3 sm:p-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Noch keine Artikel
              </p>
            ) : (
              <div className="space-y-2">
                {cart.map(item => (
                  <div 
                    key={`${item.article_id}_${item.is_deposit_return}`}
                    className={`flex items-center gap-2 p-2 rounded-sm ${item.is_deposit_return ? 'bg-green-500/10' : 'bg-muted/50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                        {item.quantity}x {item.article_name}
                      </p>
                      <p className={`font-mono text-xs ${item.is_deposit_return ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {item.is_deposit_return ? '-' : ''}{Math.abs(item.price * item.quantity).toFixed(2)} €
                        {!item.is_deposit_return && item.deposit_amount > 0 && (
                          <span className="text-green-500"> +{(item.deposit_amount * item.quantity).toFixed(2)}€</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeOneFromCart(item.article_id, item.is_deposit_return)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => removeFromCart(item.article_id, item.is_deposit_return)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 sm:p-4 border-t border-border space-y-2 bg-green-500/5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Artikel</span>
              <span className="font-mono">{subtotal.toFixed(2)} €</span>
            </div>
            {depositTotal > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>+ Pfand</span>
                <span className="font-mono">{depositTotal.toFixed(2)} €</span>
              </div>
            )}
            {depositReturnTotal > 0 && (
              <div className="flex justify-between text-sm text-green-500">
                <span>- Pfand zurück</span>
                <span className="font-mono">-{depositReturnTotal.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between items-center pt-2 border-t border-border">
              <span className="font-semibold">Zu kassieren</span>
              <span className="font-mono text-2xl font-bold text-green-500">
                {total.toFixed(2)} €
              </span>
            </div>
            <Button
              className="w-full h-12 font-semibold uppercase bg-green-600 hover:bg-green-700 neon-success text-sm"
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
            >
              {isSubmitting ? "Wird abgerechnet..." : "Kassieren & Fertig"}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile Cart */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass border-t border-green-500/30 z-50">
        {cart.length > 0 && (
          <div className="max-h-32 overflow-auto p-2 space-y-1">
            {cart.map(item => (
              <div 
                key={`${item.article_id}_${item.is_deposit_return}`}
                className={`flex items-center gap-2 p-2 rounded-sm relative overflow-hidden ${item.is_deposit_return ? 'bg-green-500/10' : 'bg-muted/50'}`}
                onTouchStart={(e) => handleTouchStart(e, item)}
                onTouchMove={handleTouchMove}
                onTouchEnd={() => handleTouchEnd(item)}
                style={{
                  transform: swipingItem === `${item.article_id}_${item.is_deposit_return}` ? `translateX(-${swipeOffset}px)` : 'translateX(0)',
                  transition: swipingItem === `${item.article_id}_${item.is_deposit_return}` ? 'none' : 'transform 0.2s'
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-xs truncate ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                    {item.quantity}x {item.article_name}
                  </p>
                </div>
                <span className={`font-mono text-xs ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                  {item.is_deposit_return ? '-' : ''}{Math.abs(item.price * item.quantity).toFixed(2)}€
                </span>
                <div 
                  className="absolute right-0 top-0 bottom-0 w-16 bg-destructive flex items-center justify-center"
                  style={{
                    transform: swipingItem === `${item.article_id}_${item.is_deposit_return}` ? 'translateX(0)' : 'translateX(100%)',
                    opacity: swipingItem === `${item.article_id}_${item.is_deposit_return}` ? swipeOffset / 60 : 0
                  }}
                >
                  <X className="w-4 h-4 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
        
        <div className="p-3 space-y-2 bg-green-500/5">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground text-sm">
              {cart.reduce((sum, item) => sum + item.quantity, 0)} Artikel
            </span>
            <span className="font-mono text-xl font-bold text-green-500">
              {total.toFixed(2)} €
            </span>
          </div>
          <Button
            className="w-full h-11 font-semibold uppercase bg-green-600 hover:bg-green-700 neon-success text-sm"
            onClick={submitOrder}
            disabled={cart.length === 0 || isSubmitting}
          >
            {isSubmitting ? "Wird abgerechnet..." : "Kassieren & Fertig"}
          </Button>
        </div>
      </div>
    </div>
  );
}
