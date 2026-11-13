import React, { useState, useEffect, useMemo } from 'react';
import { Exam, ExamToken } from '../../types';
import { useLMS } from '../../context/LMSContext';
import {
  X,
  Settings,
  Calendar,
  KeyRound,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  Trash2,
  School,
  Timer,
  Zap,
  Users,
  Search,
} from 'lucide-react';

interface ExamSettingsModalProps {
  exam: Exam | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedExam: Exam) => void;
}

export const ALL_CLASSES_LIST = [
  'X 3',
  'X 4',
  'XI 1',
  'XI 2',
  'XI 3',
  'XI 4',
  'XII 3',
  'XII 4',
  'Semua Kelas',
];

function sortClassesNatural(classes: string[]): string[] {
  const rank = (c: string) => {
    const upper = c.trim().toUpperCase();
    if (upper === 'SEMUA KELAS') return 999;
    if (upper.startsWith('XII')) return 3;
    if (upper.startsWith('XI')) return 2;
    if (upper.startsWith('X')) return 1;
    return 4;
  };
  return [...classes].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return a.localeCompare(b, 'id-ID', { numeric: true });
  });
}

function generateRandomTokenCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export const ExamSettingsModal: React.FC<ExamSettingsModalProps> = ({
  exam,
  isOpen,
  onClose,
  onSave,
}) => {
  const { rombelList, currentUser, users, kelasMapelPengampuList } = useLMS();
  const isTeacher = currentUser?.role === 'guru';

  const taughtClasses = useMemo(() => {
    if (!isTeacher || !currentUser) return [];
    const fromProfile = currentUser.kelasAjar || [];
    const fromPlotting = kelasMapelPengampuList
      .filter(
        (k) =>
          k.guruId === currentUser.id ||
          (k.guruNama &&
            currentUser.name &&
            k.guruNama.trim().toLowerCase() === currentUser.name.trim().toLowerCase())
      )
      .map((k) => k.kelasNama);
    const fromWali = rombelList
      .filter((r) => r.waliKelasId === currentUser.id)
      .map((r) => r.nama);
    return sortClassesNatural(
      Array.from(
        new Set([...fromProfile, ...fromPlotting, ...fromWali].map((k) => k.trim()).filter(Boolean))
      )
    );
  }, [isTeacher, currentUser, kelasMapelPengampuList, rombelList]);

  const allSchoolClasses = useMemo(() => {
    const fromRombels = rombelList.map((r) => r.nama.trim()).filter(Boolean);
    const fallback = ALL_CLASSES_LIST.filter((c) => c !== 'Semua Kelas');
    const merged = Array.from(new Set(fromRombels.length > 0 ? fromRombels : fallback));
    return sortClassesNatural(merged);
  }, [rombelList]);

  const [showAllRombels, setShowAllRombels] = useState<boolean>(false);

  const classChoices = useMemo(() => {
    if (isTeacher && currentUser) {
      if (showAllRombels || taughtClasses.length === 0) {
        return sortClassesNatural(Array.from(new Set([...taughtClasses, ...allSchoolClasses])));
      }
      return taughtClasses;
    }
    return [...allSchoolClasses, 'Semua Kelas'];
  }, [isTeacher, currentUser, showAllRombels, taughtClasses, allSchoolClasses]);

  const [status, setStatus] = useState<'draft' | 'aktif' | 'selesai'>('aktif');
  const [selectedClasses, setSelectedClasses] = useState<string[]>(['XII 3']);
  const [targetMode, setTargetMode] = useState<'class' | 'students'>('class');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [studentSearch, setStudentSearch] = useState<string>('');
  const [waktuMulai, setWaktuMulai] = useState<string>('');
  const [waktuKadaluarsa, setWaktuKadaluarsa] = useState<string>('');
  const [useToken, setUseToken] = useState<boolean>(true);
  const [durasiMenit, setDurasiMenit] = useState<number>(60);
  const [kkm, setKkm] = useState<number>(75);
  const [acakSoal, setAcakSoal] = useState<boolean>(true);
  const [acakOpsi, setAcakOpsi] = useState<boolean>(true);
  const [tampilkanNilai, setTampilkanNilai] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
  const [tokenList, setTokenList] = useState<ExamToken[]>([]);
  const [customTokenInput, setCustomTokenInput] = useState('');
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  // Sync form states whenever exam or modal open state changes
  useEffect(() => {
    if (!isOpen || !exam) return;
    setStatus(exam.status || 'aktif');

    // Automatically show all X, XI, XII rombels when teacher only has 1 tingkat or 0 classes assigned
    const hasLevelX = taughtClasses.some((c) => /^X\b/i.test(c));
    const hasLevelXI = taughtClasses.some((c) => /^XI\b/i.test(c));
    const hasLevelXII = taughtClasses.some((c) => /^XII\b/i.test(c));
    const missingLevels = !hasLevelX || !hasLevelXI || !hasLevelXII;
    setShowAllRombels(isTeacher && (taughtClasses.length === 0 || missingLevels));

    const rawClasses = (exam.kelasTarget || []).map((k) => k.trim()).filter(Boolean);
    const availablePool = isTeacher
      ? sortClassesNatural(Array.from(new Set([...taughtClasses, ...allSchoolClasses])))
      : [...allSchoolClasses, 'Semua Kelas'];

    if (rawClasses.length > 0) {
      setSelectedClasses(rawClasses);
    } else if (taughtClasses.length > 0) {
      setSelectedClasses([taughtClasses[0]]);
    } else if (availablePool.length > 0) {
      setSelectedClasses([availablePool[0]]);
    } else {
      setSelectedClasses(['XII 3', 'XII 4']);
    }

    if (exam.targetSiswaIds && exam.targetSiswaIds.length > 0) {
      setTargetMode('students');
      setSelectedStudentIds(exam.targetSiswaIds);
    } else {
      setTargetMode('class');
      setSelectedStudentIds([]);
    }
    setStudentSearch('');

    setWaktuMulai(exam.waktuMulai || '');
    setWaktuKadaluarsa(exam.waktuKadaluarsa || '');
    setUseToken(exam.useToken ?? !!exam.tokenUjian);
    setDurasiMenit(exam.durasiMenit || 60);
    setKkm(exam.kkm || 75);
    setAcakSoal(exam.acakSoal ?? true);
    setAcakOpsi(exam.acakOpsi ?? true);
    setTampilkanNilai(exam.tampilkanNilai ?? true);
    setSaveSuccess(false);

    if (exam.tokenList && exam.tokenList.length > 0) {
      setTokenList(exam.tokenList);
    } else if (exam.tokenUjian) {
      setTokenList([
        {
          id: `tok_${Date.now()}_1`,
          nomor: 1,
          label: 'Token 1',
          token: exam.tokenUjian,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      ]);
    } else {
      setTokenList([
        {
          id: `tok_${Date.now()}_1`,
          nomor: 1,
          label: 'Token 1',
          token: generateRandomTokenCode(),
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        },
      ]);
    }
  }, [exam, isOpen, isTeacher, taughtClasses, allSchoolClasses]);

  // Real-time clock tick for live countdowns (10-minute expiry)
  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  // Eligible students inside selected classes
  const studentsInSelectedClasses = useMemo(() => {
    const classSet = new Set(selectedClasses.map((c) => c.trim().toLowerCase()));
    const isAllClasses = !isTeacher && selectedClasses.includes('Semua Kelas');
    return users
      .filter((u) => {
        if (u.role !== 'siswa') return false;
        if (isAllClasses) return true;
        return !!u.kelas && classSet.has(u.kelas.trim().toLowerCase());
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'id-ID'));
  }, [users, selectedClasses, isTeacher]);

  const filteredStudentCandidates = useMemo(() => {
    if (!studentSearch.trim()) return studentsInSelectedClasses;
    const q = studentSearch.toLowerCase();
    return studentsInSelectedClasses.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.kelas && s.kelas.toLowerCase().includes(q)) ||
        (s.nisn && s.nisn.includes(q))
    );
  }, [studentsInSelectedClasses, studentSearch]);

  if (!isOpen || !exam) return null;

  // Toggle selection for class
  const toggleClass = (kelasName: string) => {
    if (kelasName === 'Semua Kelas') {
      if (selectedClasses.includes('Semua Kelas')) {
        setSelectedClasses(classChoices.filter((c) => c !== 'Semua Kelas').slice(0, 1));
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

  const toggleStudentSelection = (siswaId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(siswaId) ? prev.filter((id) => id !== siswaId) : [...prev, siswaId]
    );
  };

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
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
      isCustom: false,
    };

    setTokenList((prev) => [newToken, ...prev]);
    setUseToken(true);
  };

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
      expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
      isCustom: true,
    };

    setTokenList((prev) => [newToken, ...prev]);
    setCustomTokenInput('');
    setUseToken(true);
  };

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
    const pad = (n: number) => String(n).padStart(2, '0');
    if (tipe === 'sekarang') {
      setWaktuMulai(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      );
    } else if (tipe === 'besok_pagi') {
      d.setDate(d.getDate() + 1);
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
    if (targetMode === 'students' && selectedStudentIds.length === 0) {
      alert('Pilih minimal 1 siswa jika menggunakan mode "Siswa Tertentu Saja"!');
      return;
    }

    const activeValid = tokenList.find((t) => new Date(t.expiresAt).getTime() > Date.now());
    const primaryToken = activeValid ? activeValid.token : tokenList[0]?.token;

    const updated: Exam = {
      ...exam,
      status,
      kelasTarget: selectedClasses,
      targetSiswaIds: targetMode === 'students' ? selectedStudentIds : undefined,
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
              <h3 className="text-base font-bold leading-tight">Setting Soal, Peserta, Jadwal & Multi-Token</h3>
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
                  Status Akses Ujian / Tugas (Aktif / Nonaktif)
                </label>
                <p className="text-[11px] text-slate-500">
                  Asesmen yang aktif dapat dilihat dan dikerjakan oleh peserta di kelas/siswa sasaran.
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

          {/* 2. PILIH KELAS SASARAN (X, XI, XII) */}
          <div className="p-4 bg-indigo-50/50 border border-indigo-200/80 rounded-2xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                  <School className="w-4 h-4 text-indigo-600" />
                  <span>Kelas Sasaran Asesmen (Tingkat X, XI &amp; XII)</span>
                </h4>
                <p className="text-[11px] text-indigo-900/80 mt-0.5">
                  Klik kelas di bawah untuk memilih rombel X, XI, atau XII yang diizinkan mengikuti asesmen/tugas ini.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {isTeacher && taughtClasses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowAllRombels((prev) => !prev)}
                    className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-50 transition cursor-pointer"
                  >
                    {showAllRombels ? 'Filter Kelas Ajar Saja' : 'Tampilkan Semua X, XI, XII'}
                  </button>
                )}
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {selectedClasses.includes('Semua Kelas')
                    ? 'Semua Kelas Dipilih'
                    : `${selectedClasses.length} Kelas Terpilih`}
                </span>
              </div>
            </div>

            {classChoices.length === 0 ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px]">
                Belum ada rombel kelas tersedia. Tambahkan rombel di panel Administrator.
              </div>
            ) : (
              <div className="space-y-2.5 pt-1">
                {(['X', 'XI', 'XII', 'LAIN'] as const).map((lvl) => {
                  const groupItems = classChoices.filter((cls) => {
                    const up = cls.trim().toUpperCase();
                    if (lvl === 'XII') return up.startsWith('XII');
                    if (lvl === 'XI') return up.startsWith('XI') && !up.startsWith('XII');
                    if (lvl === 'X') return up.startsWith('X') && !up.startsWith('XI') && !up.startsWith('XII');
                    return !up.startsWith('X');
                  });
                  if (groupItems.length === 0) return null;
                  return (
                    <div key={lvl} className="space-y-1.5">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                        {lvl === 'LAIN' ? 'Opsi Umum' : `Kelas ${lvl}`}
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {groupItems.map((cls) => {
                          const isSelected = selectedClasses.includes(cls);
                          const isTaught = taughtClasses.some(
                            (t) => t.toLowerCase() === cls.toLowerCase()
                          );
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
                              {isTeacher && isTaught && (
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded-full ${
                                    isSelected
                                      ? 'bg-indigo-500 text-white'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}
                                >
                                  Ajar
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Target Mode: Seluruh Siswa di Kelas vs Siswa Tertentu Saja */}
            <div className="pt-3 border-t border-indigo-200/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Target Peserta Siswa</span>
                  </span>
                  <span className="text-[10px] text-slate-600">
                    Bisa diberikan ke seluruh siswa kelas terpilih atau siswa tertentu saja (misal remedial/susulan).
                  </span>
                </div>
                <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-indigo-200">
                  <button
                    type="button"
                    onClick={() => setTargetMode('class')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      targetMode === 'class'
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Semua Siswa di Kelas
                  </button>
                  <button
                    type="button"
                    onClick={() => setTargetMode('students')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      targetMode === 'students'
                        ? 'bg-amber-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    Siswa Tertentu ({selectedStudentIds.length})
                  </button>
                </div>
              </div>

              {targetMode === 'students' && (
                <div className="bg-white rounded-2xl border border-indigo-200 p-3 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Cari nama atau NISN siswa..."
                        className="w-full pl-8 pr-3 py-1.5 text-[11px] bg-slate-50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds(studentsInSelectedClasses.map((s) => s.id))}
                        className="px-2 py-1 text-[10px] font-bold rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 cursor-pointer"
                      >
                        Pilih Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedStudentIds([])}
                        className="px-2 py-1 text-[10px] font-bold rounded bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  {filteredStudentCandidates.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-3">
                      Tidak ada data siswa pada kelas sasaran terpilih.
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-1.5 pr-1">
                      {filteredStudentCandidates.map((st) => {
                        const checked = selectedStudentIds.includes(st.id);
                        return (
                          <label
                            key={st.id}
                            className={`flex items-center gap-2 p-2 rounded-xl border text-[11px] cursor-pointer transition ${
                              checked
                                ? 'bg-amber-50 border-amber-300 text-amber-950 font-semibold'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStudentSelection(st.id)}
                              className="rounded border-slate-300 text-amber-600"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="truncate font-bold">{st.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">
                                {st.kelas} • {st.nisn || `@${st.username}`}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
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

          {/* 4. MULTI-TOKEN */}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-2xl border border-indigo-200 shadow-xs">
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
                  </div>

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
                  </div>
                </div>

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
