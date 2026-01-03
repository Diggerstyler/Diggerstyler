import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, Star, Link2, Unlink } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StationManagement() {
  const navigate = useNavigate();
  const [stands, setStands] = useState([]);
  const [selectedStand, setSelectedStand] = useState(null);
  const [stations, setStations] = useState([]);
  const [articles, setArticles] = useState([]);
  const [linkedArticles, setLinkedArticles] = useState([]);
  const [allArticles, setAllArticles] = useState([]);
  
  // Dialog states
  const [showAddStation, setShowAddStation] = useState(false);
  const [showAddLink, setShowAddLink] = useState(false);
  const [newStationName, setNewStationName] = useState("");
  const [newStationIsMain, setNewStationIsMain] = useState(false);
  
  // Link article dialog
  const [selectedMainArticle, setSelectedMainArticle] = useState("");
  const [selectedLinkedArticle, setSelectedLinkedArticle] = useState("");
  const [selectedStation, setSelectedStation] = useState("");
  
  // Auth
  const auth = { username: "admin", password: "admin" };
  const authHeader = { auth };

  useEffect(() => {
    fetchStands();
    fetchAllArticles();
  }, []);

  useEffect(() => {
    if (selectedStand) {
      fetchStations();
      fetchStandArticles();
      fetchLinkedArticles();
    }
  }, [selectedStand]);

  const fetchStands = async () => {
    try {
      const res = await axios.get(`${API}/stands`);
      setStands(res.data.filter(s => s.active));
    } catch (err) {
      toast.error("Fehler beim Laden der Stände");
    }
  };

  const fetchAllArticles = async () => {
    try {
      const res = await axios.get(`${API}/articles`);
      setAllArticles(res.data.filter(a => a.active));
    } catch (err) {
      toast.error("Fehler beim Laden der Artikel");
    }
  };

  const fetchStations = async () => {
    try {
      const res = await axios.get(`${API}/stands/${selectedStand.id}/stations`);
      setStations(res.data);
    } catch (err) {
      toast.error("Fehler beim Laden der Stationen");
    }
  };

  const fetchStandArticles = async () => {
    try {
      const res = await axios.get(`${API}/stands/${selectedStand.id}/articles`);
      setArticles(res.data);
    } catch (err) {
      toast.error("Fehler beim Laden der Stand-Artikel");
    }
  };

  const fetchLinkedArticles = async () => {
    try {
      const res = await axios.get(`${API}/stands/${selectedStand.id}/linked-articles`);
      setLinkedArticles(res.data);
    } catch (err) {
      toast.error("Fehler beim Laden der verknüpften Artikel");
    }
  };

  const createStation = async () => {
    if (!newStationName.trim()) {
      toast.error("Bitte Stationsname eingeben");
      return;
    }
    try {
      await axios.post(`${API}/stations`, {
        stand_id: selectedStand.id,
        name: newStationName,
        is_main: newStationIsMain
      }, authHeader);
      toast.success("Station erstellt");
      setNewStationName("");
      setNewStationIsMain(false);
      setShowAddStation(false);
      fetchStations();
    } catch (err) {
      toast.error("Fehler beim Erstellen");
    }
  };

  const toggleMainStation = async (station) => {
    try {
      await axios.put(`${API}/stations/${station.id}`, {
        is_main: !station.is_main
      }, authHeader);
      toast.success(station.is_main ? "Hauptstation entfernt" : "Als Hauptstation gesetzt");
      fetchStations();
    } catch (err) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const deleteStation = async (station) => {
    if (!window.confirm(`Station "${station.name}" löschen? Alle Verknüpfungen werden auch gelöscht.`)) return;
    try {
      await axios.delete(`${API}/stations/${station.id}`, authHeader);
      toast.success("Station gelöscht");
      fetchStations();
      fetchLinkedArticles();
    } catch (err) {
      toast.error("Fehler beim Löschen");
    }
  };

  const createLinkedArticle = async () => {
    if (!selectedMainArticle || !selectedLinkedArticle || !selectedStation) {
      toast.error("Bitte alle Felder ausfüllen");
      return;
    }
    try {
      await axios.post(`${API}/api/linked-articles`, {
        main_article_id: selectedMainArticle,
        linked_article_id: selectedLinkedArticle,
        station_id: selectedStation
      }, authHeader);
      toast.success("Verknüpfung erstellt");
      setSelectedMainArticle("");
      setSelectedLinkedArticle("");
      setSelectedStation("");
      setShowAddLink(false);
      fetchLinkedArticles();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Fehler beim Erstellen");
    }
  };

  const deleteLinkedArticle = async (linked) => {
    try {
      await axios.delete(`${API}/api/linked-articles/${linked.id}`, authHeader);
      toast.success("Verknüpfung gelöscht");
      fetchLinkedArticles();
    } catch (err) {
      toast.error("Fehler beim Löschen");
    }
  };

  // Get main article name for linked article
  const getMainArticleName = (mainArticleId) => {
    const article = allArticles.find(a => a.id === mainArticleId);
    return article?.name || "Unbekannt";
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-display text-xl uppercase">Stationen & Verknüpfungen</h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Stand Selection */}
        <Card className="bg-card/80 border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Stand auswählen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {stands.map(stand => (
                <Button
                  key={stand.id}
                  variant={selectedStand?.id === stand.id ? "default" : "outline"}
                  className="h-auto py-3"
                  onClick={() => setSelectedStand(stand)}
                >
                  {stand.name}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedStand && (
          <>
            {/* Stations */}
            <Card className="bg-card/80 border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Stationen für "{selectedStand.name}"</CardTitle>
                  <Dialog open={showAddStation} onOpenChange={setShowAddStation}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="w-4 h-4 mr-1" />
                        Station
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Neue Station</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Name</Label>
                          <Input
                            value={newStationName}
                            onChange={(e) => setNewStationName(e.target.value)}
                            placeholder="z.B. Küche, Salat, Grill..."
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={newStationIsMain}
                            onCheckedChange={setNewStationIsMain}
                          />
                          <Label>Hauptstation (für Hauptartikel ohne Verknüpfung)</Label>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddStation(false)}>Abbrechen</Button>
                        <Button onClick={createStation}>Erstellen</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {stations.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Keine Stationen angelegt. Stationen werden benötigt für verknüpfte Artikel.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {stations.map(station => (
                      <div
                        key={station.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{station.name}</span>
                          {station.is_main && (
                            <Badge variant="secondary" className="text-xs">
                              <Star className="w-3 h-3 mr-1" />
                              Hauptstation
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleMainStation(station)}
                            title={station.is_main ? "Hauptstation entfernen" : "Als Hauptstation setzen"}
                          >
                            <Star className={`w-4 h-4 ${station.is_main ? "fill-yellow-500 text-yellow-500" : ""}`} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteStation(station)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linked Articles */}
            <Card className="bg-card/80 border-border">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Verknüpfte Artikel</CardTitle>
                  <Dialog open={showAddLink} onOpenChange={setShowAddLink}>
                    <DialogTrigger asChild>
                      <Button size="sm" disabled={stations.length === 0}>
                        <Link2 className="w-4 h-4 mr-1" />
                        Verknüpfung
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border">
                      <DialogHeader>
                        <DialogTitle>Artikel verknüpfen</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div>
                          <Label>Hauptartikel (z.B. Bratwurst)</Label>
                          <Select value={selectedMainArticle} onValueChange={setSelectedMainArticle}>
                            <SelectTrigger>
                              <SelectValue placeholder="Hauptartikel wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {articles.map(article => (
                                <SelectItem key={article.id} value={article.id}>
                                  {article.name} ({article.price.toFixed(2)}€)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Verknüpfter Artikel (z.B. Beilagensalat)</Label>
                          <Select value={selectedLinkedArticle} onValueChange={setSelectedLinkedArticle}>
                            <SelectTrigger>
                              <SelectValue placeholder="Verknüpften Artikel wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {allArticles.map(article => (
                                <SelectItem key={article.id} value={article.id}>
                                  {article.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Station (wo der verknüpfte Artikel erscheint)</Label>
                          <Select value={selectedStation} onValueChange={setSelectedStation}>
                            <SelectTrigger>
                              <SelectValue placeholder="Station wählen..." />
                            </SelectTrigger>
                            <SelectContent>
                              {stations.map(station => (
                                <SelectItem key={station.id} value={station.id}>
                                  {station.name} {station.is_main ? "(Hauptstation)" : ""}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setShowAddLink(false)}>Abbrechen</Button>
                        <Button onClick={createLinkedArticle}>Verknüpfen</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {stations.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Erstelle zuerst Stationen, um Artikel verknüpfen zu können.
                  </p>
                ) : linkedArticles.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">
                    Keine Verknüpfungen vorhanden. Verknüpfe Hauptartikel mit Beilagen.
                  </p>
                ) : (
                  <ScrollArea className="h-[300px]">
                    <div className="space-y-2">
                      {linkedArticles.map(linked => (
                        <div
                          key={linked.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border"
                        >
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-sm font-medium">
                              {getMainArticleName(linked.main_article_id)}
                            </Badge>
                            <span className="text-muted-foreground">→</span>
                            <Badge variant="secondary" className="text-sm">
                              {linked.linked_article_name}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              @ {linked.station_name}
                            </span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteLinkedArticle(linked)}
                          >
                            <Unlink className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>

            {/* Info */}
            <Card className="bg-blue-500/10 border-blue-500/30">
              <CardContent className="pt-4">
                <h4 className="font-bold text-blue-400 mb-2">ℹ️ So funktioniert's:</h4>
                <ul className="text-sm text-muted-foreground space-y-1 list-disc ml-4">
                  <li><strong>Stationen:</strong> Verschiedene Arbeitsbereiche am Stand (z.B. Küche, Salat)</li>
                  <li><strong>Hauptstation:</strong> Bekommt Hauptartikel ohne Verknüpfung</li>
                  <li><strong>Verknüpfte Artikel:</strong> Beilagen, die automatisch mitbestellt werden</li>
                  <li>Beispiel: Bratwurst → Beilagensalat (Station "Salat")</li>
                  <li>Erst wenn alle Stationen "Fertig" klicken, geht der Bon zur Ausgabe</li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
