import React, { useState } from 'react';
import { useLMS } from '../../context/LMSContext';
import { Exam, ExamSubmission, LessonMaterial } from '../../types';
import {
  GraduationCap,
  BookOpen,
  Clock,
  Play,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileText,
  Calendar,
  Award,
  ChevronRight,
  Maximize,
  Download,
  Eye,
  FolderOpen,
  Key,
  Lock,
  CalendarDays,
  XCircle,
} from 'lucide-react';

export const SiswaDashboard: React.FC = () => {
  const { currentUser, exams, submissions, startExamSession, materials } = useLMS();
  const [selectedExamToStart, setSelectedExamToStart] = useState<Exam | null>(null);
  const [activeTab, setActiveTab] = useState<'aktif' | 'materi' | 'riwayat'>('aktif');
  const [previewMaterial, setPreviewMaterial] = useState<LessonMaterial | null>(null);
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState<string | null>(null);

  if (!currentUser) return null;

  // Filter exams targetting this student's class
  const studentClass = currentUser.kelas || 'X MIPA 1';
  const availableExams = exams.filter(
    (ex) =>
      ex.kelasTarget.includes(studentClass) ||
      ex.kelasTarget.some((k) => studentClass.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(studentClass.toLowerCase())) ||
      ex.kelasTarget.includes('Semua Kelas')
  );

  // Filter materials for this student's class
  const availableMaterials = materials.filter(
    (m) =>
      m.kelasTarget.some(
        (k) =>
          studentClass.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(studentClass.toLowerCase()) ||
          k.toLowerCase().includes('semua')
      ) || m.kelasTarget.length === 0
  );

  const studentSubmissions = submissions.filter((s) => s.siswaId === currentUser.id);

  const handleOpenStartExamModal = (exam: Exam) => {
    setSelectedExamToStart(exam);
    setTokenInput('');
    setTokenError(null);
  };

  const handleConfirmStartExam = (exam: Exam) => {
    // Check token if required
    if (exam.useToken) {
      const entered = tokenInput.trim().toUpperCase();
      if (!entered) {
        setTokenError('Wajib memasukkan Token Ujian yang diberikan oleh Guru Pengawas!');
        return;
      }

      if (exam.tokenList && exam.tokenList.length > 0) {
        const matched = exam.tokenList.find(
          (t) => t.token.trim().toUpperCase() === entered
        );
        if (!matched) {
          setTokenError(`Token ujian "${entered}" tidak valid / tidak ditemukan! Silakan tanyakan token aktif pada guru pengawas.`);
          return;
        }

        const expireTime = new Date(matched.expiresAt).getTime();
        if (Date.now() >= expireTime) {
          setTokenError(`Token "${entered}" (${matched.label}) sudah KADALUARSA (melewati batas waktu 10 menit)! Silakan minta token baru yang masih aktif kepada guru pengawas.`);
          return;
        }
      } else if (exam.tokenUjian) {
        if (entered !== exam.tokenUjian.trim().toUpperCase()) {
          setTokenError(`Token ujian "${entered}" tidak valid! Silakan tanyakan token resmi kepada guru pengawas.`);
          return;
        }
      }
    }

    setSelectedExamToStart(null);
    setTokenInput('');
    setTokenError(null);
    startExamSession(exam, currentUser);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Student Profile Hero Card */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg shadow-emerald-500/30">
              {currentUser.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Akun Siswa Aktif
                </span>
                <span className="text-xs text-teal-200">Kelas: {studentClass}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Halo, {currentUser.name}!
              </h1>
              <p className="text-xs text-slate-300 mt-0.5">
                NISN: <span className="font-mono text-emerald-300 font-bold">{currentUser.nisn || currentUser.username}</span> • Selamat datang di portal Computer-Based Test
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/10 rounded-2xl p-4 border border-white/10 backdrop-blur">
            <div className="text-center px-2">
              <span className="text-xs text-emerald-200 font-medium">Ujian Tersedia</span>
              <p className="text-2xl font-black">{availableExams.length}</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center px-2">
              <span className="text-xs text-emerald-200 font-medium">Ujian Selesai</span>
              <p className="text-2xl font-black">
                {studentSubmissions.filter((s) => s.status === 'sudah_dikumpulkan').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('aktif')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'aktif'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Jadwal Ujian Aktif ({availableExams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('materi')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'materi'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Materi & Modul PDF ({availableMaterials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('riwayat')}
          className={`flex items-center gap-2 px-5 py-3 text-xs font-bold border-b-2 transition ${
            activeTab === 'riwayat'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Riwayat Nilai & Hasil ({studentSubmissions.length})</span>
        </button>
      </div>

      {/* TAB 1: Ujian Tersedia / Aktif */}
      {activeTab === 'aktif' && (
        <div className="space-y-4">
          {availableExams.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Tidak ada ujian yang sedang berlangsung</h3>
              <p className="text-xs text-slate-500 mt-1">
                Semua asesmen untuk kelas {studentClass} belum dimulai atau telah selesai.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {availableExams.map((exam) => {
                const existingSub = submissions.find(
                  (s) => s.examId === exam.id && s.siswaId === currentUser.id
                );
                const isFinished = existingSub?.status === 'sudah_dikumpulkan';

                const isExamActive = exam.status === 'aktif';
                const now = Date.now();
                const startTime = exam.waktuMulai ? new Date(exam.waktuMulai).getTime() : null;
                const expireTime = exam.waktuKadaluarsa ? new Date(exam.waktuKadaluarsa).getTime() : null;
                const isNotStarted = startTime !== null && !isNaN(startTime) && now < startTime;
                const isExpired = expireTime !== null && !isNaN(expireTime) && now > expireTime;
                const canStart = isExamActive && !isNotStarted && !isExpired;

                return (
                  <div
                    key={exam.id}
                    className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            {exam.mataPelajaran}
                          </span>
                          {!isExamActive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              🔴 Nonaktif
                            </span>
                          ) : isNotStarted ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              ⏳ Belum Mulai
                            </span>
                          ) : isExpired ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              ⌛ Waktu Habis
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              🟢 Sedang Dibuka
                            </span>
                          )}
                          {exam.useToken && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                              <Key className="w-2.5 h-2.5" />
                              Wajib Token
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs font-bold text-slate-500">
                          Kode: {exam.kodeUjian}
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {exam.judul}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                        {exam.deskripsi}
                      </p>

                      {/* Schedule info if set */}
                      {(exam.waktuMulai || exam.waktuKadaluarsa) && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                          <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                            <CalendarDays className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                            <span>Jadwal Akses Soal:</span>
                          </div>
                          <div className="pl-5 text-slate-500 text-[10px] space-y-0.5">
                            {exam.waktuMulai && (
                              <p>Mulai: <strong className="text-slate-700 font-mono">{new Date(exam.waktuMulai).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>
                            )}
                            {exam.waktuKadaluarsa && (
                              <p>Batas Selesai: <strong className="text-slate-700 font-mono">{new Date(exam.waktuKadaluarsa).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</strong></p>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-100 text-xs text-slate-600">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Durasi</span>
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            {exam.durasiMenit} Menit
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Jumlah Soal</span>
                          <span className="font-bold text-slate-800">
                            {exam.soalList.length} Butir
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">KKM</span>
                          <span className="font-bold text-emerald-600">{exam.kkm}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100">
                      {isFinished ? (
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            Sudah Dikerjakan (Nilai: {existingSub.nilai100}/100)
                          </span>
                          <button
                            onClick={() => startExamSession(exam, currentUser)}
                            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          >
                            Tinjau Hasil
                          </button>
                        </div>
                      ) : !isExamActive ? (
                        <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200">
                          <Lock className="w-4 h-4" />
                          <span>Ujian Nonaktif (Belum Diizinkan Guru)</span>
                        </div>
                      ) : isNotStarted ? (
                        <div className="w-full py-3 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-amber-200">
                          <Clock className="w-4 h-4 text-amber-600" />
                          <span>Belum Dibuka (Menunggu Jadwal Mulai)</span>
                        </div>
                      ) : isExpired ? (
                        <div className="w-full py-3 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200">
                          <XCircle className="w-4 h-4 text-slate-400" />
                          <span>Waktu Ujian Telah Berakhir</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenStartExamModal(exam)}
                          className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 transition"
                        >
                          {exam.useToken ? <Key className="w-4 h-4" /> : <Play className="w-4 h-4 fill-white" />}
                          <span>{exam.useToken ? 'Masukkan Token & Mulai Ujian' : 'Mulai Mengerjakan Ujian'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB MATERI PEMBELAJARAN PDF SISWA */}
      {activeTab === 'materi' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-teal-500/30 text-teal-200 border border-teal-400/30 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Bahan Ajar Resmi MAN 11 Jakarta</span>
              </span>
              <h2 className="text-xl font-bold">Modul & Materi Pembelajaran PDF Kelas {studentClass}</h2>
              <p className="text-teal-100/80 text-xs mt-1 leading-relaxed">
                Pelajari materi bahan ajar digital, rangkuman bab, dan materi pengayaan yang telah dibagikan oleh guru pengampu Anda untuk persiapan Asesmen Sumatif.
              </p>
            </div>
          </div>

          {availableMaterials.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <FolderOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <h3 className="text-sm font-bold text-slate-800">Belum ada materi pelajaran PDF</h3>
              <p className="text-xs text-slate-500 mt-1">
                Guru pengampu Anda belum mengunggah materi pelajaran khusus untuk kelas {studentClass}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {availableMaterials.map((m) => (
                <div
                  key={m.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {m.mataPelajaran}
                      </span>
                      <span className="text-[11px] font-mono font-bold text-slate-400">
                        {m.fileSize}
                      </span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs shrink-0 border border-red-200">
                        PDF
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 leading-snug">{m.judul}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{m.deskripsi}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <span>Guru: <strong className="text-slate-700">{m.guruNama}</strong></span>
                      <span className="text-[11px] text-slate-400">{m.fileName}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewMaterial(m)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Baca Materi PDF</span>
                    </button>
                    <a
                      href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                        `[MAN 11 JAKARTA - MODUL PDF]\nJudul: ${m.judul}\nMapel: ${m.mataPelajaran}\nKelas: ${m.kelasTarget.join(', ')}\nDeskripsi: ${m.deskripsi}\nPengampu: ${m.guruNama}`
                      )}`}
                      download={m.fileName}
                      className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs text-center"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh PDF</span>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Riwayat Nilai */}
      {activeTab === 'riwayat' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-900">Riwayat Asesmen & Nilai Anda</h3>
            <p className="text-xs text-slate-500">Daftar lembar pengerjaan yang telah disubmit ke guru pengampu.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Nama Ujian</th>
                  <th className="px-4 py-3">Mata Pelajaran</th>
                  <th className="px-4 py-3">Waktu Selesai</th>
                  <th className="px-4 py-3">Skor</th>
                  <th className="px-4 py-3">Nilai (/100)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Catatan Guru</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Belum ada riwayat ujian yang selesai dikerjakan.
                    </td>
                  </tr>
                ) : (
                  studentSubmissions.map((sub) => {
                    const isPassed = sub.nilai100 >= 75;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-bold text-slate-900">{sub.examJudul}</td>
                        <td className="px-4 py-3 text-slate-600">{sub.mataPelajaran}</td>
                        <td className="px-4 py-3 font-mono text-slate-500">
                          {sub.waktuSelesai ? new Date(sub.waktuSelesai).toLocaleString('id-ID') : '-'}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-700 font-semibold">
                          {sub.totalSkor} / {sub.maxSkor}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-black text-indigo-700 font-mono">{sub.nilai100}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPassed ? 'TUNTAS' : 'REMIDI'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-medium italic">
                          {sub.catatanGuru || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL TATA TERTIB SEBELUM MEMASUKI UJIAN FULLSCREEN (Requirement 7, 8, 9) */}
      {selectedExamToStart && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8" />
            </div>

            <h3 className="text-lg font-black text-center text-slate-900">
              Konfirmasi Memulai Ujian
            </h3>
            <p className="text-center text-xs text-slate-500 mt-1 font-medium">
              {selectedExamToStart.judul}
            </p>

            <div className="my-5 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2.5">
              <p className="font-bold flex items-center gap-1.5 text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />
                Tata Tertib & Ketentuan Keamanan Fullscreen:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-900/90 leading-relaxed">
                <li>
                  Layar akan otomatis dikunci ke <strong>Mode Layar Penuh (Fullscreen)</strong>.
                </li>
                <li>
                  <strong>Dilarang keluar dari fullscreen atau berpindah tab/jendela.</strong> Percobaan berpindah akan memicu alarm sirine dan dicatat otomatis ke guru pengawas.
                </li>
                <li>
                  Untuk mengakhiri dan keluar dari ujian secara sah, gunakan tombol <strong>"Kirim Jawaban"</strong>.
                </li>
                <li>
                  Durasi pengerjaan: <strong>{selectedExamToStart.durasiMenit} Menit</strong>.
                </li>
              </ul>
            </div>

            {/* Token Ujian Form if required */}
            {selectedExamToStart.useToken && (
              <div className="my-4 p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200 text-left">
                <label className="block text-xs font-bold text-indigo-950 mb-1 flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-600" />
                  <span>Token Masuk Ujian (Wajib dari Guru / Pengawas)</span>
                </label>
                <p className="text-[11px] text-slate-600 mb-2.5 leading-relaxed">
                  Masukkan token ujian yang diberikan oleh guru pengawas untuk membuka lembar kerja soal ini.
                </p>
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => {
                    setTokenInput(e.target.value.toUpperCase());
                    if (tokenError) setTokenError(null);
                  }}
                  placeholder="KETIK TOKEN DI SINI..."
                  className="w-full text-center text-sm font-black font-mono tracking-widest px-4 py-2.5 rounded-xl border-2 border-indigo-300 focus:border-indigo-600 focus:outline-none bg-white uppercase shadow-inner text-indigo-950 placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal"
                  autoFocus
                />
                {tokenError && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-[11px] font-semibold flex items-start gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span className="leading-tight">{tokenError}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedExamToStart(null)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleConfirmStartExam(selectedExamToStart)}
                className="flex-1 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition flex items-center justify-center gap-2"
              >
                <Maximize className="w-4 h-4" />
                <span>Saya Paham, Mulai Ujian</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Baca Materi PDF Siswa */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full p-6 max-h-[88vh] flex flex-col justify-between animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewMaterial.judul}</h3>
                  <p className="text-xs text-slate-500">
                    {previewMaterial.mataPelajaran} • Pengampu: {previewMaterial.guruNama}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Document Reading View */}
            <div className="my-4 overflow-y-auto flex-1 bg-slate-100 border border-slate-200 rounded-2xl p-6 text-slate-800">
              <div className="max-w-xl mx-auto bg-white rounded-xl shadow-xs border border-slate-300 p-6 min-h-[380px] font-serif">
                <div className="text-center pb-4 border-b border-slate-200 mb-5">
                  <span className="text-[10px] uppercase tracking-wider font-sans font-bold text-teal-700">
                    Madrasah Aliyah Negeri 11 Jakarta — Lembar Baca Digital
                  </span>
                  <h2 className="text-lg font-bold font-sans text-slate-900 mt-1">{previewMaterial.judul}</h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Mata Pelajaran: {previewMaterial.mataPelajaran} | Guru: {previewMaterial.guruNama}
                  </p>
                </div>

                <div className="text-xs space-y-3 font-sans leading-relaxed text-slate-700">
                  <div className="p-3 bg-teal-50/70 border border-teal-200 rounded-xl text-teal-950 font-medium text-[11px]">
                    <strong>Petunjuk Belajar:</strong> {previewMaterial.deskripsi}
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs pt-2">Ringkasan Konsep Utama</h4>
                  <p>
                    Pelajari seluruh istilah kunci dan alur konsep dalam bab ini sebelum melaksanakan Asesmen Sumatif Lingkup Materi. 
                    Pastikan Anda memahami perbedaan fungsi, struktur, serta keterkaitan antar bagian.
                  </p>

                  <h4 className="font-bold text-slate-900 text-xs pt-2">Tips Mengerjakan Asesmen</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Baca stimulus dan teks soal dengan seksama pada soal model AKM/TKA.</li>
                    <li>Periksa kembali jawaban sebelum menekan tombol Kirim Jawaban.</li>
                    <li>Jangan keluar dari mode layar penuh selama ujian berlangsung.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Ukuran Dokumen: <span className="font-mono text-slate-700">{previewMaterial.fileSize}</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    `[MAN 11 JAKARTA - MODUL PDF]\nJudul: ${previewMaterial.judul}\nMapel: ${previewMaterial.mataPelajaran}\nKelas: ${previewMaterial.kelasTarget.join(', ')}\nDeskripsi: ${previewMaterial.deskripsi}\nPengampu: ${previewMaterial.guruNama}`
                  )}`}
                  download={previewMaterial.fileName}
                  className="px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl flex items-center gap-1.5 transition shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File PDF</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMaterial(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
