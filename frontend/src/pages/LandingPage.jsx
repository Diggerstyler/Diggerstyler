import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Hammer, Package, Settings, Zap, ArrowLeft, Store, UtensilsCrossed, Beer, Sparkles, HelpCircle, FastForward, Star, Maximize, Minimize } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fullscreen utility
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || 
    document.documentElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || 
    document.webkitExitFullscreen?.();
  }
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedStand, setSelectedStand] = useState(null);
  const [stands, setStands] = useState([]);
  const [showHelp, setShowHelp] = useState(false);
  const [isTogglingShortProcess, setIsTogglingShortProcess] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Station selection state
  const [showStationDialog, setShowStationDialog] = useState(false);
  const [stations, setStations] = useState([]);
  const [hasLinkedArticles, setHasLinkedArticles] = useState(false);
  
  // Track fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const fetchStands = async () => {
      try {
        const res = await axios.get(`${API}/stands`);
        setStands(res.data);
      } catch (error) {
        console.error("Error fetching stands:", error);
      }
    };
    fetchStands();
    
    // Seed initial data
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  // Toggle short_process directly from frontend
  const toggleShortProcess = async () => {
    if (!selectedStand) return;
    setIsTogglingShortProcess(true);
    try {
      const response = await axios.put(`${API}/stands/${selectedStand.id}/toggle-short-process`);
      const newValue = response.data.short_process;
      // Update local state
      setSelectedStand(prev => ({ ...prev, short_process: newValue }));
      // Update stands list
      setStands(prev => prev.map(s => 
        s.id === selectedStand.id ? { ...s, short_process: newValue } : s
      ));
    } catch (error) {
      console.error("Error toggling short process:", error);
    } finally {
      setIsTogglingShortProcess(false);
    }
  };

  const allRoles = [
    {
      id: "bestellung",
      name: "Bestellung",
      description: "Buchen & kassieren",
      icon: ShoppingCart,
      color: "primary",
      path: "bestellung"
    },
    {
      id: "macher",
      name: "Macher",
      description: "Fertig melden",
      icon: Hammer,
      color: "secondary",
      path: "kueche",
      hideOnShortProcess: true
    },
    {
      id: "ausgabe",
      name: "Ausgabe",
      description: "Übergeben",
      icon: Package,
      color: "accent",
      path: "ausgabe"
    },
    {
      id: "onemanshow",
      name: "OneMan",
      description: "Alles in einem",
      icon: Zap,
      color: "success",
      path: "onemanshow"
    }
  ];

  // Filter roles based on stand settings
  const roles = selectedStand?.short_process 
    ? allRoles.filter(r => !r.hideOnShortProcess)
    : allRoles;

  // Check if stand has linked articles (for station selection)
  const checkStandLinkedArticles = async (standId) => {
    try {
      const res = await axios.get(`${API}/stands/${standId}/has-linked-articles`);
      setHasLinkedArticles(res.data.has_linked_articles);
      setStations(res.data.stations || []);
      return res.data;
    } catch (error) {
      console.error("Error checking linked articles:", error);
      return { has_linked_articles: false, stations: [] };
    }
  };

  const handleRoleSelect = async (role) => {
    // If Macher role and stand has linked articles, show station selection
    if (role.id === "macher") {
      const data = await checkStandLinkedArticles(selectedStand.id);
      if (data.has_linked_articles && data.stations.length > 0) {
        setShowStationDialog(true);
        return;
      }
    }
    navigate(`/${role.path}/${selectedStand.id}/${selectedStand.stand_type}`);
  };

  const handleStationSelect = (stationId) => {
    setShowStationDialog(false);
    navigate(`/kueche/${selectedStand.id}/${selectedStand.stand_type}/${stationId}`);
  };

  const colorClasses = {
    primary: "border-primary/50 hover:border-primary hover:bg-primary/10 neon-primary",
    secondary: "border-secondary/50 hover:border-secondary hover:bg-secondary/10 neon-secondary",
    accent: "border-accent/50 hover:border-accent hover:bg-accent/10 neon-accent",
    success: "border-green-500/50 hover:border-green-500 hover:bg-green-500/10 neon-success"
  };

  const iconColorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent",
    success: "text-green-500"
  };

  const standTypeConfig = {
    speisestand: { 
      icon: UtensilsCrossed, 
      color: "orange",
      borderClass: "border-orange-500/50 hover:border-orange-500 hover:bg-orange-500/10",
      textClass: "text-orange-500",
      label: "Speisen"
    },
    getraenkestand: { 
      icon: Beer, 
      color: "blue",
      borderClass: "border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/10",
      textClass: "text-blue-500",
      label: "Getränke"
    },
    gemischt: { 
      icon: Sparkles, 
      color: "purple",
      borderClass: "border-purple-500/50 hover:border-purple-500 hover:bg-purple-500/10",
      textClass: "text-purple-500",
      label: "Gemischt"
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(9, 9, 11, 0.85), rgba(9, 9, 11, 0.95)), url('https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <header className="glass sticky top-0 z-50 px-3 sm:px-8 py-2 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 sm:gap-3">
          {selectedStand && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedStand(null)}
              data-testid="back-btn"
              className="h-8 w-8 sm:h-10 sm:w-10"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
          )}
          <h1 className="font-display text-base sm:text-2xl font-bold uppercase tracking-tight">
            Karnbachs<span className="text-primary">_Event</span>
          </h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowHelp(true)}
            data-testid="help-btn"
            className="h-8 px-2 sm:px-3"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/admin/login")}
            data-testid="admin-login-btn"
            className="h-8 px-2 sm:px-3"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-card border-border max-w-lg max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Anleitung
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-5 py-2">
              {/* Ablauf */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">📋 So funktioniert's</h3>
                <div className="bg-muted/30 rounded-lg p-3 text-sm space-y-2">
                  <p><strong>1.</strong> Stand auswählen (z.B. "Getränke" oder "Speisen")</p>
                  <p><strong>2.</strong> Rolle auswählen (je nach deiner Aufgabe)</p>
                  <p><strong>3.</strong> Loslegen!</p>
                </div>
              </section>

              {/* Rollen erklärt */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">👥 Die 4 Rollen</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="font-bold text-primary mb-1">🛒 Bestellung</p>
                    <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
                      <li>Nimmt Bestellungen der Gäste auf</li>
                      <li>Artikel antippen = zum Warenkorb hinzufügen</li>
                      <li>Pfand wird automatisch berechnet</li>
                      <li>"Bestellung aufgeben" → Bon geht zum Macher</li>
                      <li><strong>Restgeldrechner:</strong> Optional - berechnet Wechselgeld</li>
                      <li><strong>Archiv:</strong> Zeigt alle bisherigen Bestellungen</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                    <p className="font-bold text-secondary mb-1">🔨 Macher</p>
                    <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
                      <li>Sieht eingehende Bestellungen mit Bonnummer</li>
                      <li>Bereitet die Bestellung zu</li>
                      <li>"Fertig" klicken → Bon geht zur Ausgabe</li>
                      <li><strong>Gesamt Offen:</strong> Zeigt alle offenen Artikel kumuliert</li>
                      <li>Bei Stationen: Nur zugewiesene Artikel sichtbar</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
                    <p className="font-bold text-accent mb-1">📦 Ausgabe</p>
                    <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
                      <li>Sieht alle fertigen Bestellungen</li>
                      <li>Ruft Bonnummer aus und übergibt an Gast</li>
                      <li>"Übergeben" klicken → Bestellung abgeschlossen</li>
                    </ul>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg border border-green-500/20">
                    <p className="font-bold text-green-500 mb-1">⚡ OneMan</p>
                    <ul className="text-muted-foreground text-xs space-y-1 ml-4 list-disc">
                      <li>Alles in einem: Bestellen + Kassieren + Ausgeben</li>
                      <li>Für kleine Stände oder einfache Artikel</li>
                      <li>Bestellung wird sofort als "fertig" markiert</li>
                    </ul>
                  </div>
                </div>
              </section>

              {/* Bonnummern */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">🔢 Bonnummern</h3>
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                    <li>Nummern von <strong>01 bis 25</strong>, dann wieder bei 01</li>
                    <li>Nach Bestellung: Große Anzeige mit "Weiter" Button</li>
                    <li>Bonnummer dem Gast mitteilen</li>
                  </ul>
                </div>
              </section>

              {/* Kurzer Prozess */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">⚡ Kurzer Prozess</h3>
                <div className="bg-blue-500/10 rounded-lg p-3 text-sm border border-blue-500/20">
                  <p className="text-muted-foreground mb-2">
                    Für Stände mit schneller Ausgabe (z.B. Getränke):
                  </p>
                  <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                    <li><strong>AN:</strong> Bestellung → direkt zur Ausgabe (ohne Macher)</li>
                    <li><strong>AUS:</strong> Bestellung → Macher → Ausgabe</li>
                    <li>Toggle bei Rollenauswahl oder in Standverwaltung</li>
                  </ul>
                </div>
              </section>

              {/* Pfand */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">🍺 Pfand</h3>
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                    <li>Artikel mit Pfand zeigen "+X.XX€" Badge</li>
                    <li>Pfand wird automatisch zum Preis addiert</li>
                    <li><strong>Pfand zurück:</strong> Bei Glasrückgabe - wird abgezogen</li>
                    <li>Nur sichtbar wenn Stand Pfand-Artikel hat</li>
                  </ul>
                </div>
              </section>

              {/* Tipps */}
              <section>
                <h3 className="font-bold text-primary mb-2 text-base">💡 Tipps</h3>
                <div className="bg-green-500/10 rounded-lg p-3 text-sm border border-green-500/20">
                  <ul className="space-y-1 text-muted-foreground list-disc ml-4">
                    <li>Im Warenkorb: Wischen zum Entfernen</li>
                    <li>Mehrere Geräte können gleichzeitig arbeiten</li>
                    <li>App als PWA installierbar (Browser-Menü)</li>
                    <li>Bei Problemen: Seite neu laden</li>
                  </ul>
                </div>
              </section>
            </div>
          </ScrollArea>
          <Button onClick={() => setShowHelp(false)} className="mt-2">
            Verstanden
          </Button>
        </DialogContent>
      </Dialog>

      {/* Station Selection Dialog */}
      <Dialog open={showStationDialog} onOpenChange={setShowStationDialog}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <Hammer className="w-5 h-5 text-secondary" />
              Station wählen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <p className="text-sm text-muted-foreground">
              Dieser Stand hat verknüpfte Artikel. Wähle deine Station:
            </p>
            {stations.map(station => (
              <Button
                key={station.id}
                variant="outline"
                className={`w-full h-14 justify-start text-left ${station.is_main ? 'border-yellow-500/50' : ''}`}
                onClick={() => handleStationSelect(station.id)}
              >
                <div className="flex items-center gap-3">
                  {station.is_main && <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                  <span className="font-medium">{station.name}</span>
                  {station.is_main && <Badge variant="secondary" className="ml-auto text-xs">Hauptstation</Badge>}
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowStationDialog(false)}>Abbrechen</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
        {!selectedStand ? (
          // Step 1: Stand Selection
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight mb-2 sm:mb-4">
                Wähle Stand
              </h2>
              <p className="text-muted-foreground text-sm sm:text-lg">
                An welchem Stand arbeitest du?
              </p>
            </div>

            {stands.length === 0 ? (
              <div className="text-center py-12">
                <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">Keine Stände vorhanden.</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => navigate("/admin/login")}
                >
                  Im Admin anlegen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-6 w-full max-w-4xl px-2">
                {stands.map((stand) => {
                  const typeConfig = standTypeConfig[stand.stand_type] || standTypeConfig.gemischt;
                  const TypeIcon = typeConfig.icon;
                  return (
                    <Card
                      key={stand.id}
                      className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 active:scale-95 ${typeConfig.borderClass}`}
                      onClick={() => setSelectedStand(stand)}
                      data-testid={`stand-card-${stand.id}`}
                    >
                      <CardContent className="p-3 sm:p-6 flex flex-col items-center text-center">
                        <div className={`w-12 sm:w-16 h-12 sm:h-16 rounded-lg flex items-center justify-center mb-2 sm:mb-4 bg-muted ${typeConfig.textClass}`}>
                          <TypeIcon className="w-6 sm:w-8 h-6 sm:h-8" />
                        </div>
                        <h3 className="font-display text-sm sm:text-xl font-bold mb-1 sm:mb-2 truncate w-full">
                          {stand.name}
                        </h3>
                        <Badge variant="outline" className={`${typeConfig.textClass} border-current text-xs`}>
                          {typeConfig.label}
                        </Badge>
                        {stand.short_process && (
                          <span className="text-[10px] sm:text-xs text-blue-500 mt-1 flex items-center gap-1">
                            <FastForward className="w-3 h-3" /> Kurz
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          // Step 2: Role Selection
          <>
            <div className="text-center mb-4 sm:mb-8 px-2">
              <div className="inline-flex flex-wrap items-center justify-center gap-1 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-3 bg-card/50 border border-border">
                <Store className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
                <span className="font-display uppercase font-bold text-primary text-sm sm:text-base">
                  {selectedStand.name}
                </span>
              </div>
              
              {/* Kurzer Prozess Toggle */}
              <div className="flex items-center justify-center gap-3 mb-4 p-3 bg-card/50 rounded-lg border border-border max-w-xs mx-auto">
                <div className="flex items-center gap-2">
                  <FastForward className={`w-4 h-4 ${selectedStand.short_process ? 'text-blue-500' : 'text-muted-foreground'}`} />
                  <Label htmlFor="short-toggle" className="text-sm">Kurzer Prozess</Label>
                </div>
                <Switch
                  id="short-toggle"
                  checked={selectedStand.short_process || false}
                  onCheckedChange={toggleShortProcess}
                  disabled={isTogglingShortProcess}
                />
              </div>
              
              <h2 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight mb-2 sm:mb-3">
                Wähle Rolle
              </h2>
              {selectedStand.short_process && (
                <p className="text-xs text-blue-500">
                  Macher-Rolle deaktiviert (Kurzer Prozess)
                </p>
              )}
            </div>

            <div className={`grid gap-2 sm:gap-4 w-full max-w-md sm:max-w-2xl px-2 ${roles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.id}
                    className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all active:scale-95 ${colorClasses[role.color]}`}
                    onClick={() => handleRoleSelect(role)}
                    data-testid={`role-card-${role.id}`}
                  >
                    <CardContent className="p-3 sm:p-5 flex flex-col items-center text-center">
                      <div className={`w-10 sm:w-14 h-10 sm:h-14 rounded-lg flex items-center justify-center mb-2 sm:mb-3 bg-muted ${iconColorClasses[role.color]}`}>
                        <Icon className="w-5 sm:w-7 h-5 sm:h-7" />
                      </div>
                      <h3 className="font-display text-xs sm:text-lg font-bold uppercase">
                        {role.name}
                      </h3>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 hidden sm:block">
                        {role.description}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </main>

      <footer className="glass px-4 py-2 text-center text-[10px] sm:text-xs text-muted-foreground">
        Karnbachs Event OS
      </footer>
    </div>
  );
}
