import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { api, roleLabel } from "@/lib/api";
import { resizeImage } from "@/lib/files";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Camera, Save, Mail, Landmark, KeyRound, ArrowRight } from "lucide-react";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: user?.name || "",
    nim: user?.nim || "",
    jurusan: user?.jurusan || "",
    angkatan: user?.angkatan || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    avatar_url: user?.avatar_url || "",
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const pickPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const dataUrl = await resizeImage(f, 480, 0.85);
      setForm((s) => ({ ...s, avatar_url: dataUrl }));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch("/profile/me", form);
      localStorage.setItem("permadu_user", JSON.stringify(data));
      if (refresh) await refresh();
      toast.success("Profil berhasil diperbarui");
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const initials = (form.name || "?").split(" ").slice(0,2).map(s=>s[0]).join("").toUpperCase();

  return (
    <AppLayout activePath="/profil">
      <div className="p-6 md:p-10 max-w-5xl mx-auto">
        <PageHeader eyebrow="Akun Saya" title="Profil Anggota" description="Perbarui data diri, foto profil, dan bio singkat Anda." />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="data-card p-6 fade-up">
            <div className="flex flex-col items-center text-center">
              <div className="avatar-ring w-32 h-32">
                {form.avatar_url ? (
                  <img src={form.avatar_url} alt="avatar" className="w-full h-full object-cover"/>
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-display font-bold text-3xl text-[var(--p-navy)]">{initials}</div>
                )}
              </div>
              <button onClick={() => fileRef.current?.click()} data-testid="pick-avatar-btn" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--p-royal)] hover:text-[var(--p-navy)]">
                <Camera size={16}/> Ganti Foto
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden"/>
              <div className="mt-6 w-full space-y-2 text-left">
                <div className="text-[10px] tracking-widest uppercase text-[var(--p-muted)]">Peran</div>
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--p-navy)]">
                  <Landmark size={14}/> {roleLabel(user?.role)}{user?.bidang ? ` · ${user.bidang}` : ""}
                </div>
                <div className="text-[10px] tracking-widest uppercase text-[var(--p-muted)] mt-3">Email</div>
                <div className="flex items-center gap-2 text-sm text-[var(--p-text)]"><Mail size={14}/> {user?.email}</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 data-card p-6 fade-up fade-up-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label>Nama Lengkap</Label>
                <Input value={form.name} onChange={(e) => setForm({...form, name: e.target.value})} data-testid="profile-name-input"/>
              </div>
              <div>
                <Label>NIM</Label>
                <Input value={form.nim} onChange={(e) => setForm({...form, nim: e.target.value})}/>
              </div>
              <div>
                <Label>Angkatan</Label>
                <Input value={form.angkatan} onChange={(e) => setForm({...form, angkatan: e.target.value})} placeholder="Contoh: 2022"/>
              </div>
              <div>
                <Label>Jurusan</Label>
                <Input value={form.jurusan} onChange={(e) => setForm({...form, jurusan: e.target.value})}/>
              </div>
              <div>
                <Label>No. HP / WhatsApp</Label>
                <Input value={form.phone} onChange={(e) => setForm({...form, phone: e.target.value})}/>
              </div>
              <div className="md:col-span-2">
                <Label>Bio Singkat</Label>
                <Textarea rows={3} value={form.bio} onChange={(e) => setForm({...form, bio: e.target.value})} placeholder="Ceritakan sedikit tentang diri Anda, hobi, atau kontribusi di Permadu…"/>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={save} disabled={saving} data-testid="save-profile-btn" className="rounded-full h-11 px-6 text-white btn-primary">
                <Save size={16} className="mr-2"/> {saving ? "Menyimpan…" : "Simpan Perubahan"}
              </Button>
            </div>
          </div>
        </div>

        {/* Keamanan Akun */}
        <div className="data-card p-6 mt-6 fade-up fade-up-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-[var(--p-navy)]/5 flex items-center justify-center shrink-0">
                <KeyRound size={18} className="text-[var(--p-royal)]" />
              </div>
              <div>
                <div className="font-display font-bold text-[var(--p-navy)]">Keamanan Akun</div>
                <p className="text-sm text-[var(--p-muted)] mt-0.5">Perbarui kata sandi Anda secara berkala untuk menjaga keamanan akun.</p>
              </div>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate("/ganti-sandi")}
              data-testid="go-to-change-password-btn"
              className="rounded-full h-11 px-6 border-[var(--p-line)] shrink-0"
            >
              Ganti Password <ArrowRight size={16} className="ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}