import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { roleLabel } from "@/lib/api";
import { toast } from "sonner";
import {
  LayoutDashboard, Users, FolderKanban, Wallet, FileText,
  CalendarDays, LogOut, Menu, X, UserCircle, Image as ImageIcon, Award, Folder
} from "lucide-react";

const NAV_BY_ROLE = {
  ketua: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/anggota", label: "Anggota & Pengurus", icon: Users },
    { to: "/program", label: "Program Kerja", icon: FolderKanban },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/keuangan", label: "Keuangan", icon: Wallet },
    { to: "/sekretariat", label: "Sekretariat", icon: FileText },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/rapor", label: "Rapor Kabid", icon: Award },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
  wakil: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/anggota", label: "Anggota & Pengurus", icon: Users },
    { to: "/program", label: "Monitoring Program", icon: FolderKanban },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/rapor", label: "Rapor Kabid", icon: Award },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
  sekretaris: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/sekretariat", label: "Surat & Dokumen", icon: FileText },
    { to: "/agenda", label: "Agenda & Notulen", icon: CalendarDays },
    { to: "/anggota", label: "Direktori Anggota", icon: Users },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
  bendahara: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/keuangan", label: "Kas & Laporan", icon: Wallet },
    { to: "/program", label: "Anggaran Program", icon: FolderKanban },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
  kabid: [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/program", label: "Program Bidang", icon: FolderKanban },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/anggota", label: "Anggota Bidang", icon: Users },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/rapor", label: "Rapor Saya", icon: Award },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
  anggota: [
    { to: "/", label: "Beranda", icon: LayoutDashboard },
    { to: "/program", label: "Program Aktif", icon: FolderKanban },
    { to: "/dokumen-bidang", label: "Dokumen Bidang", icon: Folder },
    { to: "/agenda", label: "Agenda", icon: CalendarDays },
    { to: "/galeri", label: "Galeri Kegiatan", icon: ImageIcon },
    { to: "/anggota", label: "Direktori", icon: Users },
    { to: "/profil", label: "Profil Saya", icon: UserCircle },
  ],
};

export default function AppLayout({ children, activePath }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [openMobile, setOpenMobile] = useState(false);

  const nav = NAV_BY_ROLE[user?.role] || NAV_BY_ROLE.anggota;

  const handleLogout = () => {
    logout();
    toast.success("Berhasil keluar");
    navigate("/login");
  };

  const initials = (user?.name || "?").split(" ").slice(0, 2).map((s) => s[0]).join("").toUpperCase();

  return (
    <div className="min-h-screen flex" style={{ background: "var(--p-cream)" }}>
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex sidebar-bg text-[var(--p-cream)] w-72 flex-col fixed inset-y-0 left-0 z-30">
        <div className="px-6 pt-8 pb-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <img src="/permadu-logo.png" alt="Permadu" className="w-14 h-14 rounded-full object-cover ring-2 ring-[var(--p-gold)]/40" style={{ background: "#fff", padding: 2 }}/>
            <div>
              <div className="font-display text-xl font-bold text-[var(--p-gold)] leading-tight">PERMADU</div>
              <div className="text-[9px] tracking-[0.2em] text-white/55 uppercase leading-tight">Perhimpunan Mahasiswa Hindu</div>
            </div>
          </div>
          <div className="mt-5 divider-ornament"><span className="text-[10px] tracking-widest">BERDIRI 27·01·2007</span></div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="px-3 text-[10px] tracking-[0.2em] text-white/40 uppercase mb-3">Navigasi</div>
          {nav.map((n) => {
            const Icon = n.icon;
            const active = activePath === n.to;
            return (
              <button
                key={n.to}
                data-testid={`sidebar-link-${n.to.replace("/", "") || "home"}`}
                onClick={() => navigate(n.to)}
                className={`sidebar-link w-full ${active ? "active" : ""}`}
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{n.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="px-4 py-5 border-t border-white/5">
          <button onClick={() => navigate("/profil")} className="w-full flex items-center gap-3 px-2 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-left">
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center font-semibold text-sm" style={{ background: "linear-gradient(135deg, var(--p-royal), var(--p-navy))", color: "var(--p-gold)" }}>
              {user?.avatar_url ? <img src={user.avatar_url} alt="" className="w-full h-full object-cover"/> : initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">{user?.name}</div>
              <div className="text-[11px] text-white/60 truncate">
                {roleLabel(user?.role)}{user?.bidang ? ` · ${user.bidang}` : ""}
              </div>
            </div>
          </button>
          <button
            data-testid="logout-btn"
            onClick={handleLogout}
            className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-full border border-white/10 hover:border-[var(--p-gold)] text-white/80 hover:text-[var(--p-gold)] text-sm font-semibold transition-all"
          >
            <LogOut size={16} /> Keluar
          </button>
        </div>
      </aside>

      {/* Mobile top-bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-40 sidebar-bg text-white flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <img src="/permadu-logo.png" alt="" className="w-9 h-9 rounded-full"/>
          <div className="font-display font-bold text-[var(--p-gold)]">Permadu</div>
        </div>
        <button data-testid="mobile-menu-btn" onClick={() => setOpenMobile(!openMobile)} className="p-2">
          {openMobile ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {openMobile && (
        <div className="lg:hidden fixed inset-0 z-30 top-14 sidebar-bg text-white px-4 pt-4 pb-8 overflow-y-auto">
          {nav.map((n) => {
            const Icon = n.icon;
            const active = activePath === n.to;
            return (
              <button
                key={n.to}
                onClick={() => { navigate(n.to); setOpenMobile(false); }}
                className={`sidebar-link w-full ${active ? "active" : ""}`}
              >
                <Icon size={18} /> <span>{n.label}</span>
              </button>
            );
          })}
          <button onClick={handleLogout} className="w-full mt-6 flex items-center justify-center gap-2 py-3 rounded-full border border-white/10 text-white/80 text-sm">
            <LogOut size={16} /> Keluar
          </button>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 lg:ml-72 min-h-screen">
        <div className="pt-16 lg:pt-0">{children}</div>
      </main>
    </div>
  );
}
