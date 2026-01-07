import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Calendar, BarChart3, TrendingUp, Euro, ShoppingCart,
  Clock, CalendarDays, Package, Store, Users, Download, CheckCircle,
  PlayCircle, AlertCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import LiveClock from "@/components/LiveClock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EventStatsPage() {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchStats();
  }, [auth, navigate, eventId]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/events/${eventId}/stats`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      setStats(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        toast.error("Event nicht gefunden");
        navigate("/admin/events");
      } else {
        toast.error("Fehler beim Laden der Statistiken");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    if (!stats) return;
    
    const lines = [
      `Event: ${stats.event.name}`,
      `Zeitraum: ${formatDate(stats.event.start_date)} - ${formatDate(stats.event.end_date)}`,
      "",
      "ZUSAMMENFASSUNG",
      `Bestellungen: ${stats.summary.total_orders}`,
      `Abgeschlossen: ${stats.summary.completed_orders}`,
      `Gesamtumsatz: ${stats.summary.total_revenue.toFixed(2)} €`,
      `Pfand erhalten: ${stats.summary.total_deposit.toFixed(2)} €`,
      `Pfand zurück: ${stats.summary.total_deposit_return.toFixed(2)} €`,
      `Netto-Umsatz: ${stats.summary.net_revenue.toFixed(2)} €`,
      `Ø Bestellwert: ${stats.summary.avg_order_value.toFixed(2)} €`,
      "",
      "TOP ARTIKEL",
      "Name,Menge,Umsatz",
      ...stats.top_articles.map(a => `${a.name},${a.quantity},${a.revenue.toFixed(2)}`),
      "",
      "UMSATZ PRO TAG",
      "Datum,Bestellungen,Umsatz",
      ...Object.entries(stats.orders_by_day).map(([day, data]) => 
        `${day},${data.count},${data.revenue.toFixed(2)}`
      ),
      "",
      "UMSATZ PRO STUNDE",
      "Uhrzeit,Bestellungen,Umsatz",
      ...Object.entries(stats.orders_by_hour).map(([hour, data]) => 
        `${hour}:00,${data.count},${data.revenue.toFixed(2)}`
      ),
      "",
      "UMSATZ PRO STAND",
      "Stand,Bestellungen,Umsatz",
      ...Object.entries(stats.orders_by_stand).map(([stand, data]) => 
        `${stand},${data.count},${data.revenue.toFixed(2)}`
      )
    ];

    const csv = lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${stats.event.name.replace(/\s+/g, "_")}_Statistik.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Statistik exportiert");
  };

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "dd.MM.yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  const formatHour = (hour) => {
    return `${hour.toString().padStart(2, "0")}:00`;
  };

  const getStatusBadge = (status) => {
    const config = {
      planned: { label: "Geplant", icon: Clock, className: "border-blue-500 text-blue-500" },
      active: { label: "Aktiv", icon: PlayCircle, className: "border-green-500 text-green-500 bg-green-500/10" },
      completed: { label: "Abgeschlossen", icon: CheckCircle, className: "border-muted-foreground text-muted-foreground" }
    };
    const { label, icon: Icon, className } = config[status] || config.planned;
    return (
      <Badge variant="outline" className={`${className} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Lade Statistiken...</div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-destructive">Keine Daten verfügbar</div>
      </div>
    );
  }

  const { event, summary, top_articles, orders_by_hour, orders_by_day, orders_by_stand } = stats;

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin/events")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-primary" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
                {event.name}
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="w-3 h-3" />
                {formatDate(event.start_date)} - {formatDate(event.end_date)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {getStatusBadge(event.status)}
          <LiveClock className="hidden md:flex" />
          <Button onClick={exportCSV} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Bestellungen</span>
                <ShoppingCart className="w-4 h-4 text-secondary" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-secondary">
                {summary.total_orders}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.completed_orders} abgeschlossen ({summary.completion_rate.toFixed(0)}%)
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Gesamtumsatz</span>
                <Euro className="w-4 h-4 text-primary" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-primary">
                {summary.total_revenue.toFixed(2)} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Netto: {summary.net_revenue.toFixed(2)} €
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Ø Bestellwert</span>
                <TrendingUp className="w-4 h-4 text-accent" />
              </div>
              <p className="font-mono text-2xl sm:text-3xl font-bold text-accent">
                {summary.avg_order_value.toFixed(2)} €
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-muted-foreground text-xs sm:text-sm">Pfand</span>
                <Package className="w-4 h-4 text-green-500" />
              </div>
              <p className="font-mono text-lg font-bold text-green-500">
                +{summary.total_deposit.toFixed(2)} €
              </p>
              <p className="font-mono text-sm text-destructive">
                -{summary.total_deposit_return.toFixed(2)} €
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats Tabs */}
        <Card className="bg-card border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList className="w-full flex-wrap h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="overview" className="flex items-center gap-1">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Übersicht</span>
                </TabsTrigger>
                <TabsTrigger value="articles" className="flex items-center gap-1">
                  <Package className="w-4 h-4" />
                  <span className="hidden sm:inline">Artikel</span>
                </TabsTrigger>
                <TabsTrigger value="hourly" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">Pro Stunde</span>
                </TabsTrigger>
                <TabsTrigger value="daily" className="flex items-center gap-1">
                  <CalendarDays className="w-4 h-4" />
                  <span className="hidden sm:inline">Pro Tag</span>
                </TabsTrigger>
                <TabsTrigger value="stands" className="flex items-center gap-1">
                  <Store className="w-4 h-4" />
                  <span className="hidden sm:inline">Pro Stand</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="pt-6">
              {/* Overview Tab */}
              <TabsContent value="overview" className="mt-0">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Top Articles */}
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      Top 5 Artikel
                    </h3>
                    <div className="space-y-3">
                      {top_articles.slice(0, 5).map((article, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                            <span className="font-mono text-sm font-bold text-primary">{idx + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{article.name}</p>
                            <p className="text-sm text-muted-foreground">{article.quantity}x verkauft</p>
                          </div>
                          <p className="font-mono text-primary font-bold">{article.revenue.toFixed(2)} €</p>
                        </div>
                      ))}
                      {top_articles.length === 0 && (
                        <p className="text-muted-foreground text-center py-4">Keine Daten</p>
                      )}
                    </div>
                  </div>

                  {/* Top Stands */}
                  <div>
                    <h3 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-4 flex items-center gap-2">
                      <Store className="w-4 h-4 text-secondary" />
                      Top 5 Stände
                    </h3>
                    <div className="space-y-3">
                      {Object.entries(orders_by_stand)
                        .sort((a, b) => b[1].revenue - a[1].revenue)
                        .slice(0, 5)
                        .map(([stand, data], idx) => (
                          <div key={stand} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center">
                              <span className="font-mono text-sm font-bold text-secondary">{idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              <p className="font-medium">{stand}</p>
                              <p className="text-sm text-muted-foreground">{data.count} Bestellungen</p>
                            </div>
                            <p className="font-mono text-secondary font-bold">{data.revenue.toFixed(2)} €</p>
                          </div>
                        ))}
                      {Object.keys(orders_by_stand).length === 0 && (
                        <p className="text-muted-foreground text-center py-4">Keine Daten</p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Articles Tab */}
              <TabsContent value="articles" className="mt-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Artikel</TableHead>
                        <TableHead className="text-right">Menge</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ø Preis</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {top_articles.map((article, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{article.name}</TableCell>
                          <TableCell className="text-right font-mono text-secondary">{article.quantity}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{article.revenue.toFixed(2)} €</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {article.quantity > 0 ? (article.revenue / article.quantity).toFixed(2) : "0.00"} €
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Hourly Tab */}
              <TabsContent value="hourly" className="mt-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Uhrzeit</TableHead>
                        <TableHead className="text-right">Bestellungen</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ø Bestellwert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(orders_by_hour).map(([hour, data]) => (
                        <TableRow key={hour}>
                          <TableCell className="font-mono">{formatHour(hour)} - {formatHour(parseInt(hour) + 1)}</TableCell>
                          <TableCell className="text-right font-mono text-secondary">{data.count}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{data.revenue.toFixed(2)} €</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {data.count > 0 ? (data.revenue / data.count).toFixed(2) : "0.00"} €
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(orders_by_hour).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Keine Daten verfügbar
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Daily Tab */}
              <TabsContent value="daily" className="mt-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Datum</TableHead>
                        <TableHead className="text-right">Bestellungen</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Ø Bestellwert</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(orders_by_day).map(([day, data]) => (
                        <TableRow key={day}>
                          <TableCell className="font-mono">{formatDate(day)}</TableCell>
                          <TableCell className="text-right font-mono text-secondary">{data.count}</TableCell>
                          <TableCell className="text-right font-mono text-primary">{data.revenue.toFixed(2)} €</TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {data.count > 0 ? (data.revenue / data.count).toFixed(2) : "0.00"} €
                          </TableCell>
                        </TableRow>
                      ))}
                      {Object.keys(orders_by_day).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Keine Daten verfügbar
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              {/* Stands Tab */}
              <TabsContent value="stands" className="mt-0">
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Stand</TableHead>
                        <TableHead className="text-right">Bestellungen</TableHead>
                        <TableHead className="text-right">Umsatz</TableHead>
                        <TableHead className="text-right">Anteil</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(orders_by_stand)
                        .sort((a, b) => b[1].revenue - a[1].revenue)
                        .map(([stand, data]) => (
                          <TableRow key={stand}>
                            <TableCell className="font-medium">{stand}</TableCell>
                            <TableCell className="text-right font-mono text-secondary">{data.count}</TableCell>
                            <TableCell className="text-right font-mono text-primary">{data.revenue.toFixed(2)} €</TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {summary.total_revenue > 0 
                                ? ((data.revenue / summary.total_revenue) * 100).toFixed(1) 
                                : "0.0"}%
                            </TableCell>
                          </TableRow>
                        ))}
                      {Object.keys(orders_by_stand).length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            Keine Daten verfügbar
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>

        {/* Event Description */}
        {event.description && (
          <Card className="bg-card border-border mt-6">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Beschreibung:</span> {event.description}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
