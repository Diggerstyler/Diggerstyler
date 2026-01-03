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

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# WebSocket Connection Manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, stand_id: str):
        await websocket.accept()
        if stand_id not in self.active_connections:
            self.active_connections[stand_id] = []
        self.active_connections[stand_id].append(websocket)
    
    def disconnect(self, websocket: WebSocket, stand_id: str):
        if stand_id in self.active_connections:
            if websocket in self.active_connections[stand_id]:
                self.active_connections[stand_id].remove(websocket)
    
    async def broadcast_to_stand(self, stand_id: str, message: dict):
        if stand_id in self.active_connections:
            dead_connections = []
            for connection in self.active_connections[stand_id]:
                try:
                    await connection.send_json(message)
                except:
                    dead_connections.append(connection)
            for conn in dead_connections:
                self.active_connections[stand_id].remove(conn)
    
    async def broadcast_all(self, message: dict):
        for stand_id in self.active_connections:
            await self.broadcast_to_stand(stand_id, message)

manager = ConnectionManager()

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"

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
    skip_preparation: bool = False
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class StandCreate(BaseModel):
    name: str
    stand_type: str = "gemischt"
    articles: List[str] = []
    skip_preparation: bool = False

class StandUpdate(BaseModel):
    name: Optional[str] = None
    stand_type: Optional[str] = None
    articles: Optional[List[str]] = None
    skip_preparation: Optional[bool] = None
    active: Optional[bool] = None

class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    category: str
    deposit_group_id: Optional[str] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ArticleCreate(BaseModel):
    name: str
    price: float
    category: str
    deposit_group_id: Optional[str] = None
    active: bool = True

class ArticleUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    deposit_group_id: Optional[str] = None
    active: Optional[bool] = None

class OrderItem(BaseModel):
    article_id: str
    article_name: str
    quantity: int
    price: float
    deposit_amount: float = 0
    is_deposit_return: bool = False

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
        manager.disconnect(websocket, stand_id)

# Routes
@api_router.get("/")
async def root():
    return {"message": "Festival OS API"}

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
    update_data = {k: v for k, v in article.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="Keine Daten zum Aktualisieren")
    
    result = await db.articles.update_one({"id": article_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Artikel nicht gefunden")
    
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
    
    for article in articles:
        if article.get("deposit_group_id") and article["deposit_group_id"] in deposit_map:
            article["deposit"] = deposit_map[article["deposit_group_id"]]
        else:
            article["deposit"] = None
    
    return articles

# Order Routes
async def get_next_order_number(stand_id: str) -> int:
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    counter = await db.order_counters.find_one_and_update(
        {"stand_id": stand_id, "date": today},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=True
    )
    return counter["count"]

@api_router.get("/orders", response_model=List[Order])
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
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    order_number = await get_next_order_number(order.stand_id)
    
    # Check if direct complete (OneManShow) or if stand has skip_preparation
    stand = await db.stands.find_one({"id": order.stand_id}, {"_id": 0})
    
    if order.direct_complete:
        initial_status = "completed"
    elif stand and stand.get("skip_preparation", False):
        initial_status = "ready"
    else:
        initial_status = "created"
    
    order_dict = order.model_dump()
    del order_dict["direct_complete"]
    
    order_obj = Order(
        order_number=order_number,
        status=initial_status,
        **order_dict
    )
    doc = order_obj.model_dump()
    await db.orders.insert_one(doc)
    
    # Broadcast to all connected clients for this stand
    await manager.broadcast_to_stand(order.stand_id, {
        "type": "new_order",
        "order": doc
    })
    
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
    
    # Broadcast update to stand
    await manager.broadcast_to_stand(order["stand_id"], {
        "type": "order_updated",
        "order": updated
    })
    
    return Order(**updated)

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return Order(**order)

# Kitchen Summary
@api_router.get("/stands/{stand_id}/kitchen-summary")
async def get_kitchen_summary(stand_id: str):
    orders = await db.orders.find(
        {"stand_id": stand_id, "status": {"$in": ["created", "in_progress"]}},
        {"_id": 0}
    ).to_list(1000)
    
    item_totals = {}
    for order in orders:
        for item in order.get("items", []):
            if item.get("is_deposit_return"):
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
