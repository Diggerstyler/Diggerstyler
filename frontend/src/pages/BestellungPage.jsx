import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Plus, Minus, Trash2, ShoppingCart, Beer, UtensilsCrossed } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function BestellungPage() {
  const { standId, standType } = useParams();
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [cart, setCart] = useState([]);
  const [activeCategory, setActiveCategory] = useState("all");
  const [standInfo, setStandInfo] = useState(null);
  const [allowedCategories, setAllowedCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, standRes, typesRes] = await Promise.all([
          axios.get(`${API}/stands/${standId}/articles`),
          axios.get(`${API}/stands/${standId}`),
          axios.get(`${API}/stand-types`)
        ]);
        
        setArticles(articlesRes.data);
        setStandInfo(standRes.data);
        
        const type = typesRes.data.find(t => t.id === (standRes.data?.stand_type || standType));
        if (type) {
          setAllowedCategories(type.categories);
        }
      } catch (error) {
        toast.error("Fehler beim Laden der Daten");
      }
    };
    fetchData();
  }, [standId, standType]);

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
        stand_name: standInfo?.name || "Unbekannt",
        items: cart,
        total: total,
        created_by: "Bestellung"
      };

      const response = await axios.post(`${API}/orders`, order);
      toast.success(`Bestellung #${response.data.order_number} erstellt!`);
      setCart([]);
    } catch (error) {
      toast.error("Fehler beim Erstellen der Bestellung");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Build categories based on allowed categories
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
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight truncate">
            Bestellung
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground truncate">{standInfo?.name}</p>
        </div>
        <Badge variant="outline" className="border-primary text-primary shrink-0">
          <ShoppingCart className="w-4 h-4 mr-1" />
          {cart.reduce((sum, item) => sum + item.quantity, 0)}
        </Badge>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Categories Sidebar - Desktop */}
        {categories.length > 1 && (
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
        <main className="flex-1 p-3 sm:p-4 lg:p-6 overflow-auto pb-40 md:pb-4">
          {/* Mobile Category Tabs */}
          {categories.length > 1 && (
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
          )}
          
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3 lg:gap-4">
            {filteredArticles.map(article => (
              <Card
                key={article.id}
                className="bg-card border-border cursor-pointer hover:border-primary/50 transition-colors active:scale-95"
                onClick={() => addToCart(article)}
                data-testid={`article-${article.id}`}
              >
                <CardContent className="p-3 sm:p-4">
                  <div className="flex flex-col h-full">
                    <Badge variant="outline" className="self-start mb-2 text-xs">
                      {article.category === "getraenke" ? "Getränk" : "Speise"}
                    </Badge>
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
          <div className="p-3 sm:p-4 border-b border-border">
            <h2 className="font-display text-base lg:text-lg font-bold uppercase">Warenkorb</h2>
          </div>
          
          <ScrollArea className="flex-1 p-3 sm:p-4">
            {cart.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                Noch keine Artikel
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {cart.map(item => (
                  <div 
                    key={item.article_id} 
                    className="flex items-center gap-2 sm:gap-3 bg-muted/50 p-2 sm:p-3 rounded-sm"
                    data-testid={`cart-item-${item.article_id}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.article_name}</p>
                      <p className="font-mono text-xs sm:text-sm text-muted-foreground">
                        {item.price.toFixed(2)} €
                      </p>
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.article_id, -1); }}
                        data-testid={`decrease-${item.article_id}`}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-mono w-5 sm:w-6 text-center text-sm">{item.quantity}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8"
                        onClick={(e) => { e.stopPropagation(); updateQuantity(item.article_id, 1); }}
                        data-testid={`increase-${item.article_id}`}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 sm:h-8 sm:w-8 text-destructive"
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.article_id); }}
                        data-testid={`remove-${item.article_id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="p-3 sm:p-4 border-t border-border space-y-3 sm:space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Gesamt</span>
              <span className="font-mono text-xl sm:text-2xl font-bold text-primary">
                {total.toFixed(2)} €
              </span>
            </div>
            <Button
              className="w-full h-11 sm:h-12 font-semibold uppercase neon-primary text-sm"
              onClick={submitOrder}
              disabled={cart.length === 0 || isSubmitting}
              data-testid="submit-order-btn"
            >
              {isSubmitting ? "Wird erstellt..." : "Bestellung aufgeben"}
            </Button>
          </div>
        </aside>
      </div>

      {/* Mobile Cart */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 glass p-3 sm:p-4 space-y-2 sm:space-y-3 z-50 border-t border-border">
        <div className="flex justify-between items-center">
          <span className="text-muted-foreground text-sm">
            {cart.reduce((sum, item) => sum + item.quantity, 0)} Artikel
          </span>
          <span className="font-mono text-lg sm:text-xl font-bold text-primary">
            {total.toFixed(2)} €
          </span>
        </div>
        <Button
          className="w-full h-11 sm:h-12 font-semibold uppercase neon-primary text-sm"
          onClick={submitOrder}
          disabled={cart.length === 0 || isSubmitting}
          data-testid="submit-order-mobile-btn"
        >
          {isSubmitting ? "Wird erstellt..." : "Bestellung aufgeben"}
        </Button>
      </div>
    </div>
  );
}
