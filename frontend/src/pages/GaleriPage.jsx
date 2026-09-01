import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { resizeImage } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Image as ImageIcon, Camera } from "lucide-react";

const emptyForm = { image_url: "", caption: "", date: new Date().toISOString().slice(0,10), program_id: "", bidang: "" };

export default function GaleriPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [bidangs, setBidangs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);

  const canUpload = ["ketua", "wakil", "sekretaris", "bendahara", "kabid"].includes(user?.role);

  const load = async () => {
    const [a, b, c] = await Promise.all([
      api.get("/activity-photos"),
      api.get("/programs"),
      api.get("/meta/bidangs"),
    ]);
    setItems(a.data); setPrograms(b.data); setBidangs(c.data.bidangs);
  };
  useEffect(() => { load(); }, []);

  const pickImg = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await resizeImage(f, 1200, 0.85);
      setForm((s) => ({ ...s, image_url: url }));
    } catch (err) { toast.error(err.message); }
  };

  const save = async () => {
    if (!form.image_url) { toast.error("Silakan pilih foto"); return; }
    try {
      const payload = { ...form };
      if (payload.program_id) {
        const prog = programs.find((p) => p.id === payload.program_id);
        if (prog) { payload.program_name = prog.name; payload.bidang = prog.bidang; }
      }
      if (!payload.program_id) delete payload.program_id;
      if (!payload.bidang) delete payload.bidang;
      await api.post("/activity-photos", payload);
      toast.success("Foto ditambahkan ke timeline");
      setOpen(false); setForm(emptyForm); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus foto?")) return;
    try {
      await api.delete(`/activity-photos/${id}`);
      toast.success("Dihapus"); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus"); }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.bidang === filter);

  // Group by month
  const grouped = filtered.reduce((acc, it) => {
    const key = new Date(it.date).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    (acc[key] = acc[key] || []).push(it);
    return acc;
  }, {});

  return (
    <AppLayout activePath="/galeri">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Timeline"
          title="Galeri Foto Kegiatan"
          description="Kumpulan dokumentasi foto kegiatan Permadu — persembahyangan, latihan, bakti sosial, hingga parade budaya."
          action={canUpload && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-galeri-btn" onClick={() => setForm(emptyForm)} className="rounded-full h-11 px-5 text-white btn-primary">
                  <Camera size={16} className="mr-2"/> Unggah Foto
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white">
                <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">Unggah Foto Kegiatan</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div onClick={() => fileRef.current?.click()} className="upload-zone">
                    {form.image_url ? (
                      <img src={form.image_url} alt="preview" className="max-h-56 mx-auto rounded-lg"/>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-[var(--p-muted)]">
                        <ImageIcon size={32}/>
                        <div className="text-sm font-semibold">Klik untuk pilih foto</div>
                        <div className="text-xs">JPG / PNG, otomatis dikompres</div>
                      </div>
                    )}
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" onChange={pickImg} className="hidden"/>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Tanggal</Label>
                      <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}/>
                    </div>
                    <div>
                      <Label>Program (opsional)</Label>
                      <Select value={form.program_id || "_none"} onValueChange={(v) => setForm({...form, program_id: v==="_none" ? "" : v})}>
                        <SelectTrigger><SelectValue placeholder="—"/></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">— Tidak terkait —</SelectItem>
                          {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label>Keterangan</Label>
                    <Textarea rows={3} value={form.caption} onChange={(e) => setForm({...form, caption: e.target.value})} placeholder="Contoh: Momen persembahyangan purnama Februari 2026."/>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={save} data-testid="save-galeri-btn" className="text-white btn-primary">Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        />

        <div className="flex flex-wrap gap-2 mb-6">
          <button onClick={() => setFilter("all")} className={`px-4 py-2 rounded-full text-sm font-medium ${filter==="all" ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>Semua ({items.length})</button>
          {bidangs.map((b) => (
            <button key={b} onClick={() => setFilter(b)} className={`px-4 py-2 rounded-full text-sm font-medium ${filter===b ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}>{b}</button>
          ))}
        </div>

        {Object.entries(grouped).map(([month, list]) => (
          <div key={month} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--p-gold)]">{month}</div>
              <div className="flex-1 h-px bg-gradient-to-r from-[var(--p-gold)] to-transparent opacity-60"/>
              <div className="chip chip-royal">{list.length} foto</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {list.map((p) => (
                <div key={p.id} className="group relative rounded-xl overflow-hidden border border-[var(--p-line)] hover:shadow-xl hover:-translate-y-0.5 transition-all bg-white">
                  <img src={p.image_url} alt={p.caption} className="w-full h-48 object-cover"/>
                  <div className="p-3">
                    <div className="text-[10px] tracking-widest uppercase text-[var(--p-gold)] font-semibold">{p.date}{p.bidang ? ` · ${p.bidang}` : ""}</div>
                    {p.program_name && <div className="text-xs font-semibold text-[var(--p-navy)] mt-1 truncate">{p.program_name}</div>}
                    <div className="text-xs text-[var(--p-text)] mt-1 line-clamp-2">{p.caption}</div>
                    <div className="text-[10px] text-[var(--p-muted)] mt-2">— {p.uploaded_by}</div>
                  </div>
                  <button onClick={() => remove(p.id)} className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-full p-1.5 text-[var(--p-crimson)] opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13}/></button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {items.length === 0 && (
          <div className="data-card p-16 text-center">
            <ImageIcon className="mx-auto mb-4 text-[var(--p-muted)]" size={40}/>
            <div className="text-[var(--p-muted)]">Belum ada foto kegiatan. Silakan unggah foto pertama Anda.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
