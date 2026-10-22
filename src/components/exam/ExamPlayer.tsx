import React, { useState, useEffect, useRef } from 'react';
import { useLMS } from '../../context/LMSContext';
import { QuestionItem, Exam, ExamSubmission } from '../../types';
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  ShieldAlert,
  Maximize,
  HelpCircle,
  CheckCircle2,
  Bookmark,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { alarmAudio } from '../../utils/audioAlarm';
import { APP_LOGO_URL } from '../../constants/assets';
import confetti from 'canvas-confetti';

interface ExamPlayerProps {
  exam: Exam;
  submission: ExamSubmission;
}

export const ExamPlayer: React.FC<ExamPlayerProps> = ({ exam, submission }) => {
  const {
    currentUser,
    updateStudentAnswer,
    recordCheatingViolation,
    finishAndSubmitExam,
    exitExamPlayer,
  } = useLMS();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return submission.sisaWaktuDetik || exam.durasiMenit * 60;
  });

  // Anti-cheat modal & state
  const [isCheatAlertOpen, setIsCheatAlertOpen] = useState(false);
  const [cheatReason, setCheatReason] = useState('');
  const [violationCount, setViolationCount] = useState(submission.violations?.length || 0);
  const [isSubmitConfirmOpen, setIsSubmitConfirmOpen] = useState(false);
  const [isExamCompleted, setIsExamCompleted] = useState(submission.status === 'sudah_dikumpulkan');
  const [completedResult, setCompletedResult] = useState<ExamSubmission | null>(
    submission.status === 'sudah_dikumpulkan' ? submission : null
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const isSubmittedRef = useRef(isExamCompleted);
  isSubmittedRef.current = isExamCompleted;

  const currentSoal: QuestionItem | undefined = exam.soalList[currentIndex];
  const currentAnswerObj = currentSoal ? submission.jawabanMap[currentSoal.id] : undefined;
  const currentAnswer = currentAnswerObj?.jawaban;
  const isRaguRagu = !!currentAnswerObj?.raguRagu;

  // Request Fullscreen on mount
  useEffect(() => {
    const enterFullscreen = async () => {
      try {
        if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } catch {
        // May require user click
      }
    };

    enterFullscreen();

    // Prevent context menu (right click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      triggerCheatingWarning('context_menu', 'Klik kanan (Context Menu) terlarang saat ujian');
    };

    // Listen to Fullscreen Change
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && !isSubmittedRef.current) {
        triggerCheatingWarning('exit_fullscreen', 'Siswa keluar dari tampilan layar penuh (Fullscreen)');
      }
    };

    // Listen to Tab Switch / Visibility Change
    const handleVisibilityChange = () => {
      if (document.hidden && !isSubmittedRef.current) {
        triggerCheatingWarning('tab_switch', 'Siswa berpindah tab browser atau meminimalkan jendela');
      }
    };

    // Listen to Window Blur
    const handleBlur = () => {
      if (!isSubmittedRef.current) {
        triggerCheatingWarning('window_blur', 'Fokus jendela ujian hilang (terdeteksi aplikasi lain aktif)');
      }
    };

    // Prevent Key Shortcuts (F11, F12, Escape, Ctrl+C, Ctrl+V, Alt+Tab)
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        e.key === 'F11' ||
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 's' || e.key === 'p')) ||
        (e.altKey && e.key === 'Tab')
      ) {
        e.preventDefault();
        triggerCheatingWarning('key_shortcut', `Percobaan penekanan tombol kombinasi terlarang (${e.key})`);
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('keydown', handleKeyDown);
      alarmAudio.stopSiren();
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (isExamCompleted) return;

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isExamCompleted]);

  const triggerCheatingWarning = (tipe: any, deskripsi: string) => {
    if (isSubmittedRef.current) return;

    recordCheatingViolation(tipe, deskripsi);
    setViolationCount((c) => c + 1);
    setCheatReason(deskripsi);
    setIsCheatAlertOpen(true);
    alarmAudio.startSiren();
  };

  const handleDismissCheatAlert = async () => {
    alarmAudio.stopSiren();
    setIsCheatAlertOpen(false);
    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Ignored
    }
  };

  const handleAutoSubmit = () => {
    const result = finishAndSubmitExam();
    if (result) {
      setIsExamCompleted(true);
      setCompletedResult(result);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  const handleSubmitExam = () => {
    setIsSubmitConfirmOpen(false);
    const result = finishAndSubmitExam();
    if (result) {
      setIsExamCompleted(true);
      setCompletedResult(result);

      if (result.nilai100 >= exam.kkm) {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      }

      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Format Timer HH:MM:SS
  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper check if question is answered
  const isQuestionAnswered = (qId: string) => {
    const ansObj = submission.jawabanMap[qId];
    if (!ansObj || ansObj.jawaban === undefined || ansObj.jawaban === null || ansObj.jawaban === '') {
      return false;
    }
    if (Array.isArray(ansObj.jawaban)) {
      return ansObj.jawaban.length > 0;
    }
    if (typeof ansObj.jawaban === 'object') {
      return Object.keys(ansObj.jawaban).length > 0;
    }
    return true;
  };

  const totalAnswered = exam.soalList.filter((q) => isQuestionAnswered(q.id)).length;
  const totalQuestions = exam.soalList.length;

  // View: Exam Completed Result Summary
  if (isExamCompleted && completedResult) {
    const isPassed = completedResult.nilai100 >= exam.kkm;
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 border border-slate-700 max-w-lg w-full rounded-3xl p-6 sm:p-8 text-center shadow-2xl animate-in zoom-in-95">
          <div
            className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl font-black mb-4 ${
              isPassed ? 'bg-emerald-500/20 text-emerald-400 border-2 border-emerald-500' : 'bg-amber-500/20 text-amber-400 border-2 border-amber-500'
            }`}
          >
            {completedResult.nilai100}
          </div>

          <h2 className="text-xl font-bold">Ujian Telah Selesai Dikirim!</h2>
          <p className="text-xs text-slate-400 mt-1">
            Terima kasih telah mengerjakan {exam.judul} secara jujur dan tertib.
          </p>

          <div className="grid grid-cols-2 gap-3 my-6 text-left">
            <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Nama Siswa</span>
              <p className="font-bold text-xs text-white">{completedResult.siswaNama}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Kelas</span>
              <p className="font-bold text-xs text-white">{completedResult.siswaKelas}</p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Skor Diperoleh</span>
              <p className="font-bold text-xs text-white">
                {completedResult.totalSkor} / {completedResult.maxSkor}
              </p>
            </div>
            <div className="p-3 bg-slate-700/50 rounded-xl border border-slate-600/50">
              <span className="text-[10px] text-slate-400 uppercase font-bold">Catatan Kecurangan</span>
              <p className={`font-bold text-xs ${completedResult.violations?.length ? 'text-rose-400' : 'text-emerald-400'}`}>
                {completedResult.violations?.length ? `${completedResult.violations.length}x Pelanggaran` : 'Nihil / Bersih'}
              </p>
            </div>
          </div>

          <button
            onClick={exitExamPlayer}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 font-bold text-xs text-white shadow-lg transition"
          >
            Kembali ke Dashboard Siswa
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-slate-100 flex flex-col justify-between select-none overflow-hidden font-sans"
    >
      {/* 1. TOP HEADER (Requirement 7: Nama Siswa & Kelas KIRI ATAS, Timer KANAN ATAS) */}
      <header className="h-16 bg-white border-b border-slate-300 px-4 sm:px-6 flex items-center justify-between shadow-xs shrink-0">
        {/* Kiri Atas: Nama Siswa & Kelas */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {currentUser?.name.charAt(0) || 'S'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 leading-tight">
                {currentUser?.name || submission.siswaNama}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {currentUser?.kelas || submission.siswaKelas}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">
              NISN: {currentUser?.nisn || submission.siswaNisn} • {exam.mataPelajaran}
            </p>
          </div>
        </div>

        {/* Tengah: Judul Ujian & Nomor Aktif */}
        <div className="hidden md:flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg overflow-hidden bg-white border border-slate-200 flex items-center justify-center p-0.5 shrink-0 shadow-2xs">
            <img src={APP_LOGO_URL} alt="EduCBT Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col items-start">
            <span className="text-xs font-extrabold text-slate-800 tracking-tight">
              {exam.judul}
            </span>
            <span className="text-[11px] font-semibold text-indigo-600">
              Nomor {currentIndex + 1} dari {totalQuestions} Soal
            </span>
          </div>
        </div>

        {/* Kanan Atas: Timer Countdown */}
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-bold border transition ${
              secondsRemaining < 300
                ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                : 'bg-slate-50 text-slate-800 border-slate-300'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{formatTimer(secondsRemaining)}</span>
          </div>

          <button
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim Jawaban</span>
          </button>
        </div>
      </header>

      {/* 2. MAIN EXAM BODY (Question area + Palette Grid) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: Question Renderer */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-5">
            {currentSoal ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm">
                {/* Header Soal */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-extrabold text-sm">
                      SOAL NO. {currentIndex + 1}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-bold text-[10px] uppercase tracking-wider">
                      {currentSoal.type.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">
                    Bobot: {currentSoal.bobot} Poin
                  </span>
                </div>

                {/* Stimulus / Deskripsi Wacana (Khusus TKA atau Soal Berbasis Cerita) */}
                {currentSoal.deskripsiStimulus && (
                  <div className="my-5 p-4 sm:p-5 rounded-2xl bg-indigo-50/60 border-l-4 border-indigo-600 text-xs sm:text-sm text-slate-900 leading-relaxed font-sans shadow-2xs">
                    <div className="flex items-center gap-2 mb-2 text-indigo-900 font-extrabold text-xs uppercase tracking-wide">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      <span>Wacana / Teks Stimulus Informasi:</span>
                    </div>
                    <div className="whitespace-pre-line text-slate-800 leading-relaxed font-normal">
                      {currentSoal.deskripsiStimulus}
                    </div>
                  </div>
                )}

                {/* Question Text */}
                <p className="text-sm sm:text-base font-semibold text-slate-900 leading-relaxed my-4">
                  {currentSoal.pertanyaan}
                </p>

                {/* Interactive Answer Input based on type */}
                {/* TYPE 1: PILIHAN GANDA (Single Choice) */}
                {currentSoal.type === 'pilihan_ganda' && currentSoal.pilihan && (
                  <div className="space-y-2.5 mt-6">
                    {currentSoal.pilihan.map((opt) => {
                      const isSelected = currentAnswer === opt.label;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateStudentAnswer(currentSoal.id, opt.label)}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <span className="flex-1 leading-snug">{opt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TYPE 2: PILIHAN GANDA KOMPLEKS (Multi Select) */}
                {currentSoal.type === 'pilihan_ganda_kompleks' && currentSoal.pilihan && (
                  <div className="space-y-2.5 mt-6">
                    <p className="text-xs text-indigo-700 font-bold bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      ℹ️ Soal Pilihan Ganda Kompleks: Anda dapat memilih lebih dari satu jawaban yang benar.
                    </p>
                    {currentSoal.pilihan.map((opt) => {
                      const selectedList: string[] = Array.isArray(currentAnswer) ? currentAnswer : [];
                      const isSelected = selectedList.includes(opt.label);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            const next = isSelected
                              ? selectedList.filter((x) => x !== opt.label)
                              : [...selectedList, opt.label];
                            updateStudentAnswer(currentSoal.id, next);
                          }}
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              isSelected ? 'bg-indigo-600' : 'border-2 border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <span className="flex-1 leading-snug">
                            <strong>{opt.label}.</strong> {opt.text}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* TYPE 3: ISIAN SINGKAT */}
                {currentSoal.type === 'isian_singkat' && (
                  <div className="mt-6 space-y-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Ketikkan Jawaban Singkat Anda di bawah ini:
                    </label>
                    <input
                      type="text"
                      value={currentAnswer || ''}
                      onChange={(e) => updateStudentAnswer(currentSoal.id, e.target.value)}
                      placeholder="Tuliskan jawaban Anda..."
                      className="w-full text-sm font-semibold p-3.5 border-2 border-slate-300 rounded-2xl focus:border-indigo-600 focus:ring-2 focus:ring-indigo-500/20 bg-slate-50/50"
                    />
                    <p className="text-[11px] text-slate-400">
                      Jawaban tidak sensitif huruf besar/kecil (case-insensitive).
                    </p>
                  </div>
                )}

                {/* TYPE 4: MENJODOHKAN / MEMASANGKAN */}
                {currentSoal.type === 'menjodohkan' && currentSoal.pasangan && (
                  <div className="mt-6 space-y-3">
                    <p className="text-xs text-indigo-700 font-bold bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      ℹ️ Jodohkan premis di kolom kiri dengan pilihan jawaban yang cocok di kolom kanan.
                    </p>
                    <div className="space-y-3">
                      {currentSoal.pasangan.map((p, pIdx) => {
                        const matchedAnswers: Record<string, string> =
                          typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};
                        const currentChoice = matchedAnswers[p.id] || '';

                        return (
                          <div
                            key={p.id}
                            className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs sm:text-sm"
                          >
                            <span className="font-bold text-slate-800 flex-1">
                              {pIdx + 1}. {p.premis}
                            </span>
                            <div className="sm:w-64">
                              <select
                                value={currentChoice}
                                onChange={(e) => {
                                  const updated = {
                                    ...matchedAnswers,
                                    [p.id]: e.target.value,
                                  };
                                  updateStudentAnswer(currentSoal.id, updated);
                                }}
                                className="w-full text-xs font-semibold px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                              >
                                <option value="">-- Pilih Pasangan --</option>
                                {currentSoal.pasangan?.map((item) => (
                                  <option key={item.id} value={item.jawaban}>
                                    {item.jawaban}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TYPE 5: BENAR-SALAH MODEL TKA (1 Deskripsi + 3 Pernyataan) */}
                {currentSoal.type === 'tka_benar_salah' && currentSoal.pernyataanTKA && (
                  <div className="mt-6 space-y-4">
                    <p className="text-xs font-bold text-indigo-900 uppercase tracking-wide bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      Tentukan Benar atau Salah untuk masing-masing dari 3 pernyataan berikut berdasarkan stimulus di atas:
                    </p>
                    <div className="space-y-3">
                      {currentSoal.pernyataanTKA.map((stmt, sIdx) => {
                        const tkaAnswers: Record<string, 'Benar' | 'Salah'> =
                          typeof currentAnswer === 'object' && currentAnswer !== null ? currentAnswer : {};
                        const currentChoice = tkaAnswers[stmt.id];

                        return (
                          <div
                            key={stmt.id}
                            className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                          >
                            <div className="flex-1 text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
                              <span className="text-indigo-600 font-extrabold mr-1.5">{sIdx + 1}.</span>
                              {stmt.pernyataan}
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = {
                                    ...tkaAnswers,
                                    [stmt.id]: 'Benar',
                                  };
                                  updateStudentAnswer(currentSoal.id, updated);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                                  currentChoice === 'Benar'
                                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                Benar
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = {
                                    ...tkaAnswers,
                                    [stmt.id]: 'Salah',
                                  };
                                  updateStudentAnswer(currentSoal.id, updated);
                                }}
                                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition cursor-pointer border ${
                                  currentChoice === 'Salah'
                                    ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                Salah
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </main>

        {/* Right Sidebar: Palette Grid Nomor Soal (Requirement 7: Hijau = Sudah dijawab, Putih = Belum dijawab) */}
        <aside className="w-full lg:w-80 bg-white border-t lg:border-t-0 lg:border-l border-slate-300 p-4 sm:p-5 flex flex-col justify-between shrink-0">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
              <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                Navigasi Soal
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Terjawab: <strong className="text-emerald-600">{totalAnswered}</strong> / {totalQuestions}
              </span>
            </div>

            {/* Grid Palette */}
            <div className="grid grid-cols-5 gap-2 max-h-56 lg:max-h-[60vh] overflow-y-auto p-1">
              {exam.soalList.map((q, idx) => {
                const answered = isQuestionAnswered(q.id);
                const isCurrent = idx === currentIndex;
                const isDoubt = submission.jawabanMap[q.id]?.raguRagu;

                let colorStyle = 'bg-white text-slate-800 border-2 border-slate-300 hover:border-slate-400'; // Belum dijawab = PUTIH

                if (answered) {
                  colorStyle = 'bg-emerald-600 text-white border-2 border-emerald-600 shadow-xs'; // Sudah dijawab = HIJAU
                }

                if (isDoubt) {
                  colorStyle = 'bg-amber-400 text-slate-950 border-2 border-amber-500 font-extrabold'; // Ragu-ragu = KUNING
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`h-11 rounded-xl text-xs font-extrabold flex flex-col items-center justify-center transition cursor-pointer relative ${colorStyle} ${
                      isCurrent ? 'ring-3 ring-indigo-500 ring-offset-2' : ''
                    }`}
                  >
                    <span>{idx + 1}</span>
                    {isDoubt && (
                      <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-slate-900" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend / Keterangan Warna Sesuai Soal */}
            <div className="mt-4 pt-3 border-t border-slate-200 space-y-2 text-[11px] font-semibold text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-emerald-600 border border-emerald-700" />
                <span>Hijau: Sudah Dijawab ({totalAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-white border-2 border-slate-300" />
                <span>Putih: Belum Dijawab ({totalQuestions - totalAnswered})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-md bg-amber-400 border border-amber-500" />
                <span>Kuning: Ragu-ragu</span>
              </div>
            </div>
          </div>

          {/* Quick Submit Info */}
          <div className="mt-4 pt-3 border-t border-slate-200">
            <button
              onClick={() => setIsSubmitConfirmOpen(true)}
              className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition"
            >
              <Send className="w-3.5 h-3.5 text-emerald-400" />
              <span>Selesai & Kumpulkan</span>
            </button>
          </div>
        </aside>
      </div>

      {/* 3. BOTTOM CONTROL BAR (Requirement 7: Tombol Back dan Next, Ragu-ragu) */}
      <footer className="h-16 bg-white border-t border-slate-300 px-4 sm:px-6 flex items-center justify-between shrink-0 shadow-lg">
        {/* Tombol Back / Sebelumnya */}
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Sebelumnya</span>
        </button>

        {/* Tombol Ragu-ragu */}
        {currentSoal && (
          <button
            type="button"
            onClick={() => {
              updateStudentAnswer(currentSoal.id, currentAnswer, !isRaguRagu);
            }}
            className={`flex items-center gap-1.5 px-3.5 sm:px-5 py-2 rounded-xl text-xs font-bold transition border ${
              isRaguRagu
                ? 'bg-amber-400 border-amber-500 text-slate-950 font-extrabold shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Ragu-Ragu</span>
          </button>
        )}

        {/* Tombol Next / Selanjutnya atau Submit */}
        {currentIndex < totalQuestions - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition"
          >
            <span>Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md transition"
          >
            <Send className="w-4 h-4" />
            <span>Kirim Jawaban</span>
          </button>
        )}
      </footer>

      {/* 4. MODAL ALARM & PERINGATAN KECURANGAN (Requirement 8 & 9) */}
      {isCheatAlertOpen && (
        <div className="fixed inset-0 z-50 bg-rose-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 text-center border-4 border-rose-600 shadow-2xl relative overflow-hidden animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-rose-100 text-rose-600 mx-auto flex items-center justify-center mb-4">
              <ShieldAlert className="w-10 h-10 animate-bounce" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-rose-100 text-rose-800 text-[11px] font-black tracking-wider uppercase mb-2">
              🚨 PERINGATAN KEAMANAN UJIAN 🚨
            </div>

            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Tindakan Mencurigakan Terdeteksi!
            </h3>

            <p className="mt-2 text-xs font-semibold text-rose-700 bg-rose-50 p-3 rounded-xl border border-rose-200">
              {cheatReason || 'Anda terdeteksi keluar dari layar fullscreen atau beralih tab.'}
            </p>

            <p className="mt-3 text-xs text-slate-600 leading-relaxed">
              Sistem telah mencatat pelanggaran ke-<strong>{violationCount}</strong> beserta waktu kejadian ke dalam <strong>Laporan Hasil Ujian Guru & Administrator</strong>.
            </p>

            <p className="mt-2 text-[11px] text-slate-400">
              Satu-satunya cara keluar resmi dari ujian adalah melalui tombol <strong>"Kirim Jawaban"</strong>.
            </p>

            <div className="mt-6">
              <button
                type="button"
                onClick={handleDismissCheatAlert}
                className="w-full py-3.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-sm shadow-lg shadow-rose-600/30 transition flex items-center justify-center gap-2"
              >
                <Maximize className="w-4 h-4" />
                <span>Matikan Alarm & Kembali ke Fullscreen</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. MODAL KONFIRMASI KIRIM JAWABAN */}
      {isSubmitConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-center text-slate-900">
              Konfirmasi Kirim Jawaban
            </h3>
            <p className="text-center text-xs text-slate-500 mt-1">
              Apakah Anda yakin ingin mengakhiri sesi ujian ini?
            </p>

            <div className="my-5 p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <div className="flex justify-between font-semibold">
                <span className="text-slate-600">Soal Sudah Dijawab:</span>
                <span className="font-bold text-emerald-600">{totalAnswered} Soal</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-600">Soal Belum Dijawab:</span>
                <span className="font-bold text-rose-600">{totalQuestions - totalAnswered} Soal</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span className="text-slate-600">Sisa Waktu:</span>
                <span className="font-mono font-bold text-slate-800">{formatTimer(secondsRemaining)}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsSubmitConfirmOpen(false)}
                className="flex-1 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Cek Kembali
              </button>
              <button
                type="button"
                onClick={handleSubmitExam}
                className="flex-1 py-3 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition"
              >
                Ya, Kirim Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
