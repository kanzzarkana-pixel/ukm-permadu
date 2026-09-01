import { useEffect, useRef, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { api, idr } from "@/lib/api";
import { resizeImage, exportCSV } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, TrendingUp, TrendingDown, Wallet, PieChart, Camera, Download, Image as ImageIcon, Printer } from "lucide-react";

const CATEGORIES = ["Iuran Anggota", "Bantuan Kampus", "Sponsorship", "Donasi Alumni", "Persembahyangan", "Konsumsi", "Parade Nyepi", "Kesekretariatan", "Media & Publikasi", "Lainnya"];
const emptyForm = { type: "masuk", amount: 0, category: "Iuran Anggota", description: "", date: new Date().toISOString().slice(0,10), reference: "" };
const emptyJournal = { image_url: "", caption: "", date: new Date().toISOString().slice(0,10) };

export default function KeuanganPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({ kas_masuk: 0, kas_keluar: 0, saldo: 0, total_transaksi: 0 });
  const [journal, setJournal] = useState([]);
  const [tab, setTab] = useState("semua");
  const [open, setOpen] = useState(false);
  const [openJ, setOpenJ] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [jForm, setJForm] = useState(emptyJournal);
  const jFileRef = useRef(null);

  const canManage = ["bendahara", "ketua"].includes(user?.role);

  const load = async () => {
    const [a, b, j] = await Promise.all([api.get("/finances"), api.get("/finances/summary"), api.get("/finance-journal")]);
    setItems(a.data); setSummary(b.data); setJournal(j.data);
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/finances", { ...form, amount: Number(form.amount) });
      toast.success("Transaksi disimpan");
      setOpen(false); setForm(emptyForm); setTab("semua"); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const remove = async (id) => {
    if (!confirm("Hapus transaksi?")) return;
    await api.delete(`/finances/${id}`); toast.success("Dihapus"); load();
  };
  const pickJournalImg = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const url = await resizeImage(f, 900, 0.82);
      setJForm((s) => ({ ...s, image_url: url }));
    } catch (err) { toast.error(err.message); }
  };
  const saveJournal = async () => {
    if (!jForm.image_url) { toast.error("Silakan pilih foto"); return; }
    try {
      await api.post("/finance-journal", jForm);
      toast.success("Foto tersimpan");
      setOpenJ(false); setJForm(emptyJournal); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const removeJournal = async (id) => {
    if (!confirm("Hapus foto?")) return;
    await api.delete(`/finance-journal/${id}`); toast.success("Dihapus"); load();
  };
  const exportLaporan = () => {
    const rows = items.map((f) => ({
      Tanggal: f.date, Jenis: f.type, Kategori: f.category, Deskripsi: f.description,
      Referensi: f.reference || "", Nominal: f.amount, Pencatat: f.recorded_by,
    }));
    exportCSV(`Laporan-Kas-Permadu-${new Date().toISOString().slice(0,10)}.csv`, rows);
    toast.success("Laporan kas terunduh");
  };

  const printPDF = () => {
    const now = new Date();
    const monthYear = now.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    const rowsHTML = [...items].sort((a,b) => a.date.localeCompare(b.date)).map((f, i) => `
      <tr>
        <td class="c">${i+1}</td>
        <td>${f.date}</td>
        <td>${f.category}</td>
        <td>${f.description || ""}</td>
        <td class="c">${f.reference || "-"}</td>
        <td class="r ${f.type==="masuk"?"g":""}">${f.type==="masuk" ? new Intl.NumberFormat("id-ID").format(f.amount) : "-"}</td>
        <td class="r ${f.type==="keluar"?"r-c":""}">${f.type==="keluar" ? new Intl.NumberFormat("id-ID").format(f.amount) : "-"}</td>
      </tr>
    `).join("");
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Laporan Kas Permadu ${monthYear}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #0F1E3D; margin: 0; }
  .hdr { display: flex; align-items: center; gap: 18px; border-bottom: 3px double #0F1E3D; padding-bottom: 14px; margin-bottom: 20px; }
  .hdr img { width: 84px; height: 84px; }
  .hdr h1 { margin: 0; font-size: 20px; letter-spacing: 1px; }
  .hdr h2 { margin: 2px 0 0; font-size: 14px; color: #4A5A75; font-weight: normal; letter-spacing: 0.5px; }
  .hdr .k { font-size: 11px; color: #4A5A75; margin-top: 4px; }
  .title { text-align:center; font-size: 18px; font-weight: bold; margin: 14px 0 4px; text-transform: uppercase; letter-spacing: 2px; }
  .subtitle { text-align:center; font-size: 12px; color: #4A5A75; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th { background: #0F1E3D; color: #fff; text-align: left; padding: 8px; font-size: 10px; letter-spacing: 0.5px; text-transform: uppercase; }
  td { border: 1px solid #D6DFEC; padding: 7px 8px; }
  .c { text-align: center; }
  .r { text-align: right; font-variant-numeric: tabular-nums; }
  .g { color: #14532D; font-weight: bold; }
  .r-c { color: #B91C1C; font-weight: bold; }
  .totals { margin-top: 14px; display: flex; justify-content: flex-end; }
  .totals table { width: 60%; }
  .totals td { border: none; padding: 4px 8px; }
  .totals .lbl { color: #4A5A75; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
  .totals .val { text-align: right; font-weight: bold; font-size: 13px; }
  .totals .saldo { border-top: 2px solid #0F1E3D; padding-top: 8px !important; }
  .sign { display:flex; justify-content: space-between; margin-top: 60px; font-size: 11px; }
  .sign > div { text-align: center; width: 30%; }
  .sign .line { margin-top: 60px; border-top: 1px solid #0F1E3D; padding-top: 4px; font-weight: bold; }
  .foot { margin-top: 40px; font-size: 10px; color: #4A5A75; text-align: center; border-top: 1px solid #D6DFEC; padding-top: 8px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head>
<body>
  <div class="hdr">
    <img src="${window.location.origin}/permadu-logo.png"/>
    <div>
      <h1>UKM PERMADU DARMAJAYA</h1>
      <h2>Persatuan Mahasiswa Hindu Darma · Institut Informatika & Bisnis Darmajaya</h2>
      <div class="k">Sekretariat: Kampus IIB Darmajaya, Bandar Lampung · permadu@darmajaya.ac.id</div>
    </div>
  </div>
  <div class="title">Laporan Keuangan Kas</div>
  <div class="subtitle">Periode: seluruh transaksi tercatat hingga ${now.toLocaleDateString("id-ID", { day:"numeric", month:"long", year:"numeric" })}</div>
  <table>
    <thead><tr>
      <th style="width:28px">#</th>
      <th style="width:70px">Tanggal</th>
      <th style="width:130px">Kategori</th>
      <th>Deskripsi</th>
      <th style="width:75px">Ref</th>
      <th style="width:90px">Kas Masuk (Rp)</th>
      <th style="width:90px">Kas Keluar (Rp)</th>
    </tr></thead>
    <tbody>${rowsHTML}</tbody>
  </table>
  <div class="totals">
    <table>
      <tr><td class="lbl">Total Kas Masuk</td><td class="val g">Rp ${new Intl.NumberFormat("id-ID").format(summary.kas_masuk)}</td></tr>
      <tr><td class="lbl">Total Kas Keluar</td><td class="val r-c">Rp ${new Intl.NumberFormat("id-ID").format(summary.kas_keluar)}</td></tr>
      <tr><td class="lbl saldo">Saldo Akhir</td><td class="val saldo">Rp ${new Intl.NumberFormat("id-ID").format(summary.saldo)}</td></tr>
    </table>
  </div>
  <div class="sign">
    <div><div>Mengetahui,</div><div class="line">Ketua Umum UKM Permadu</div></div>
    <div><div>Menyusun,</div><div class="line">Bendahara UKM Permadu</div></div>
    <div><div>Mengesahkan,</div><div class="line">Pembina UKM Permadu</div></div>
  </div>
  <div class="foot">Dokumen ini dicetak secara otomatis melalui Portal Permadu Darmajaya pada ${now.toLocaleString("id-ID")}</div>
  <script>window.onload = () => { window.print(); }</script>
</body></html>`;
    const win = window.open("", "_blank");
    if (!win) { toast.error("Popup diblokir browser. Izinkan popup untuk mencetak."); return; }
    win.document.write(html);
    win.document.close();
    toast.success("Membuka pratinjau cetak…");
  };

  const filtered = tab === "semua" ? items : items.filter((i) => i.type === tab);
  const catAgg = filtered.reduce((acc, i) => { acc[i.category] = (acc[i.category] || 0) + i.amount; return acc; }, {});
  const catList = Object.entries(catAgg).sort((a,b) => b[1]-a[1]).slice(0, 6);
  const totalPie = catList.reduce((s, [,v]) => s+v, 0) || 1;

  return (
    <AppLayout activePath="/keuangan">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Kas & Laporan"
          title="Manajemen Keuangan"
          description="Catat pemasukan & pengeluaran, unggah dokumentasi foto kegiatan, dan ekspor laporan resmi."
          action={
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={printPDF} data-testid="print-finance-btn" className="rounded-full h-11 px-4 border-[var(--p-navy)] text-[var(--p-navy)] hover:bg-[var(--p-navy)] hover:text-white">
                <Printer size={15} className="mr-2"/> Cetak PDF
              </Button>
              <Button variant="outline" onClick={exportLaporan} data-testid="export-finance-btn" className="rounded-full h-11 px-4 border-[var(--p-gold)] text-[#8a6d15] hover:bg-[var(--p-gold)] hover:text-[var(--p-navy)]">
                <Download size={15} className="mr-2"/> Ekspor CSV
              </Button>
              {canManage && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-finance-btn" onClick={() => setForm(emptyForm)} className="rounded-full h-11 px-5 text-white btn-primary"><Plus size={16} className="mr-2"/> Transaksi Baru</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg bg-white">
                    <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">Catat Transaksi</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Jenis</Label>
                        <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent><SelectItem value="masuk">Kas Masuk</SelectItem><SelectItem value="keluar">Kas Keluar</SelectItem></SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Kategori</Label>
                        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                          <SelectTrigger><SelectValue/></SelectTrigger>
                          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div><Label>Nominal (Rp)</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="finance-amount-input"/></div>
                      <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}/></div>
                      <div className="col-span-2"><Label>Referensi</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="No. bukti"/></div>
                      <div className="col-span-2"><Label>Deskripsi</Label><Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}/></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                      <Button onClick={save} data-testid="save-finance-btn" className="text-white btn-primary">Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          }
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
          <StatCard icon={TrendingUp} label="Kas Masuk" value={idr(summary.kas_masuk)} tone="royal" delay={0}/>
          <StatCard icon={TrendingDown} label="Kas Keluar" value={idr(summary.kas_keluar)} tone="crimson" delay={0.08}/>
          <StatCard icon={Wallet} label="Saldo Kas" value={idr(summary.saldo)} tone="gold" delay={0.16}/>
          <StatCard icon={PieChart} label="Total Transaksi" value={summary.total_transaksi} tone="muted" delay={0.24}/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 data-card">
            <div className="px-5 py-4 border-b border-[var(--p-line)] flex flex-wrap items-center justify-between gap-3">
              <h3 className="section-title-accent font-bold text-[var(--p-navy)]">Riwayat Transaksi</h3>
              <div className="flex gap-2">
                {["semua", "masuk", "keluar"].map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest ${tab===t ? "bg-[var(--p-navy)] text-white" : "bg-[var(--p-bone)] text-[var(--p-navy)]"}`}>{t}</button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="perm-table">
                <thead><tr><th>Tanggal</th><th>Kategori</th><th>Deskripsi</th><th className="text-right">Nominal</th>{canManage && <th></th>}</tr></thead>
                <tbody>
                  {filtered.map((f) => (
                    <tr key={f.id}>
                      <td className="whitespace-nowrap text-xs text-[var(--p-muted)]">{f.date}</td>
                      <td><span className={f.type==="masuk"?"chip chip-royal":"chip chip-crimson"}>{f.category}</span></td>
                      <td className="text-xs">{f.description}</td>
                      <td className={`text-right font-semibold whitespace-nowrap ${f.type==="masuk" ? "text-[var(--p-royal)]" : "text-[var(--p-crimson)]"}`}>
                        {f.type==="masuk" ? "+" : "−"} {idr(f.amount)}
                      </td>
                      {canManage && <td><button onClick={() => remove(f.id)} className="text-[var(--p-crimson)] hover:opacity-70"><Trash2 size={14}/></button></td>}
                    </tr>
                  ))}
                  {filtered.length===0 && <tr><td colSpan={canManage?5:4} className="text-center text-[var(--p-muted)] py-8">Belum ada transaksi.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>

          <div className="data-card p-6">
            <h3 className="section-title-accent font-bold text-[var(--p-navy)] mb-4">Alokasi per Kategori</h3>
            <div className="space-y-4">
              {catList.map(([name, val]) => (
                <div key={name}>
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="text-[var(--p-text)]">{name}</span>
                    <span className="font-semibold text-[var(--p-royal)]">{idr(val)}</span>
                  </div>
                  <div className="h-2 rounded-full bg-[var(--p-bone)] overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${(val/totalPie)*100}%`, background: "linear-gradient(90deg, var(--p-navy), var(--p-gold))" }}/>
                  </div>
                </div>
              ))}
              {catList.length===0 && <div className="text-sm text-[var(--p-muted)]">Belum ada data.</div>}
            </div>
          </div>
        </div>

        {/* Bendahara Photo Journal */}
        <div className="data-card">
          <div className="px-6 py-5 border-b border-[var(--p-line)] flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="section-title-accent font-bold text-[var(--p-navy)]">Jurnal Foto Kegiatan</h3>
              <p className="text-xs text-[var(--p-muted)] mt-1 ml-4">Dokumentasi foto bukti belanja, kegiatan, atau kejadian penting.</p>
            </div>
            {canManage && (
              <Dialog open={openJ} onOpenChange={setOpenJ}>
                <DialogTrigger asChild>
                  <Button data-testid="add-journal-btn" onClick={() => setJForm(emptyJournal)} className="rounded-full h-10 text-white btn-primary"><Camera size={15} className="mr-2"/> Unggah Foto</Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg bg-white">
                  <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">Unggah Foto Jurnal</DialogTitle></DialogHeader>
                  <div className="space-y-4">
                    <div onClick={() => jFileRef.current?.click()} className="upload-zone">
                      {jForm.image_url ? (
                        <img src={jForm.image_url} alt="preview" className="max-h-56 mx-auto rounded-lg"/>
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-[var(--p-muted)]">
                          <ImageIcon size={32}/>
                          <div className="text-sm font-semibold">Klik untuk pilih foto</div>
                          <div className="text-xs">JPG / PNG, otomatis dikompres</div>
                        </div>
                      )}
                    </div>
                    <input ref={jFileRef} type="file" accept="image/*" onChange={pickJournalImg} className="hidden"/>
                    <div><Label>Tanggal</Label><Input type="date" value={jForm.date} onChange={(e) => setJForm({...jForm, date: e.target.value})}/></div>
                    <div><Label>Keterangan</Label><Textarea rows={3} value={jForm.caption} onChange={(e) => setJForm({...jForm, caption: e.target.value})} placeholder="Contoh: Bukti belanja konsumsi rapat awal tahun."/></div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setOpenJ(false)}>Batal</Button>
                    <Button onClick={saveJournal} data-testid="save-journal-btn" className="text-white btn-primary">Simpan</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {journal.map((j) => (
              <div key={j.id} className="group relative rounded-xl overflow-hidden border border-[var(--p-line)] hover:shadow-lg transition-all">
                <img src={j.image_url} alt={j.caption} className="w-full h-40 object-cover"/>
                <div className="p-3">
                  <div className="text-[10px] tracking-widest uppercase text-[var(--p-gold)] font-semibold">{j.date}</div>
                  <div className="text-xs text-[var(--p-navy)] mt-1 line-clamp-2">{j.caption}</div>
                  <div className="text-[10px] text-[var(--p-muted)] mt-1">— {j.uploaded_by}</div>
                </div>
                {canManage && <button onClick={() => removeJournal(j.id)} className="absolute top-2 right-2 bg-white/95 backdrop-blur rounded-full p-1.5 text-[var(--p-crimson)] opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={13}/></button>}
              </div>
            ))}
            {journal.length===0 && <div className="col-span-full text-center py-10 text-[var(--p-muted)] text-sm">Belum ada foto jurnal.</div>}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
