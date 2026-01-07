import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Settings, Clock, Save, Palette, Upload, Trash2, Image, RefreshCw } from "lucide-react";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";
import AdminNavBar from "@/components/AdminNavBar";
import { useAdminSwipe } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Preset color themes
const COLOR_PRESETS = [
  { name: "Neon Lila", primary: "#a855f7", secondary: "#22c55e", accent: "#eab308" },
  { name: "Ocean Blau", primary: "#3b82f6", secondary: "#06b6d4", accent: "#f59e0b" },
  { name: "Sunset Orange", primary: "#f97316", secondary: "#ec4899", accent: "#fbbf24" },
  { name: "Forest Grün", primary: "#22c55e", secondary: "#84cc16", accent: "#14b8a6" },
  { name: "Royal Rot", primary: "#ef4444", secondary: "#f97316", accent: "#fbbf24" },
  { name: "Elegant Gold", primary: "#eab308", secondary: "#a855f7", accent: "#f59e0b" },
];

export default function SettingsPage() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [settings, setSettings] = useState({
    timezone: "Europe/Berlin",
    event_name: "Karnbachs Event OS",
    logo_url: null,
    primary_color: "#a855f7",
    secondary_color: "#22c55e",
    accent_color: "#eab308"
  });
  const [timezones, setTimezones] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

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
      setSettings(prev => ({ ...prev, ...settingsRes.data }));
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
      toast.success("Einstellungen gespeichert!");
      // Apply colors immediately
      applyColors(settings);
    } catch (error) {
      toast.error("Fehler beim Speichern");
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Ungültiger Dateityp. Erlaubt: PNG, JPG, SVG, WebP");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Datei zu groß. Maximal 2MB erlaubt.");
      return;
    }

    setIsUploadingLogo(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post(`${API}/settings/logo`, formData, {
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "multipart/form-data"
        }
      });
      setSettings(prev => ({ ...prev, logo_url: response.data.logo_url }));
      toast.success("Logo hochgeladen!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fehler beim Hochladen");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteLogo = async () => {
    if (!window.confirm("Logo wirklich löschen?")) return;
    
    try {
      await axios.delete(`${API}/settings/logo`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      setSettings(prev => ({ ...prev, logo_url: null }));
      toast.success("Logo gelöscht");
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const applyPreset = (preset) => {
    setSettings(prev => ({
      ...prev,
      primary_color: preset.primary,
      secondary_color: preset.secondary,
      accent_color: preset.accent
    }));
  };

  const applyColors = (colors) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for Tailwind CSS variables
    const hexToHSL = (hex) => {
      let r = parseInt(hex.slice(1, 3), 16) / 255;
      let g = parseInt(hex.slice(3, 5), 16) / 255;
      let b = parseInt(hex.slice(5, 7), 16) / 255;

      let max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h, s, l = (max + min) / 2;

      if (max === min) {
        h = s = 0;
      } else {
        let d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
          default: h = 0;
        }
      }

      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    if (colors.primary_color) {
      root.style.setProperty('--primary', hexToHSL(colors.primary_color));
    }
    if (colors.secondary_color) {
      root.style.setProperty('--secondary', hexToHSL(colors.secondary_color));
    }
    if (colors.accent_color) {
      root.style.setProperty('--accent', hexToHSL(colors.accent_color));
    }
  };

  // Apply colors on load
  useEffect(() => {
    if (settings.primary_color) {
      applyColors(settings);
    }
  }, [settings.primary_color, settings.secondary_color, settings.accent_color]);

  const { swipeHandlers } = useAdminSwipe();

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Settings className="w-5 h-5 text-primary" />
            <h1 className="font-display text-base sm:text-lg font-bold uppercase tracking-tight">
              Einstellungen
            </h1>
          </div>
          
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <AdminNavBar />
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-3xl mx-auto space-y-6 flex-1">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Laden...</div>
        ) : (
          <>
            {/* Event Name Setting */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display uppercase flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Event-Name
                </CardTitle>
                <CardDescription>
                  Der Name wird auf der Startseite und im Header angezeigt.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="event_name">Event-Name</Label>
                  <Input
                    id="event_name"
                    value={settings.event_name || ""}
                    onChange={(e) => setSettings(prev => ({ ...prev, event_name: e.target.value }))}
                    placeholder="Mein Festival 2025"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Logo Upload */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display uppercase flex items-center gap-2">
                  <Image className="w-5 h-5 text-primary" />
                  Event-Logo
                </CardTitle>
                <CardDescription>
                  Lade ein Logo hoch, das auf der Startseite angezeigt wird. (Max. 2MB, PNG/JPG/SVG/WebP)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Logo Preview */}
                <div className="flex items-center gap-6">
                  <div className="w-32 h-32 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted overflow-hidden">
                    {settings.logo_url ? (
                      <img 
                        src={settings.logo_url} 
                        alt="Event Logo" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Image className="w-8 h-8 mx-auto mb-1 opacity-50" />
                        <span className="text-xs">Kein Logo</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleLogoUpload}
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingLogo}
                    >
                      {isUploadingLogo ? (
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      {isUploadingLogo ? "Hochladen..." : "Logo hochladen"}
                    </Button>
                    
                    {settings.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={handleDeleteLogo}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Logo entfernen
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Color Theme */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="font-display uppercase flex items-center gap-2">
                  <Palette className="w-5 h-5 text-primary" />
                  Farbschema
                </CardTitle>
                <CardDescription>
                  Wähle ein vordefiniertes Farbschema oder passe die Farben individuell an.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Preset Colors */}
                <div className="space-y-2">
                  <Label>Farbvorlagen</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.name}
                        onClick={() => applyPreset(preset)}
                        className="p-3 rounded-lg border border-border hover:border-primary transition-colors text-left"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.primary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.secondary }}
                          />
                          <div 
                            className="w-4 h-4 rounded-full" 
                            style={{ backgroundColor: preset.accent }}
                          />
                        </div>
                        <span className="text-sm font-medium">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Colors */}
                <div className="space-y-4">
                  <Label>Individuelle Farben</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primary" className="text-xs text-muted-foreground">
                        Primärfarbe (Buttons, Akzente)
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="primary"
                          value={settings.primary_color || "#a855f7"}
                          onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <Input
                          value={settings.primary_color || "#a855f7"}
                          onChange={(e) => setSettings(prev => ({ ...prev, primary_color: e.target.value }))}
                          className="flex-1 font-mono text-sm"
                          placeholder="#a855f7"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="secondary" className="text-xs text-muted-foreground">
                        Sekundärfarbe (Bestätigung, Erfolg)
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="secondary"
                          value={settings.secondary_color || "#22c55e"}
                          onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <Input
                          value={settings.secondary_color || "#22c55e"}
                          onChange={(e) => setSettings(prev => ({ ...prev, secondary_color: e.target.value }))}
                          className="flex-1 font-mono text-sm"
                          placeholder="#22c55e"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accent" className="text-xs text-muted-foreground">
                        Akzentfarbe (Highlights, Warnungen)
                      </Label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          id="accent"
                          value={settings.accent_color || "#eab308"}
                          onChange={(e) => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <Input
                          value={settings.accent_color || "#eab308"}
                          onChange={(e) => setSettings(prev => ({ ...prev, accent_color: e.target.value }))}
                          className="flex-1 font-mono text-sm"
                          placeholder="#eab308"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="p-4 bg-muted rounded-lg space-y-3">
                  <Label className="text-sm">Vorschau</Label>
                  <div className="flex flex-wrap gap-2">
                    <Button 
                      size="sm" 
                      style={{ backgroundColor: settings.primary_color, color: '#fff' }}
                    >
                      Primär Button
                    </Button>
                    <Button 
                      size="sm" 
                      style={{ backgroundColor: settings.secondary_color, color: '#fff' }}
                    >
                      Sekundär Button
                    </Button>
                    <Button 
                      size="sm" 
                      style={{ backgroundColor: settings.accent_color, color: '#000' }}
                    >
                      Akzent Button
                    </Button>
                  </div>
                  <div className="flex gap-4 text-sm">
                    <span style={{ color: settings.primary_color }}>● Primärtext</span>
                    <span style={{ color: settings.secondary_color }}>● Sekundärtext</span>
                    <span style={{ color: settings.accent_color }}>● Akzenttext</span>
                  </div>
                </div>
              </CardContent>
            </Card>

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
                {isSaving ? "Speichern..." : "Alle Einstellungen speichern"}
              </Button>
            </div>
          </>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
