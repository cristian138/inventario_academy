from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, UploadFile, File, Request
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
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import io

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

# Create the main app
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

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
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
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
    role: str  # "admin" or "control"

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
    status: str  # "disponible", "asignado", "mantenimiento", "baja"
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

# Auth endpoints
@api_router.post("/auth/login", response_model=LoginResponse)
async def login(request: Request, login_data: LoginRequest):
    user = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email o contraseña incorrectos")
    
    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Usuario desactivado")
    
    token = create_access_token({"sub": user["email"]})
    
    # Create audit log
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(user["email"], "LOGIN", "auth", client_ip)
    
    user_data = {k: v for k, v in user.items() if k != "password_hash"}
    return {"token": token, "user": user_data}

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
    
    # Check if email exists
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
    
    # Audit log
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
        
        # Audit log
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
    
    # Audit log
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
    
    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_CATEGORY", "categories", client_ip, f"Created: {category_data.name}")
    
    return category

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
    
    # Audit log
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
        
        # Audit log
        client_ip = request.client.host if request.client else "unknown"
        await create_audit_log(current_user["email"], "UPDATE_GOOD", "goods", client_ip, f"Updated: {good_id}")
    
    updated_good = await db.goods.find_one({"id": good_id}, {"_id": 0})
    return updated_good

@api_router.delete("/goods/{good_id}")
async def delete_good(request: Request, good_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.goods.delete_one({"id": good_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bien no encontrado")
    
    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "DELETE_GOOD", "goods", client_ip, f"Deleted: {good_id}")
    
    return {"message": "Bien eliminado exitosamente"}

# Assignment endpoints
@api_router.get("/assignments", response_model=List[dict])
async def get_assignments(current_user: dict = Depends(get_current_user)):
    assignments = await db.assignments.find({}, {"_id": 0}).to_list(1000)
    
    # Add details for each assignment
    for assignment in assignments:
        details = await db.assignment_details.find(
            {"assignment_id": assignment["id"]}, 
            {"_id": 0}
        ).to_list(1000)
        assignment["details"] = details
    
    return assignments

@api_router.post("/assignments")
async def create_assignment(request: Request, assignment_data: AssignmentCreate, current_user: dict = Depends(get_current_user)):
    # Validate stock for each item
    for detail in assignment_data.details:
        good = await db.goods.find_one({"id": detail.good_id}, {"_id": 0})
        if not good:
            raise HTTPException(status_code=404, detail=f"Bien no encontrado: {detail.good_id}")
        
        if good["available_quantity"] < detail.quantity_assigned:
            raise HTTPException(
                status_code=400, 
                detail=f"Stock insuficiente para {good['name']}. Disponible: {good['available_quantity']}, Solicitado: {detail.quantity_assigned}"
            )
    
    # Create assignment
    assignment_id = str(uuid.uuid4())
    assignment = {
        "id": assignment_id,
        "instructor_name": assignment_data.instructor_name,
        "discipline": assignment_data.discipline,
        "created_by": current_user["email"],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "activa",
        "notes": assignment_data.notes
    }
    
    await db.assignments.insert_one(assignment)
    
    # Create details and update stock
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
        
        # Update available quantity
        await db.goods.update_one(
            {"id": detail.good_id},
            {"$inc": {"available_quantity": -detail.quantity_assigned}}
        )
    
    # Generate PDF acta
    acta_code = f"ACTA-{assignment_id[:8].upper()}"
    pdf_filename = f"{acta_code}.pdf"
    pdf_path = ROOT_DIR / "actas" / pdf_filename
    pdf_path.parent.mkdir(exist_ok=True)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    elements = []
    styles = getSampleStyleSheet()
    
    # Title
    title = Paragraph(f"<b>ACTA DE ENTREGA DE INVENTARIO</b>", styles['Title'])
    elements.append(title)
    elements.append(Spacer(1, 0.3*inch))
    
    # Info
    info = f"""<br/>
    <b>Código:</b> {acta_code}<br/>
    <b>Instructor:</b> {assignment_data.instructor_name}<br/>
    <b>Disciplina:</b> {assignment_data.discipline}<br/>
    <b>Fecha:</b> {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}<br/>
    <b>Entregado por:</b> {current_user['name']} ({current_user['email']})<br/>
    """
    elements.append(Paragraph(info, styles['Normal']))
    elements.append(Spacer(1, 0.3*inch))
    
    # Table of goods
    table_data = [["Bien", "Descripción", "Cantidad"]]
    for detail in assignment_data.details:
        good = await db.goods.find_one({"id": detail.good_id}, {"_id": 0})
        table_data.append([good["name"], good["description"], str(detail.quantity_assigned)])
    
    table = Table(table_data)
    table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
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
    
    doc.build(elements)
    
    # Save PDF
    with open(pdf_path, 'wb') as f:
        f.write(buffer.getvalue())
    
    # Save acta record
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
    
    # Audit log
    client_ip = request.client.host if request.client else "unknown"
    await create_audit_log(current_user["email"], "CREATE_ASSIGNMENT", "assignments", client_ip, f"Instructor: {assignment_data.instructor_name}")
    
    return {
        "message": "Asignación creada exitosamente",
        "assignment_id": assignment_id,
        "acta_code": acta_code
    }

# Actas endpoints
@api_router.get("/actas")
async def get_actas(current_user: dict = Depends(get_current_user)):
    actas = await db.actas.find({}, {"_id": 0}).to_list(1000)
    
    # Add assignment info
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
    
    return FileResponse(pdf_path, filename=acta["pdf_filename"], media_type="application/pdf")

# Dashboard stats
@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Total goods
    goods = await db.goods.find({}, {"_id": 0}).to_list(10000)
    total_goods = len(goods)
    total_quantity = sum(g["quantity"] for g in goods)
    available_quantity = sum(g["available_quantity"] for g in goods)
    assigned_quantity = total_quantity - available_quantity
    
    # Total assignments
    assignments = await db.assignments.count_documents({})
    
    # Total categories
    categories = await db.categories.count_documents({})
    
    # Recent assignments
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

# Reports endpoint
@api_router.get("/reports")
async def get_reports(
    report_type: str,
    category_id: Optional[str] = None,
    instructor_name: Optional[str] = None,
    discipline: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    if report_type == "inventory":
        # All goods with category info
        goods = await db.goods.find({}, {"_id": 0}).to_list(10000)
        for good in goods:
            category = await db.categories.find_one({"id": good["category_id"]}, {"_id": 0})
            good["category_name"] = category["name"] if category else "N/A"
        return goods
    
    elif report_type == "assignments":
        # All assignments with details
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
            
            # Add good names
            for detail in details:
                good = await db.goods.find_one({"id": detail["good_id"]}, {"_id": 0})
                detail["good_name"] = good["name"] if good else "N/A"
            
            assignment["details"] = details
        
        return assignments
    
    return []

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup event to create default admin user
@app.on_event("startup")
async def startup_event():
    # Create default admin if not exists
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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()