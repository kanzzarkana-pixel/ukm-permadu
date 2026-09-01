import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, Sparkles } from "lucide-react";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    nim: "",
    jurusan: "",
    angkatan: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    setLoading(true);
    const { ok, error: err, autoLogin, message } = await register({
      name: form.name,
      email: form.email.trim().toLowerCase(),
      nim: form.nim,
      jurusan: form.jurusan,
      angkatan: form.angkatan,
      phone: form.phone,
      password: form.password,
    });
    setLoading(false);

    if (!ok) {
      setError(err);
      return;
    }

    toast.success(message || "Registrasi berhasil!");
    navigate(autoLogin ? "/" : "/login", { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--p-cream)" }}>
      {/* Left Hero — sama seperti Login */}
      <div className="lg:w-1/2 relative overflow-hidden text-white grain-overlay"
           style={{ background: "linear-gradient(160deg, #04070F 0%, #0A1628 45%, #0F1E3D 85%, #1E40AF 130%)" }}>
        <div className="absolute inset-0 dot-pattern-dark opacity-70"/>
        <div className="login-ornament" style={{ width: 520, height: 520, top: -200, right: -200 }} />
        <div className="login-ornament" style={{ width: 340, height: 340, bottom: -140, left: -100 }} />
        <div className="login-ornament" style={{ width: 220, height: 220, top: "42%", right: 60, borderStyle: "dashed" }} />

        <div className="relative z-10 h-full flex flex-col justify-between p-10 md:p-16 min-h-[560px]">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-white p-1.5 shadow-2xl ring-4 ring-[var(--p-gold)]/40">
              <img src="/permadu-logo.png" alt="Logo UKM Permadu Darmajaya" className="w-full h-full rounded-full object-cover"/>
            </div>
            <div>
              <div className="font-display text-3xl font-bold text-[var(--p-gold)] leading-tight tracking-wide">PERMADU</div>
              <div className="text-[10px] tracking-[0.24em] uppercase text-white/60 mt-1">Perhimpunan Mahasiswa Hindu</div>
              <div className="text-[10px] tracking-[0.24em] uppercase text-white/40 mt-0.5">Institut Informatika &amp; Bisnis Darmajaya</div>
            </div>
          </div>

          <div className="my-10">
            <div className="text-[11px] tracking-[0.24em] uppercase text-[var(--p-gold)] font-semibold mb-3">
              Bergabung Bersama Kami
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight text-white">
              Satu <span className="italic text-[var(--p-gold)]">Langkah</span><br/>
              Menuju <span className="italic text-[var(--p-gold)]">Kebersamaan</span>
            </h1>
            <p className="mt-5 text-white/70 max-w-md leading-relaxed">
              Daftarkan diri Anda untuk mengakses Portal Manajemen Organisasi <b className="text-white">Perhimpunan Mahasiswa Hindu</b> Institut Informatika &amp; Bisnis Darmajaya.
            </p>
          </div>

          <div className="divider-ornament max-w-xs"><Sparkles size={14}/></div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-center max-w-md">
            <div>
              <div className="font-display text-2xl font-bold text-[var(--p-gold)]">6</div>
              <div className="text-[10px] tracking-widest uppercase text-white/50">Bidang</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[var(--p-gold)]">2007</div>
              <div className="text-[10px] tracking-widest uppercase text-white/50">Berdiri</div>
            </div>
            <div>
              <div className="font-display text-2xl font-bold text-[var(--p-gold)]">IKA</div>
              <div className="text-[10px] tracking-widest uppercase text-white/50">Solid</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Form */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 md:p-12 relative">
        <div className="absolute inset-0 dot-pattern opacity-40 pointer-events-none"/>
        <div className="w-full max-w-md relative">
          <div className="mb-8 text-center lg:text-left">
            <div className="text-[11px] tracking-[0.22em] uppercase text-[var(--p-royal)] font-semibold mb-2">Buat Akun</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--p-navy)]">Daftar Anggota Baru</h2>
            <p className="mt-2 text-[var(--p-muted)] text-sm">Lengkapi data di bawah untuk membuat akun.</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4" data-testid="register-form">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="name" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Nama Lengkap</Label>
                <Input id="name" name="name" required value={form.name} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="email" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Email Kampus</Label>
                <Input id="email" name="email" type="email" required placeholder="nama@permadu.darmajaya.ac.id"
                  value={form.email} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="nim" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">NIM</Label>
                <Input id="nim" name="nim" required value={form.nim} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="angkatan" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Angkatan</Label>
                <Input id="angkatan" name="angkatan" required placeholder="Contoh: 2024" value={form.angkatan} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="jurusan" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Jurusan</Label>
                <Input id="jurusan" name="jurusan" required value={form.jurusan} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="phone" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">No. HP</Label>
                <Input id="phone" name="phone" required value={form.phone} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="password" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Password</Label>
                <Input id="password" name="password" type="password" required placeholder="••••••••" value={form.password} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Konfirmasi Password</Label>
                <Input id="confirmPassword" name="confirmPassword" type="password" required placeholder="••••••••" value={form.confirmPassword} onChange={onChange}
                  className="mt-2 h-11 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]" />
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--p-crimson)] bg-[rgba(185,28,28,0.06)] border border-[rgba(185,28,28,0.2)] rounded-lg px-4 py-2.5" data-testid="register-error">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} data-testid="register-submit-btn"
              className="w-full h-12 rounded-full text-white font-semibold text-base btn-primary">
              {loading ? <><Loader2 className="mr-2 animate-spin" size={18}/> Memproses…</> : <>Daftar Sekarang <ArrowRight size={18} /></>}
            </Button>

            <div className="text-center text-sm text-[var(--p-muted)] pt-1">
              Sudah punya akun?{" "}
              <Link to="/login" className="font-semibold text-[var(--p-royal)] hover:text-[var(--p-navy)]" data-testid="go-to-login-link">
                Masuk di sini
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}