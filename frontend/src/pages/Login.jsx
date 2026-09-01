import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, ArrowRight, Sparkles, ShieldCheck } from "lucide-react";

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) navigate("/", { replace: true });
    const savedEmail = localStorage.getItem("permadu_last_email");
    if (savedEmail) setEmail(savedEmail);
  }, [user, navigate]);

  const submit = async (e) => {
    e?.preventDefault();
    setError(""); setLoading(true);
    const res = await login(email.trim().toLowerCase(), password, remember);
    setLoading(false);
    if (res.ok) {
      if (remember) localStorage.setItem("permadu_last_email", email.trim().toLowerCase());
      else localStorage.removeItem("permadu_last_email");
      toast.success("Om Swastyastu, selamat datang di Portal Permadu");
      navigate("/", { replace: true });
    } else setError(res.error || "Login gagal");
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: "var(--p-cream)" }}>
      {/* Left Hero — deep navy + logo */}
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
              Portal Manajemen Organisasi
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight text-white">
              Merajut <span className="italic text-[var(--p-gold)]">Dharma</span>,<br/>
              Menjalin <span className="italic text-[var(--p-gold)]">Kebersamaan</span>
            </h1>
            <p className="mt-5 text-white/70 max-w-md leading-relaxed">
              Sistem administrasi terpadu <b className="text-white">Perhimpunan Mahasiswa Hindu</b> Institut Informatika &amp; Bisnis Darmajaya — berdiri sejak <b className="text-[var(--p-gold)]">27 Januari 2007</b>.
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
          <div className="mb-10 text-center lg:text-left">
            <div className="text-[11px] tracking-[0.22em] uppercase text-[var(--p-royal)] font-semibold mb-2">Masuk Akun</div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-[var(--p-navy)]">Selamat Datang Kembali</h2>
            <p className="mt-2 text-[var(--p-muted)] text-sm">Gunakan email kampus &amp; kata sandi Anda untuk mengakses portal.</p>
          </div>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            <div>
              <Label htmlFor="email" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Email Kampus</Label>
              <Input id="email" type="email" required autoComplete="email"
                data-testid="login-email-input" placeholder="nama@permadu.darmajaya.ac.id"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-2 h-12 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]"
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Kata Sandi</Label>
              <Input id="password" type="password" required autoComplete="current-password"
                data-testid="login-password-input" placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="mt-2 h-12 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(!!v)}
                  data-testid="remember-me-checkbox"
                  className="border-[var(--p-line)] data-[state=checked]:bg-[var(--p-navy)] data-[state=checked]:border-[var(--p-navy)]"
                />
                <span className="text-sm text-[var(--p-text)]">Ingat saya</span>
              </label>
              <div className="text-xs text-[var(--p-muted)] flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-[var(--p-royal)]"/> Sesi aman JWT
              </div>
            </div>

            {error && (
              <div className="text-sm text-[var(--p-crimson)] bg-[rgba(185,28,28,0.06)] border border-[rgba(185,28,28,0.2)] rounded-lg px-4 py-2.5" data-testid="login-error">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} data-testid="login-submit-btn"
              className="w-full h-12 rounded-full text-white font-semibold text-base btn-primary">
              {loading ? <><Loader2 className="mr-2 animate-spin" size={18}/> Memproses…</> : <>Masuk Portal <ArrowRight size={18} /></>}
            </Button>

            <div className="text-center text-sm text-[var(--p-muted)] pt-1">
              Belum punya akun?{" "}
              <Link to="/register" className="font-semibold text-[var(--p-royal)] hover:text-[var(--p-navy)]" data-testid="go-to-register-link">
                Daftar di sini
              </Link>
            </div>
          </form>

          <div className="mt-10 text-center text-xs text-[var(--p-muted)]">
            <div className="divider-ornament max-w-[220px] mx-auto mb-3"><Sparkles size={12}/></div>
            <div>Butuh akses? Hubungi Sekretariat UKM Permadu Darmajaya.</div>
            <div className="mt-1 text-[10px] tracking-widest uppercase text-[var(--p-muted)]/70">© 2026 · Perhimpunan Mahasiswa Hindu</div>
          </div>
        </div>
      </div>
    </div>
  );
}