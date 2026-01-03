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
    {"id": "onemanshow", "name": "OneManShow", "description": "Alles in einer Rolle: Tippen, Abrechnen, Ausgeben"}
]

ORDER_STATUS = {
    "created": "Erstellt",
    "in_progress": "In Bearbeitung",
    "ready": "Fertig",
    "completed": "Abgeholt"
}

# Models
class Stand(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    stand_type: str = "gemischt"
    articles: List[str] = []  # List of article IDs assigned to this stand
    skip_preparation: bool = False  # If true, orders go directly to "ready" instead of "in_progress"
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
    created_by: str
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

class KitchenSummary(BaseModel):
    total_items: dict  # article_name: quantity
    total_orders: int

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

@api_router.get("/stand-types")
async def get_stand_types():
    return DEFAULT_STAND_TYPES

@api_router.get("/roles")
async def get_roles():
    return ROLES

# Stand Routes
@api_router.get("/stands")
async def get_stands(active_only: bool = False):
    query = {"active": True} if active_only else {}
    stands = await db.stands.find(query, {"_id": 0}).to_list(100)
    if not stands:
        # Initialize with default stands if none exist
        return []
    return stands

@api_router.post("/stands", response_model=Stand)
async def create_stand(stand: StandCreate, username: str = Depends(verify_admin)):
    stand_obj = Stand(**stand.model_dump())
    doc = stand_obj.model_dump()
    await db.stands.insert_one(doc)
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

# Get articles for a specific stand
@api_router.get("/stands/{stand_id}/articles")
async def get_stand_articles(stand_id: str):
    stand = await db.stands.find_one({"id": stand_id}, {"_id": 0})
    if not stand:
        raise HTTPException(status_code=404, detail="Stand nicht gefunden")
    
    # Get stand type categories
    stand_type = stand.get("stand_type", "gemischt")
    type_config = next((t for t in DEFAULT_STAND_TYPES if t["id"] == stand_type), DEFAULT_STAND_TYPES[2])
    allowed_categories = type_config["categories"]
    
    # Get assigned articles or all active articles of allowed categories
    assigned_article_ids = stand.get("articles", [])
    
    if assigned_article_ids:
        # Get only assigned articles that match categories
        articles = await db.articles.find(
            {"id": {"$in": assigned_article_ids}, "active": True, "category": {"$in": allowed_categories}},
            {"_id": 0}
        ).to_list(1000)
    else:
        # Get all active articles of allowed categories
        articles = await db.articles.find(
            {"active": True, "category": {"$in": allowed_categories}},
            {"_id": 0}
        ).to_list(1000)
    
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
    
    # Sort by created_at ascending (oldest first - FIFO)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return orders

@api_router.post("/orders", response_model=Order)
async def create_order(order: OrderCreate):
    order_number = await get_next_order_number(order.stand_id)
    
    # Check if stand has skip_preparation enabled
    stand = await db.stands.find_one({"id": order.stand_id}, {"_id": 0})
    initial_status = "ready" if stand and stand.get("skip_preparation", False) else "created"
    
    order_obj = Order(
        order_number=order_number,
        status=initial_status,
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

# Kitchen Summary - total open items across all orders for a stand
@api_router.get("/stands/{stand_id}/kitchen-summary")
async def get_kitchen_summary(stand_id: str):
    # Get all orders that are created or in_progress for this stand
    orders = await db.orders.find(
        {"stand_id": stand_id, "status": {"$in": ["created", "in_progress"]}},
        {"_id": 0}
    ).to_list(1000)
    
    # Aggregate items
    item_totals = {}
    for order in orders:
        for item in order.get("items", []):
            name = item.get("article_name", "Unbekannt")
            qty = item.get("quantity", 0)
            if name in item_totals:
                item_totals[name] += qty
            else:
                item_totals[name] = qty
    
    # Sort by quantity descending
    sorted_items = dict(sorted(item_totals.items(), key=lambda x: x[1], reverse=True))
    
    return {
        "total_items": sorted_items,
        "total_orders": len(orders)
    }

# Stats Routes (Admin only)
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

# Seed initial data
@api_router.post("/seed")
async def seed_data():
    # Seed articles
    existing_articles = await db.articles.count_documents({})
    if existing_articles == 0:
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
