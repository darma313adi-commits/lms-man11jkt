import React, { useState } from 'react';
import { useLMS } from '../context/LMSContext';
import { APP_LOGO_URL } from '../constants/assets';
import {
  GraduationCap,
  Shield,
  BookOpen,
  UserCheck,
  LogOut,
  ChevronDown,
  User as UserIcon,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { currentUser, logout, switchUser, users, resetAllDataToDefault } = useLMS();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switchOpen, setSwitchOpen] = useState(false);

  if (!currentUser) return null;

  const roleBadgeConfig = {
    admin: { label: 'Administrator', bg: 'bg-rose-100 text-rose-800 border-rose-200', icon: Shield },
    guru: { label: 'Guru / Pendidik', bg: 'bg-blue-100 text-blue-800 border-blue-200', icon: BookOpen },
    siswa: { label: 'Siswa', bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: GraduationCap },
  };

  const badge = roleBadgeConfig[currentUser.role];
  const BadgeIcon = badge.icon;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden bg-white border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
            <img
              src={APP_LOGO_URL}
              alt="EduCBT Logo"
              className="w-full h-full object-contain p-0.5"
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-800 bg-clip-text text-transparent">
                MAN 11 Jakarta
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                LMS
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Learning Management System</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Quick Demo Role Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setSwitchOpen(!switchOpen);
                setDropdownOpen(false);
              }}
              className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
              title="Ganti Akun Demo Pengujian Cepat"
              aria-label="Ganti Akun Cepat"
            >
              <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
              <span>Ganti Akun Demo</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>

            {switchOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-50 animate-in fade-in slide-in-from-top-1">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800">Pilih Akun Demo Uji Coba</p>
                  <p className="text-[11px] text-slate-500">Pindah peran langsung untuk menguji fitur</p>
                </div>
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {users.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => {
                        switchUser(u);
                        setSwitchOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center justify-between transition ${
                        currentUser.id === u.id
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div>
                        <p className="font-medium">{u.name}</p>
                        <p className="text-[10px] text-slate-400">
                          @{u.username} • {u.role.toUpperCase()} {u.kelas ? `(${u.kelas})` : ''}
                        </p>
                      </div>
                      {u.role === 'admin' && (
                        <span className="text-[10px] bg-rose-50 text-rose-700 px-1.5 py-0.5 rounded font-bold">
                          Admin
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Current User Info */}
          <div className="relative">
            <button
              onClick={() => {
                setDropdownOpen(!dropdownOpen);
                setSwitchOpen(false);
              }}
              className="flex items-center gap-3 p-1.5 rounded-xl hover:bg-slate-100 transition text-left"
              aria-label="User Profile Menu"
            >
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
              <div className="hidden sm:block text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 leading-none">{currentUser.name}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                    {badge.label}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  @{currentUser.username} {currentUser.kelas ? `• Kelas ${currentUser.kelas}` : ''}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500 truncate">{currentUser.email || currentUser.username}</p>
                  <div className="mt-1 flex items-center gap-1.5">
                    <BadgeIcon className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-[11px] font-semibold text-slate-700 capitalize">{currentUser.role}</span>
                    {currentUser.kelas && (
                      <span className="text-[11px] text-slate-500">({currentUser.kelas})</span>
                    )}
                  </div>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      if (confirm('Reset seluruh data ke kondisi awal (akun darma313adi, soal demo, dan hasil)?')) {
                        resetAllDataToDefault();
                        setDropdownOpen(false);
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Data ke Awal</span>
                  </button>

                  <button
                    onClick={() => {
                      logout();
                      setDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition font-medium"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Keluar (Logout)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
