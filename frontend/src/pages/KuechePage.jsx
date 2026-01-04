import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Clock, Hammer, Check, RefreshCw, ListOrdered, Star, CheckCircle2, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Fullscreen utility functions
const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen?.() || 
    document.documentElement.webkitRequestFullscreen?.() ||
    document.documentElement.mozRequestFullScreen?.();
  } else {
    document.exitFullscreen?.() || 
    document.webkitExitFullscreen?.() ||
    document.mozCancelFullScreen?.();
  }
};

// Web Audio API for reliable sound playback
const createBingSound = (audioContext) => {
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
  oscillator.frequency.setValueAtTime(1100, audioContext.currentTime + 0.1); // Higher
  oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.2); // Back
  
  gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
  
  oscillator.start(audioContext.currentTime);
  oscillator.stop(audioContext.currentTime + 0.5);
};

export default function KuechePage() {
  const { standId, standType, stationId } = useParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [standInfo, setStandInfo] = useState(null);
  const [stationInfo, setStationInfo] = useState(null);
  const [kitchenSummary, setKitchenSummary] = useState({ total_items: {}, total_orders: 0 });
  const [isLoading, setIsLoading] = useState(false);
  
  // Sound & Fullscreen state
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('macher_sound_enabled');
    return saved !== null ? saved === 'true' : true; // Default: on
  });
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const previousOrderCount = useRef(0);
  const audioContextRef = useRef(null);
  const wakeLockRef = useRef(null);

  // Initialize AudioContext on first user interaction
  const unlockAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }
    setAudioUnlocked(true);
  }, []);

  // Save sound preference
  useEffect(() => {
    localStorage.setItem('macher_sound_enabled', soundEnabled.toString());
  }, [soundEnabled]);

  // Play notification sound when orders go from 0 to 1+
  const playNotificationSound = useCallback(() => {
    if (soundEnabled && audioContextRef.current && audioUnlocked) {
      try {
        createBingSound(audioContextRef.current);
        console.log('Bing sound played!');
      } catch (e) {
        console.log('Audio play failed:', e);
      }
    }
  }, [soundEnabled, audioUnlocked]);

  // Unlock audio on any user interaction
  useEffect(() => {
    const handleInteraction = () => {
      unlockAudio();
      // Remove listeners after first interaction
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
    
    document.addEventListener('click', handleInteraction);
    document.addEventListener('touchstart', handleInteraction);
    
    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('touchstart', handleInteraction);
    };
  }, [unlockAudio]);

  // Track fullscreen state and Wake Lock
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      setIsFullscreen(isFs);
      
      // Wake Lock: Keep screen awake in fullscreen
      if (isFs && 'wakeLock' in navigator) {
        navigator.wakeLock.request('screen')
          .then(lock => {
            wakeLockRef.current = lock;
            console.log('Wake Lock activated');
          })
          .catch(e => console.log('Wake Lock failed:', e));
      } else if (!isFs && wakeLockRef.current) {
        wakeLockRef.current.release();
        wakeLockRef.current = null;
        console.log('Wake Lock released');
      }
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      // Release wake lock on unmount
      if (wakeLockRef.current) {
        wakeLockRef.current.release();
      }
    };
  }, []);
  
  // Track marked items per order (local state only - just for visual help)
  const [markedItems, setMarkedItems] = useState({}); // { orderId: { itemIndex: true } }

  // Toggle item marked state (visual only)
  const toggleItemMarked = (orderId, itemIndex) => {
    setMarkedItems(prev => ({
      ...prev,
      [orderId]: {
        ...(prev[orderId] || {}),
        [itemIndex]: !(prev[orderId]?.[itemIndex])
      }
    }));
  };

  // Check if item is marked
  const isItemMarked = (orderId, itemIndex) => {
    return markedItems[orderId]?.[itemIndex] || false;
  };

  // Clear marked items for an order when it's completed
  const clearMarkedItems = (orderId) => {
    setMarkedItems(prev => {
      const newState = { ...prev };
      delete newState[orderId];
      return newState;
    });
  };

  const fetchData = useCallback(async () => {
    try {
      // Fetch different data based on whether we're in station mode
      const summaryUrl = stationId 
        ? `${API}/stands/${standId}/kitchen-summary?station_id=${stationId}`
        : `${API}/stands/${standId}/kitchen-summary`;
      
      const requests = [
        axios.get(`${API}/stands/${standId}`),
        axios.get(summaryUrl)
      ];
      
      // If station mode, fetch station-specific orders
      if (stationId) {
        requests.push(axios.get(`${API}/stands/${standId}/station/${stationId}/orders`));
        requests.push(axios.get(`${API}/stations`).then(res => 
          res.data.find(s => s.id === stationId)
        ));
      } else {
        requests.push(axios.get(`${API}/orders?stand_id=${standId}`));
      }
      
      const results = await Promise.all(requests);
      const [standRes, summaryRes, ordersData, station] = results;
      
      let newOrders = [];
      if (stationId) {
        // Station mode: orders already filtered
        newOrders = ordersData.data || [];
        setOrders(newOrders);
        setStationInfo(station || null);
      } else {
        // Regular mode: filter for created and in_progress orders
        newOrders = (ordersData.data || []).filter(
          o => o.status === "created" || o.status === "in_progress"
        );
        setOrders(newOrders);
      }
      
      // Play sound if orders went from 0 to 1+
      if (previousOrderCount.current === 0 && newOrders.length > 0) {
        playNotificationSound();
      }
      previousOrderCount.current = newOrders.length;
      
      setStandInfo(standRes.data);
      setKitchenSummary(summaryRes.data);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [standId, stationId, playNotificationSound]);

  useEffect(() => {
    fetchData();
    
    // WebSocket for real-time updates (primary)
    const wsUrl = `${process.env.REACT_APP_BACKEND_URL?.replace('http', 'ws')}/api/ws/${standId}`;
    let ws = null;
    let reconnectTimeout = null;
    
    const connectWebSocket = () => {
      try {
        ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('WebSocket connected');
        };
        
        ws.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'order_created' || data.type === 'order_updated') {
            // Refresh data when order changes
            fetchData();
          }
        };
        
        ws.onclose = () => {
          // Reconnect after 5 seconds
          reconnectTimeout = setTimeout(connectWebSocket, 5000);
        };
        
        ws.onerror = () => {
          ws?.close();
        };
      } catch (e) {
        console.log('WebSocket not available, using polling');
      }
    };
    
    connectWebSocket();
    
    // Fallback polling every 10 seconds (reduced from 3s)
    const interval = setInterval(fetchData, 10000);
    
    return () => {
      clearInterval(interval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, [fetchData, standId]);

  // Handle completing order for a station
  const handleStationComplete = async (orderId) => {
    setIsLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}/station-complete`, {
        station_id: stationId,
        updated_by: stationInfo?.name || "Macher"
      });
      toast.success("Station fertig!");
      clearMarkedItems(orderId);
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    // If in station mode, use station-specific completion
    if (stationId && newStatus === "ready") {
      return handleStationComplete(orderId);
    }
    
    setIsLoading(true);
    try {
      await axios.put(`${API}/orders/${orderId}/status`, {
        status: newStatus,
        updated_by: stationInfo?.name || "Macher"
      });
      toast.success(
        newStatus === "in_progress" 
          ? "Bestellung wird zubereitet" 
          : "Bestellung ist fertig!"
      );
      clearMarkedItems(orderId);
      fetchData();
    } catch (error) {
      toast.error("Fehler beim Aktualisieren");
    } finally {
      setIsLoading(false);
    }
  };

  const getTimeDiff = (createdAt) => {
    const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000 / 60);
    return diff;
  };

  // Get items for display - in station mode, only show station-relevant items
  const getDisplayItems = (order) => {
    if (stationId && order.station_items) {
      return order.station_items.filter(i => !i.is_deposit_return);
    }
    // In normal mode, show main items (not linked articles, those are shown smaller)
    return order.items.filter(i => !i.is_deposit_return && !i.is_linked_article);
  };

  // Get linked items for display (shown smaller)
  const getLinkedItems = (order) => {
    if (stationId) return []; // Station mode shows its own items
    return order.items.filter(i => i.is_linked_article);
  };

  const createdOrders = orders.filter(o => o.status === "created");
  // No more in_progress state needed - orders go directly from "created" to "ready"

  return (
    <div className="min-h-screen bg-background">
      <header className="glass sticky top-0 z-50 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate("/")}
            data-testid="back-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-3">
            <Hammer className="w-5 sm:w-6 h-5 sm:h-6 text-secondary" />
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold uppercase tracking-tight">
                {stationInfo ? stationInfo.name : "Macher"}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {standInfo?.name}
                {stationInfo?.is_main && (
                  <span className="ml-2 text-yellow-500">★ Hauptstation</span>
                )}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto sm:ml-auto">
          {/* Sound Toggle */}
          <Button
            variant={soundEnabled ? "default" : "outline"}
            size="icon"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`shrink-0 ${soundEnabled ? 'bg-green-600 hover:bg-green-700' : ''}`}
            title={soundEnabled ? "Ton aus" : "Ton an"}
            data-testid="sound-toggle"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
          
          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleFullscreen}
            className="shrink-0"
            title={isFullscreen ? "Vollbild beenden" : "Vollbild"}
            data-testid="fullscreen-toggle"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            data-testid="refresh-btn"
            className="ml-auto sm:ml-0"
          >
            <RefreshCw className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Aktualisieren</span>
          </Button>
        </div>
      </header>

      <main className="p-4 sm:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Incoming Orders - Show "Fertig" button directly */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-base sm:text-lg font-bold uppercase">Bestellungen</h2>
              <Badge variant="secondary" className="neon-secondary">
                {createdOrders.length}
              </Badge>
            </div>
            <ScrollArea className="h-[calc(100vh-250px)] sm:h-[calc(100vh-200px)]">
              <div className="space-y-3 sm:space-y-4 pr-2 sm:pr-4">
                {createdOrders.length === 0 ? (
                  <Card className="bg-card border-dashed">
                    <CardContent className="p-6 sm:p-8 text-center text-muted-foreground text-sm">
                      Keine neuen Bestellungen
                    </CardContent>
                  </Card>
                ) : (
                  createdOrders.map(order => (
                    <Card 
                      key={order.id} 
                      className="bg-card border-secondary/30"
                      data-testid={`order-created-${order.id}`}
                    >
                      <CardHeader className="pb-2 p-3 sm:p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-primary/30 border-4 border-primary flex items-center justify-center">
                              <span className="font-mono text-4xl sm:text-5xl font-black text-primary">
                                {order.order_number.toString().padStart(2, '0')}
                              </span>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-1">Bonnummer</p>
                              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                                <Clock className="w-3 sm:w-4 h-3 sm:h-4" />
                                <span>{getTimeDiff(order.created_at)} Min.</span>
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-500 border-yellow-500">Neu</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4 pt-0">
                        {/* Hauptartikel - groß und klickbar */}
                        <div className="space-y-2 mb-2">
                          {getDisplayItems(order).map((item, idx) => (
                            <div 
                              key={idx} 
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleItemMarked(order.id, `main-${idx}`);
                              }}
                              className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all
                                ${isItemMarked(order.id, `main-${idx}`) 
                                  ? 'bg-green-500/30 border-2 border-green-500' 
                                  : 'bg-secondary/20 border border-secondary/30 hover:bg-secondary/30'}`}
                            >
                              <div className="flex items-center gap-2">
                                {isItemMarked(order.id, `main-${idx}`) && (
                                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
                                )}
                                <span className={`font-bold text-base sm:text-lg ${isItemMarked(order.id, `main-${idx}`) ? 'line-through text-muted-foreground' : ''}`}>
                                  {item.article_name}
                                </span>
                              </div>
                              <div className={`flex items-center justify-center min-w-[60px] h-12 rounded-lg ${isItemMarked(order.id, `main-${idx}`) ? 'bg-green-500/50' : 'bg-secondary'} text-secondary-foreground`}>
                                <span className="font-mono text-2xl font-black">{item.quantity}x</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Verknüpfte Artikel - klein und klickbar */}
                        {getLinkedItems(order).length > 0 && (
                          <div className="space-y-1 mb-4 pl-4 border-l-2 border-muted">
                            <p className="text-xs text-muted-foreground uppercase tracking-wide">+ Beilagen</p>
                            {getLinkedItems(order).map((item, idx) => (
                              <div 
                                key={idx}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleItemMarked(order.id, `linked-${idx}`);
                                }}
                                className={`flex items-center justify-between py-1 px-2 rounded text-sm cursor-pointer transition-all
                                  ${isItemMarked(order.id, `linked-${idx}`) 
                                    ? 'bg-green-500/20 border border-green-500/50' 
                                    : 'bg-muted/30 hover:bg-muted/50'}`}
                              >
                                <div className="flex items-center gap-1">
                                  {isItemMarked(order.id, `linked-${idx}`) && (
                                    <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />
                                  )}
                                  <span className={`${isItemMarked(order.id, `linked-${idx}`) ? 'line-through text-muted-foreground' : 'text-muted-foreground'}`}>
                                    {item.article_name}
                                  </span>
                                </div>
                                <span className="font-mono text-muted-foreground">{item.quantity}x</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {/* "Fertig" button */}
                        <Button
                          className="w-full h-14 bg-green-600 hover:bg-green-700 neon-success text-base font-bold"
                          onClick={() => updateOrderStatus(order.id, "ready")}
                          disabled={isLoading}
                          data-testid={`finish-order-${order.id}`}
                        >
                          <Check className="w-5 h-5 mr-2" />
                          {stationId ? "Station Fertig" : "Fertig"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Kitchen Summary - Total Open Items */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-display text-base sm:text-lg font-bold uppercase">Gesamt Offen</h2>
              <Badge variant="outline" className="border-accent text-accent">
                {kitchenSummary.total_orders} Bestellungen
              </Badge>
            </div>
            <Card className="bg-card border-accent/30">
              <CardHeader className="p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <ListOrdered className="w-5 h-5 text-accent" />
                  <CardTitle className="font-display text-base uppercase">
                    Zu Produzieren
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                {Object.keys(kitchenSummary.total_items).length === 0 ? (
                  <p className="text-muted-foreground text-center py-6 text-sm">
                    Alles erledigt! 🎉
                  </p>
                ) : (
                  <ScrollArea className="h-[calc(100vh-350px)] sm:h-[calc(100vh-300px)]">
                    <div className="space-y-3 pr-2">
                      {Object.entries(kitchenSummary.total_items).map(([name, qty]) => (
                        <div 
                          key={name}
                          className="flex items-center justify-between p-4 rounded-lg bg-accent/20 border-2 border-accent/40"
                        >
                          <span className="font-bold text-lg sm:text-xl">{name}</span>
                          <div className="flex items-center justify-center min-w-[80px] h-14 rounded-lg bg-accent text-accent-foreground">
                            <span className="font-mono text-3xl font-black">{qty}x</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
