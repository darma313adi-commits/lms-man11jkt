import React, { useState } from 'react';
import { useLMS } from '../../context/LMSContext';
import { MataPelajaran } from '../../types';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Search,
  School,
  Award,
  Clock,
  Sparkles,
  Layers,
  CheckCircle,
} from 'lucide-react';

export const MapelManager: React.FC = () => {
  const {
    mataPelajaranList,
    addMataPelajaran,
    updateMataPelajaran,
    deleteMataPelajaran,
    kelasMapelPengampuList,
  } = useLMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [kategoriFilter, setKategoriFilter] = useState<string>('all');
  const [showModal, setShowModal] = useState(false);
  const [editingMapel, setEditingMapel] = useState<MataPelajaran | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    kode: '',
    nama: '',
    kategori: 'Peminatan MIPA',
    kkmDefault: 75,
    jamPerMinggu: 4,
  });

  const categories = [
    'Peminatan MIPA',
    'Peminatan IPS',
    'Umum / Wajib',
    'Peminatan Bahasa',
    'Keagamaan',
  ];

  const filteredMapel = mataPelajaranList.filter((m) => {
    if (kategoriFilter !== 'all' && m.kategori !== kategoriFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchNama = m.nama.toLowerCase().includes(q);
      const matchKode = m.kode.toLowerCase().includes(q);
      const matchKategori = m.kategori.toLowerCase().includes(q);
      return matchNama || matchKode || matchKategori;
    }
    return true;
  });

  const handleOpenAdd = () => {
    setEditingMapel(null);
    setFormData({
      kode: '',
      nama: '',
      kategori: 'Peminatan MIPA',
      kkmDefault: 75,
      jamPerMinggu: 4,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (m: MataPelajaran) => {
    setEditingMapel(m);
    setFormData({
      kode: m.kode,
      nama: m.nama,
      kategori: m.kategori,
      kkmDefault: m.kkmDefault || 75,
      jamPerMinggu: m.jamPerMinggu || 4,
    });
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nama.trim() || !formData.kode.trim()) {
      alert('Kode dan Nama Mata Pelajaran wajib diisi!');
      return;
    }

    if (editingMapel) {
      updateMataPelajaran({
        ...editingMapel,
        kode: formData.kode.trim().toUpperCase(),
        nama: formData.nama.trim(),
        kategori: formData.kategori,
        kkmDefault: Number(formData.kkmDefault) || 75,
        jamPerMinggu: Number(formData.jamPerMinggu) || 4,
      });
    } else {
      addMataPelajaran({
        kode: formData.kode.trim().toUpperCase(),
        nama: formData.nama.trim(),
        kategori: formData.kategori,
        kkmDefault: Number(formData.kkmDefault) || 75,
        jamPerMinggu: Number(formData.jamPerMinggu) || 4,
      });
    }

    setShowModal(false);
  };

  const handleDelete = (m: MataPelajaran) => {
    if (
      confirm(
        `Yakin ingin menghapus mata pelajaran "${m.nama}" (${m.kode})? Seluruh plotting di kelas juga akan dibersihkan.`
      )
    ) {
      deleteMataPelajaran(m.id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-indigo-600 text-xs font-bold">
            <BookOpen className="w-4 h-4" />
            <span>Total Mapel</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">{mataPelajaranList.length} Mapel</p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>Peminatan MIPA</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {mataPelajaranList.filter((m) => m.kategori.includes('MIPA')).length} Mapel
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-blue-600 text-xs font-bold">
            <Layers className="w-4 h-4" />
            <span>Peminatan IPS</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {mataPelajaranList.filter((m) => m.kategori.includes('IPS')).length} Mapel
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 text-amber-600 text-xs font-bold">
            <Award className="w-4 h-4" />
            <span>Umum / Wajib</span>
          </div>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {mataPelajaranList.filter((m) => m.kategori.includes('Umum')).length} Mapel
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
              placeholder="Cari kode atau nama mata pelajaran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold">Kategori:</span>
            <select
              value={kategoriFilter}
              onChange={(e) => setKategoriFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
            >
              <option value="all">Semua Kategori</option>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tambah Mata Pelajaran Baru</span>
        </button>
      </div>

      {/* Table of Subjects */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-bold text-slate-700">
              <tr>
                <th className="px-4 py-3.5">Kode Mapel</th>
                <th className="px-4 py-3.5">Nama Mata Pelajaran</th>
                <th className="px-4 py-3.5">Kategori Kurikulum</th>
                <th className="px-4 py-3.5 text-center">Standar KKM</th>
                <th className="px-4 py-3.5 text-center">Beban Jam</th>
                <th className="px-4 py-3.5">Alokasi Rombel</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredMapel.map((m) => {
                const assignedClasses = Array.from(
                  new Set(
                    kelasMapelPengampuList
                      .filter((k) => k.mapelId === m.id)
                      .map((k) => k.kelasNama)
                  )
                );

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 font-mono font-bold text-indigo-700 whitespace-nowrap">
                      <span className="px-2 py-1 rounded-md bg-indigo-50 border border-indigo-200">
                        {m.kode}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900">{m.nama}</td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.kategori.includes('MIPA')
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : m.kategori.includes('IPS')
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {m.kategori}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100">{m.kkmDefault || 75}</span>
                    </td>
                    <td className="px-4 py-3.5 text-center font-medium text-slate-600 whitespace-nowrap">
                      {m.jamPerMinggu || 4} JP / mgg
                    </td>
                    <td className="px-4 py-3.5">
                      {assignedClasses.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {assignedClasses.slice(0, 3).map((k) => (
                            <span
                              key={k}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-semibold rounded text-[10px]"
                            >
                              {k}
                            </span>
                          ))}
                          {assignedClasses.length > 3 && (
                            <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[10px]">
                              +{assignedClasses.length - 3} lainnya
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px] italic">Belum dialokasikan</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(m)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          title="Edit Mata Pelajaran"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(m)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Hapus Mata Pelajaran"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tambah / Edit Mapel */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 sm:p-7 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingMapel ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kelola nama dan parameter kurikulum mata pelajaran sekolah.
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
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Mapel *</label>
                  <input
                    type="text"
                    required
                    placeholder="BIO-X"
                    value={formData.kode}
                    onChange={(e) => setFormData({ ...formData, kode: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2.5 text-xs font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Nama Mata Pelajaran *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Biologi, Matematika Peminatan"
                    value={formData.nama}
                    onChange={(e) => setFormData({ ...formData, nama: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kategori Kurikulum *</label>
                <select
                  value={formData.kategori}
                  onChange={(e) => setFormData({ ...formData, kategori: e.target.value })}
                  className="w-full px-3 py-2.5 text-xs border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Standar KKM (Skala 100)</label>
                  <input
                    type="number"
                    min={50}
                    max={100}
                    value={formData.kkmDefault}
                    onChange={(e) => setFormData({ ...formData, kkmDefault: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Beban Jam / Minggu (JP)</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.jamPerMinggu}
                    onChange={(e) => setFormData({ ...formData, jamPerMinggu: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
                  />
                </div>
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
                  {editingMapel ? 'Simpan Perubahan' : 'Tambah Mapel'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
