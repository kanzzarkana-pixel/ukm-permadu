import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { fileToBase64 } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Upload, FileText, Download, Folder } from "lucide-react";

const CATEGORIES = [
  { key: "proposal", label: "Proposal" },
  { key: "lpj", label: "LPJ" },
  { key: "materi", label: "Materi Kaderisasi" },
  { key: "administrasi", label: "Administrasi" },
  { key: "dokumen", label: "Dokumen Lainnya" },
];

const emptyForm = { bidang: "", title: "", description: "", file_url: "", filename: "", category: "dokumen" };

export default function BidangFilesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [bidangs, setBidangs] = useState([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const fileRef = useRef(null);

  const canUpload = ["ketua", "wakil", "kabid"].includes(user?.role);

  const load = async () => {
    const [a, b] = await Promise.all([api.get("/bidang-files"), api.get("/meta/bidangs")]);
    setItems(a.data); setBidangs(b.data.bidangs);
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...emptyForm, bidang: user?.role === "kabid" ? user.bidang : (bidangs[0] || "") });
    setOpen(true);
  };

  const pickFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await fileToBase64(f, 5);
      setForm((s) => ({ ...s, file_url: url, filename: f.name }));
    } catch (err) { toast.error(err.message); }
  };

  const save = async () => {
    if (!form.file_url) { toast.error("Silakan pilih file PDF terlebih dahulu"); return; }
    try {
      await api.post("/bidang-files", form);
      toast.success("Dokumen bidang tersimpan");
      setOpen(false); setForm(emptyForm); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const remove = async (id) => {
    if (!confirm("Hapus dokumen ini?")) return;
    try {
      await api.delete(`/bidang-files/${id}`);
      toast.success("Dihapus"); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menghapus"); }
  };

  const filtered = filter === "all" ? items : items.filter((i) => i.bidang === filter);
  // Group by bidang
  const grouped = filtered.reduce((acc, it) => { (acc[it.bidang] = acc[it.bidang] || []).push(it); return acc; }, {});

  return (
    <AppLayout activePath="/dokumen-bidang">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Arsip Bidang"
          title="Dokumen per Bidang"
          description="Kabid dapat mengunggah proposal, LPJ, materi kaderisasi, dan dokumen lain berformat PDF — dapat diunduh seluruh anggota."
          action={canUpload && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-bidang-file-btn" onClick={openCreate} className="rounded-full h-11 px-5 text-white btn-primary">
                  <Upload size={16} className="mr-2"/> Unggah Dokumen
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg bg-white">
                <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">Unggah Dokumen Bidang</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Bidang</Label>
                      <Select value={form.bidang} onValueChange={(v) => setForm({...form, bidang: v})} disabled={user?.role === "kabid"}>
                        <SelectTrigger><SelectValue placeholder="Pilih bidang"/></SelectTrigger>
                        <SelectContent>{bidangs.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Kategori</Label>
                      <Select value={form.category} onValueChange={(v) => setForm({...form, category: v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div><Label>Judul Dokumen</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} placeholder="Contoh: Proposal LDK 2026" data-testid="bidang-file-title"/></div>
                  <div><Label>Deskripsi (opsional)</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></div>
                  <div>
                    <Label>File PDF (maks. 5 MB)</Label>
                    <div onClick={() => fileRef.current?.click()} className="upload-zone mt-2">
                      {form.filename ? (
                        <div className="flex items-center gap-2 justify-center text-[var(--p-royal)]">
                          <FileText size={20}/> <span className="text-sm font-semibold">{form.filename}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[var(--p-muted)]">
                          <Upload size={28}/>
                          <div className="text-sm font-semibold">Klik untuk pilih PDF</div>
                        </div>
                      )}
                    </div>
                    <input ref={fileRef} type="file" accept="application/pdf" onChange={pickFile} className="hidden"/>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={save} data-testid="save-bidang-file-btn" className="text-white btn-primary">Simpan</Button>
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

        {Object.entries(grouped).map(([bidang, list]) => (
          <div key={bidang} className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <Folder size={16} className="text-[var(--p-gold)]"/>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--p-navy)]">{bidang}</div>
              <div className="flex-1 h-px bg-gradient-to-r from-[var(--p-gold)] to-transparent opacity-60"/>
              <div className="chip chip-royal">{list.length} file</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {list.map((f) => (
                <div key={f.id} className="data-card p-5 hover:shadow-lg transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <span className="chip chip-gold">{CATEGORIES.find((c) => c.key === f.category)?.label || f.category}</span>
                    <button onClick={() => remove(f.id)} className="text-[var(--p-crimson)] hover:opacity-70"><Trash2 size={13}/></button>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "rgba(30, 64, 175, 0.1)", color: "var(--p-royal)" }}>
                      <FileText size={18}/>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-[var(--p-navy)] leading-tight">{f.title}</div>
                      {f.description && <div className="text-xs text-[var(--p-muted)] mt-1 line-clamp-2">{f.description}</div>}
                      <div className="text-[10px] text-[var(--p-muted)] mt-2 tracking-widest uppercase">{f.uploaded_by}</div>
                    </div>
                  </div>
                  <a href={f.file_url} download={f.filename} data-testid={`download-${f.id}`}
                     className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-full bg-[rgba(30,64,175,0.08)] text-[var(--p-royal)] font-semibold text-sm hover:bg-[var(--p-royal)] hover:text-white transition-all">
                    <Download size={14}/> Unduh PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="data-card p-16 text-center">
            <Folder className="mx-auto mb-4 text-[var(--p-muted)]" size={40}/>
            <div className="text-[var(--p-muted)]">Belum ada dokumen di bidang ini. Kabid dapat mengunggah PDF pertama.</div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
