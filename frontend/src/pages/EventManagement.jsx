import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ArrowLeft, Calendar, Plus, Edit, Trash2, BarChart3, 
  CalendarDays, Clock, CheckCircle, AlertCircle, PlayCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";
import { useAdminSwipe, SwipeIndicator } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function EventManagement() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: ""
  });

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchEvents();
  }, [auth, navigate]);

  const fetchEvents = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/events`);
      setEvents(response.data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Fehler beim Laden der Events");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    try {
      await axios.post(`${API}/events`, formData, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Event erstellt");
      setShowCreateDialog(false);
      setFormData({ name: "", description: "", start_date: "", end_date: "" });
      fetchEvents();
    } catch (error) {
      toast.error("Fehler beim Erstellen");
    }
  };

  const handleEdit = async () => {
    if (!formData.name || !formData.start_date || !formData.end_date) {
      toast.error("Bitte alle Pflichtfelder ausfüllen");
      return;
    }

    try {
      await axios.put(`${API}/events/${selectedEvent.id}`, formData, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Event aktualisiert");
      setShowEditDialog(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const handleDelete = async () => {
    try {
      await axios.delete(`${API}/events/${selectedEvent.id}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Event gelöscht");
      setShowDeleteDialog(false);
      setSelectedEvent(null);
      fetchEvents();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const openEditDialog = (event) => {
    setSelectedEvent(event);
    setFormData({
      name: event.name,
      description: event.description || "",
      start_date: event.start_date.split("T")[0],
      end_date: event.end_date.split("T")[0]
    });
    setShowEditDialog(true);
  };

  const openDeleteDialog = (event) => {
    setSelectedEvent(event);
    setShowDeleteDialog(true);
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

  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), "dd.MM.yyyy", { locale: de });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin")}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Calendar className="w-6 h-6 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Event-Verwaltung
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <LiveClock className="hidden md:flex" />
          <Button 
            onClick={() => {
              setFormData({ name: "", description: "", start_date: "", end_date: "" });
              setShowCreateDialog(true);
            }}
            className="neon-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neues Event
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : events.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="p-8 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-bold mb-2">Keine Events vorhanden</h3>
              <p className="text-muted-foreground mb-4">
                Erstellen Sie Ihr erstes Event, um Bestellungen und Statistiken zu organisieren.
              </p>
              <Button onClick={() => setShowCreateDialog(true)} className="neon-primary">
                <Plus className="w-4 h-4 mr-2" />
                Event erstellen
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Aktive Events hervorheben */}
            {events.filter(e => e.status === "active").length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <PlayCircle className="w-4 h-4 text-green-500" />
                  Aktive Events
                </h2>
                <div className="grid gap-4">
                  {events.filter(e => e.status === "active").map(event => (
                    <Card key={event.id} className="bg-card border-green-500/50 border-2">
                      <CardContent className="p-4 sm:p-6">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold">{event.name}</h3>
                              {getStatusBadge(event.status)}
                            </div>
                            {event.description && (
                              <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-4 h-4" />
                                {formatDate(event.start_date)} - {formatDate(event.end_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => navigate(`/admin/events/${event.id}/stats`)}
                              className="neon-primary"
                            >
                              <BarChart3 className="w-4 h-4 mr-2" />
                              Statistiken
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => openDeleteDialog(event)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Geplante Events */}
            {events.filter(e => e.status === "planned").length > 0 && (
              <div className="mb-6">
                <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Geplante Events
                </h2>
                <div className="grid gap-3">
                  {events.filter(e => e.status === "planned").map(event => (
                    <Card key={event.id} className="bg-card border-border hover:border-blue-500/50 transition-colors">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold">{event.name}</h3>
                              {getStatusBadge(event.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {formatDate(event.start_date)} - {formatDate(event.end_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/events/${event.id}/stats`)}
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Stats
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteDialog(event)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Abgeschlossene Events */}
            {events.filter(e => e.status === "completed").length > 0 && (
              <div>
                <h2 className="font-display text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Abgeschlossene Events
                </h2>
                <div className="grid gap-3">
                  {events.filter(e => e.status === "completed").map(event => (
                    <Card key={event.id} className="bg-card border-border opacity-75 hover:opacity-100 transition-opacity">
                      <CardContent className="p-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="font-bold">{event.name}</h3>
                              {getStatusBadge(event.status)}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <CalendarDays className="w-3 h-3" />
                                {formatDate(event.start_date)} - {formatDate(event.end_date)}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/admin/events/${event.id}/stats`)}
                            >
                              <BarChart3 className="w-4 h-4 mr-1" />
                              Auswertung
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(event)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => openDeleteDialog(event)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Neues Event erstellen
            </DialogTitle>
            <DialogDescription>
              Definieren Sie ein neues Event mit Start- und Enddatum.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="z.B. Sommerfest 2025"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Beschreibung</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optionale Beschreibung des Events..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Startdatum *</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Enddatum *</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleCreate} className="neon-primary">
              Erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <Edit className="w-5 h-5 text-primary" />
              Event bearbeiten
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-start_date">Startdatum *</Label>
                <Input
                  id="edit-start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-end_date">Enddatum *</Label>
                <Input
                  id="edit-end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleEdit} className="neon-primary">
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Event löschen?
            </DialogTitle>
            <DialogDescription>
              Möchten Sie das Event &quot;{selectedEvent?.name}&quot; wirklich löschen? 
              Die zugehörigen Bestellungen bleiben erhalten, verlieren aber ihre Event-Zuordnung.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
