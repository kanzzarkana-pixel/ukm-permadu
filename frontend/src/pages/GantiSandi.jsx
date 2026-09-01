import { useState } from "react";
import AppLayout from "@/components/AppLayout";
import PageHeader from "@/components/PageHeader";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, KeyRound, ShieldCheck } from "lucide-react";

export default function GantiSandi() {
  const { changePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (form.newPassword !== form.confirmPassword) {
      setError("Konfirmasi password baru tidak cocok.");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Password baru minimal 6 karakter.");
      return;
    }
    if (form.oldPassword === form.newPassword) {
      setError("Password baru tidak boleh sama dengan password lama.");
      return;
    }

    setLoading(true);
    const { ok, error: err } = await changePassword(form.oldPassword, form.newPassword);
    setLoading(false);

    if (!ok) {
      setError(err);
      return;
    }

    toast.success("Password berhasil diubah.");
    setForm({ oldPassword: "", newPassword: "", confirmPassword: "" });
  };

  return (
    <AppLayout activePath="/profil">
      <div className="p-6 md:p-10 max-w-2xl mx-auto">
        <PageHeader eyebrow="Akun Saya" title="Ganti Password" description="Masukkan password lama dan password baru Anda." />

        <div className="data-card p-6 md:p-8 fade-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-[var(--p-navy)]/5 flex items-center justify-center shrink-0">
              <KeyRound size={18} className="text-[var(--p-royal)]" />
            </div>
            <div className="text-xs text-[var(--p-muted)] flex items-center gap-1.5">
              <ShieldCheck size={13} className="text-[var(--p-royal)]" /> Data Anda dienkripsi &amp; aman
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5" data-testid="change-password-form">
            <div>
              <Label htmlFor="oldPassword" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Password Lama</Label>
              <Input
                id="oldPassword"
                name="oldPassword"
                type="password"
                required
                placeholder="••••••••"
                value={form.oldPassword}
                onChange={onChange}
                className="mt-2 h-12 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]"
              />
            </div>
            <div>
              <Label htmlFor="newPassword" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Password Baru</Label>
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                required
                placeholder="••••••••"
                value={form.newPassword}
                onChange={onChange}
                className="mt-2 h-12 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]"
              />
            </div>
            <div>
              <Label htmlFor="confirmPassword" className="text-[var(--p-navy)] text-xs font-semibold uppercase tracking-widest">Konfirmasi Password Baru</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={onChange}
                className="mt-2 h-12 rounded-xl border-[var(--p-line)] bg-white focus-visible:ring-[var(--p-royal)]"
              />
            </div>

            {error && (
              <div className="text-sm text-[var(--p-crimson)] bg-[rgba(185,28,28,0.06)] border border-[rgba(185,28,28,0.2)] rounded-lg px-4 py-2.5" data-testid="change-password-error">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} data-testid="change-password-submit-btn"
              className="w-full sm:w-auto h-12 px-8 rounded-full text-white font-semibold text-base btn-primary">
              {loading ? <><Loader2 className="mr-2 animate-spin" size={18}/> Menyimpan…</> : "Simpan Password Baru"}
            </Button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}