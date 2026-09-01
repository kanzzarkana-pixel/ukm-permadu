import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api, idr, statusStyle } from "@/lib/api";
import { fileToBase64, exportCSV } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, CheckCircle2, XCircle, Pencil, Upload, FileText, Download } from "lucide-react";

const STATUSES = ["draft", "diusulkan", "disetujui", "berjalan", "selesai", "ditolak"];
const emptyForm = { name: "", description: "", bidang: "", status: "draft", budget: 0, start_date: "", end_date: "", pic: "" };

export default function ProgramPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [bidangs, setBidangs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const lpjRefs = useRef({});

  const canManage = ["ketua", "wakil", "kabid"].includes(user?.role);
  const canApprove = ["ketua", "wakil"].includes(user?.role);
  const canDelete = ["ketua", "kabid"].includes(user?.role);

  const load = async () => {
    const [p, m] = await Promise.all([api.get("/programs"), api.get("/meta/bidangs")]);
    let list = p.data;
    if (user?.role === "kabid") list = list.filter((x) => x.bidang === user.bidang);
    setItems(list); setBidangs(m.data.bidangs);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm, bidang: user?.role === "kabid" ? user.bidang : (bidangs[0] || "") });
    setOpen(true);
  };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, budget: Number(p.budget || 0) }); setOpen(true); };

  const save = async () => {
    try {
      const payload = { ...form, budget: Number(form.budget) };
      if (editing) await api.patch(`/programs/${editing.id}`, payload);
      else await api.post("/programs", payload);
      toast.success(editing ? "Program diperbarui" : "Program ditambahkan");
      setOpen(false); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const remove = async (id) => {
    if (!confirm("Hapus program ini?")) return;
    await api.delete(`/programs/${id}`); toast.success("Program dihapus"); load();
  };
  const setStatus = async (id, s) => {
    await api.post(`/programs/${id}/status?status=${s}`);
    toast.success(`Status: ${s}`); load();
  };

  const uploadLPJ = async (program, file) => {
    if (!file) return;
    try {
      const data_url = await fileToBase64(file, 3);
      await api.post(`/programs/${program.id}/lpj`, { lpj_url: data_url, lpj_filename: file.name });
      toast.success("LPJ berhasil diunggah");
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || e.message || "Gagal unggah LPJ"); }
  };

  const exportProgram = () => {
    const rows = filtered.map((p) => ({
      Nama: p.name, Bidang: p.bidang, Status: p.status, PIC: p.pic || "",
      Anggaran: p.budget, Mulai: p.start_date || "", Selesai: p.end_date || "",
      LPJ: p.lpj_filename || "-",
    }));
    exportCSV(`Program-Permadu-${new Date().toISOString().slice(0,10)}.csv`, rows);
    toast.success("Laporan program terunduh");
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.bidang === filter);

  return (
    <AppLayout activePath="/program">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Program Kerja"
          title={user?.role === "kabid" ? `Program Bidang ${user.bidang}` : "Manajemen Program Kerja"}
          description={canManage ? "Rancang, ajukan, kelola program & unggah LPJ." : "Lihat program kerja aktif UKM Permadu."}
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={exportProgram} data-testid="export-program-btn" className="rounded-full h-11 px-4 border-[var(--p-gold)] text-[#8a6d15] hover:bg-[var(--p-gold)] hover:text-[var(--p-navy)]">
                <Download size={15} className="mr-2"/> Ekspor CSV
              </Button>
              {canManage && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-program-btn" onClick={openCreate} className="rounded-full h-11 px-5 text-white btn-primary">
                      <Plus size={16} className="mr-2"/> Program Baru
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-white">
                    <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">{editing ? "Edit Program" : "Program Baru"}</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2"><Label>Nama Program</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="program-name-input"/></div>
                      <div className="md:col-span-2"><Label>Deskripsi</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></div>
                      <div>
                        <Label>Bidang</Label>
                        <Select value={form.bidang} onValueChange={(v) => setForm({ ...form, bidang: v })} disabled={user?.role === "kabid"}>
                          <SelectTrigger><SelectValue placeholder="Pilih bidang"/></SelectTrigger>
                          <SelectContent>{bidangs.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Status</Label>
                        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Anggaran (Rp)</Label><Input type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })}/></div>
                      <div><Label>PIC / Penanggung Jawab</Label><Input value={form.pic} onChange={(e) => setForm({ ...form, pic: e.target.value })}/></div>
                      <div><Label>Tanggal Mulai</Label><Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}/></div>
                      <div><Label>Tanggal Selesai</Label><Input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}/></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                      <Button onClick={save} data-testid="save-program-btn" className="text-white btn-primary">Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          }
        />

        {user?.role !== "kabid" && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter==="all" ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>Semua</button>
            {bidangs.map((b) => (
              <button key={b} onClick={() => setFilter(b)} className={`px-4 py-2 rounded-full text-sm font-medium ${filter===b ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>{b}</button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((p) => {
            const isPIC = p.pic === user?.name;
            const canUploadLPJ = ["ketua", "wakil"].includes(user?.role)
              || (user?.role === "kabid" && p.bidang === user?.bidang)
              || isPIC;
            return (
              <div key={p.id} className="data-card p-5 fade-up" data-testid={`program-card-${p.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <span className="chip chip-royal">{p.bidang}</span>
                  <span className={statusStyle(p.status)}>{p.status}</span>
                </div>
                <h3 className="font-bold text-[var(--p-navy)] font-display text-lg leading-snug">{p.name}</h3>
                <p className="text-sm text-[var(--p-muted)] mt-2 line-clamp-3">{p.description}</p>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-[var(--p-muted)] uppercase tracking-widest text-[10px]">Anggaran</div>
                    <div className="font-semibold text-[var(--p-royal)]">{idr(p.budget)}</div>
                  </div>
                  <div>
                    <div className="text-[var(--p-muted)] uppercase tracking-widest text-[10px]">PIC</div>
                    <div className="font-semibold text-[var(--p-text)]">{p.pic || "-"}</div>
                  </div>
                  <div className="col-span-2">
                    <div className="text-[var(--p-muted)] uppercase tracking-widest text-[10px]">Jadwal</div>
                    <div className="font-semibold text-[var(--p-text)]">{p.start_date || "-"} → {p.end_date || "-"}</div>
                  </div>
                </div>

                {/* LPJ zone */}
                {p.lpj_url ? (
                  <a href={p.lpj_url} download={p.lpj_filename} className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-[rgba(30,64,175,0.06)] border border-[rgba(30,64,175,0.15)] text-sm text-[var(--p-royal)] hover:bg-[rgba(30,64,175,0.1)] transition-all" data-testid={`lpj-download-${p.id}`}>
                    <FileText size={16}/> <span className="truncate flex-1">{p.lpj_filename}</span> <Download size={13}/>
                  </a>
                ) : canUploadLPJ && (
                  <>
                    <input ref={(el) => (lpjRefs.current[p.id] = el)} type="file" accept="application/pdf" className="hidden" onChange={(e) => uploadLPJ(p, e.target.files?.[0])}/>
                    <button onClick={() => lpjRefs.current[p.id]?.click()} className="mt-4 w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-[var(--p-line)] text-xs font-semibold text-[var(--p-muted)] hover:border-[var(--p-royal)] hover:text-[var(--p-royal)] transition-all" data-testid={`lpj-upload-${p.id}`}>
                      <Upload size={13}/> Unggah PDF LPJ
                    </button>
                  </>
                )}

                {(canManage || canApprove || canDelete) && (
                  <div className="mt-4 pt-4 border-t border-[var(--p-line)] flex flex-wrap gap-2">
                    {canApprove && p.status === "diusulkan" && (
                      <>
                        <button onClick={() => setStatus(p.id, "disetujui")} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(30,64,175,0.08)] text-[var(--p-royal)] font-semibold hover:bg-[var(--p-royal)] hover:text-white transition-all">
                          <CheckCircle2 size={13}/> Setujui
                        </button>
                        <button onClick={() => setStatus(p.id, "ditolak")} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full bg-[rgba(185,28,28,0.1)] text-[var(--p-crimson)] font-semibold hover:bg-[var(--p-crimson)] hover:text-white transition-all">
                          <XCircle size={13}/> Tolak
                        </button>
                      </>
                    )}
                    {canManage && <button onClick={() => openEdit(p)} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full border border-[var(--p-line)] hover:border-[var(--p-gold)] text-[var(--p-navy)] font-semibold transition-all"><Pencil size={13}/> Edit</button>}
                    {canDelete && <button onClick={() => remove(p.id)} className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full text-[var(--p-crimson)] hover:bg-[rgba(185,28,28,0.1)] font-semibold transition-all"><Trash2 size={13}/> Hapus</button>}
                  </div>
                )}
              </div>
            );
          })}
          {filtered.length === 0 && <div className="col-span-full text-center py-16 text-[var(--p-muted)]">Belum ada program.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
