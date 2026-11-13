import React from 'react';
import { Lock, RefreshCw, Shield, LogOut } from 'lucide-react';
import { APP_LOGO_URL } from '../../constants/assets';
import { User } from '../../types';

interface PortalClosedScreenProps {
  message: string;
  onRefresh: () => void | Promise<any>;
  isChecking?: boolean;
  onAdminLoginClick?: () => void;
  currentUser?: User | null;
  onLogout?: () => void;
}

export const PortalClosedScreen: React.FC<PortalClosedScreenProps> = ({
  message,
  onRefresh,
  isChecking = false,
  onAdminLoginClick,
  currentUser,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-rose-950/90 to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      <div className="absolute top-0 -left-24 w-96 h-96 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-24 w-96 h-96 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-2xl shadow-rose-500/20 ring-4 ring-white/10 flex items-center justify-center overflow-hidden mb-3">
            <img
              src={APP_LOGO_URL}
              alt="MAN 11 Jakarta Logo"
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            MAN 11 Jakarta
          </h1>
          <p className="text-xs sm:text-sm font-semibold text-rose-200 mt-1">
            Learning Management System & Computer-Based Testing
          </p>
        </div>

        <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl border border-rose-200/80 p-6 sm:p-8 text-center">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner mb-4 border border-rose-200">
            <Lock className="w-8 h-8" />
          </div>

          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-extrabold bg-rose-100 text-rose-800 border border-rose-200 mb-3">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse" />
            PORTAL UJIAN SEDANG DITUTUP
          </span>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Akses Portal Ditutup Sementara
          </h2>

          <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-rose-50/80 border border-rose-200 text-slate-800 text-sm sm:text-base leading-relaxed font-medium whitespace-pre-line">
            {message ||
              'Portal Ujian & Pembelajaran MAN 11 Jakarta sedang ditutup sementara oleh Administrator. Silakan tunggu pengumuman resmi untuk pembukaan portal kembali.'}
          </div>

          {currentUser && (
            <p className="mt-4 text-xs text-slate-500">
              Anda masuk sebagai <strong className="text-slate-700">{currentUser.name}</strong> ({currentUser.role}). Akses non-admin diblokir selama portal ditutup.
            </p>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onRefresh}
              disabled={isChecking}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Memeriksa Status...' : 'Periksa Status Portal Lagi'}</span>
            </button>

            {onLogout && currentUser && (
              <button
                type="button"
                onClick={onLogout}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar ke Halaman Utama</span>
              </button>
            )}
          </div>

          {onAdminLoginClick && (
            <div className="mt-6 pt-5 border-t border-slate-200 flex justify-center">
              <button
                type="button"
                onClick={onAdminLoginClick}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-indigo-700 hover:bg-indigo-50 border border-slate-200 transition cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-rose-600" />
                <span>Login Khusus Administrator</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
