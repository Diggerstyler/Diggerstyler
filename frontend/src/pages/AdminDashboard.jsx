import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  LayoutDashboard, 
  Package, 
  BarChart3, 
  LogOut, 
  ShoppingCart,
  Euro,
  CheckCircle,
  TrendingUp,
  Store,
  Download,
  Trash2,
  AlertTriangle,
  HelpCircle,
  Layers
} from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
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
  }, [navigate, auth]);

  const handleLogout = () => {
    sessionStorage.removeItem("adminAuth");
    navigate("/");
  };

  // Export all data
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await axios.get(`${API}/admin/export`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      // Create downloadable JSON file
      const dataStr = JSON.stringify(response.data, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `festival_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success("Export erfolgreich heruntergeladen");
    } catch (error) {
      toast.error("Fehler beim Exportieren");
    } finally {
      setIsExporting(false);
    }
  };

  // Verify PIN and show confirmation
  const handlePinSubmit = async () => {
    setPinError("");
    try {
      await axios.post(`${API}/admin/verify-pin`, { pin: pinInput }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      setShowResetDialog(false);
      setShowConfirmDialog(true);
    } catch (error) {
      setPinError("Falscher PIN");
    }
  };

  // Confirm and execute reset
  const handleConfirmReset = async () => {
    setIsResetting(true);
    try {
      const response = await axios.post(`${API}/admin/reset`, { pin: pinInput }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success(`${response.data.orders_deleted} Bestellungen gelöscht`);
      setShowConfirmDialog(false);
      setPinInput("");
      // Refresh stats
      window.location.reload();
    } catch (error) {
      toast.error("Fehler beim Zurücksetzen");
    } finally {
      setIsResetting(false);
    }
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
            <h1 className="font-display text-base sm:text-xl font-bold uppercase tracking-tight">
              Karnbachs Admin
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-1 sm:gap-2 sm:ml-auto">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/stands")}
              data-testid="stands-nav-btn"
              className="h-8 px-2"
            >
              <Store className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/articles")}
              data-testid="articles-nav-btn"
              className="h-8 px-2"
            >
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">Artikel</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/stats")}
              data-testid="stats-nav-btn"
              className="h-8 px-2"
            >
              <BarChart3 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExport}
              disabled={isExporting}
              data-testid="export-btn"
              className="h-8 px-2 text-green-500"
            >
              <Download className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowResetDialog(true)}
              data-testid="reset-btn"
              className="h-8 px-2 text-destructive"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHelp(true)}
              data-testid="help-btn"
              className="h-8 px-2"
            >
              <HelpCircle className="w-4 h-4" />
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

      {/* Admin Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Admin-Anleitung
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[55vh] pr-4">
            <div className="space-y-3 py-2">
              <section>
                <h3 className="font-bold text-primary text-sm mb-1">🏪 Stände</h3>
                <p className="text-xs text-muted-foreground">Stand erstellen mit Typ (Speise/Getränk/Gemischt). "Kurzer Prozess" = Bestellung direkt zur Ausgabe.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">📦 Artikel</h3>
                <p className="text-xs text-muted-foreground">Artikel mit Preis und Kategorie anlegen. Optional Pfandgruppe zuweisen.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">💰 Pfand</h3>
                <p className="text-xs text-muted-foreground">Pfandgruppen erstellen (z.B. "Becher 2€") und Artikeln zuweisen.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">📊 Statistiken</h3>
                <p className="text-xs text-muted-foreground">Übersicht: Bestellungen, Umsatz, stündliche Auswertung.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">📥 Export</h3>
                <p className="text-xs text-muted-foreground">Alle Daten als JSON herunterladen für Buchhaltung.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">🗑️ Reset</h3>
                <p className="text-xs text-muted-foreground">Löscht Bestellungen (PIN erforderlich). Stände/Artikel bleiben.</p>
              </section>

              <section>
                <h3 className="font-bold text-primary text-sm mb-1">🔢 Bonnummern</h3>
                <p className="text-xs text-muted-foreground">01-25 pro Stand, dann wieder 01.</p>
              </section>
            </div>
          </ScrollArea>
          <Button onClick={() => setShowHelp(false)} className="mt-2">OK</Button>
        </DialogContent>
      </Dialog>

      <main className="p-3 sm:p-6 max-w-7xl mx-auto">
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

      {/* PIN Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => {
        setShowResetDialog(open);
        if (!open) {
          setPinInput("");
          setPinError("");
        }
      }}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Daten zurücksetzen
            </DialogTitle>
            <DialogDescription>
              Geben Sie den PIN ein, um alle Bestellungen zu löschen.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                type="password"
                placeholder="PIN eingeben"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePinSubmit()}
                className={pinError ? 'border-destructive' : ''}
                data-testid="pin-input"
              />
              {pinError && (
                <p className="text-sm text-destructive">{pinError}</p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowResetDialog(false)}
              >
                Abbrechen
              </Button>
              <Button
                className="flex-1 bg-destructive hover:bg-destructive/90"
                onClick={handlePinSubmit}
                disabled={!pinInput}
                data-testid="verify-pin-btn"
              >
                Weiter
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Wirklich zurücksetzen?
            </DialogTitle>
            <DialogDescription className="pt-2">
              <strong className="text-destructive">ACHTUNG:</strong> Alle Bestellungen werden unwiderruflich gelöscht!
              <br /><br />
              Stände, Artikel und Pfandgruppen bleiben erhalten.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setShowConfirmDialog(false);
                setPinInput("");
              }}
            >
              Abbrechen
            </Button>
            <Button
              className="flex-1 bg-destructive hover:bg-destructive/90"
              onClick={handleConfirmReset}
              disabled={isResetting}
              data-testid="confirm-reset-btn"
            >
              {isResetting ? "Wird gelöscht..." : "Ja, zurücksetzen"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
