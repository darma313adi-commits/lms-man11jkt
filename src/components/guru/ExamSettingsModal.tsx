import React, { useState, useEffect } from 'react';
import { Exam, ExamToken } from '../../types';
import { useLMS } from '../../context/LMSContext';
import {
  X,
  Settings,
  Calendar,
  Clock,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  Copy,
  Check,
  AlertCircle,
  Plus,
  Trash2,
  School,
  Timer,
  Zap,
} from 'lucide-react';

interface ExamSettingsModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedExam: Exam) => void;
}

export const ALL_CLASSES_LIST = [
  'X MIPA 1',
  'X MIPA 2',
  'XI MIPA 1',
  'XI MIPA 2',
  'XI IPS 1',
  'XI IPS 2',
  'XII MIPA 1',
  'XII IPS 1',
  'Semua Kelas',
];

export const ExamSettingsModal: React.FC<ExamSettingsModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSave,
}) => {
  const { rombelList } = useLMS();
  const classChoices =
    rombelList && rombelList.length > 0
      ? [...rombelList.map((r) => r.nama), 'Semua Kelas']
      : ALL_CLASSES_LIST;

  if (!isOpen || !exam) return null;

  const [status, setStatus] = useState<'draft' | 'aktif' | 'selesai'>(exam.status || 'aktif');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    return exam.kelasTarget && exam.kelasTarget.length > 0
      ? exam.kelasTarget
      : ['X MIPA 1', 'X MIPA 2'];
  });
  const [waktuMulai, setWaktuMulai] = useState<string>(exam.waktuMulai || '');
  const [waktuKadaluarsa, setWaktuKadaluarsa] = useState<string>(exam.waktuKadaluarsa || '');
  const [useToken, setUseToken] = useState<boolean>(exam.useToken ?? !!exam.tokenUjian);
  const [durasiMenit, setDurasiMenit] = useState<number>(exam.durasiMenit || 60);
  const [kkm, setKkm] = useState<number>(exam.kkm || 75);
  const [acakSoal, setAcakSoal] = useState<boolean>(exam.acakSoal ?? true);
  const [acakOpsi, setAcakOpsi] = useState<boolean>(exam.acakOpsi ?? true);
  const [tampilkanNilai, setTampilkanNilai] = useState<boolean>(exam.tampilkanNilai ?? true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);

  // Multi-Token Management (Token 1, Token 2, Token 3, ...) with 10-Minute Expiration
  const [tokenList, setTokenList] = useState<ExamToken[]>(() => {
    if (exam.tokenList && exam.tokenList.length > 0) {
      return exam.tokenList;
    }
    // If exam has legacy single token, convert to Token 1
    if (exam.tokenUjian) {
      return [
        {
          id: `tok_${Date.now()}_1`,
          nomor: 1,
          label: 'Token 1',
          token: exam.tokenUjian,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      ];
    }
    // Default initial token 1
    const initialTok = generateRandomTokenCode();
    return [
      {
        id: `tok_${Date.now()}_1`,
        nomor: 1,
        label: 'Token 1',
        token: initialTok,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      },
    ];
  });

  const [customTokenInput, setCustomTokenInput] = useState('');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Real-time clock tick for live countdowns (10-minute expiry)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  function generateRandomTokenCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Toggle selection for class
  const toggleClass = (kelasName: string) => {
    if (kelasName === 'Semua Kelas') {
      if (selectedClasses.includes('Semua Kelas')) {
        setSelectedClasses(['X MIPA 1', 'X MIPA 2']);
      } else {
        setSelectedClasses(['Semua Kelas']);
      }
      return;
    }

    let next = selectedClasses.filter((c) => c !== 'Semua Kelas');
    if (next.includes(kelasName)) {
      next = next.filter((c) => c !== kelasName);
    } else {
      next = [...next, kelasName];
    }

    if (next.length === 0) {
      next = [kelasName];
    }
    setSelectedClasses(next);
  };

  // Generate next automatic token (Token 1, Token 2, Token 3, Token 4, dst.)
  const handleGenerateNextToken = () => {
    const nextNomor = tokenList.length + 1;
    const newTokenCode = generateRandomTokenCode();
    const now = Date.now();
    const newToken: ExamToken = {
      id: `tok_${now}_${nextNomor}`,
      nomor: nextNomor,
      label: `Token ${nextNomor}`,
      token: newTokenCode,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(), // 10 minutes from now
      isCustom: false,
    };

    setTokenList((prev) => [newToken, ...prev]);
    setUseToken(true);
  };

  // Create custom token by teacher
  const handleAddCustomToken = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = customTokenInput.trim().toUpperCase();
    if (!clean) return;

    const nextNomor = tokenList.length + 1;
    const now = Date.now();
    const newToken: ExamToken = {
      id: `tok_${now}_${nextNomor}`,
      nomor: nextNomor,
      label: `Token ${nextNomor}`,
      token: clean,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(), // 10 minutes from now
      isCustom: true,
    };

    setTokenList((prev) => [newToken, ...prev]);
    setCustomTokenInput('');
    setUseToken(true);
  };

  // Extend token by +10 minutes
  const handleExtendToken = (tokenId: string) => {
    setTokenList((prev) =>
      prev.map((t) => {
        if (t.id === tokenId) {
          const now = Date.now();
          return {
            ...t,
            expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
          };
        }
        return t;
      })
    );
  };

  // Delete token
  const handleDeleteToken = (tokenId: string) => {
    setTokenList((prev) => prev.filter((t) => t.id !== tokenId));
  };

  const handleCopyToken = (tok: ExamToken) => {
    navigator.clipboard.writeText(tok.token).catch(() => {});
    setCopiedTokenId(tok.id);
    setTimeout(() => setCopiedTokenId(null), 2000);
  };

  const setPresetMulai = (tipe: 'sekarang' | 'besok_pagi' | 'hapus') => {
    if (tipe === 'hapus') {
      setWaktuMulai('');
      return;
    }
    const d = new Date();
    if (tipe === 'sekarang') {
      const pad = (n: number) => String(n).padStart(2, '0');
      setWaktuMulai(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
    } else if (tipe === 'besok_pagi') {
      d.setDate(d.getDate() + 1);
      const pad = (n: number) => String(n).padStart(2, '0');
      setWaktuMulai(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T07:30`);
    }
  };

  const setPresetKadaluarsa = (hoursToAdd: number | 'akhir_hari' | 'hapus') => {
    if (hoursToAdd === 'hapus') {
      setWaktuKadaluarsa('');
      return;
    }
    const d = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    if (hoursToAdd === 'akhir_hari') {
      setWaktuKadaluarsa(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T23:59`);
      return;
    }
    d.setHours(d.getHours() + hoursToAdd);
    setWaktuKadaluarsa(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    );
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    // Active token is the first active one, or first token in list
    const activeValid = tokenList.find((t) => new Date(t.expiresAt).getTime() > Date.now());
    const primaryToken = activeValid ? activeValid.token : tokenList[0]?.token;

    const updated: Exam = {
      ...exam,
      status,
      kelasTarget: selectedClasses,
      waktuMulai: waktuMulai.trim() || undefined,
      waktuKadaluarsa: waktuKadaluarsa.trim() || undefined,
      useToken,
      tokenUjian: useToken ? primaryToken : undefined,
      tokenList: useToken ? tokenList : undefined,
      durasiMenit,
      kkm,
      acakSoal,
      acakOpsi,
      tampilkanNilai,
    };

    onSave(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 900);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30">
              <Settings className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="text-base font-bold leading-tight">Setting Soal, Jadwal & Multi-Token Ujian</h3>
              <p className="text-xs text-indigo-200 truncate max-w-md">{exam.judul}</p>
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
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {saveSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Pengaturan ujian berhasil disimpan dan diperbarui!</span>
            </div>
          )}

          {/* 1. Status Aktif / Non-aktif */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-0.5">
                  Status Akses Ujian (Aktif / Nonaktif)
                </label>
                <p className="text-[11px] text-slate-500">
                  Ujian yang aktif dapat dilihat dan dikerjakan oleh siswa di kelas target.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatus('aktif')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    status === 'aktif'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/30'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Aktif (Dibuka)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus('draft')}
                  className={`px-3.5 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                    status === 'draft'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-500/30'
                      : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Nonaktif (Ditutup)</span>
                </button>
              </div>
            </div>
          </div>

          {/* 2. PILIH KELAS SASARAN (Tinggal Pilih Kelas) */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span>Kelas Sasaran Ujian (Tinggal Pilih Rombel)</span>
                </h4>
                <p className="text-[11px] text-indigo-900/80 mt-0.5">
                  Klik kelas di bawah untuk memilih rombel yang diizinkan mengikuti asesmen ini.
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                {selectedClasses.includes('Semua Kelas')
                  ? 'Semua Kelas Dipilih'
                  : `${selectedClasses.length} Kelas Terpilih`}
              </span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              {classChoices.map((cls) => {
                const isSelected = selectedClasses.includes(cls);
                return (
                  <button
                    key={cls}
                    type="button"
                    onClick={() => toggleClass(cls)}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-400/30'
                        : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-full border border-slate-300" />
                    )}
                    <span>{cls}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Pengaturan Waktu Mulai & Waktu Kadaluarsa */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <Calendar className="w-4 h-4 text-indigo-600" />
                <span>Jadwal Aktif & Batas Kadaluarsa Ujian</span>
              </h4>
              <p className="text-[11px] text-slate-500">
                Tentukan rentang tanggal dan jam pengerjaan. Di luar rentang waktu ini, siswa akan diblokir dari memulai ujian.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Waktu Mulai */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Waktu Mulai Aktif
                </label>
                <input
                  type="datetime-local"
                  value={waktuMulai}
                  onChange={(e) => setWaktuMulai(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPresetMulai('sekarang')}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 font-semibold"
                  >
                    Sekarang
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetMulai('besok_pagi')}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 font-semibold"
                  >
                    Besok 07:30
                  </button>
                  {waktuMulai && (
                    <button
                      type="button"
                      onClick={() => setPresetMulai('hapus')}
                      className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-[10px] text-rose-700 font-semibold"
                    >
                      Hapus Batas
                    </button>
                  )}
                </div>
              </div>

              {/* Waktu Kadaluarsa */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Waktu Kadaluarsa (Batas Selesai)
                </label>
                <input
                  type="datetime-local"
                  value={waktuKadaluarsa}
                  onChange={(e) => setWaktuKadaluarsa(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                />
                <div className="flex flex-wrap gap-1 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setPresetKadaluarsa(1)}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 font-semibold"
                  >
                    +1 Jam
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetKadaluarsa(2)}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 font-semibold"
                  >
                    +2 Jam
                  </button>
                  <button
                    type="button"
                    onClick={() => setPresetKadaluarsa('akhir_hari')}
                    className="px-2 py-0.5 rounded bg-slate-200 hover:bg-slate-300 text-[10px] text-slate-700 font-semibold"
                  >
                    Hari Ini 23:59
                  </button>
                  {waktuKadaluarsa && (
                    <button
                      type="button"
                      onClick={() => setPresetKadaluarsa('hapus')}
                      className="px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-[10px] text-rose-700 font-semibold"
                    >
                      Hapus Batas
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 4. MULTI-TOKEN DENGAN GENERATE & EXPIRED 10 MENIT + TOKEN CUSTOM */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Keamanan Multi-Token Ujian CBT (Berlaku 10 Menit)</span>
                </h4>
                <p className="text-[11px] text-indigo-900/80 mt-0.5">
                  Buat beberapa token bertahap (Token 1, Token 2, Token 3, dst.) atau buat token custom sendiri. Setiap token otomatis kadaluarsa setelah 10 menit.
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useToken}
                  onChange={(e) => setUseToken(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-hidden rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {useToken && (
              <div className="space-y-4 pt-2 border-t border-indigo-200/80">
                {/* Generation & Custom Token Input Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs">
                  {/* Option A: Generate Token Otomatis */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Generate Token Otomatis (Token {tokenList.length + 1})
                    </label>
                    <button
                      type="button"
                      onClick={handleGenerateNextToken}
                      className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer shadow-xs"
                    >
                      <Zap className="w-4 h-4 text-amber-300" />
                      <span>Generate Token {tokenList.length + 1} (Acak 10 Menit)</span>
                    </button>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Membuat token acak berikutnya yang aktif selama 10 menit.
                    </span>
                  </div>

                  {/* Option B: Buat Token Custom Sendiri */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Atau Buat Token Custom Sendiri
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={customTokenInput}
                        onChange={(e) => setCustomTokenInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddCustomToken();
                          }
                        }}
                        placeholder="Ketik token, misal: BIO26"
                        maxLength={12}
                        className="flex-1 px-3 py-2 text-xs font-mono font-bold uppercase bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddCustomToken()}
                        disabled={!customTokenInput.trim()}
                        className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs transition cursor-pointer"
                      >
                        + Tambah
                      </button>
                    </div>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Guru bebas menentukan teks token sendiri dengan masa berlaku 10 menit.
                    </span>
                  </div>
                </div>

                {/* List of Generated Tokens */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 px-1">
                    <span>Daftar Token Ujian ({tokenList.length} Token)</span>
                    <span className="text-slate-500 font-normal">
                      Siswa dapat masuk menggunakan token apa pun yang masih berstatus Aktif.
                    </span>
                  </div>

                  {tokenList.length === 0 ? (
                    <div className="p-4 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                      Belum ada token yang dibuat. Tekan tombol Generate di atas untuk membuat Token 1.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {tokenList.map((tok) => {
                        const expireTime = new Date(tok.expiresAt).getTime();
                        const isExpired = currentTime >= expireTime;
                        const secondsLeft = Math.max(0, Math.floor((expireTime - currentTime) / 1000));
                        const minutesLeft = Math.floor(secondsLeft / 60);
                        const displaySecs = String(secondsLeft % 60).padStart(2, '0');

                        return (
                          <div
                            key={tok.id}
                            className={`p-3 rounded-2xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 transition ${
                              isExpired
                                ? 'bg-slate-100/80 border-slate-300 opacity-75'
                                : 'bg-white border-indigo-200 shadow-xs ring-1 ring-indigo-50'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-900 font-bold text-xs">
                                {tok.label}
                              </span>
                              <span className="font-mono text-base font-black tracking-widest text-slate-900 bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                                {tok.token}
                              </span>
                              {tok.isCustom && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
                                  Custom
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Expiry Badge */}
                              {isExpired ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-rose-600" />
                                  <span>Kadaluarsa (&gt;10 Menit)</span>
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1 font-mono">
                                  <Timer className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Aktif (Sisa {minutesLeft}:{displaySecs})</span>
                                </span>
                              )}

                              {/* Actions */}
                              <button
                                type="button"
                                onClick={() => handleCopyToken(tok)}
                                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                                title="Salin kode token"
                              >
                                {copiedTokenId === tok.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleExtendToken(tok.id)}
                                className="px-2.5 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[11px] font-bold transition cursor-pointer border border-indigo-200"
                                title="Reset masa berlaku +10 menit dari sekarang"
                              >
                                +10 Mnt
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteToken(tok.id)}
                                className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition cursor-pointer"
                                title="Hapus token"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 5. Durasi & Opsi Asesmen CBT */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Durasi Pengerjaan (Menit)
              </label>
              <input
                type="number"
                min={5}
                max={300}
                value={durasiMenit}
                onChange={(e) => setDurasiMenit(Number(e.target.value) || 60)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Kriteria Ketuntasan Minimal (KKM)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={kkm}
                onChange={(e) => setKkm(Number(e.target.value) || 75)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold"
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acakSoal}
                onChange={(e) => setAcakSoal(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Acak Urutan Butir Soal per Siswa
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={acakOpsi}
                onChange={(e) => setAcakOpsi(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Acak Pilihan Jawaban A, B, C, D, E
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={tampilkanNilai}
                onChange={(e) => setTampilkanNilai(e.target.checked)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs text-slate-700 font-medium">
                Tampilkan Skor & Pembahasan Langsung setelah Siswa Mengirimkan Ujian
              </span>
            </label>
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
              <span>Simpan Pengaturan Ujian</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
