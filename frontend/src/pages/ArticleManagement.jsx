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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Pencil, Trash2, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ArticleManagement() {
  const navigate = useNavigate();
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "getraenke",
    active: true
  });

  const auth = sessionStorage.getItem("adminAuth");

  useEffect(() => {
    if (!auth) {
      navigate("/admin/login");
      return;
    }
    fetchArticles();
  }, [auth, navigate]);

  const fetchArticles = async () => {
    try {
      const response = await axios.get(`${API}/articles`);
      setArticles(response.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Artikel");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
        price: parseFloat(formData.price)
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
      fetchArticles();
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
      fetchArticles();
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
      fetchArticles();
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
      active: true
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-6 py-4 flex items-center gap-4">
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
          <h1 className="font-display text-xl font-bold uppercase tracking-tight">
            Artikelverwaltung
          </h1>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="ml-auto neon-primary" data-testid="add-article-btn">
              <Plus className="w-4 h-4 mr-2" />
              Neuer Artikel
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border">
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
      </header>

      <main className="p-6 max-w-6xl mx-auto">
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Kategorie</TableHead>
                    <TableHead className="text-right">Preis</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {articles.map(article => (
                    <TableRow key={article.id} data-testid={`article-row-${article.id}`}>
                      <TableCell className="font-medium">{article.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {article.category === "getraenke" ? "Getränke" : "Speisen"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {article.price.toFixed(2)} €
                      </TableCell>
                      <TableCell className="text-center">
                        <Switch
                          checked={article.active}
                          onCheckedChange={() => toggleActive(article)}
                          data-testid={`toggle-active-${article.id}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
