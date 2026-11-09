import React, { useState, useEffect } from 'react';
import { useLMS } from '../context/LMSContext';
import { APP_LOGO_URL } from '../constants/assets';
import {
  Shield,
  BookOpen,
  GraduationCap,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  Users,
  Award,
} from 'lucide-react';
import {
  buildLoginUrl,
  isDevEnvironment,
} from '../utils/urlHelper';

export const LoginView: React.FC = () => {
  const { login, users, isCloudSynced } = useLMS();

  // Role can be determined by ?role= query parameter or auto exam logout
  const [activePortal, setActivePortal] = useState<'admin' | 'guru' | 'siswa' | 'kepala_madrasah' | 'select'>(() => {
    try {
      if (sessionStorage.getItem('exam_logout_reason')) {
        return 'siswa';
      }
    } catch {}
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role')?.toLowerCase();
    if (roleParam === 'guru') return 'guru';
    if (roleParam === 'siswa') return 'siswa';
    if (roleParam === 'admin') return 'admin';
    if (roleParam === 'kepala_madrasah' || roleParam === 'kamad') return 'kepala_madrasah';
    return 'select'; // If no role in URL, show portal selection
  });

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showQuickAccounts, setShowQuickAccounts] = useState(false);

  // Initialize form fields when portal changes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roleParam = params.get('role')?.toLowerCase();
    const userParam = params.get('user') || params.get('username') || params.get('nip') || params.get('nisn');

    if (roleParam === 'guru') {
      setActivePortal('guru');
      setUsername('guru_fauzan');
      setPassword('guru123');
    } else if (roleParam === 'siswa') {
      setActivePortal('siswa');
      setUsername('siswa_budi');
      setPassword('siswa123');
    } else if (roleParam === 'admin') {
      setActivePortal('admin');
      setUsername('darma313adi');
      setPassword('masdar313');
    } else if (roleParam === 'kepala_madrasah' || roleParam === 'kamad') {
      setActivePortal('kepala_madrasah');
      setUsername('kamad_ahmad');
      setPassword('kamad123');
    }

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
        setActivePortal(matched.role);
        setUsername(matched.username);
        setPassword(matched.password);
      }
    }

    // Check if redirected due to automatic exam logout (time expired or 3x violation)
    try {
      const logoutReason = sessionStorage.getItem('exam_logout_reason');
      const violationReason = sessionStorage.getItem('exam_logout_violation_reason') || '';
      if (logoutReason) {
        sessionStorage.removeItem('exam_logout_reason');
        sessionStorage.removeItem('exam_logout_violation_reason');
        setActivePortal('siswa');
        if (logoutReason === 'time_expired') {
          setErrorMsg('Waktu pengerjaan ujian telah habis. Seluruh lembar jawaban Anda telah otomatis tersimpan dan dikirimkan ke server guru. Anda telah logout otomatis.');
        } else if (logoutReason === 'cheating_limit') {
          setErrorMsg(
            `🚨 Peringatan: Ujian dihentikan karena terdeteksi mencapai batas maksimal 3 kali pelanggaran${
              violationReason ? ` (${violationReason})` : ''
            }. Seluruh lembar jawaban yang telah dikerjakan telah otomatis tersimpan dan terkirim ke server guru pengampu, dan akun Anda telah otomatis logout.`
          );
        }
      }
    } catch {}
  }, [users]);

  const selectPortal = (role: 'admin' | 'guru' | 'siswa' | 'kepala_madrasah') => {
    setActivePortal(role);
    setErrorMsg('');
    if (role === 'admin') {
      setUsername('darma313adi');
      setPassword('masdar313');
    } else if (role === 'kepala_madrasah') {
      setUsername('kamad_ahmad');
      setPassword('kamad123');
    } else if (role === 'guru') {
      setUsername('guru_fauzan');
      setPassword('guru123');
    } else {
      setUsername('siswa_budi');
      setPassword('siswa123');
    }
    const newUrl = `${window.location.pathname}?role=${role}`;
    window.history.pushState({ path: newUrl }, '', newUrl);
  };

  const backToPortalSelect = () => {
    setActivePortal('select');
    setErrorMsg('');
    const newUrl = window.location.pathname;
    window.history.pushState({ path: newUrl }, '', newUrl);
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

  const copyToClipboard = (key: string, link: string) => {
    navigator.clipboard.writeText(link).catch(() => {});
    setCopiedLink(key);
    setTimeout(() => setCopiedLink(null), 2500);
  };

  const currentRole = activePortal === 'select' ? 'siswa' : activePortal;
  const currentPublicLink = buildLoginUrl(currentRole, undefined, true);
  const isDev = isDevEnvironment();

  // Role filtered users for quick helper
  const roleUsers = users.filter((u) => u.role === activePortal);

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
        
        {/* Cloud Sync Status Indicator */}
        <div className="mt-2.5 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/15 text-indigo-100">
          <span className={`w-2 h-2 rounded-full ${isCloudSynced ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          <span>{isCloudSynced ? 'Cloud Firestore Aktif • Sinkron Real-time Antar Perangkat' : 'Menghubungkan ke Cloud Firestore...'}</span>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-2xl relative z-10 px-4 sm:px-0">
        {/* VIEW 1: PORTAL SELECTION (If no role specified) */}
        {activePortal === 'select' && (
          <div className="bg-white/95 backdrop-blur-md py-8 px-6 shadow-2xl rounded-3xl sm:px-8 border border-slate-200/80">
            <div className="text-center mb-6">
              <h3 className="text-xl font-extrabold text-slate-900">
                Pilih Portal Akses Madrasah
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Silakan pilih portal masuk sesuai dengan peran Anda di MAN 11 Jakarta.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              {/* Portal Siswa */}
              <button
                type="button"
                onClick={() => selectPortal('siswa')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-emerald-50 to-emerald-100/40 border-2 border-emerald-300 hover:border-emerald-500 hover:shadow-lg transition flex flex-col items-center text-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition mb-2.5">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Portal Siswa</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Akses materi ajar PDF & asesmen CBT anti-curang online.
                </p>
                <span className="mt-3 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-xs group-hover:bg-emerald-700 transition">
                  Masuk Siswa →
                </span>
              </button>

              {/* Portal Guru */}
              <button
                type="button"
                onClick={() => selectPortal('guru')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-blue-50 to-blue-100/40 border-2 border-blue-300 hover:border-blue-500 hover:shadow-lg transition flex flex-col items-center text-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition mb-2.5">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Portal Guru</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Kelola materi PDF, buat ujian AI, unduh hasil Excel & PDF.
                </p>
                <span className="mt-3 px-2.5 py-1 rounded-lg bg-blue-600 text-white text-[11px] font-bold shadow-xs group-hover:bg-blue-700 transition">
                  Masuk Guru →
                </span>
              </button>

              {/* Portal Kepala Madrasah */}
              <button
                type="button"
                onClick={() => selectPortal('kepala_madrasah')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-purple-50 to-purple-100/40 border-2 border-purple-300 hover:border-purple-500 hover:shadow-lg transition flex flex-col items-center text-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition mb-2.5">
                  <Award className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Kepala Madrasah</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Supervisi ujian, monitoring nilai, dan rekap kurikulum via NIP.
                </p>
                <span className="mt-3 px-2.5 py-1 rounded-lg bg-purple-700 text-white text-[11px] font-bold shadow-xs group-hover:bg-purple-800 transition">
                  Masuk Kamad →
                </span>
              </button>

              {/* Portal Admin */}
              <button
                type="button"
                onClick={() => selectPortal('admin')}
                className="group p-4 rounded-2xl bg-gradient-to-b from-rose-50 to-rose-100/40 border-2 border-rose-300 hover:border-rose-500 hover:shadow-lg transition flex flex-col items-center text-center cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md group-hover:scale-105 transition mb-2.5">
                  <Shield className="w-6 h-6" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm">Portal Admin</h4>
                <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                  Kelola seluruh akun, rombel kelas, dan plotting pengampu.
                </p>
                <span className="mt-3 px-2.5 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold shadow-xs group-hover:bg-rose-700 transition">
                  Masuk Admin →
                </span>
              </button>
            </div>
          </div>
        )}

        {/* VIEW 2: DEDICATED ROLE-ISOLATED LOGIN CARD */}
        {activePortal !== 'select' && (
          <div className="bg-white/95 backdrop-blur-md py-7 px-6 shadow-2xl rounded-3xl sm:px-8 border border-slate-200/80">
            {/* Header with Role Title & Back button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-5">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white shadow-md ${
                    activePortal === 'siswa'
                      ? 'bg-emerald-600 shadow-emerald-500/30'
                      : activePortal === 'guru'
                      ? 'bg-blue-600 shadow-blue-500/30'
                      : activePortal === 'kepala_madrasah'
                      ? 'bg-purple-700 shadow-purple-500/30'
                      : 'bg-rose-600 shadow-rose-500/30'
                  }`}
                >
                  {activePortal === 'siswa' && <GraduationCap className="w-6 h-6" />}
                  {activePortal === 'guru' && <BookOpen className="w-6 h-6" />}
                  {activePortal === 'kepala_madrasah' && <Award className="w-6 h-6" />}
                  {activePortal === 'admin' && <Shield className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {activePortal === 'siswa' && 'Portal Masuk Siswa'}
                    {activePortal === 'guru' && 'Portal Masuk Guru & Pengajar'}
                    {activePortal === 'kepala_madrasah' && 'Portal Masuk Kepala Madrasah'}
                    {activePortal === 'admin' && 'Portal Masuk Administrator'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activePortal === 'siswa' && 'Khusus peserta didik MAN 11 Jakarta'}
                    {activePortal === 'guru' && 'Khusus dewan guru & tenaga pendidik'}
                    {activePortal === 'kepala_madrasah' && 'Khusus pimpinan & pengawas madrasah'}
                    {activePortal === 'admin' && 'Khusus pengelola sistem & admin'}
                  </p>
                </div>
              </div>

              {/* Tombol Ganti Portal (Dihilangkan untuk Siswa) */}
              {activePortal !== 'siswa' && (
                <button
                  type="button"
                  onClick={backToPortalSelect}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                  title="Pilih peran portal lain"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Ganti Portal</span>
                </button>
              )}
            </div>

            {/* Error Banner */}
            {errorMsg && (
              <div
                className={`mb-4 p-3.5 rounded-2xl flex items-start gap-3 text-xs leading-relaxed ${
                  errorMsg.includes('🚨')
                    ? 'bg-rose-50 border-2 border-rose-500 text-rose-950 shadow-sm'
                    : 'bg-rose-50 border-l-4 border-rose-500 text-rose-800'
                }`}
              >
                <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${errorMsg.includes('🚨') ? 'text-rose-600' : 'text-rose-500'}`} />
                <div className="flex-1 font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Login Form */}
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-700">
                  {activePortal === 'siswa'
                    ? 'Username / NISN Siswa'
                    : activePortal === 'guru'
                    ? 'Username / NIP Guru'
                    : activePortal === 'kepala_madrasah'
                    ? 'Username / NIP Kepala Madrasah'
                    : 'Username Administrator'}
                </label>
                <div className="mt-1 relative rounded-lg shadow-2xs">
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={
                      activePortal === 'siswa'
                        ? 'Contoh: siswa_budi atau NISN'
                        : activePortal === 'guru'
                        ? 'Contoh: guru_fauzan atau NIP'
                        : activePortal === 'kepala_madrasah'
                        ? 'Contoh: kamad_ahmad atau NIP'
                        : 'Contoh: darma313adi'
                    }
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-xs font-bold text-slate-700">
                  Password (Kata Sandi)
                </label>
                <div className="mt-1 relative rounded-lg shadow-2xs">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan password akun Anda"
                    className="block w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl text-sm font-bold text-white shadow-lg transition cursor-pointer ${
                  activePortal === 'siswa'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25'
                    : activePortal === 'guru'
                    ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                    : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/25'
                } ${loading ? 'opacity-70 cursor-wait' : ''}`}
              >
                <LogIn className="w-4 h-4" />
                <span>{loading ? 'Memverifikasi...' : `Masuk ke Portal ${activePortal === 'siswa' ? 'Siswa' : activePortal === 'guru' ? 'Guru' : 'Admin'}`}</span>
              </button>
            </form>

            {/* Quick Demo Credentials Helper (Strictly for this role) */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowQuickAccounts(!showQuickAccounts)}
                className="w-full flex items-center justify-between text-xs font-bold text-slate-600 hover:text-slate-900"
              >
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Daftar Akun Pengujian Demo {activePortal === 'siswa' ? 'Siswa' : activePortal === 'guru' ? 'Guru' : 'Admin'}</span>
                </span>
                {showQuickAccounts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showQuickAccounts && (
                <div className="mt-3 space-y-1.5 max-h-48 overflow-y-auto">
                  {roleUsers.map((u) => (
                    <div
                      key={u.id}
                      onClick={() => {
                        setUsername(u.username);
                        setPassword(u.password);
                      }}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 flex items-center justify-between cursor-pointer transition text-xs"
                    >
                      <div>
                        <p className="font-bold text-slate-900">{u.name}</p>
                        <p className="text-[11px] text-slate-500 font-mono">
                          Username: <strong>{u.username}</strong> | Pass: <strong>{u.password}</strong>
                          {u.kelas ? ` | Kelas: ${u.kelas}` : ''}
                          {u.mataPelajaran ? ` | Mapel: ${u.mataPelajaran}` : ''}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold text-indigo-700 px-2 py-0.5 rounded bg-indigo-100">
                        Pilih
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Public Link Share Box for this Role (Dihilangkan untuk Portal Siswa) */}
            {activePortal !== 'siswa' && (
              <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                    <Globe className="w-3 h-3 text-emerald-600" />
                    Tautan Publik Khusus Portal {activePortal === 'guru' ? 'Guru' : activePortal === 'kepala_madrasah' ? 'Kepala Madrasah' : 'Admin'}:
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(`link_${activePortal}`, currentPublicLink)}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white px-2 py-0.5 rounded border border-emerald-200 cursor-pointer shadow-2xs"
                  >
                    {copiedLink === `link_${activePortal}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Salin Link</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-[10px] text-emerald-950 bg-white p-1.5 rounded border border-slate-200 truncate select-all">
                  {currentPublicLink}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
