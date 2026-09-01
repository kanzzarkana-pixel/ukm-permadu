import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("permadu_token") || sessionStorage.getItem("permadu_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("permadu_token"); localStorage.removeItem("permadu_user");
      sessionStorage.removeItem("permadu_token"); sessionStorage.removeItem("permadu_user");
      if (!window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export function formatApiError(detail) {
  if (detail == null) return "Terjadi kesalahan. Silakan coba lagi.";
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((e) => e?.msg || JSON.stringify(e)).join(" ");
  if (detail?.msg) return String(detail.msg);
  return String(detail);
}

export const idr = (n) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n || 0);

export const roleLabel = (r) => ({
  ketua: "Ketua Umum",
  wakil: "Wakil Ketua Umum",
  sekretaris: "Sekretaris",
  bendahara: "Bendahara",
  kabid: "Kepala Bidang",
  anggota: "Anggota",
}[r] || r);

export const statusStyle = (s) => ({
  draft: "chip chip-muted",
  diusulkan: "chip chip-gold",
  disetujui: "chip chip-emerald",
  berjalan: "chip chip-emerald",
  selesai: "chip chip-muted",
  ditolak: "chip chip-terra",
}[s] || "chip chip-muted");
