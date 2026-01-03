import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChefHat, Package, Settings, Zap, UtensilsCrossed, Beer, Layers } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [stands, setStands] = useState([]);
  const [standTypes, setStandTypes] = useState([]);
  const [selectedStand, setSelectedStand] = useState("");
  const [selectedStandType, setSelectedStandType] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [standsRes, typesRes] = await Promise.all([
          axios.get(`${API}/stands`),
          axios.get(`${API}/stand-types`)
        ]);
        setStands(standsRes.data);
        setStandTypes(typesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
    
    // Seed initial data
    axios.post(`${API}/seed`).catch(() => {});
  }, []);

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
    if (!selectedStand || !selectedStandType) return;
    navigate(`/${role.path}/${selectedStand}/${selectedStandType}`);
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

  const isSelectionComplete = selectedStand && selectedStandType;

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(9, 9, 11, 0.85), rgba(9, 9, 11, 0.95)), url('https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <header className="glass sticky top-0 z-50 px-8 py-4 flex justify-between items-center">
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight">
          Festival<span className="text-primary">_OS</span>
        </h1>
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate("/admin/login")}
          data-testid="admin-login-btn"
          className="border-muted-foreground/30"
        >
          <Settings className="w-4 h-4 mr-2" />
          Admin
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="font-display text-4xl sm:text-5xl font-black uppercase tracking-tight mb-4">
            Willkommen
          </h2>
          <p className="text-muted-foreground text-lg">
            Wähle deinen Stand, Standtyp und deine Rolle
          </p>
        </div>

        {/* Selection Row */}
        <div className="w-full max-w-3xl mb-12 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Stand</label>
            <Select value={selectedStand} onValueChange={setSelectedStand}>
              <SelectTrigger 
                className="h-14 text-lg bg-card border-border"
                data-testid="stand-select"
              >
                <SelectValue placeholder="Stand auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {stands.map((stand) => (
                  <SelectItem 
                    key={stand.id} 
                    value={stand.id}
                    data-testid={`stand-option-${stand.id}`}
                  >
                    {stand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-muted-foreground">Standtyp</label>
            <Select value={selectedStandType} onValueChange={setSelectedStandType}>
              <SelectTrigger 
                className="h-14 text-lg bg-card border-border"
                data-testid="stand-type-select"
              >
                <SelectValue placeholder="Standtyp auswählen..." />
              </SelectTrigger>
              <SelectContent>
                {standTypes.map((type) => {
                  const Icon = standTypeIcons[type.id];
                  return (
                    <SelectItem 
                      key={type.id} 
                      value={type.id}
                      data-testid={`stand-type-option-${type.id}`}
                    >
                      <span className="flex items-center gap-2">
                        {Icon && <Icon className="w-4 h-4" />}
                        {type.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Selected Info */}
        {isSelectionComplete && (
          <div className="mb-8 text-center">
            <p className="text-sm text-muted-foreground">
              Gewählt: <span className="text-foreground font-medium">
                {stands.find(s => s.id === selectedStand)?.name}
              </span> • <span className="text-foreground font-medium">
                {standTypes.find(t => t.id === selectedStandType)?.name}
              </span>
            </p>
          </div>
        )}

        {/* Role Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-6xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${colorClasses[role.color]} ${!isSelectionComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleRoleSelect(role)}
                data-testid={`role-card-${role.id}`}
              >
                <CardContent className="p-6 flex flex-col items-center text-center">
                  <div className={`w-16 h-16 rounded-sm flex items-center justify-center mb-4 bg-muted ${iconColorClasses[role.color]}`}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase mb-2">
                    {role.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {role.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>

      <footer className="glass px-8 py-4 text-center text-sm text-muted-foreground">
        Festival Order Management System
      </footer>
    </div>
  );
}
