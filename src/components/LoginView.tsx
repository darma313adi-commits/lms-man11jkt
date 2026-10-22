import React, { useState, useEffect } from 'react';
import { useLMS } from '../context/LMSContext';
import { APP_LOGO_URL } from '../constants/assets';
import {
  Shield,
  BookOpen,
  GraduationCap,
  User,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Link as LinkIcon,
  ExternalLink,
} from 'lucide-react';

export const LoginView: React.FC = () => {
  const { login } = useLMS();

  // Detect role from URL query param if available (?role=admin, ?role=guru, ?role=siswa)
  const [selectedRole, setSelectedRole] = useState<'admin' | 'guru' | 'siswa'>('admin');
  const [username, setUsername] = useState('darma313adi');
  const [password, setPassword] = useState('masdar313');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const roleParam = params.get('role')?.toLowerCase() || (hash.includes('guru') ? 'guru' : hash.includes('siswa') ? 'siswa' : hash.includes('admin') ? 'admin' : null);

    if (roleParam === 'guru') {
      selectPortal('guru', 'guru_siti', 'guru123');
    } else if (roleParam === 'siswa') {
      selectPortal('siswa', 'siswa_budi', 'siswa123');
    } else {
      selectPortal('admin', 'darma313adi', 'masdar313');
    }
  }, []);

  const selectPortal = (role: 'admin' | 'guru' | 'siswa', defaultUser: string, defaultPass: string) => {
    setSelectedRole(role);
    setUsername(defaultUser);
    setPassword(defaultPass);
    setErrorMsg('');
    // Update URL query parameter without full reload
    const newUrl = `${window.location.pathname}?role=${role}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    setTimeout(() => {
      const result = login(username, password);
      setLoading(false);
      if (!result.success) {
        setErrorMsg(result.message || 'Gagal masuk. Periksa kembali username dan password.');
      }
    }, 200);
  };

  const getFullLoginLink = (role: 'admin' | 'guru' | 'siswa') => {
    const origin = window.location.origin;
    const path = window.location.pathname;
    return `${origin}${path}?role=${role}`;
  };

  const copyToClipboard = (role: 'admin' | 'guru' | 'siswa') => {
    const link = getFullLoginLink(role);
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(role);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative backdrop shapes */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding MAN 11 Jakarta */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 text-center">
        <div className="flex justify-center mb-3">
          <div className="w-20 h-20 rounded-2xl bg-white p-1.5 shadow-2xl shadow-indigo-500/30 ring-4 ring-white/10 flex items-center justify-center overflow-hidden">
            <img
              src={APP_LOGO_URL}
              alt="MAN 11 Jakarta Logo"
              className="w-full h-full object-contain"
            />
          </div>
        </div>
        <h2 className="text-3xl font-black text-white tracking-tight">
          MAN 11 Jakarta
        </h2>
        <p className="mt-1 text-sm font-semibold text-indigo-200 tracking-wide">
          Learning Management System
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl rounded-3xl sm:px-9 border border-slate-200/80">
          {/* Tautan Login Khusus: Guru, Admin, Siswa */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                Pilih Portal & Tautan Login:
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectPortal('admin', 'darma313adi', 'masdar313')}
                className={`py-2 px-2 text-xs rounded-xl font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  selectedRole === 'admin'
                    ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-xs ring-2 ring-rose-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Shield className="w-4 h-4 text-rose-600" />
                <span>Portal Admin</span>
              </button>

              <button
                type="button"
                onClick={() => selectPortal('guru', 'guru_siti', 'guru123')}
                className={`py-2 px-2 text-xs rounded-xl font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  selectedRole === 'guru'
                    ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-xs ring-2 ring-blue-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span>Portal Guru</span>
              </button>

              <button
                type="button"
                onClick={() => selectPortal('siswa', 'siswa_budi', 'siswa123')}
                className={`py-2 px-2 text-xs rounded-xl font-bold flex flex-col items-center gap-1 border transition cursor-pointer ${
                  selectedRole === 'siswa'
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs ring-2 ring-emerald-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <GraduationCap className="w-4 h-4 text-emerald-600" />
                <span>Portal Siswa</span>
              </button>
            </div>

            {/* Kotak Keterangan & Tautan Langsung */}
            <div className="mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-900">
                  Tautan Login Bagi {selectedRole === 'admin' ? 'Admin' : selectedRole === 'guru' ? 'Guru' : 'Siswa'}:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(selectedRole)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900"
                  title="Salin tautan login ini"
                >
                  {copiedLink === selectedRole ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-[11px] text-indigo-900 bg-white p-1.5 rounded-lg border border-slate-200 truncate select-all">
                {getFullLoginLink(selectedRole)}
              </p>
              {selectedRole === 'admin' && (
                <p className="mt-1.5 text-[11px] text-rose-700 font-medium">
                  👑 Akun Resmi: <span className="font-mono font-bold">darma313adi</span> / <span className="font-mono font-bold">masdar313</span>
                </p>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-500 p-3 rounded-md flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="username" className="block text-xs font-bold text-slate-700">
                Username / Email / NIP / NISN
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <User className="h-4 w-4" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username atau NIP/NISN"
                  className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                Password
              </label>
              <div className="mt-1 relative rounded-lg shadow-2xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan password"
                  className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <span>Memverifikasi...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Masuk ke {selectedRole === 'admin' ? 'Admin' : selectedRole === 'guru' ? 'Guru' : 'Siswa'} MAN 11</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Daftar Tautan Login Langsung untuk disalin / dibagikan */}
          <div className="mt-6 pt-4 border-t border-slate-200">
            <p className="text-[11px] font-bold text-slate-700 mb-2">Tautan Langsung untuk Dibagikan:</p>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-rose-800">👑 Tautan Login Admin:</span>
                <button
                  type="button"
                  onClick={() => selectPortal('admin', 'darma313adi', 'masdar313')}
                  className="text-indigo-600 hover:underline font-mono text-[10px]"
                >
                  ?role=admin
                </button>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-blue-800">👩‍🏫 Tautan Login Guru:</span>
                <button
                  type="button"
                  onClick={() => selectPortal('guru', 'guru_siti', 'guru123')}
                  className="text-indigo-600 hover:underline font-mono text-[10px]"
                >
                  ?role=guru
                </button>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="font-semibold text-emerald-800">🎓 Tautan Login Siswa:</span>
                <button
                  type="button"
                  onClick={() => selectPortal('siswa', 'siswa_budi', 'siswa123')}
                  className="text-indigo-600 hover:underline font-mono text-[10px]"
                >
                  ?role=siswa
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
