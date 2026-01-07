import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, FileText, Trash2, Clock, Search, ChevronLeft, ChevronRight, AlertTriangle, Calendar } from "lucide-react";
import AppFooter from "@/components/AppFooter";
import { useAdminSwipe, SwipeIndicator } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function OrdersManagement() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [stands, setStands] = useState([]);
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStand, setSelectedStand] = useState("all");
  const [selectedEvent, setSelectedEvent] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 20;

  // Check admin auth
  const adminAuth = sessionStorage.getItem("adminAuth");
  
  useEffect(() => {
    if (!adminAuth) {
      navigate("/admin/login");
    }
  }, [adminAuth, navigate]);

  const auth = {
    username: 'admin',
    password: 'admin'
  };

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

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        limit: pageSize.toString(),
        offset: (currentPage * pageSize).toString()
      });
      
      if (selectedStand !== "all") {
        params.append("stand_id", selectedStand);
      }
      if (selectedEvent !== "all") {
        params.append("event_id", selectedEvent);
      }
      
      const response = await axios.get(`${API}/admin/orders?${params}`, { auth });
      setOrders(response.data.orders);
      setTotalOrders(response.data.total);
    } catch (error) {
      toast.error("Fehler beim Laden der Bestellungen");
      console.error("Error fetching orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStands();
    fetchEvents();
  }, []);

  useEffect(() => {
    if (adminAuth) {
      fetchOrders();
    }
  }, [currentPage, selectedStand, selectedEvent, adminAuth]);

  const handleStandChange = (value) => {
    setSelectedStand(value);
    setCurrentPage(0); // Reset to first page
  };

  const handleEventChange = (value) => {
    setSelectedEvent(value);
    setCurrentPage(0); // Reset to first page
  };

  const deleteOrder = async () => {
    if (!orderToDelete) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`${API}/admin/orders/${orderToDelete.id}`, { auth });
      toast.success(`Bestellung #${orderToDelete.order_number} gelöscht`);
      setOrderToDelete(null);
      fetchOrders();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatTime = (isoString) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '-';
    }
  };

  const formatOrderNumber = (num) => {
    if (num === null || num === undefined) return '--';
    return num.toString().padStart(2, '0');
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      completed: { label: 'Abgeschlossen', class: 'border-green-500 text-green-500' },
      ready: { label: 'Fertig', class: 'border-blue-500 text-blue-500' },
      in_progress: { label: 'In Arbeit', class: 'border-yellow-500 text-yellow-500' },
      created: { label: 'Neu', class: 'border-muted-foreground text-muted-foreground' }
    };
    
    const config = statusConfig[status] || { label: status, class: 'border-muted-foreground' };
    return (
      <Badge variant="outline" className={`text-xs ${config.class}`}>
        {config.label}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalOrders / pageSize);

  const { swipeHandlers, currentIndex, totalPages: swipeTotalPages, prevLabel, nextLabel } = useAdminSwipe();

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex items-center gap-3">
          <FileText className="w-6 h-6 text-accent" />
          <div>
            <h1 className="font-display text-xl font-bold uppercase tracking-tight">
              Alle Rechnungen
            </h1>
            <p className="text-sm text-muted-foreground">{totalOrders} Bestellungen</p>
          </div>
        </div>
      </header>

      <SwipeIndicator currentIndex={currentIndex} totalPages={swipeTotalPages} prevLabel={prevLabel} nextLabel={nextLabel} />

      <main className="p-4 sm:p-6 flex-1">
        {/* Filters */}
        <Card className="bg-card border-border mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Filter:</span>
              </div>
              <Select value={selectedEvent} onValueChange={handleEventChange}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder="Alle Events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Events</SelectItem>
                  <SelectItem value="none">Ohne Event</SelectItem>
                  {events.map(event => (
                    <SelectItem key={event.id} value={event.id}>
                      <span className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {event.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedStand} onValueChange={handleStandChange}>
                <SelectTrigger className="w-full sm:w-[200px] bg-background">
                  <SelectValue placeholder="Alle Stände" />
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
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-lg">Bestellungen</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Bestellungen gefunden
              </div>
            ) : (
              <div className="space-y-3">
                {orders.map(order => (
                  <div 
                    key={order.id}
                    className="flex items-center gap-4 p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedOrder(order)}
                  >
                    {/* Order Number */}
                    <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="font-mono text-xl font-bold text-primary">
                        {formatOrderNumber(order.order_number)}
                      </span>
                    </div>
                    
                    {/* Order Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{order.stand_name}</span>
                        {getStatusBadge(order.status)}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(order.created_at)}
                        <span className="text-muted-foreground/50">•</span>
                        <span>{order.items?.filter(i => !i.is_deposit_return).length || 0} Artikel</span>
                      </div>
                    </div>
                    
                    {/* Total */}
                    <div className="text-right shrink-0">
                      <p className="font-mono text-lg font-bold text-primary">
                        {order.total?.toFixed(2)} €
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:bg-destructive/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOrderToDelete(order);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Zurück
                </Button>
                <span className="text-sm text-muted-foreground">
                  Seite {currentPage + 1} von {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage >= totalPages - 1}
                >
                  Weiter
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Order Detail Dialog */}
      <Dialog open={selectedOrder !== null} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="font-mono text-2xl font-bold text-primary">
                  {formatOrderNumber(selectedOrder?.order_number)}
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{selectedOrder?.stand_name}</p>
                <p className="font-mono text-xl font-bold">{selectedOrder?.total?.toFixed(2)} €</p>
              </div>
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[40vh]">
            <div className="space-y-3 py-2">
              {selectedOrder?.items?.filter(i => !i.is_deposit_return).map((item, idx) => (
                <div key={idx} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{item.quantity}x</Badge>
                    <span className={item.is_linked_article ? 'text-sm text-muted-foreground' : ''}>
                      {item.article_name}
                    </span>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    {(item.price * item.quantity).toFixed(2)} €
                  </span>
                </div>
              ))}
              
              {selectedOrder?.items?.filter(i => i.is_deposit_return).length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground pt-2 font-medium">Pfand zurück:</p>
                  {selectedOrder?.items?.filter(i => i.is_deposit_return).map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between py-1 text-green-500">
                      <span className="text-sm">{item.quantity}x {item.article_name}</span>
                      <span className="font-mono text-sm">-{Math.abs(item.price * item.quantity).toFixed(2)} €</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          </ScrollArea>
          
          <div className="flex flex-col gap-2 pt-2 border-t border-border text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status:</span>
              {selectedOrder && getStatusBadge(selectedOrder.status)}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Erstellt:</span>
              <span>{selectedOrder?.created_at && formatTime(selectedOrder.created_at)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Erstellt von:</span>
              <span>{selectedOrder?.created_by || '-'}</span>
            </div>
            {selectedOrder?.deposit_total > 0 && (
              <div className="flex justify-between text-green-500">
                <span>Pfand:</span>
                <span className="font-mono">+{selectedOrder.deposit_total.toFixed(2)} €</span>
              </div>
            )}
          </div>
          
          <DialogFooter className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => {
                setSelectedOrder(null);
                setOrderToDelete(selectedOrder);
              }}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Löschen
            </Button>
            <Button variant="outline" onClick={() => setSelectedOrder(null)}>
              Schließen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={orderToDelete !== null} onOpenChange={() => setOrderToDelete(null)}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Bestellung löschen?
            </DialogTitle>
            <DialogDescription>
              Möchten Sie Bestellung #{formatOrderNumber(orderToDelete?.order_number)} wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOrderToDelete(null)} disabled={isDeleting}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={deleteOrder} disabled={isDeleting}>
              {isDeleting ? "Löschen..." : "Löschen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
