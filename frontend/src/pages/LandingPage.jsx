import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ShoppingCart, ChefHat, Package, Settings } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function LandingPage() {
  const navigate = useNavigate();
  const [stands, setStands] = useState([]);
  const [selectedStand, setSelectedStand] = useState("");

  useEffect(() => {
    const fetchStands = async () => {
      try {
        const response = await axios.get(`${API}/stands`);
        setStands(response.data);
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
    }
  ];

  const handleRoleSelect = (role) => {
    if (!selectedStand) return;
    navigate(`/${role.path}/${selectedStand}`);
  };

  const colorClasses = {
    primary: "border-primary/50 hover:border-primary hover:bg-primary/10 neon-primary",
    secondary: "border-secondary/50 hover:border-secondary hover:bg-secondary/10 neon-secondary",
    accent: "border-accent/50 hover:border-accent hover:bg-accent/10 neon-accent"
  };

  const iconColorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent"
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
            Wähle deinen Stand und deine Rolle
          </p>
        </div>

        <div className="w-full max-w-md mb-12">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card
                key={role.id}
                className={`bg-card/80 backdrop-blur border-2 cursor-pointer transition-all duration-200 hover:-translate-y-1 ${colorClasses[role.color]} ${!selectedStand ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => handleRoleSelect(role)}
                data-testid={`role-card-${role.id}`}
              >
                <CardContent className="p-8 flex flex-col items-center text-center">
                  <div className={`w-20 h-20 rounded-sm flex items-center justify-center mb-6 bg-muted ${iconColorClasses[role.color]}`}>
                    <Icon className="w-10 h-10" />
                  </div>
                  <h3 className="font-display text-2xl font-bold uppercase mb-2">
                    {role.name}
                  </h3>
                  <p className="text-muted-foreground">
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
