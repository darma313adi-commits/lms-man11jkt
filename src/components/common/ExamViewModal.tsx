import React, { useState } from 'react';
import { Exam, QuestionItem, QuestionType } from '../../types';
import {
  X,
  Printer,
  Download,
  Eye,
  EyeOff,
  BookOpen,
  Clock,
  Award,
  Layers,
  FileText,
  FileCheck,
  CheckCircle2,
  Calendar,
  Key,
  Edit3,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import {
  printExamDirectly,
  exportExamPdf,
  exportExamWordDoc,
} from '../../utils/examPrintExport';

interface ExamViewModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onEditSoal?: (exam: Exam) => void;
  canDelete?: boolean;
  onDelete?: (exam: Exam) => void;
}

export const ExamViewModal: React.FC<ExamViewModalProps> = ({
  exam,
  isOpen,
  onClose,
  canEdit = false,
  onEditSoal,
  canDelete = false,
  onDelete,
}) => {
  const [showAnswerKeys, setShowAnswerKeys] = useState(false);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen || !exam) return null;

  // Filter questions
  const filteredQuestions = exam.soalList.filter((q) => {
    if (selectedTypeFilter !== 'all' && q.type !== selectedTypeFilter) return false;
    if (searchQuery.trim()) {
      const qText = searchQuery.toLowerCase();
      const matchPertanyaan = q.pertanyaan.toLowerCase().includes(qText);
      const matchStimulus = (q.deskripsiStimulus || '').toLowerCase().includes(qText);
      return matchPertanyaan || matchStimulus;
    }
    return true;
  });

  const questionTypesCount = exam.soalList.reduce<Record<string, number>>((acc, q) => {
    acc[q.type] = (acc[q.type] || 0) + 1;
    return acc;
  }, {});

  const totalBobot = exam.soalList.reduce((acc, q) => acc + (q.bobot || 10), 0);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header Modal */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 sm:p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              {exam.jenisAsesmen === 'sumatif_akhir_semester'
                ? 'Sumatif Akhir Semester'
                : exam.jenisAsesmen === 'formatif'
                ? 'Asesmen Formatif'
                : 'Sumatif Lingkup Materi'}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                exam.status === 'aktif'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {exam.status === 'aktif' ? '● Aktif' : '○ Draft'}
            </span>
            <span className="text-xs text-indigo-300 font-mono">Kode: {exam.kodeUjian}</span>
          </div>

          <h2 className="text-lg sm:text-xl font-black tracking-tight text-white pr-10">
            {exam.judul}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl line-clamp-2">{exam.deskripsi}</p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10 text-xs">
            <div className="bg-white/5 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Mata Pelajaran</span>
              <strong className="text-indigo-200 text-xs sm:text-sm">{exam.mataPelajaran}</strong>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Kelas Sasaran</span>
              <strong className="text-white text-xs sm:text-sm">{exam.kelasTarget.join(', ')}</strong>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Waktu & Soal</span>
              <strong className="text-white text-xs sm:text-sm">
                {exam.durasiMenit} Menit • {exam.soalList.length} Soal
              </strong>
            </div>
            <div className="bg-white/5 rounded-xl p-2.5">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Guru Pengampu</span>
              <strong className="text-emerald-300 text-xs sm:text-sm">{exam.guruNama || 'Guru Mapel'}</strong>
            </div>
          </div>
        </div>

        {/* Action Toolbar: Cetak, Unduh, Tampilkan Kunci, Edit */}
        <div className="bg-slate-50 border-b border-slate-200 p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Cetak Langsung */}
            <button
              type="button"
              onClick={() => printExamDirectly(exam, { includeAnswerKey: showAnswerKeys })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="Cetak Naskah Ujian Resmi"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Naskah Soal</span>
            </button>

            {/* Tombol Unduh PDF */}
            <button
              type="button"
              onClick={() => exportExamPdf(exam, { includeAnswerKey: showAnswerKeys })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer"
              title="Unduh File PDF Naskah Soal"
            >
              <Download className="w-4 h-4 text-rose-600" />
              <span>Unduh PDF</span>
            </button>

            {/* Tombol Unduh Word (.doc) */}
            <button
              type="button"
              onClick={() => exportExamWordDoc(exam, { includeAnswerKey: showAnswerKeys })}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 font-bold text-xs shadow-2xs transition cursor-pointer"
              title="Unduh Naskah Soal format Microsoft Word (.doc)"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Unduh Word (.doc)</span>
            </button>

            {/* Toggle Kunci Jawaban */}
            <button
              type="button"
              onClick={() => setShowAnswerKeys(!showAnswerKeys)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl font-bold text-xs border transition cursor-pointer ${
                showAnswerKeys
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-2 ring-emerald-500/20'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {showAnswerKeys ? <EyeOff className="w-4 h-4 text-emerald-600" /> : <Eye className="w-4 h-4 text-slate-500" />}
              <span>{showAnswerKeys ? 'Sembunyikan Kunci' : 'Tampilkan Kunci & Bobot'}</span>
            </button>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {canEdit && onEditSoal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditSoal(exam);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Soal</span>
              </button>
            )}

            {canDelete && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(exam);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 font-bold text-xs shadow-xs transition cursor-pointer"
                title="Hapus Asesmen Ini"
              >
                <Trash2 className="w-4 h-4" />
                <span>Hapus Asesmen</span>
              </button>
            )}
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-3 sm:px-6 bg-white border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              <span>Tipe:</span>
            </span>
            <button
              type="button"
              onClick={() => setSelectedTypeFilter('all')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                selectedTypeFilter === 'all'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({exam.soalList.length})
            </button>
            {Object.entries(questionTypesCount).map(([type, count]) => (
              <button
                key={type}
                type="button"
                onClick={() => setSelectedTypeFilter(type)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold capitalize transition cursor-pointer ${
                  selectedTypeFilter === type
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {type.replace(/_/g, ' ')} ({count})
              </button>
            ))}
          </div>

          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari butir soal..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Question List View (Scrollable Vertical) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/50">
          {filteredQuestions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Tidak ada butir soal yang sesuai filter</p>
              <p className="text-xs text-slate-400 mt-0.5">Ubah kata kunci pencarian atau tipe soal.</p>
            </div>
          ) : (
            filteredQuestions.map((soal, idx) => {
              const originalIndex = exam.soalList.findIndex((s) => s.id === soal.id);
              const displayNum = originalIndex !== -1 ? originalIndex + 1 : idx + 1;

              return (
                <div
                  key={soal.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                        {displayNum}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                        {soal.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">Bobot: {soal.bobot} Poin</span>
                      {soal.gambar && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                          📷 Ada Gambar
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stimulus jika ada */}
                  {soal.deskripsiStimulus && (
                    <div className="bg-slate-50 border-l-4 border-indigo-500 p-3 rounded-r-xl mb-3 text-xs italic text-slate-700 leading-relaxed">
                      <strong className="block not-italic text-slate-900 font-bold mb-1">
                        Stimulus / Wacana:
                      </strong>
                      {soal.deskripsiStimulus}
                    </div>
                  )}

                  {/* Teks Pertanyaan */}
                  <div className="text-xs sm:text-sm font-medium text-slate-900 mb-3 leading-relaxed">
                    {soal.pertanyaan}
                  </div>

                  {/* Gambar Soal jika ada */}
                  {soal.gambar && (
                    <div className="my-3">
                      <img
                        src={soal.gambar}
                        alt={`Gambar Soal ${displayNum}`}
                        className="max-h-56 max-w-full rounded-xl border border-slate-200 object-contain shadow-2xs"
                      />
                    </div>
                  )}

                  {/* Pilihan Ganda / Kompleks */}
                  {(soal.type === 'pilihan_ganda' || soal.type === 'pilihan_ganda_kompleks') && soal.pilihan && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {soal.pilihan.map((p) => {
                        const isCorrect = Array.isArray(soal.kunciJawaban)
                          ? soal.kunciJawaban.includes(p.label)
                          : soal.kunciJawaban === p.label;

                        return (
                          <div
                            key={p.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-start gap-2.5 transition ${
                              showAnswerKeys && isCorrect
                                ? 'bg-emerald-50/80 border-emerald-400 text-emerald-950 font-semibold'
                                : 'bg-slate-50/50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md font-bold text-xs flex items-center justify-center shrink-0 ${
                                showAnswerKeys && isCorrect
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {p.label}
                            </span>
                            <div className="flex-1">
                              <span>{p.text}</span>
                              {p.gambar && (
                                <img
                                  src={p.gambar}
                                  alt={`Opsi ${p.label}`}
                                  className="mt-1.5 max-h-24 max-w-full rounded border border-slate-200 object-contain"
                                />
                              )}
                            </div>
                            {showAnswerKeys && isCorrect && (
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Menjodohkan */}
                  {soal.type === 'menjodohkan' && soal.pasangan && (
                    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 font-bold text-slate-700">
                          <tr>
                            <th className="p-2.5 border-b border-slate-200">Premis / Pernyataan (Kiri)</th>
                            <th className="p-2.5 border-b border-slate-200">Pasangan Jawaban (Kanan)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {soal.pasangan.map((pas, pIdx) => (
                            <tr key={pas.id}>
                              <td className="p-2.5 font-medium text-slate-800">
                                {pIdx + 1}. {pas.premis}
                              </td>
                              <td className="p-2.5 text-indigo-700 font-semibold flex items-center gap-1.5">
                                <span>➔</span>
                                <span>{pas.jawaban}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* TKA Benar/Salah */}
                  {soal.type === 'tka_benar_salah' && soal.pernyataanTKA && (
                    <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden text-xs">
                      <table className="w-full text-left">
                        <thead className="bg-slate-100 font-bold text-slate-700">
                          <tr>
                            <th className="p-2.5 border-b border-slate-200">Pernyataan TKA</th>
                            <th className="p-2.5 border-b border-slate-200 text-center w-24">Kunci</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                          {soal.pernyataanTKA.map((per, itIdx) => (
                            <tr key={per.id}>
                              <td className="p-2.5 text-slate-800 font-medium">
                                {itIdx + 1}. {per.pernyataan}
                              </td>
                              <td className="p-2.5 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                                    per.kunci === 'Benar'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {per.kunci}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Isian Singkat */}
                  {soal.type === 'isian_singkat' && (
                    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                      <span className="font-semibold text-slate-500">Kunci Jawaban Singkat: </span>
                      <strong className="font-mono text-indigo-700">
                        {Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban.join(' / ') : soal.kunciJawaban || '-'}
                      </strong>
                    </div>
                  )}

                  {/* Kunci Jawaban & Pembahasan Detail */}
                  {showAnswerKeys && (
                    <div className="mt-3 p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-950">
                      <div className="flex items-center gap-2 font-bold mb-1">
                        <Key className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Kunci Jawaban Resmi:</span>
                        <span className="font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                          {Array.isArray(soal.kunciJawaban)
                            ? soal.kunciJawaban.join(', ')
                            : soal.kunciJawaban || 'Telah diverifikasi'}
                        </span>
                        <span className="ml-auto text-[11px] text-emerald-700 font-medium">
                          Bobot: {soal.bobot} Poin
                        </span>
                      </div>
                      {soal.pembahasan && (
                        <p className="mt-1 text-slate-700 italic leading-relaxed">
                          <strong className="not-italic text-slate-800">Pembahasan:</strong> {soal.pembahasan}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>
            Total <strong className="text-slate-800">{exam.soalList.length}</strong> butir soal • Total Bobot:{' '}
            <strong className="text-slate-800">{totalBobot}</strong> Poin
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
