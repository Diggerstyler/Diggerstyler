import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Lock, LogIn } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await axios.post(`${API}/auth/login`, {}, {
        auth: { username, password }
      });
      
      // Store credentials in sessionStorage for subsequent requests
      sessionStorage.setItem("adminAuth", btoa(`${username}:${password}`));
      toast.success("Login erfolgreich!");
      navigate("/admin");
    } catch (error) {
      toast.error("Ungültige Anmeldedaten");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex flex-col"
      style={{
        backgroundImage: "linear-gradient(to bottom, rgba(9, 9, 11, 0.9), rgba(9, 9, 11, 0.95)), url('https://images.pexels.com/photos/1763075/pexels-photo-1763075.jpeg')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }}
    >
      <header className="glass px-6 py-4">
        <Button 
          variant="ghost" 
          onClick={() => navigate("/")}
          data-testid="back-btn"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Zurück
        </Button>
      </header>

      <main className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md bg-card/90 backdrop-blur border-border">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-muted rounded-sm flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="font-display text-2xl uppercase">Admin Login</CardTitle>
            <CardDescription>
              Melde dich an, um auf den Admin-Bereich zuzugreifen
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="username">Benutzername</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="h-12"
                  data-testid="username-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Passwort</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-12"
                  data-testid="password-input"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 font-semibold uppercase neon-primary"
                disabled={isLoading}
                data-testid="login-btn"
              >
                {isLoading ? (
                  "Wird angemeldet..."
                ) : (
                  <>
                    <LogIn className="w-4 h-4 mr-2" />
                    Anmelden
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
