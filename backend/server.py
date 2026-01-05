from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict
import uuid
from datetime import datetime, timezone
import secrets
import json
import asyncio

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB Connection with optimized pool settings for concurrent users
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(
    mongo_url,
    maxPoolSize=50,  # Support up to 50 concurrent connections
    minPoolSize=10,  # Keep 10 connections ready
    maxIdleTimeMS=30000,  # Close idle connections after 30s
    serverSelectionTimeoutMS=5000,  # 5s timeout for server selection
    connectTimeoutMS=10000,  # 10s connection timeout
    retryWrites=True,  # Automatically retry failed writes
)
db = client[os.environ['DB_NAME']]

app = FastAPI(
    title="Karnbachs Event OS",
    description="Festival Order Management System",
    version="1.0.0"
)
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# Performance: Create database indexes on startup
async def create_indexes():
    """Create indexes for better query performance with many concurrent users"""
    try:
        # Orders collection - most queried
        await db.orders.create_index("stand_id")
        await db.orders.create_index("status")
        await db.orders.create_index([("stand_id", 1), ("status", 1)])
        await db.orders.create_index("order_number")
        await db.orders.create_index("created_at")
        await db.orders.create_index([("stand_id", 1), ("created_at", -1)])
        
        # Articles collection
        await db.articles.create_index("active")
        await db.articles.create_index("category")
        await db.articles.create_index("track_stock")
        
        # Stands collection
        await db.stands.create_index("active")
        
        # Stations collection
        await db.stations.create_index("stand_id")
        await db.stations.create_index([("stand_id", 1), ("active", 1)])
        
        # Linked articles collection
        await db.linked_articles.create_index("main_article_id")
        await db.linked_articles.create_index("station_id")
        
        # Stock units collection
        await db.stock_units.create_index("active")
        
        logging.info("Database indexes created successfully")
    except Exception as e:
        logging.error(f"Error creating indexes: {e}")

# WebSocket Connection Manager - Optimized for many concurrent connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self._lock = asyncio.Lock()  # Thread-safe operations
    
    async def connect(self, websocket: WebSocket, stand_id: str):
        await websocket.accept()
        async with self._lock:
            if stand_id not in self.active_connections:
                self.active_connections[stand_id] = []
            self.active_connections[stand_id].append(websocket)
        logging.info(f"WebSocket connected: stand={stand_id}, total_connections={self.get_connection_count()}")
    
    async def disconnect(self, websocket: WebSocket, stand_id: str):
        async with self._lock:
            if stand_id in self.active_connections:
                if websocket in self.active_connections[stand_id]:
                    self.active_connections[stand_id].remove(websocket)
        logging.info(f"WebSocket disconnected: stand={stand_id}, total_connections={self.get_connection_count()}")
    
    def get_connection_count(self):
        return sum(len(conns) for conns in self.active_connections.values())
    
    async def broadcast_to_stand(self, stand_id: str, message: dict):
        if stand_id not in self.active_connections:
            return
        
        # Copy list to avoid modification during iteration
        connections = self.active_connections[stand_id].copy()
        dead_connections = []
        
        # Send to all connections concurrently
        async def send_to_connection(conn):
            try:
                await asyncio.wait_for(conn.send_json(message), timeout=5.0)
            except Exception:
                dead_connections.append(conn)
        
        await asyncio.gather(*[send_to_connection(conn) for conn in connections], return_exceptions=True)
        
        # Clean up dead connections
        if dead_connections:
            async with self._lock:
                for conn in dead_connections:
                    if conn in self.active_connections.get(stand_id, []):
                        self.active_connections[stand_id].remove(conn)
    
    async def broadcast_all(self, message: dict):
        tasks = [self.broadcast_to_stand(stand_id, message) for stand_id in list(self.active_connections.keys())]
        await asyncio.gather(*tasks, return_exceptions=True)

manager = ConnectionManager()

# Admin credentials (from environment with defaults)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "admin")

# Default Stand Types
DEFAULT_STAND_TYPES = [
    {"id": "speisestand", "name": "Speisestand", "categories": ["speisen"]},
    {"id": "getraenkestand", "name": "Getränkestand", "categories": ["getraenke"]},
    {"id": "gemischt", "name": "Gemischter Stand", "categories": ["speisen", "getraenke"]}
]

ROLES = [
    {"id": "bestellung", "name": "Bestellung", "description": "Artikel buchen & abrechnen"},
    {"id": "kueche", "name": "Küche", "description": "Bestellungen zubereiten"},
    {"id": "ausgabe", "name": "Ausgabe", "description": "Fertige Bestellungen übergeben"},
    {"id": "onemanshow", "name": "OneManShow", "description": "Direkt buchen & abrechnen"}
]

# Available Timezones for selection
AVAILABLE_TIMEZONES = [
    {"id": "Europe/Berlin", "name": "Berlin (MEZ/MESZ)"},
    {"id": "Europe/Vienna", "name": "Wien (MEZ/MESZ)"},
    {"id": "Europe/Zurich", "name": "Zürich (MEZ/MESZ)"},
    {"id": "Europe/London", "name": "London (GMT/BST)"},
    {"id": "Europe/Paris", "name": "Paris (MEZ/MESZ)"},
    {"id": "Europe/Amsterdam", "name": "Amsterdam (MEZ/MESZ)"},
    {"id": "UTC", "name": "UTC"}
]

# Models
class DepositGroup(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    amount: float
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class DepositGroupCreate(BaseModel):
    name: str
    amount: float
    active: bool = True

class DepositGroupUpdate(BaseModel):
    name: Optional[str] = None
    amount: Optional[float] = None
    active: Optional[bool] = None

class Stand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stand_type: str = "gemischt"
    articles: List[str] = []
    short_process: bool = False  # Kurzer Prozess: Bestellung -> direkt Ausgabe (ohne Macher)
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StandCreate(BaseModel):
    name: str
    stand_type: str = "gemischt"
    articles: List[str] = []
    short_process: bool = False

class StandUpdate(BaseModel):
    name: Optional[str] = None
    stand_type: Optional[str] = None
    articles: Optional[List[str]] = None
    short_process: Optional[bool] = None
    active: Optional[bool] = None

# Stock Unit Models (Einheiten-Vorlagen für Bestandsverwaltung)
class StockUnit(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str  # z.B. "Kiste 24x0,5l", "Fass 30l"
    unit_type: str  # "container" (Kiste/Karton) oder "barrel" (Fass)
    # Für Container (Kisten):
    units_per_container: int = 1  # z.B. 24 Flaschen pro Kiste
    volume_per_unit: float = 0  # z.B. 0.5 für 0,5l Flasche (optional, für Info)
    # Für Fässer:
    total_volume_liters: float = 0  # z.B. 30 für 30l Fass
    serving_size_liters: float = 0.5  # z.B. 0.5 für 0,5l Glas
    loss_percent: float = 0  # z.B. 7 für 7% Schankverlust
    # Berechnete Werte
    sales_units_per_large: float = 0  # Wird berechnet: Verkaufseinheiten pro Großeinheit
    large_unit_name: str = "Einheit"  # z.B. "Kiste", "Fass"
    small_unit_name: str = "Stück"  # z.B. "Flasche", "Glas"
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StockUnitCreate(BaseModel):
    name: str
    unit_type: str  # "container" oder "barrel"
    units_per_container: int = 1
    volume_per_unit: float = 0
    total_volume_liters: float = 0
    serving_size_liters: float = 0.5
    loss_percent: float = 0
    large_unit_name: str = "Einheit"
    small_unit_name: str = "Stück"

class StockUnitUpdate(BaseModel):
    name: Optional[str] = None
    unit_type: Optional[str] = None
    units_per_container: Optional[int] = None
    volume_per_unit: Optional[float] = None
    total_volume_liters: Optional[float] = None
    serving_size_liters: Optional[float] = None
    loss_percent: Optional[float] = None
    large_unit_name: Optional[str] = None
    small_unit_name: Optional[str] = None
    active: Optional[bool] = None

class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    category: str
    deposit_group_id: Optional[str] = None
    # Bestandsverwaltung
    track_stock: bool = False  # Bestandsverwaltung aktiv?
    stock_unit_id: Optional[str] = None  # Verknüpfung zur Einheit
    stock_large_units: float = 0  # Großeinheiten (z.B. Kisten/Fässer)
    stock_small_units: float = 0  # Einzelne Verkaufseinheiten (z.B. lose Flaschen)
    stock_initial_large: float = 0  # Anfangsbestand Großeinheiten
    stock_initial_small: float = 0  # Anfangsbestand Kleineinheiten
    stock_warning_threshold: int = 0  # Ab dieser Menge (VK-Einheiten) = "knapp"
    stock_sold_out_behavior: str = "mark"  # "disable", "mark", "allow"
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ArticleCreate(BaseModel):
    name: str
    price: float
    category: str
    deposit_group_id: Optional[str] = None
    track_stock: bool = False
    stock_unit_id: Optional[str] = None
    stock_large_units: float = 0
    stock_small_units: float = 0
    stock_warning_threshold: int = 0
    stock_sold_out_behavior: str = "mark"
    active: bool = True

class ArticleUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    deposit_group_id: Optional[str] = None
    track_stock: Optional[bool] = None
    stock_unit_id: Optional[str] = None
    stock_large_units: Optional[float] = None
    stock_small_units: Optional[float] = None
    stock_warning_threshold: Optional[int] = None
    stock_sold_out_behavior: Optional[str] = None
    active: Optional[bool] = None

# Station Models (for Macher role)
class Station(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stand_id: str
    name: str
    is_main: bool = False  # Hauptstation - receives main articles without linked articles
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StationCreate(BaseModel):
    stand_id: str
    name: str
    is_main: bool = False

class StationUpdate(BaseModel):
    name: Optional[str] = None
    is_main: Optional[bool] = None
    active: Optional[bool] = None

# Linked Article Models (Verknüpfte Artikel)
class LinkedArticle(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    main_article_id: str  # Hauptartikel
    linked_article_id: str  # Verknüpfter Artikel (Beilage)
    linked_article_name: str  # Cache name for display
    station_id: str  # Station where this linked article appears
    station_name: str  # Cache name for display
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LinkedArticleCreate(BaseModel):
    main_article_id: str
    linked_article_id: str
    station_id: str

class LinkedArticleUpdate(BaseModel):
    station_id: Optional[str] = None

class OrderItem(BaseModel):
    article_id: str
    article_name: str
    quantity: int
    price: float
    deposit_amount: float = 0
    is_deposit_return: bool = False
    is_linked_article: bool = False  # True if this is a linked/side article
    linked_to_article_id: Optional[str] = None  # Main article this is linked to
    station_id: Optional[str] = None  # Station responsible for this item
    station_completed: bool = False  # Whether station has marked this item as done

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: int
    stand_id: str
    stand_name: str
    items: List[OrderItem]
    subtotal: float
    deposit_total: float = 0
    deposit_return_total: float = 0
    total: float
    status: str = "created"
    created_by: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    processed_by: Optional[str] = None
    completed_by: Optional[str] = None
    # Station tracking for multi-station workflow
    station_status: Dict[str, bool] = {}  # station_id -> completed (True/False)
    has_linked_articles: bool = False  # Whether this order has linked articles

class OrderCreate(BaseModel):
    stand_id: str
    stand_name: str
    items: List[OrderItem]
    subtotal: float
    deposit_total: float = 0
    deposit_return_total: float = 0
    total: float
    created_by: str
    direct_complete: bool = False  # For OneManShow

class OrderStatusUpdate(BaseModel):
    status: str
    updated_by: str

# Auth helper
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    return credentials.username

# WebSocket endpoint
@app.websocket("/ws/{stand_id}")
async def websocket_endpoint(websocket: WebSocket, stand_id: str):
    await manager.connect(websocket, stand_id)
    try:
        while True:
            # Keep connection alive, receive any messages
            data = await websocket.receive_text()
            # Echo back or handle commands if needed
    except WebSocketDisconnect:
        await manager.disconnect(websocket, stand_id)
    except Exception as e:
        logging.error(f"WebSocket error: {e}")
        await manager.disconnect(websocket, stand_id)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Festival OS API"}

@api_router.get("/health")
async def health_check():
    """Health check endpoint for deployment verification"""
    try:
        # Check database connection
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    
    return {
        "status": "healthy",
        "database": db_status,
        "websocket_connections": manager.get_connection_count(),
        "version": "1.0.0"
    }

@api_router.get("/stand-types")
async def get_stand_types():
    return DEFAULT_STAND_TYPES

@api_router.get("/roles")
async def get_roles():
    return ROLES

# Deposit Group Routes
@api_router.get("/deposit-groups")
async def get_deposit_groups():
    groups = await db.deposit_groups.find({}, {"_id": 0}).to_list(100)
    return groups

@api_router.post("/deposit-groups", response_model=DepositGroup)
async def create_deposit_group(group: DepositGroupCreate, username: str = Depends(verify_admin)):
    group_obj = DepositGroup(**group.model_dump())
    await db.deposit_groups.insert_one(group_obj.model_dump())
    return group_obj

@api_router.put("/deposit-groups/{group_id}", response_model=DepositGroup)
async def update_deposit_group(group_id: str, group: DepositGroupUpdate, username: str = Depends(verify_admin)):
    update_data = {k: v for k, v in group.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    result = await db.deposit_groups.update_one({"id": group_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Pfandgruppe nicht gefunden")
    
    updated = await db.deposit_groups.find_one({"id": group_id}, {"_id": 0})
    return DepositGroup(**updated)

@api_router.delete("/deposit-groups/{group_id}")
async def delete_deposit_group(group_id: str, username: str = Depends(verify_admin)):
    result = await db.deposit_groups.delete_one({"id": group_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pfandgruppe nicht gefunden")
    return {"message": "Pfandgruppe gelöscht"}

# Settings Routes (Einstellungen)
@api_router.get("/settings")
async def get_settings():
    """Get all settings"""
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        # Default settings
        settings = {
            "id": "global",
            "timezone": "Europe/Berlin",
            "event_name": "Karnbachs Event OS"
        }
        await db.settings.insert_one(settings)
    return settings

@api_router.put("/settings")
async def update_settings(settings: dict, username: str = Depends(verify_admin)):
    """Update settings"""
    allowed_fields = ["timezone", "event_name"]
    update_data = {k: v for k, v in settings.items() if k in allowed_fields}
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine gültigen Einstellungen")
    
    await db.settings.update_one(
        {"id": "global"},
        {"$set": update_data},
        upsert=True
    )
    
    updated = await db.settings.find_one({"id": "global"}, {"_id": 0})
    return updated

@api_router.get("/timezones")
async def get_available_timezones():
    """Get list of available timezones"""
    return AVAILABLE_TIMEZONES

@api_router.get("/server-time")
async def get_server_time():
    """Get current server time in configured timezone"""
    from zoneinfo import ZoneInfo
    
    settings = await db.settings.find_one({"id": "global"}, {"_id": 0})
    tz_name = settings.get("timezone", "Europe/Berlin") if settings else "Europe/Berlin"
    
    try:
        tz = ZoneInfo(tz_name)
        now = datetime.now(tz)
        return {
            "time": now.strftime("%H:%M:%S"),
            "date": now.strftime("%d.%m.%Y"),
            "datetime": now.isoformat(),
            "timezone": tz_name
        }
    except Exception:
        now = datetime.now(timezone.utc)
        return {
            "time": now.strftime("%H:%M:%S"),
            "date": now.strftime("%d.%m.%Y"),
            "datetime": now.isoformat(),
            "timezone": "UTC"
        }

# Stock Unit Routes (Einheiten-Vorlagen)
def calculate_sales_units_per_large(unit_data: dict) -> float:
    """Berechnet Verkaufseinheiten pro Großeinheit"""
    if unit_data.get("unit_type") == "container":
        return float(unit_data.get("units_per_container", 1))
    elif unit_data.get("unit_type") == "barrel":
        total_volume = unit_data.get("total_volume_liters", 0)
        serving_size = unit_data.get("serving_size_liters", 0.5)
        loss_percent = unit_data.get("loss_percent", 0)
        if serving_size > 0 and total_volume > 0:
            effective_volume = total_volume * (1 - loss_percent / 100)
            return effective_volume / serving_size
    return 1

def get_total_stock_units(article: dict, stock_unit: dict = None) -> float:
    """Berechnet Gesamtbestand in Verkaufseinheiten"""
    large = article.get("stock_large_units", 0)
    small = article.get("stock_small_units", 0)
    if stock_unit:
        units_per_large = calculate_sales_units_per_large(stock_unit)
    else:
        units_per_large = 1
    return (large * units_per_large) + small

@api_router.get("/stock-units")
async def get_stock_units():
    units = await db.stock_units.find({}, {"_id": 0}).to_list(100)
    # Berechne sales_units_per_large für jede Einheit
    for unit in units:
        unit["sales_units_per_large"] = calculate_sales_units_per_large(unit)
    return units

@api_router.get("/stock-units/{unit_id}")
async def get_stock_unit(unit_id: str):
    unit = await db.stock_units.find_one({"id": unit_id}, {"_id": 0})
    if not unit:
        raise HTTPException(status_code=404, detail="Einheit nicht gefunden")
    unit["sales_units_per_large"] = calculate_sales_units_per_large(unit)
    return unit

@api_router.post("/stock-units", response_model=StockUnit)
async def create_stock_unit(unit: StockUnitCreate, username: str = Depends(verify_admin)):
    unit_dict = unit.model_dump()
    unit_dict["sales_units_per_large"] = calculate_sales_units_per_large(unit_dict)
    unit_obj = StockUnit(**unit_dict)
    await db.stock_units.insert_one(unit_obj.model_dump())
    return unit_obj

@api_router.put("/stock-units/{unit_id}", response_model=StockUnit)
async def update_stock_unit(unit_id: str, unit: StockUnitUpdate, username: str = Depends(verify_admin)):
    update_data = {k: v for k, v in unit.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    # Hole aktuelle Daten für Neuberechnung
    current = await db.stock_units.find_one({"id": unit_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Einheit nicht gefunden")
    
    merged = {**current, **update_data}
    update_data["sales_units_per_large"] = calculate_sales_units_per_large(merged)
    
    await db.stock_units.update_one({"id": unit_id}, {"$set": update_data})
    updated = await db.stock_units.find_one({"id": unit_id}, {"_id": 0})
    return StockUnit(**updated)

@api_router.delete("/stock-units/{unit_id}")
async def delete_stock_unit(unit_id: str, username: str = Depends(verify_admin)):
    # Prüfe ob Einheit noch verwendet wird
    articles_using = await db.articles.count_documents({"stock_unit_id": unit_id})
    if articles_using > 0:
        raise HTTPException(status_code=400, detail=f"Einheit wird noch von {articles_using} Artikel(n) verwendet")
    
    result = await db.stock_units.delete_one({"id": unit_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Einheit nicht gefunden")
    return {"message": "Einheit gelöscht"}

# Stock adjustment endpoint (manuelle Bestandskorrektur)
class StockAdjustment(BaseModel):
    large_units: Optional[float] = None
    small_units: Optional[float] = None
    set_as_initial: bool = False  # Setzt auch als Anfangsbestand

@api_router.put("/articles/{article_id}/stock")
async def adjust_article_stock(article_id: str, adjustment: StockAdjustment, username: str = Depends(verify_admin)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    update_data = {}
    if adjustment.large_units is not None:
        update_data["stock_large_units"] = adjustment.large_units
        if adjustment.set_as_initial:
            update_data["stock_initial_large"] = adjustment.large_units
    if adjustment.small_units is not None:
        update_data["stock_small_units"] = adjustment.small_units
        if adjustment.set_as_initial:
            update_data["stock_initial_small"] = adjustment.small_units
    
    if update_data:
        await db.articles.update_one({"id": article_id}, {"$set": update_data})
    
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return updated

# Bestandsübersicht für Admin
@api_router.get("/admin/stock-overview")
async def get_stock_overview(username: str = Depends(verify_admin)):
    articles = await db.articles.find({"track_stock": True}, {"_id": 0}).to_list(1000)
    stock_units = await db.stock_units.find({}, {"_id": 0}).to_list(100)
    unit_map = {u["id"]: u for u in stock_units}
    
    overview = []
    for article in articles:
        unit = unit_map.get(article.get("stock_unit_id"))
        if unit:
            unit["sales_units_per_large"] = calculate_sales_units_per_large(unit)
        
        total_stock = get_total_stock_units(article, unit)
        initial_stock = (
            (article.get("stock_initial_large", 0) * (unit["sales_units_per_large"] if unit else 1)) +
            article.get("stock_initial_small", 0)
        ) if unit else article.get("stock_initial_small", 0)
        
        sold = initial_stock - total_stock if initial_stock > 0 else 0
        
        overview.append({
            "article_id": article["id"],
            "article_name": article["name"],
            "category": article["category"],
            "price": article["price"],
            "stock_unit": unit,
            "stock_large_units": article.get("stock_large_units", 0),
            "stock_small_units": article.get("stock_small_units", 0),
            "total_stock_sales_units": total_stock,
            "initial_stock_sales_units": initial_stock,
            "sold_units": sold,
            "sold_revenue": sold * article["price"],
            "warning_threshold": article.get("stock_warning_threshold", 0),
            "is_low": total_stock <= article.get("stock_warning_threshold", 0) and article.get("stock_warning_threshold", 0) > 0,
            "is_sold_out": total_stock <= 0,
            "sold_out_behavior": article.get("stock_sold_out_behavior", "mark")
        })
    
    return overview

# Stand Routes
@api_router.get("/stands")
async def get_stands(active_only: bool = False):
    query = {"active": True} if active_only else {}
    stands = await db.stands.find(query, {"_id": 0}).to_list(100)
    return stands

@api_router.post("/stands", response_model=Stand)
async def create_stand(stand: StandCreate, username: str = Depends(verify_admin)):
    stand_obj = Stand(**stand.model_dump())
    await db.stands.insert_one(stand_obj.model_dump())
    return stand_obj

@api_router.put("/stands/{stand_id}", response_model=Stand)
async def update_stand(stand_id: str, stand: StandUpdate, username: str = Depends(verify_admin)):
    update_data = {k: v for k, v in stand.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    result = await db.stands.update_one({"id": stand_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    updated = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    return Stand(**updated)

# Toggle short_process from frontend (no auth required for quick toggle)
@api_router.put("/stands/{stand_id}/toggle-short-process")
async def toggle_short_process(stand_id: str):
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    new_value = not stand.get("short_process", False)
    await db.stands.update_one({"id": stand_id}, {"$set": {"short_process": new_value}})
    
    updated = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    return Stand(**updated)

@api_router.delete("/stands/{stand_id}")
async def delete_stand(stand_id: str, username: str = Depends(verify_admin)):
    result = await db.stands.delete_one({"id": stand_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    return {"message": "Stand gelöscht"}

@api_router.get("/stands/{stand_id}")
async def get_stand(stand_id: str):
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    return stand

# Station Routes
@api_router.get("/stations")
async def get_all_stations():
    stations = await db.stations.find({}, {"_id": 0}).to_list(1000)
    return stations

@api_router.get("/stands/{stand_id}/stations")
async def get_stand_stations(stand_id: str):
    stations = await db.stations.find({"stand_id": stand_id, "active": True}, {"_id": 0}).to_list(100)
    return stations

@api_router.post("/stations", response_model=Station)
async def create_station(station: StationCreate, username: str = Depends(verify_admin)):
    # If this is first station for stand or marked as main, ensure only one main station
    if station.is_main:
        await db.stations.update_many(
            {"stand_id": station.stand_id},
            {"$set": {"is_main": False}}
        )
    
    station_obj = Station(**station.model_dump())
    await db.stations.insert_one(station_obj.model_dump())
    return station_obj

@api_router.put("/stations/{station_id}", response_model=Station)
async def update_station(station_id: str, station: StationUpdate, username: str = Depends(verify_admin)):
    existing = await db.stations.find_one({"id": station_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Station nicht gefunden")
    
    update_data = {k: v for k, v in station.model_dump().items() if v is not None}
    
    # If setting as main, unset other main stations for this stand
    if update_data.get("is_main"):
        await db.stations.update_many(
            {"stand_id": existing["stand_id"], "id": {"$ne": station_id}},
            {"$set": {"is_main": False}}
        )
    
    if update_data:
        await db.stations.update_one({"id": station_id}, {"$set": update_data})
    
    updated = await db.stations.find_one({"id": station_id}, {"_id": 0})
    return Station(**updated)

@api_router.delete("/stations/{station_id}")
async def delete_station(station_id: str, username: str = Depends(verify_admin)):
    # Also delete linked articles for this station
    await db.linked_articles.delete_many({"station_id": station_id})
    result = await db.stations.delete_one({"id": station_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Station nicht gefunden")
    return {"message": "Station gelöscht"}

# Linked Articles Routes (Verknüpfte Artikel)
@api_router.get("/linked-articles")
async def get_all_linked_articles():
    linked = await db.linked_articles.find({}, {"_id": 0}).to_list(1000)
    return linked

@api_router.get("/articles/{article_id}/linked")
async def get_article_linked_articles(article_id: str):
    """Get all linked articles for a main article"""
    linked = await db.linked_articles.find({"main_article_id": article_id}, {"_id": 0}).to_list(100)
    return linked

@api_router.get("/stands/{stand_id}/linked-articles")
async def get_stand_linked_articles(stand_id: str):
    """Get all linked articles for articles at this stand"""
    # Get all article IDs for this stand
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    article_ids = stand.get("articles", [])
    if not article_ids:
        # Get all articles for this stand type
        all_articles = await db.articles.find({"active": True}, {"_id": 0}).to_list(1000)
        article_ids = [a["id"] for a in all_articles]
    
    linked = await db.linked_articles.find({"main_article_id": {"$in": article_ids}}, {"_id": 0}).to_list(1000)
    return linked

@api_router.get("/stands/{stand_id}/has-linked-articles")
async def stand_has_linked_articles(stand_id: str):
    """Check if a stand has any linked articles configured"""
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    article_ids = stand.get("articles", [])
    if not article_ids:
        all_articles = await db.articles.find({"active": True}, {"_id": 0}).to_list(1000)
        article_ids = [a["id"] for a in all_articles]
    
    linked_count = await db.linked_articles.count_documents({"main_article_id": {"$in": article_ids}})
    stations = await db.stations.find({"stand_id": stand_id, "active": True}, {"_id": 0}).to_list(100)
    
    return {
        "has_linked_articles": linked_count > 0,
        "linked_count": linked_count,
        "stations": stations
    }

@api_router.post("/linked-articles", response_model=LinkedArticle)
async def create_linked_article(linked: LinkedArticleCreate, username: str = Depends(verify_admin)):
    # Verify main article exists
    main_article = await db.articles.find_one({"id": linked.main_article_id}, {"_id": 0})
    if not main_article:
        raise HTTPException(status_code=404, detail="Hauptartikel nicht gefunden")
    
    # Verify linked article exists
    linked_article = await db.articles.find_one({"id": linked.linked_article_id}, {"_id": 0})
    if not linked_article:
        raise HTTPException(status_code=404, detail="Verknüpfter Artikel nicht gefunden")
    
    # Verify station exists
    station = await db.stations.find_one({"id": linked.station_id}, {"_id": 0})
    if not station:
        raise HTTPException(status_code=404, detail="Station nicht gefunden")
    
    # Check if this link already exists
    existing = await db.linked_articles.find_one({
        "main_article_id": linked.main_article_id,
        "linked_article_id": linked.linked_article_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="Diese Verknüpfung existiert bereits")
    
    linked_obj = LinkedArticle(
        **linked.model_dump(),
        linked_article_name=linked_article["name"],
        station_name=station["name"]
    )
    await db.linked_articles.insert_one(linked_obj.model_dump())
    return linked_obj

@api_router.delete("/linked-articles/{linked_id}")
async def delete_linked_article(linked_id: str, username: str = Depends(verify_admin)):
    result = await db.linked_articles.delete_one({"id": linked_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Verknüpfung nicht gefunden")
    return {"message": "Verknüpfung gelöscht"}

# Article Routes
@api_router.get("/articles", response_model=List[Article])
async def get_articles(active_only: bool = False):
    query = {"active": True} if active_only else {}
    articles = await db.articles.find(query, {"_id": 0}).to_list(1000)
    return articles

@api_router.post("/articles", response_model=Article)
async def create_article(article: ArticleCreate, username: str = Depends(verify_admin)):
    article_obj = Article(**article.model_dump())
    await db.articles.insert_one(article_obj.model_dump())
    return article_obj

@api_router.put("/articles/{article_id}", response_model=Article)
async def update_article(article_id: str, article: ArticleUpdate, username: str = Depends(verify_admin)):
    # Get current article
    current = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not current:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
    # Build update data - allow null for deposit_group_id
    update_data = {}
    article_dict = article.model_dump()
    
    for k, v in article_dict.items():
        # Always include deposit_group_id (even if null) to allow removal
        if k == "deposit_group_id":
            update_data[k] = v
        elif v is not None:
            update_data[k] = v
    
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    result = await db.articles.update_one({"id": article_id}, {"$set": update_data})
    
    updated = await db.articles.find_one({"id": article_id}, {"_id": 0})
    return Article(**updated)

@api_router.delete("/articles/{article_id}")
async def delete_article(article_id: str, username: str = Depends(verify_admin)):
    result = await db.articles.delete_one({"id": article_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    return {"message": "Artikel gelöscht"}

# Get articles for a specific stand with deposit info
@api_router.get("/stands/{stand_id}/articles")
async def get_stand_articles(stand_id: str):
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    stand_type = stand.get("stand_type", "gemischt")
    type_config = next((t for t in DEFAULT_STAND_TYPES if t["id"] == stand_type), DEFAULT_STAND_TYPES[2])
    allowed_categories = type_config["categories"]
    
    assigned_article_ids = stand.get("articles", [])
    
    if assigned_article_ids:
        articles = await db.articles.find(
            {"id": {"$in": assigned_article_ids}, "active": True, "category": {"$in": allowed_categories}},
            {"_id": 0}
        ).to_list(1000)
    else:
        articles = await db.articles.find(
            {"active": True, "category": {"$in": allowed_categories}},
            {"_id": 0}
        ).to_list(1000)
    
    # Add deposit info to articles
    deposit_groups = await db.deposit_groups.find({"active": True}, {"_id": 0}).to_list(100)
    deposit_map = {g["id"]: g for g in deposit_groups}
    
    # Add stock unit info
    stock_units = await db.stock_units.find({}, {"_id": 0}).to_list(100)
    stock_unit_map = {u["id"]: u for u in stock_units}
    
    for article in articles:
        if article.get("deposit_group_id") and article["deposit_group_id"] in deposit_map:
            article["deposit"] = deposit_map[article["deposit_group_id"]]
        else:
            article["deposit"] = None
        
        # Bestandsinformationen hinzufügen
        if article.get("track_stock"):
            stock_unit = stock_unit_map.get(article.get("stock_unit_id"))
            if stock_unit:
                stock_unit["sales_units_per_large"] = calculate_sales_units_per_large(stock_unit)
            
            total_stock = get_total_stock_units(article, stock_unit)
            warning_threshold = article.get("stock_warning_threshold", 0)
            
            article["stock_info"] = {
                "total_units": total_stock,
                "is_low": total_stock <= warning_threshold and warning_threshold > 0,
                "is_sold_out": total_stock <= 0,
                "warning_threshold": warning_threshold,
                "sold_out_behavior": article.get("stock_sold_out_behavior", "mark"),
                "unit_name": stock_unit.get("small_unit_name", "Stück") if stock_unit else "Stück"
            }
        else:
            article["stock_info"] = None
    
    return articles

# Order Routes
async def get_next_order_number(stand_id: str) -> int:
    """Get next order number (1-25, then cycles back to 1)"""
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    counter = await db.order_counters.find_one_and_update(
        {"stand_id": stand_id, "date": today},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True
    )
    # Cycle 1-25: when count reaches 26, reset to 1
    number = ((counter["count"] - 1) % 25) + 1
    return number

@api_router.get("/orders")
async def get_orders(
    stand_id: Optional[str] = None,
    status: Optional[str] = None
):
    query = {}
    if stand_id:
        query["stand_id"] = stand_id
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)
    
    # Ensure backward compatibility - add missing fields for older orders
    for order in orders:
        if "subtotal" not in order:
            order["subtotal"] = order.get("total", 0)
        if "deposit_total" not in order:
            order["deposit_total"] = 0
        if "deposit_return_total" not in order:
            order["deposit_return_total"] = 0
        if "pfand_total" in order:  # Old field name migration
            del order["pfand_total"]
    
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    order_number = await get_next_order_number(order.stand_id)
    
    # Check if direct complete (OneManShow)
    # Workflow logic:
    # - OneManShow (direct_complete=true): Status directly "completed"
    # - Short process stand (short_process=true): Status "ready" (skips Macher, goes to Ausgabe)
    # - Normal: Status "created" (goes to Macher first)
    
    stand = await db.stands.find_one({"id": order.stand_id}, {"_id": 0})
    
    if order.direct_complete:
        initial_status = "completed"
    elif stand and stand.get("short_process", False):
        initial_status = "ready"  # Kurzer Prozess: direkt zur Ausgabe
    else:
        initial_status = "created"  # Normal: geht zum Macher
    
    order_dict = order.model_dump()
    del order_dict["direct_complete"]
    
    # Process items for linked articles
    items = order_dict["items"]
    new_items = []
    station_status = {}
    has_linked_articles = False
    
    # Get main station for this stand
    main_station = await db.stations.find_one({"stand_id": order.stand_id, "is_main": True, "active": True}, {"_id": 0})
    
    for item in items:
        if item.get("is_deposit_return"):
            new_items.append(item)
            continue
        
        # Check if this article has linked articles
        linked_articles = await db.linked_articles.find({"main_article_id": item["article_id"]}, {"_id": 0}).to_list(100)
        
        if linked_articles:
            has_linked_articles = True
            # Main article goes to main station
            if main_station:
                item["station_id"] = main_station["id"]
                station_status[main_station["id"]] = False
            item["is_linked_article"] = False
            new_items.append(item)
            
            # Add linked articles to items
            for linked in linked_articles:
                linked_article_data = await db.articles.find_one({"id": linked["linked_article_id"]}, {"_id": 0})
                if linked_article_data:
                    station_status[linked["station_id"]] = False
                    for _ in range(item["quantity"]):  # Add linked article for each quantity of main
                        new_items.append({
                            "article_id": linked["linked_article_id"],
                            "article_name": linked["linked_article_name"],
                            "quantity": 1,
                            "price": 0,  # Linked articles don't add price (included in main)
                            "deposit_amount": 0,
                            "is_deposit_return": False,
                            "is_linked_article": True,
                            "linked_to_article_id": item["article_id"],
                            "station_id": linked["station_id"],
                            "station_completed": False
                        })
        else:
            # No linked articles - assign to main station if exists
            if main_station:
                item["station_id"] = main_station["id"]
                station_status[main_station["id"]] = False
            item["is_linked_article"] = False
            new_items.append(item)
    
    # Consolidate linked articles (sum quantities)
    if has_linked_articles:
        consolidated = {}
        main_items = []
        for item in new_items:
            if item.get("is_linked_article"):
                key = f"{item['article_id']}_{item.get('station_id', '')}"
                if key in consolidated:
                    consolidated[key]["quantity"] += item["quantity"]
                else:
                    consolidated[key] = item.copy()
            else:
                main_items.append(item)
        new_items = main_items + list(consolidated.values())
    
    order_dict["items"] = new_items
    order_dict["station_status"] = station_status
    order_dict["has_linked_articles"] = has_linked_articles
    
    # === BESTANDSREDUKTION ===
    # Reduziere Bestand für alle Artikel mit aktiver Bestandsverwaltung
    stock_units_cache = {}
    for item in new_items:
        if item.get("is_deposit_return"):
            continue
        
        article = await db.articles.find_one({"id": item["article_id"]}, {"_id": 0})
        if not article or not article.get("track_stock"):
            continue
        
        quantity = item["quantity"]
        
        # Hole Stock Unit (mit Cache)
        unit_id = article.get("stock_unit_id")
        if unit_id:
            if unit_id not in stock_units_cache:
                unit = await db.stock_units.find_one({"id": unit_id}, {"_id": 0})
                if unit:
                    unit["sales_units_per_large"] = calculate_sales_units_per_large(unit)
                stock_units_cache[unit_id] = unit
            stock_unit = stock_units_cache.get(unit_id)
        else:
            stock_unit = None
        
        # Berechne neue Bestandswerte
        large_units = article.get("stock_large_units", 0)
        small_units = article.get("stock_small_units", 0)
        units_per_large = stock_unit["sales_units_per_large"] if stock_unit else 1
        
        # Gesamtbestand in Verkaufseinheiten
        total_available = (large_units * units_per_large) + small_units
        new_total = total_available - quantity
        
        if new_total < 0:
            new_total = 0  # Nicht unter 0 gehen
        
        # Neue Werte berechnen (Großeinheiten + Rest)
        if units_per_large > 0:
            new_large = int(new_total // units_per_large)
            new_small = new_total - (new_large * units_per_large)
        else:
            new_large = 0
            new_small = new_total
        
        # Update Artikel
        await db.articles.update_one(
            {"id": item["article_id"]},
            {"$set": {"stock_large_units": new_large, "stock_small_units": new_small}}
        )
    # === ENDE BESTANDSREDUKTION ===
    
    order_obj = Order(
        order_number=order_number,
        status=initial_status,
        **order_dict
    )
    doc = order_obj.model_dump()
    
    # Insert order and broadcast simultaneously for lower latency
    async def broadcast_new_order():
        await manager.broadcast_to_stand(order.stand_id, {
            "type": "new_order",
            "order": doc
        })
    
    # Run both in parallel - don't wait for broadcast to complete
    await db.orders.insert_one(doc)
    asyncio.create_task(broadcast_new_order())
    
    return order_obj

@api_router.put("/orders/{order_id}/status", response_model=Order)
async def update_order_status(order_id: str, status_update: OrderStatusUpdate):
    update_data = {
        "status": status_update.status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if status_update.status == "in_progress":
        update_data["processed_by"] = status_update.updated_by
    elif status_update.status == "completed":
        update_data["completed_by"] = status_update.updated_by
    
    # Get order first
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Broadcast update immediately (fire and forget for lower latency)
    async def broadcast_update():
        await manager.broadcast_to_stand(order["stand_id"], {
            "type": "order_updated",
            "order": updated
        })
    asyncio.create_task(broadcast_update())
    
    return Order(**updated)

# Station-based order completion (for multi-station workflow)
class StationCompleteRequest(BaseModel):
    station_id: str
    updated_by: str

@api_router.put("/orders/{order_id}/station-complete")
async def station_complete_order(order_id: str, request: StationCompleteRequest):
    """Mark a station's items as complete. Order goes to 'ready' when all stations are done."""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    station_status = order.get("station_status", {})
    station_status[request.station_id] = True
    
    # Mark items for this station as completed
    items = order.get("items", [])
    for item in items:
        if item.get("station_id") == request.station_id:
            item["station_completed"] = True
    
    # Check if all stations are done
    all_complete = all(station_status.values()) if station_status else True
    
    update_data = {
        "station_status": station_status,
        "items": items,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    if all_complete:
        update_data["status"] = "ready"
        update_data["processed_by"] = request.updated_by
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Broadcast update
    await manager.broadcast_to_stand(order["stand_id"], {
        "type": "order_updated",
        "order": updated
    })
    
    return updated

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return Order(**order)

# Kitchen Summary
@api_router.get("/stands/{stand_id}/kitchen-summary")
async def get_kitchen_summary(stand_id: str, station_id: Optional[str] = None):
    orders = await db.orders.find(
        {"stand_id": stand_id, "status": {"$in": ["created", "in_progress"]}},
        {"_id": 0}
    ).to_list(1000)
    
    item_totals = {}
    for order in orders:
        for item in order.get("items", []):
            if item.get("is_deposit_return"):
                continue
            # If station_id specified, only count items for that station
            if station_id:
                if item.get("station_id") != station_id:
                    continue
                # Skip already completed items for this station
                if item.get("station_completed"):
                    continue
            name = item.get("article_name", "Unbekannt")
            qty = item.get("quantity", 0)
            if name in item_totals:
                item_totals[name] += qty
            else:
                item_totals[name] = qty
    
    sorted_items = dict(sorted(item_totals.items(), key=lambda x: x[1], reverse=True))
    
    return {
        "total_items": sorted_items,
        "total_orders": len(orders)
    }

# Get orders for a specific station
@api_router.get("/stands/{stand_id}/station/{station_id}/orders")
async def get_station_orders(stand_id: str, station_id: str):
    """Get orders that have items for this station"""
    orders = await db.orders.find(
        {"stand_id": stand_id, "status": {"$in": ["created", "in_progress"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    # Filter orders that have items for this station and are not yet complete
    station_orders = []
    for order in orders:
        station_status = order.get("station_status", {})
        # Skip if this station has already completed
        if station_status.get(station_id, False):
            continue
        
        # Check if order has items for this station
        station_items = [item for item in order.get("items", []) if item.get("station_id") == station_id]
        if station_items:
            # Create a filtered order view for this station
            filtered_order = order.copy()
            filtered_order["station_items"] = station_items
            station_orders.append(filtered_order)
    
    return station_orders

# Stats Routes
@api_router.post("/stats/overview")
async def get_stats_overview(filters: dict, username: str = Depends(verify_admin)):
    query = {}
    
    start_date = filters.get("start_date")
    end_date = filters.get("end_date")
    stand_id = filters.get("stand_id")
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    if stand_id:
        query["stand_id"] = stand_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_orders = len(orders)
    total_revenue = sum(o.get("total", 0) for o in orders)
    completed_orders = len([o for o in orders if o.get("status") == "completed"])
    total_deposit = sum(o.get("deposit_total", 0) for o in orders)
    total_deposit_return = sum(o.get("deposit_return_total", 0) for o in orders)
    
    # Orders by stand
    orders_by_stand = {}
    for o in orders:
        stand = o.get("stand_name", "Unbekannt")
        if stand not in orders_by_stand:
            orders_by_stand[stand] = {"count": 0, "revenue": 0}
        orders_by_stand[stand]["count"] += 1
        orders_by_stand[stand]["revenue"] += o.get("total", 0)
    
    # Orders by hour with count and revenue
    orders_by_hour = {}
    for o in orders:
        try:
            hour = datetime.fromisoformat(o.get("created_at", "")).hour
            if hour not in orders_by_hour:
                orders_by_hour[hour] = {"count": 0, "revenue": 0}
            orders_by_hour[hour]["count"] += 1
            orders_by_hour[hour]["revenue"] += o.get("total", 0)
        except:
            pass
    
    # Top articles
    article_sales = {}
    for o in orders:
        for item in o.get("items", []):
            if item.get("is_deposit_return"):
                continue
            name = item.get("article_name", "Unbekannt")
            if name not in article_sales:
                article_sales[name] = {"quantity": 0, "revenue": 0}
            article_sales[name]["quantity"] += item.get("quantity", 0)
            article_sales[name]["revenue"] += item.get("price", 0) * item.get("quantity", 0)
    
    top_articles = sorted(article_sales.items(), key=lambda x: x[1]["quantity"], reverse=True)[:10]
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "completed_orders": completed_orders,
        "total_deposit": total_deposit,
        "total_deposit_return": total_deposit_return,
        "orders_by_stand": orders_by_stand,
        "orders_by_hour": dict(sorted(orders_by_hour.items())),
        "top_articles": [{"name": k, **v} for k, v in top_articles]
    }

@api_router.get("/stats/orders")
async def get_stats_orders(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    stand_id: Optional[str] = None,
    status: Optional[str] = None,
    username: str = Depends(verify_admin)
):
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    if stand_id:
        query["stand_id"] = stand_id
    if status:
        query["status"] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    return orders

# Admin auth check
@api_router.post("/auth/login")
async def admin_login(credentials: HTTPBasicCredentials = Depends(security)):
    verify_admin(credentials)
    return {"message": "Login erfolgreich", "username": credentials.username}

# Archive endpoint for Bestellung role - get all orders for a stand (sorted by newest first)
@api_router.get("/stands/{stand_id}/archive")
async def get_stand_archive(stand_id: str, limit: int = 100):
    """Get order archive for a stand (for resolving disputes with guests)"""
    orders = await db.orders.find(
        {"stand_id": stand_id},
        {"_id": 0}
    ).sort("created_at", -1).to_list(limit)
    
    # Ensure backward compatibility
    for order in orders:
        if "subtotal" not in order:
            order["subtotal"] = order.get("total", 0)
        if "deposit_total" not in order:
            order["deposit_total"] = 0
        if "deposit_return_total" not in order:
            order["deposit_return_total"] = 0
    
    return orders

# Ausgabe: Reclaim last completed order (undo pickup)
@api_router.put("/orders/{order_id}/reclaim")
async def reclaim_order(order_id: str):
    """Reclaim a completed order back to ready status (undo pickup)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    if order.get("status") != "completed":
        raise HTTPException(status_code=400, detail="Nur abgeschlossene Bestellungen können zurückgeholt werden")
    
    update_data = {
        "status": "ready",
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "completed_by": None  # Clear completed_by
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Broadcast update to stand
    await manager.broadcast_to_stand(order["stand_id"], {
        "type": "order_updated",
        "order": updated
    })
    
    return Order(**updated)

# Ausgabe: Get last completed orders for a stand
@api_router.get("/stands/{stand_id}/completed-orders")
async def get_completed_orders(stand_id: str, limit: int = 10):
    """Get recently completed orders for a stand (for reclaim feature)"""
    orders = await db.orders.find(
        {"stand_id": stand_id, "status": "completed"},
        {"_id": 0}
    ).sort("updated_at", -1).to_list(limit)
    
    # Ensure backward compatibility
    for order in orders:
        if "subtotal" not in order:
            order["subtotal"] = order.get("total", 0)
        if "deposit_total" not in order:
            order["deposit_total"] = 0
        if "deposit_return_total" not in order:
            order["deposit_return_total"] = 0
    
    return orders

# Admin: Get all orders (Rechnungen) with pagination
@api_router.get("/admin/orders")
async def get_admin_orders(
    limit: int = 100,
    offset: int = 0,
    stand_id: Optional[str] = None,
    username: str = Depends(verify_admin)
):
    """Get all orders for admin view with optional filtering"""
    query = {}
    if stand_id:
        query["stand_id"] = stand_id
    
    total_count = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit).to_list(limit)
    
    # Ensure backward compatibility
    for order in orders:
        if "subtotal" not in order:
            order["subtotal"] = order.get("total", 0)
        if "deposit_total" not in order:
            order["deposit_total"] = 0
        if "deposit_return_total" not in order:
            order["deposit_return_total"] = 0
    
    return {
        "orders": orders,
        "total": total_count,
        "limit": limit,
        "offset": offset
    }

# Admin: Delete a single order
@api_router.delete("/admin/orders/{order_id}")
async def delete_order(order_id: str, username: str = Depends(verify_admin)):
    """Delete a single order (admin only)"""
    order = await db.orders.find_one({"id": order_id})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    result = await db.orders.delete_one({"id": order_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    return {"message": "Bestellung gelöscht", "order_id": order_id}

# Admin: Export all data
@api_router.get("/admin/export")
async def export_all_data(username: str = Depends(verify_admin)):
    """Export all data as JSON for backup"""
    orders = await db.orders.find({}, {"_id": 0}).to_list(100000)
    articles = await db.articles.find({}, {"_id": 0}).to_list(1000)
    stands = await db.stands.find({}, {"_id": 0}).to_list(100)
    deposit_groups = await db.deposit_groups.find({}, {"_id": 0}).to_list(100)
    
    # Ensure backward compatibility for orders
    for order in orders:
        if "subtotal" not in order:
            order["subtotal"] = order.get("total", 0)
        if "deposit_total" not in order:
            order["deposit_total"] = 0
        if "deposit_return_total" not in order:
            order["deposit_return_total"] = 0
    
    export_data = {
        "export_date": datetime.now(timezone.utc).isoformat(),
        "orders": orders,
        "articles": articles,
        "stands": stands,
        "deposit_groups": deposit_groups,
        "statistics": {
            "total_orders": len(orders),
            "total_revenue": sum(o.get("total", 0) for o in orders),
            "completed_orders": len([o for o in orders if o.get("status") == "completed"])
        }
    }
    
    return export_data

# Admin: Verify PIN for reset
class PinVerification(BaseModel):
    pin: str

# Reset PIN (from environment with default)
RESET_PIN = os.environ.get("RESET_PIN", "200183")

@api_router.post("/admin/verify-pin")
async def verify_reset_pin(pin_data: PinVerification, username: str = Depends(verify_admin)):
    """Verify PIN before allowing reset"""
    if pin_data.pin != RESET_PIN:
        raise HTTPException(status_code=403, detail="Falscher PIN")
    return {"verified": True, "message": "PIN korrekt"}

# Admin: Reset all order data (keeps articles, stands, deposit groups)
@api_router.post("/admin/reset")
async def reset_order_data(pin_data: PinVerification, username: str = Depends(verify_admin)):
    """Reset all orders and counters (requires correct PIN)"""
    if pin_data.pin != RESET_PIN:
        raise HTTPException(status_code=403, detail="Falscher PIN")
    
    # Delete all orders
    orders_deleted = await db.orders.delete_many({})
    
    # Reset all order counters
    counters_deleted = await db.order_counters.delete_many({})
    
    return {
        "message": "Alle Bestellungen wurden zurückgesetzt",
        "orders_deleted": orders_deleted.deleted_count,
        "counters_reset": counters_deleted.deleted_count
    }

# Seed initial data
@api_router.post("/seed")
async def seed_data():
    # Seed deposit groups
    existing_deposits = await db.deposit_groups.count_documents({})
    if existing_deposits == 0:
        deposit_groups = [
            {"name": "Glas 0,5l", "amount": 2.00},
            {"name": "Glas 0,3l", "amount": 1.50},
            {"name": "Becher", "amount": 1.00},
        ]
        for dg in deposit_groups:
            dg_obj = DepositGroup(**dg)
            await db.deposit_groups.insert_one(dg_obj.model_dump())
    
    # Get deposit group IDs
    glass_05 = await db.deposit_groups.find_one({"name": "Glas 0,5l"}, {"_id": 0})
    glass_03 = await db.deposit_groups.find_one({"name": "Glas 0,3l"}, {"_id": 0})
    
    # Seed articles
    existing_articles = await db.articles.count_documents({})
    if existing_articles == 0:
        initial_articles = [
            {"name": "Bier 0,5l", "price": 4.50, "category": "getraenke", "deposit_group_id": glass_05["id"] if glass_05 else None},
            {"name": "Bier 0,3l", "price": 3.00, "category": "getraenke", "deposit_group_id": glass_03["id"] if glass_03 else None},
            {"name": "Radler 0,5l", "price": 4.50, "category": "getraenke", "deposit_group_id": glass_05["id"] if glass_05 else None},
            {"name": "Cola 0,4l", "price": 3.00, "category": "getraenke", "deposit_group_id": glass_03["id"] if glass_03 else None},
            {"name": "Fanta 0,4l", "price": 3.00, "category": "getraenke", "deposit_group_id": glass_03["id"] if glass_03 else None},
            {"name": "Sprite 0,4l", "price": 3.00, "category": "getraenke", "deposit_group_id": glass_03["id"] if glass_03 else None},
            {"name": "Wasser 0,5l", "price": 2.50, "category": "getraenke", "deposit_group_id": glass_05["id"] if glass_05 else None},
            {"name": "Apfelschorle 0,4l", "price": 3.00, "category": "getraenke", "deposit_group_id": glass_03["id"] if glass_03 else None},
            {"name": "Kaffee", "price": 2.50, "category": "getraenke"},
            {"name": "Bratwurst", "price": 4.00, "category": "speisen"},
            {"name": "Currywurst", "price": 4.50, "category": "speisen"},
            {"name": "Pommes", "price": 3.50, "category": "speisen"},
            {"name": "Pommes mit Mayo", "price": 4.00, "category": "speisen"},
            {"name": "Schnitzel", "price": 8.00, "category": "speisen"},
            {"name": "Leberkäse", "price": 5.00, "category": "speisen"},
            {"name": "Brezel", "price": 3.00, "category": "speisen"},
            {"name": "Wurstsalat", "price": 6.00, "category": "speisen"},
        ]
        
        for article in initial_articles:
            article_obj = Article(**article)
            await db.articles.insert_one(article_obj.model_dump())
    
    # Seed stands
    existing_stands = await db.stands.count_documents({})
    if existing_stands == 0:
        for i in range(1, 11):
            stand = Stand(
                id=f"stand_{i}",
                name=f"Stand {i}",
                stand_type="gemischt",
                articles=[],
                skip_preparation=False
            )
            await db.stands.insert_one(stand.model_dump())
    
    return {"message": "Seed-Daten erstellt"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def startup_db_client():
    """Initialize database indexes on startup for better performance"""
    await create_indexes()
    logger.info("Database initialized with performance indexes")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
