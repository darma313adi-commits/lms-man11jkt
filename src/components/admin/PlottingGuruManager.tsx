import React, { useState } from 'react';
import { useLMS } from '../../context/LMSContext';
import {
  School,
  BookOpen,
  UserCheck,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Search,
  Filter,
  Check,
  Layers,
  GraduationCap,
  ArrowRight,
} from 'lucide-react';

interface PlottingGuruManagerProps {
  initialKelas?: string;
}

export const PlottingGuruManager: React.FC<PlottingGuruManagerProps> = ({ initialKelas }) => {
  const {
    rombelList,
    mataPelajaranList,
    kelasMapelPengampuList,
    users,
    setKelasMataPelajaran,
    assignGuruPengampu,
    removeMapelFromKelas,
  } = useLMS();

  // Selected Class
  const [selectedKelas, setSelectedKelas] = useState<string>(() => {
    if (initialKelas && rombelList.some((r) => r.nama === initialKelas)) {
      return initialKelas;
    }
    return rombelList[0]?.nama || 'X MIPA 1';
  });

  const [showManageSubjectsModal, setShowManageSubjectsModal] = useState(false);
  const [tempSelectedMapelIds, setTempSelectedMapelIds] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const teachers = users.filter((u) => u.role === 'guru');
  const currentRombel = rombelList.find((r) => r.nama === selectedKelas);

  // Current subjects in this class
  const classSubjects = kelasMapelPengampuList.filter((k) => k.kelasNama === selectedKelas);
  const assignedCount = classSubjects.filter((k) => k.guruId).length;
  const unassignedCount = classSubjects.length - assignedCount;

  const handleOpenSubjectModal = () => {
    setTempSelectedMapelIds(classSubjects.map((k) => k.mapelId));
    setShowManageSubjectsModal(true);
  };

  const handleToggleMapel = (mapelId: string) => {
    setTempSelectedMapelIds((prev) =>
      prev.includes(mapelId) ? prev.filter((id) => id !== mapelId) : [...prev, mapelId]
    );
  };

  const handleSaveSubjects = () => {
    setKelasMataPelajaran(selectedKelas, tempSelectedMapelIds);
    setShowManageSubjectsModal(false);
    triggerToast(`Daftar mata pelajaran untuk ${selectedKelas} berhasil diperbarui! (${tempSelectedMapelIds.length} Mapel)`);
  };

  const handleAssignTeacher = (mapelId: string, guruId: string) => {
    const teacher = teachers.find((t) => t.id === guruId);
    const teacherName = teacher ? teacher.name : '';
    assignGuruPengampu(selectedKelas, mapelId, guruId, teacherName);

    if (guruId) {
      triggerToast(`Guru ${teacherName} berhasil ditugaskan mengajar di ${selectedKelas}!`);
    } else {
      triggerToast(`Penugasan guru untuk mata pelajaran di ${selectedKelas} telah dikosongkan.`);
    }
  };

  const handleRemoveSubject = (mapelId: string, mapelNama: string) => {
    if (confirm(`Hapus mata pelajaran "${mapelNama}" dari ${selectedKelas}?`)) {
      removeMapelFromKelas(selectedKelas, mapelId);
      triggerToast(`Mata pelajaran "${mapelNama}" dihapus dari ${selectedKelas}.`);
    }
  };

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-[11px] text-emerald-700 hover:underline"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Class Selector Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                Plotting Kurikulum & Guru Pengampu
              </span>
              <span className="text-xs text-slate-400">Tahun Ajaran {currentRombel?.tahunAjaran || '2025/2026'}</span>
            </div>
            <h3 className="text-xl font-extrabold text-slate-900">
              Pilih Rombongan Kelas Sasaran
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tentukan mata pelajaran yang dipelajari dan atur nama guru yang mengajar di setiap kelas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenSubjectModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tentukan / Ubah Mapel Kelas Ini</span>
            </button>
          </div>
        </div>

        {/* Horizontal Chips of Rombel */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 pb-1">
          {rombelList.map((r) => {
            const isSelected = r.nama === selectedKelas;
            const subjectsCount = kelasMapelPengampuList.filter((k) => k.kelasNama === r.nama).length;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setSelectedKelas(r.nama)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition shrink-0 flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <School className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{r.nama}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {subjectsCount} Mapel
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Class Overview Banner */}
      {currentRombel && (
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center font-black text-xl text-indigo-300 border border-white/15">
              {currentRombel.tingkat}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-xl font-black">{currentRombel.nama}</h4>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/20 text-white">
                  Peminatan {currentRombel.jurusan}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                Wali Kelas: <span className="font-bold text-white">{currentRombel.waliKelasNama || 'Belum Ditentukan'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
              <span className="text-indigo-200 block text-[10px]">Total Mapel</span>
              <span className="text-lg font-black">{classSubjects.length}</span>
            </div>
            <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
              <span className="text-emerald-300 block text-[10px]">Guru Terplotting</span>
              <span className="text-lg font-black text-emerald-400">{assignedCount}</span>
            </div>
            <div className="bg-white/10 px-3.5 py-2 rounded-xl border border-white/10 text-center">
              <span className="text-amber-300 block text-[10px]">Belum Ada Guru</span>
              <span className="text-lg font-black text-amber-400">{unassignedCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Subjects & Teachers Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Daftar Mata Pelajaran & Plotting Guru di Kelas {selectedKelas}
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Pilih guru dari daftar dropdown untuk setiap mata pelajaran. Perubahan langsung tersimpan ke sistem.
            </p>
          </div>

          <button
            type="button"
            onClick={handleOpenSubjectModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Kelola Mata Pelajaran ({classSubjects.length})</span>
          </button>
        </div>

        {classSubjects.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3.5">No</th>
                  <th className="px-4 py-3.5">Kode</th>
                  <th className="px-4 py-3.5">Mata Pelajaran</th>
                  <th className="px-4 py-3.5">Kategori</th>
                  <th className="px-4 py-3.5 min-w-[280px]">Guru Pengampu yang Mengajar di Kelas Ini *</th>
                  <th className="px-4 py-3.5 text-center">Status Plotting</th>
                  <th className="px-4 py-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {classSubjects.map((item, idx) => {
                  const mapelDetail = mataPelajaranList.find((m) => m.id === item.mapelId);
                  const isAssigned = !!item.guruId;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="px-4 py-3.5 text-slate-400 font-bold">{idx + 1}</td>
                      <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200">
                          {item.mapelKode || mapelDetail?.kode || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {item.mapelNama}
                      </td>
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                          {mapelDetail?.kategori || 'Umum'}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="relative">
                          <select
                            value={item.guruId || ''}
                            onChange={(e) => handleAssignTeacher(item.mapelId, e.target.value)}
                            className={`w-full px-3 py-2 text-xs font-semibold rounded-xl border transition ${
                              isAssigned
                                ? 'bg-emerald-50/40 border-emerald-300 text-emerald-950 focus:ring-2 focus:ring-emerald-500'
                                : 'bg-amber-50/40 border-amber-300 text-amber-950 focus:ring-2 focus:ring-amber-500'
                            }`}
                          >
                            <option value="">-- Belum Ada Guru Pengampu --</option>
                            {teachers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.name} {t.nip ? `(NIP: ${t.nip})` : ''} {t.mataPelajaran ? `• ${t.mataPelajaran}` : ''}
                              </option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isAssigned ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sudah Terplot</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Belum Diampu</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(item.mapelId, item.mapelNama)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus mata pelajaran dari kelas ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 px-4">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h5 className="text-sm font-bold text-slate-700">
              Belum ada mata pelajaran yang ditentukan untuk {selectedKelas}
            </h5>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
              Klik tombol di bawah untuk memilih mata pelajaran apa saja yang akan dipelajari di kelas ini.
            </p>
            <button
              type="button"
              onClick={handleOpenSubjectModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tentukan Mata Pelajaran Kelas {selectedKelas}</span>
            </button>
          </div>
        )}
      </div>

      {/* Modal: Tentukan Mata Pelajaran untuk Kelas Ini */}
      {showManageSubjectsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 animate-in fade-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Tentukan Mata Pelajaran untuk {selectedKelas}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Centang mata pelajaran yang diajarkan pada kurikulum kelas ini.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManageSubjectsModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center justify-between gap-2 mb-4 p-2.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">
                {tempSelectedMapelIds.length} dari {mataPelajaranList.length} Mapel Terpilih
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTempSelectedMapelIds(mataPelajaranList.map((m) => m.id))}
                  className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100 rounded-lg transition"
                >
                  Pilih Semua
                </button>
                <button
                  type="button"
                  onClick={() => setTempSelectedMapelIds([])}
                  className="px-2.5 py-1 text-[11px] font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition"
                >
                  Hapus Pilihan
                </button>
              </div>
            </div>

            {/* List of Subjects with Checkboxes */}
            <div className="overflow-y-auto space-y-2 flex-1 pr-1">
              {mataPelajaranList.map((m) => {
                const isChecked = tempSelectedMapelIds.includes(m.id);
                return (
                  <div
                    key={m.id}
                    onClick={() => handleToggleMapel(m.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition select-none ${
                      isChecked
                        ? 'bg-indigo-50/70 border-indigo-300 text-indigo-950 ring-1 ring-indigo-200'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center border transition ${
                          isChecked
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs">{m.nama}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-600">
                            {m.kode}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500">
                          {m.kategori} • KKM: {m.kkmDefault} • {m.jamPerMinggu || 4} JP
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isChecked ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isChecked ? 'Aktif di Kelas' : 'Tidak Aktif'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Mata pelajaran yang tidak dicentang akan dikeluarkan dari kelas {selectedKelas}.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowManageSubjectsModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveSubjects}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition"
                >
                  Simpan Mata Pelajaran
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
