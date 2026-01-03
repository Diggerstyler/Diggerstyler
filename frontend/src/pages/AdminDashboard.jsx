import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  LogOut, 
  ShoppingCart,
  Euro,
  CheckCircle,
  TrendingUp
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    if (!auth) {
      navigate("/admin/login");
      return;
    }

    const fetchStats = async () => {
      try {
        const response = await axios.post(`${API}/stats/overview`, {}, {
          headers: { Authorization: `Basic ${auth}` }
        });
        setStats(response.data);
      } catch (error) {
        if (error.response?.status === 401) {
          sessionStorage.removeItem("adminAuth");
          navigate("/admin/login");
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [navigate]);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    navigate("/");
  };

  const statCards = stats ? [
    {
      title: "Bestellungen",
      value: stats.total_orders,
      icon: ShoppingCart,
      color: "text-secondary"
    },
    {
      title: "Umsatz",
      value: `${stats.total_revenue.toFixed(2)} €`,
      icon: Euro,
      color: "text-primary"
    },
    {
      title: "Abgeschlossen",
      value: stats.completed_orders,
      icon: CheckCircle,
      color: "text-green-500"
    },
    {
      title: "Abschlussrate",
      value: stats.total_orders > 0 
        ? `${((stats.completed_orders / stats.total_orders) * 100).toFixed(1)}%` 
        : "0%",
      icon: TrendingUp,
      color: "text-accent"
    }
  ] : [];

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <LayoutDashboard className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">
            Admin Dashboard
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate("/admin/articles")}
            data-testid="articles-nav-btn"
          >
            <Package className="w-4 h-4 mr-2" />
            Artikel
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate("/admin/stats")}
            data-testid="stats-nav-btn"
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Statistiken
          </Button>
          <Button
            variant="ghost"
            onClick={handleLogout}
            data-testid="logout-btn"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Abmelden
          </Button>
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="bg-card animate-pulse">
                <CardContent className="p-6 h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {statCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <Card key={idx} className="bg-card border-border">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-muted-foreground">{stat.title}</span>
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div className={`font-mono text-3xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Articles */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display uppercase">Top Artikel</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.top_articles?.length > 0 ? (
                    <ul className="space-y-3">
                      {stats.top_articles.map((article, idx) => (
                        <li 
                          key={idx} 
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-muted-foreground w-6">
                              {idx + 1}.
                            </span>
                            <span className="font-medium">{article.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-primary">
                              {article.quantity}x
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {article.revenue.toFixed(2)} €
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Keine Daten verfügbar
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Orders by Stand */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="font-display uppercase">Bestellungen pro Stand</CardTitle>
                </CardHeader>
                <CardContent>
                  {stats?.orders_by_stand && Object.keys(stats.orders_by_stand).length > 0 ? (
                    <ul className="space-y-3">
                      {Object.entries(stats.orders_by_stand).map(([stand, data], idx) => (
                        <li 
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <span className="font-medium">{stand}</span>
                          <div className="text-right">
                            <div className="font-mono text-secondary">
                              {data.count} Bestellungen
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {data.revenue.toFixed(2)} €
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-8">
                      Keine Daten verfügbar
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
