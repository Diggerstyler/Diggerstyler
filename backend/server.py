from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# Admin credentials
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin"

# Stands configuration
STANDS = [
    {"id": f"stand_{i}", "name": f"Stand {i}"} for i in range(1, 11)
]

STAND_TYPES = [
    {"id": "speisestand", "name": "Speisestand", "categories": ["speisen"]},
    {"id": "getraenkestand", "name": "Getränkestand", "categories": ["getraenke"]},
    {"id": "gemischt", "name": "Gemischter Stand", "categories": ["speisen", "getraenke"]}
]

ROLES = [
    {"id": "bestellung", "name": "Bestellung", "description": "Artikel buchen & abrechnen"},
    {"id": "kueche", "name": "Küche", "description": "Bestellungen zubereiten"},
    {"id": "ausgabe", "name": "Ausgabe", "description": "Fertige Bestellungen übergeben"},
    {"id": "onemanshow", "name": "OneManShow", "description": "Alles in einer Rolle: Tippen, Abrechnen, Ausgeben"}
]

ORDER_STATUS = {
    "created": "Erstellt",
    "in_progress": "In Bearbeitung",
    "ready": "Fertig",
    "completed": "Abgeholt"
}

# Models
class Article(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    price: float
    category: str  # "getraenke" or "speisen"
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ArticleCreate(BaseModel):
    name: str
    price: float
    category: str
    active: bool = True

class ArticleUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    active: Optional[bool] = None

class OrderItem(BaseModel):
    article_id: str
    article_name: str
    quantity: int
    price: float

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: int
    stand_id: str
    stand_name: str
    items: List[OrderItem]
    total: float
    status: str = "created"
    created_by: str  # Role name
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    processed_by: Optional[str] = None
    completed_by: Optional[str] = None

class OrderCreate(BaseModel):
    stand_id: str
    stand_name: str
    items: List[OrderItem]
    total: float
    created_by: str

class OrderStatusUpdate(BaseModel):
    status: str
    updated_by: str

class StatsFilter(BaseModel):
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    stand_id: Optional[str] = None
    role: Optional[str] = None

# Auth helper
def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    if not (correct_username and correct_password):
        raise HTTPException(status_code=401, detail="Ungültige Anmeldedaten")
    return credentials.username

# Routes
@api_router.get("/")
async def root():
    return {"message": "Festival OS API"}

@api_router.get("/stands")
async def get_stands():
    return STANDS

@api_router.get("/roles")
async def get_roles():
    return ROLES

@api_router.get("/stand-types")
async def get_stand_types():
    return STAND_TYPES

# Article Routes
@api_router.get("/articles", response_model=List[Article])
async def get_articles(active_only: bool = False):
    query = {"active": True} if active_only else {}
    articles = await db.articles.find(query, {"_id": 0}).to_list(1000)
    return articles

@api_router.post("/articles", response_model=Article)
async def create_article(article: ArticleCreate, username: str = Depends(verify_admin)):
    article_obj = Article(**article.model_dump())
    doc = article_obj.model_dump()
    await db.articles.insert_one(doc)
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
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    order_number = await get_next_order_number(order.stand_id)
    order_obj = Order(
        order_number=order_number,
        **order.model_dump()
    )
    doc = order_obj.model_dump()
    await db.orders.insert_one(doc)
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
    
    result = await db.orders.update_one({"id": order_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    
    updated = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return Order(**updated)

@api_router.get("/orders/{order_id}", response_model=Order)
async def get_order(order_id: str):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Bestellung nicht gefunden")
    return Order(**order)

# Stats Routes (Admin only)
@api_router.post("/stats/overview")
async def get_stats_overview(filters: StatsFilter, username: str = Depends(verify_admin)):
    query = {}
    
    if filters.start_date:
        query["created_at"] = {"$gte": filters.start_date}
    if filters.end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = filters.end_date
        else:
            query["created_at"] = {"$lte": filters.end_date}
    if filters.stand_id:
        query["stand_id"] = filters.stand_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(10000)
    
    total_orders = len(orders)
    total_revenue = sum(o.get("total", 0) for o in orders)
    completed_orders = len([o for o in orders if o.get("status") == "completed"])
    
    # Orders by stand
    orders_by_stand = {}
    for o in orders:
        stand = o.get("stand_name", "Unbekannt")
        if stand not in orders_by_stand:
            orders_by_stand[stand] = {"count": 0, "revenue": 0}
        orders_by_stand[stand]["count"] += 1
        orders_by_stand[stand]["revenue"] += o.get("total", 0)
    
    # Orders by hour
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

# Seed initial articles
@api_router.post("/seed")
async def seed_data():
    existing = await db.articles.count_documents({})
    if existing > 0:
        return {"message": "Daten bereits vorhanden"}
    
    initial_articles = [
        {"name": "Bier 0,5l", "price": 4.50, "category": "getraenke"},
        {"name": "Bier 0,3l", "price": 3.00, "category": "getraenke"},
        {"name": "Radler 0,5l", "price": 4.50, "category": "getraenke"},
        {"name": "Cola 0,4l", "price": 3.00, "category": "getraenke"},
        {"name": "Fanta 0,4l", "price": 3.00, "category": "getraenke"},
        {"name": "Sprite 0,4l", "price": 3.00, "category": "getraenke"},
        {"name": "Wasser 0,5l", "price": 2.50, "category": "getraenke"},
        {"name": "Apfelschorle 0,4l", "price": 3.00, "category": "getraenke"},
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
    
    return {"message": f"{len(initial_articles)} Artikel erstellt"}

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
