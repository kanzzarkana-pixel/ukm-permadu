"""Backend API tests for UKM Permadu Darmajaya."""
import os

import pytest
import requests
from dotenv import dotenv_values

frontend_env = dotenv_values("/app/frontend/.env")
base_url = os.environ.get("REACT_APP_BACKEND_URL") or frontend_env.get("REACT_APP_BACKEND_URL")
if not base_url:
    raise RuntimeError("REACT_APP_BACKEND_URL missing")
BASE_URL = base_url.rstrip("/")
API = f"{BASE_URL}/api"
PASSWORD = "permadu123"

ACCOUNTS = {
    "ketua": "ketua@permadu.darmajaya.ac.id",
    "wakil": "wakil@permadu.darmajaya.ac.id",
    "sekretaris": "sekretaris@permadu.darmajaya.ac.id",
    "bendahara": "bendahara@permadu.darmajaya.ac.id",
    "kabid": "kabid.kerohanian@permadu.darmajaya.ac.id",
    "anggota": "anggota@permadu.darmajaya.ac.id",
}


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def login(session, role):
    r = session.post(f"{API}/auth/login", json={"email": ACCOUNTS[role], "password": PASSWORD})
    if r.status_code != 200:
        pytest.fail(f"Login failed for {role}: {r.status_code} {r.text[:300]}")
    return r.json()["access_token"]


@pytest.fixture(scope="session")
def tokens(session):
    return {role: login(session, role) for role in ACCOUNTS}


def hdr(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


# --- Health ---
class TestHealth:
    def test_root(self, session):
        r = session.get(f"{API}/")
        assert r.status_code == 200
        assert "message" in r.json()

    def test_meta_bidangs(self, session):
        r = session.get(f"{API}/meta/bidangs")
        assert r.status_code == 200
        d = r.json()
        assert len(d["bidangs"]) == 4
        assert "anggota" in d["roles"]


# --- Auth ---
class TestAuth:
    def test_login_success(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ACCOUNTS["ketua"], "password": PASSWORD})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d["access_token"], str) and len(d["access_token"]) > 20
        assert d["user"]["email"] == ACCOUNTS["ketua"]
        assert d["user"]["role"] == "ketua"
        assert "password_hash" not in d["user"]
        assert "_id" not in d["user"]

    def test_login_wrong_email(self, session):
        r = session.post(f"{API}/auth/login", json={"email": "nobody@permadu.darmajaya.ac.id", "password": PASSWORD})
        assert r.status_code == 401

    def test_login_wrong_password(self, session):
        r = session.post(f"{API}/auth/login", json={"email": ACCOUNTS["ketua"], "password": "salah"})
        assert r.status_code == 401

    def test_me_without_token(self, session):
        r = requests.get(f"{API}/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, session, tokens):
        r = requests.get(f"{API}/auth/me", headers=hdr(tokens["anggota"]))
        assert r.status_code == 200
        assert r.json()["role"] == "anggota"

    def test_me_invalid_token(self):
        r = requests.get(f"{API}/auth/me", headers={"Authorization": "Bearer garbage.token.x"})
        assert r.status_code == 401


# --- Seed data ---
class TestSeed:
    def test_users_requires_auth(self):
        assert requests.get(f"{API}/users").status_code == 401

    def test_users_seeded(self, tokens):
        r = requests.get(f"{API}/users", headers=hdr(tokens["ketua"]))
        assert r.status_code == 200
        users = r.json()
        assert len(users) >= 12
        assert all("password_hash" not in u and "_id" not in u for u in users)

    def test_programs_seeded(self, tokens):
        r = requests.get(f"{API}/programs", headers=hdr(tokens["anggota"]))
        assert r.status_code == 200
        assert len(r.json()) >= 9

    def test_finances_seeded(self, tokens):
        r = requests.get(f"{API}/finances", headers=hdr(tokens["bendahara"]))
        assert r.status_code == 200
        assert len(r.json()) >= 9

    def test_documents_seeded(self, tokens):
        r = requests.get(f"{API}/documents", headers=hdr(tokens["sekretaris"]))
        assert r.status_code == 200
        assert len(r.json()) >= 7

    def test_agenda_seeded(self, tokens):
        r = requests.get(f"{API}/agenda", headers=hdr(tokens["ketua"]))
        assert r.status_code == 200
        assert len(r.json()) >= 6


# --- Filters ---
class TestFilters:
    def test_programs_filter_bidang(self, tokens):
        r = requests.get(f"{API}/programs", params={"bidang": "Kerohanian"}, headers=hdr(tokens["kabid"]))
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 1
        assert all(p["bidang"] == "Kerohanian" for p in data)

    def test_documents_filter_type(self, tokens):
        r = requests.get(f"{API}/documents", params={"doc_type": "notulen"}, headers=hdr(tokens["sekretaris"]))
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 2
        assert all(d["doc_type"] == "notulen" for d in data)


# --- Dashboard & summary ---
class TestDashboard:
    def test_overview(self, tokens):
        r = requests.get(f"{API}/dashboard/overview", headers=hdr(tokens["ketua"]))
        assert r.status_code == 200
        d = r.json()
        for k in ["total_anggota", "total_program", "saldo_kas", "kas_masuk", "kas_keluar",
                  "total_dokumen", "total_agenda", "program_by_bidang", "program_by_status", "bidang_list"]:
            assert k in d, f"missing {k}"
        assert d["total_anggota"] >= 12
        assert d["total_program"] >= 9
        assert d["saldo_kas"] == d["kas_masuk"] - d["kas_keluar"]
        assert len(d["program_by_bidang"]) >= 1

    def test_finance_summary(self, tokens):
        r = requests.get(f"{API}/finances/summary", headers=hdr(tokens["bendahara"]))
        assert r.status_code == 200
        d = r.json()
        assert d["saldo"] == d["kas_masuk"] - d["kas_keluar"]
        assert d["total_transaksi"] >= 9


# --- RBAC ---
class TestRBAC:
    def test_anggota_cannot_create_program(self, tokens):
        r = requests.post(f"{API}/programs", headers=hdr(tokens["anggota"]), json={
            "name": "TEST_prog", "description": "x", "bidang": "Kerohanian"})
        assert r.status_code == 403

    def test_bendahara_cannot_create_program(self, tokens):
        r = requests.post(f"{API}/programs", headers=hdr(tokens["bendahara"]), json={
            "name": "TEST_prog", "description": "x", "bidang": "Kerohanian"})
        assert r.status_code == 403

    def test_anggota_cannot_create_finance(self, tokens):
        r = requests.post(f"{API}/finances", headers=hdr(tokens["anggota"]), json={
            "type": "masuk", "amount": 1, "category": "TEST", "description": "x", "date": "2026-01-01"})
        assert r.status_code == 403

    def test_anggota_cannot_create_document(self, tokens):
        r = requests.post(f"{API}/documents", headers=hdr(tokens["anggota"]), json={
            "doc_type": "notulen", "title": "TEST", "date": "2026-01-01"})
        assert r.status_code == 403

    def test_anggota_cannot_create_user(self, tokens):
        r = requests.post(f"{API}/users", headers=hdr(tokens["anggota"]), json={
            "email": "TEST_x@permadu.darmajaya.ac.id", "password": "x", "name": "x", "role": "anggota"})
        assert r.status_code == 403

    def test_kabid_cannot_set_program_status(self, tokens):
        r = requests.get(f"{API}/programs", headers=hdr(tokens["kabid"]))
        pid = r.json()[0]["id"]
        res = requests.post(f"{API}/programs/{pid}/status", params={"status": "disetujui"}, headers=hdr(tokens["kabid"]))
        assert res.status_code == 403


# --- CRUD Program ---
class TestProgramCRUD:
    def test_kabid_create_and_ketua_approve_and_delete(self, tokens):
        payload = {"name": "TEST_Program QA", "description": "QA test program", "bidang": "Kerohanian",
                   "status": "diusulkan", "budget": 100000, "start_date": "2026-05-01",
                   "end_date": "2026-05-02", "pic": "QA"}
        r = requests.post(f"{API}/programs", headers=hdr(tokens["kabid"]), json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        prog = r.json()
        pid = prog["id"]
        assert prog["name"] == payload["name"]
        assert "_id" not in prog

        # verify persisted
        g = requests.get(f"{API}/programs", headers=hdr(tokens["kabid"]))
        assert any(p["id"] == pid for p in g.json())

        # ketua approves
        s = requests.post(f"{API}/programs/{pid}/status", params={"status": "disetujui"}, headers=hdr(tokens["ketua"]))
        assert s.status_code == 200
        g2 = requests.get(f"{API}/programs", headers=hdr(tokens["ketua"]))
        found = [p for p in g2.json() if p["id"] == pid][0]
        assert found["status"] == "disetujui"

        # patch update
        payload2 = dict(payload)
        payload2["name"] = "TEST_Program QA Updated"
        payload2["status"] = "berjalan"
        u = requests.patch(f"{API}/programs/{pid}", headers=hdr(tokens["ketua"]), json=payload2)
        assert u.status_code == 200
        assert u.json()["name"] == "TEST_Program QA Updated"

        # delete
        d = requests.delete(f"{API}/programs/{pid}", headers=hdr(tokens["ketua"]))
        assert d.status_code == 200
        assert d.json()["deleted"] == 1
        g3 = requests.get(f"{API}/programs", headers=hdr(tokens["ketua"]))
        assert not any(p["id"] == pid for p in g3.json())

    def test_status_404_on_unknown_program(self, tokens):
        r = requests.post(f"{API}/programs/does-not-exist/status", params={"status": "disetujui"},
                          headers=hdr(tokens["ketua"]))
        assert r.status_code == 404

    def test_invalid_bidang_or_status_validation(self, tokens):
        r = requests.post(f"{API}/programs", headers=hdr(tokens["kabid"]), json={
            "name": "TEST_bad", "description": "x", "bidang": "Kerohanian", "status": "tidak_valid"})
        assert r.status_code == 422


# --- CRUD Finance ---
class TestFinanceCRUD:
    def test_bendahara_create_delete(self, tokens):
        before = requests.get(f"{API}/finances/summary", headers=hdr(tokens["bendahara"])).json()
        payload = {"type": "masuk", "amount": 250000, "category": "TEST_Kategori",
                   "description": "TEST_transaksi QA", "date": "2026-06-01", "reference": "TEST-REF-1"}
        r = requests.post(f"{API}/finances", headers=hdr(tokens["bendahara"]), json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        fin = r.json()
        fid = fin["id"]
        assert fin["amount"] == 250000
        assert fin["recorded_by"]

        lst = requests.get(f"{API}/finances", headers=hdr(tokens["bendahara"])).json()
        assert any(f["id"] == fid for f in lst)

        after = requests.get(f"{API}/finances/summary", headers=hdr(tokens["bendahara"])).json()
        assert after["kas_masuk"] == before["kas_masuk"] + 250000
        assert after["saldo"] == before["saldo"] + 250000

        d = requests.delete(f"{API}/finances/{fid}", headers=hdr(tokens["bendahara"]))
        assert d.status_code == 200 and d.json()["deleted"] == 1
        final = requests.get(f"{API}/finances/summary", headers=hdr(tokens["bendahara"])).json()
        assert final["kas_masuk"] == before["kas_masuk"]

    def test_invalid_type(self, tokens):
        r = requests.post(f"{API}/finances", headers=hdr(tokens["bendahara"]), json={
            "type": "invalid", "amount": 1, "category": "x", "description": "x", "date": "2026-01-01"})
        assert r.status_code == 422


# --- CRUD Document ---
class TestDocumentCRUD:
    def test_sekretaris_create_delete(self, tokens):
        payload = {"doc_type": "notulen", "title": "TEST_Notulen QA", "number": "TEST-001",
                   "from_party": "QA", "to_party": "Arsip", "date": "2026-06-02",
                   "summary": "QA summary", "content": "QA content"}
        r = requests.post(f"{API}/documents", headers=hdr(tokens["sekretaris"]), json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        doc = r.json()
        did = doc["id"]
        assert doc["title"] == payload["title"]

        lst = requests.get(f"{API}/documents", params={"doc_type": "notulen"},
                           headers=hdr(tokens["sekretaris"])).json()
        assert any(d["id"] == did for d in lst)

        d = requests.delete(f"{API}/documents/{did}", headers=hdr(tokens["sekretaris"]))
        assert d.status_code == 200 and d.json()["deleted"] == 1
        lst2 = requests.get(f"{API}/documents", headers=hdr(tokens["sekretaris"])).json()
        assert not any(x["id"] == did for x in lst2)


# --- CRUD Agenda ---
class TestAgendaCRUD:
    def test_sekretaris_create_delete(self, tokens):
        payload = {"title": "TEST_Agenda QA", "date": "2026-07-01", "time": "10:00",
                   "location": "QA Room", "description": "QA", "audience": "Pengurus"}
        r = requests.post(f"{API}/agenda", headers=hdr(tokens["sekretaris"]), json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        aid = r.json()["id"]
        lst = requests.get(f"{API}/agenda", headers=hdr(tokens["sekretaris"])).json()
        assert any(a["id"] == aid for a in lst)
        d = requests.delete(f"{API}/agenda/{aid}", headers=hdr(tokens["sekretaris"]))
        assert d.status_code == 200 and d.json()["deleted"] == 1

    def test_anggota_cannot_create_agenda(self, tokens):
        r = requests.post(f"{API}/agenda", headers=hdr(tokens["anggota"]), json={
            "title": "TEST_x", "date": "2026-07-01"})
        assert r.status_code == 403


# --- User CRUD ---
class TestUserCRUD:
    def test_create_update_delete_user(self, tokens):
        payload = {"email": "test_qa_user@permadu.darmajaya.ac.id", "password": "permadu123",
                   "name": "TEST_QA User", "role": "anggota", "nim": "9999", "jurusan": "QA",
                   "angkatan": "2026", "phone": "0800"}
        r = requests.post(f"{API}/users", headers=hdr(tokens["ketua"]), json=payload)
        assert r.status_code in (200, 201), r.text[:300]
        u = r.json()
        uid = u["id"]
        assert "password_hash" not in u, "password_hash leaked in create_user response"
        assert "_id" not in u

        p = requests.patch(f"{API}/users/{uid}", headers=hdr(tokens["ketua"]), json={"name": "TEST_QA Updated"})
        assert p.status_code == 200
        assert p.json()["name"] == "TEST_QA Updated"

        # duplicate email
        dup = requests.post(f"{API}/users", headers=hdr(tokens["ketua"]), json=payload)
        assert dup.status_code == 400

        d = requests.delete(f"{API}/users/{uid}", headers=hdr(tokens["ketua"]))
        assert d.status_code == 200 and d.json()["deleted"] == 1
        lst = requests.get(f"{API}/users", headers=hdr(tokens["ketua"])).json()
        assert not any(x["id"] == uid for x in lst)

    def test_patch_unknown_user_404(self, tokens):
        r = requests.patch(f"{API}/users/nope-id", headers=hdr(tokens["ketua"]), json={"name": "x"})
        assert r.status_code == 404
