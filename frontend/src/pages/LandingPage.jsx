import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChefHat, Package, Settings, Zap, UtensilsCrossed, Beer, Layers, AlertCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [stands, setStands] = useState([]);
  const [selectedStand, setSelectedStand] = useState("");
  const [selectedStandInfo, setSelectedStandInfo] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const standsRes = await axios.get(`${API}/stands`);
        setStands(standsRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    
    // Seed initial data
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStand) {
      const stand = stands.find(s => s.id === selectedStand);
      setSelectedStandInfo(stand);
    } else {
      setSelectedStandInfo(null);
    }
  }, [selectedStand, stands]);

  const roles = [
    {
      id: "bestellung",
      name: "Bestellung",
      description: "Artikel buchen & mit Gast verrechnen",
      icon: ShoppingCart,
      color: "primary",
      path: "bestellung"
    },
    {
      id: "kueche",
      name: "Küche",
      description: "Bestellungen abarbeiten & fertig melden",
      icon: ChefHat,
      color: "secondary",
      path: "kueche"
    },
    {
      id: "ausgabe",
      name: "Ausgabe",
      description: "Fertige Bestellungen dem Gast übergeben",
      icon: Package,
      color: "accent",
      path: "ausgabe"
    },
    {
      id: "onemanshow",
      name: "OneManShow",
      description: "Alles in einer Rolle: Tippen, Abrechnen, Ausgeben",
      icon: Zap,
      color: "success",
      path: "onemanshow"
    }
  ];

  const handleRoleSelect = (role) => {
    if (!selectedStand) return;
    const stand = stands.find(s => s.id === selectedStand);
    const standType = stand?.stand_type || "gemischt";
    navigate(`/${role.path}/${selectedStand}/${standType}`);
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

  const standTypeIcons = {
    speisestand: UtensilsCrossed,
    getraenkestand: Beer,
    gemischt: Layers
  };

  const standTypeNames = {
    speisestand: "Speisestand",
    getraenkestand: "Getränkestand",
    gemischt: "Gemischter Stand"
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
        <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight">
          Festival<span className="text-primary">_OS</span>
        </h1>
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
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-8 py-8 sm:py-16">
        <div className="text-center mb-8 sm:mb-12">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-3 sm:mb-4">
            Willkommen
          </h2>
          <p className="text-muted-foreground text-base sm:text-lg">
            Wähle deinen Stand und deine Rolle
          </p>
        </div>

        {/* Stand Selection */}
        <div className="w-full max-w-md mb-6 sm:mb-8">
          <label className="text-sm text-muted-foreground mb-2 block">Stand auswählen</label>
          <Select value={selectedStand} onValueChange={setSelectedStand}>
            <SelectTrigger 
              className="h-12 sm:h-14 text-base sm:text-lg bg-card border-border"
              data-testid="stand-select"
            >
              <SelectValue placeholder="Stand auswählen..." />
            </SelectTrigger>
            <SelectContent>
              {stands.length === 0 ? (
                <SelectItem value="none" disabled>
                  Keine Stände vorhanden
                </SelectItem>
              ) : (
                stands.map((stand) => {
                  const TypeIcon = standTypeIcons[stand.stand_type] || Layers;
                  return (
                    <SelectItem 
                      key={stand.id} 
                      value={stand.id}
                      data-testid={`stand-option-${stand.id}`}
                    >
                      <span className="flex items-center gap-2">
                        <TypeIcon className="w-4 h-4" />
                        {stand.name}
                        <span className="text-muted-foreground text-xs">
                          ({standTypeNames[stand.stand_type] || "Gemischt"})
                        </span>
                      </span>
                    </SelectItem>
                  );
                })
              )}
            </SelectContent>
          </Select>
        </div>

        {/* Selected Stand Info */}
        {selectedStandInfo && (
          <div className="mb-6 sm:mb-8 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground font-medium">{selectedStandInfo.name}</span>
              {" • "}
              <span className="text-foreground">{standTypeNames[selectedStandInfo.stand_type] || "Gemischt"}</span>
              {selectedStandInfo.skip_preparation && (
                <span className="text-accent ml-2">(Schnellmodus)</span>
              )}
            </p>
          </div>
        )}

        {/* No Stands Warning */}
        {stands.length === 0 && (
          <div className="mb-8 p-4 rounded-sm bg-destructive/10 border border-destructive/30 max-w-md text-center">
            <AlertCircle className="w-6 h-6 text-destructive mx-auto mb-2" />
            <p className="text-sm text-destructive">
              Keine Stände konfiguriert. Bitte im Admin-Bereich Stände anlegen.
            </p>
          </div>
        )}

        {/* Role Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 w-full max-w-6xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${colorClasses[role.color]} ${!selectedStand ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleRoleSelect(role)}
                data-testid={`role-card-${role.id}`}
              >
                <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                  <div className={`w-12 sm:w-16 h-12 sm:h-16 rounded-sm flex items-center justify-center mb-3 sm:mb-4 bg-muted ${iconColorClasses[role.color]}`}>
                    <Icon className="w-6 sm:w-8 h-6 sm:h-8" />
                  </div>
                  <h3 className="font-display text-base sm:text-xl font-bold uppercase mb-1 sm:mb-2">
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
      </main>

      <footer className="glass px-4 sm:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground">
        Festival Order Management System
      </footer>
    </div>
  );
}
