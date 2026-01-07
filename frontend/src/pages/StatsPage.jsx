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
import { BarChart3, CalendarIcon, Filter, Clock, Calendar as CalendarEvent } from "lucide-react";
import { format } from "date-fns";
import { de } from "date-fns/locale";
import AppFooter from "@/components/AppFooter";
import AdminNavBar, { AdminActions } from "@/components/AdminNavBar";
import { useAdminSwipe } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StatsPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [stands, setStands] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    stand_id: "all",
    status: "all",
    event_id: "all",
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
    fetchEvents();
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

  const fetchEvents = async () => {
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const filterPayload = {
        start_date: filters.start_date ? format(filters.start_date, "yyyy-MM-dd") : null,
        end_date: filters.end_date ? format(filters.end_date, "yyyy-MM-dd") : null,
        stand_id: filters.stand_id !== "all" ? filters.stand_id : null,
        event_id: filters.event_id !== "all" ? filters.event_id : null
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
            event_id: filterPayload.event_id,
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
    const headers = ["Bestellnummer", "Stand", "Artikel", "Gesamt", "Pfand", "Pfand zurück", "Status", "Erstellt"];
    const rows = orders.map(order => [
      order.order_number,
      order.stand_name,
      order.items.filter(i => !i.is_deposit_return).map(i => `${i.quantity}x ${i.article_name}`).join("; "),
      order.total.toFixed(2),
      (order.deposit_total || 0).toFixed(2),
      (order.deposit_return_total || 0).toFixed(2),
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

  const { swipeHandlers } = useAdminSwipe();

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-3 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h1 className="font-display text-sm sm:text-base font-bold uppercase tracking-tight hidden sm:block">
              Statistik
            </h1>
          </div>
          
          <div className="flex-1 ">
            <AdminNavBar />
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 shrink-0"
            onClick={exportCSV}
            disabled={orders.length === 0}
            data-testid="export-btn"
            title="CSV Export"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto flex-1">
        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display uppercase flex items-center gap-2 text-sm sm:text-base">
              <Filter className="w-5 h-5" />
              Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-2">
              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Event</Label>
                <Select 
                  value={filters.event_id} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, event_id: value }))}
                >
                  <SelectTrigger className="text-sm" data-testid="event-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle Events</SelectItem>
                    <SelectItem value="none">Ohne Event</SelectItem>
                    {events.map(event => (
                      <SelectItem key={event.id} value={event.id}>
                        <span className="flex items-center gap-2">
                          <CalendarEvent className="w-3 h-3" />
                          {event.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Startdatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm" data-testid="start-date-btn">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.start_date 
                        ? format(filters.start_date, "dd.MM.yy") 
                        : "Wählen"}
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
                <Label className="text-xs sm:text-sm">Enddatum</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-sm" data-testid="end-date-btn">
                      <CalendarIcon className="w-4 h-4 mr-2" />
                      {filters.end_date 
                        ? format(filters.end_date, "dd.MM.yy") 
                        : "Wählen"}
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
                <Label className="text-xs sm:text-sm">Stand</Label>
                <Select 
                  value={filters.stand_id} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, stand_id: value }))}
                >
                  <SelectTrigger className="text-sm" data-testid="stand-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    {stands.map(stand => (
                      <SelectItem key={stand.id} value={stand.id}>
                        {stand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm">Status</Label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                >
                  <SelectTrigger className="text-sm" data-testid="status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Alle</SelectItem>
                    <SelectItem value="created">Erstellt</SelectItem>
                    <SelectItem value="in_progress">In Arbeit</SelectItem>
                    <SelectItem value="ready">Fertig</SelectItem>
                    <SelectItem value="completed">Abgeholt</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => setFilters({
                stand_id: "all",
                status: "all",
                event_id: "all",
                start_date: null,
                end_date: null
              })}
              data-testid="reset-filters-btn"
            >
              Filter zurücksetzen
            </Button>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-2 mb-6">
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">Bestellungen</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-secondary">{stats.total_orders}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">Umsatz</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-primary">{stats.total_revenue.toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">Pfand erhalten</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-green-500">{(stats.total_deposit || 0).toFixed(2)} €</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3 sm:p-4">
                <p className="text-xs sm:text-sm text-muted-foreground">Pfand zurück</p>
                <p className="font-mono text-xl sm:text-2xl font-bold text-accent">-{(stats.total_deposit_return || 0).toFixed(2)} €</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hourly Breakdown */}
        {stats?.orders_by_hour && Object.keys(stats.orders_by_hour).length > 0 && (
          <Card className="bg-card border-border mb-6">
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="font-display uppercase flex items-center gap-2 text-sm sm:text-base">
                <Clock className="w-5 h-5 text-secondary" />
                Bestellungen pro Stunde
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Uhrzeit</TableHead>
                      <TableHead className="text-right">Anzahl</TableHead>
                      <TableHead className="text-right">Umsatz</TableHead>
                      <TableHead className="text-right">Ø pro Bestellung</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {Object.entries(stats.orders_by_hour).map(([hour, data]) => (
                      <TableRow key={hour}>
                        <TableCell className="font-mono">
                          {hour.toString().padStart(2, "0")}:00 - {hour.toString().padStart(2, "0")}:59
                        </TableCell>
                        <TableCell className="text-right font-mono text-secondary">
                          {data.count}
                        </TableCell>
                        <TableCell className="text-right font-mono text-primary">
                          {data.revenue.toFixed(2)} €
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {data.count > 0 ? (data.revenue / data.count).toFixed(2) : "0.00"} €
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="border-t-2 font-bold">
                      <TableCell>GESAMT</TableCell>
                      <TableCell className="text-right font-mono text-secondary">
                        {Object.values(stats.orders_by_hour).reduce((sum, d) => sum + d.count, 0)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-primary">
                        {Object.values(stats.orders_by_hour).reduce((sum, d) => sum + d.revenue, 0).toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {stats.total_orders > 0 ? (stats.total_revenue / stats.total_orders).toFixed(2) : "0.00"} €
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Orders Table */}
        <Card className="bg-card border-border">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="font-display uppercase text-sm sm:text-base">
              Bestellungen ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
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
                      <TableHead className="hidden md:table-cell">Artikel</TableHead>
                      <TableHead className="text-right">Gesamt</TableHead>
                      <TableHead className="hidden sm:table-cell">Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Erstellt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.slice(0, 100).map(order => (
                      <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                        <TableCell className="font-mono font-bold">
                          {order.order_number}
                        </TableCell>
                        <TableCell className="text-sm">{order.stand_name}</TableCell>
                        <TableCell className="max-w-xs truncate hidden md:table-cell text-sm">
                          {order.items.filter(i => !i.is_deposit_return).map(i => `${i.quantity}x ${i.article_name}`).join(", ")}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {order.total.toFixed(2)} €
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge 
                            variant={statusMap[order.status]?.color || "outline"}
                            className={order.status === "completed" ? "bg-green-600" : ""}
                          >
                            {statusMap[order.status]?.label || order.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm hidden sm:table-cell">
                          {format(new Date(order.created_at), "dd.MM. HH:mm")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {orders.length > 100 && (
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Zeige 100 von {orders.length} Bestellungen
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AppFooter />
    </div>
  );
}
