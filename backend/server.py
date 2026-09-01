from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Literal

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

# ---------------------------------------------------------------------
# Setup
# ---------------------------------------------------------------------
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
ACCESS_TTL_HOURS = 12

app = FastAPI(title="UKM Permadu Darmajaya API")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("permadu")

ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "kabid", "anggota"]
BIDANGS = [
    "Kaderisasi",
    "Penelitian dan Pengembangan",
    "Kerohanian",
    "Seni dan Budaya",
    "Dana dan Usaha",
    "Pengabdian Masyarakat",
]


# ---------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------
def now_utc():
    return datetime.now(timezone.utc)


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p: str, h: str) -> bool:
    try:
        return bcrypt.checkpw(p.encode(), h.encode())
    except Exception:
        return False


def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": now_utc() + timedelta(hours=ACCESS_TTL_HOURS),
        "type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(request: Request) -> dict:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def require_roles(*allowed):
    async def _dep(user=Depends(get_current_user)):
        if user["role"] not in allowed:
            raise HTTPException(status_code=403, detail="Forbidden for role " + user["role"])
        return user
    return _dep


def clean(doc):
    """Ensure a dict from Mongo does not contain _id."""
    if doc is None:
        return None
    doc.pop("_id", None)
    doc.pop("password_hash", None)
    return doc


# ---------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------
class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    user: dict


class RegisterIn(BaseModel):
    email: EmailStr
    password: str
    name: str
    nim: Optional[str] = None
    jurusan: Optional[str] = None
    angkatan: Optional[str] = None
    phone: Optional[str] = None


class ChangePasswordIn(BaseModel):
    old_password: str
    new_password: str


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    role: Literal["ketua", "wakil", "sekretaris", "bendahara", "kabid", "anggota"]
    bidang: Optional[str] = None
    nim: Optional[str] = None
    jurusan: Optional[str] = None
    angkatan: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    bidang: Optional[str] = None
    nim: Optional[str] = None
    jurusan: Optional[str] = None
    angkatan: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    nim: Optional[str] = None
    jurusan: Optional[str] = None
    angkatan: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None


class ProgramCreate(BaseModel):
    name: str
    description: str
    bidang: str
    status: Literal["draft", "diusulkan", "disetujui", "berjalan", "selesai", "ditolak"] = "draft"
    budget: float = 0
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    pic: Optional[str] = None
    lpj_url: Optional[str] = None
    lpj_filename: Optional[str] = None


class LPJUpload(BaseModel):
    lpj_url: str
    lpj_filename: str


class FinanceJournalCreate(BaseModel):
    image_url: str
    caption: str
    date: str
    program_id: Optional[str] = None


class FinanceCreate(BaseModel):
    type: Literal["masuk", "keluar"]
    amount: float
    category: str
    description: str
    date: str
    reference: Optional[str] = None


class DocumentCreate(BaseModel):
    doc_type: Literal["surat_masuk", "surat_keluar", "notulen", "arsip"]
    title: str
    number: Optional[str] = None
    from_party: Optional[str] = None
    to_party: Optional[str] = None
    date: str
    summary: Optional[str] = None
    content: Optional[str] = None


class AgendaCreate(BaseModel):
    title: str
    date: str
    time: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    audience: Optional[str] = None
    category: Optional[Literal["sembahyang", "rapat", "latihan", "kegiatan", "lainnya"]] = "kegiatan"


class ActivityPhotoCreate(BaseModel):
    image_url: str
    caption: str
    date: str
    program_id: Optional[str] = None
    program_name: Optional[str] = None
    bidang: Optional[str] = None


class BidangFileCreate(BaseModel):
    bidang: str
    title: str
    description: Optional[str] = None
    file_url: str
    filename: str
    category: Optional[str] = "dokumen"  # proposal, lpj, materi, dokumen


# ---------------------------------------------------------------------
# Auth Endpoints
# ---------------------------------------------------------------------
@api.post("/auth/login", response_model=TokenOut)
async def login(inp: LoginIn):
    user = await db.users.find_one({"email": inp.email.lower()})
    if not user or not verify_password(inp.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Email atau password salah")
    token = create_token(user["id"], user["email"], user["role"])
    return {"access_token": token, "user": clean(user)}


@api.post("/auth/register", response_model=TokenOut)
async def register(inp: RegisterIn):
    email = inp.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="Email sudah terdaftar")
    if len(inp.password) < 6:
        raise HTTPException(status_code=400, detail="Password minimal 6 karakter")
    doc = {
        "id": str(uuid.uuid4()),
        "email": email,
        "name": inp.name,
        "role": "anggota",
        "nim": inp.nim,
        "jurusan": inp.jurusan,
        "angkatan": inp.angkatan,
        "phone": inp.phone,
        "bidang": None,
        "avatar_url": None,
        "password_hash": hash_password(inp.password),
        "created_at": now_utc().isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_token(doc["id"], doc["email"], doc["role"])
    return {"access_token": token, "user": clean(doc)}


@api.post("/auth/change-password")
async def change_password(inp: ChangePasswordIn, user=Depends(get_current_user)):
    full_user = await db.users.find_one({"id": user["id"]})
    if not full_user or not verify_password(inp.old_password, full_user["password_hash"]):
        raise HTTPException(status_code=400, detail="Password lama salah")
    if len(inp.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password baru minimal 6 karakter")
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"password_hash": hash_password(inp.new_password)}},
    )
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user


@api.post("/auth/logout")
async def logout(user=Depends(get_current_user)):
    return {"ok": True}


@api.patch("/profile/me")
async def update_own_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"id": user["id"]}, {"$set": upd})
    doc = await db.users.find_one({"id": user["id"]}, {"_id": 0, "password_hash": 0})
    return doc


# ---------------------------------------------------------------------
# Users / Anggota
# ---------------------------------------------------------------------
@api.get("/users")
async def list_users(user=Depends(get_current_user)):
    docs = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return docs


@api.post("/users")
async def create_user(payload: UserCreate, user=Depends(get_current_user)):
    if user["role"] not in ("ketua", "wakil", "sekretaris", "kabid"):
        raise HTTPException(403, "Peran tidak diizinkan menambahkan anggota")
    if user["role"] == "kabid":
        # Kabid hanya boleh menambahkan anggota di bidangnya sendiri
        if payload.role not in ("anggota", "kabid"):
            raise HTTPException(403, "Kabid hanya dapat menambahkan anggota atau asisten kabid")
        payload.bidang = user.get("bidang")
    if await db.users.find_one({"email": payload.email.lower()}):
        raise HTTPException(400, "Email sudah terdaftar")
    doc = payload.model_dump()
    doc["email"] = doc["email"].lower()
    doc["id"] = str(uuid.uuid4())
    doc["password_hash"] = hash_password(doc.pop("password"))
    doc["created_at"] = now_utc().isoformat()
    await db.users.insert_one(doc)
    return clean(doc)


@api.patch("/users/{uid}")
async def update_user(uid: str, payload: UserUpdate, user=Depends(require_roles("ketua", "wakil", "sekretaris"))):
    upd = {k: v for k, v in payload.model_dump().items() if v is not None}
    r = await db.users.update_one({"id": uid}, {"$set": upd})
    if r.matched_count == 0:
        raise HTTPException(404, "User not found")
    doc = await db.users.find_one({"id": uid}, {"_id": 0, "password_hash": 0})
    return doc


@api.delete("/users/{uid}")
async def delete_user(uid: str, user=Depends(require_roles("ketua"))):
    r = await db.users.delete_one({"id": uid})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------
# Programs (Kabid & others)
# ---------------------------------------------------------------------
@api.get("/programs")
async def list_programs(bidang: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if bidang:
        q["bidang"] = bidang
    docs = await db.programs.find(q, {"_id": 0}).to_list(1000)
    return docs


@api.post("/programs")
async def create_program(payload: ProgramCreate, user=Depends(require_roles("ketua", "wakil", "kabid"))):
    if user["role"] == "kabid" and payload.bidang != user.get("bidang"):
        raise HTTPException(403, "Kabid hanya dapat membuat program di bidangnya sendiri")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.programs.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.patch("/programs/{pid}")
async def update_program(pid: str, payload: ProgramCreate, user=Depends(require_roles("ketua", "wakil", "kabid"))):
    existing = await db.programs.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Program not found")
    if user["role"] == "kabid" and existing["bidang"] != user.get("bidang"):
        raise HTTPException(403, "Kabid hanya dapat mengelola program di bidangnya sendiri")
    if user["role"] == "kabid" and payload.bidang != user.get("bidang"):
        raise HTTPException(403, "Kabid tidak dapat memindahkan program ke bidang lain")
    upd = payload.model_dump()
    await db.programs.update_one({"id": pid}, {"$set": upd})
    doc = await db.programs.find_one({"id": pid}, {"_id": 0})
    return doc


@api.post("/programs/{pid}/status")
async def set_program_status(
    pid: str,
    status: Literal["draft", "diusulkan", "disetujui", "berjalan", "selesai", "ditolak"],
    user=Depends(require_roles("ketua", "wakil")),
):
    r = await db.programs.update_one({"id": pid}, {"$set": {"status": status}})
    if r.matched_count == 0:
        raise HTTPException(404, "Program not found")
    return {"ok": True}


@api.delete("/programs/{pid}")
async def delete_program(pid: str, user=Depends(require_roles("ketua", "kabid"))):
    existing = await db.programs.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Program not found")
    if user["role"] == "kabid" and existing["bidang"] != user.get("bidang"):
        raise HTTPException(403, "Kabid hanya dapat menghapus program di bidangnya sendiri")
    r = await db.programs.delete_one({"id": pid})
    return {"deleted": r.deleted_count}


@api.post("/programs/{pid}/lpj")
async def upload_lpj(pid: str, payload: LPJUpload, user=Depends(get_current_user)):
    existing = await db.programs.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Program not found")
    allowed_roles = {"ketua", "wakil", "kabid"}
    is_pic = existing.get("pic") == user["name"]
    if user["role"] not in allowed_roles and not is_pic:
        raise HTTPException(403, "Hanya PIC / Ketua / Wakil / Kabid yang dapat mengunggah LPJ")
    if user["role"] == "kabid" and existing["bidang"] != user.get("bidang") and not is_pic:
        raise HTTPException(403, "Kabid hanya dapat mengunggah LPJ program di bidangnya")
    await db.programs.update_one(
        {"id": pid},
        {"$set": {
            "lpj_url": payload.lpj_url,
            "lpj_filename": payload.lpj_filename,
            "lpj_uploaded_by": user["name"],
            "lpj_uploaded_at": now_utc().isoformat(),
        }},
    )
    return {"ok": True}


# ---------------------------------------------------------------------
# Finances (Bendahara)
# ---------------------------------------------------------------------
@api.get("/finances")
async def list_finances(user=Depends(get_current_user)):
    docs = await db.finances.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs


@api.get("/finances/summary")
async def finance_summary(user=Depends(get_current_user)):
    docs = await db.finances.find({}, {"_id": 0}).to_list(1000)
    inflow = sum(d["amount"] for d in docs if d["type"] == "masuk")
    outflow = sum(d["amount"] for d in docs if d["type"] == "keluar")
    return {
        "kas_masuk": inflow,
        "kas_keluar": outflow,
        "saldo": inflow - outflow,
        "total_transaksi": len(docs),
    }


@api.post("/finances")
async def create_finance(payload: FinanceCreate, user=Depends(require_roles("bendahara", "ketua"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["recorded_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.finances.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/finances/{fid}")
async def delete_finance(fid: str, user=Depends(require_roles("bendahara", "ketua"))):
    r = await db.finances.delete_one({"id": fid})
    return {"deleted": r.deleted_count}


# Finance Photo Journal (Bendahara documentation)
@api.get("/finance-journal")
async def list_finance_journal(user=Depends(get_current_user)):
    docs = await db.finance_journal.find({}, {"_id": 0}).sort("date", -1).to_list(500)
    return docs


@api.post("/finance-journal")
async def create_finance_journal(payload: FinanceJournalCreate, user=Depends(require_roles("bendahara", "ketua"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["uploaded_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.finance_journal.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/finance-journal/{jid}")
async def delete_finance_journal(jid: str, user=Depends(require_roles("bendahara", "ketua"))):
    r = await db.finance_journal.delete_one({"id": jid})
    return {"deleted": r.deleted_count}


# Activity Photos — Timeline foto kegiatan (semua pengurus dapat unggah)
@api.get("/activity-photos")
async def list_activity_photos(program_id: Optional[str] = None, bidang: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if program_id: q["program_id"] = program_id
    if bidang: q["bidang"] = bidang
    docs = await db.activity_photos.find(q, {"_id": 0}).sort("date", -1).to_list(500)
    return docs


@api.post("/activity-photos")
async def create_activity_photo(payload: ActivityPhotoCreate, user=Depends(require_roles("ketua", "wakil", "sekretaris", "bendahara", "kabid"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["uploaded_by"] = user["name"]
    doc["role"] = user["role"]
    doc["created_at"] = now_utc().isoformat()
    await db.activity_photos.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/activity-photos/{pid}")
async def delete_activity_photo(pid: str, user=Depends(get_current_user)):
    existing = await db.activity_photos.find_one({"id": pid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Foto tidak ditemukan")
    if user["role"] not in ("ketua", "sekretaris") and existing.get("uploaded_by") != user["name"]:
        raise HTTPException(403, "Hanya pemilik foto atau Ketua/Sekretaris yang dapat menghapus")
    r = await db.activity_photos.delete_one({"id": pid})
    return {"deleted": r.deleted_count}


# Reminders — filter agenda sembahyang mendatang
@api.get("/reminders/sembahyang")
async def reminders_sembahyang(user=Depends(get_current_user)):
    today = now_utc().date().isoformat()
    docs = await db.agenda.find(
        {"$and": [
            {"date": {"$gte": today}},
            {"$or": [
                {"category": "sembahyang"},
                {"title": {"$regex": "sembahyang|purnama|tilem|nyepi|galungan|kuningan|saraswati", "$options": "i"}},
            ]},
        ]},
        {"_id": 0},
    ).sort("date", 1).to_list(20)
    return docs


# Bidang Files — dokumen per bidang (proposal, LPJ, materi kaderisasi, dll)
@api.get("/bidang-files")
async def list_bidang_files(bidang: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if bidang:
        q["bidang"] = bidang
    docs = await db.bidang_files.find(q, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/bidang-files")
async def create_bidang_file(payload: BidangFileCreate, user=Depends(require_roles("ketua", "wakil", "kabid"))):
    if user["role"] == "kabid" and payload.bidang != user.get("bidang"):
        raise HTTPException(403, "Kabid hanya dapat mengunggah dokumen di bidangnya sendiri")
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["uploaded_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.bidang_files.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/bidang-files/{fid}")
async def delete_bidang_file(fid: str, user=Depends(get_current_user)):
    existing = await db.bidang_files.find_one({"id": fid}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "File tidak ditemukan")
    if user["role"] not in ("ketua", "wakil") and existing.get("uploaded_by") != user["name"]:
        if not (user["role"] == "kabid" and existing.get("bidang") == user.get("bidang")):
            raise HTTPException(403, "Tidak diizinkan menghapus file ini")
    r = await db.bidang_files.delete_one({"id": fid})
    return {"deleted": r.deleted_count}


# Rapor Kabid — rekap kinerja per Kabid & bidang
@api.get("/reports/kabid")
async def rapor_kabid(user=Depends(get_current_user)):
    kabids = await db.users.find({"role": "kabid"}, {"_id": 0, "password_hash": 0}).to_list(50)
    programs = await db.programs.find({}, {"_id": 0}).to_list(1000)
    all_users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(500)
    photos = await db.activity_photos.find({}, {"_id": 0}).to_list(500)

    reports = []
    for k in kabids:
        bidang = k.get("bidang")
        b_progs = [p for p in programs if p.get("bidang") == bidang]
        by_status = {}
        for p in b_progs:
            by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        total = len(b_progs)
        selesai = by_status.get("selesai", 0)
        with_lpj = sum(1 for p in b_progs if p.get("lpj_url"))
        total_budget = sum(p.get("budget", 0) for p in b_progs)
        members = [u for u in all_users if u.get("bidang") == bidang and u.get("role") == "anggota"]
        b_photos = [ph for ph in photos if ph.get("bidang") == bidang]
        completion_pct = round((selesai / total) * 100) if total else 0
        lpj_pct = round((with_lpj / total) * 100) if total else 0
        reports.append({
            "kabid_id": k["id"],
            "kabid_name": k["name"],
            "kabid_email": k.get("email"),
            "avatar_url": k.get("avatar_url"),
            "bidang": bidang,
            "angkatan": k.get("angkatan"),
            "total_program": total,
            "berjalan": by_status.get("berjalan", 0),
            "selesai": selesai,
            "diusulkan": by_status.get("diusulkan", 0),
            "disetujui": by_status.get("disetujui", 0),
            "ditolak": by_status.get("ditolak", 0),
            "draft": by_status.get("draft", 0),
            "total_budget": total_budget,
            "lpj_count": with_lpj,
            "lpj_percentage": lpj_pct,
            "completion_percentage": completion_pct,
            "member_count": len(members),
            "photo_count": len(b_photos),
        })
    reports.sort(key=lambda r: r["bidang"] or "")
    return {"reports": reports, "bidangs": BIDANGS}


# ---------------------------------------------------------------------
# Documents (Sekretaris)
# ---------------------------------------------------------------------
@api.get("/documents")
async def list_documents(doc_type: Optional[str] = None, user=Depends(get_current_user)):
    q = {}
    if doc_type:
        q["doc_type"] = doc_type
    docs = await db.documents.find(q, {"_id": 0}).sort("date", -1).to_list(1000)
    return docs


@api.post("/documents")
async def create_document(payload: DocumentCreate, user=Depends(require_roles("sekretaris", "ketua", "wakil"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/documents/{did}")
async def delete_document(did: str, user=Depends(require_roles("sekretaris", "ketua"))):
    r = await db.documents.delete_one({"id": did})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------
# Agenda
# ---------------------------------------------------------------------
@api.get("/agenda")
async def list_agenda(user=Depends(get_current_user)):
    docs = await db.agenda.find({}, {"_id": 0}).sort("date", 1).to_list(1000)
    return docs


@api.post("/agenda")
async def create_agenda(payload: AgendaCreate, user=Depends(require_roles("sekretaris", "ketua", "wakil", "kabid"))):
    doc = payload.model_dump()
    doc["id"] = str(uuid.uuid4())
    doc["created_by"] = user["name"]
    doc["created_at"] = now_utc().isoformat()
    await db.agenda.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.delete("/agenda/{aid}")
async def delete_agenda(aid: str, user=Depends(require_roles("sekretaris", "ketua"))):
    r = await db.agenda.delete_one({"id": aid})
    return {"deleted": r.deleted_count}


# ---------------------------------------------------------------------
# Dashboard Overview
# ---------------------------------------------------------------------
@api.get("/dashboard/overview")
async def dashboard_overview(user=Depends(get_current_user)):
    total_anggota = await db.users.count_documents({})
    programs = await db.programs.find({}, {"_id": 0}).to_list(1000)
    finances = await db.finances.find({}, {"_id": 0}).to_list(1000)
    documents = await db.documents.count_documents({})
    agenda = await db.agenda.count_documents({})

    inflow = sum(f["amount"] for f in finances if f["type"] == "masuk")
    outflow = sum(f["amount"] for f in finances if f["type"] == "keluar")

    by_status = {}
    by_bidang = {}
    for p in programs:
        by_status[p["status"]] = by_status.get(p["status"], 0) + 1
        by_bidang[p["bidang"]] = by_bidang.get(p["bidang"], 0) + 1

    return {
        "total_anggota": total_anggota,
        "total_program": len(programs),
        "program_berjalan": by_status.get("berjalan", 0),
        "program_selesai": by_status.get("selesai", 0),
        "program_menunggu": by_status.get("diusulkan", 0),
        "saldo_kas": inflow - outflow,
        "kas_masuk": inflow,
        "kas_keluar": outflow,
        "total_dokumen": documents,
        "total_agenda": agenda,
        "program_by_status": by_status,
        "program_by_bidang": by_bidang,
        "bidang_list": BIDANGS,
    }


@api.get("/meta/bidangs")
async def meta_bidangs():
    return {"bidangs": BIDANGS, "roles": ROLES}


# ---------------------------------------------------------------------
# Seeding
# ---------------------------------------------------------------------
DEFAULT_USERS = [
    {"email": "ketua@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Made Wira Kusuma", "role": "ketua", "nim": "2011010001", "jurusan": "Teknik Informatika", "angkatan": "2020", "phone": "0812-3456-7801"},
    {"email": "wakil@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Kadek Ayu Pratiwi", "role": "wakil", "nim": "2011010012", "jurusan": "Sistem Informasi", "angkatan": "2020", "phone": "0812-3456-7802"},
    {"email": "sekretaris@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Gede Bagus Arta", "role": "sekretaris", "nim": "2111020015", "jurusan": "Akuntansi", "angkatan": "2021", "phone": "0812-3456-7803"},
    {"email": "bendahara@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Putu Sri Widiani", "role": "bendahara", "nim": "2111020021", "jurusan": "Manajemen", "angkatan": "2021", "phone": "0812-3456-7804"},
    {"email": "kabid.kaderisasi@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Kadek Bagus Wiranata", "role": "kabid", "bidang": "Kaderisasi", "nim": "2111010025", "jurusan": "Manajemen", "angkatan": "2021", "phone": "0812-3456-7805"},
    {"email": "kabid.litbang@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Made Ayu Ratna Sari", "role": "kabid", "bidang": "Penelitian dan Pengembangan", "nim": "2111010028", "jurusan": "Sistem Informasi", "angkatan": "2021", "phone": "0812-3456-7806"},
    {"email": "kabid.kerohanian@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Wayan Adi Nugraha", "role": "kabid", "bidang": "Kerohanian", "nim": "2111010030", "jurusan": "Teknik Informatika", "angkatan": "2021", "phone": "0812-3456-7807"},
    {"email": "kabid.seni@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Komang Yoga Pradana", "role": "kabid", "bidang": "Seni dan Budaya", "nim": "2211010055", "jurusan": "Desain Komunikasi Visual", "angkatan": "2022", "phone": "0812-3456-7808"},
    {"email": "kabid.danus@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Putu Ika Damayanti", "role": "kabid", "bidang": "Dana dan Usaha", "nim": "2211020060", "jurusan": "Manajemen", "angkatan": "2022", "phone": "0812-3456-7809"},
    {"email": "kabid.pengmas@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Luh Made Anggreni", "role": "kabid", "bidang": "Pengabdian Masyarakat", "nim": "2111020044", "jurusan": "Manajemen", "angkatan": "2021", "phone": "0812-3456-7810"},
    {"email": "anggota@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Putu Bayu Saputra", "role": "anggota", "nim": "2311010101", "jurusan": "Teknik Informatika", "angkatan": "2023", "phone": "0812-3456-7811"},
    {"email": "anggota2@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Kadek Lestari Devi", "role": "anggota", "nim": "2311020105", "jurusan": "Akuntansi", "angkatan": "2023", "phone": "0812-3456-7812"},
    {"email": "anggota3@permadu.darmajaya.ac.id", "password": "permadu123", "name": "I Gede Rama Wicaksana", "role": "anggota", "nim": "2311010108", "jurusan": "Sistem Informasi", "angkatan": "2023", "phone": "0812-3456-7813"},
    {"email": "anggota4@permadu.darmajaya.ac.id", "password": "permadu123", "name": "Ni Putu Cintya Ari", "role": "anggota", "nim": "2311020112", "jurusan": "Manajemen", "angkatan": "2023", "phone": "0812-3456-7814"},
]

DEFAULT_PROGRAMS = [
    {"name": "Persembahyangan Purnama Bersama", "description": "Rutin bulanan di Pura Kampus setiap purnama untuk mempererat spiritualitas mahasiswa Hindu.", "bidang": "Kerohanian", "status": "berjalan", "budget": 1500000, "start_date": "2026-01-15", "end_date": "2026-12-31", "pic": "I Wayan Adi Nugraha"},
    {"name": "Dharma Wacana Interaktif", "description": "Kelas mingguan tentang filosofi Hindu dengan narasumber tokoh dari PHDI Lampung.", "bidang": "Kerohanian", "status": "disetujui", "budget": 2500000, "start_date": "2026-03-01", "end_date": "2026-06-30", "pic": "I Wayan Adi Nugraha"},
    {"name": "Latihan Kepemimpinan Anggota Baru", "description": "LDK & orientasi kaderisasi bagi mahasiswa baru Hindu Darmajaya angkatan 2026.", "bidang": "Kaderisasi", "status": "disetujui", "budget": 4500000, "start_date": "2026-03-05", "end_date": "2026-03-07", "pic": "I Kadek Bagus Wiranata"},
    {"name": "Upgrading Pengurus 2026", "description": "Pelatihan manajemen organisasi & regenerasi kepengurusan Permadu.", "bidang": "Kaderisasi", "status": "berjalan", "budget": 2800000, "start_date": "2026-02-20", "end_date": "2026-05-30", "pic": "I Kadek Bagus Wiranata"},
    {"name": "Riset Nilai Tri Hita Karana pada Gen-Z", "description": "Penelitian kualitatif tentang penerapan Tri Hita Karana di kalangan mahasiswa Hindu Darmajaya.", "bidang": "Penelitian dan Pengembangan", "status": "diusulkan", "budget": 3000000, "start_date": "2026-04-01", "end_date": "2026-08-31", "pic": "Ni Made Ayu Ratna Sari"},
    {"name": "Podcast Dharma & Diskusi Ilmiah", "description": "Seri podcast bulanan membahas kajian Weda kontemporer bersama akademisi PHDI.", "bidang": "Penelitian dan Pengembangan", "status": "berjalan", "budget": 1200000, "start_date": "2026-01-20", "end_date": "2026-12-15", "pic": "Ni Made Ayu Ratna Sari"},
    {"name": "Parade Budaya Nyepi Kampus", "description": "Pawai Ogoh-Ogoh & pementasan tari tradisional Bali di area kampus Darmajaya.", "bidang": "Seni dan Budaya", "status": "disetujui", "budget": 15000000, "start_date": "2026-03-10", "end_date": "2026-03-11", "pic": "I Komang Yoga Pradana"},
    {"name": "Workshop Tari Rejang Dewa", "description": "Latihan mingguan tari sakral untuk mahasiswa baru bekerjasama dengan sanggar lokal.", "bidang": "Seni dan Budaya", "status": "berjalan", "budget": 3200000, "start_date": "2026-02-01", "end_date": "2026-06-30", "pic": "I Komang Yoga Pradana"},
    {"name": "Kaos & Merchandise Permadu 2026", "description": "Produksi & penjualan kaos, tote bag, & stiker untuk pendanaan kegiatan tahunan.", "bidang": "Dana dan Usaha", "status": "berjalan", "budget": 4000000, "start_date": "2026-02-01", "end_date": "2026-05-31", "pic": "Ni Putu Ika Damayanti"},
    {"name": "Bazar Nyepi & Danus Konsumsi", "description": "Danus makanan Bali di area kampus saat rangkaian Nyepi.", "bidang": "Dana dan Usaha", "status": "disetujui", "budget": 1500000, "start_date": "2026-03-08", "end_date": "2026-03-10", "pic": "Ni Putu Ika Damayanti"},
    {"name": "Bakti Sosial Desa Rama Utama", "description": "Pengabdian masyarakat: pembagian sembako & renovasi Pura kecil di Lampung Tengah.", "bidang": "Pengabdian Masyarakat", "status": "diusulkan", "budget": 8500000, "start_date": "2026-04-20", "end_date": "2026-04-22", "pic": "Ni Luh Made Anggreni"},
    {"name": "Donor Darah Purnama Kasih", "description": "Bekerjasama dengan PMI Bandar Lampung untuk kegiatan donor darah dwi-bulanan.", "bidang": "Pengabdian Masyarakat", "status": "berjalan", "budget": 1200000, "start_date": "2026-02-14", "end_date": "2026-11-30", "pic": "Ni Luh Made Anggreni"},
    {"name": "Yoga Kampus Sehat", "description": "Kelas yoga terbuka setiap Sabtu pagi di lapangan tengah kampus.", "bidang": "Kerohanian", "status": "selesai", "budget": 750000, "start_date": "2025-09-01", "end_date": "2025-12-15", "pic": "I Wayan Adi Nugraha"},
]

DEFAULT_FINANCES = [
    {"type": "masuk", "amount": 12000000, "category": "Iuran Anggota", "description": "Iuran semester genap 2025/2026 dari 120 anggota", "date": "2026-01-10", "reference": "REF-IU-001"},
    {"type": "masuk", "amount": 5000000, "category": "Bantuan Kampus", "description": "Dana pembinaan UKM dari Rektorat IIB Darmajaya", "date": "2026-01-15", "reference": "REF-KM-002"},
    {"type": "masuk", "amount": 7500000, "category": "Sponsorship", "description": "Sponsor Parade Nyepi dari Bank Lampung", "date": "2026-02-05", "reference": "REF-SP-003"},
    {"type": "masuk", "amount": 3000000, "category": "Donasi Alumni", "description": "Donasi alumni angkatan 2015-2018", "date": "2026-02-18", "reference": "REF-DN-004"},
    {"type": "masuk", "amount": 2500000, "category": "Dana Usaha", "description": "Hasil penjualan kaos Permadu batch 1", "date": "2026-02-22", "reference": "REF-DU-005"},
    {"type": "keluar", "amount": 850000, "category": "Persembahyangan", "description": "Banten & sarana upacara purnama Januari", "date": "2026-01-16", "reference": "OUT-001"},
    {"type": "keluar", "amount": 2400000, "category": "Konsumsi", "description": "Konsumsi rapat besar & kegiatan Dharma Wacana", "date": "2026-01-22", "reference": "OUT-002"},
    {"type": "keluar", "amount": 4500000, "category": "Parade Nyepi", "description": "DP pembuatan Ogoh-Ogoh & kostum tari", "date": "2026-02-10", "reference": "OUT-003"},
    {"type": "keluar", "amount": 1200000, "category": "Kesekretariatan", "description": "ATK, banner, & cetak proposal semester", "date": "2026-02-15", "reference": "OUT-004"},
    {"type": "keluar", "amount": 900000, "category": "Media & Publikasi", "description": "Langganan Canva Pro & jasa fotografer event", "date": "2026-02-20", "reference": "OUT-005"},
]

DEFAULT_DOCUMENTS = [
    {"doc_type": "surat_masuk", "title": "Undangan Rapat Koordinasi UKM se-Kampus", "number": "001/UND/BEM/II/2026", "from_party": "BEM IIB Darmajaya", "to_party": "Ketua UKM Permadu", "date": "2026-02-05", "summary": "Undangan rapat kolaborasi acara Dies Natalis kampus."},
    {"doc_type": "surat_masuk", "title": "Permohonan Pengisi Acara Parade Budaya", "number": "012/PHDI-LPG/II/2026", "from_party": "PHDI Lampung", "to_party": "Ketua UKM Permadu", "date": "2026-02-14", "summary": "Permohonan pengisi tari untuk acara Hari Raya Nyepi tingkat provinsi."},
    {"doc_type": "surat_keluar", "title": "Proposal Kegiatan Parade Nyepi Kampus 2026", "number": "005/PROP/PERMADU/II/2026", "from_party": "Ketua UKM Permadu", "to_party": "Wakil Rektor III", "date": "2026-02-08", "summary": "Proposal permohonan dana & izin kegiatan Parade Nyepi."},
    {"doc_type": "surat_keluar", "title": "Surat Undangan Rapat Pengurus Bulanan", "number": "008/UND/PERMADU/II/2026", "from_party": "Sekretaris UKM Permadu", "to_party": "Seluruh Pengurus", "date": "2026-02-01", "summary": "Undangan rapat pengurus rutin bulan Februari."},
    {"doc_type": "notulen", "title": "Notulen Rapat Kerja Awal Tahun 2026", "number": "NR-001/2026", "from_party": "Sekretaris", "to_party": "Arsip Internal", "date": "2026-01-12", "summary": "Pembahasan program kerja & pembagian tugas pengurus 2026.", "content": "1. Pembukaan oleh Ketua Umum\n2. Pemaparan visi misi 2026\n3. Presentasi Program Kerja per Bidang\n4. Diskusi anggaran\n5. Penutupan"},
    {"doc_type": "notulen", "title": "Notulen Rapat Persiapan Parade Nyepi", "number": "NR-002/2026", "from_party": "Sekretaris", "to_party": "Arsip Internal", "date": "2026-02-10", "summary": "Rincian teknis, pembagian sie, & timeline Ogoh-Ogoh."},
    {"doc_type": "arsip", "title": "AD/ART UKM Permadu 2025", "number": "ARS-001", "date": "2025-08-15", "summary": "Dokumen anggaran dasar & rumah tangga hasil musyawarah anggota."},
]

DEFAULT_AGENDA = [
    {"title": "Persembahyangan Purnama Februari", "date": "2026-02-24", "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Persembahyangan bersama seluruh anggota & mahasiswa Hindu.", "audience": "Seluruh Anggota", "category": "sembahyang"},
    {"title": "Rapat Pengurus Bulanan", "date": "2026-02-28", "time": "16:00", "location": "Ruang Sekretariat UKM", "description": "Evaluasi program bulan Februari & persiapan Maret.", "audience": "Pengurus", "category": "rapat"},
    {"title": "Latihan Tari Rejang Dewa", "date": "2026-03-01", "time": "15:30", "location": "Aula Serbaguna", "description": "Latihan rutin untuk persiapan Parade Nyepi.", "audience": "Anggota Bidang Seni", "category": "latihan"},
    {"title": "Persembahyangan Tilem Maret", "date": "2026-03-08", "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Sembahyang tilem menyambut Nyepi.", "audience": "Seluruh Anggota", "category": "sembahyang"},
    {"title": "Parade Nyepi Kampus 2026", "date": "2026-03-10", "time": "17:00", "location": "Halaman Utama Kampus", "description": "Pawai Ogoh-Ogoh & pementasan tari tradisional.", "audience": "Umum & Sivitas Akademika", "category": "kegiatan"},
    {"title": "Dharma Wacana - Filosofi Tri Hita Karana", "date": "2026-03-15", "time": "10:00", "location": "Aula Gedung C", "description": "Narasumber: Ida Bagus Made Sudiantara (PHDI).", "audience": "Seluruh Anggota", "category": "kegiatan"},
    {"title": "Persembahyangan Purnama Maret", "date": "2026-03-24", "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Sembahyang purnama bulan Maret 2026.", "audience": "Seluruh Anggota", "category": "sembahyang"},
    {"title": "Baksos Desa Rama Utama", "date": "2026-04-20", "time": "07:00", "location": "Desa Rama Utama, Lampung Tengah", "description": "Pembagian sembako & renovasi pura kecil.", "audience": "Panitia Baksos", "category": "kegiatan"},
    {"title": "Hari Raya Saraswati", "date": "2026-05-16", "time": "07:00", "location": "Pura Kampus", "description": "Persembahyangan hari turunnya ilmu pengetahuan.", "audience": "Seluruh Anggota", "category": "sembahyang"},
]


async def seed():
    # Check migration: if new BIDANGS not found, wipe and reseed programs+users
    sample_prog = await db.programs.find_one({"bidang": "Kaderisasi"})
    if sample_prog is None and await db.programs.count_documents({}) > 0:
        logger.info("Migration: wiping old-bidang data before reseeding")
        await db.users.delete_many({})
        await db.programs.delete_many({})
        await db.finances.delete_many({})
        await db.documents.delete_many({})
        await db.agenda.delete_many({})

    if await db.users.count_documents({}) == 0:
        for u in DEFAULT_USERS:
            doc = dict(u)
            doc["id"] = str(uuid.uuid4())
            doc["password_hash"] = hash_password(doc.pop("password"))
            doc["email"] = doc["email"].lower()
            doc["created_at"] = now_utc().isoformat()
            await db.users.insert_one(doc)
        logger.info("Seeded %d users", len(DEFAULT_USERS))

    if await db.programs.count_documents({}) == 0:
        for p in DEFAULT_PROGRAMS:
            doc = dict(p)
            doc["id"] = str(uuid.uuid4())
            doc["created_by"] = "System Seed"
            doc["created_at"] = now_utc().isoformat()
            await db.programs.insert_one(doc)
        logger.info("Seeded %d programs", len(DEFAULT_PROGRAMS))

    if await db.finances.count_documents({}) == 0:
        for f in DEFAULT_FINANCES:
            doc = dict(f)
            doc["id"] = str(uuid.uuid4())
            doc["recorded_by"] = "Ni Putu Sri Widiani"
            doc["created_at"] = now_utc().isoformat()
            await db.finances.insert_one(doc)
        logger.info("Seeded %d finances", len(DEFAULT_FINANCES))

    if await db.documents.count_documents({}) == 0:
        for d in DEFAULT_DOCUMENTS:
            doc = dict(d)
            doc["id"] = str(uuid.uuid4())
            doc["created_by"] = "I Gede Bagus Arta"
            doc["created_at"] = now_utc().isoformat()
            await db.documents.insert_one(doc)
        logger.info("Seeded %d documents", len(DEFAULT_DOCUMENTS))

    if await db.agenda.count_documents({}) == 0:
        for a in DEFAULT_AGENDA:
            doc = dict(a)
            doc.setdefault("category", "kegiatan")
            doc["id"] = str(uuid.uuid4())
            doc["created_by"] = "I Gede Bagus Arta"
            doc["created_at"] = now_utc().isoformat()
            await db.agenda.insert_one(doc)
        logger.info("Seeded %d agenda", len(DEFAULT_AGENDA))

    # Always ensure a few future sembahyang reminders exist (demo dinamis)
    today = now_utc().date()
    future_prayer_count = await db.agenda.count_documents({
        "category": "sembahyang",
        "date": {"$gte": today.isoformat()},
    })
    if future_prayer_count < 3:
        future_prayers = [
            {"title": "Persembahyangan Purnama", "offset_days": 7, "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Persembahyangan purnama bersama seluruh anggota."},
            {"title": "Persembahyangan Tilem", "offset_days": 21, "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Sembahyang tilem bulanan."},
            {"title": "Sembahyang Rutin Kamis", "offset_days": 3, "time": "17:00", "location": "Padmasana Sekretariat", "description": "Doa bersama pengurus & anggota."},
            {"title": "Persembahyangan Purnama Berikutnya", "offset_days": 37, "time": "18:30", "location": "Pura Kampus IIB Darmajaya", "description": "Persembahyangan purnama bulan depan."},
        ]
        for fp in future_prayers:
            d = today + timedelta(days=fp["offset_days"])
            doc = {
                "id": str(uuid.uuid4()),
                "title": fp["title"],
                "date": d.isoformat(),
                "time": fp["time"],
                "location": fp["location"],
                "description": fp["description"],
                "audience": "Seluruh Anggota",
                "category": "sembahyang",
                "created_by": "System",
                "created_at": now_utc().isoformat(),
            }
            await db.agenda.insert_one(doc)
        logger.info("Ensured %d future sembahyang reminders", len(future_prayers))


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.programs.create_index("id", unique=True)
    await db.finances.create_index("id", unique=True)
    await db.documents.create_index("id", unique=True)
    await db.agenda.create_index("id", unique=True)
    await seed()


@api.get("/")
async def root():
    return {"message": "UKM Permadu Darmajaya API", "version": "1.0.0"}


app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown():
    client.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)