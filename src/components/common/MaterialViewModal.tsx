import React from 'react';
import { LessonMaterial } from '../../types';
import {
  X,
  FileText,
  Printer,
  Download,
  Calendar,
  Users,
  BookOpen,
  User,
  HardDrive,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  printMaterialDirectly,
  exportMaterialPdf,
} from '../../utils/examPrintExport';

interface MaterialViewModalProps {
  material: LessonMaterial | null;
  isOpen: boolean;
  onClose: () => void;
  canDelete?: boolean;
  onDelete?: (material: LessonMaterial) => void;
}

export const MaterialViewModal: React.FC<MaterialViewModalProps> = ({
  material,
  isOpen,
  onClose,
  canDelete = false,
  onDelete,
}) => {
  if (!isOpen || !material) return null;

  const downloadTextContent = `[MADRASAH ALIYAH NEGERI 11 JAKARTA - BAHAN AJAR PDF]\n\nJudul: ${material.judul}\nMata Pelajaran: ${material.mataPelajaran}\nKelas Sasaran: ${material.kelasTarget.join(', ')}\nGuru Pengampu: ${material.guruNama || 'Guru Mapel'}\nTanggal: ${new Date(material.createdAt).toLocaleDateString('id-ID')}\n\nDeskripsi / Pokok Bahasan:\n${material.deskripsi || '-'}\n`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-4 max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-900 to-emerald-950 p-6 text-white relative shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 mb-2">
            <FileText className="w-3.5 h-3.5" />
            <span>Materi Pembelajaran PDF</span>
          </span>

          <h2 className="text-xl font-black text-white pr-8">{material.judul}</h2>
          <p className="text-xs text-emerald-100/80 mt-1">
            Mata Pelajaran: <strong>{material.mataPelajaran}</strong> • Sasaran:{' '}
            <strong>{material.kelasTarget.join(', ')}</strong>
          </p>
        </div>

        {/* Action Bar */}
        <div className="bg-emerald-50/60 border-b border-emerald-100 p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            {/* Tombol Cetak Langsung */}
            <button
              type="button"
              onClick={() => printMaterialDirectly(material)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Lembar Materi</span>
            </button>

            {/* Unduh Ringkasan PDF */}
            <button
              type="button"
              onClick={() => exportMaterialPdf(material)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-700" />
              <span>Unduh Lembar PDF</span>
            </button>

            {/* Unduh File Asli */}
            <a
              href={`data:text/plain;charset=utf-8,${encodeURIComponent(downloadTextContent)}`}
              download={material.fileName || `${material.judul}.pdf`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100/50 border border-emerald-300 text-emerald-900 font-bold text-xs shadow-2xs transition cursor-pointer"
            >
              <HardDrive className="w-4 h-4 text-emerald-700" />
              <span>Unduh File Asli ({material.fileName})</span>
            </a>
          </div>

          {canDelete && onDelete && (
            <button
              type="button"
              onClick={() => onDelete(material)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-600 hover:text-white text-rose-700 border border-rose-200 font-bold text-xs shadow-xs transition cursor-pointer"
              title="Hapus Materi Pembelajaran Ini"
            >
              <Trash2 className="w-4 h-4" />
              <span>Hapus Materi</span>
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Guru Pengampu</span>
              <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>{material.guruNama || 'Guru Mata Pelajaran'}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Kelas / Sasaran</span>
              <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>{material.kelasTarget.join(', ')}</span>
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Nama File & Ukuran</span>
              <p className="font-mono text-slate-700 text-[11px] mt-0.5 truncate">
                {material.fileName} ({material.fileSize || 'PDF'})
              </p>
            </div>
            <div>
              <span className="text-slate-400 font-bold uppercase text-[10px] block">Tanggal Publikasi</span>
              <p className="font-medium text-slate-700 text-[11px] mt-0.5 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  {new Date(material.createdAt).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </p>
            </div>
          </div>

          {/* Description Box */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4">
            <h4 className="text-xs font-bold text-slate-900 mb-2 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>Deskripsi & Arahan Belajar Siswa</span>
            </h4>
            <div className="text-xs text-slate-700 leading-relaxed whitespace-pre-line bg-slate-50/70 p-3.5 rounded-xl border border-slate-100">
              {material.deskripsi ||
                'Dokumen ini berisi modul referensi penting untuk pembelajaran dan persiapan menghadapi asesmen.'}
            </div>
          </div>

          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Akses & Hak Distribusi</p>
              <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                Materi ini dapat diakses, dibaca, dicetak, dan diunduh oleh seluruh siswa kelas sasaran serta tim
                administrator madrasah sebagai arsip kurikulum.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
