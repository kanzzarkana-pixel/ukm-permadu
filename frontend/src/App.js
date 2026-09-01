import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Toaster } from "sonner";

import Login from "@/pages/Login";
import Register from "@/pages/Register";
import GantiSandi from "@/pages/GantiSandi";
import Dashboard from "@/pages/Dashboard";
import ProgramPage from "@/pages/ProgramPage";
import KeuanganPage from "@/pages/KeuanganPage";
import SekretariatPage from "@/pages/SekretariatPage";
import AgendaPage from "@/pages/AgendaPage";
import AnggotaPage from "@/pages/AnggotaPage";
import ProfilePage from "@/pages/ProfilePage";
import GaleriPage from "@/pages/GaleriPage";
import RaporKabidPage from "@/pages/RaporKabidPage";
import BidangFilesPage from "@/pages/BidangFilesPage";

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors closeButton />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/program" element={<ProtectedRoute><ProgramPage /></ProtectedRoute>} />
            <Route path="/keuangan" element={<ProtectedRoute><KeuanganPage /></ProtectedRoute>} />
            <Route path="/sekretariat" element={<ProtectedRoute><SekretariatPage /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
            <Route path="/anggota" element={<ProtectedRoute><AnggotaPage /></ProtectedRoute>} />
            <Route path="/galeri" element={<ProtectedRoute><GaleriPage /></ProtectedRoute>} />
            <Route path="/rapor" element={<ProtectedRoute><RaporKabidPage /></ProtectedRoute>} />
            <Route path="/dokumen-bidang" element={<ProtectedRoute><BidangFilesPage /></ProtectedRoute>} />
            <Route path="/profil" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/ganti-sandi" element={<ProtectedRoute><GantiSandi /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;