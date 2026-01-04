import { useState, useEffect } from "react";
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
import { ArrowLeft, Plus, Pencil, Trash2, Package, Coins, Check, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ArticleManagement() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [depositGroups, setDepositGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [editingDeposit, setEditingDeposit] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "getraenke",
    deposit_group_id: "",
    active: true
  });
  const [depositFormData, setDepositFormData] = useState({
    name: "",
    amount: "",
    active: true
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
      const [articlesRes, depositsRes] = await Promise.all([
        axios.get(`${API}/articles`),
        axios.get(`${API}/deposit-groups`)
      ]);
      setArticles(articlesRes.data);
      setDepositGroups(depositsRes.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price),
        deposit_group_id: formData.deposit_group_id || null
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

  const handleEdit = (article) => {
    setEditingArticle(article);
    setFormData({
      name: article.name,
      price: article.price.toString(),
      category: article.category,
      deposit_group_id: article.deposit_group_id || "",
      active: article.active
    });
    setIsDialogOpen(true);
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
      active: true
    });
  };

  const resetDepositForm = () => {
    setEditingDeposit(null);
    setDepositFormData({
      name: "",
      amount: "",
      active: true
    });
  };

  const getDepositName = (depositId) => {
    const deposit = depositGroups.find(d => d.id === depositId);
    return deposit ? `${deposit.name} (${deposit.amount.toFixed(2)}€)` : "-";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/admin")}
            data-testid="back-btn"
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
        <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
          <Dialog open={isDepositDialogOpen} onOpenChange={(open) => {
            setIsDepositDialogOpen(open);
            if (!open) resetDepositForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-none" data-testid="add-deposit-btn">
                <Coins className="w-4 h-4 mr-2" />
                Pfandgruppe
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
                <Button type="submit" className="w-full neon-primary">
                  {editingDeposit ? "Aktualisieren" : "Erstellen"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="flex-1 sm:flex-none neon-primary" data-testid="add-article-btn">
                <Plus className="w-4 h-4 mr-2" />
                Artikel
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-card border-border max-w-md">
              <DialogHeader>
                <DialogTitle className="font-display uppercase">
                  {editingArticle ? "Artikel bearbeiten" : "Neuer Artikel"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="z.B. Bier 0,5l"
                    data-testid="article-name-input"
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
                    data-testid="article-price-input"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Kategorie</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger data-testid="article-category-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="getraenke">Getränke</SelectItem>
                      <SelectItem value="speisen">Speisen</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit">Pfandgruppe (optional)</Label>
                  <Select 
                    value={formData.deposit_group_id || "none"} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, deposit_group_id: value === "none" ? "" : value }))}
                  >
                    <SelectTrigger data-testid="article-deposit-select">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Aktiv</Label>
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
                    data-testid="article-active-switch"
                  />
                </div>
                <Button type="submit" className="w-full neon-primary" data-testid="save-article-btn">
                  {editingArticle ? "Aktualisieren" : "Erstellen"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        {/* Deposit Groups */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display uppercase flex items-center gap-2">
              <Coins className="w-5 h-5 text-green-500" />
              Pfandgruppen ({depositGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {depositGroups.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">
                Keine Pfandgruppen vorhanden
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {depositGroups.map(deposit => (
                  <div 
                    key={deposit.id}
                    className="flex items-center justify-between p-3 rounded-sm bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{deposit.name}</p>
                      <p className="font-mono text-green-500">{deposit.amount.toFixed(2)} €</p>
                    </div>
                    <div className="flex gap-1">
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
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Articles */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display uppercase">
              Artikel ({articles.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Laden...
              </div>
            ) : articles.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Artikel vorhanden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Kategorie</TableHead>
                      <TableHead className="text-right">Preis</TableHead>
                      <TableHead className="hidden md:table-cell">Pfand</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {articles.map(article => (
                      <TableRow key={article.id} data-testid={`article-row-${article.id}`}>
                        <TableCell className="font-medium">{article.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {article.category === "getraenke" ? "Getränke" : "Speisen"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {article.price.toFixed(2)} €
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {article.deposit_group_id ? (
                            <Badge variant="outline" className="border-green-500/50 text-green-500">
                              {getDepositName(article.deposit_group_id)}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={article.active}
                            onCheckedChange={() => toggleActive(article)}
                            data-testid={`toggle-active-${article.id}`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(article)}
                              data-testid={`edit-article-${article.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(article.id)}
                              data-testid={`delete-article-${article.id}`}
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
      </main>
    </div>
  );
}
