import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShoppingCart, Hammer, Package, Settings, Zap, ArrowLeft, Store, UtensilsCrossed, Beer, Sparkles, HelpCircle, FastForward } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedStand, setSelectedStand] = useState(null);
  const [stands, setStands] = useState([]);
  const [showHelp, setShowHelp] = useState(false);

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

  const allRoles = [
    {
      id: "bestellung",
      name: "Bestellung",
      description: "Artikel buchen & abrechnen",
      icon: ShoppingCart,
      color: "primary",
      path: "bestellung"
    },
    {
      id: "macher",
      name: "Macher",
      description: "Bestellungen fertigstellen",
      icon: Hammer,
      color: "secondary",
      path: "kueche",
      hideOnShortProcess: true  // Hide this role when stand has short_process enabled
    },
    {
      id: "ausgabe",
      name: "Ausgabe",
      description: "Bestellungen übergeben",
      icon: Package,
      color: "accent",
      path: "ausgabe"
    },
    {
      id: "onemanshow",
      name: "OneManShow",
      description: "Direkt buchen & fertig",
      icon: Zap,
      color: "success",
      path: "onemanshow"
    }
  ];

  // Filter roles based on stand settings
  const roles = selectedStand?.short_process 
    ? allRoles.filter(r => !r.hideOnShortProcess)  // Hide Macher when short_process is enabled
    : allRoles;

  const handleRoleSelect = (role) => {
    navigate(`/${role.path}/${selectedStand.id}/${selectedStand.stand_type}`);
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
      <header className="glass sticky top-0 z-50 px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          {selectedStand && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedStand(null)}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight">
            Festival<span className="text-primary">_OS</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowHelp(true)}
            data-testid="help-btn"
            className="border-muted-foreground/30"
          >
            <HelpCircle className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Anleitung</span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate("/admin/login")}
            data-testid="admin-login-btn"
            className="border-muted-foreground/30"
          >
            <Settings className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Admin</span>
          </Button>
        </div>
      </header>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Anleitung - Festival OS
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 py-4">
              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">🎯 Übersicht</h3>
                <p className="text-sm text-muted-foreground">
                  Festival OS ist ein Bestellsystem für Festival-Stände. Es gibt 4 Rollen für verschiedene Aufgaben.
                </p>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">📋 Schritt 1: Stand wählen</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Wähle zuerst den Stand aus, an dem du arbeitest. Jeder Stand kann Speisen, Getränke oder beides verkaufen.
                </p>
                <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                  <li><span className="text-orange-500">🍴 Speisestand</span> - Nur Speisen</li>
                  <li><span className="text-blue-500">🍺 Getränkestand</span> - Nur Getränke</li>
                  <li><span className="text-purple-500">✨ Gemischt</span> - Beides</li>
                </ul>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">👥 Schritt 2: Rolle wählen</h3>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <p className="font-bold text-primary">🛒 Bestellung</p>
                    <p className="text-muted-foreground">Nimmt Bestellungen an, fügt Artikel hinzu, kassiert den Gast. Hat Zugriff auf das Archiv für Rückfragen.</p>
                  </div>
                  <div className="p-3 bg-secondary/10 rounded-lg">
                    <p className="font-bold text-secondary">🔨 Macher</p>
                    <p className="text-muted-foreground">Sieht eingehende Bestellungen und klickt "Fertig" wenn die Bestellung bereit ist.</p>
                  </div>
                  <div className="p-3 bg-accent/10 rounded-lg">
                    <p className="font-bold text-accent">📦 Ausgabe</p>
                    <p className="text-muted-foreground">Gibt fertige Bestellungen an Gäste aus und klickt "Übergeben" zur Bestätigung.</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-lg">
                    <p className="font-bold text-green-500">⚡ OneManShow</p>
                    <p className="text-muted-foreground">Für kleine Stände: Eine Person macht alles - Bestellung, Zubereitung und Ausgabe in einem Schritt.</p>
                  </div>
                </div>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">🔢 Bonnummern</h3>
                <p className="text-sm text-muted-foreground">
                  Jede Bestellung erhält eine Nummer von 01-25. Nach 25 beginnt die Nummerierung wieder bei 01. 
                  Die große Nummer wird 5 Sekunden eingeblendet - tippen zum Schließen.
                </p>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">💰 Pfand</h3>
                <p className="text-sm text-muted-foreground">
                  Artikel mit Pfand zeigen den Betrag an (+2.00€). Über "Pfand zurück" kann Pfand erstattet werden.
                </p>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">📁 Archiv</h3>
                <p className="text-sm text-muted-foreground">
                  In der Bestellung und OneManShow gibt es ein Archiv mit allen vergangenen Bestellungen - für Rückfragen mit Gästen.
                </p>
              </section>

              <section>
                <h3 className="font-display text-lg font-bold text-primary mb-2">🗑️ Artikel entfernen</h3>
                <p className="text-sm text-muted-foreground">
                  Im Warenkorb: Artikel nach rechts wischen um 1 Stück zu entfernen.
                </p>
              </section>
            </div>
          </ScrollArea>
          <div className="pt-4 border-t border-border flex justify-end">
            <Button onClick={() => setShowHelp(false)}>
              Verstanden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
        {!selectedStand ? (
          // Step 1: Stand Selection
          <>
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-3 sm:mb-4">
                Wähle deinen Stand
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                An welchem Stand arbeitest du heute?
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
                  Im Admin-Bereich anlegen
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 sm:gap-6 w-full max-w-5xl">
                {stands.map((stand) => {
                  const typeConfig = standTypeConfig[stand.stand_type] || standTypeConfig.gemischt;
                  const TypeIcon = typeConfig.icon;
                  return (
                    <Card
                      key={stand.id}
                      className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${typeConfig.borderClass}`}
                      onClick={() => setSelectedStand(stand)}
                      data-testid={`stand-card-${stand.id}`}
                    >
                      <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                        <div className={`w-14 sm:w-20 h-14 sm:h-20 rounded-lg flex items-center justify-center mb-3 sm:mb-4 bg-muted ${typeConfig.textClass}`}>
                          <TypeIcon className="w-7 sm:w-10 h-7 sm:h-10" />
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-bold mb-2">
                          {stand.name}
                        </h3>
                        <Badge variant="outline" className={`${typeConfig.textClass} border-current`}>
                          {typeConfig.label}
                        </Badge>
                        {stand.short_process && (
                          <span className="text-xs text-blue-500 mt-2 flex items-center gap-1">
                            <FastForward className="w-3 h-3" /> Kurzer Prozess
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
            <div className="text-center mb-8 sm:mb-12">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 bg-card/50 border border-border">
                <Store className="w-5 h-5 text-primary" />
                <span className="font-display uppercase font-bold text-primary">
                  {selectedStand.name}
                </span>
                <Badge variant="outline" className="text-xs ml-2">
                  {standTypeConfig[selectedStand.stand_type]?.label || "Gemischt"}
                </Badge>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-3 sm:mb-4">
                Wähle deine Rolle
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                Was machst du heute?
              </p>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full max-w-6xl">
              {roles.map((role) => {
                const Icon = role.icon;
                return (
                  <Card
                    key={role.id}
                    className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${colorClasses[role.color]}`}
                    onClick={() => handleRoleSelect(role)}
                    data-testid={`role-card-${role.id}`}
                  >
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                      <div className={`w-14 sm:w-20 h-14 sm:h-20 rounded-sm flex items-center justify-center mb-3 sm:mb-4 bg-muted ${iconColorClasses[role.color]}`}>
                        <Icon className="w-7 sm:w-10 h-7 sm:h-10" />
                      </div>
                      <h3 className="font-display text-lg sm:text-2xl font-bold uppercase mb-1 sm:mb-2">
                        {role.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
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

      <footer className="glass px-4 sm:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground">
        Festival Order Management System
      </footer>
    </div>
  );
}
