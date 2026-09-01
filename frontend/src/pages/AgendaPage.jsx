import { useEffect, useMemo, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { exportCSV } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, MapPin, Clock, Users, Download, LayoutGrid, CalendarRange } from "lucide-react";

const emptyForm = { title: "", date: new Date().toISOString().slice(0,10), time: "", location: "", description: "", audience: "" };

const sameDay = (a, b) => a && b && a.getFullYear()===b.getFullYear() && a.getMonth()===b.getMonth() && a.getDate()===b.getDate();

export default function AgendaPage() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [view, setView] = useState("calendar"); // calendar | list
  const [selectedDate, setSelectedDate] = useState(new Date());

  const canManage = ["sekretaris", "ketua", "wakil", "kabid"].includes(user?.role);
  const canDelete = ["sekretaris", "ketua"].includes(user?.role);

  const load = async () => { const { data } = await api.get("/agenda"); setItems(data); };
  useEffect(() => { load(); }, []);

  const save = async () => {
    try {
      await api.post("/agenda", form);
      toast.success("Agenda tersimpan");
      setOpen(false); setForm(emptyForm); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Gagal menyimpan"); }
  };
  const remove = async (id) => {
    if (!confirm("Hapus agenda?")) return;
    await api.delete(`/agenda/${id}`); toast.success("Dihapus"); load();
  };
  const exportAgenda = () => {
    const rows = items.map((a) => ({
      Tanggal: a.date, Jam: a.time || "", Judul: a.title, Lokasi: a.location || "",
      Peserta: a.audience || "", Deskripsi: a.description || "",
    }));
    exportCSV(`Agenda-Permadu-${new Date().toISOString().slice(0,10)}.csv`, rows);
    toast.success("Daftar agenda terunduh");
  };

  // Events by date map
  const eventDates = useMemo(() => items.map((a) => new Date(a.date)), [items]);
  const selectedItems = useMemo(() => items.filter((a) => sameDay(new Date(a.date), selectedDate)), [items, selectedDate]);

  // Grouped by month for list view
  const grouped = items.reduce((acc, a) => {
    const key = new Date(a.date).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
    (acc[key] = acc[key] || []).push(a);
    return acc;
  }, {});

  return (
    <AppLayout activePath="/agenda">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Kalender Kegiatan"
          title="Agenda Permadu"
          description="Jadwal persembahyangan, rapat, latihan, & kegiatan besar UKM Permadu."
          action={
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={exportAgenda} data-testid="export-agenda-btn" className="rounded-full h-11 px-4 border-[var(--p-gold)] text-[#8a6d15] hover:bg-[var(--p-gold)] hover:text-[var(--p-navy)]">
                <Download size={15} className="mr-2"/> Ekspor CSV
              </Button>
              {canManage && (
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-agenda-btn" onClick={() => setForm({ ...emptyForm, date: selectedDate.toISOString().slice(0,10) })} className="rounded-full h-11 px-5 text-white btn-primary"><Plus size={16} className="mr-2"/> Agenda Baru</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg bg-white">
                    <DialogHeader><DialogTitle className="font-display text-2xl text-[var(--p-navy)]">Agenda Baru</DialogTitle></DialogHeader>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2"><Label>Judul</Label><Input value={form.title} onChange={(e) => setForm({...form, title: e.target.value})} data-testid="agenda-title-input"/></div>
                      <div><Label>Tanggal</Label><Input type="date" value={form.date} onChange={(e) => setForm({...form, date: e.target.value})}/></div>
                      <div><Label>Jam</Label><Input type="time" value={form.time} onChange={(e) => setForm({...form, time: e.target.value})}/></div>
                      <div className="col-span-2"><Label>Lokasi</Label><Input value={form.location} onChange={(e) => setForm({...form, location: e.target.value})}/></div>
                      <div className="col-span-2"><Label>Peserta</Label><Input value={form.audience} onChange={(e) => setForm({...form, audience: e.target.value})} placeholder="Contoh: Pengurus / Seluruh Anggota"/></div>
                      <div className="col-span-2"><Label>Deskripsi</Label><Textarea rows={3} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}/></div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
                      <Button onClick={save} data-testid="save-agenda-btn" className="text-white btn-primary">Simpan</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}
            </div>
          }
        />

        {/* View toggle */}
        <div className="flex items-center gap-2 mb-6">
          <button onClick={() => setView("calendar")} data-testid="view-calendar" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${view==="calendar" ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}><CalendarRange size={15}/> Kalender</button>
          <button onClick={() => setView("list")} data-testid="view-list" className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium ${view==="list" ? "bg-[var(--p-navy)] text-white" : "bg-white border border-[var(--p-line)] text-[var(--p-navy)]"}`}><LayoutGrid size={15}/> Daftar</button>
        </div>

        {view === "calendar" ? (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 data-card p-4 md:p-6">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                modifiers={{ hasEvent: eventDates }}
                modifiersClassNames={{ hasEvent: "relative font-bold text-[var(--p-royal)] after:content-[''] after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:rounded-full after:bg-[var(--p-gold)]" }}
                className="mx-auto"
                data-testid="agenda-calendar"
              />
            </div>
            <div className="lg:col-span-2 data-card p-6">
              <div className="text-[11px] font-semibold uppercase tracking-widest text-[var(--p-gold)] mb-1">
                {selectedDate.toLocaleDateString("id-ID", { weekday: "long" })}
              </div>
              <div className="font-display text-3xl font-bold text-[var(--p-navy)] mb-4">
                {selectedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
              </div>
              <div className="space-y-3">
                {selectedItems.length === 0 && <div className="text-sm text-[var(--p-muted)] italic">Tidak ada agenda pada tanggal ini.</div>}
                {selectedItems.map((a) => (
                  <div key={a.id} className="p-4 rounded-xl border border-[var(--p-line)] hover:border-[var(--p-royal)] transition-all">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-semibold text-[var(--p-navy)] leading-tight">{a.title}</div>
                        <div className="mt-2 space-y-1 text-xs text-[var(--p-muted)]">
                          {a.time && <div className="flex items-center gap-1.5"><Clock size={12}/> {a.time} WIB</div>}
                          {a.location && <div className="flex items-center gap-1.5"><MapPin size={12}/> {a.location}</div>}
                          {a.audience && <div className="flex items-center gap-1.5"><Users size={12}/> {a.audience}</div>}
                        </div>
                        {a.description && <p className="text-xs text-[var(--p-text)] mt-2">{a.description}</p>}
                      </div>
                      {canDelete && <button onClick={() => remove(a.id)} className="text-[var(--p-crimson)] hover:opacity-70"><Trash2 size={14}/></button>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([month, list]) => (
              <div key={month}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--p-gold)]">{month}</div>
                  <div className="flex-1 h-px bg-gradient-to-r from-[var(--p-gold)] to-transparent opacity-60"/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {list.map((a) => {
                    const d = new Date(a.date);
                    return (
                      <div key={a.id} className="data-card p-5 fade-up">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-16 text-center py-2 rounded-xl" style={{ background: "linear-gradient(180deg, var(--p-navy), var(--p-royal))", color: "var(--p-gold)" }}>
                            <div className="text-[10px] tracking-widest uppercase text-white/60">{d.toLocaleDateString("id-ID", { month: "short" })}</div>
                            <div className="font-display font-bold text-2xl leading-none mt-0.5">{d.getDate()}</div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-[var(--p-navy)] leading-tight">{a.title}</h4>
                            <div className="mt-2 space-y-1 text-xs text-[var(--p-muted)]">
                              {a.time && <div className="flex items-center gap-1.5"><Clock size={12}/> {a.time} WIB</div>}
                              {a.location && <div className="flex items-center gap-1.5"><MapPin size={12}/> {a.location}</div>}
                              {a.audience && <div className="flex items-center gap-1.5"><Users size={12}/> {a.audience}</div>}
                            </div>
                            {a.description && <p className="text-xs text-[var(--p-muted)] mt-2 line-clamp-2">{a.description}</p>}
                          </div>
                          {canDelete && <button onClick={() => remove(a.id)} className="text-[var(--p-crimson)] hover:opacity-70"><Trash2 size={14}/></button>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {items.length===0 && <div className="text-center py-16 text-[var(--p-muted)]">Belum ada agenda.</div>}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
