import React, { useState } from 'react';
import { useLMS } from '../../context/LMSContext';
import { RombelKelas } from '../../types';
import {
  School,
  Plus,
  Edit2,
  Trash2,
  Search,
  Users,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  UserCheck,
  CheckCircle,
} from 'lucide-react';

interface RombelManagerProps {
  onSelectPlotting?: (kelasNama: string) => void;
}

export const RombelManager: React.FC<RombelManagerProps> = ({ onSelectPlotting }) => {
  const { rombelList, addRombel, updateRombel, deleteRombel, users, kelasMapelPengampuList } = useLMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [tingkatFilter, setTingkatFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingRombel, setEditingRombel] = useState<RombelKelas | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    nama: '',
    tingkat: 'X',
    jurusan: 'MIPA',
    waliKelasId: '',
    tahunAjaran: '2025/2026',
    kapasitas: 36,
    keterangan: '',
  });

  const teachers = users.filter((u) => u.role === 'guru');

  const filteredRombel = rombelList.filter((r) => {
    if (tingkatFilter !== 'all' && r.tingkat !== tingkatFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNama = r.nama.toLowerCase().includes(q);
      const matchWali = (r.waliKelasNama || '').toLowerCase().includes(q);
      const matchJurusan = (r.jurusan || '').toLowerCase().includes(q);
      return matchNama || matchWali || matchJurusan;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingRombel(null);
    setFormData({
      nama: '',
      tingkat: 'X',
      jurusan: 'MIPA',
      waliKelasId: '',
      tahunAjaran: '2025/2026',
      kapasitas: 36,
      keterangan: '',
    });
    setShowModal(true);
  };

  const handleOpenEdit = (r: RombelKelas) => {
    setEditingRombel(r);
    setFormData({
      nama: r.nama,
      tingkat: r.tingkat,
      jurusan: r.jurusan,
      waliKelasId: r.waliKelasId || '',
      tahunAjaran: r.tahunAjaran || '2025/2026',
      kapasitas: r.kapasitas || 36,
      keterangan: r.keterangan || '',
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim()) {
      alert('Nama Rombel / Kelas wajib diisi!');
      return;
    }

    const selectedTeacher = teachers.find((t) => t.id === formData.waliKelasId);

    if (editingRombel) {
      updateRombel({
        ...editingRombel,
        nama: formData.nama.trim(),
        tingkat: formData.tingkat,
        jurusan: formData.jurusan,
        waliKelasId: formData.waliKelasId || undefined,
        waliKelasNama: selectedTeacher ? selectedTeacher.name : undefined,
        tahunAjaran: formData.tahunAjaran,
        kapasitas: Number(formData.kapasitas) || 36,
        keterangan: formData.keterangan.trim(),
      });
    } else {
      addRombel({
        nama: formData.nama.trim(),
        tingkat: formData.tingkat,
        jurusan: formData.jurusan,
        waliKelasId: formData.waliKelasId || undefined,
        waliKelasNama: selectedTeacher ? selectedTeacher.name : undefined,
        tahunAjaran: formData.tahunAjaran,
        kapasitas: Number(formData.kapasitas) || 36,
        keterangan: formData.keterangan.trim(),
      });
    }

    setShowModal(false);
  };

  const handleDelete = (r: RombelKelas) => {
    if (confirm(`Yakin ingin menghapus rombongan kelas "${r.nama}"? Seluruh alokasi mapel kelas ini juga akan dihapus.`)) {
      deleteRombel(r.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
            <School className="w-4 h-4" />
            <span>Total Rombel</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{rombelList.length} Kelas</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>Kelas X (Fase E)</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {rombelList.filter((r) => r.tingkat === 'X').length} Rombel
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>Kelas XI (Fase F)</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {rombelList.filter((r) => r.tingkat === 'XI').length} Rombel
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>Kelas XII (Fase F+)</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {rombelList.filter((r) => r.tingkat === 'XII').length} Rombel
          </p>
        </div>
      </div>

      {/* Action and Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama rombel, wali kelas, jurusan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Tingkat:</span>
            <select
              value={tingkatFilter}
              onChange={(e) => setTingkatFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
            >
              <option value="all">Semua Tingkat</option>
              <option value="X">Kelas X</option>
              <option value="XI">Kelas XI</option>
              <option value="XII">Kelas XII</option>
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Buat Rombel Kelas Baru</span>
        </button>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredRombel.map((r) => {
          const studentCount = users.filter((u) => u.role === 'siswa' && u.kelas === r.nama).length;
          const assignedSubjects = kelasMapelPengampuList.filter((k) => k.kelasNama === r.nama);
          const teachersCount = new Set(
            assignedSubjects.filter((k) => k.guruId).map((k) => k.guruId)
          ).size;

          return (
            <div
              key={r.id}
              className="bg-white rounded-2xl border border-slate-200 hover:border-indigo-300 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Tingkat {r.tingkat}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-600">
                      {r.jurusan}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(r)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                      title="Edit Rombel"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Rombel"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h4 className="text-xl font-black text-slate-900 tracking-tight">{r.nama}</h4>
                {r.keterangan && (
                  <p className="text-xs text-slate-500 mt-1 line-clamp-1">{r.keterangan}</p>
                )}

                {/* Wali Kelas */}
                <div className="mt-4 p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <UserCheck className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Wali Kelas</p>
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {r.waliKelasNama || 'Belum Ditentukan'}
                    </p>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Siswa</span>
                    <span className="text-sm font-black text-slate-800">
                      {studentCount} / {r.kapasitas || 36}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Mapel Aktif</span>
                    <span className="text-sm font-black text-indigo-600">
                      {assignedSubjects.length} Mapel
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block">Guru Pengampu</span>
                    <span className="text-sm font-black text-emerald-600">
                      {teachersCount} Guru
                    </span>
                  </div>
                </div>
              </div>

              {/* Action */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => onSelectPlotting && onSelectPlotting(r.nama)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 text-xs font-bold transition group"
                >
                  <BookOpen className="w-3.5 h-3.5 text-indigo-500 group-hover:text-white transition" />
                  <span>Atur Mapel & Guru Kelas Ini</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRombel.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
          <School className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h4 className="text-sm font-bold text-slate-700">Tidak ada rombel kelas yang cocok</h4>
          <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau filter tingkat.</p>
        </div>
      )}

      {/* Modal Buat / Edit Rombel */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <School className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRombel ? 'Edit Rombongan Belajar' : 'Buat Rombel Kelas Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Atur nama kelas, tingkat, jurusan, dan wali kelas di MAN 11 Jakarta.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nama Rombel / Kelas *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: X MIPA 3, XI IPS 2, XII BAHASA 1"
                  value={formData.nama}
                  onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                  className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Kelas *</label>
                  <select
                    value={formData.tingkat}
                    onChange={(e) => setFormData({ ...formData, tingkat: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="X">Kelas X (Fase E)</option>
                    <option value="XI">Kelas XI (Fase F)</option>
                    <option value="XII">Kelas XII (Fase F+)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Peminatan / Jurusan *</label>
                  <select
                    value={formData.jurusan}
                    onChange={(e) => setFormData({ ...formData, jurusan: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-semibold"
                  >
                    <option value="MIPA">MIPA (Matematika & Sains)</option>
                    <option value="IPS">IPS (Ilmu Pengetahuan Sosial)</option>
                    <option value="Bahasa">Bahasa & Budaya</option>
                    <option value="Keagamaan">Keagamaan / PAI</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Wali Kelas (Guru Pengampu)
                </label>
                <select
                  value={formData.waliKelasId}
                  onChange={(e) => setFormData({ ...formData, waliKelasId: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="">-- Belum Menetapkan Wali Kelas --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.nip ? `NIP: ${t.nip}` : 'Guru'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tahun Ajaran</label>
                  <input
                    type="text"
                    value={formData.tahunAjaran}
                    onChange={(e) => setFormData({ ...formData, tahunAjaran: e.target.value })}
                    placeholder="2025/2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kapasitas Maks. Siswa</label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.kapasitas}
                    onChange={(e) => setFormData({ ...formData, kapasitas: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Keterangan / Catatan</label>
                <input
                  type="text"
                  value={formData.keterangan}
                  onChange={(e) => setFormData({ ...formData, keterangan: e.target.value })}
                  placeholder="Contoh: Kelas Riset Sains, Kelas Digital..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-4 flex justify-end gap-2.5 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md transition"
                >
                  {editingRombel ? 'Simpan Perubahan' : 'Buat Rombel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
