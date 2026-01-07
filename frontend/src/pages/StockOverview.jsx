import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, Box, TrendingDown, AlertTriangle, Euro, Package, RefreshCw, Trash2, Plus, RotateCcw } from "lucide-react";
import LiveClock from "@/components/LiveClock";
import AppFooter from "@/components/AppFooter";
import AdminNavBar from "@/components/AdminNavBar";
import { useAdminSwipe } from "@/components/AdminSwipe";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StockOverview() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Reset Dialog State
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetType, setResetType] = useState("sales");
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  
  // Restock Dialog State
  const [showRestockDialog, setShowRestockDialog] = useState(false);
  const [restockArticle, setRestockArticle] = useState(null);
  const [restockLarge, setRestockLarge] = useState("");
  const [restockSmall, setRestockSmall] = useState("");
  const [isRestocking, setIsRestocking] = useState(false);
  const [updateInitial, setUpdateInitial] = useState(true);

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchStock();
  }, [auth, navigate]);

  const fetchStock = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/admin/stock-overview`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      setStockData(response.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Bestandsdaten");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset Stock
  const handleReset = async () => {
    setPinError("");
    setIsResetting(true);
    try {
      const response = await axios.post(`${API}/admin/stock/reset`, {
        pin: pinInput,
        reset_type: resetType
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      toast.success(response.data.message);
      setShowResetDialog(false);
      setPinInput("");
      setResetType("sales");
      fetchStock();
    } catch (error) {
      if (error.response?.status === 403) {
        setPinError("Falscher PIN");
      } else {
        toast.error("Fehler beim Zurücksetzen");
      }
    } finally {
      setIsResetting(false);
    }
  };

  // Restock Article
  const openRestockDialog = (item) => {
    setRestockArticle(item);
    setRestockLarge("");
    setRestockSmall("");
    setUpdateInitial(true);
    setShowRestockDialog(true);
  };

  const handleRestock = async () => {
    if (!restockArticle) return;
    
    const large = parseFloat(restockLarge) || 0;
    const small = parseFloat(restockSmall) || 0;
    
    if (large === 0 && small === 0) {
      toast.error("Bitte Menge eingeben");
      return;
    }
    
    setIsRestocking(true);
    try {
      await axios.put(`${API}/articles/${restockArticle.article_id}/stock`, {
        large_units: large,
        small_units: small,
        mode: "add",
        set_as_initial: updateInitial
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      toast.success(`${restockArticle.article_name} aufgestockt`);
      setShowRestockDialog(false);
      fetchStock();
    } catch (error) {
      toast.error("Fehler beim Aufstocken");
    } finally {
      setIsRestocking(false);
    }
  };

  // Calculate totals
  const totalInitial = stockData.reduce((sum, item) => sum + (item.initial_stock_sales_units || 0), 0);
  const totalSold = stockData.reduce((sum, item) => sum + (item.sold_units || 0), 0);
  const totalRevenue = stockData.reduce((sum, item) => sum + (item.sold_revenue || 0), 0);
  const totalRemaining = stockData.reduce((sum, item) => sum + (item.total_stock_sales_units || 0), 0);
  const lowStockCount = stockData.filter(item => item.is_low).length;
  const soldOutCount = stockData.filter(item => item.is_sold_out).length;

  // Format stock display
  const formatStock = (item) => {
    if (!item.stock_unit) {
      return `${Math.round(item.total_stock_sales_units)} Stück`;
    }
    
    const large = item.stock_large_units || 0;
    const small = item.stock_small_units || 0;
    const unit = item.stock_unit;
    
    if (large === 0 && small === 0) return "0";
    
    const parts = [];
    if (large > 0) parts.push(`${large} ${unit.large_unit_name}`);
    if (small > 0) parts.push(`${Math.round(small)} ${unit.small_unit_name}`);
    
    return parts.join(" + ");
  };

  // Calculate percentage remaining
  const getPercentRemaining = (item) => {
    if (!item.initial_stock_sales_units || item.initial_stock_sales_units === 0) return 100;
    return Math.round((item.total_stock_sales_units / item.initial_stock_sales_units) * 100);
  };

  const { swipeHandlers } = useAdminSwipe();

  return (
    <div className="min-h-screen bg-background flex flex-col" {...swipeHandlers}>
      <header className="glass sticky top-0 z-50 px-3 sm:px-6 py-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 shrink-0">
            <Box className="w-5 h-5 text-secondary" />
            <h1 className="font-display text-sm sm:text-base font-bold uppercase tracking-tight hidden sm:block">
              Bestand
            </h1>
          </div>
          
          <div className="flex-1 ">
            <AdminNavBar />
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={fetchStock} title="Aktualisieren">
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 text-destructive"
              onClick={() => setShowResetDialog(true)}
              title="Reset"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 flex-1">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Package className="w-4 h-4" />
                <span className="text-xs">Anfangsbestand</span>
              </div>
              <p className="text-2xl font-bold font-mono">{Math.round(totalInitial)}</p>
              <p className="text-xs text-muted-foreground">VK-Einheiten</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-green-500 mb-1">
                <TrendingDown className="w-4 h-4" />
                <span className="text-xs">Verkauft</span>
              </div>
              <p className="text-2xl font-bold font-mono text-green-500">{Math.round(totalSold)}</p>
              <p className="text-xs text-muted-foreground">VK-Einheiten</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-secondary mb-1">
                <Box className="w-4 h-4" />
                <span className="text-xs">Restbestand</span>
              </div>
              <p className="text-2xl font-bold font-mono text-secondary">{Math.round(totalRemaining)}</p>
              <p className="text-xs text-muted-foreground">VK-Einheiten</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-primary mb-1">
                <Euro className="w-4 h-4" />
                <span className="text-xs">Umsatz</span>
              </div>
              <p className="text-2xl font-bold font-mono text-primary">{totalRevenue.toFixed(2)}€</p>
              <p className="text-xs text-muted-foreground">Verkaufserlös</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-yellow-500 mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Knapp</span>
              </div>
              <p className="text-2xl font-bold font-mono text-yellow-500">{lowStockCount}</p>
              <p className="text-xs text-muted-foreground">Artikel</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-destructive mb-1">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-xs">Ausverkauft</span>
              </div>
              <p className="text-2xl font-bold font-mono text-destructive">{soldOutCount}</p>
              <p className="text-xs text-muted-foreground">Artikel</p>
            </CardContent>
          </Card>
        </div>

        {/* Stock Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display uppercase flex items-center gap-2">
              <Box className="w-5 h-5 text-secondary" />
              Artikelbestände ({stockData.length} Artikel mit Bestandsverwaltung)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Laden...</div>
            ) : stockData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Keine Artikel mit Bestandsverwaltung</p>
                <p className="text-sm mt-1">Aktiviere die Bestandsverwaltung in der Artikelverwaltung</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artikel</TableHead>
                      <TableHead className="hidden sm:table-cell">Einheit</TableHead>
                      <TableHead className="text-right">Anfang</TableHead>
                      <TableHead className="text-right text-green-500">Verkauft</TableHead>
                      <TableHead className="text-right text-secondary">Rest</TableHead>
                      <TableHead className="hidden md:table-cell">Füllstand</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Umsatz</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-center">Aktion</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.map(item => {
                      const percentRemaining = getPercentRemaining(item);
                      const progressColor = item.is_sold_out ? "bg-destructive" :
                                           item.is_low ? "bg-yellow-500" : "bg-secondary";
                      
                      return (
                        <TableRow key={item.article_id} className={item.is_sold_out ? "opacity-60" : ""}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{item.article_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {item.price.toFixed(2)}€ / Stück
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {item.stock_unit ? (
                              <div className="text-sm">
                                <p>{item.stock_unit.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {Math.round(item.stock_unit.sales_units_per_large)} {item.stock_unit.small_unit_name}/{item.stock_unit.large_unit_name}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">Stück</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {Math.round(item.initial_stock_sales_units)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-green-500">
                            {Math.round(item.sold_units)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="text-secondary">
                              <p className="font-mono font-bold">
                                {Math.round(item.total_stock_sales_units)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatStock(item)}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div className="w-32">
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={percentRemaining} 
                                  className={`h-2 ${progressColor}`}
                                />
                                <span className="text-xs font-mono w-10 text-right">
                                  {percentRemaining}%
                                </span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-mono text-primary hidden lg:table-cell">
                            {item.sold_revenue.toFixed(2)}€
                          </TableCell>
                          <TableCell className="text-center">
                            {item.is_sold_out ? (
                              <Badge variant="destructive" className="text-xs">
                                Ausverkauft
                              </Badge>
                            ) : item.is_low ? (
                              <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs">
                                <AlertTriangle className="w-3 h-3 mr-1" />
                                Knapp
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-green-500 text-green-500 text-xs">
                                OK
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openRestockDialog(item)}
                              title="Bestand aufstocken"
                              className="text-secondary hover:text-secondary"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={(open) => {
        setShowResetDialog(open);
        if (!open) {
          setPinInput("");
          setPinError("");
          setResetType("sales");
        }
      }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2 text-destructive">
              <RotateCcw className="w-5 h-5" />
              Bestand zurücksetzen
            </DialogTitle>
            <DialogDescription>
              Wähle aus, was zurückgesetzt werden soll.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <RadioGroup value={resetType} onValueChange={setResetType} className="space-y-3">
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50">
                <RadioGroupItem value="sales" id="sales" className="mt-1" />
                <Label htmlFor="sales" className="flex-1 cursor-pointer">
                  <div className="font-medium">Nur Verkäufe zurücksetzen</div>
                  <div className="text-sm text-muted-foreground">
                    Setzt den aktuellen Bestand auf den Anfangsbestand zurück. 
                    Die verkaufte Menge wird auf 0 gesetzt.
                  </div>
                </Label>
              </div>
              <div className="flex items-start space-x-3 p-3 rounded-lg border border-destructive/50 hover:bg-destructive/10">
                <RadioGroupItem value="all" id="all" className="mt-1" />
                <Label htmlFor="all" className="flex-1 cursor-pointer">
                  <div className="font-medium text-destructive">Bestand und Verkäufe zurücksetzen</div>
                  <div className="text-sm text-muted-foreground">
                    Setzt ALLES auf 0: Anfangsbestand, aktueller Bestand und Verkäufe. 
                    Der Bestand muss neu erfasst werden.
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="pin">PIN eingeben</Label>
              <Input
                id="pin"
                type="password"
                placeholder="Reset-PIN"
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && pinInput && handleReset()}
                className={pinError ? 'border-destructive' : ''}
              />
              {pinError && (
                <p className="text-sm text-destructive">{pinError}</p>
              )}
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
            >
              Abbrechen
            </Button>
            <Button
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleReset}
              disabled={!pinInput || isResetting}
            >
              {isResetting ? "Wird zurückgesetzt..." : "Zurücksetzen"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restock Dialog */}
      <Dialog open={showRestockDialog} onOpenChange={(open) => {
        setShowRestockDialog(open);
        if (!open) {
          setRestockArticle(null);
          setRestockLarge("");
          setRestockSmall("");
        }
      }}>
        <DialogContent className="bg-card border-border max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display uppercase flex items-center gap-2 text-secondary">
              <Plus className="w-5 h-5" />
              Bestand aufstocken
            </DialogTitle>
            <DialogDescription>
              {restockArticle?.article_name} - Ware nachkaufen
            </DialogDescription>
          </DialogHeader>
          
          {restockArticle && (
            <div className="space-y-4">
              {/* Current Stock Info */}
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Aktueller Bestand:</span>
                  <span className="font-mono font-bold text-secondary">
                    {formatStock(restockArticle)}
                  </span>
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-muted-foreground">Anfangsbestand:</span>
                  <span className="font-mono">
                    {Math.round(restockArticle.initial_stock_sales_units)} VK
                  </span>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="large">
                    {restockArticle.stock_unit?.large_unit_name || "Großeinheiten"} hinzufügen
                  </Label>
                  <Input
                    id="large"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={restockLarge}
                    onChange={(e) => setRestockLarge(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="small">
                    {restockArticle.stock_unit?.small_unit_name || "Einzelne"} hinzufügen
                  </Label>
                  <Input
                    id="small"
                    type="number"
                    min="0"
                    step="1"
                    placeholder="0"
                    value={restockSmall}
                    onChange={(e) => setRestockSmall(e.target.value)}
                  />
                </div>
              </div>

              {/* Preview */}
              {(parseFloat(restockLarge) > 0 || parseFloat(restockSmall) > 0) && (
                <div className="p-3 bg-secondary/10 rounded-lg text-sm border border-secondary/30">
                  <div className="font-medium text-secondary mb-1">Vorschau nach Aufstockung:</div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neuer Bestand:</span>
                    <span className="font-mono font-bold">
                      {restockArticle.stock_large_units + (parseFloat(restockLarge) || 0)} {restockArticle.stock_unit?.large_unit_name || ""} 
                      {" + "}
                      {Math.round(restockArticle.stock_small_units + (parseFloat(restockSmall) || 0))} {restockArticle.stock_unit?.small_unit_name || "Stück"}
                    </span>
                  </div>
                </div>
              )}

              {/* Update Initial Checkbox */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="updateInitial"
                  checked={updateInitial}
                  onChange={(e) => setUpdateInitial(e.target.checked)}
                  className="rounded border-border"
                />
                <Label htmlFor="updateInitial" className="text-sm cursor-pointer">
                  Auch zum Anfangsbestand hinzufügen (für korrekte Statistik)
                </Label>
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRestockDialog(false)}
            >
              Abbrechen
            </Button>
            <Button
              className="neon-secondary"
              onClick={handleRestock}
              disabled={isRestocking || (!parseFloat(restockLarge) && !parseFloat(restockSmall))}
            >
              {isRestocking ? "Wird aufgestockt..." : "Aufstocken"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
