import React, { useState, useRef } from 'react';
import { useLMS } from '../../context/LMSContext';
import { User, UserRole, Exam, LessonMaterial } from '../../types';
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
  ArrowRightLeft,
  Printer,
  Eye,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  LayoutGrid,
  List,
  FileCheck,
  Check,
  Clock,
  Award,
  RotateCcw,
  X,
  ShieldAlert,
} from 'lucide-react';
import {
  parseExcelUsers,
  downloadUserTemplateExcel,
  downloadGuruTemplateExcel,
  exportUsersExcel,
  exportGradesExcel,
} from '../../utils/fileParser';
import { exportGradesPdf } from '../../utils/pdfExport';
import {
  printExamDirectly,
  exportExamPdf,
  exportExamWordDoc,
  printMaterialDirectly,
  exportMaterialPdf,
} from '../../utils/examPrintExport';
import { ExamViewModal } from '../common/ExamViewModal';
import { MaterialViewModal } from '../common/MaterialViewModal';
import { RombelManager } from './RombelManager';
import { MapelManager } from './MapelManager';
import { PlottingGuruManager } from './PlottingGuruManager';
import { DaftarSiswaPerKelas } from '../guru/DaftarSiswaPerKelas';

export const AdminDashboard: React.FC = () => {
  const {
    users,
    addUser,
    updateUser,
    deleteUser,
    deleteUsers,
    importUsers,
    exams,
    deleteExam,
    submissions,
    resetExamSubmission,
    resetExamParticipant,
    resetExamParticipantsByClass,
    materials,
    deleteMaterial,
    rombelList,
    mataPelajaranList,
    kelasMapelPengampuList,
  } = useLMS();

  const [activeTab, setActiveTab] = useState<
    'daftar' | 'siswa_kelas' | 'rombel' | 'mapel' | 'plotting' | 'asesmen_guru' | 'materi_guru' | 'import' | 'manual'
  >('daftar');
  const [navOrientation, setNavOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [plottingTargetKelas, setPlottingTargetKelas] = useState<string>('X MIPA 1');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [kelasFilter, setKelasFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);

  // Modals for Viewing Exam, Material, and Participants/Reset
  const [selectedExamForView, setSelectedExamForView] = useState<Exam | null>(null);
  const [selectedMaterialForView, setSelectedMaterialForView] = useState<LessonMaterial | null>(null);
  const [selectedExamForParticipants, setSelectedExamForParticipants] = useState<Exam | null>(null);
  const [adminParticipantClassFilter, setAdminParticipantClassFilter] = useState<string>('all');

  // Filters for Monitoring Asesmen Guru
  const [examSearch, setExamSearch] = useState('');
  const [examGuruFilter, setExamGuruFilter] = useState('all');
  const [examMapelFilter, setExamMapelFilter] = useState('all');
  const [examStatusFilter, setExamStatusFilter] = useState('all');

  // Filters for Monitoring Materi Guru
  const [materialSearch, setMaterialSearch] = useState('');
  const [materialGuruFilter, setMaterialGuruFilter] = useState('all');
  const [materialMapelFilter, setMaterialMapelFilter] = useState('all');

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
          const kelas = parts[3]?.trim() || undefined;
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
            onClick={() => setActiveTab('asesmen_guru')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-2xl p-3.5 border border-white/10 transition group"
            title="Klik untuk monitoring semua Asesmen & Ujian Guru"
          >
            <div className="flex items-center justify-between text-indigo-300 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <span>Asesmen Guru</span>
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-white">Lihat →</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{exams.length}</p>
          </div>

          <div
            onClick={() => setActiveTab('materi_guru')}
            className="bg-white/5 hover:bg-white/10 cursor-pointer rounded-2xl p-3.5 border border-white/10 transition group"
            title="Klik untuk monitoring semua Materi & Modul PDF Guru"
          >
            <div className="flex items-center justify-between text-emerald-300 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Materi PDF Guru</span>
              </div>
              <span className="text-[10px] text-white/50 group-hover:text-white">Lihat →</span>
            </div>
            <p className="text-2xl font-black mt-1 text-white">{materials.length}</p>
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

      {/* Navigation Controls: Scrollable Vertically & Horizontally */}
      <div className="mb-6 bg-white rounded-2xl border border-slate-200 p-3 shadow-xs">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Menu Navigasi Administrator</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">
              Bisa di-scroll ke atas / ke bawah
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setNavOrientation(navOrientation === 'horizontal' ? 'vertical' : 'horizontal')}
              className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 transition cursor-pointer"
              title="Ganti mode scroll menu vertikal / horizontal"
            >
              {navOrientation === 'horizontal' ? (
                <>
                  <List className="w-3.5 h-3.5" />
                  <span>Mode Daftar Vertikal</span>
                </>
              ) : (
                <>
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Mode Tab Geser</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Menu Container dengan dukungan scroll ke atas / ke bawah */}
        <div
          className={`${
            navOrientation === 'vertical'
              ? 'max-h-56 overflow-y-auto space-y-1.5 pr-1 p-1 scroll-smooth'
              : 'overflow-x-auto overflow-y-auto max-h-36 sm:max-h-none flex items-center gap-1.5 pb-1 p-1 scroll-smooth'
          }`}
        >
          <button
            onClick={() => setActiveTab('daftar')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'daftar'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Guru & Siswa ({users.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('siswa_kelas')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'siswa_kelas'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-emerald-600" />
            <span>Siswa per Kelas ({studentsCount})</span>
          </button>

          <button
            onClick={() => setActiveTab('asesmen_guru')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'asesmen_guru'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200/80'
            }`}
          >
            <BookOpen className="w-4 h-4 text-indigo-600" />
            <span>Asesmen & Ujian Guru ({exams.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('materi_guru')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'materi_guru'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80'
            }`}
          >
            <FileText className="w-4 h-4 text-emerald-600" />
            <span>Materi Pembelajaran Guru ({materials.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rombel')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'rombel'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <School className="w-4 h-4" />
            <span>Rombongan Kelas ({rombelList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('mapel')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'mapel'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Mata Pelajaran ({mataPelajaranList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('plotting')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'plotting'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Plotting Guru & Mapel</span>
          </button>

          <button
            onClick={() => setActiveTab('import')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'import'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Impor File (Excel & PDF)</span>
          </button>

          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold rounded-xl transition cursor-pointer shrink-0 ${
              activeTab === 'manual'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200/80'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Akun</span>
          </button>
        </div>
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

            <div className="flex items-center gap-3">
              {selectedUserIds.length > 0 && (
                <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl">
                  <span className="text-xs font-bold text-rose-800">
                    {selectedUserIds.length} akun dipilih
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        confirm(
                          `Yakin ingin menghapus ${selectedUserIds.length} akun yang dipilih secara permanen? Data akun yang dihapus tidak dapat dipulihkan.`
                        )
                      ) {
                        deleteUsers(selectedUserIds);
                        setSelectedUserIds([]);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Terpilih</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedUserIds([])}
                    className="text-xs text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    Batal
                  </button>
                </div>
              )}

              <div className="text-xs text-slate-500 font-medium">
                Menampilkan <span className="font-bold text-slate-800">{filteredUsers.length}</span> dari {users.length} pengguna
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredUsers.filter((u) => u.username !== 'darma313adi').length > 0 &&
                        filteredUsers
                          .filter((u) => u.username !== 'darma313adi')
                          .every((u) => selectedUserIds.includes(u.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          const allSelectable = filteredUsers
                            .filter((u) => u.username !== 'darma313adi')
                            .map((u) => u.id);
                          setSelectedUserIds(Array.from(new Set([...selectedUserIds, ...allSelectable])));
                        } else {
                          const currentFilteredIds = new Set(filteredUsers.map((u) => u.id));
                          setSelectedUserIds(selectedUserIds.filter((id) => !currentFilteredIds.has(id)));
                        }
                      }}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Pilih Semua yang Ditampilkan"
                    />
                  </th>
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
                {filteredUsers.map((u) => {
                  const isMasterAdmin = u.username === 'darma313adi';
                  const isSelected = selectedUserIds.includes(u.id);

                  return (
                    <tr
                      key={u.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isSelected ? 'bg-indigo-50/40' : ''
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        {!isMasterAdmin ? (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedUserIds([...selectedUserIds, u.id]);
                              } else {
                                setSelectedUserIds(selectedUserIds.filter((id) => id !== u.id));
                              }
                            }}
                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        ) : (
                          <span title="Akun Super Admin Utama Terlindungi" className="inline-block">
                            <Lock className="w-3.5 h-3.5 text-slate-300 mx-auto" />
                          </span>
                        )}
                      </td>
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
                          {!isMasterAdmin && (
                            <button
                              type="button"
                              onClick={() => {
                                const nextRole: UserRole = u.role === 'siswa' ? 'guru' : 'siswa';
                                const promptText =
                                  u.role === 'siswa'
                                    ? `Ubah peran "${u.name}" dari Siswa menjadi Guru?`
                                    : `Ubah peran "${u.name}" dari Guru menjadi Siswa?`;
                                if (confirm(promptText)) {
                                  updateUser({
                                    ...u,
                                    role: nextRole,
                                    kelas: nextRole === 'siswa' ? (u.kelas || 'X MIPA 1') : undefined,
                                    mataPelajaran: nextRole === 'guru' ? (u.mataPelajaran || 'Biologi') : undefined,
                                  });
                                }
                              }}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                u.role === 'siswa'
                                  ? 'text-blue-600 hover:bg-blue-100'
                                  : 'text-emerald-600 hover:bg-emerald-100'
                              }`}
                              title={u.role === 'siswa' ? 'Ubah Akun Ini Menjadi Guru' : 'Ubah Akun Ini Menjadi Siswa'}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => setEditingUser(u)}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200 transition"
                            title="Edit Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {!isMasterAdmin && (
                            <button
                              onClick={() => {
                                if (
                                  confirm(
                                    `Yakin ingin menghapus akun ${u.role.toUpperCase()} "${u.name}" (@${u.username})? Tindakan ini tidak dapat dibatalkan.`
                                  )
                                ) {
                                  deleteUser(u.id);
                                  setSelectedUserIds((prev) => prev.filter((id) => id !== u.id));
                                }
                              }}
                              className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-100 transition cursor-pointer"
                              title="Hapus Akun Pengguna"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: Siswa per Kelas (Requirement #5) */}
      {activeTab === 'siswa_kelas' && (
        <DaftarSiswaPerKelas />
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

      {/* Tab: Monitoring Asesmen & Ujian Guru (Akses Lihat, Cetak, Unduh) */}
      {activeTab === 'asesmen_guru' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-2">
                <BookOpen className="w-3.5 h-3.5" />
                <span>Hak Akses Penuh Administrator</span>
              </span>
              <h2 className="text-xl font-bold">Monitoring Asesmen & Ujian Seluruh Guru</h2>
              <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                Akses resmi untuk <strong>Melihat</strong>, <strong>Mencetak Naskah Ujian</strong>, dan <strong>Mengunduh (PDF & Word)</strong> semua butir soal asesmen yang dibuat oleh para pendidik MAN 11 Jakarta.
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari judul asesmen, kode ujian, nama guru, atau mapel..."
                  value={examSearch}
                  onChange={(e) => setExamSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Guru */}
                <select
                  value={examGuruFilter}
                  onChange={(e) => setExamGuruFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Guru ({users.filter((u) => u.role === 'guru').length})</option>
                  {Array.from(new Set(exams.map((e) => e.guruNama).filter(Boolean))).map((gNama) => (
                    <option key={gNama} value={gNama}>
                      {gNama}
                    </option>
                  ))}
                </select>

                {/* Filter Mapel */}
                <select
                  value={examMapelFilter}
                  onChange={(e) => setExamMapelFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {mataPelajaranList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama}
                    </option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={examStatusFilter}
                  onChange={(e) => setExamStatusFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Status</option>
                  <option value="aktif">Aktif Saja</option>
                  <option value="draft">Draft Saja</option>
                </select>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 font-medium">
              Menampilkan{' '}
              <strong className="text-slate-900">
                {exams.filter((ex) => {
                  if (examGuruFilter !== 'all' && (ex.guruNama || '').toLowerCase() !== examGuruFilter.toLowerCase())
                    return false;
                  if (examMapelFilter !== 'all' && ex.mataPelajaran.toLowerCase() !== examMapelFilter.toLowerCase())
                    return false;
                  if (examStatusFilter !== 'all' && ex.status !== examStatusFilter) return false;
                  if (examSearch.trim()) {
                    const q = examSearch.toLowerCase();
                    return (
                      ex.judul.toLowerCase().includes(q) ||
                      ex.kodeUjian.toLowerCase().includes(q) ||
                      (ex.guruNama || '').toLowerCase().includes(q) ||
                      ex.mataPelajaran.toLowerCase().includes(q)
                    );
                  }
                  return true;
                }).length}
              </strong>{' '}
              dari {exams.length} asesmen terdaftar
            </div>
          </div>

          {/* List Cards Asesmen */}
          <div className="space-y-3">
            {exams
              .filter((ex) => {
                if (examGuruFilter !== 'all' && (ex.guruNama || '').toLowerCase() !== examGuruFilter.toLowerCase())
                  return false;
                if (examMapelFilter !== 'all' && ex.mataPelajaran.toLowerCase() !== examMapelFilter.toLowerCase())
                  return false;
                if (examStatusFilter !== 'all' && ex.status !== examStatusFilter) return false;
                if (examSearch.trim()) {
                  const q = examSearch.toLowerCase();
                  return (
                    ex.judul.toLowerCase().includes(q) ||
                    ex.kodeUjian.toLowerCase().includes(q) ||
                    (ex.guruNama || '').toLowerCase().includes(q) ||
                    ex.mataPelajaran.toLowerCase().includes(q)
                  );
                }
                return true;
              })
              .map((ex) => {
                const subCount = submissions.filter((s) => s.examId === ex.id).length;

                return (
                  <div
                    key={ex.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-indigo-300 transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {ex.mataPelajaran}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              ex.status === 'aktif'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ex.status === 'aktif' ? '● Aktif' : '○ Draft'}
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-500">
                            Kode: {ex.kodeUjian}
                          </span>
                          {ex.tokenUjian && (
                            <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[10px] font-bold">
                              Token: {ex.tokenUjian}
                            </span>
                          )}
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{ex.judul}</h3>
                        <p className="text-xs text-slate-500 line-clamp-1">{ex.deskripsi}</p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                          <span>
                            Guru Pembuat: <strong className="text-indigo-700">{ex.guruNama || 'Guru Mapel'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Target: <strong>{ex.kelasTarget.join(', ')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Durasi: <strong>{ex.durasiMenit} Menit</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Total: <strong>{ex.soalList.length} Butir Soal</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Pengumpulan: <strong className="text-emerald-700">{subCount} Siswa</strong>
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions (Lihat, Cetak, Unduh, Hapus) */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* 1. LIHAT */}
                        <button
                          type="button"
                          onClick={() => setSelectedExamForView(ex)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                          title="Lihat Butir Soal Lengkap"
                        >
                          <Eye className="w-4 h-4 text-indigo-600" />
                          <span>Lihat</span>
                        </button>

                        {/* 2. CETAK */}
                        <div className="inline-flex rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => printExamDirectly(ex, { includeAnswerKey: false })}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition cursor-pointer"
                            title="Cetak Naskah Soal untuk Siswa"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Cetak</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => printExamDirectly(ex, { includeAnswerKey: true })}
                            className="inline-flex items-center px-2 py-2 bg-indigo-700 hover:bg-indigo-800 text-indigo-200 text-[10px] font-bold border-l border-indigo-500 transition cursor-pointer"
                            title="Cetak Naskah + Kunci Jawaban"
                          >
                            + Kunci
                          </button>
                        </div>

                        {/* 3. UNDUH */}
                        <div className="inline-flex rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => exportExamPdf(ex, { includeAnswerKey: false })}
                            className="inline-flex items-center gap-1 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
                            title="Unduh Naskah Soal PDF"
                          >
                            <Download className="w-3.5 h-3.5 text-rose-600" />
                            <span>PDF</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => exportExamWordDoc(ex, { includeAnswerKey: false })}
                            className="inline-flex items-center gap-1 px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs border-l border-slate-200 transition cursor-pointer"
                            title="Unduh Naskah Soal Microsoft Word (.doc)"
                          >
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Word</span>
                          </button>
                        </div>

                        {/* 4. PESERTA & RESET UJIAN */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExamForParticipants(ex);
                            setAdminParticipantClassFilter('all');
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200 transition cursor-pointer shadow-2xs"
                          title="Kelola Peserta Ujian, Unduh Excel Kelas, dan Reset Ujian Siswa/Kelas"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Peserta & Reset ({subCount})</span>
                        </button>

                        {/* 5. HAPUS */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus asesmen "${ex.judul}" buatan ${ex.guruNama}?`)) {
                              deleteExam(ex.id);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Asesmen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab: Monitoring Materi Pembelajaran Guru (Akses Lihat, Cetak, Unduh) */}
      {activeTab === 'materi_guru' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 rounded-3xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-3xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Hak Akses Penuh Administrator</span>
              </span>
              <h2 className="text-xl font-bold">Monitoring Materi & Modul Pembelajaran Seluruh Guru</h2>
              <p className="text-emerald-100/80 text-xs mt-1 leading-relaxed">
                Akses resmi untuk <strong>Melihat</strong>, <strong>Mencetak Lembar Materi</strong>, dan <strong>Mengunduh Dokumen PDF</strong> yang dibagikan guru kepada siswa MAN 11 Jakarta.
              </p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari judul materi, nama file, guru, atau mata pelajaran..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Filter Guru */}
                <select
                  value={materialGuruFilter}
                  onChange={(e) => setMaterialGuruFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Guru Pengunggah</option>
                  {Array.from(new Set(materials.map((m) => m.guruNama).filter(Boolean))).map((gNama) => (
                    <option key={gNama} value={gNama}>
                      {gNama}
                    </option>
                  ))}
                </select>

                {/* Filter Mapel */}
                <select
                  value={materialMapelFilter}
                  onChange={(e) => setMaterialMapelFilter(e.target.value)}
                  className="text-xs bg-white border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="all">Semua Mata Pelajaran</option>
                  {mataPelajaranList.map((m) => (
                    <option key={m.id} value={m.nama}>
                      {m.nama}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-3 text-xs text-slate-500 font-medium">
              Menampilkan{' '}
              <strong className="text-slate-900">
                {materials.filter((m) => {
                  if (materialGuruFilter !== 'all' && (m.guruNama || '').toLowerCase() !== materialGuruFilter.toLowerCase())
                    return false;
                  if (materialMapelFilter !== 'all' && m.mataPelajaran.toLowerCase() !== materialMapelFilter.toLowerCase())
                    return false;
                  if (materialSearch.trim()) {
                    const q = materialSearch.toLowerCase();
                    return (
                      m.judul.toLowerCase().includes(q) ||
                      m.fileName.toLowerCase().includes(q) ||
                      (m.guruNama || '').toLowerCase().includes(q) ||
                      m.mataPelajaran.toLowerCase().includes(q)
                    );
                  }
                  return true;
                }).length}
              </strong>{' '}
              dari {materials.length} materi terdaftar
            </div>
          </div>

          {/* List Cards Materi */}
          {materials.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Belum ada materi pembelajaran yang diunggah oleh guru</p>
            </div>
          ) : (
            <div className="space-y-3">
              {materials
                .filter((m) => {
                  if (materialGuruFilter !== 'all' && (m.guruNama || '').toLowerCase() !== materialGuruFilter.toLowerCase())
                    return false;
                  if (materialMapelFilter !== 'all' && m.mataPelajaran.toLowerCase() !== materialMapelFilter.toLowerCase())
                    return false;
                  if (materialSearch.trim()) {
                    const q = materialSearch.toLowerCase();
                    return (
                      m.judul.toLowerCase().includes(q) ||
                      m.fileName.toLowerCase().includes(q) ||
                      (m.guruNama || '').toLowerCase().includes(q) ||
                      m.mataPelajaran.toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map((m) => (
                  <div
                    key={m.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:border-emerald-300 transition"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Left: Info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {m.mataPelajaran}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                            PDF
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(m.createdAt).toLocaleDateString('id-ID', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900">{m.judul}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2">{m.deskripsi}</p>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 pt-1">
                          <span>
                            Guru Pengunggah: <strong className="text-emerald-800">{m.guruNama || 'Guru Mapel'}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Kelas Sasaran: <strong>{m.kelasTarget.join(', ')}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            File: <strong className="font-mono text-slate-700">{m.fileName}</strong> ({m.fileSize || 'PDF'})
                          </span>
                        </div>
                      </div>

                      {/* Right: Actions (Lihat, Cetak, Unduh, Hapus) */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        {/* 1. LIHAT */}
                        <button
                          type="button"
                          onClick={() => setSelectedMaterialForView(m)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition cursor-pointer"
                          title="Lihat Detail Materi"
                        >
                          <Eye className="w-4 h-4 text-emerald-700" />
                          <span>Lihat</span>
                        </button>

                        {/* 2. CETAK */}
                        <button
                          type="button"
                          onClick={() => printMaterialDirectly(m)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition cursor-pointer shadow-xs"
                          title="Cetak Lembar Modul Pembelajaran"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Cetak</span>
                        </button>

                        {/* 3. UNDUH */}
                        <div className="inline-flex rounded-xl shadow-xs border border-slate-200 overflow-hidden">
                          <button
                            type="button"
                            onClick={() => exportMaterialPdf(m)}
                            className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs transition cursor-pointer"
                            title="Unduh Lembar PDF Rangkuman"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-700" />
                            <span>PDF</span>
                          </button>
                          <a
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                              `[MAN 11 JAKARTA - BAHAN AJAR]\nJudul: ${m.judul}\nMapel: ${m.mataPelajaran}\nKelas: ${m.kelasTarget.join(', ')}\nPengampu: ${m.guruNama}`
                            )}`}
                            download={m.fileName || `${m.judul}.pdf`}
                            className="inline-flex items-center px-2.5 py-2 bg-white hover:bg-slate-50 text-slate-600 font-medium text-xs border-l border-slate-200 transition cursor-pointer"
                            title="Unduh Berkas Asli"
                          >
                            File Asli
                          </a>
                        </div>

                        {/* 4. HAPUS */}
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Yakin ingin menghapus materi "${m.judul}" buatan ${m.guruNama}?`)) {
                              deleteMaterial(m.id);
                            }
                          }}
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title="Hapus Materi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
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
                <div className="mt-2.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={downloadUserTemplateExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template Siswa & Umum (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={downloadGuruTemplateExcel}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-700 text-white font-bold text-xs hover:bg-blue-800 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template Khusus Akun Guru (.xlsx)</span>
                  </button>
                </div>
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

              {/* Role Switcher (Requirement #5: Admin bisa mengubah akun siswa menjadi guru atau sebaliknya) */}
              {editingUser.username !== 'darma313adi' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Peran Akun (Role: Siswa ↔ Guru)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...editingUser,
                          role: 'guru',
                          kelas: undefined,
                          mataPelajaran: editingUser.mataPelajaran || 'Biologi',
                        })
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        editingUser.role === 'guru'
                          ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Akun Guru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingUser({
                          ...editingUser,
                          role: 'siswa',
                          mataPelajaran: undefined,
                          kelas: editingUser.kelas || 'X MIPA 1',
                        })
                      }
                      className={`py-2 px-3 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition cursor-pointer ${
                        editingUser.role === 'siswa'
                          ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <GraduationCap className="w-3.5 h-3.5" />
                      <span>Akun Siswa</span>
                    </button>
                  </div>
                </div>
              )}

              {editingUser.role === 'guru' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran Diampu</label>
                  <select
                    value={editingUser.mataPelajaran || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, mataPelajaran: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                  >
                    <option value="">-- Pilih Mata Pelajaran --</option>
                    {mataPelajaranList.map((m) => (
                      <option key={m.id} value={m.nama}>
                        {m.nama} ({m.kode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

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

      {/* Modal Lihat & Cetak / Unduh Naskah Soal Asesmen */}
      <ExamViewModal
        exam={selectedExamForView}
        isOpen={Boolean(selectedExamForView)}
        onClose={() => setSelectedExamForView(null)}
        canDelete={true}
        onDelete={(ex) => {
          if (
            confirm(
              `Yakin ingin menghapus asesmen "${ex.judul}" buatan ${ex.guruNama}? Seluruh butir soal dan data pengerjaan siswa akan dihapus permanen.`
            )
          ) {
            deleteExam(ex.id);
            setSelectedExamForView(null);
          }
        }}
      />

      {/* Modal Lihat & Cetak / Unduh Materi Pembelajaran */}
      <MaterialViewModal
        material={selectedMaterialForView}
        isOpen={Boolean(selectedMaterialForView)}
        onClose={() => setSelectedMaterialForView(null)}
        canDelete={true}
        onDelete={(m) => {
          if (confirm(`Yakin ingin menghapus materi modul "${m.judul}" buatan ${m.guruNama}?`)) {
            deleteMaterial(m.id);
            setSelectedMaterialForView(null);
          }
        }}
      />

      {/* Modal Kelola Peserta, Unduh Excel Kelas, dan Reset Ujian (Admin) */}
      {selectedExamForParticipants && (() => {
        const examSubs = submissions.filter((s) => s.examId === selectedExamForParticipants.id);
        const availableClasses = Array.from(
          new Set([
            ...(selectedExamForParticipants.kelasTarget || []),
            ...examSubs.map((s) => s.siswaKelas).filter(Boolean),
          ])
        ).sort();

        const filteredSubs =
          adminParticipantClassFilter === 'all'
            ? examSubs
            : examSubs.filter(
                (s) =>
                  (s.siswaKelas || '').trim().toLowerCase() ===
                  adminParticipantClassFilter.trim().toLowerCase()
              );

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
              {/* Header */}
              <div className="p-5 sm:p-6 bg-slate-900 text-white flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                      {selectedExamForParticipants.mataPelajaran}
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-300">
                      Guru: <strong>{selectedExamForParticipants.guruNama || 'Guru Mapel'}</strong>
                    </span>
                    <span className="text-xs text-slate-400">•</span>
                    <span className="text-xs text-slate-300">
                      Target: <strong>{selectedExamForParticipants.kelasTarget.join(', ')}</strong>
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    Kelola Peserta & Reset Ujian: {selectedExamForParticipants.judul}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Total <strong>{examSubs.length}</strong> siswa telah mengirimkan jawaban. Filter per kelas dan reset peserta dapat dilakukan di bawah ini.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedExamForParticipants(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
                  title="Tutup (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Toolbar: Filter Kelas, Unduh Excel, Unduh PDF, Unduh Soal, Reset Per Kelas */}
              <div className="p-4 sm:p-5 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-300 shadow-2xs">
                    <span className="text-xs font-bold text-slate-600">Filter Kelas:</span>
                    <select
                      value={adminParticipantClassFilter}
                      onChange={(e) => setAdminParticipantClassFilter(e.target.value)}
                      className="text-xs font-bold text-slate-900 bg-transparent focus:outline-hidden cursor-pointer"
                    >
                      <option value="all">Semua Kelas ({examSubs.length} Siswa)</option>
                      {availableClasses.map((cls) => {
                        const count = examSubs.filter(
                          (s) => (s.siswaKelas || '').trim().toLowerCase() === cls.trim().toLowerCase()
                        ).length;
                        return (
                          <option key={cls} value={cls}>
                            Kelas {cls} ({count} siswa)
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <span className="text-xs font-semibold text-slate-500">
                    Menampilkan <strong>{filteredSubs.length}</strong> lembar jawaban
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Unduh Excel Nilai */}
                  <button
                    type="button"
                    onClick={() =>
                      exportGradesExcel(
                        examSubs,
                        selectedExamForParticipants,
                        adminParticipantClassFilter === 'all' ? undefined : adminParticipantClassFilter
                      )
                    }
                    disabled={filteredSubs.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    title="Unduh Rekap Nilai Siswa ke Excel (.xlsx)"
                  >
                    <Download className="w-4 h-4" />
                    <span>
                      {adminParticipantClassFilter === 'all'
                        ? 'Unduh Excel (.xlsx)'
                        : `Unduh Excel Kelas ${adminParticipantClassFilter}`}
                    </span>
                  </button>

                  {/* Unduh Laporan Nilai PDF */}
                  <button
                    type="button"
                    onClick={() => {
                      exportGradesPdf({
                        exam: selectedExamForParticipants,
                        submissions: filteredSubs,
                        allStudentsInClass: users.filter((u) => u.role === 'siswa'),
                        kelasName:
                          adminParticipantClassFilter === 'all'
                            ? selectedExamForParticipants.kelasTarget[0] || 'Semua Kelas'
                            : adminParticipantClassFilter,
                        guruName: selectedExamForParticipants.guruNama || 'Guru Pengampu',
                        guruNip: undefined,
                      });
                    }}
                    disabled={filteredSubs.length === 0}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                    title="Unduh Laporan Nilai Resmi Format PDF"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Laporan Nilai (PDF)</span>
                  </button>

                  {/* Unduh Naskah Soal PDF */}
                  <button
                    type="button"
                    onClick={() => exportExamPdf(selectedExamForParticipants, { includeAnswerKey: false })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs shadow-xs transition cursor-pointer"
                    title="Unduh Naskah Soal Ujian Format PDF"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Unduh Soal (PDF)</span>
                  </button>

                  {/* Cetak Soal */}
                  <button
                    type="button"
                    onClick={() => printExamDirectly(selectedExamForParticipants, { includeAnswerKey: false })}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-bold text-xs shadow-xs transition cursor-pointer"
                    title="Cetak Naskah Soal"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Cetak Soal</span>
                  </button>

                  {/* Reset Ujian Per Kelas */}
                  <button
                    type="button"
                    onClick={() => {
                      if (adminParticipantClassFilter === 'all') {
                        alert(
                          'Untuk melakukan Reset Per Kelas, silakan pilih salah satu kelas terlebih dahulu pada Filter Kelas.'
                        );
                        return;
                      }
                      const countInClass = examSubs.filter(
                        (s) =>
                          (s.siswaKelas || '').trim().toLowerCase() ===
                          adminParticipantClassFilter.trim().toLowerCase()
                      ).length;

                      if (countInClass === 0) {
                        alert(
                          `Belum ada siswa di kelas "${adminParticipantClassFilter}" yang mengumpulkan jawaban ujian ini.`
                        );
                        return;
                      }

                      if (
                        confirm(
                          `PERINGATAN RESET KELAS!\n\nApakah Anda yakin ingin mereset ujian seluruh siswa di kelas "${adminParticipantClassFilter}" (${countInClass} siswa)?\n\nSemua lembar jawaban dan skor siswa kelas ${adminParticipantClassFilter} pada ujian "${selectedExamForParticipants.judul}" akan dihapus dari server Firestore. Siswa dapat login kembali dan mengulang ujian.`
                        )
                      ) {
                        resetExamParticipantsByClass(
                          selectedExamForParticipants.id,
                          adminParticipantClassFilter
                        );
                        alert(
                          `Ujian seluruh siswa kelas "${adminParticipantClassFilter}" berhasil direset.`
                        );
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                      adminParticipantClassFilter === 'all'
                        ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                        : 'bg-rose-600 hover:bg-rose-700 text-white'
                    }`}
                    title={
                      adminParticipantClassFilter === 'all'
                        ? 'Pilih kelas tertentu terlebih dahulu untuk mereset ujian per kelas'
                        : `Reset ujian seluruh siswa kelas ${adminParticipantClassFilter}`
                    }
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>
                      {adminParticipantClassFilter === 'all'
                        ? 'Reset Per Kelas'
                        : `Reset Kelas ${adminParticipantClassFilter}`}
                    </span>
                  </button>
                </div>
              </div>

              {/* Table of Submissions */}
              <div className="flex-1 overflow-auto p-4 sm:p-5">
                <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                  <thead className="bg-slate-50 font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">No</th>
                      <th className="px-3 py-2.5">Nama Siswa</th>
                      <th className="px-3 py-2.5">Kelas</th>
                      <th className="px-3 py-2.5">Skor</th>
                      <th className="px-3 py-2.5">Nilai (/100)</th>
                      <th className="px-3 py-2.5">Status</th>
                      <th className="px-3 py-2.5">Pelanggaran</th>
                      <th className="px-3 py-2.5 text-right">Aksi Reset</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredSubs.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                          {adminParticipantClassFilter === 'all'
                            ? 'Belum ada siswa yang mengumpulkan jawaban ujian ini.'
                            : `Belum ada siswa dari kelas ${adminParticipantClassFilter} yang mengumpulkan jawaban.`}
                        </td>
                      </tr>
                    ) : (
                      filteredSubs.map((sub, idx) => {
                        const isPassed = sub.nilai100 >= selectedExamForParticipants.kkm;
                        const violationCount = sub.violations?.length || 0;
                        return (
                          <tr key={sub.id} className="hover:bg-slate-50 transition">
                            <td className="px-3 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="px-3 py-2.5 font-semibold text-slate-900">
                              <div>{sub.siswaNama}</div>
                              <div className="text-[10px] text-slate-400 font-mono">NISN: {sub.siswaNisn}</div>
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[11px] text-slate-700">
                                {sub.siswaKelas}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 font-mono font-semibold text-slate-700">
                              {sub.totalSkor} / {sub.maxSkor}
                            </td>
                            <td className="px-3 py-2.5">
                              <span className="text-sm font-black text-indigo-700 font-mono">{sub.nilai100}</span>
                              <span className="text-slate-400 text-[10px]"> / 100</span>
                            </td>
                            <td className="px-3 py-2.5">
                              <span
                                className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                                  isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {isPassed ? 'TUNTAS' : 'REMIDI'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {violationCount > 0 ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">
                                  <ShieldAlert className="w-3 h-3 text-rose-600" />
                                  {violationCount}x Peringatan
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-bold text-[11px]">Bersih (0)</span>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => {
                                  if (
                                    confirm(
                                      `Yakin ingin mereset ujian siswa "${sub.siswaNama}" (${sub.siswaKelas})?\n\nLembar jawaban dan skor siswa ini akan dihapus dari Firestore. Siswa dapat login kembali dan mengulang ujian ini dari awal.`
                                    )
                                  ) {
                                    resetExamSubmission(sub.id);
                                  }
                                }}
                                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition cursor-pointer"
                                title="Reset Ujian Siswa Ini"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reset Siswa</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedExamForParticipants(null)}
                  className="px-5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
