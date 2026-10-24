import React, { useState, useMemo } from 'react';
import { useLMS } from '../../context/LMSContext';
import { User, ExamSubmission } from '../../types';
import {
  Users,
  Search,
  School,
  GraduationCap,
  Award,
  BookOpen,
  CheckCircle2,
  AlertTriangle,
  Download,
  Filter,
  Eye,
  FileSpreadsheet,
  X,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';

export const DaftarSiswaPerKelas: React.FC = () => {
  const { users, submissions, exams, currentUser } = useLMS();

  // All student users
  const allStudents = useMemo(() => {
    return users.filter((u) => u.role === 'siswa');
  }, [users]);

  // Distinct classes list
  const classesList = useMemo(() => {
    const list = Array.from(
      new Set(allStudents.map((s) => s.kelas?.trim()).filter(Boolean) as string[])
    ).sort();
    return list.length > 0 ? list : ['X MIPA 1', 'X MIPA 2', 'XI MIPA 1', 'XI IPS 1'];
  }, [allStudents]);

  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<User | null>(null);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return allStudents.filter((s) => {
      if (selectedClass !== 'all' && s.kelas?.trim().toLowerCase() !== selectedClass.toLowerCase()) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          s.name.toLowerCase().includes(q) ||
          s.username.toLowerCase().includes(q) ||
          (s.nisn && s.nisn.includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [allStudents, selectedClass, searchQuery]);

  // Class stats
  const classStats = useMemo(() => {
    const studentsInClass =
      selectedClass === 'all'
        ? allStudents
        : allStudents.filter((s) => s.kelas?.trim().toLowerCase() === selectedClass.toLowerCase());

    const studentIds = new Set(studentsInClass.map((s) => s.id));
    const studentNames = new Set(studentsInClass.map((s) => s.name.toLowerCase()));

    const classSubs = submissions.filter(
      (sub) => studentIds.has(sub.siswaId) || studentNames.has(sub.siswaNama.toLowerCase())
    );

    const avgScore =
      classSubs.length > 0
        ? Math.round(classSubs.reduce((acc, c) => acc + c.nilai100, 0) / classSubs.length)
        : null;

    const activeCount = studentsInClass.filter((s) => s.status === 'aktif').length;

    return {
      totalSiswa: studentsInClass.length,
      activeCount,
      totalSubs: classSubs.length,
      avgScore,
    };
  }, [allStudents, selectedClass, submissions]);

  const handleExportExcel = () => {
    const dataToExport = filteredStudents.map((s, idx) => {
      const studentSubs = submissions.filter(
        (sub) => sub.siswaId === s.id || sub.siswaNama.toLowerCase() === s.name.toLowerCase()
      );
      const avg =
        studentSubs.length > 0
          ? Math.round(studentSubs.reduce((acc, c) => acc + c.nilai100, 0) / studentSubs.length)
          : 0;

      return {
        No: idx + 1,
        'Nama Lengkap Siswa': s.name,
        'NISN': s.nisn || '-',
        'Username Login': s.username,
        'Kelas / Rombel': s.kelas || '-',
        'Status Akun': s.status.toUpperCase(),
        'Jumlah Ujian Diikuti': studentSubs.length,
        'Rata-rata Skor (100)': avg,
        Email: s.email || '-',
      };
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    const sheetName = selectedClass === 'all' ? 'Semua_Siswa' : selectedClass.replace(/\s+/g, '_');
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `MAN11_Daftar_Siswa_${sheetName}.xlsx`);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg">
              <School className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Daftar Siswa per Kelas — MAN 11 Jakarta
            </h2>
          </div>
          <p className="text-xs text-slate-500">
            Pantau roster peserta didik per rombongan belajar (rombel), keaktifan akun, dan pencapaian asesmen CBT.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportExcel}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer self-start md:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Ekspor Siswa (.xlsx)</span>
        </button>
      </div>

      {/* Class Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => setSelectedClass('all')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer ${
            selectedClass === 'all'
              ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
          }`}
        >
          Semua Kelas ({allStudents.length})
        </button>

        {classesList.map((cls) => {
          const count = allStudents.filter(
            (s) => s.kelas?.trim().toLowerCase() === cls.toLowerCase()
          ).length;
          const isSelected = selectedClass.toLowerCase() === cls.toLowerCase();

          return (
            <button
              key={cls}
              type="button"
              onClick={() => setSelectedClass(cls)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>{cls}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Quick Summary Cards for Selected Class */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Total Siswa Terdaftar
          </span>
          <p className="text-2xl font-black text-slate-900 mt-1">
            {classStats.totalSiswa} <span className="text-xs font-semibold text-slate-500">Siswa</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {selectedClass === 'all' ? 'Seluruh rombel' : `Kelas ${selectedClass}`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Akun Aktif
          </span>
          <p className="text-2xl font-black text-emerald-600 mt-1">
            {classStats.activeCount} <span className="text-xs font-semibold text-slate-500">Siswa</span>
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Siap mengikuti ujian CBT</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Ujian Diselesaikan
          </span>
          <p className="text-2xl font-black text-indigo-600 mt-1">
            {classStats.totalSubs} <span className="text-xs font-semibold text-slate-500">Lembar</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Terkumpul & dinilai</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
            Rata-rata Nilai Kelas
          </span>
          <p className="text-2xl font-black text-amber-500 mt-1">
            {classStats.avgScore !== null ? `${classStats.avgScore}` : '-'}
            <span className="text-xs font-semibold text-slate-500"> / 100</span>
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">Rerata seluruh asesmen</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, NISN, atau username siswa..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <span className="text-xs font-semibold text-slate-600 self-end sm:self-auto">
          Menampilkan <strong>{filteredStudents.length}</strong> dari {allStudents.length} siswa
        </span>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Tidak ada siswa yang cocok</h4>
            <p className="text-xs text-slate-500 mt-1">
              Periksa filter kelas atau kata kunci pencarian Anda.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                <tr>
                  <th className="py-3 px-4">No</th>
                  <th className="py-3 px-4">Nama Siswa</th>
                  <th className="py-3 px-4">NISN / Username</th>
                  <th className="py-3 px-4">Kelas</th>
                  <th className="py-3 px-4">Status Akun</th>
                  <th className="py-3 px-4 text-center">Ujian Selesai</th>
                  <th className="py-3 px-4 text-right">Rata-rata Nilai</th>
                  <th className="py-3 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((s, idx) => {
                  const studentSubs = submissions.filter(
                    (sub) =>
                      sub.siswaId === s.id || sub.siswaNama.toLowerCase() === s.name.toLowerCase()
                  );
                  const avg =
                    studentSubs.length > 0
                      ? Math.round(
                          studentSubs.reduce((acc, c) => acc + c.nilai100, 0) / studentSubs.length
                        )
                      : null;

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-4 font-mono text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block leading-tight">{s.name}</span>
                            <span className="text-[11px] text-slate-400">{s.email || `${s.username}@siswa.sch.id`}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-slate-700 font-medium block">
                          {s.nisn || '-'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">@{s.username}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md font-bold text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.kelas || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'aktif'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {s.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {studentSubs.length} Ujian
                      </td>
                      <td className="py-3 px-4 text-right">
                        {avg !== null ? (
                          <span
                            className={`font-black font-mono text-xs px-2 py-0.5 rounded ${
                              avg >= 75
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-amber-50 text-amber-700'
                            }`}
                          >
                            {avg} / 100
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => setSelectedStudentForDetail(s)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] transition inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Rincian</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detail Hasil Ujian Siswa */}
      {selectedStudentForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
                  <GraduationCap className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold leading-tight">
                    Transkrip Hasil Ujian: {selectedStudentForDetail.name}
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Kelas: {selectedStudentForDetail.kelas} • NISN: {selectedStudentForDetail.nisn || '-'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {(() => {
                const studentSubs = submissions.filter(
                  (sub) =>
                    sub.siswaId === selectedStudentForDetail.id ||
                    sub.siswaNama.toLowerCase() === selectedStudentForDetail.name.toLowerCase()
                );

                if (studentSubs.length === 0) {
                  return (
                    <div className="p-8 text-center">
                      <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-700">Belum Ada Riwayat Ujian</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Siswa ini belum menyelesaikan asesmen sumatif maupun formatif.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {studentSubs.map((sub) => {
                      const examObj = exams.find((e) => e.id === sub.examId);
                      const isPassed = sub.nilai100 >= (examObj?.kkm || 75);

                      return (
                        <div
                          key={sub.id}
                          className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 flex flex-col justify-between gap-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                                {sub.mataPelajaran}
                              </span>
                              <h4 className="font-bold text-slate-900 text-sm mt-1">{sub.examJudul}</h4>
                              <p className="text-[11px] text-slate-500">
                                Waktu Selesai: {sub.waktuSelesai ? new Date(sub.waktuSelesai).toLocaleString('id-ID') : '-'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-lg font-black font-mono text-indigo-700">
                                {sub.nilai100}
                              </span>
                              <span className="text-slate-400 text-[10px]"> / 100</span>
                              <div>
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase ${
                                    isPassed
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {isPassed ? 'TUNTAS' : 'REMIDI'}
                                </span>
                              </div>
                            </div>
                          </div>

                          {sub.violations && sub.violations.length > 0 && (
                            <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl text-[11px] text-rose-800 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                              <span>
                                Terdeteksi {sub.violations.length} insiden kecurangan selama ujian.
                              </span>
                            </div>
                          )}

                          {sub.catatanGuru && (
                            <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 italic">
                              Catatan Guru: "{sub.catatanGuru}"
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
