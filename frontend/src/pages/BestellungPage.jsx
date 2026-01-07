import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Minus, ShoppingCart, Beer, UtensilsCrossed, RotateCcw, X, Trash2, Archive, Clock, Calculator, Maximize, Minimize, ChevronUp, ChevronDown, AlertTriangle, Home } from "lucide-react";
import { Input } from "@/components/ui/input";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const WS_URL = process.env.REACT_APP_BACKEND_URL?.replace('https://', 'wss://').replace('http://', 'ws://');

// Fullscreen utility functions - with error handling for iframe/permissions policy
const toggleFullscreen = async () => {
  try {
    if (!document.fullscreenElement) {
      await (document.documentElement.requestFullscreen?.() || 
        document.documentElement.webkitRequestFullscreen?.() ||
        document.documentElement.mozRequestFullScreen?.());
    } else {
      await (document.exitFullscreen?.() || 
        document.webkitExitFullscreen?.() ||
        document.mozCancelFullScreen?.());
    }
  } catch (error) {
    // Fullscreen not allowed (iframe, permissions policy, etc.) - silently ignore
    console.log('Fullscreen not available:', error.message);
  }
};

export default function BestellungPage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [depositGroups, setDepositGroups] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [standInfo, setStandInfo] = useState(null);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [swipingItem, setSwipingItem] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const touchStartX = useRef(0);
  const wsRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMobileCart, setShowMobileCart] = useState(false);
  
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
  
  // Order completion overlay state
  const [completedOrderNumber, setCompletedOrderNumber] = useState(null);
  const [completedOrderTotal, setCompletedOrderTotal] = useState(0);
  const [completedOrderItems, setCompletedOrderItems] = useState([]);
  const overlayTimeoutRef = useRef(null);
  
  // Change calculator state
  const [showChangeCalc, setShowChangeCalc] = useState(false);
  const [givenAmount, setGivenAmount] = useState("");
  
  // Archive state
  const [showArchive, setShowArchive] = useState(false);
  const [archiveOrders, setArchiveOrders] = useState([]);
  const [isLoadingArchive, setIsLoadingArchive] = useState(false);
  const [selectedArchiveOrder, setSelectedArchiveOrder] = useState(null);

  const showOrderCompletionOverlay = (orderNumber, orderTotal, items) => {
    console.log('Showing overlay:', orderNumber, orderTotal);
    setCompletedOrderNumber(orderNumber);
    setCompletedOrderTotal(orderTotal);
    setCompletedOrderItems(items || []);
    setGivenAmount("");
    setShowChangeCalc(false);
    // No auto-hide - user must click "Weiter"
  };

  const dismissOverlay = () => {
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setCompletedOrderNumber(null);
    setShowChangeCalc(false);
    setGivenAmount("");
  };

  const openChangeCalculator = (e) => {
    e.stopPropagation();
    if (overlayTimeoutRef.current) {
      clearTimeout(overlayTimeoutRef.current);
    }
    setShowChangeCalc(true);
  };

  const calculateChange = () => {
    const given = parseFloat(givenAmount) || 0;
    return given - completedOrderTotal;
  };

  const finishWithChange = () => {
    dismissOverlay();
    toast.success("Bestellung abgeschlossen!");
  };

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

  // Function to refetch articles (for stock updates)
  const refetchArticles = async () => {
    try {
      const [articlesRes, linkedRes] = await Promise.all([
        axios.get(`${API}/stands/${standId}/articles`),
        axios.get(`${API}/stands/${standId}/linked-articles`)
      ]);
      
      const articlesWithLinked = articlesRes.data.map(article => ({
        ...article,
        linkedArticles: linkedRes.data.filter(l => l.main_article_id === article.id)
      }));
      
      setArticles(articlesWithLinked);
    } catch (error) {
      console.error("Fehler beim Aktualisieren der Artikel");
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, standRes, typesRes, depositsRes, linkedRes] = await Promise.all([
          axios.get(`${API}/stands/${standId}/articles`),
          axios.get(`${API}/stands/${standId}`),
          axios.get(`${API}/stand-types`),
          axios.get(`${API}/deposit-groups`),
          axios.get(`${API}/stands/${standId}/linked-articles`)
        ]);
        
        // Add linked article info to articles
        const articlesWithLinked = articlesRes.data.map(article => ({
          ...article,
          linkedArticles: linkedRes.data.filter(l => l.main_article_id === article.id)
        }));
        
        setArticles(articlesWithLinked);
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

  // Check if any article at this stand has a deposit configured
  const standHasDepositArticles = articles.some(article => article.deposit && article.deposit.amount > 0);

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
        created_by: "Bestellung",
        direct_complete: false
      };

      // Save cart items before clearing for display in overlay
      const savedCartItems = [...cart];
      
      const response = await axios.post(`${API}/orders`, order);
      showOrderCompletionOverlay(response.data.order_number, total, savedCartItems);
      toast.success(`Bestellung #${response.data.order_number} erstellt!`);
      setCart([]);
      
      // Refresh articles to update stock info
      refetchArticles();
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
      {/* Order Completion Bottom Sheet */}
      {completedOrderNumber !== null && (
        <div 
          className="fixed inset-0 z-[100] bg-black/80"
          onClick={!showChangeCalc ? dismissOverlay : undefined}
        >
          {/* Bottom Sheet Container - full height on mobile */}
          <div 
            className="absolute bottom-0 left-0 right-0 bg-card rounded-t-3xl animate-in slide-in-from-bottom duration-300 max-h-[95vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar - fixed */}
            <div className="flex justify-center pt-3 pb-2 shrink-0">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
            </div>
            
            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-4 pb-6">
              {/* Header with Bonnummer - sticky */}
              <div className="sticky top-0 bg-card pb-4 z-10">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-primary/20 border-4 border-primary flex items-center justify-center shrink-0">
                      <span className="font-mono text-3xl sm:text-4xl font-black text-primary">
                        {completedOrderNumber.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Bon</p>
                      <p className="font-mono text-xl sm:text-2xl font-bold text-primary">
                        {completedOrderTotal.toFixed(2)} €
                      </p>
                    </div>
                  </div>
                  <Button
                    className="h-12 sm:h-14 px-4 sm:px-6 text-base font-bold bg-primary hover:bg-primary/90 shrink-0"
                    onClick={dismissOverlay}
                  >
                    Weiter →
                  </Button>
                </div>
              </div>

              {/* Order Items - scrollable */}
              <div className="space-y-2 mb-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Artikel im Bon</p>
                <div className="bg-muted/20 rounded-xl p-3 space-y-2">
                  {completedOrderItems.filter(i => !i.is_deposit_return).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center font-mono font-bold text-primary">
                          {item.quantity}x
                        </span>
                        <span className="font-medium">{item.article_name}</span>
                      </div>
                      <span className="font-mono text-muted-foreground">
                        {(item.price * item.quantity).toFixed(2)} €
                      </span>
                    </div>
                  ))}
                  {completedOrderItems.filter(i => i.is_deposit_return).length > 0 && (
                    <>
                      <p className="text-xs text-muted-foreground pt-2">Pfand zurück:</p>
                      {completedOrderItems.filter(i => i.is_deposit_return).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 text-green-500">
                          <span className="text-sm">{item.quantity}x {item.article_name}</span>
                          <span className="font-mono text-sm">-{Math.abs(item.price * item.quantity).toFixed(2)} €</span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>

              {/* Change Calculator */}
              {!showChangeCalc ? (
                <Button
                  variant="outline"
                  className="w-full h-12 border-green-500/50 text-green-500 hover:bg-green-500/10"
                  onClick={openChangeCalculator}
                >
                  <Calculator className="w-5 h-5 mr-2" />
                  Restgeldrechner
                </Button>
              ) : (
                <div className="space-y-4 bg-muted/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">Restgeldrechner</p>
                    <Button variant="ghost" size="sm" onClick={() => setShowChangeCalc(false)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Zu zahlen</p>
                      <p className="font-mono text-xl font-bold text-primary">
                        {completedOrderTotal.toFixed(2)} €
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Gast gibt</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        value={givenAmount}
                        onChange={(e) => setGivenAmount(e.target.value)}
                        placeholder="0.00"
                        className="font-mono text-lg h-10 bg-background"
                        autoFocus
                      />
                    </div>
                  </div>
                  
                  {givenAmount && parseFloat(givenAmount) > 0 && (
                    <div className={`rounded-xl p-3 ${parseFloat(givenAmount) >= completedOrderTotal ? 'bg-green-500/20 border border-green-500/50' : 'bg-red-500/20 border border-red-500/50'}`}>
                      <p className={`text-xs mb-1 ${parseFloat(givenAmount) >= completedOrderTotal ? 'text-green-400' : 'text-red-400'}`}>
                        {parseFloat(givenAmount) >= completedOrderTotal ? 'Rückgeld' : 'Fehlbetrag'}
                      </p>
                      <p className={`font-mono text-2xl font-bold ${parseFloat(givenAmount) >= completedOrderTotal ? 'text-green-500' : 'text-red-500'}`}>
                        {Math.abs(calculateChange()).toFixed(2)} €
                      </p>
                    </div>
                  )}

                  <Button
                    className="w-full h-10 bg-green-600 hover:bg-green-700"
                    onClick={finishWithChange}
                  >
                    Abschließen
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Status: {selectedArchiveOrder?.status}</span>
            <span>{selectedArchiveOrder?.created_at && new Date(selectedArchiveOrder.created_at).toLocaleTimeString('de-DE', {hour: '2-digit', minute: '2-digit'})}</span>
          </div>
        </DialogContent>
      </Dialog>

      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            title="Zur Startseite"
            className="shrink-0"
          >
            <Home className="w-5 h-5" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(`/?stand=${standId}`)}
            data-testid="back-btn"
            title="Zurück zur Rollenauswahl"
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight truncate">
            Bestellung
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{standInfo?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <LiveClock className="hidden sm:flex" />
          <Button
            variant="outline"
            size="sm"
            onClick={openArchive}
            className="shrink-0"
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
          <Badge variant="outline" className="border-primary text-primary shrink-0">
            <ShoppingCart className="w-4 h-4 mr-1" />
            {cart.reduce((sum, item) => sum + item.quantity, 0)}
          </Badge>
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
                  <Card key={order.id} className="bg-muted/30 border-border">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
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
                          {order.deposit_total > 0 && (
                            <p className="text-xs text-green-500">
                              inkl. {order.deposit_total.toFixed(2)}€ Pfand
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="border-t border-border pt-3">
                        <ul className="space-y-1">
                          {order.items?.map((item, idx) => (
                            <li key={idx} className="flex justify-between text-sm">
                              <span className={item.is_deposit_return ? 'text-green-500' : ''}>
                                {item.quantity}x {item.article_name}
                              </span>
                              <span className={`font-mono ${item.is_deposit_return ? 'text-green-500' : 'text-muted-foreground'}`}>
                                {item.is_deposit_return ? '-' : ''}{(item.price * item.quantity).toFixed(2)} €
                              </span>
                            </li>
                          ))}
                        </ul>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar - Desktop ONLY (not mobile landscape) */}
        {categories.length > 1 && (
          <aside className="w-40 lg:w-48 border-r border-border p-3 sm:p-4 hidden lg:block shrink-0">
            <nav className="space-y-2">
              {categories.map(cat => {
                const Icon = cat.icon;
                return (
                  <Button
                    key={cat.id}
                    variant={activeCategory === cat.id ? "secondary" : "ghost"}
                    className="w-full justify-start text-sm"
                    onClick={() => setActiveCategory(cat.id)}
                    data-testid={`category-${cat.id}`}
                  >
                    {Icon && <Icon className="w-4 h-4 mr-2" />}
                    {cat.name}
                  </Button>
                );
              })}
            </nav>
            
            {/* Deposit Return Buttons - only show if stand has articles with deposit */}
            {standHasDepositArticles && depositGroups.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground mb-3 uppercase font-semibold">Pfand zurück</p>
                <div className="space-y-2">
                  {depositGroups.map(deposit => (
                    <Button
                      key={deposit.id}
                      variant="outline"
                      className="w-full justify-start text-sm border-green-500/50 text-green-500 hover:bg-green-500/10"
                      onClick={() => addDepositReturn(deposit)}
                      data-testid={`deposit-return-${deposit.id}`}
                    >
                      <RotateCcw className="w-4 h-4 mr-2" />
                      {deposit.name}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </aside>
        )}

        {/* Articles Grid */}
        <main className="flex-1 p-2 sm:p-3 lg:p-6 overflow-auto pb-36 lg:pb-4">
          {/* Mobile Category Tabs - more compact */}
          <div className="lg:hidden flex gap-1 mb-2 overflow-x-auto pb-1">
            {categories.map(cat => (
              <Button
                key={cat.id}
                variant={activeCategory === cat.id ? "secondary" : "outline"}
                size="sm"
                className="shrink-0 h-7 px-2 text-xs"
                onClick={() => setActiveCategory(cat.id)}
              >
                {cat.name}
              </Button>
            ))}
            {/* Inline Pfand buttons for mobile */}
            {standHasDepositArticles && depositGroups.map(deposit => (
              <Button
                key={deposit.id}
                variant="outline"
                size="sm"
                className="shrink-0 h-7 px-2 text-xs border-green-500/50 text-green-500"
                onClick={() => addDepositReturn(deposit)}
              >
                <RotateCcw className="w-3 h-3 mr-1" />
                {deposit.name}
              </Button>
            ))}
          </div>
          
          {/* Articles Grid - optimized for landscape */}
          <div className="grid grid-cols-2 landscape:grid-cols-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-1.5 sm:gap-2 lg:gap-4">
            {filteredArticles.map(article => {
              const stockInfo = article.stock_info;
              const isLow = stockInfo?.is_low && !stockInfo?.is_sold_out;
              const isSoldOut = stockInfo?.is_sold_out;
              const isDisabled = isSoldOut && stockInfo?.sold_out_behavior === 'disable';
              
              return (
                <Card
                  key={article.id}
                  className={`bg-card border-border cursor-pointer transition-colors active:scale-95 ${
                    isDisabled ? 'opacity-40 cursor-not-allowed' :
                    isSoldOut ? 'border-destructive/50 hover:border-destructive' :
                    isLow ? 'border-yellow-500/50 hover:border-yellow-500' :
                    'hover:border-primary/50'
                  }`}
                  onClick={() => !isDisabled && addToCart(article)}
                  data-testid={`article-${article.id}`}
                >
                  <CardContent className="p-2 sm:p-3 lg:p-4">
                    <div className="flex flex-col h-full">
                      {/* Compact badges for mobile */}
                      <div className="flex gap-1 mb-1 flex-wrap">
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                          {article.category === "getraenke" ? "Getränk" : "Speise"}
                        </Badge>
                        {article.deposit && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 border-green-500/50 text-green-500">
                            +{article.deposit.amount.toFixed(2)}€
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-semibold text-xs sm:text-sm lg:text-base mb-0.5 line-clamp-2">{article.name}</h3>
                      {/* Verknüpfte Artikel klein anzeigen */}
                      {article.linkedArticles?.length > 0 && (
                        <p className="text-[10px] text-muted-foreground mb-1 line-clamp-1">
                          + {article.linkedArticles.map(l => l.linked_article_name).join(', ')}
                        </p>
                      )}
                      
                      {/* Stock Warning */}
                      {stockInfo && (isLow || isSoldOut) && (
                        <div className={`flex items-center gap-1 text-[10px] mb-1 ${isSoldOut ? 'text-destructive' : 'text-yellow-500'}`}>
                          <AlertTriangle className="w-3 h-3" />
                          {isSoldOut ? (
                            <span className="font-medium">Ausverkauft</span>
                          ) : (
                            <span>Noch {Math.round(stockInfo.total_units)} {stockInfo.unit_name}</span>
                          )}
                        </div>
                      )}
                      
                      <p className={`font-mono text-sm sm:text-base lg:text-lg mt-auto font-bold ${
                        isSoldOut ? 'text-destructive' : 'text-primary'
                      }`}>
                        {article.price.toFixed(2)} €
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </main>

        {/* Cart Sidebar - Desktop ONLY */}
        <aside className="w-72 lg:w-80 border-l border-border hidden lg:flex flex-col shrink-0">
          <div className="p-3 sm:p-4 border-b border-border">
            <h2 className="font-display text-base lg:text-lg font-bold uppercase">Warenkorb</h2>
            <p className="text-xs text-muted-foreground">Wischen zum Entfernen</p>
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
                    className={`flex items-center gap-2 p-2 rounded-sm relative overflow-hidden ${item.is_deposit_return ? 'bg-green-500/10' : 'bg-muted/50'}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium text-sm truncate ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                        {item.quantity}x {item.article_name}
                      </p>
                      <p className={`font-mono text-xs ${item.is_deposit_return ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {item.is_deposit_return ? '-' : ''}{Math.abs(item.price * item.quantity).toFixed(2)} €
                        {!item.is_deposit_return && item.deposit_amount > 0 && (
                          <span className="text-green-500"> +{(item.deposit_amount * item.quantity).toFixed(2)}€ Pfand</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeOneFromCart(item.article_id, item.is_deposit_return)}
                    >
                      <Minus className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0"
                      onClick={() => removeFromCart(item.article_id, item.is_deposit_return)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 sm:p-4 border-t border-border space-y-2">
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
              <span className="font-semibold">Gesamt</span>
              <span className="font-mono text-xl font-bold text-primary">
                {total.toFixed(2)} €
              </span>
            </div>
            <Button
              className="w-full h-11 font-semibold uppercase neon-primary text-sm"
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
              data-testid="submit-order-btn"
            >
              {isSubmitting ? "Wird erstellt..." : "Bestellung aufgeben"}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile Cart - REDESIGNED with prominent order button */}
      <div className="lg:hidden fixed bottom-14 sm:bottom-12 left-0 right-0 glass border-t-2 border-primary/50 z-50">
        {/* ALWAYS visible: Big order button + total */}
        {cart.length > 0 && (
          <div className="p-2 flex items-center gap-3">
            {/* PROMINENT ORDER BUTTON - LEFT SIDE, ALWAYS VISIBLE */}
            <Button
              className="h-14 px-8 font-bold uppercase bg-primary hover:bg-primary/90 text-primary-foreground text-lg shadow-lg shadow-primary/30"
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
              data-testid="submit-order-mobile-btn"
            >
              {isSubmitting ? "..." : `${total.toFixed(2)}€ ✓`}
            </Button>
            
            {/* Cart summary - tap to expand */}
            <div 
              className="flex-1 flex items-center gap-2 cursor-pointer min-w-0 p-2 rounded bg-muted/30"
              onClick={() => setShowMobileCart(!showMobileCart)}
            >
              <Badge className="bg-muted text-foreground font-mono text-sm px-2 shrink-0">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}x
              </Badge>
              <div className="min-w-0 flex-1">
                <span className="text-xs text-muted-foreground block truncate">
                  {cart.slice(0, 3).map(i => i.article_name.split(' ')[0]).join(', ')}
                </span>
              </div>
              {showMobileCart ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronUp className="w-4 h-4 shrink-0" />}
            </div>
          </div>
        )}
        
        {/* Expanded cart items (only when showMobileCart is true) */}
        {showMobileCart && cart.length > 0 && (
          <div className="border-t border-border/50 max-h-32 overflow-auto p-2 space-y-1">
            {cart.map(item => (
              <div 
                key={`${item.article_id}_${item.is_deposit_return}`}
                className={`flex items-center justify-between px-2 py-1.5 rounded ${item.is_deposit_return ? 'bg-green-500/10' : 'bg-muted/30'}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-mono text-sm font-bold ${item.is_deposit_return ? 'text-green-500' : 'text-primary'}`}>
                    {item.quantity}x
                  </span>
                  <span className={`text-sm truncate ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                    {item.article_name}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`font-mono text-sm ${item.is_deposit_return ? 'text-green-500' : ''}`}>
                    {item.is_deposit_return ? '-' : ''}{Math.abs(item.price * item.quantity).toFixed(2)}€
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Remove one from cart
                      setCart(prev => {
                        const key = `${item.article_id}_${item.is_deposit_return}`;
                        const existing = prev.find(i => `${i.article_id}_${i.is_deposit_return}` === key);
                        if (existing && existing.quantity > 1) {
                          return prev.map(i => 
                            `${i.article_id}_${i.is_deposit_return}` === key 
                              ? { ...i, quantity: i.quantity - 1 } 
                              : i
                          );
                        }
                        return prev.filter(i => `${i.article_id}_${i.is_deposit_return}` !== key);
                      });
                    }}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
            {depositReturnTotal > 0 && (
              <div className="text-xs text-green-500 text-right pt-1">
                Pfand: -{depositReturnTotal.toFixed(2)}€
              </div>
            )}
          </div>
        )}
      </div>
      <AppFooter />
    </div>
  );
}
