import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Box, TrendingDown, AlertTriangle, Euro, Package, RefreshCw } from "lucide-react";
import LiveClock from "@/components/LiveClock";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StockOverview() {
  const navigate = useNavigate();
  const [stockData, setStockData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
            <Box className="w-6 h-6 text-secondary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Bestandsübersicht
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          <LiveClock />
          <Button variant="outline" size="sm" onClick={fetchStock}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Aktualisieren
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
    </div>
  );
}
