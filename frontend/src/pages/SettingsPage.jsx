import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Settings, Clock, Save } from "lucide-react";
import LiveClock from "@/components/LiveClock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function SettingsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({ timezone: "Europe/Berlin" });
  const [timezones, setTimezones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchData();
  }, [auth, navigate]);

  const fetchData = async () => {
    try {
      const [settingsRes, timezonesRes] = await Promise.all([
        axios.get(`${API}/settings`),
        axios.get(`${API}/timezones`)
      ]);
      setSettings(settingsRes.data);
      setTimezones(timezonesRes.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Einstellungen");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await axios.put(`${API}/settings`, settings, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Einstellungen gespeichert! Seite neu laden für Zeitzone.");
      // Force reload to apply new timezone
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
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
            <Settings className="w-6 h-6 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Einstellungen
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <LiveClock />
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-2xl mx-auto space-y-6">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : (
          <>
            {/* Timezone Setting */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display uppercase flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Zeitzone
                </CardTitle>
                <CardDescription>
                  Die Zeitzone wird für alle Uhren in der App verwendet.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="timezone">Zeitzone auswählen</Label>
                  <Select 
                    value={settings.timezone || "Europe/Berlin"} 
                    onValueChange={(value) => setSettings(prev => ({ ...prev, timezone: value }))}
                  >
                    <SelectTrigger id="timezone" className="w-full">
                      <SelectValue placeholder="Zeitzone wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {timezones.map(tz => (
                        <SelectItem key={tz.id} value={tz.id}>
                          {tz.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Aktuelle Zeit in gewählter Zeitzone:</p>
                  <div className="flex items-center gap-3">
                    <Clock className="w-6 h-6 text-primary" />
                    <LiveClock key={settings.timezone} className="scale-110" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="neon-primary"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Speichern..." : "Einstellungen speichern"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
