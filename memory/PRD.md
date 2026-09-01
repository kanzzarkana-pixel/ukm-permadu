# UKM Permadu Darmajaya — Portal Manajemen Organisasi

## Original Problem Statement
Web untuk UKM Permadu Darmajaya dengan database MongoDB, sistem multi-role: Bendahara, Sekretaris, Ketua Umum, Wakil Ketua, para Kabid, dan Anggota. Setiap role memiliki fitur & dashboard berbeda-beda. Formal kampus & profesional. Wajib ada seed data agar dashboard langsung terisi.

## Architecture
- **Backend**: FastAPI (Python) + Motor (async MongoDB)
- **Frontend**: React 19 + Tailwind + Shadcn UI + Sonner
- **Auth**: JWT Bearer token (Authorization header) — dibuat oleh backend, disimpan di localStorage
- **Database**: MongoDB — collections `users`, `programs`, `finances`, `documents`, `agenda`

## User Personas (6 Roles)
1. **Ketua Umum** — oversight penuh, approval program, kelola semua modul
2. **Wakil Ketua Umum** — monitoring bidang, koordinasi pengurus
3. **Sekretaris** — surat masuk/keluar, notulen, agenda, arsip
4. **Bendahara** — kas masuk/keluar, laporan keuangan
5. **Kepala Bidang (Kabid)** — kelola program & anggota bidangnya
   (4 Bidang: Kerohanian, Sosial & Pengabdian, Seni & Budaya, Humas & Media)
6. **Anggota** — lihat program, agenda, direktori

## Design System
- Warna: Deep Emerald `#1B4D3E` + Antique Gold `#D4AF37` + Warm Terracotta `#C25932` + Cream `#FAF7F0`
- Font: Plus Jakarta Sans (heading), Inter (body), Fraunces (display italics)
- Aesthetic: Formal campus, ornamental dividers, grain overlay, staggered fade-up animations
- Sidebar dark emerald dengan gold accent

## Implemented (2026-02-28)
- ✅ JWT Auth (login, /me, logout) + interceptor
- ✅ RBAC per endpoint: `require_roles()` dependency
- ✅ Kabid RBAC scoped ke bidangnya (tidak bisa write bidang lain)
- ✅ Status program divalidasi (Literal enum)
- ✅ Seed data otomatis: 12 users, 9 programs, 9 finances, 7 documents, 6 agenda
- ✅ CRUD Programs, Finances, Documents, Agenda, Users
- ✅ Dashboard overview per role dengan stat cards, ringkasan kas, chart per bidang, agenda terdekat
- ✅ Sidebar dinamis per role (menu berbeda per role)
- ✅ Login page dengan quick-login demo (9 akun)
- ✅ Program page dengan filter bidang, approval flow (setujui/tolak untuk ketua & wakil)
- ✅ Keuangan page dengan tab masuk/keluar/semua + chart alokasi kategori
- ✅ Sekretariat page dengan 4 tab (Surat Masuk/Keluar/Notulen/Arsip)
- ✅ Agenda page dikelompokkan per bulan
- ✅ Anggota page dengan section Pengurus Inti/Kabid/Anggota + filter role
- ✅ Mobile responsive (hamburger menu)
- ✅ Testing: 34/34 backend pytest + 100% frontend flows

## Test Credentials
Semua password: `permadu123` — lihat `/app/memory/test_credentials.md`

## Prioritized Backlog
### P1 (Enhancement)
- Reset tab keuangan otomatis setelah tambah transaksi baru
- Ganti `window.confirm` dengan Shadcn `AlertDialog`
- Ganti native `<input type="date">` dengan Shadcn Calendar/Popover date picker
- Client-side validation dialog (required fields)
- Trim PII (email/phone/nim) dari GET /api/users untuk role=anggota
- Migrate `@app.on_event` → FastAPI lifespan handlers
- Split `server.py` (564 lines) → `routers/`, `models/`, `seed.py`

### P2 (Future)
- Export laporan keuangan → PDF/Excel
- Upload lampiran surat/notulen (Emergent Object Storage)
- Notifikasi in-app (agenda mendekati, program menunggu approval)
- Kalendar view Shadcn Calendar di halaman Agenda
- Log audit trail per aksi

## Key API Endpoints
- `POST /api/auth/login`, `GET /api/auth/me`, `POST /api/auth/logout`
- `GET/POST/PATCH/DELETE /api/users`
- `GET/POST/PATCH/DELETE /api/programs` (+ `/status`, filter `?bidang=`)
- `GET/POST/DELETE /api/finances` + `GET /api/finances/summary`
- `GET/POST/DELETE /api/documents` (filter `?doc_type=`)
- `GET/POST/DELETE /api/agenda`
- `GET /api/dashboard/overview`, `GET /api/meta/bidangs`
