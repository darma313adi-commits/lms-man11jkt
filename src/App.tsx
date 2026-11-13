import React from 'react';
import { LMSProvider, useLMS } from './context/LMSContext';
import { Navbar } from './components/Navbar';
import { LoginView } from './components/LoginView';
import { AdminDashboard } from './components/admin/AdminDashboard';
import { GuruDashboard } from './components/guru/GuruDashboard';
import { SiswaDashboard } from './components/siswa/SiswaDashboard';
import { ExamPlayer } from './components/exam/ExamPlayer';
import { PortalClosedScreen } from './components/common/PortalClosedScreen';

const MainLayout: React.FC = () => {
  const {
    currentUser,
    activeExam,
    activeSubmission,
    portalSettings,
    isPortalChecking,
    refreshPortalSettings,
    logout,
  } = useLMS();

  // Wait briefly on first boot for single getDoc check when a non-admin cached session exists
  if (isPortalChecking && currentUser && currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-white">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-indigo-100">Memeriksa status akses portal...</p>
      </div>
    );
  }

  // Block Siswa, Guru, and other non-admin users when portal is closed (Admin always bypassed)
  if (!portalSettings.isOpen && currentUser && currentUser.role !== 'admin') {
    return (
      <PortalClosedScreen
        message={portalSettings.closedMessage}
        onRefresh={() => refreshPortalSettings(false)}
        isChecking={isPortalChecking}
        currentUser={currentUser}
        onLogout={logout}
      />
    );
  }

  // If student is currently taking an exam, show the dedicated Fullscreen ExamPlayer
  if (activeExam && activeSubmission) {
    return <ExamPlayer exam={activeExam} submission={activeSubmission} />;
  }

  // If not logged in, show school portal login page
  if (!currentUser) {
    return <LoginView />;
  }

  // Authenticated views with persistent Navbar
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans">
      <Navbar />
      <main className="flex-1 pb-16">
        {(currentUser.role === 'admin' || currentUser.role === 'kepala_madrasah') && <AdminDashboard />}
        {currentUser.role === 'guru' && <GuruDashboard />}
        {currentUser.role === 'siswa' && <SiswaDashboard />}
      </main>
      <footer className="py-6 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">MAN 11 Jakarta — Learning Management System</p>
        <p className="text-[11px] mt-0.5">Materi Pelajaran PDF, Asesmen Sumatif & Formatif, AI Generator Soal, Model TKA 3 Pernyataan & Anti-Curang Fullscreen</p>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <LMSProvider>
      <MainLayout />
    </LMSProvider>
  );
}
