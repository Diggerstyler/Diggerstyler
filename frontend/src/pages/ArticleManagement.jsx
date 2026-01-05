import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Pencil, Trash2, Package, Coins, Check, Box, AlertTriangle, TrendingDown, Beer, Wine, ArrowUpDown, ArrowUp, ArrowDown, Search, Filter, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ArticleManagement() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [depositGroups, setDepositGroups] = useState([]);
  const [stockUnits, setStockUnits] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isStockUnitDialogOpen, setIsStockUnitDialogOpen] = useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [editingStockUnit, setEditingStockUnit] = useState(null);
  const [stockArticle, setStockArticle] = useState(null);
  
  // Filter & Sort States - Articles
  const [articleSearch, setArticleSearch] = useState("");
  const [articleCategoryFilter, setArticleCategoryFilter] = useState("all");
  const [articleDepositFilter, setArticleDepositFilter] = useState("all");
  const [articleStockFilter, setArticleStockFilter] = useState("all");
  const [articleStatusFilter, setArticleStatusFilter] = useState("all");
  const [articleSort, setArticleSort] = useState({ field: "name", direction: "asc" });
  
  // Filter & Sort States - Stock Units
  const [unitSearch, setUnitSearch] = useState("");
  const [unitTypeFilter, setUnitTypeFilter] = useState("all");
  const [unitSort, setUnitSort] = useState({ field: "name", direction: "asc" });
  
  // Filter & Sort States - Deposits
  const [depositSearch, setDepositSearch] = useState("");
  const [depositSort, setDepositSort] = useState({ field: "name", direction: "asc" });
  
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "getraenke",
    deposit_group_id: "",
    track_stock: false,
    stock_unit_id: "",
    stock_warning_threshold: "",
    stock_sold_out_behavior: "mark",
    active: true
  });
  
  const [depositFormData, setDepositFormData] = useState({
    name: "",
    amount: "",
    active: true
  });
  
  const [stockUnitFormData, setStockUnitFormData] = useState({
    name: "",
    unit_type: "container",
    units_per_container: "24",
    volume_per_unit: "0.5",
    total_volume_liters: "30",
    serving_size_liters: "0.5",
    loss_percent: "7",
    large_unit_name: "Kiste",
    small_unit_name: "Flasche"
  });
  
  const [stockFormData, setStockFormData] = useState({
    large_units: "",
    small_units: "",
    set_as_initial: true
  });

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
      const [articlesRes, depositsRes, stockUnitsRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/deposit-groups`),
        axios.get(`${API}/stock-units`)
      ]);
      setArticles(articlesRes.data);
      setDepositGroups(depositsRes.data);
      setStockUnits(stockUnitsRes.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  };

  // === Helper functions ===
  const getDepositName = useCallback((depositId) => {
    const deposit = depositGroups.find(d => d.id === depositId);
    return deposit ? `${deposit.name} (${deposit.amount.toFixed(2)}€)` : "-";
  }, [depositGroups]);

  const getStockUnit = useCallback((unitId) => {
    return stockUnits.find(u => u.id === unitId);
  }, [stockUnits]);

  const getTotalStock = useCallback((article) => {
    const unit = stockUnits.find(u => u.id === article.stock_unit_id);
    const large = article.stock_large_units || 0;
    const small = article.stock_small_units || 0;
    const unitsPerLarge = unit?.sales_units_per_large || 1;
    return (large * unitsPerLarge) + small;
  }, [stockUnits]);

  const formatStock = useCallback((article) => {
    const unit = stockUnits.find(u => u.id === article.stock_unit_id);
    if (!unit) return `${article.stock_small_units || 0} Stück`;
    
    const large = article.stock_large_units || 0;
    const small = article.stock_small_units || 0;
    
    if (large === 0 && small === 0) return "0";
    
    const parts = [];
    if (large > 0) parts.push(`${large} ${unit.large_unit_name}${large !== 1 ? 'n' : ''}`);
    if (small > 0) parts.push(`${Math.round(small)} ${unit.small_unit_name}${small !== 1 ? 'n' : ''}`);
    
    return parts.join(" + ");
  }, [stockUnits]);

  const isLowStock = useCallback((article) => {
    if (!article.track_stock || !article.stock_warning_threshold) return false;
    const unit = stockUnits.find(u => u.id === article.stock_unit_id);
    const large = article.stock_large_units || 0;
    const small = article.stock_small_units || 0;
    const unitsPerLarge = unit?.sales_units_per_large || 1;
    const total = (large * unitsPerLarge) + small;
    return total <= article.stock_warning_threshold;
  }, [stockUnits]);

  const isSoldOut = useCallback((article) => {
    if (!article.track_stock) return false;
    const unit = stockUnits.find(u => u.id === article.stock_unit_id);
    const large = article.stock_large_units || 0;
    const small = article.stock_small_units || 0;
    const unitsPerLarge = unit?.sales_units_per_large || 1;
    const total = (large * unitsPerLarge) + small;
    return total <= 0;
  }, [stockUnits]);

  // === Sorting & Filtering - Articles ===
  const toggleArticleSort = (field) => {
    setArticleSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const getSortIcon = (sortState, field) => {
    if (sortState.field !== field) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-50" />;
    return sortState.direction === "asc" 
      ? <ArrowUp className="w-3 h-3 ml-1 text-primary" />
      : <ArrowDown className="w-3 h-3 ml-1 text-primary" />;
  };

  const filteredAndSortedArticles = useMemo(() => {
    let result = [...articles];
    
    // Apply filters
    if (articleSearch) {
      const search = articleSearch.toLowerCase();
      result = result.filter(a => a.name.toLowerCase().includes(search));
    }
    
    if (articleCategoryFilter !== "all") {
      result = result.filter(a => a.category === articleCategoryFilter);
    }
    
    if (articleDepositFilter !== "all") {
      if (articleDepositFilter === "none") {
        result = result.filter(a => !a.deposit_group_id);
      } else if (articleDepositFilter === "has") {
        result = result.filter(a => a.deposit_group_id);
      } else {
        result = result.filter(a => a.deposit_group_id === articleDepositFilter);
      }
    }
    
    if (articleStockFilter !== "all") {
      if (articleStockFilter === "tracked") {
        result = result.filter(a => a.track_stock);
      } else if (articleStockFilter === "not_tracked") {
        result = result.filter(a => !a.track_stock);
      } else if (articleStockFilter === "low") {
        result = result.filter(a => a.track_stock && isLowStock(a) && !isSoldOut(a));
      } else if (articleStockFilter === "sold_out") {
        result = result.filter(a => a.track_stock && isSoldOut(a));
      } else if (articleStockFilter === "ok") {
        result = result.filter(a => a.track_stock && !isLowStock(a) && !isSoldOut(a));
      }
    }
    
    if (articleStatusFilter !== "all") {
      result = result.filter(a => articleStatusFilter === "active" ? a.active : !a.active);
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (articleSort.field) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "category":
          aVal = a.category;
          bVal = b.category;
          break;
        case "price":
          aVal = a.price;
          bVal = b.price;
          break;
        case "deposit":
          const depA = depositGroups.find(d => d.id === a.deposit_group_id);
          const depB = depositGroups.find(d => d.id === b.deposit_group_id);
          aVal = depA?.amount || 0;
          bVal = depB?.amount || 0;
          break;
        case "stock":
          aVal = a.track_stock ? getTotalStock(a) : -1;
          bVal = b.track_stock ? getTotalStock(b) : -1;
          break;
        case "active":
          aVal = a.active ? 1 : 0;
          bVal = b.active ? 1 : 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      if (aVal < bVal) return articleSort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return articleSort.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [articles, articleSearch, articleCategoryFilter, articleDepositFilter, articleStockFilter, articleStatusFilter, articleSort, depositGroups]);

  // === Sorting & Filtering - Stock Units ===
  const toggleUnitSort = (field) => {
    setUnitSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const filteredAndSortedUnits = useMemo(() => {
    let result = [...stockUnits];
    
    if (unitSearch) {
      const search = unitSearch.toLowerCase();
      result = result.filter(u => u.name.toLowerCase().includes(search));
    }
    
    if (unitTypeFilter !== "all") {
      result = result.filter(u => u.unit_type === unitTypeFilter);
    }
    
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (unitSort.field) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "type":
          aVal = a.unit_type;
          bVal = b.unit_type;
          break;
        case "units":
          aVal = a.sales_units_per_large || 0;
          bVal = b.sales_units_per_large || 0;
          break;
        case "loss":
          aVal = a.loss_percent || 0;
          bVal = b.loss_percent || 0;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      if (aVal < bVal) return unitSort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return unitSort.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [stockUnits, unitSearch, unitTypeFilter, unitSort]);

  // === Sorting & Filtering - Deposits ===
  const toggleDepositSort = (field) => {
    setDepositSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const filteredAndSortedDeposits = useMemo(() => {
    let result = [...depositGroups];
    
    if (depositSearch) {
      const search = depositSearch.toLowerCase();
      result = result.filter(d => d.name.toLowerCase().includes(search));
    }
    
    result.sort((a, b) => {
      let aVal, bVal;
      
      switch (depositSort.field) {
        case "name":
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
          break;
        case "amount":
          aVal = a.amount;
          bVal = b.amount;
          break;
        default:
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
      }
      
      if (aVal < bVal) return depositSort.direction === "asc" ? -1 : 1;
      if (aVal > bVal) return depositSort.direction === "asc" ? 1 : -1;
      return 0;
    });
    
    return result;
  }, [depositGroups, depositSearch, depositSort]);

  // Clear all filters
  const clearArticleFilters = () => {
    setArticleSearch("");
    setArticleCategoryFilter("all");
    setArticleDepositFilter("all");
    setArticleStockFilter("all");
    setArticleStatusFilter("all");
  };

  const hasActiveArticleFilters = articleSearch || articleCategoryFilter !== "all" || articleDepositFilter !== "all" || articleStockFilter !== "all" || articleStatusFilter !== "all";

  // === Article handlers ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        deposit_group_id: formData.deposit_group_id || null,
        stock_unit_id: formData.stock_unit_id || null,
        stock_warning_threshold: formData.stock_warning_threshold ? parseInt(formData.stock_warning_threshold) : 0
      };

      if (editingArticle) {
        await axios.put(`${API}/articles/${editingArticle.id}`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Artikel aktualisiert");
      } else {
        await axios.post(`${API}/articles`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Artikel erstellt");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      name: article.name,
      price: article.price.toString(),
      category: article.category,
      deposit_group_id: article.deposit_group_id || "",
      track_stock: article.track_stock || false,
      stock_unit_id: article.stock_unit_id || "",
      stock_warning_threshold: article.stock_warning_threshold?.toString() || "",
      stock_sold_out_behavior: article.stock_sold_out_behavior || "mark",
      active: article.active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (articleId) => {
    if (!window.confirm("Artikel wirklich löschen?")) return;

    try {
      await axios.delete(`${API}/articles/${articleId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Artikel gelöscht");
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const toggleActive = async (article) => {
    try {
      await axios.put(`${API}/articles/${article.id}`, 
        { active: !article.active },
        { headers: { Authorization: `Basic ${auth}` } }
      );
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const resetForm = () => {
    setEditingArticle(null);
    setFormData({
      name: "",
      price: "",
      category: "getraenke",
      deposit_group_id: "",
      track_stock: false,
      stock_unit_id: "",
      stock_warning_threshold: "",
      stock_sold_out_behavior: "mark",
      active: true
    });
  };

  // === Deposit handlers ===
  const handleDepositSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...depositFormData,
        amount: parseFloat(depositFormData.amount)
      };

      if (editingDeposit) {
        await axios.put(`${API}/deposit-groups/${editingDeposit.id}`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Pfandgruppe aktualisiert");
      } else {
        await axios.post(`${API}/deposit-groups`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Pfandgruppe erstellt");
      }

      setIsDepositDialogOpen(false);
      resetDepositForm();
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleEditDeposit = (deposit) => {
    setEditingDeposit(deposit);
    setDepositFormData({
      name: deposit.name,
      amount: deposit.amount.toString(),
      active: deposit.active
    });
    setIsDepositDialogOpen(true);
  };

  const handleDeleteDeposit = async (depositId) => {
    if (!window.confirm("Pfandgruppe wirklich löschen?")) return;

    try {
      await axios.delete(`${API}/deposit-groups/${depositId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Pfandgruppe gelöscht");
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const resetDepositForm = () => {
    setEditingDeposit(null);
    setDepositFormData({
      name: "",
      amount: "",
      active: true
    });
  };

  const quickSetDeposit = async (article, depositGroupId) => {
    try {
      await axios.put(`${API}/articles/${article.id}`, {
        deposit_group_id: depositGroupId || null
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success(`Pfand für "${article.name}" aktualisiert`);
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  // === Stock Unit handlers ===
  const handleStockUnitSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        name: stockUnitFormData.name,
        unit_type: stockUnitFormData.unit_type,
        units_per_container: parseInt(stockUnitFormData.units_per_container) || 1,
        volume_per_unit: parseFloat(stockUnitFormData.volume_per_unit) || 0,
        total_volume_liters: parseFloat(stockUnitFormData.total_volume_liters) || 0,
        serving_size_liters: parseFloat(stockUnitFormData.serving_size_liters) || 0.5,
        loss_percent: parseFloat(stockUnitFormData.loss_percent) || 0,
        large_unit_name: stockUnitFormData.large_unit_name,
        small_unit_name: stockUnitFormData.small_unit_name
      };

      if (editingStockUnit) {
        await axios.put(`${API}/stock-units/${editingStockUnit.id}`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Einheit aktualisiert");
      } else {
        await axios.post(`${API}/stock-units`, data, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Einheit erstellt");
      }

      setIsStockUnitDialogOpen(false);
      resetStockUnitForm();
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleEditStockUnit = (unit) => {
    setEditingStockUnit(unit);
    setStockUnitFormData({
      name: unit.name,
      unit_type: unit.unit_type,
      units_per_container: unit.units_per_container?.toString() || "24",
      volume_per_unit: unit.volume_per_unit?.toString() || "0.5",
      total_volume_liters: unit.total_volume_liters?.toString() || "30",
      serving_size_liters: unit.serving_size_liters?.toString() || "0.5",
      loss_percent: unit.loss_percent?.toString() || "7",
      large_unit_name: unit.large_unit_name || "Kiste",
      small_unit_name: unit.small_unit_name || "Flasche"
    });
    setIsStockUnitDialogOpen(true);
  };

  const handleDeleteStockUnit = async (unitId) => {
    if (!window.confirm("Einheit wirklich löschen?")) return;

    try {
      await axios.delete(`${API}/stock-units/${unitId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Einheit gelöscht");
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Fehler beim Löschen");
    }
  };

  const resetStockUnitForm = () => {
    setEditingStockUnit(null);
    setStockUnitFormData({
      name: "",
      unit_type: "container",
      units_per_container: "24",
      volume_per_unit: "0.5",
      total_volume_liters: "30",
      serving_size_liters: "0.5",
      loss_percent: "7",
      large_unit_name: "Kiste",
      small_unit_name: "Flasche"
    });
  };

  // === Stock Adjustment handlers ===
  const openStockDialog = (article) => {
    setStockArticle(article);
    setStockFormData({
      large_units: article.stock_large_units?.toString() || "0",
      small_units: article.stock_small_units?.toString() || "0",
      set_as_initial: false
    });
    setIsStockDialogOpen(true);
  };

  const handleStockSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await axios.put(`${API}/articles/${stockArticle.id}/stock`, {
        large_units: parseFloat(stockFormData.large_units) || 0,
        small_units: parseFloat(stockFormData.small_units) || 0,
        set_as_initial: stockFormData.set_as_initial
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      
      toast.success("Bestand aktualisiert");
      setIsStockDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  // Sortable Table Header Component
  const SortableHeader = ({ children, field, sortState, onSort, className = "" }) => (
    <TableHead 
      className={`cursor-pointer hover:bg-muted/50 select-none ${className}`}
      onClick={() => onSort(field)}
    >
      <div className="flex items-center">
        {children}
        {getSortIcon(sortState, field)}
      </div>
    </TableHead>
  );

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
            <Package className="w-6 h-6 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Artikelverwaltung
            </h1>
          </div>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-7xl mx-auto">
        <Tabs defaultValue="articles" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="articles">Artikel ({filteredAndSortedArticles.length})</TabsTrigger>
            <TabsTrigger value="stock-units">Einheiten ({filteredAndSortedUnits.length})</TabsTrigger>
            <TabsTrigger value="deposit">Pfand ({filteredAndSortedDeposits.length})</TabsTrigger>
          </TabsList>

          {/* === ARTICLES TAB === */}
          <TabsContent value="articles" className="space-y-4">
            {/* Filter Bar */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Artikel suchen..."
                      value={articleSearch}
                      onChange={(e) => setArticleSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={articleCategoryFilter} onValueChange={setArticleCategoryFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Kategorie" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Kategorien</SelectItem>
                      <SelectItem value="getraenke">Getränke</SelectItem>
                      <SelectItem value="speisen">Speisen</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={articleDepositFilter} onValueChange={setArticleDepositFilter}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Pfand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="has">Mit Pfand</SelectItem>
                      <SelectItem value="none">Ohne Pfand</SelectItem>
                      {depositGroups.map(d => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={articleStockFilter} onValueChange={setArticleStockFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Bestand" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="tracked">Mit Bestandsv.</SelectItem>
                      <SelectItem value="not_tracked">Ohne Bestandsv.</SelectItem>
                      <SelectItem value="ok">Bestand OK</SelectItem>
                      <SelectItem value="low">Bestand knapp</SelectItem>
                      <SelectItem value="sold_out">Ausverkauft</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={articleStatusFilter} onValueChange={setArticleStatusFilter}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      <SelectItem value="active">Aktiv</SelectItem>
                      <SelectItem value="inactive">Inaktiv</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {hasActiveArticleFilters && (
                    <Button variant="ghost" size="sm" onClick={clearArticleFilters}>
                      <X className="w-4 h-4 mr-1" />
                      Filter löschen
                    </Button>
                  )}
                  
                  <div className="ml-auto">
                    <Dialog open={isDialogOpen} onOpenChange={(open) => {
                      setIsDialogOpen(open);
                      if (!open) resetForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button className="neon-primary">
                          <Plus className="w-4 h-4 mr-2" />
                          Neuer Artikel
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display uppercase">
                            {editingArticle ? "Artikel bearbeiten" : "Neuer Artikel"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 col-span-2">
                              <Label htmlFor="name">Name</Label>
                              <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="z.B. Bier 0,5l"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="price">Preis (€)</Label>
                              <Input
                                id="price"
                                type="number"
                                step="0.01"
                                min="0"
                                value={formData.price}
                                onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                                placeholder="0.00"
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="category">Kategorie</Label>
                              <Select 
                                value={formData.category} 
                                onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="getraenke">Getränke</SelectItem>
                                  <SelectItem value="speisen">Speisen</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="deposit">Pfandgruppe</Label>
                            <Select 
                              value={formData.deposit_group_id || "none"} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, deposit_group_id: value === "none" ? "" : value }))}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Kein Pfand" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Kein Pfand</SelectItem>
                                {depositGroups.filter(d => d.active).map(deposit => (
                                  <SelectItem key={deposit.id} value={deposit.id}>
                                    {deposit.name} ({deposit.amount.toFixed(2)} €)
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Bestandsverwaltung */}
                          <div className="border-t border-border pt-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Box className="w-4 h-4 text-secondary" />
                                <Label htmlFor="track_stock" className="font-medium">Bestandsverwaltung</Label>
                              </div>
                              <Switch
                                id="track_stock"
                                checked={formData.track_stock}
                                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, track_stock: checked }))}
                              />
                            </div>

                            {formData.track_stock && (
                              <div className="space-y-4 pl-6 border-l-2 border-secondary/30">
                                <div className="space-y-2">
                                  <Label>Einheit/Gebinde</Label>
                                  <Select 
                                    value={formData.stock_unit_id || "none"} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, stock_unit_id: value === "none" ? "" : value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Einheit wählen" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="none">Keine Einheit (Stückzählung)</SelectItem>
                                      {stockUnits.filter(u => u.active !== false).map(unit => (
                                        <SelectItem key={unit.id} value={unit.id}>
                                          {unit.name} ({Math.round(unit.sales_units_per_large)} {unit.small_unit_name}/{unit.large_unit_name})
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label htmlFor="warning">Warnschwelle (VK-Einheiten)</Label>
                                  <Input
                                    id="warning"
                                    type="number"
                                    min="0"
                                    value={formData.stock_warning_threshold}
                                    onChange={(e) => setFormData(prev => ({ ...prev, stock_warning_threshold: e.target.value }))}
                                    placeholder="z.B. 50"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    Bei diesem Bestand wird "knapp" angezeigt
                                  </p>
                                </div>

                                <div className="space-y-2">
                                  <Label>Verhalten bei Ausverkauf</Label>
                                  <Select 
                                    value={formData.stock_sold_out_behavior} 
                                    onValueChange={(value) => setFormData(prev => ({ ...prev, stock_sold_out_behavior: value }))}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="disable">Automatisch deaktivieren</SelectItem>
                                      <SelectItem value="mark">Rot markieren (buchbar)</SelectItem>
                                      <SelectItem value="allow">Normal buchbar lassen</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center justify-between border-t border-border pt-4">
                            <Label htmlFor="active">Artikel aktiv</Label>
                            <Switch
                              id="active"
                              checked={formData.active}
                              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                            />
                          </div>
                          
                          <Button type="submit" className="w-full neon-primary">
                            {editingArticle ? "Aktualisieren" : "Erstellen"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Articles Table */}
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Laden...</div>
                ) : filteredAndSortedArticles.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    {hasActiveArticleFilters ? "Keine Artikel mit diesen Filtern gefunden" : "Keine Artikel vorhanden"}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader field="name" sortState={articleSort} onSort={toggleArticleSort}>
                            Name
                          </SortableHeader>
                          <SortableHeader field="category" sortState={articleSort} onSort={toggleArticleSort} className="hidden sm:table-cell">
                            Kategorie
                          </SortableHeader>
                          <SortableHeader field="price" sortState={articleSort} onSort={toggleArticleSort} className="text-right">
                            Preis
                          </SortableHeader>
                          <SortableHeader field="deposit" sortState={articleSort} onSort={toggleArticleSort} className="hidden md:table-cell">
                            Pfand
                          </SortableHeader>
                          <SortableHeader field="stock" sortState={articleSort} onSort={toggleArticleSort} className="hidden lg:table-cell">
                            Bestand
                          </SortableHeader>
                          <SortableHeader field="active" sortState={articleSort} onSort={toggleArticleSort} className="text-center">
                            Status
                          </SortableHeader>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedArticles.map(article => (
                          <TableRow key={article.id} className={isSoldOut(article) ? "opacity-50" : ""}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {article.name}
                                {isLowStock(article) && !isSoldOut(article) && (
                                  <Badge variant="outline" className="border-yellow-500 text-yellow-500 text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Knapp
                                  </Badge>
                                )}
                                {isSoldOut(article) && (
                                  <Badge variant="destructive" className="text-xs">
                                    Ausverkauft
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">
                                {article.category === "getraenke" ? "Getränke" : "Speisen"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {article.price.toFixed(2)} €
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <button className="cursor-pointer hover:opacity-80 transition-opacity">
                                    {article.deposit_group_id ? (
                                      <Badge variant="outline" className="border-green-500/50 text-green-500">
                                        {getDepositName(article.deposit_group_id)}
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="border-muted-foreground/50 text-muted-foreground">
                                        Pfand wählen
                                      </Badge>
                                    )}
                                  </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-48 p-2" align="start">
                                  <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground mb-2">Pfandgruppe:</p>
                                    <button
                                      className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between hover:bg-muted ${!article.deposit_group_id ? 'bg-muted' : ''}`}
                                      onClick={() => quickSetDeposit(article, null)}
                                    >
                                      <span className="text-muted-foreground">Kein Pfand</span>
                                      {!article.deposit_group_id && <Check className="w-4 h-4 text-primary" />}
                                    </button>
                                    {depositGroups.map(deposit => (
                                      <button
                                        key={deposit.id}
                                        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center justify-between hover:bg-green-500/10 ${article.deposit_group_id === deposit.id ? 'bg-green-500/10' : ''}`}
                                        onClick={() => quickSetDeposit(article, deposit.id)}
                                      >
                                        <span className="text-green-500">{deposit.name}</span>
                                        {article.deposit_group_id === deposit.id && <Check className="w-4 h-4 text-green-500" />}
                                      </button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell">
                              {article.track_stock ? (
                                <button
                                  onClick={() => openStockDialog(article)}
                                  className={`text-left hover:underline ${isLowStock(article) ? 'text-yellow-500' : isSoldOut(article) ? 'text-destructive' : 'text-secondary'}`}
                                >
                                  {formatStock(article)}
                                  <span className="text-muted-foreground text-xs ml-1">
                                    ({Math.round(getTotalStock(article))} VK)
                                  </span>
                                </button>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Switch
                                checked={article.active}
                                onCheckedChange={() => toggleActive(article)}
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {article.track_stock && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openStockDialog(article)}
                                    title="Bestand anpassen"
                                  >
                                    <Box className="w-4 h-4 text-secondary" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(article)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDelete(article.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === STOCK UNITS TAB === */}
          <TabsContent value="stock-units" className="space-y-4">
            {/* Filter Bar */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Einheit suchen..."
                      value={unitSearch}
                      onChange={(e) => setUnitSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={unitTypeFilter} onValueChange={setUnitTypeFilter}>
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Typ" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle Typen</SelectItem>
                      <SelectItem value="container">Gebinde (Kiste)</SelectItem>
                      <SelectItem value="barrel">Fass</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="ml-auto">
                    <Dialog open={isStockUnitDialogOpen} onOpenChange={(open) => {
                      setIsStockUnitDialogOpen(open);
                      if (!open) resetStockUnitForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button className="neon-secondary">
                          <Plus className="w-4 h-4 mr-2" />
                          Neue Einheit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="font-display uppercase">
                            {editingStockUnit ? "Einheit bearbeiten" : "Neue Einheit"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleStockUnitSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="unit-name">Name</Label>
                            <Input
                              id="unit-name"
                              value={stockUnitFormData.name}
                              onChange={(e) => setStockUnitFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="z.B. Kiste 24x0,5l"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label>Typ</Label>
                            <Select 
                              value={stockUnitFormData.unit_type} 
                              onValueChange={(value) => setStockUnitFormData(prev => ({ 
                                ...prev, 
                                unit_type: value,
                                large_unit_name: value === "container" ? "Kiste" : "Fass",
                                small_unit_name: value === "container" ? "Flasche" : "Glas",
                                loss_percent: value === "barrel" ? "7" : "0"
                              }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="container">
                                  <div className="flex items-center gap-2">
                                    <Wine className="w-4 h-4" />
                                    Gebinde (Kiste/Karton)
                                  </div>
                                </SelectItem>
                                <SelectItem value="barrel">
                                  <div className="flex items-center gap-2">
                                    <Beer className="w-4 h-4" />
                                    Fass (mit Schankverlust)
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Name Großeinheit</Label>
                              <Input
                                value={stockUnitFormData.large_unit_name}
                                onChange={(e) => setStockUnitFormData(prev => ({ ...prev, large_unit_name: e.target.value }))}
                                placeholder="z.B. Kiste"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Name Verkaufseinheit</Label>
                              <Input
                                value={stockUnitFormData.small_unit_name}
                                onChange={(e) => setStockUnitFormData(prev => ({ ...prev, small_unit_name: e.target.value }))}
                                placeholder="z.B. Flasche"
                              />
                            </div>
                          </div>

                          {stockUnitFormData.unit_type === "container" ? (
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                              <h4 className="font-medium flex items-center gap-2">
                                <Wine className="w-4 h-4" />
                                Gebinde-Einstellungen
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Stück pro Gebinde</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={stockUnitFormData.units_per_container}
                                    onChange={(e) => setStockUnitFormData(prev => ({ ...prev, units_per_container: e.target.value }))}
                                    placeholder="24"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Volumen/Stück (l)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={stockUnitFormData.volume_per_unit}
                                    onChange={(e) => setStockUnitFormData(prev => ({ ...prev, volume_per_unit: e.target.value }))}
                                    placeholder="0.5"
                                  />
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                = {stockUnitFormData.units_per_container || 0} {stockUnitFormData.small_unit_name} pro {stockUnitFormData.large_unit_name}
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                              <h4 className="font-medium flex items-center gap-2">
                                <Beer className="w-4 h-4" />
                                Fass-Einstellungen
                              </h4>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Fassvolumen (Liter)</Label>
                                  <Input
                                    type="number"
                                    step="1"
                                    min="1"
                                    value={stockUnitFormData.total_volume_liters}
                                    onChange={(e) => setStockUnitFormData(prev => ({ ...prev, total_volume_liters: e.target.value }))}
                                    placeholder="30"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Ausschank (Liter)</Label>
                                  <Input
                                    type="number"
                                    step="0.1"
                                    min="0.1"
                                    value={stockUnitFormData.serving_size_liters}
                                    onChange={(e) => setStockUnitFormData(prev => ({ ...prev, serving_size_liters: e.target.value }))}
                                    placeholder="0.5"
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                  <TrendingDown className="w-4 h-4 text-yellow-500" />
                                  Schankverlust (%)
                                </Label>
                                <Input
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  max="30"
                                  value={stockUnitFormData.loss_percent}
                                  onChange={(e) => setStockUnitFormData(prev => ({ ...prev, loss_percent: e.target.value }))}
                                  placeholder="7"
                                />
                              </div>
                              <p className="text-sm text-muted-foreground">
                                = ~{Math.round((parseFloat(stockUnitFormData.total_volume_liters) || 0) * (1 - (parseFloat(stockUnitFormData.loss_percent) || 0) / 100) / (parseFloat(stockUnitFormData.serving_size_liters) || 0.5))} {stockUnitFormData.small_unit_name} pro {stockUnitFormData.large_unit_name}
                              </p>
                            </div>
                          )}

                          <Button type="submit" className="w-full neon-secondary">
                            {editingStockUnit ? "Aktualisieren" : "Erstellen"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Units Table */}
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {filteredAndSortedUnits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Box className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Einheiten gefunden</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader field="name" sortState={unitSort} onSort={toggleUnitSort}>
                            Name
                          </SortableHeader>
                          <SortableHeader field="type" sortState={unitSort} onSort={toggleUnitSort}>
                            Typ
                          </SortableHeader>
                          <SortableHeader field="units" sortState={unitSort} onSort={toggleUnitSort} className="text-right">
                            VK/Einheit
                          </SortableHeader>
                          <SortableHeader field="loss" sortState={unitSort} onSort={toggleUnitSort} className="text-right hidden sm:table-cell">
                            Verlust
                          </SortableHeader>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedUnits.map(unit => (
                          <TableRow key={unit.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                {unit.unit_type === "barrel" ? (
                                  <Beer className="w-4 h-4 text-amber-500" />
                                ) : (
                                  <Wine className="w-4 h-4 text-blue-500" />
                                )}
                                {unit.name}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {unit.unit_type === "barrel" ? "Fass" : "Gebinde"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              {Math.round(unit.sales_units_per_large)} {unit.small_unit_name}/{unit.large_unit_name}
                            </TableCell>
                            <TableCell className="text-right hidden sm:table-cell">
                              {unit.unit_type === "barrel" && unit.loss_percent > 0 ? (
                                <span className="text-yellow-500">{unit.loss_percent}%</span>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditStockUnit(unit)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteStockUnit(unit.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* === DEPOSIT TAB === */}
          <TabsContent value="deposit" className="space-y-4">
            {/* Filter Bar */}
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Pfandgruppe suchen..."
                      value={depositSearch}
                      onChange={(e) => setDepositSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <div className="ml-auto">
                    <Dialog open={isDepositDialogOpen} onOpenChange={(open) => {
                      setIsDepositDialogOpen(open);
                      if (!open) resetDepositForm();
                    }}>
                      <DialogTrigger asChild>
                        <Button className="neon-success">
                          <Plus className="w-4 h-4 mr-2" />
                          Neue Pfandgruppe
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border max-w-md">
                        <DialogHeader>
                          <DialogTitle className="font-display uppercase">
                            {editingDeposit ? "Pfandgruppe bearbeiten" : "Neue Pfandgruppe"}
                          </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleDepositSubmit} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="deposit-name">Name</Label>
                            <Input
                              id="deposit-name"
                              value={depositFormData.name}
                              onChange={(e) => setDepositFormData(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="z.B. Glas 0,5l"
                              required
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="deposit-amount">Pfandbetrag (€)</Label>
                            <Input
                              id="deposit-amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={depositFormData.amount}
                              onChange={(e) => setDepositFormData(prev => ({ ...prev, amount: e.target.value }))}
                              placeholder="2.00"
                              required
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="deposit-active">Aktiv</Label>
                            <Switch
                              id="deposit-active"
                              checked={depositFormData.active}
                              onCheckedChange={(checked) => setDepositFormData(prev => ({ ...prev, active: checked }))}
                            />
                          </div>
                          <Button type="submit" className="w-full neon-success">
                            {editingDeposit ? "Aktualisieren" : "Erstellen"}
                          </Button>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Deposits Table */}
            <Card className="bg-card border-border">
              <CardContent className="p-0">
                {filteredAndSortedDeposits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Coins className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Keine Pfandgruppen gefunden</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <SortableHeader field="name" sortState={depositSort} onSort={toggleDepositSort}>
                            Name
                          </SortableHeader>
                          <SortableHeader field="amount" sortState={depositSort} onSort={toggleDepositSort} className="text-right">
                            Betrag
                          </SortableHeader>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Aktionen</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredAndSortedDeposits.map(deposit => (
                          <TableRow key={deposit.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-green-500" />
                                {deposit.name}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-500">
                              {deposit.amount.toFixed(2)} €
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={deposit.active ? "default" : "secondary"}>
                                {deposit.active ? "Aktiv" : "Inaktiv"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditDeposit(deposit)}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive"
                                  onClick={() => handleDeleteDeposit(deposit.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Stock Adjustment Dialog */}
        <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display uppercase">
                Bestand anpassen
              </DialogTitle>
            </DialogHeader>
            {stockArticle && (
              <form onSubmit={handleStockSubmit} className="space-y-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium">{stockArticle.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Aktuell: {formatStock(stockArticle)} ({Math.round(getTotalStock(stockArticle))} VK-Einheiten)
                  </p>
                </div>

                {(() => {
                  const unit = getStockUnit(stockArticle.stock_unit_id);
                  return unit ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{unit.large_unit_name}n</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={stockFormData.large_units}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, large_units: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{unit.small_unit_name}n (lose)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={stockFormData.small_units}
                          onChange={(e) => setStockFormData(prev => ({ ...prev, small_units: e.target.value }))}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label>Stückzahl</Label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={stockFormData.small_units}
                        onChange={(e) => setStockFormData(prev => ({ ...prev, small_units: e.target.value }))}
                      />
                    </div>
                  );
                })()}

                <div className="flex items-center gap-2 p-3 bg-secondary/10 rounded-lg">
                  <Switch
                    id="set_initial"
                    checked={stockFormData.set_as_initial}
                    onCheckedChange={(checked) => setStockFormData(prev => ({ ...prev, set_as_initial: checked }))}
                  />
                  <Label htmlFor="set_initial" className="text-sm">
                    Als Anfangsbestand setzen (für Statistik)
                  </Label>
                </div>

                <Button type="submit" className="w-full neon-secondary">
                  Bestand speichern
                </Button>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
