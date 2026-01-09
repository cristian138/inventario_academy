from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Request, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.units import inch
import io
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440  # 24 hours

security = HTTPBearer()

# Predefined lists - REMOVED, now managed dynamically in database

# Password hashing
def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

# JWT token creation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Get current user from token
async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        user_type: str = payload.get("type", "user")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    if user_type == "instructor":
        instructor = await db.instructors.find_one({"email": email}, {"_id": 0})
        if instructor is None:
            raise HTTPException(status_code=401, detail="Instructor not found")
        instructor["role"] = "instructor"
        return instructor
    
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# Audit log function
async def create_audit_log(user_email: str, action: str, module: str, ip: str, details: str = ""):
    audit_log = {
        "id": str(uuid.uuid4()),
        "user_email": user_email,
        "action": action,
        "module": module,
        "ip": ip,
        "details": details,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    await db.audit_logs.insert_one(audit_log)

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class LoginResponse(BaseModel):
    token: str
    user: dict

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[str] = None
    active: Optional[bool] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    role: str
    active: bool
    created_at: str

class CategoryCreate(BaseModel):
    name: str
    description: str

class Category(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    created_at: str

class GoodCreate(BaseModel):
    name: str
    category_id: str
    description: str
    status: str
    quantity: int
    location: str
    responsible: str

class GoodUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    quantity: Optional[int] = None
    location: Optional[str] = None
    responsible: Optional[str] = None

class Good(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    category_id: str
    description: str
    status: str
    quantity: int
    available_quantity: int
    location: str
    responsible: str
    created_at: str

class AssignmentDetailCreate(BaseModel):
    good_id: str
    quantity_assigned: int

class AssignmentCreate(BaseModel):
    instructor_name: str
    discipline: str
    details: List[AssignmentDetailCreate]
    notes: Optional[str] = ""

class Assignment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    instructor_name: str
    discipline: str
    created_by: str
    created_at: str
    status: str
    notes: str

class DashboardStats(BaseModel):
    total_goods: int
    total_quantity: int
    available_quantity: int
    assigned_quantity: int
    total_assignments: int
    total_categories: int
    recent_assignments: List[dict]

# New Models for Instructors, Sports, and Warehouses
class InstructorCreate(BaseModel):
    name: str
    email: EmailStr
    phone: str
    specialization: str
    password: Optional[str] = None  # Optional password for login access

class InstructorUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    specialization: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None  # Optional password update

class Instructor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    email: EmailStr
    phone: str
    specialization: str
    active: bool
    has_login: bool = False  # Indicates if instructor can login
    created_at: str

class SportCreate(BaseModel):
    name: str
    description: str

class SportUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    active: Optional[bool] = None

class Sport(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    description: str
    active: bool
    created_at: str

class WarehouseCreate(BaseModel):
    name: str
    location: str
    capacity: int
    responsible: str

class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    location: Optional[str] = None
    capacity: Optional[int] = None
    responsible: Optional[str] = None
    active: Optional[bool] = None

class Warehouse(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    location: str
    capacity: int
    responsible: str
    active: bool
    created_at: str

# Email notification function
async def send_email_notification(to_email: str, subject: str, html_content: str):
    try:
        import resend
        resend.api_key = os.environ.get('RESEND_API_KEY', '')
        
        if not resend.api_key:
            logger.warning("RESEND_API_KEY not configured, skipping email notification")
            return False
            
        params = {
            "from": "Sistema de Inventarios <onboarding@resend.dev>",
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }
        
        email = resend.Emails.send(params)
        logger.info(f"Email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Error sending email: {str(e)}")
        return False

# Get instructors and disciplines from database
@api_router.get("/instructors")
async def get_instructors(current_user: dict = Depends(get_current_user)):
    instructors = await db.instructors.find({"active": True}, {"_id": 0}).to_list(1000)
    return {"instructors": [i["name"] for i in instructors]}

@api_router.get("/disciplines")
async def get_disciplines(current_user: dict = Depends(get_current_user)):
    sports = await db.sports.find({"active": True}, {"_id": 0}).to_list(1000)
    return {"disciplines": [s["name"] for s in sports]}

# Auth endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest):
    # First try to find in users collection
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if user:
        if not verify_password(login_data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Usuario desactivado")
        
        token = create_access_token({"sub": user["email"], "type": "user"})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(user["email"], "LOGIN", "auth", client_ip)
        
        user_data = {k: v for k, v in user.items() if k != "password_hash"}
        return {"token": token, "user": user_data}
    
    # Try to find in instructors collection
    instructor = await db.instructors.find_one({"email": login_data.email, "has_login": True}, {"_id": 0})
    
    if instructor:
        if not instructor.get("password_hash") or not verify_password(login_data.password, instructor["password_hash"]):
            raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
        
        if not instructor.get("active", True):
            raise HTTPException(status_code=403, detail="Instructor desactivado")
        
        token = create_access_token({"sub": instructor["email"], "type": "instructor"})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(instructor["email"], "LOGIN_INSTRUCTOR", "auth", client_ip)
        
        instructor_data = {k: v for k, v in instructor.items() if k != "password_hash"}
        instructor_data["role"] = "instructor"
        return {"token": token, "user": instructor_data}
    
    raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")

@api_router.get("/auth/me", response_model=User)
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    user_data = {k: v for k, v in current_user.items() if k != "password_hash"}
    return user_data

# User management endpoints
@api_router.get("/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return users

@api_router.post("/users", response_model=User)
async def create_user(request: Request, user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    user = {
        "id": str(uuid.uuid4()),
        "name": user_data.name,
        "email": user_data.email,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_USER", "users", client_ip, f"Created user: {user_data.email}")
    
    user_response = {k: v for k, v in user.items() if k != "password_hash"}
    return user_response

@api_router.put("/users/{user_id}", response_model=User)
async def update_user(request: Request, user_id: str, user_data: UserUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    update_data = {k: v for k, v in user_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.users.update_one({"id": user_id}, {"$set": update_data})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_USER", "users", client_ip, f"Updated user: {user_id}")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return updated_user

@api_router.delete("/users/{user_id}")
async def delete_user(request: Request, user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_USER", "users", client_ip, f"Deleted user: {user_id}")
    
    return {"message": "Usuario eliminado exitosamente"}

# Category endpoints
@api_router.get("/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.categories.find({}, {"_id": 0}).to_list(1000)
    return categories

@api_router.post("/categories", response_model=Category)
async def create_category(request: Request, category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category = {
        "id": str(uuid.uuid4()),
        "name": category_data.name,
        "description": category_data.description,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.categories.insert_one(category)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_CATEGORY", "categories", client_ip, f"Created: {category_data.name}")
    
    return category

@api_router.delete("/categories/{category_id}")
async def delete_category(request: Request, category_id: str, current_user: dict = Depends(get_current_user)):
    # Check if category is in use
    goods_using_category = await db.goods.count_documents({"category_id": category_id})
    if goods_using_category > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {goods_using_category} bienes usando esta categoría"
        )
    
    result = await db.categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Categoría no encontrada")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_CATEGORY", "categories", client_ip, f"Deleted: {category_id}")
    
    return {"message": "Categoría eliminada exitosamente"}

# Instructor endpoints
@api_router.get("/instructors-management", response_model=List[Instructor])
async def get_instructors_management(current_user: dict = Depends(get_current_user)):
    instructors = await db.instructors.find({}, {"_id": 0}).to_list(1000)
    return instructors

@api_router.post("/instructors-management", response_model=Instructor)
async def create_instructor(request: Request, instructor_data: InstructorCreate, current_user: dict = Depends(get_current_user)):
    instructor = {
        "id": str(uuid.uuid4()),
        "name": instructor_data.name,
        "email": instructor_data.email,
        "phone": instructor_data.phone,
        "specialization": instructor_data.specialization,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.instructors.insert_one(instructor)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_INSTRUCTOR", "instructors", client_ip, f"Created: {instructor_data.name}")
    
    return instructor

@api_router.put("/instructors-management/{instructor_id}", response_model=Instructor)
async def update_instructor(request: Request, instructor_id: str, instructor_data: InstructorUpdate, current_user: dict = Depends(get_current_user)):
    instructor = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
    
    update_data = {k: v for k, v in instructor_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.instructors.update_one({"id": instructor_id}, {"$set": update_data})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_INSTRUCTOR", "instructors", client_ip, f"Updated: {instructor_id}")
    
    updated_instructor = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    return updated_instructor

@api_router.delete("/instructors-management/{instructor_id}")
async def delete_instructor(request: Request, instructor_id: str, current_user: dict = Depends(get_current_user)):
    # Get instructor name first
    instructor = await db.instructors.find_one({"id": instructor_id}, {"_id": 0})
    if not instructor:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
    
    # Check if instructor is in use by any assignments
    assignments_using_instructor = await db.assignments.count_documents({"instructor_name": instructor["name"]})
    if assignments_using_instructor > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {assignments_using_instructor} asignaciones a este instructor"
        )
    
    result = await db.instructors.delete_one({"id": instructor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Instructor no encontrado")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_INSTRUCTOR", "instructors", client_ip, f"Deleted: {instructor_id}")
    
    return {"message": "Instructor eliminado exitosamente"}

# Sport endpoints
@api_router.get("/sports-management", response_model=List[Sport])
async def get_sports_management(current_user: dict = Depends(get_current_user)):
    sports = await db.sports.find({}, {"_id": 0}).to_list(1000)
    return sports

@api_router.post("/sports-management", response_model=Sport)
async def create_sport(request: Request, sport_data: SportCreate, current_user: dict = Depends(get_current_user)):
    sport = {
        "id": str(uuid.uuid4()),
        "name": sport_data.name,
        "description": sport_data.description,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sports.insert_one(sport)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_SPORT", "sports", client_ip, f"Created: {sport_data.name}")
    
    return sport

@api_router.put("/sports-management/{sport_id}", response_model=Sport)
async def update_sport(request: Request, sport_id: str, sport_data: SportUpdate, current_user: dict = Depends(get_current_user)):
    sport = await db.sports.find_one({"id": sport_id}, {"_id": 0})
    if not sport:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    
    update_data = {k: v for k, v in sport_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.sports.update_one({"id": sport_id}, {"$set": update_data})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_SPORT", "sports", client_ip, f"Updated: {sport_id}")
    
    updated_sport = await db.sports.find_one({"id": sport_id}, {"_id": 0})
    return updated_sport

@api_router.delete("/sports-management/{sport_id}")
async def delete_sport(request: Request, sport_id: str, current_user: dict = Depends(get_current_user)):
    # Get sport name first
    sport = await db.sports.find_one({"id": sport_id}, {"_id": 0})
    if not sport:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    
    # Check if sport is in use by any assignments
    assignments_using_sport = await db.assignments.count_documents({"discipline": sport["name"]})
    if assignments_using_sport > 0:
        raise HTTPException(
            status_code=400, 
            detail=f"No se puede eliminar. Hay {assignments_using_sport} asignaciones usando este deporte"
        )
    
    result = await db.sports.delete_one({"id": sport_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Deporte no encontrado")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_SPORT", "sports", client_ip, f"Deleted: {sport_id}")
    
    return {"message": "Deporte eliminado exitosamente"}

# Warehouse endpoints
@api_router.get("/warehouses", response_model=List[Warehouse])
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    warehouses = await db.warehouses.find({}, {"_id": 0}).to_list(1000)
    return warehouses

@api_router.post("/warehouses", response_model=Warehouse)
async def create_warehouse(request: Request, warehouse_data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    warehouse = {
        "id": str(uuid.uuid4()),
        "name": warehouse_data.name,
        "location": warehouse_data.location,
        "capacity": warehouse_data.capacity,
        "responsible": warehouse_data.responsible,
        "active": True,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.warehouses.insert_one(warehouse)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_WAREHOUSE", "warehouses", client_ip, f"Created: {warehouse_data.name}")
    
    return warehouse

@api_router.put("/warehouses/{warehouse_id}", response_model=Warehouse)
async def update_warehouse(request: Request, warehouse_id: str, warehouse_data: WarehouseUpdate, current_user: dict = Depends(get_current_user)):
    warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    if not warehouse:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")
    
    update_data = {k: v for k, v in warehouse_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.warehouses.update_one({"id": warehouse_id}, {"$set": update_data})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_WAREHOUSE", "warehouses", client_ip, f"Updated: {warehouse_id}")
    
    updated_warehouse = await db.warehouses.find_one({"id": warehouse_id}, {"_id": 0})
    return updated_warehouse

@api_router.delete("/warehouses/{warehouse_id}")
async def delete_warehouse(request: Request, warehouse_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.warehouses.delete_one({"id": warehouse_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bodega no encontrada")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_WAREHOUSE", "warehouses", client_ip, f"Deleted: {warehouse_id}")
    
    return {"message": "Bodega eliminada exitosamente"}

# Goods endpoints
@api_router.get("/goods", response_model=List[Good])
async def get_goods(current_user: dict = Depends(get_current_user)):
    goods = await db.goods.find({}, {"_id": 0}).to_list(1000)
    return goods

@api_router.post("/goods", response_model=Good)
async def create_good(request: Request, good_data: GoodCreate, current_user: dict = Depends(get_current_user)):
    good = {
        "id": str(uuid.uuid4()),
        "name": good_data.name,
        "category_id": good_data.category_id,
        "description": good_data.description,
        "status": good_data.status,
        "quantity": good_data.quantity,
        "available_quantity": good_data.quantity,
        "location": good_data.location,
        "responsible": good_data.responsible,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.goods.insert_one(good)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_GOOD", "goods", client_ip, f"Created: {good_data.name}")
    
    return good

@api_router.put("/goods/{good_id}", response_model=Good)
async def update_good(request: Request, good_id: str, good_data: GoodUpdate, current_user: dict = Depends(get_current_user)):
    good = await db.goods.find_one({"id": good_id}, {"_id": 0})
    if not good:
        raise HTTPException(status_code=404, detail="Bien no encontrado")
    
    update_data = {k: v for k, v in good_data.model_dump(exclude_unset=True).items() if v is not None}
    
    if update_data:
        await db.goods.update_one({"id": good_id}, {"$set": update_data})
        
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_GOOD", "goods", client_ip, f"Updated: {good_id}")
    
    updated_good = await db.goods.find_one({"id": good_id}, {"_id": 0})
    return updated_good

@api_router.delete("/goods/{good_id}")
async def delete_good(request: Request, good_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.goods.delete_one({"id": good_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bien no encontrado")
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_GOOD", "goods", client_ip, f"Deleted: {good_id}")
    
    return {"message": "Bien eliminado exitosamente"}

# Assignment endpoints
@api_router.get("/assignments", response_model=List[dict])
async def get_assignments(current_user: dict = Depends(get_current_user)):
    assignments = await db.assignments.find({}, {"_id": 0}).to_list(1000)
    
    for assignment in assignments:
        details = await db.assignment_details.find(
            {"assignment_id": assignment["id"]}, 
            {"_id": 0}
        ).to_list(1000)
        assignment["details"] = details
    
    return assignments

@api_router.post("/assignments")
async def create_assignment(request: Request, assignment_data: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    # Validate stock
    for detail in assignment_data.details:
        good = await db.goods.find_one({"id": detail.good_id}, {"_id": 0})
        if not good:
            raise HTTPException(status_code=404, detail=f"Bien no encontrado: {detail.good_id}")
        
        if good["available_quantity"] < detail.quantity_assigned:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {good['name']}. Disponible: {good['available_quantity']}, Solicitado: {detail.quantity_assigned}"
            )
    
    assignment_id = str(uuid.uuid4())
    assignment = {
        "id": assignment_id,
        "instructor_name": assignment_data.instructor_name,
        "discipline": assignment_data.discipline,
        "created_by": current_user["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "activa",
        "notes": assignment_data.notes,
        "signed_acta_uploaded": False
    }
    
    await db.assignments.insert_one(assignment)
    
    details_list = []
    for detail in assignment_data.details:
        detail_doc = {
            "id": str(uuid.uuid4()),
            "assignment_id": assignment_id,
            "good_id": detail.good_id,
            "quantity_assigned": detail.quantity_assigned,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.assignment_details.insert_one(detail_doc)
        details_list.append(detail_doc)
        
        await db.goods.update_one(
            {"id": detail.good_id},
            {"$inc": {"available_quantity": -detail.quantity_assigned}}
        )
    
    # Generate PDF
    acta_code = f"ACTA-{assignment_id[:8].upper()}"
    pdf_filename = f"{acta_code}.pdf"
    pdf_path = ROOT_DIR / "actas" / pdf_filename
    pdf_path.parent.mkdir(exist_ok=True)
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch, bottomMargin=0.5*inch)
    elements = []
    styles = getSampleStyleSheet()
    
    # Logo
    logo_url = "https://customer-assets.emergentagent.com/job_cc84c26b-490c-4e94-9201-0c145d45c1fb/artifacts/p507w2uv_LOGO-PRINCIPAL-CON-FONDO.jpg"
    try:
        img = Image(logo_url, width=2*inch, height=0.8*inch)
        elements.append(img)
    except:
        pass
    
    elements.append(Spacer(1, 0.3*inch))
    
    title = Paragraph("<b>ACTA DE ENTREGA DE INVENTARIO</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))
    
    info = f"""<br/>
    <b>Código:</b> {acta_code}<br/>
    <b>Instructor:</b> {assignment_data.instructor_name}<br/>
    <b>Disciplina:</b> {assignment_data.discipline}<br/>
    <b>Fecha:</b> {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}<br/>
    <b>Entregado por:</b> {current_user['name']} ({current_user['email']})<br/>
    """
    elements.append(Paragraph(info, styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    table_data = [["Bien", "Descripción", "Cantidad"]]
    for detail in assignment_data.details:
        good = await db.goods.find_one({"id": detail.good_id}, {"_id": 0})
        table_data.append([good["name"], good["description"], str(detail.quantity_assigned)])
    
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1E40AF')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black)
    ]))
    elements.append(table)
    
    if assignment_data.notes:
        elements.append(Spacer(1, 0.3*inch))
        elements.append(Paragraph(f"<b>Notas:</b> {assignment_data.notes}", styles['Normal']))
    
    # Signature section
    elements.append(Spacer(1, inch))
    sig_table_data = [
        ["_" * 30, "_" * 30],
        ["Firma Instructor", "Firma Responsable"]
    ]
    sig_table = Table(sig_table_data, colWidths=[2.5*inch, 2.5*inch])
    sig_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, 1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 1), (-1, 1), 10),
    ]))
    elements.append(sig_table)
    
    doc.build(elements)
    
    with open(pdf_path, 'wb') as f:
        f.write(buffer.getvalue())
    
    acta = {
        "id": str(uuid.uuid4()),
        "assignment_id": assignment_id,
        "code": acta_code,
        "pdf_filename": pdf_filename,
        "type": "entrega",
        "created_by": current_user["email"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.actas.insert_one(acta)
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_ASSIGNMENT", "assignments", client_ip, f"Instructor: {assignment_data.instructor_name}")
    
    # Send email notification to instructor
    instructor = await db.instructors.find_one({"name": assignment_data.instructor_name}, {"_id": 0})
    if instructor and instructor.get("email"):
        goods_list = "<ul>"
        for detail in assignment_data.details:
            good = await db.goods.find_one({"id": detail.good_id}, {"_id": 0})
            goods_list += f"<li>{good['name']} - Cantidad: {detail.quantity_assigned}</li>"
        goods_list += "</ul>"
        
        email_html = f"""
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
                    <h2 style="color: #1E40AF;">Nueva Asignación de Inventario - Academia Jotuns Club SAS</h2>
                    <p>Estimado/a <strong>{assignment_data.instructor_name}</strong>,</p>
                    <p>Se ha generado una nueva asignación de inventario a su nombre:</p>
                    
                    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
                        <p><strong>Código de Acta:</strong> {acta_code}</p>
                        <p><strong>Disciplina:</strong> {assignment_data.discipline}</p>
                        <p><strong>Fecha:</strong> {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}</p>
                        <p><strong>Responsable:</strong> {current_user['name']}</p>
                    </div>
                    
                    <h3 style="color: #1E40AF;">Bienes Asignados:</h3>
                    {goods_list}
                    
                    {f'<p><strong>Notas:</strong> {assignment_data.notes}</p>' if assignment_data.notes else ''}
                    
                    <p style="margin-top: 30px;">Por favor, revise el acta de entrega y proceda con la firma correspondiente.</p>
                    
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        Este es un mensaje automático del Sistema de Inventarios - Academia Jotuns Club SAS
                    </p>
                </div>
            </body>
        </html>
        """
        
        await send_email_notification(
            instructor["email"],
            f"Nueva Asignación de Inventario - {acta_code}",
            email_html
        )
    
    return {
        "message": "Asignación creada exitosamente",
        "assignment_id": assignment_id,
        "acta_code": acta_code
    }

# Actas endpoints
@api_router.get("/actas")
async def get_actas(current_user: dict = Depends(get_current_user)):
    actas = await db.actas.find({}, {"_id": 0}).to_list(1000)
    
    for acta in actas:
        assignment = await db.assignments.find_one({"id": acta["assignment_id"]}, {"_id": 0})
        acta["assignment"] = assignment
    
    return actas

@api_router.get("/actas/{acta_id}/download")
async def download_acta(acta_id: str, current_user: dict = Depends(get_current_user)):
    acta = await db.actas.find_one({"id": acta_id}, {"_id": 0})
    if not acta:
        raise HTTPException(status_code=404, detail="Acta no encontrada")
    
    pdf_path = ROOT_DIR / "actas" / acta["pdf_filename"]
    if not pdf_path.exists():
        raise HTTPException(status_code=404, detail="Archivo PDF no encontrado")
    
    return FileResponse(
        pdf_path, 
        filename=acta["pdf_filename"], 
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={acta['pdf_filename']}"}
    )

@api_router.post("/actas/{assignment_id}/upload-signed")
async def upload_signed_acta(
    request: Request,
    assignment_id: str, 
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment:
        raise HTTPException(status_code=404, detail="Asignación no encontrada")
    
    # Save uploaded file
    upload_dir = ROOT_DIR / "actas" / "signed"
    upload_dir.mkdir(exist_ok=True, parents=True)
    
    file_extension = file.filename.split(".")[-1]
    signed_filename = f"SIGNED_{assignment_id[:8].upper()}.{file_extension}"
    file_path = upload_dir / signed_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Update assignment
    await db.assignments.update_one(
        {"id": assignment_id},
        {"$set": {
            "signed_acta_uploaded": True,
            "signed_acta_filename": signed_filename,
            "signed_acta_uploaded_at": datetime.now(timezone.utc).isoformat(),
            "signed_acta_uploaded_by": current_user["email"]
        }}
    )
    
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "UPLOAD_SIGNED_ACTA", "actas", client_ip, f"Assignment: {assignment_id}")
    
    return {"message": "Acta firmada subida exitosamente", "filename": signed_filename}

@api_router.get("/actas/{assignment_id}/download-signed")
async def download_signed_acta(assignment_id: str, current_user: dict = Depends(get_current_user)):
    assignment = await db.assignments.find_one({"id": assignment_id}, {"_id": 0})
    if not assignment or not assignment.get("signed_acta_uploaded"):
        raise HTTPException(status_code=404, detail="Acta firmada no encontrada")
    
    file_path = ROOT_DIR / "actas" / "signed" / assignment["signed_acta_filename"]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Archivo no encontrado")
    
    return FileResponse(file_path, filename=assignment["signed_acta_filename"], media_type="application/pdf")

# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    goods = await db.goods.find({}, {"_id": 0}).to_list(10000)
    total_goods = len(goods)
    total_quantity = sum(g["quantity"] for g in goods)
    available_quantity = sum(g["available_quantity"] for g in goods)
    assigned_quantity = total_quantity - available_quantity
    
    assignments = await db.assignments.count_documents({})
    categories = await db.categories.count_documents({})
    recent = await db.assignments.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    return {
        "total_goods": total_goods,
        "total_quantity": total_quantity,
        "available_quantity": available_quantity,
        "assigned_quantity": assigned_quantity,
        "total_assignments": assignments,
        "total_categories": categories,
        "recent_assignments": recent
    }

# Audit logs
@api_router.get("/audit")
async def get_audit_logs(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="No autorizado")
    
    logs = await db.audit_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(100).to_list(100)
    return logs

# Reports
@api_router.get("/reports")
async def get_reports(
    report_type: str,
    category_id: Optional[str] = None,
    instructor_name: Optional[str] = None,
    discipline: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if report_type == "inventory":
        goods = await db.goods.find({}, {"_id": 0}).to_list(10000)
        for good in goods:
            category = await db.categories.find_one({"id": good["category_id"]}, {"_id": 0})
            good["category_name"] = category["name"] if category else "N/A"
        return goods
    
    elif report_type == "assignments":
        query = {}
        if instructor_name:
            query["instructor_name"] = instructor_name
        if discipline:
            query["discipline"] = discipline
        
        assignments = await db.assignments.find(query, {"_id": 0}).to_list(10000)
        for assignment in assignments:
            details = await db.assignment_details.find(
                {"assignment_id": assignment["id"]}, 
                {"_id": 0}
            ).to_list(1000)
            
            for detail in details:
                good = await db.goods.find_one({"id": detail["good_id"]}, {"_id": 0})
                detail["good_name"] = good["name"] if good else "N/A"
            
            assignment["details"] = details
        
        return assignments
    
    return []

# Include the router
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
async def startup_event():
    # Create default admin
    admin = await db.users.find_one({"email": "admin@academia.com"})
    if not admin:
        default_admin = {
            "id": str(uuid.uuid4()),
            "name": "Administrador",
            "email": "admin@academia.com",
            "password_hash": get_password_hash("admin123"),
            "role": "admin",
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.users.insert_one(default_admin)
        logger.info("Default admin user created: admin@academia.com / admin123")
    
    # Create default instructors if none exist
    instructors_count = await db.instructors.count_documents({})
    if instructors_count == 0:
        default_instructors = [
            {"id": str(uuid.uuid4()), "name": "Juan Pérez", "email": "juan.perez@academia.com", "phone": "555-0101", "specialization": "Fútbol", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "María González", "email": "maria.gonzalez@academia.com", "phone": "555-0102", "specialization": "Natación", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Carlos Rodríguez", "email": "carlos.rodriguez@academia.com", "phone": "555-0103", "specialization": "Baloncesto", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Ana Martínez", "email": "ana.martinez@academia.com", "phone": "555-0104", "specialization": "Tenis", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Luis Fernández", "email": "luis.fernandez@academia.com", "phone": "555-0105", "specialization": "Atletismo", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.instructors.insert_many(default_instructors)
        logger.info("Default instructors created")
    
    # Create default sports if none exist
    sports_count = await db.sports.count_documents({})
    if sports_count == 0:
        default_sports = [
            {"id": str(uuid.uuid4()), "name": "Fútbol", "description": "Deporte de equipo con balón", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Baloncesto", "description": "Deporte de canasta", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Voleibol", "description": "Deporte de red y pelota", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Natación", "description": "Deporte acuático", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Atletismo", "description": "Carreras y competiciones atléticas", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Tenis", "description": "Deporte de raqueta", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Gimnasia", "description": "Ejercicios de flexibilidad y fuerza", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Artes Marciales", "description": "Deportes de combate", "active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.sports.insert_many(default_sports)
        logger.info("Default sports created")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()