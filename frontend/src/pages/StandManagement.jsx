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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Pencil, Trash2, Store, Settings } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function StandManagement() {
  const navigate = useNavigate();
  const [stands, setStands] = useState([]);
  const [articles, setArticles] = useState([]);
  const [standTypes, setStandTypes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isArticleDialogOpen, setIsArticleDialogOpen] = useState(false);
  const [editingStand, setEditingStand] = useState(null);
  const [selectedStandForArticles, setSelectedStandForArticles] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    stand_type: "gemischt",
    skip_preparation: false
  });
  const [selectedArticles, setSelectedArticles] = useState([]);

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
      const [standsRes, articlesRes, typesRes] = await Promise.all([
        axios.get(`${API}/stands`),
        axios.get(`${API}/articles`),
        axios.get(`${API}/stand-types`)
      ]);
      setStands(standsRes.data);
      setArticles(articlesRes.data);
      setStandTypes(typesRes.data);
    } catch (error) {
      toast.error("Fehler beim Laden der Daten");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      if (editingStand) {
        await axios.put(`${API}/stands/${editingStand.id}`, formData, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Stand aktualisiert");
      } else {
        await axios.post(`${API}/stands`, formData, {
          headers: { Authorization: `Basic ${auth}` }
        });
        toast.success("Stand erstellt");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  const handleEdit = (stand) => {
    setEditingStand(stand);
    setFormData({
      name: stand.name,
      stand_type: stand.stand_type || "gemischt",
      skip_preparation: stand.skip_preparation || false
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (standId) => {
    if (!window.confirm("Stand wirklich löschen?")) return;

    try {
      await axios.delete(`${API}/stands/${standId}`, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Stand gelöscht");
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Löschen");
    }
  };

  const openArticleDialog = (stand) => {
    setSelectedStandForArticles(stand);
    setSelectedArticles(stand.articles || []);
    setIsArticleDialogOpen(true);
  };

  const toggleArticle = (articleId) => {
    setSelectedArticles(prev => {
      if (prev.includes(articleId)) {
        return prev.filter(id => id !== articleId);
      } else {
        return [...prev, articleId];
      }
    });
  };

  const saveArticleAssignment = async () => {
    try {
      await axios.put(`${API}/stands/${selectedStandForArticles.id}`, {
        articles: selectedArticles
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      toast.success("Artikel zugewiesen");
      setIsArticleDialogOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Speichern");
    }
  };

  const toggleSkipPreparation = async (stand) => {
    try {
      await axios.put(`${API}/stands/${stand.id}`, {
        skip_preparation: !stand.skip_preparation
      }, {
        headers: { Authorization: `Basic ${auth}` }
      });
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    }
  };

  const resetForm = () => {
    setEditingStand(null);
    setFormData({
      name: "",
      stand_type: "gemischt",
      skip_preparation: false
    });
  };

  const getStandTypeName = (typeId) => {
    const type = standTypes.find(t => t.id === typeId);
    return type?.name || typeId;
  };

  // Filter articles by stand type
  const getFilteredArticles = () => {
    if (!selectedStandForArticles) return articles;
    const standType = standTypes.find(t => t.id === selectedStandForArticles.stand_type);
    if (!standType) return articles;
    return articles.filter(a => standType.categories.includes(a.category));
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
            <Store className="w-6 h-6 text-primary" />
            <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
              Standverwaltung
            </h1>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto sm:ml-auto neon-primary" data-testid="add-stand-btn">
              <Plus className="w-4 h-4 mr-2" />
              Neuer Stand
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border max-w-md">
            <DialogHeader>
              <DialogTitle className="font-display uppercase">
                {editingStand ? "Stand bearbeiten" : "Neuer Stand"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="z.B. Hauptbühne"
                  data-testid="stand-name-input"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stand_type">Standtyp</Label>
                <Select 
                  value={formData.stand_type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, stand_type: value }))}
                >
                  <SelectTrigger data-testid="stand-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {standTypes.map(type => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="skip_preparation">Zubereitung überspringen</Label>
                  <p className="text-xs text-muted-foreground">
                    Bestellungen gehen direkt auf "Fertig"
                  </p>
                </div>
                <Switch
                  id="skip_preparation"
                  checked={formData.skip_preparation}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, skip_preparation: checked }))}
                  data-testid="skip-prep-switch"
                />
              </div>
              <Button type="submit" className="w-full neon-primary" data-testid="save-stand-btn">
                {editingStand ? "Aktualisieren" : "Erstellen"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      <main className="p-4 sm:p-6 max-w-6xl mx-auto">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="font-display uppercase">
              Stände ({stands.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">
                Laden...
              </div>
            ) : stands.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Keine Stände vorhanden
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden sm:table-cell">Typ</TableHead>
                      <TableHead className="hidden md:table-cell">Artikel</TableHead>
                      <TableHead className="text-center">Zubereitung</TableHead>
                      <TableHead className="text-right">Aktionen</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stands.map(stand => (
                      <TableRow key={stand.id} data-testid={`stand-row-${stand.id}`}>
                        <TableCell className="font-medium">{stand.name}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline">
                            {getStandTypeName(stand.stand_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openArticleDialog(stand)}
                            data-testid={`assign-articles-${stand.id}`}
                          >
                            {stand.articles?.length || 0} Artikel
                          </Button>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Switch
                              checked={stand.skip_preparation || false}
                              onCheckedChange={() => toggleSkipPreparation(stand)}
                              data-testid={`toggle-skip-${stand.id}`}
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">
                              {stand.skip_preparation ? "Überspringen" : "Normal"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1 sm:gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openArticleDialog(stand)}
                              className="md:hidden"
                              data-testid={`assign-articles-mobile-${stand.id}`}
                            >
                              <Settings className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(stand)}
                              data-testid={`edit-stand-${stand.id}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-destructive"
                              onClick={() => handleDelete(stand.id)}
                              data-testid={`delete-stand-${stand.id}`}
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

        {/* Article Assignment Dialog */}
        <Dialog open={isArticleDialogOpen} onOpenChange={setIsArticleDialogOpen}>
          <DialogContent className="bg-card border-border max-w-lg max-h-[80vh]">
            <DialogHeader>
              <DialogTitle className="font-display uppercase">
                Artikel für {selectedStandForArticles?.name}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                Typ: {getStandTypeName(selectedStandForArticles?.stand_type)}
                {selectedArticles.length === 0 && " • Alle Artikel werden angezeigt wenn nichts ausgewählt"}
              </p>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="space-y-2">
                {getFilteredArticles().map(article => (
                  <div 
                    key={article.id}
                    className="flex items-center gap-3 p-3 rounded-sm bg-muted/50 hover:bg-muted cursor-pointer"
                    onClick={() => toggleArticle(article.id)}
                  >
                    <Checkbox 
                      checked={selectedArticles.includes(article.id)}
                      onCheckedChange={() => toggleArticle(article.id)}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{article.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {article.price.toFixed(2)} € • {article.category === "getraenke" ? "Getränk" : "Speise"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSelectedArticles([])}
              >
                Alle abwählen
              </Button>
              <Button
                className="flex-1 neon-primary"
                onClick={saveArticleAssignment}
              >
                Speichern ({selectedArticles.length})
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
