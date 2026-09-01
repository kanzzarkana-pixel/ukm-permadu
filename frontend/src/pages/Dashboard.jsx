import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import StatCard from "@/components/StatCard";
import { useAuth } from "@/context/AuthContext";
import { api, idr, roleLabel, statusStyle } from "@/lib/api";
import { Users, FolderKanban, Wallet, FileText, CalendarDays, TrendingUp, TrendingDown, Sparkles, ArrowRight, Flame, Image as ImageIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [agenda, setAgenda] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [photos, setPhotos] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get("/dashboard/overview"),
      api.get("/programs"),
      api.get("/agenda"),
      api.get("/reminders/sembahyang"),
      api.get("/activity-photos"),
    ])
      .then(([a, b, c, d, e]) => {
        setOverview(a.data); setPrograms(b.data); setAgenda(c.data);
        setReminders(d.data); setPhotos(e.data);
      })
      .catch(() => {});
  }, []);

  if (!overview) {
    return <AppLayout activePath="/"><div className="p-10 text-[var(--p-muted)]">Memuat data…</div></AppLayout>;
  }

  const roleGreeting = {
    ketua: "Pantau kinerja seluruh organisasi & setujui program strategis.",
    wakil: "Awasi kegiatan bidang & bantu koordinasi antar pengurus.",
    sekretaris: "Kelola surat, notulen, agenda, dan arsip dokumen Permadu.",
    bendahara: "Catat kas, kelola anggaran, dan pantau kesehatan keuangan.",
    kabid: `Kelola program kerja & anggota bidang ${user?.bidang || ""}.`,
    anggota: "Lihat program aktif, jadwal kegiatan, dan info organisasi.",
  }[user?.role] || "";

  const bidangEntries = Object.entries(overview.program_by_bidang || {});
  const bidangMax = Math.max(1, ...bidangEntries.map(([, v]) => v));

  const myPrograms = user?.role === "kabid"
    ? programs.filter((p) => p.bidang === user.bidang)
    : programs.slice(0, 5);

  const firstName = (user?.name || "").split(" ").slice(0, 2).join(" ");

  return (
    <AppLayout activePath="/">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        {/* HERO BAND with logo watermark */}
        <div className="hero-band px-8 py-10 md:px-12 md:py-12 mb-10 fade-up">
          <div className="relative z-10 max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] tracking-[0.24em] uppercase text-[var(--p-gold)] font-semibold mb-3">
              <Sparkles size={13}/> Halo, {roleLabel(user?.role)}{user?.bidang ? ` · ${user.bidang}` : ""}
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold text-white leading-tight">
              Om Swastyastu, <span className="italic text-[var(--p-gold)]">{firstName}</span>
            </h1>
            <p className="mt-4 text-white/75 text-sm md:text-base max-w-xl leading-relaxed">{roleGreeting}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => navigate("/profil")} data-testid="hero-profile-btn" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[var(--p-gold)] text-[var(--p-navy)] font-semibold text-sm hover:brightness-110 transition-all">
                Kelola Profil Saya <ArrowRight size={15}/>
              </button>
              <button onClick={() => navigate("/agenda")} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/20 text-white font-semibold text-sm hover:bg-white/10 transition-all">
                Lihat Agenda
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          <StatCard icon={Users} label="Total Anggota" value={overview.total_anggota} tone="navy" delay={0} testid="stat-anggota"/>
          <StatCard icon={FolderKanban} label="Program Kerja" value={overview.total_program} sub={`${overview.program_berjalan} berjalan · ${overview.program_menunggu} menunggu`} tone="royal" delay={0.08} testid="stat-program"/>
          <StatCard icon={Wallet} label="Saldo Kas" value={idr(overview.saldo_kas)} sub={`Masuk ${idr(overview.kas_masuk)}`} tone="gold" delay={0.16} testid="stat-saldo"/>
          <StatCard icon={FileText} label="Dokumen & Agenda" value={`${overview.total_dokumen} / ${overview.total_agenda}`} sub="Surat/Notulen · Jadwal" tone="crimson" delay={0.24} testid="stat-doc"/>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 data-card fade-up fade-up-2">
            <div className="px-6 py-5 border-b border-[var(--p-line)] flex items-center justify-between">
              <h3 className="section-title-accent text-lg font-bold text-[var(--p-navy)]">
                {user?.role === "kabid" ? `Program Bidang ${user.bidang}` : "Program Terbaru"}
              </h3>
              <span className="chip chip-gold">{myPrograms.length} program</span>
            </div>
            <div className="divide-y divide-[var(--p-line)]">
              {myPrograms.length === 0 && <div className="p-8 text-center text-[var(--p-muted)] text-sm">Belum ada program.</div>}
              {myPrograms.map((p) => (
                <div key={p.id} className="px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--p-navy)]">{p.name}</div>
                    <div className="text-xs text-[var(--p-muted)] mt-0.5">{p.bidang} · PIC {p.pic || "-"}</div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="text-right">
                      <div className="text-xs text-[var(--p-muted)]">Anggaran</div>
                      <div className="text-sm font-semibold text-[var(--p-royal)]">{idr(p.budget)}</div>
                    </div>
                    <span className={statusStyle(p.status)}>{p.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            <div className="data-card fade-up fade-up-3 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Wallet size={18} className="text-[var(--p-royal)]" />
                <h4 className="font-bold text-[var(--p-navy)]">Ringkasan Kas</h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-[var(--p-muted)]"><TrendingUp size={16} className="text-[var(--p-royal)]"/> Kas Masuk</span>
                  <span className="font-semibold text-[var(--p-royal)]">{idr(overview.kas_masuk)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm text-[var(--p-muted)]"><TrendingDown size={16} className="text-[var(--p-crimson)]"/> Kas Keluar</span>
                  <span className="font-semibold text-[var(--p-crimson)]">{idr(overview.kas_keluar)}</span>
                </div>
                <div className="pt-3 border-t border-[var(--p-line)] flex items-center justify-between">
                  <span className="text-sm font-semibold text-[var(--p-navy)]">Saldo Bersih</span>
                  <span className="font-display font-bold text-xl text-[var(--p-navy)]">{idr(overview.saldo_kas)}</span>
                </div>
              </div>
            </div>

            <div className="data-card fade-up fade-up-4 p-6">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles size={18} className="text-[var(--p-gold)]" />
                <h4 className="font-bold text-[var(--p-navy)]">Program per Bidang</h4>
              </div>
              <div className="space-y-3">
                {bidangEntries.length === 0 && <div className="text-sm text-[var(--p-muted)]">Belum ada data.</div>}
                {bidangEntries.map(([name, count]) => (
                  <div key={name}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span className="text-[var(--p-text)]">{name}</span>
                      <span className="font-semibold text-[var(--p-royal)]">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--p-bone)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${(count / bidangMax) * 100}%`, background: "linear-gradient(90deg, var(--p-navy), var(--p-gold))" }}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming agenda */}
        <div className="mt-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pengingat Sembahyang */}
          <div className="data-card fade-up overflow-hidden lg:col-span-1" style={{ background: "linear-gradient(160deg, #0F1E3D 0%, #04070F 100%)" }}>
            <div className="p-6 relative">
              <div className="absolute -right-8 -top-8 w-32 h-32 opacity-10">
                <img src="/permadu-logo.png" alt="" className="w-full h-full"/>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-[var(--p-gold)]">
                <Flame size={13}/> Pengingat Sembahyang
              </div>
              <h3 className="mt-2 font-display text-2xl font-bold text-white leading-tight">Om Namah Shivaya</h3>
              <p className="mt-1 text-xs text-white/60">Jadwal ibadah & hari suci mendatang.</p>
              <div className="mt-5 space-y-3">
                {reminders.length === 0 && <div className="text-sm text-white/50 italic">Tidak ada jadwal sembahyang mendatang.</div>}
                {reminders.slice(0, 4).map((r) => {
                  const d = new Date(r.date);
                  const days = Math.max(0, Math.ceil((d - new Date()) / 86400000));
                  return (
                    <div key={r.id} className="flex items-start gap-3 pb-3 border-b border-white/5 last:border-b-0">
                      <div className="flex-shrink-0 w-14 text-center py-1.5 rounded-lg" style={{ background: "rgba(240, 180, 41, 0.15)", color: "var(--p-gold)" }}>
                        <div className="text-[9px] tracking-widest uppercase font-semibold">{d.toLocaleDateString("id-ID", { month: "short" })}</div>
                        <div className="font-display font-bold text-lg leading-none">{d.getDate()}</div>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-semibold text-white leading-tight">{r.title}</div>
                        <div className="text-[11px] text-white/60 mt-0.5">{r.time || "-"} · {r.location || "Pura Kampus"}</div>
                        <div className="text-[10px] text-[var(--p-gold)] mt-1 font-semibold">{days === 0 ? "Hari ini" : `${days} hari lagi`}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button onClick={() => navigate("/agenda")} className="mt-4 text-xs font-semibold text-[var(--p-gold)] hover:text-white flex items-center gap-1 transition-all">
                Lihat semua agenda <ArrowRight size={12}/>
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 data-card">
            <div className="px-6 py-5 border-b border-[var(--p-line)] flex items-center justify-between">
              <h3 className="section-title-accent text-lg font-bold text-[var(--p-navy)]">Agenda Terdekat</h3>
              <CalendarDays size={18} className="text-[var(--p-muted)]"/>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
              {agenda.slice(0, 6).map((a) => (
                <div key={a.id} className="p-4 rounded-xl border border-[var(--p-line)] hover:border-[var(--p-royal)] transition-all">
                  <div className="text-xs font-semibold text-[var(--p-gold)] tracking-widest uppercase">{a.date}{a.time ? ` · ${a.time}` : ""}</div>
                  <div className="mt-1 font-semibold text-[var(--p-navy)]">{a.title}</div>
                  <div className="text-xs text-[var(--p-muted)] mt-1">{a.location}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Timeline Foto Kegiatan */}
        <div className="mt-10 data-card fade-up">
          <div className="px-6 py-5 border-b border-[var(--p-line)] flex items-center justify-between">
            <h3 className="section-title-accent text-lg font-bold text-[var(--p-navy)]">Timeline Foto Kegiatan</h3>
            <button onClick={() => navigate("/galeri")} className="text-xs font-semibold text-[var(--p-royal)] hover:text-[var(--p-navy)] flex items-center gap-1 transition-all">
              Buka Galeri <ArrowRight size={12}/>
            </button>
          </div>
          <div className="p-6">
            {photos.length === 0 ? (
              <div className="text-center py-8 text-[var(--p-muted)]">
                <ImageIcon className="mx-auto mb-2" size={28}/>
                <div className="text-sm">Belum ada foto kegiatan.</div>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                {photos.slice(0, 6).map((p) => (
                  <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden">
                    <img src={p.image_url} alt={p.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-3">
                      <div className="text-[9px] tracking-widest uppercase text-[var(--p-gold)] font-semibold">{p.date}</div>
                      <div className="text-xs text-white line-clamp-2 mt-1">{p.caption}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
