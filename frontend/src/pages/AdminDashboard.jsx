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
  TrendingUp,
  Store
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
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Admin Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 sm:ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/stands")}
              data-testid="stands-nav-btn"
            >
              <Store className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Stände</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/articles")}
              data-testid="articles-nav-btn"
            >
              <Package className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Artikel</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/stats")}
              data-testid="stats-nav-btn"
            >
              <BarChart3 className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Statistiken</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Abmelden</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
            {[1, 2, 3, 4].map(i => (
              <Card key={i} className="bg-card animate-pulse">
                <CardContent className="p-4 sm:p-6 h-24 sm:h-32" />
              </Card>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
              {statCards.map((stat, idx) => {
                const Icon = stat.icon;
                return (
                  <Card key={idx} className="bg-card border-border">
                    <CardContent className="p-4 sm:p-6">
                      <div className="flex items-center justify-between mb-2 sm:mb-4">
                        <span className="text-muted-foreground text-xs sm:text-sm">{stat.title}</span>
                        <Icon className={`w-4 sm:w-5 h-4 sm:h-5 ${stat.color}`} />
                      </div>
                      <div className={`font-mono text-xl sm:text-3xl font-bold ${stat.color}`}>
                        {stat.value}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Top Articles */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="font-display uppercase text-sm sm:text-base">Top Artikel</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {stats?.top_articles?.length > 0 ? (
                    <ul className="space-y-2 sm:space-y-3">
                      {stats.top_articles.slice(0, 5).map((article, idx) => (
                        <li 
                          key={idx} 
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <div className="flex items-center gap-2 sm:gap-3">
                            <span className="font-mono text-muted-foreground w-5 sm:w-6 text-sm">
                              {idx + 1}.
                            </span>
                            <span className="font-medium text-sm sm:text-base">{article.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="font-mono text-primary text-sm sm:text-base">
                              {article.quantity}x
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {article.revenue.toFixed(2)} €
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
                      Keine Daten verfügbar
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Orders by Stand */}
              <Card className="bg-card border-border">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="font-display uppercase text-sm sm:text-base">Bestellungen pro Stand</CardTitle>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0">
                  {stats?.orders_by_stand && Object.keys(stats.orders_by_stand).length > 0 ? (
                    <ul className="space-y-2 sm:space-y-3">
                      {Object.entries(stats.orders_by_stand).slice(0, 5).map(([stand, data], idx) => (
                        <li 
                          key={idx}
                          className="flex items-center justify-between py-2 border-b border-border last:border-0"
                        >
                          <span className="font-medium text-sm sm:text-base">{stand}</span>
                          <div className="text-right">
                            <div className="font-mono text-secondary text-sm sm:text-base">
                              {data.count} Best.
                            </div>
                            <div className="text-xs sm:text-sm text-muted-foreground">
                              {data.revenue.toFixed(2)} €
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-center py-6 sm:py-8 text-sm">
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
