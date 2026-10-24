import React, { useState } from 'react';
import { QuestionItem, QuestionType, PilihanOpsi } from '../../types';
import {
  X,
  Image as ImageIcon,
  Upload,
  Trash2,
  Check,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  Plus,
} from 'lucide-react';

interface QuestionImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (question: QuestionItem) => void;
  initialQuestion?: QuestionItem | null;
  totalExistingQuestions: number;
}

export const QuestionImageEditorModal: React.FC<QuestionImageEditorModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuestion,
  totalExistingQuestions,
}) => {
  if (!isOpen) return null;

  const isEditing = !!initialQuestion;

  const [type, setType] = useState<QuestionType>(
    initialQuestion?.type || 'pilihan_ganda'
  );
  const [pertanyaan, setPertanyaan] = useState<string>(
    initialQuestion?.pertanyaan || ''
  );
  const [gambarSoal, setGambarSoal] = useState<string>(
    initialQuestion?.gambar || ''
  );
  const [deskripsiStimulus, setDeskripsiStimulus] = useState<string>(
    initialQuestion?.deskripsiStimulus || ''
  );
  const [bobot, setBobot] = useState<number>(initialQuestion?.bobot || 15);
  const [pembahasan, setPembahasan] = useState<string>(
    initialQuestion?.pembahasan || ''
  );

  // Options for PG / PG Kompleks
  const [pilihan, setPilihan] = useState<PilihanOpsi[]>(() => {
    if (initialQuestion?.pilihan && initialQuestion.pilihan.length > 0) {
      return initialQuestion.pilihan;
    }
    return [
      { id: 'opt_A', label: 'A', text: '', gambar: '' },
      { id: 'opt_B', label: 'B', text: '', gambar: '' },
      { id: 'opt_C', label: 'C', text: '', gambar: '' },
      { id: 'opt_D', label: 'D', text: '', gambar: '' },
      { id: 'opt_E', label: 'E', text: '', gambar: '' },
    ];
  });

  // Single key for PG, array for PG Kompleks, or string for Isian
  const [kunciJawabanSingle, setKunciJawabanSingle] = useState<string>(() => {
    if (typeof initialQuestion?.kunciJawaban === 'string') {
      return initialQuestion.kunciJawaban;
    }
    return 'A';
  });

  const [kunciJawabanMulti, setKunciJawabanMulti] = useState<string[]>(() => {
    if (Array.isArray(initialQuestion?.kunciJawaban)) {
      return initialQuestion.kunciJawaban;
    }
    return ['A'];
  });

  const [kunciIsian, setKunciIsian] = useState<string>(() => {
    if (initialQuestion?.type === 'isian_singkat') {
      return String(initialQuestion.kunciJawaban || '');
    }
    return '';
  });

  // Helper to read file to base64 DataURL
  const handleFileChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    onComplete: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onComplete(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleUpdateOptionText = (idx: number, text: string) => {
    setPilihan((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], text };
      return copy;
    });
  };

  const handleUpdateOptionGambar = (idx: number, gambarUrl: string) => {
    setPilihan((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], gambar: gambarUrl };
      return copy;
    });
  };

  const toggleMultiKey = (label: string) => {
    if (kunciJawabanMulti.includes(label)) {
      if (kunciJawabanMulti.length > 1) {
        setKunciJawabanMulti(kunciJawabanMulti.filter((k) => k !== label));
      }
    } else {
      setKunciJawabanMulti([...kunciJawabanMulti, label]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!pertanyaan.trim()) {
      alert('Redaksi teks pertanyaan wajib diisi!');
      return;
    }

    let kunci: string | string[] = kunciJawabanSingle;
    if (type === 'pilihan_ganda_kompleks') {
      kunci = kunciJawabanMulti;
    } else if (type === 'isian_singkat') {
      kunci = kunciIsian.trim();
    }

    const questionResult: QuestionItem = {
      id: initialQuestion?.id || `soal_custom_${Date.now()}`,
      nomor: initialQuestion?.nomor || totalExistingQuestions + 1,
      type,
      pertanyaan: pertanyaan.trim(),
      gambar: gambarSoal.trim() || undefined,
      deskripsiStimulus: deskripsiStimulus.trim() || undefined,
      bobot: Number(bobot) || 15,
      pembahasan: pembahasan.trim() || undefined,
      pilihan:
        type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks'
          ? pilihan.map((p) => ({
              ...p,
              text: p.text.trim() || `Pilihan ${p.label}`,
              gambar: p.gambar?.trim() || undefined,
            }))
          : undefined,
      kunciJawaban: kunci,
      pasangan: initialQuestion?.pasangan,
      pernyataanTKA: initialQuestion?.pernyataanTKA,
    };

    onSave(questionResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <FileQuestion className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">
                {isEditing ? `Edit Soal Nomor ${initialQuestion.nomor}` : 'Tambah Butir Soal Baru'}
              </h3>
              <p className="text-xs text-indigo-200">
                Lengkapi teks redaksi soal dan tempel gambar pada soal maupun opsi jawaban.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* Tipe Soal & Bobot Poin */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Tipe Butir Soal
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QuestionType)}
                className="w-full text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-indigo-500"
              >
                <option value="pilihan_ganda">Pilihan Ganda (1 Jawaban Benar)</option>
                <option value="pilihan_ganda_kompleks">Pilihan Ganda Kompleks (Banyak Jawaban Benar)</option>
                <option value="isian_singkat">Isian Singkat</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Bobot Nilai (Poin)
              </label>
              <input
                type="number"
                min={1}
                max={100}
                value={bobot}
                onChange={(e) => setBobot(Number(e.target.value) || 10)}
                className="w-full text-xs font-bold px-3 py-2 border border-slate-300 rounded-xl bg-white"
              />
            </div>
          </div>

          {/* Redaksi Teks Pertanyaan */}
          <div>
            <label className="block text-xs font-bold text-slate-900 mb-1">
              Redaksi Teks Pertanyaan / Soal <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={pertanyaan}
              onChange={(e) => setPertanyaan(e.target.value)}
              placeholder="Tuliskan pertanyaan soal di sini..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 bg-white leading-relaxed"
              required
            />
          </div>

          {/* TEMPEL GAMBAR PADA REDAKSI SOAL */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ImageIcon className="w-4 h-4 text-indigo-600" />
                  <span>Tempel Gambar pada Redaksi Soal (Stimulus / Diagram)</span>
                </span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Unggah file foto/grafik (JPG, PNG, WebP) atau tempelkan URL gambar.
                </span>
              </div>
              {gambarSoal && (
                <button
                  type="button"
                  onClick={() => setGambarSoal('')}
                  className="px-2.5 py-1 text-[11px] font-bold text-rose-600 hover:bg-rose-50 rounded-lg transition border border-rose-200 cursor-pointer flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Hapus Gambar</span>
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <label className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 cursor-pointer flex items-center justify-center gap-1.5 transition shrink-0">
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File Gambar</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFileChange(e, (dataUrl) => setGambarSoal(dataUrl))}
                />
              </label>

              <div className="flex-1">
                <input
                  type="text"
                  value={gambarSoal}
                  onChange={(e) => setGambarSoal(e.target.value)}
                  placeholder="Atau tempel URL gambar (https://... / data:image/...)"
                  className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Preview Gambar Soal */}
            {gambarSoal && (
              <div className="mt-2 p-2 bg-white border border-slate-200 rounded-xl flex items-center justify-center">
                <img
                  src={gambarSoal}
                  alt="Preview Gambar Soal"
                  className="max-h-52 max-w-full rounded-lg object-contain"
                />
              </div>
            )}
          </div>

          {/* OPSI JAWABAN (DENGAN GAMBAR PER OPSI) */}
          {(type === 'pilihan_ganda' || type === 'pilihan_ganda_kompleks') && (
            <div className="space-y-3 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">
                    Opsi Pilihan Jawaban (A, B, C, D, E) & Tempel Gambar per Opsi
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    {type === 'pilihan_ganda'
                      ? 'Pilih radio button di samping untuk menentukan kunci jawaban yang benar.'
                      : 'Centang kotak di samping untuk menentukan satu atau beberapa kunci jawaban benar.'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {pilihan.map((opt, idx) => {
                  const isCheckedMulti = kunciJawabanMulti.includes(opt.label);
                  const isCheckedSingle = kunciJawabanSingle === opt.label;

                  return (
                    <div
                      key={opt.id}
                      className="p-3 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-2.5"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Radio or Checkbox key selector */}
                        {type === 'pilihan_ganda' ? (
                          <label
                            className="flex items-center gap-1.5 cursor-pointer"
                            title="Tandai sebagai kunci jawaban"
                          >
                            <input
                              type="radio"
                              name="kunci_jawaban_radio"
                              checked={isCheckedSingle}
                              onChange={() => setKunciJawabanSingle(opt.label)}
                              className="text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                            />
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isCheckedSingle
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        ) : (
                          <label
                            className="flex items-center gap-1.5 cursor-pointer"
                            title="Centang jika pilihan ini benar"
                          >
                            <input
                              type="checkbox"
                              checked={isCheckedMulti}
                              onChange={() => toggleMultiKey(opt.label)}
                              className="text-emerald-600 focus:ring-emerald-500 rounded w-4 h-4 cursor-pointer"
                            />
                            <span
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs ${
                                isCheckedMulti
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-white border border-slate-300 text-slate-700'
                              }`}
                            >
                              {opt.label}
                            </span>
                          </label>
                        )}

                        {/* Text Opsi */}
                        <div className="flex-1">
                          <input
                            type="text"
                            value={opt.text}
                            onChange={(e) => handleUpdateOptionText(idx, e.target.value)}
                            placeholder={`Teks pilihan jawaban ${opt.label}...`}
                            className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
                          />
                        </div>

                        {/* Upload Gambar Opsi Button */}
                        <label className="p-2 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl cursor-pointer transition flex items-center gap-1 text-[11px] font-bold shrink-0">
                          <ImageIcon className="w-3.5 h-3.5 text-indigo-600" />
                          <span>+ Gambar</span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) =>
                              handleFileChange(e, (dataUrl) =>
                                handleUpdateOptionGambar(idx, dataUrl)
                              )
                            }
                          />
                        </label>

                        {opt.gambar && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOptionGambar(idx, '')}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition cursor-pointer"
                            title="Hapus gambar opsi ini"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {/* Preview Gambar Opsi jika ada */}
                      {opt.gambar && (
                        <div className="pl-10 flex items-center gap-3">
                          <div className="p-1 bg-white border border-slate-200 rounded-lg inline-block">
                            <img
                              src={opt.gambar}
                              alt={`Gambar Opsi ${opt.label}`}
                              className="h-20 w-auto object-contain rounded"
                            />
                          </div>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            Gambar terpasang pada Pilihan {opt.label}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kunci Isian Singkat */}
          {type === 'isian_singkat' && (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Kunci Jawaban Isian Singkat <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={kunciIsian}
                onChange={(e) => setKunciIsian(e.target.value)}
                placeholder="Contoh: Mitokondria / ATP"
                className="w-full text-xs px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold font-mono focus:ring-2 focus:ring-indigo-500"
                required
              />
              <p className="text-[10px] text-slate-500">
                Pemeriksaan jawaban siswa bersifat fleksibel dan tidak membedakan huruf besar/kecil.
              </p>
            </div>
          )}

          {/* Pembahasan Soal */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Pembahasan Soal (Ditampilkan setelah siswa selesai)
            </label>
            <textarea
              rows={2}
              value={pembahasan}
              onChange={(e) => setPembahasan(e.target.value)}
              placeholder="Tuliskan penjelasan ilmiah atau cara pengerjaan..."
              className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition shadow-md cursor-pointer flex items-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>{isEditing ? 'Simpan Perubahan Soal' : 'Simpan Butir Soal'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
