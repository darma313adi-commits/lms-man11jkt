import React, { useState, useRef } from 'react';
import { useLMS } from '../../context/LMSContext';
import { User, UserRole } from '../../types';
import {
  Users,
  GraduationCap,
  BookOpen,
  Shield,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit2,
  Search,
  Filter,
  CheckCircle,
  AlertCircle,
  School,
  Lock,
  Layers,
  Sparkles,
  UserCheck,
} from 'lucide-react';
import {
  parseExcelUsers,
  downloadUserTemplateExcel,
  exportUsersExcel,
} from '../../utils/fileParser';
import { RombelManager } from './RombelManager';
import { MapelManager } from './MapelManager';
import { PlottingGuruManager } from './PlottingGuruManager';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    importUsers,
    exams,
    submissions,
    rombelList,
    mataPelajaranList,
    kelasMapelPengampuList,
  } = useLMS();

  const [activeTab, setActiveTab] = useState<
    'daftar' | 'rombel' | 'mapel' | 'plotting' | 'import' | 'manual'
  >('daftar');
  const [plottingTargetKelas, setPlottingTargetKelas] = useState<string>('X MIPA 1');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [kelasFilter, setKelasFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Form State
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    password: '',
    role: 'siswa' as UserRole,
    kelas: 'X MIPA 1',
    nipNisn: '',
    email: '',
    mataPelajaran: '',
  });

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // File Upload State
  const [importStatus, setImportStatus] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [pastedPdfText, setPastedPdfText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived unique classes from rombelList and users
  const classesList = Array.from(
    new Set([
      ...rombelList.map((r) => r.nama),
      ...users.filter((u) => u.role === 'siswa' && u.kelas).map((u) => u.kelas as string),
    ])
  ).sort();

  const teachersCount = users.filter((u) => u.role === 'guru').length;
  const studentsCount = users.filter((u) => u.role === 'siswa').length;

  // Filtered users
  const filteredUsers = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (kelasFilter !== 'all' && u.kelas !== kelasFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = u.name.toLowerCase().includes(q);
      const matchUser = u.username.toLowerCase().includes(q);
      const matchEmail = (u.email || '').toLowerCase().includes(q);
      const matchNip = (u.nip || u.nisn || '').toLowerCase().includes(q);
      return matchName || matchUser || matchEmail || matchNip;
    }
    return true;
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.username || !formData.password) {
      alert('Nama, Username, dan Password wajib diisi!');
      return;
    }

    addUser({
      name: formData.name,
      username: formData.username.toLowerCase().replace(/\s+/g, '_'),
      password: formData.password,
      role: formData.role,
      kelas: formData.role === 'siswa' ? formData.kelas : undefined,
      nip: formData.role === 'guru' ? formData.nipNisn : undefined,
      nisn: formData.role === 'siswa' ? formData.nipNisn : undefined,
      email: formData.email || `${formData.username}@sekolah.sch.id`,
      mataPelajaran: formData.role === 'guru' ? formData.mataPelajaran : undefined,
      kelasAjar: formData.role === 'guru' ? ['X MIPA 1', 'X MIPA 2', 'XI MIPA 1'] : undefined,
      status: 'aktif',
    });

    setFormData({
      name: '',
      username: '',
      password: '',
      role: 'siswa',
      kelas: 'X MIPA 1',
      nipNisn: '',
      email: '',
      mataPelajaran: '',
    });

    setActiveTab('daftar');
    setImportStatus({
      type: 'success',
      message: `Akun ${formData.role} baru (${formData.name}) berhasil ditambahkan ke database!`,
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    setImportStatus(null);

    try {
      const parsed = await parseExcelUsers(file);
      if (parsed.length === 0) {
        setImportStatus({
          type: 'error',
          message: 'Tidak ada data pengguna yang valid ditemukan dalam file. Pastikan ada kolom Nama dan Username/NISN.',
        });
      } else {
        const count = importUsers(parsed);
        setImportStatus({
          type: 'success',
          message: `Berhasil mengimpor ${count} pengguna baru dari file "${file.name}"!`,
        });
        setActiveTab('daftar');
      }
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: `Gagal membaca file: ${err.message || 'Format tidak didukung'}`,
      });
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParsePdfText = () => {
    if (!pastedPdfText.trim()) return;
    setIsProcessingFile(true);

    try {
      // Parse format PDF/Text seperti:
      // "1. Budi Santoso, 0076543201, siswa, X MIPA 1, budi123"
      // atau tab-separated list
      const lines = pastedPdfText.split('\n').filter((l) => l.trim().length > 0);
      const imported: Partial<User>[] = [];

      lines.forEach((line) => {
        const parts = line.split(/[,;\t|]+/).map((s) => s.trim());
        if (parts.length >= 2) {
          const name = parts[0].replace(/^\d+[\.\)]\s*/, '');
          const username = parts[1].toLowerCase().replace(/\s+/g, '_');
          const role = (parts[2] || 'siswa').toLowerCase().includes('guru') ? 'guru' : 'siswa';
          const kelas = parts[3] || 'X MIPA 1';
          const password = parts[4] || '123456';

          if (name && username) {
            imported.push({
              name,
              username,
              password,
              role: role as UserRole,
              kelas: role === 'siswa' ? kelas : undefined,
              status: 'aktif',
              email: `${username}@sekolah.sch.id`,
            });
          }
        }
      });

      if (imported.length > 0) {
        const count = importUsers(imported);
        setImportStatus({
          type: 'success',
          message: `Berhasil mengimpor ${count} data pengguna dari teks PDF!`,
        });
        setPastedPdfText('');
        setActiveTab('daftar');
      } else {
        setImportStatus({
          type: 'error',
          message: 'Format teks tidak terbaca. Pastikan format: Nama, Username, Peran, Kelas, Password',
        });
      }
    } catch {
      setImportStatus({
        type: 'error',
        message: 'Gagal memproses teks PDF.',
      });
    } finally {
      setIsProcessingFile(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Panel Kontrol Administrator
              </span>
              <span className="text-xs text-indigo-200">EduCBT v2.6 Pro</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Manajemen Sekolah & Pengguna
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Kelola data akun Guru dan Siswa per kelas. Input manual atau impor langsung menggunakan file Excel (.xlsx / .csv) dan teks PDF.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={downloadUserTemplateExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur"
              title="Unduh Format Template Excel"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Unduh Template Excel</span>
            </button>
            <button
              onClick={() => exportUsersExcel(users)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md transition"
              title="Ekspor seluruh akun ke file Excel"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Ekspor Semua Akun (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5 mt-8 pt-6 border-t border-white/10">
          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-1.5 text-indigo-300 text-xs font-semibold">
              <BookOpen className="w-4 h-4" />
              <span>Total Guru</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{teachersCount}</p>
          </div>

          <div className="bg-white/5 rounded-2xl p-3.5 border border-white/10">
            <div className="flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
              <GraduationCap className="w-4 h-4" />
              <span>Total Siswa</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{studentsCount}</p>
          </div>

          <div
            onClick={() => setActiveTab('rombel')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-2xl p-3.5 border border-white/10 transition group"
            title="Klik untuk kelola Rombel Kelas"
          >
            <div className="flex items-center justify-between text-amber-300 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <School className="w-4 h-4" />
                <span>Rombel Kelas</span>
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-white">Kelola →</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{rombelList.length}</p>
          </div>

          <div
            onClick={() => setActiveTab('mapel')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-2xl p-3.5 border border-white/10 transition group"
            title="Klik untuk kelola Mata Pelajaran"
          >
            <div className="flex items-center justify-between text-cyan-300 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <Layers className="w-4 h-4" />
                <span>Mata Pelajaran</span>
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-white">Kelola →</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{mataPelajaranList.length}</p>
          </div>

          <div
            onClick={() => setActiveTab('plotting')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-2xl p-3.5 border border-white/10 transition group"
            title="Klik untuk atur Plotting Guru & Mapel per Kelas"
          >
            <div className="flex items-center justify-between text-rose-300 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4" />
                <span>Plotting Guru</span>
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-white">Atur →</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">
              {kelasMapelPengampuList.filter((k) => k.guruId).length} Plot
            </p>
          </div>
        </div>
      </div>

      {/* Feedback Banner */}
      {importStatus && (
        <div
          className={`mb-6 p-4 rounded-2xl flex items-center justify-between gap-3 text-sm font-medium border ${
            importStatus.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {importStatus.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            )}
            <span>{importStatus.message}</span>
          </div>
          <button
            onClick={() => setImportStatus(null)}
            className="text-xs font-bold hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Tabs Control */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'daftar'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Guru & Siswa ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rombel')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'rombel'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Rombongan Kelas ({rombelList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('mapel')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'mapel'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Mata Pelajaran ({mataPelajaranList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('plotting')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'plotting'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Plotting Guru & Mapel per Kelas</span>
        </button>

        <button
          onClick={() => setActiveTab('import')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'import'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Impor File (Excel & PDF)</span>
        </button>

        <button
          onClick={() => setActiveTab('manual')}
          className={`flex items-center gap-2 px-4 py-3 text-xs sm:text-sm font-bold border-b-2 transition shrink-0 ${
            activeTab === 'manual'
              ? 'border-indigo-600 text-indigo-700 bg-indigo-50/40 rounded-t-xl'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Akun</span>
        </button>
      </div>

      {/* Tab 1: Daftar Pengguna */}
      {activeTab === 'daftar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-slate-50/50">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama, username, NIP/NISN..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Peran:</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Peran</option>
                  <option value="guru">Guru Saja</option>
                  <option value="siswa">Siswa Saja</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Kelas:</span>
                <select
                  value={kelasFilter}
                  onChange={(e) => setKelasFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Kelas</option>
                  {classesList.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="text-xs text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-800">{filteredUsers.length}</span> dari {users.length} pengguna
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3.5">Nama & Identitas</th>
                  <th className="px-4 py-3.5">Username</th>
                  <th className="px-4 py-3.5">Password</th>
                  <th className="px-4 py-3.5">Peran (Role)</th>
                  <th className="px-4 py-3.5">Kelas / Rombel</th>
                  <th className="px-4 py-3.5">NIP / NISN</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <div>{u.name}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-indigo-700">@{u.username}</td>
                    <td className="px-4 py-3 font-mono text-slate-600 bg-slate-50/50 rounded">{u.password}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${
                          u.role === 'admin'
                            ? 'bg-rose-100 text-rose-800'
                            : u.role === 'guru'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role === 'admin' && <Shield className="w-3 h-3" />}
                        {u.role === 'guru' && <BookOpen className="w-3 h-3" />}
                        {u.role === 'siswa' && <GraduationCap className="w-3 h-3" />}
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {u.kelas ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {u.kelas}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{u.nip || u.nisn || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingUser(u)}
                          className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                          title="Edit Pengguna"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {u.username !== 'darma313adi' && (
                          <button
                            onClick={() => {
                              if (confirm(`Yakin ingin menghapus akun "${u.name}" (@${u.username})?`)) {
                                deleteUser(u.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition"
                            title="Hapus Pengguna"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Rombongan Kelas (Rombel) */}
      {activeTab === 'rombel' && (
        <RombelManager
          onSelectPlotting={(kelasNama) => {
            setPlottingTargetKelas(kelasNama);
            setActiveTab('plotting');
          }}
        />
      )}

      {/* Tab: Master Mata Pelajaran (Mapel) */}
      {activeTab === 'mapel' && <MapelManager />}

      {/* Tab: Plotting Guru & Mapel per Kelas */}
      {activeTab === 'plotting' && (
        <PlottingGuruManager initialKelas={plottingTargetKelas} />
      )}

      {/* Tab: Impor File (Excel & PDF) */}
      {activeTab === 'import' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Import via Excel */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Impor dari File Excel (.xlsx / .csv)</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Unggah file spreadsheet Excel berisi data guru dan data siswa per kelas. Kolom otomatis dikenali: Nama Lengkap, Username, Password, Peran (guru/siswa), Kelas, dan NIP/NISN.
              </p>

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Format Template Siap Pakai
                </p>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Unduh template resmi kami untuk memastikan susunan kolom data rapi dan presisi.
                </p>
                <button
                  type="button"
                  onClick={downloadUserTemplateExcel}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Template_Import_Pengguna.xlsx</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="excel-user-upload"
              />
              <label
                htmlFor="excel-user-upload"
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-md transition ${
                  isProcessingFile ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessingFile ? 'Memproses File...' : 'Pilih File Excel & Unggah'}</span>
              </label>
            </div>
          </div>

          {/* Card 2: Import via PDF Text */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Impor dari Teks Dokumen / PDF</h3>
              <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                Salin (copy-paste) daftar nama guru atau siswa dari dokumen PDF atau Word Anda ke kotak teks di bawah ini.
              </p>

              <div className="mt-4">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Tempelkan (Paste) Teks PDF / Word:
                </label>
                <textarea
                  rows={5}
                  value={pastedPdfText}
                  onChange={(e) => setPastedPdfText(e.target.value)}
                  placeholder={`Contoh format (tiap baris):&#10;1. Rizky Pratama, 0081234567, siswa, X MIPA 1, rizky123&#10;2. Drs. Supriyanto, 197401012000031001, guru, -, pass123`}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleParsePdfText}
                disabled={!pastedPdfText.trim() || isProcessingFile}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 shadow-md transition"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Proses & Simpan Data Pengguna</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Tambah Akun Baru Manual (Admin, Guru, Siswa) */}
      {activeTab === 'manual' && (
        <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Tambah Akun Pengguna Baru</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Pilih peran untuk menambahkan akun Admin baru, Guru pengampu, atau Siswa per kelas.
              </p>
            </div>
            {/* Quick Role Select Buttons */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'admin' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  formData.role === 'admin'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Admin
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'guru' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  formData.role === 'guru'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Guru
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, role: 'siswa' })}
                className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                  formData.role === 'siswa'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                + Siswa
              </button>
            </div>
          </div>

          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Peran Pengguna (Role) *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold bg-white"
                >
                  <option value="admin">Administrator (Hak Akses Penuh)</option>
                  <option value="guru">Guru / Tenaga Pendidik</option>
                  <option value="siswa">Siswa / Peserta Didik</option>
                </select>
              </div>

              {formData.role === 'admin' && (
                <div className="sm:col-span-1 p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-900 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Akun Administrator baru dapat mengelola seluruh data guru, siswa, kelas, dan akun admin lainnya.</span>
                </div>
              )}

              {formData.role === 'siswa' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas / Rombel *</label>
                  <select
                    value={formData.kelas}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    {classesList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {formData.role === 'guru' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran Diampu *</label>
                  <select
                    value={formData.mataPelajaran}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    <option value="">-- Pilih Mata Pelajaran Utama --</option>
                    {mataPelajaranList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap *</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Masukkan nama lengkap dengan gelar jika ada"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Username Login *</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="Contoh: siswa_andi / 007654"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Password *</label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Password untuk login"
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {formData.role === 'guru' ? 'NIP' : 'NISN'}
                </label>
                <input
                  type="text"
                  value={formData.nipNisn}
                  onChange={(e) => setFormData({ ...formData, nipNisn: e.target.value })}
                  placeholder={formData.role === 'guru' ? 'Nomor Induk Pegawai' : 'Nomor Induk Siswa Nasional'}
                  className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Sekolah</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="user@sekolah.sch.id"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('daftar')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition"
              >
                Simpan Akun Pengguna
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-slate-900 mb-4">Edit Data Pengguna</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    value={editingUser.username}
                    onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Password</label>
                  <input
                    type="text"
                    value={editingUser.password}
                    onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                    className="w-full px-3 py-2 text-xs font-mono border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              {editingUser.role === 'siswa' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kelas</label>
                  <select
                    value={editingUser.kelas || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, kelas: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    {classesList.map((k) => (
                      <option key={k} value={k}>
                        {k}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateUser(editingUser);
                    setEditingUser(null);
                  }}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Perbarui
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
