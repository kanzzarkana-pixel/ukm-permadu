import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api, roleLabel } from "@/lib/api";
import { resizeImage } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Mail, Phone, GraduationCap, Pencil, Camera } from "lucide-react";

const ROLES = ["ketua", "wakil", "sekretaris", "bendahara", "kabid", "anggota"];

const emptyForm = { email: "", password: "permadu123", name: "", role: "anggota", bidang: "", nim: "", jurusan: "", angkatan: "", phone: "", avatar_url: "" };

const UserCard = ({ u, canDelete, canEdit, onEdit, onDelete }) => {
  const initials = u.name.split(" ").slice(0,2).map(s=>s[0]).join("").toUpperCase();
  return (
    <div className="data-card p-5 fade-up" data-testid={`user-card-${u.id}`}>
      <div className="flex items-start gap-3">
        <div className="avatar-ring w-14 h-14 flex-shrink-0">
          {u.avatar_url ? (
            <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover"/>
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-sm" style={{ color: "var(--p-navy)" }}>{initials}</div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-bold text-[var(--p-navy)] leading-tight truncate">{u.name}</div>
          <div className="text-xs text-[var(--p-muted)]">{roleLabel(u.role)}{u.bidang ? ` · ${u.bidang}` : ""}</div>
          {u.angkatan && <div className="chip chip-gold mt-2">Angkatan {u.angkatan}</div>}
        </div>
        <div className="flex flex-col items-end gap-1">
          {canEdit && <button onClick={() => onEdit(u)} className="text-[var(--p-royal)] hover:text-[var(--p-navy)] p-1" data-testid={`edit-user-${u.id}`}><Pencil size={14}/></button>}
          {canDelete && u.role !== "ketua" && <button onClick={() => onDelete(u.id)} className="text-[var(--p-crimson)] hover:opacity-70 p-1"><Trash2 size={14}/></button>}
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-[var(--p-line)] space-y-1.5 text-xs text-[var(--p-muted)]">
        {u.nim && <div className="flex items-center gap-2"><GraduationCap size={13} className="text-[var(--p-royal)]"/> {u.nim} · {u.jurusan}</div>}
        {u.email && <div className="flex items-center gap-2"><Mail size={13} className="text-[var(--p-royal)]"/> <span className="truncate">{u.email}</span></div>}
        {u.phone && <div className="flex items-center gap-2"><Phone size={13} className="text-[var(--p-royal)]"/> {u.phone}</div>}
        {u.bio && <div className="italic pt-1 text-[var(--p-text)]">"{u.bio}"</div>}
      </div>
    </div>
  );
};

const Section = ({ title, list, ...cardProps }) => list.length > 0 && (
  <div className="mb-10">
    <div className="flex items-center gap-3 mb-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--p-gold)]">{title}</div>
      <div className="flex-1 h-px bg-gradient-to-r from-[var(--p-gold)] to-transparent opacity-60"/>
      <div className="chip chip-royal">{list.length}</div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {list.map((u) => <UserCard key={u.id} u={u} {...cardProps}/>)}
    </div>
  </div>
);

export default function AnggotaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [bidangs, setBidangs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [groupBy, setGroupBy] = useState("role");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);

  const canManage = ["ketua", "wakil", "sekretaris", "kabid"].includes(user?.role);
  const canDelete = user?.role === "ketua";

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/users"), api.get("/meta/bidangs")]);
    setItems(a.data); setBidangs(b.data.bidangs);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    if (user?.role === "kabid") {
      setForm({ ...emptyForm, role: "anggota", bidang: user.bidang });
    } else {
      setForm(emptyForm);
    }
    setOpen(true);
  };
  const openEdit = (u) => {
    setEditing(u);
    setForm({ ...emptyForm, ...u, password: "" });
    setOpen(true);
  };

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await resizeImage(f, 480, 0.85);
      setForm((s) => ({ ...s, avatar_url: url }));
    } catch (err) { toast.error(err.message); }
  };

  const save = async () => {
    try {
      const payload = { ...form };
      if (!payload.bidang || payload.bidang === "_none") delete payload.bidang;
      if (editing) {
        delete payload.email; delete payload.password;
        await api.patch(`/users/${editing.id}`, payload);
        toast.success("Anggota diperbarui");
      } else {
        if (!payload.password) payload.password = "permadu123";
        await api.post("/users", payload);
        toast.success("Anggota ditambahkan");
      }
      setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const remove = async (id) => {
    if (!confirm("Hapus anggota?")) return;
    await api.delete(`/users/${id}`); toast.success("Dihapus"); load();
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.role === filter);

  // Grouping
  let sections = [];
  if (groupBy === "role") {
    sections = [
      { title: "Pengurus Inti", list: filtered.filter((i) => ["ketua","wakil","sekretaris","bendahara"].includes(i.role)) },
      { title: "Kepala Bidang", list: filtered.filter((i) => i.role === "kabid") },
      { title: "Anggota", list: filtered.filter((i) => i.role === "anggota") },
    ];
  } else {
    const byYear = {};
    filtered.forEach((u) => {
      const y = u.angkatan || "Tanpa Angkatan";
      (byYear[y] = byYear[y] || []).push(u);
    });
    sections = Object.keys(byYear).sort().reverse().map((y) => ({ title: `Angkatan ${y}`, list: byYear[y] }));
  }

  return (
    <AppLayout activePath="/anggota">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Struktur Organisasi"
          title="Anggota & Pengurus"
          description="Direktori pengurus inti, kepala bidang, dan seluruh anggota aktif UKM Permadu."
          action={canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-user-btn" onClick={openCreate} className="rounded-full h-11 px-5 text-white btn-primary">
                  <Plus size={16} className="mr-2"/> Anggota Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">{editing ? "Edit Anggota" : "Tambah Anggota"}</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 flex items-center gap-4">
                    <div className="avatar-ring w-20 h-20">
                      {form.avatar_url ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover"/> : <div className="w-full h-full flex items-center justify-center text-[var(--p-navy)] font-bold">{(form.name||"?").split(" ").slice(0,2).map(s=>s[0]).join("").toUpperCase()}</div>}
                    </div>
                    <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 text-sm font-semibold text-[var(--p-royal)]">
                      <Camera size={16}/> Foto Profil
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden"/>
                  </div>
                  <div className="col-span-2"><Label>Nama Lengkap</Label><Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} data-testid="user-name-input"/></div>
                  {!editing && <>
                    <div><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}/></div>
                    <div><Label>Kata Sandi Awal</Label><Input value={form.password} onChange={(e) => setForm({...form, password: e.target.value})}/></div>
                  </>}
                  <div>
                    <Label>Peran</Label>
                    <Select value={form.role} onValueChange={(v) => setForm({...form, role: v})} disabled={user?.role === "kabid"}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>{ROLES.map((r) => <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Bidang</Label>
                    <Select value={form.bidang || "_none"} onValueChange={(v) => setForm({...form, bidang: v==="_none" ? "" : v})} disabled={user?.role === "kabid"}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">— Tidak ada —</SelectItem>
                        {bidangs.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label>NIM</Label><Input value={form.nim} onChange={(e) => setForm({...form, nim: e.target.value})}/></div>
                  <div><Label>Jurusan</Label><Input value={form.jurusan} onChange={(e) => setForm({...form, jurusan: e.target.value})}/></div>
                  <div><Label>Angkatan</Label><Input value={form.angkatan} onChange={(e) => setForm({...form, angkatan: e.target.value})} placeholder="2022"/></div>
                  <div><Label>No. HP</Label><Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}/></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={save} data-testid="save-user-btn" className="text-white btn-primary">Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        />

        <div className="flex flex-wrap items-center gap-2 mb-6">
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter==="all" ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>Semua ({items.length})</button>
          {ROLES.map((r) => (
            <button key={r} onClick={() => setFilter(r)} className={`px-4 py-2 rounded-full text-sm font-medium ${filter===r ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>
              {roleLabel(r)} ({items.filter(i=>i.role===r).length})
            </button>
          ))}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[var(--p-muted)]">Kelompokkan:</span>
            <button onClick={() => setGroupBy("role")} data-testid="group-by-role" className={`px-3 py-1.5 rounded-full text-xs font-semibold ${groupBy==="role" ? "bg-[var(--p-gold)] text-[var(--p-navy)]" : "bg-white border border-[var(--p-line)] text-[var(--p-muted)]"}`}>Peran</button>
            <button onClick={() => setGroupBy("angkatan")} data-testid="group-by-angkatan" className={`px-3 py-1.5 rounded-full text-xs font-semibold ${groupBy==="angkatan" ? "bg-[var(--p-gold)] text-[var(--p-navy)]" : "bg-white border border-[var(--p-line)] text-[var(--p-muted)]"}`}>Angkatan</button>
          </div>
        </div>

        {sections.map((s) => (
          <Section key={s.title} title={s.title} list={s.list} canDelete={canDelete} canEdit={canManage} onEdit={openEdit} onDelete={remove}/>
        ))}
      </div>
    </AppLayout>
  );
}
