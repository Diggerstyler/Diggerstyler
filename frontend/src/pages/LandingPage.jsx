import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChefHat, Package, Settings, Zap, ArrowLeft } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [stands, setStands] = useState([]);

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

  const roles = [
    {
      id: "bestellung",
      name: "Bestellung",
      description: "Artikel buchen & abrechnen",
      icon: ShoppingCart,
      color: "primary",
      path: "bestellung"
    },
    {
      id: "kueche",
      name: "Küche",
      description: "Bestellungen zubereiten",
      icon: ChefHat,
      color: "secondary",
      path: "kueche"
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

  const handleStandSelect = (stand) => {
    navigate(`/${selectedRole.path}/${stand.id}/${stand.stand_type}`);
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

  const standTypeColors = {
    speisestand: "border-orange-500/50 text-orange-500",
    getraenkestand: "border-blue-500/50 text-blue-500",
    gemischt: "border-purple-500/50 text-purple-500"
  };

  const standTypeNames = {
    speisestand: "Speisen",
    getraenkestand: "Getränke",
    gemischt: "Gemischt"
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
          {selectedRole && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedRole(null)}
              data-testid="back-btn"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-tight">
            Festival<span className="text-primary">_OS</span>
          </h1>
        </div>
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
        {!selectedRole ? (
          // Step 1: Role Selection
          <>
            <div className="text-center mb-8 sm:mb-12">
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
                    onClick={() => setSelectedRole(role)}
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
        ) : (
          // Step 2: Stand Selection
          <>
            <div className="text-center mb-8 sm:mb-12">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full mb-4 ${colorClasses[selectedRole.color].split(' ')[0]} bg-card/50`}>
                <selectedRole.icon className={`w-5 h-5 ${iconColorClasses[selectedRole.color]}`} />
                <span className={`font-display uppercase font-bold ${iconColorClasses[selectedRole.color]}`}>
                  {selectedRole.name}
                </span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-black uppercase tracking-tight mb-3 sm:mb-4">
                Wähle deinen Stand
              </h2>
              <p className="text-muted-foreground text-base sm:text-lg">
                An welchem Stand arbeitest du?
              </p>
            </div>

            {stands.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Keine Stände vorhanden. Bitte im Admin-Bereich anlegen.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 w-full max-w-6xl">
                {stands.map((stand) => (
                  <Card
                    key={stand.id}
                    className="bg-card/80 backdrop-blur border-2 border-border hover:border-primary/50 cursor-pointer transition-all duration-200 hover:-translate-y-1"
                    onClick={() => handleStandSelect(stand)}
                    data-testid={`stand-card-${stand.id}`}
                  >
                    <CardContent className="p-4 sm:p-6 flex flex-col items-center text-center">
                      <h3 className="font-display text-lg sm:text-xl font-bold mb-2">
                        {stand.name}
                      </h3>
                      <span className={`text-xs px-2 py-1 rounded border ${standTypeColors[stand.stand_type] || standTypeColors.gemischt}`}>
                        {standTypeNames[stand.stand_type] || "Gemischt"}
                      </span>
                      {stand.skip_preparation && (
                        <span className="text-xs text-accent mt-2">⚡ Schnellmodus</span>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <footer className="glass px-4 sm:px-8 py-3 sm:py-4 text-center text-xs sm:text-sm text-muted-foreground">
        Festival Order Management System
      </footer>
    </div>
  );
}
