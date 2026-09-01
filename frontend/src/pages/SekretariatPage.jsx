import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Inbox, Send, FileText, Archive } from "lucide-react";

const TABS = [
  { key: "surat_masuk", label: "Surat Masuk", icon: Inbox },
  { key: "surat_keluar", label: "Surat Keluar", icon: Send },
  { key: "notulen", label: "Notulen", icon: FileText },
  { key: "arsip", label: "Arsip", icon: Archive },
];

const emptyForm = { doc_type: "surat_masuk", title: "", number: "", from_party: "", to_party: "", date: new Date().toISOString().slice(0,10), summary: "", content: "" };

export default function SekretariatPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState("surat_masuk");
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const canManage = ["sekretaris", "ketua", "wakil"].includes(user?.role);
  const canDelete = ["sekretaris", "ketua"].includes(user?.role);

  const load = async () => {
    const { data } = await api.get(`/documents?doc_type=${tab}`);
    setItems(data);
  };
  useEffect(() => { load(); }, [tab]);

  const save = async () => {
    try {
      await api.post("/documents", { ...form, doc_type: tab });
      toast.success("Dokumen tersimpan");
      setOpen(false); setForm({ ...emptyForm, doc_type: tab }); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };

  const remove = async (id) => {
    if (!confirm("Hapus dokumen?")) return;
    await api.delete(`/documents/${id}`); toast.success("Dihapus"); load();
  };

  return (
    <AppLayout activePath="/sekretariat">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Kesekretariatan"
          title="Surat, Notulen & Arsip"
          description="Kelola korespondensi resmi, notulen rapat, dan dokumen arsip UKM Permadu."
          action={canManage && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button data-testid="add-document-btn" onClick={() => setForm({ ...emptyForm, doc_type: tab })} className="rounded-full h-11 px-5 text-white" style={{ background: "var(--p-emerald)" }}>
                  <Plus size={16} className="mr-2" /> Dokumen Baru
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl bg-white">
                <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-emerald-deep)]">Dokumen Baru</DialogTitle></DialogHeader>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <Label>Judul</Label>
                    <Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} data-testid="doc-title-input"/>
                  </div>
                  <div>
                    <Label>Jenis</Label>
                    <Select value={form.doc_type} onValueChange={(v) => setForm({...form, doc_type: v})}>
                      <SelectTrigger><SelectValue/></SelectTrigger>
                      <SelectContent>
                        {TABS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Nomor</Label>
                    <Input value={form.number} onChange={(e) => setForm({...form, number: e.target.value})} />
                  </div>
                  <div>
                    <Label>Dari</Label>
                    <Input value={form.from_party} onChange={(e) => setForm({...form, from_party: e.target.value})} />
                  </div>
                  <div>
                    <Label>Kepada</Label>
                    <Input value={form.to_party} onChange={(e) => setForm({...form, to_party: e.target.value})} />
                  </div>
                  <div>
                    <Label>Tanggal</Label>
                    <Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <Label>Ringkasan</Label>
                    <Textarea rows={2} value={form.summary} onChange={(e) => setForm({...form, summary: e.target.value})} />
                  </div>
                  {(form.doc_type === "notulen") && (
                    <div className="col-span-2">
                      <Label>Isi Notulen</Label>
                      <Textarea rows={5} value={form.content} onChange={(e) => setForm({...form, content: e.target.value})} />
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                  <Button onClick={save} data-testid="save-document-btn" className="text-white" style={{ background: "var(--p-emerald)" }}>Simpan</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        />

        <div className="flex flex-wrap gap-2 mb-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.key} onClick={() => setTab(t.key)} data-testid={`tab-${t.key}`}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${tab===t.key ? "bg-[var(--p-emerald)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-emerald)]"}`}>
                <Icon size={15}/> {t.label}
              </button>
            );
          })}
        </div>

        <div className="data-card overflow-x-auto">
          <table className="perm-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Judul</th>
                <th>{tab==="surat_masuk"?"Dari":"Kepada / Dari"}</th>
                <th>Tanggal</th>
                {canDelete && <th></th>}
              </tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id}>
                  <td className="font-mono text-xs text-[var(--p-muted)] whitespace-nowrap">{d.number || "-"}</td>
                  <td>
                    <div className="font-semibold text-[var(--p-emerald-deep)]">{d.title}</div>
                    <div className="text-xs text-[var(--p-muted)] mt-0.5 line-clamp-2">{d.summary}</div>
                  </td>
                  <td className="text-sm">{tab==="surat_masuk" ? d.from_party : (d.to_party || d.from_party) || "-"}</td>
                  <td className="text-xs text-[var(--p-muted)] whitespace-nowrap">{d.date}</td>
                  {canDelete && <td><button onClick={() => remove(d.id)} className="text-[var(--p-terracotta)] hover:opacity-70"><Trash2 size={14}/></button></td>}
                </tr>
              ))}
              {items.length===0 && <tr><td colSpan={canDelete?5:4} className="text-center py-10 text-[var(--p-muted)]">Belum ada dokumen.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
