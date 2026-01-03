import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, BarChart3, CalendarIcon, Filter, Download } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stands, setStands] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    stand_id: "all",
    status: "all",
    start_date: null,
    end_date: null
  });

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchStands();
  }, [auth, navigate]);

  useEffect(() => {
    if (auth) {
      fetchData();
    }
  }, [filters, auth]);

  const fetchStands = async () => {
    try {
      const response = await axios.get(`${API}/stands`);
      setStands(response.data);
    } catch (error) {
      console.error("Error fetching stands:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const filterPayload = {
        start_date: filters.start_date ? format(filters.start_date, "yyyy-MM-dd") : null,
        end_date: filters.end_date ? format(filters.end_date, "yyyy-MM-dd") : null,
        stand_id: filters.stand_id !== "all" ? filters.stand_id : null
      };

      const [statsRes, ordersRes] = await Promise.all([
        axios.post(`${API}/stats/overview`, filterPayload, {
          headers: { Authorization: `Basic ${auth}` }
        }),
        axios.get(`${API}/stats/orders`, {
          params: {
            start_date: filterPayload.start_date,
            end_date: filterPayload.end_date,
            stand_id: filterPayload.stand_id,
            status: filters.status !== "all" ? filters.status : null
          },
          headers: { Authorization: `Basic ${auth}` }
        })
      ]);

      setStats(statsRes.data);
      setOrders(ordersRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        sessionStorage.removeItem("adminAuth");
        navigate("/admin/login");
      } else {
        toast.error("Fehler beim Laden der Daten");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ["Bestellnummer", "Stand", "Artikel", "Gesamt", "Status", "Erstellt"];
    const rows = orders.map(order => [
      order.order_number,
      order.stand_name,
      order.items.map(i => `${i.quantity}x ${i.article_name}`).join("; "),
      order.total.toFixed(2),
      order.status,
      format(new Date(order.created_at), "dd.MM.yyyy HH:mm")
    ]);

    const csv = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bestellungen_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  const statusMap = {
    created: { label: "Erstellt", color: "secondary" },
    in_progress: { label: "In Arbeit", color: "default" },
    ready: { label: "Fertig", color: "outline" },
    completed: { label: "Abgeholt", color: "default" }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/admin")}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <BarChart3 className="w-6 h-6 text-primary" />
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">
            Statistiken
          </h1>
        </div>
        <Button
          variant="outline"
          className="ml-auto"
          onClick={exportCSV}
          disabled={orders.length === 0}
          data-testid="export-btn"
        >
          <Download className="w-4 h-4 mr-2" />
          CSV Export
        </Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto">
        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardHeader>
            <CardTitle className="font-display uppercase flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Startdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="start-date-btn">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.start_date 
                        ? format(filters.start_date, "dd.MM.yyyy") 
                        : "Auswählen..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.start_date}
                      onSelect={(date) => setFilters(prev => ({ ...prev, start_date: date }))}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Enddatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start" data-testid="end-date-btn">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.end_date 
                        ? format(filters.end_date, "dd.MM.yyyy") 
                        : "Auswählen..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={filters.end_date}
                      onSelect={(date) => setFilters(prev => ({ ...prev, end_date: date }))}
                      locale={de}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Stand</Label>
                <Select 
                  value={filters.stand_id} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, stand_id: value }))}
                >
                  <SelectTrigger data-testid="stand-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Stände</SelectItem>
                    {stands.map(stand => (
                      <SelectItem key={stand.id} value={stand.id}>
                        {stand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger data-testid="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Status</SelectItem>
                    <SelectItem value="created">Erstellt</SelectItem>
                    <SelectItem value="in_progress">In Arbeit</SelectItem>
                    <SelectItem value="ready">Fertig</SelectItem>
                    <SelectItem value="completed">Abgeholt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  stand_id: "all",
                  status: "all",
                  start_date: null,
                  end_date: null
                })}
                data-testid="reset-filters-btn"
              >
                Filter zurücksetzen
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Bestellungen</p>
                <p className="font-mono text-2xl font-bold text-secondary">{stats.total_orders}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Umsatz</p>
                <p className="font-mono text-2xl font-bold text-primary">{stats.total_revenue.toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Abgeschlossen</p>
                <p className="font-mono text-2xl font-bold text-green-500">{stats.completed_orders}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Durchschn. Bestellung</p>
                <p className="font-mono text-2xl font-bold text-accent">
                  {stats.total_orders > 0 
                    ? (stats.total_revenue / stats.total_orders).toFixed(2) 
                    : "0.00"} €
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display uppercase">
              Bestellungen ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Bestellungen gefunden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>#</TableHead>
                      <TableHead>Stand</TableHead>
                      <TableHead>Artikel</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Erstellt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(order => (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono font-bold">
                          {order.order_number}
                        </TableCell>
                        <TableCell>{order.stand_name}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {order.items.map(i => `${i.quantity}x ${i.article_name}`).join(", ")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {order.total.toFixed(2)} €
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={statusMap[order.status]?.color || "outline"}
                            className={order.status === "completed" ? "bg-green-600" : ""}
                          >
                            {statusMap[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {format(new Date(order.created_at), "dd.MM. HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hourly Breakdown */}
        {stats?.orders_by_hour && Object.keys(stats.orders_by_hour).length > 0 && (
          <Card className="bg-card border-border mt-6">
            <CardHeader>
              <CardTitle className="font-display uppercase">Bestellungen pro Stunde</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 md:grid-cols-12 gap-2">
                {Array.from({ length: 24 }, (_, i) => {
                  const data = stats.orders_by_hour[i] || { count: 0, revenue: 0 };
                  const maxCount = Math.max(...Object.values(stats.orders_by_hour).map(d => d.count));
                  const intensity = maxCount > 0 ? data.count / maxCount : 0;
                  
                  return (
                    <div
                      key={i}
                      className="text-center p-2 rounded-sm"
                      style={{
                        backgroundColor: `rgba(217, 70, 239, ${intensity * 0.5})`
                      }}
                    >
                      <div className="font-mono text-xs text-muted-foreground">
                        {i.toString().padStart(2, "0")}h
                      </div>
                      <div className="font-bold">{data.count}</div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
