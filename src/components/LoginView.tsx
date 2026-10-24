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
  HelpCircle,
  Users,
  Search,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
} from 'lucide-react';
import {
  buildLoginUrl,
  getPublicBaseUrl,
  getDevBaseUrl,
  isDevEnvironment,
} from '../utils/urlHelper';

export const LoginView: React.FC = () => {
  const { login, users } = useLMS();

  const [selectedRole, setSelectedRole] = useState<'admin' | 'guru' | 'siswa'>('admin');
  const [username, setUsername] = useState('darma313adi');
  const [password, setPassword] = useState('masdar313');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showAccountDrawer, setShowAccountDrawer] = useState(true);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [accountSearch, setAccountSearch] = useState('');

  // Detect role and specific username from URL query parameters or hash
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.toLowerCase();
    const roleParam = params.get('role')?.toLowerCase() || (hash.includes('guru') ? 'guru' : hash.includes('siswa') ? 'siswa' : hash.includes('admin') ? 'admin' : null);
    const userParam = params.get('user') || params.get('username') || params.get('nip') || params.get('nisn');

    if (userParam) {
      const trimmedTarget = userParam.trim().toLowerCase();
      const matched = users.find(
        (u) =>
          u.username.toLowerCase() === trimmedTarget ||
          u.email?.toLowerCase() === trimmedTarget ||
          u.nip?.toLowerCase() === trimmedTarget ||
          u.nisn?.toLowerCase() === trimmedTarget
      );
      if (matched) {
        setSelectedRole(matched.role);
        setUsername(matched.username);
        setPassword(matched.password);
        return;
      }
    }

    if (roleParam === 'guru') {
      selectPortal('guru', 'guru_siti', 'guru123');
    } else if (roleParam === 'siswa') {
      selectPortal('siswa', 'siswa_budi', 'siswa123');
    } else if (roleParam === 'admin') {
      selectPortal('admin', 'darma313adi', 'masdar313');
    } else {
      // Default to admin or keep darma313adi
      setSelectedRole('admin');
      setUsername('darma313adi');
      setPassword('masdar313');
    }
  }, [users]);

  const selectPortal = (role: 'admin' | 'guru' | 'siswa', defaultUser: string, defaultPass: string) => {
    setSelectedRole(role);
    setUsername(defaultUser);
    setPassword(defaultPass);
    setErrorMsg('');
    const newUrl = `${window.location.pathname}?role=${role}`;
    window.history.replaceState({ path: newUrl }, '', newUrl);
  };

  const selectSpecificUser = (user: (typeof users)[0]) => {
    setSelectedRole(user.role);
    setUsername(user.username);
    setPassword(user.password);
    setErrorMsg('');
    const newUrl = `${window.location.pathname}?role=${user.role}&user=${encodeURIComponent(user.username)}`;
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

  const getFullLoginLink = (role: 'admin' | 'guru' | 'siswa', specificUser?: string) => {
    return buildLoginUrl(role, specificUser, true);
  };

  const copyToClipboard = (key: string, link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  // Filtered users for quick selector
  const filteredUsers = users.filter((u) => {
    if (accountSearch.trim()) {
      const q = accountSearch.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q) ||
        (u.nip && u.nip.includes(q)) ||
        (u.nisn && u.nisn.includes(q)) ||
        (u.mataPelajaran && u.mataPelajaran.toLowerCase().includes(q)) ||
        (u.kelas && u.kelas.toLowerCase().includes(q))
      );
    }
    return u.role === selectedRole;
  });

  const publicLink = buildLoginUrl(selectedRole, undefined, true);
  const devLink = buildLoginUrl(selectedRole, undefined, false);
  const isDev = isDevEnvironment();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative backdrop shapes */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Branding MAN 11 Jakarta */}
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 text-center px-4">
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
          Learning Management System & Computer-Based Testing
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4 sm:px-0">
        <div className="bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl rounded-3xl sm:px-8 border border-slate-200/80">
          
          {/* Solusi Akses Akun Google Lain */}
          <div className="mb-5 p-4 bg-emerald-50/90 border border-emerald-200 rounded-2xl text-xs text-emerald-950">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold text-slate-900">
                  Solusi Tautan untuk Dibuka di Akun Google Lain / Perangkat Lain:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowHelpGuide(!showHelpGuide)}
                className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 flex items-center gap-0.5 cursor-pointer shrink-0"
              >
                <span>{showHelpGuide ? 'Tutup Info' : 'Baca Solusi'}</span>
                {showHelpGuide ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
            
            <p className="mt-1.5 text-[11px] text-slate-600 leading-relaxed">
              Domain <code className="bg-white px-1.5 py-0.5 rounded text-rose-700 font-mono">ais-dev-...</code> dikunci oleh proteksi Google Cloud IAP khusus untuk akun pemilik (<strong>darma313adi@gmail.com</strong>). Agar siswa atau guru lain dengan akun Google berbeda dapat masuk tanpa error izin, gunakan tautan publik <code className="bg-white px-1.5 py-0.5 rounded text-emerald-700 font-mono font-bold">ais-pre-...</code> di bawah ini:
            </p>

            {showHelpGuide && (
              <div className="mt-2.5 pt-2.5 border-t border-emerald-200/70 space-y-1.5 text-[11px] leading-relaxed text-emerald-950">
                <p>
                  <strong>Mengapa terjadi error di akun Google lain?</strong>
                  <br />
                  Sistem Cloud Run secara otomatis memberlakukan proteksi otentikasi internal pada tautan developer. Sistem kami kini telah <strong>otomatis mengubah tautan berbagi menjadi tautan publik (Shared App URL)</strong> yang dapat dibuka di Chrome, Firefox, Safari, HP Android/iPhone, maupun jendela penyamaran (incognito) tanpa batasan akun Google!
                </p>
                <div className="p-2 bg-white rounded-lg border border-emerald-200 text-[10px] space-y-1">
                  <p>✅ <strong>Tautan Publik (Bisa Diakses Siapa Saja):</strong> <span className="font-mono text-emerald-700 break-all">{publicLink}</span></p>
                  {isDev && <p>🔒 <strong>Tautan Khusus Developer (Pemilik darma313adi):</strong> <span className="font-mono text-slate-500 break-all">{devLink}</span></p>}
                </div>
              </div>
            )}
          </div>

          {/* Tautan Login Khusus: Guru, Admin, Siswa */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
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

            {/* Kotak Tautan Publik Siap Bagikan */}
            <div className="mt-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  Tautan Publik untuk Portal {selectedRole === 'admin' ? 'Admin' : selectedRole === 'guru' ? 'Guru' : 'Siswa'}:
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`role_${selectedRole}`, publicLink)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer shadow-2xs"
                  title="Salin tautan publik ini untuk dibagikan ke siswa / guru di akun Google lain"
                >
                  {copiedLink === `role_${selectedRole}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Tersalin!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Salin Tautan Publik</span>
                    </>
                  )}
                </button>
              </div>
              <p className="font-mono text-[11px] text-emerald-950 bg-white p-2 rounded-lg border border-slate-200 truncate select-all">
                {publicLink}
              </p>
              <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                <span>🌐 Tautan ini bebas dibuka di semua akun Google tanpa izin khusus.</span>
                <a
                  href={publicLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-indigo-600 hover:underline"
                >
                  <span>Buka di Tab Baru</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
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

          {/* Akun Terdaftar & Tautan Cepat Siap Pakai */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-xs font-bold text-slate-800">
                  Daftar Akun Terdaftar & Siap Pakai:
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowAccountDrawer(!showAccountDrawer)}
                className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
              >
                {showAccountDrawer ? 'Sembunyikan' : 'Tampilkan Semua Akun'}
              </button>
            </div>

            {showAccountDrawer && (
              <div className="space-y-3">
                {/* Search input for accounts */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={accountSearch}
                    onChange={(e) => setAccountSearch(e.target.value)}
                    placeholder="Cari guru (Siti, Bambang), siswa (Budi, Anita), atau username..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-1">
                  {filteredUsers.map((u) => {
                    const isCurrent = username === u.username;
                    return (
                      <div
                        key={u.id}
                        className={`p-2.5 rounded-xl border text-xs transition flex flex-col justify-between ${
                          isCurrent
                            ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-500/20'
                            : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <span className="font-bold text-slate-900 truncate">{u.name}</span>
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                u.role === 'admin'
                                  ? 'bg-rose-100 text-rose-800'
                                  : u.role === 'guru'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {u.role}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 space-y-0.5">
                            <p>User: <strong className="font-mono text-slate-700">@{u.username}</strong></p>
                            {u.mataPelajaran && <p className="text-blue-700 truncate">Mapel: {u.mataPelajaran}</p>}
                            {u.kelas && <p className="text-emerald-700">Kelas: {u.kelas}</p>}
                            {u.nip && <p className="text-slate-400">NIP: {u.nip}</p>}
                          </div>
                        </div>

                        <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between gap-1">
                          <button
                            type="button"
                            onClick={() => selectSpecificUser(u)}
                            className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] transition cursor-pointer"
                          >
                            Pilih Akun Ini
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              copyToClipboard(
                                `user_${u.username}`,
                                getFullLoginLink(u.role, u.username)
                              )
                            }
                            className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 inline-flex items-center gap-1 cursor-pointer"
                            title="Salin tautan login langsung untuk akun ini"
                          >
                            {copiedLink === `user_${u.username}` ? (
                              <span className="text-emerald-600 font-bold">✓ Tersalin</span>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                <span>Salin Tautan</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
