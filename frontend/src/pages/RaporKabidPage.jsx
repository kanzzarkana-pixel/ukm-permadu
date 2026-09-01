import { useEffect, useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api, idr } from "@/lib/api";
import { exportCSV } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Download, Award, TrendingUp, CheckCircle2, Clock, FileCheck, Users as UsersIcon, Camera, Wallet } from "lucide-react";

const StatBar = ({ label, value, max, tone = "royal" }) => {
  const pct = Math.round((value / (max || 1)) * 100);
  const colors = { royal: "var(--p-royal)", gold: "var(--p-gold)", crimson: "var(--p-crimson)" }[tone];
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-[var(--p-muted)]">{label}</span>
        <span className="font-semibold text-[var(--p-navy)]">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-[var(--p-bone)] overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: colors }}/>
      </div>
    </div>
  );
};

export default function RaporKabidPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);

  useEffect(() => {
    api.get("/reports/kabid").then((r) => setReports(r.data.reports || []));
  }, []);

  // Kabid hanya lihat rapor sendiri
  const visible = user?.role === "kabid" ? reports.filter((r) => r.bidang === user.bidang) : reports;

  const totals = visible.reduce((acc, r) => ({
    total: acc.total + r.total_program,
    selesai: acc.selesai + r.selesai,
    lpj: acc.lpj + r.lpj_count,
    budget: acc.budget + r.total_budget,
    members: acc.members + r.member_count,
  }), { total: 0, selesai: 0, lpj: 0, budget: 0, members: 0 });

  const overallPct = totals.total ? Math.round((totals.selesai / totals.total) * 100) : 0;
  const maxProgs = Math.max(1, ...visible.map((r) => r.total_program));

  const exportRapor = () => {
    const rows = visible.map((r) => ({
      Kabid: r.kabid_name, Bidang: r.bidang, Angkatan: r.angkatan || "",
      Total_Program: r.total_program, Berjalan: r.berjalan, Selesai: r.selesai,
      Diusulkan: r.diusulkan, Persen_Selesai: r.completion_percentage + "%",
      LPJ_Diunggah: r.lpj_count, Persen_LPJ: r.lpj_percentage + "%",
      Total_Anggaran: r.total_budget, Anggota_Bidang: r.member_count, Foto_Kegiatan: r.photo_count,
    }));
    exportCSV(`Rapor-Kabid-Permadu-${new Date().toISOString().slice(0,10)}.csv`, rows);
  };

  return (
    <AppLayout activePath="/rapor">
      <div className="p-6 md:p-10 max-w-7xl mx-auto">
        <PageHeader
          eyebrow="Kinerja Bidang"
          title={user?.role === "kabid" ? `Rapor Bidang ${user.bidang}` : "Rapor Kepala Bidang"}
          description="Rekap kinerja setiap Kabid Permadu — jumlah program, penyelesaian, kelengkapan LPJ, anggota bidang, & dokumentasi."
          action={
            <Button variant="outline" onClick={exportRapor} className="rounded-full h-11 px-4 border-[var(--p-gold)] text-[#8a6d15] hover:bg-[var(--p-gold)] hover:text-[var(--p-navy)]">
              <Download size={15} className="mr-2"/> Ekspor CSV
            </Button>
          }
        />

        {/* Ringkasan */}
        {user?.role !== "kabid" && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <div className="stat-card">
              <div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Total Program</div>
              <div className="mt-2 text-2xl md:text-3xl font-bold font-display text-[var(--p-navy)]">{totals.total}</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Program Selesai</div>
              <div className="mt-2 text-2xl md:text-3xl font-bold font-display text-[var(--p-royal)]">{totals.selesai}</div>
              <div className="text-xs text-[var(--p-muted)] mt-1">{overallPct}% penyelesaian</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">LPJ Diunggah</div>
              <div className="mt-2 text-2xl md:text-3xl font-bold font-display text-[#8a6d15]">{totals.lpj}</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Total Anggota</div>
              <div className="mt-2 text-2xl md:text-3xl font-bold font-display text-[var(--p-navy)]">{totals.members}</div>
            </div>
            <div className="stat-card">
              <div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)] font-semibold">Anggaran Kelola</div>
              <div className="mt-2 text-lg md:text-xl font-bold font-display text-[var(--p-royal)] leading-tight">{idr(totals.budget)}</div>
            </div>
          </div>
        )}

        {/* Rapor cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {visible.map((r) => {
            const initials = (r.kabid_name || "?").split(" ").slice(0,2).map(s=>s[0]).join("").toUpperCase();
            const grade = r.completion_percentage >= 75 ? "A" : r.completion_percentage >= 50 ? "B" : r.completion_percentage >= 25 ? "C" : "D";
            const gradeColor = { A: "var(--p-royal)", B: "var(--p-gold)", C: "#8a6d15", D: "var(--p-crimson)" }[grade];
            return (
              <div key={r.kabid_id} className="data-card p-6 fade-up" data-testid={`rapor-${r.bidang}`}>
                <div className="flex items-start gap-4 pb-4 border-b border-[var(--p-line)]">
                  <div className="avatar-ring w-16 h-16 flex-shrink-0">
                    {r.avatar_url ? <img src={r.avatar_url} alt="" className="w-full h-full object-cover"/> :
                      <div className="w-full h-full flex items-center justify-center font-display font-bold text-lg text-[var(--p-navy)]">{initials}</div>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-widest text-[var(--p-gold)] font-semibold">Kepala Bidang</div>
                    <h3 className="font-display font-bold text-lg text-[var(--p-navy)] leading-tight truncate">{r.kabid_name}</h3>
                    <div className="text-xs text-[var(--p-muted)] mt-0.5">{r.bidang}{r.angkatan ? ` · Angkatan ${r.angkatan}` : ""}</div>
                  </div>
                  <div className="text-center flex-shrink-0">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center font-display font-bold text-2xl text-white shadow-lg" style={{ background: gradeColor }}>{grade}</div>
                    <div className="text-[10px] text-[var(--p-muted)] mt-1 tracking-widest uppercase">Grade</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 mb-4">
                  <div className="flex items-center gap-2"><TrendingUp size={16} className="text-[var(--p-royal)]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Program</div><div className="font-bold text-[var(--p-navy)]">{r.total_program}</div></div></div>
                  <div className="flex items-center gap-2"><CheckCircle2 size={16} className="text-[var(--p-royal)]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Selesai</div><div className="font-bold text-[var(--p-navy)]">{r.selesai} · {r.completion_percentage}%</div></div></div>
                  <div className="flex items-center gap-2"><FileCheck size={16} className="text-[#8a6d15]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">LPJ</div><div className="font-bold text-[var(--p-navy)]">{r.lpj_count} · {r.lpj_percentage}%</div></div></div>
                  <div className="flex items-center gap-2"><UsersIcon size={16} className="text-[var(--p-navy)]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Anggota</div><div className="font-bold text-[var(--p-navy)]">{r.member_count}</div></div></div>
                  <div className="flex items-center gap-2"><Camera size={16} className="text-[var(--p-royal)]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Foto</div><div className="font-bold text-[var(--p-navy)]">{r.photo_count}</div></div></div>
                  <div className="flex items-center gap-2"><Wallet size={16} className="text-[#8a6d15]"/><div><div className="text-[10px] uppercase tracking-widest text-[var(--p-muted)]">Anggaran</div><div className="font-bold text-[var(--p-navy)] text-xs">{idr(r.total_budget)}</div></div></div>
                </div>

                <div className="space-y-3">
                  <StatBar label="Program Berjalan" value={r.berjalan} max={r.total_program || 1} tone="royal"/>
                  <StatBar label="Program Selesai" value={r.selesai} max={r.total_program || 1} tone="gold"/>
                  <StatBar label="Menunggu Approval" value={r.diusulkan + r.draft} max={r.total_program || 1} tone="crimson"/>
                </div>

                {user?.role !== "kabid" && (
                  <div className="mt-4 pt-4 border-t border-[var(--p-line)] flex items-center gap-2 text-xs text-[var(--p-muted)]">
                    <Clock size={12}/> Rekap otomatis berdasarkan data program & anggota bidang.
                  </div>
                )}
              </div>
            );
          })}
          {visible.length === 0 && <div className="col-span-full text-center py-16 text-[var(--p-muted)]"><Award className="mx-auto mb-3" size={40}/>Belum ada data rapor.</div>}
        </div>
      </div>
    </AppLayout>
  );
}
