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
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Smartphone,
  X,
  LogOut,
  Eye,
  EyeOff,
  LayoutGrid,
  MoveHorizontal,
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
    logout,
  } = useLMS();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    return submission.sisaWaktuDetik || exam.durasiMenit * 60;
  });

  // Mobile Swipe & Zoom states
  const [zoomLevel, setZoomLevel] = useState<number>(100); // 80%, 90%, 100%, 115%, 130%, 150%
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewZoom, setPreviewZoom] = useState<number>(1);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Pilihan Tampilkan / Sembunyikan Navigasi Soal (Nomor Soal)
  const [showQuestionNav, setShowQuestionNav] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('educbt_show_question_nav');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('educbt_show_question_nav', String(showQuestionNav));
    } catch {}
  }, [showQuestionNav]);

  // Auto-logout state after submission
  const [isAutoLoggingOut, setIsAutoLoggingOut] = useState(false);
  const [logoutCountdown, setLogoutCountdown] = useState(3);

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

  // Effect for Auto Logout Countdown after submission
  useEffect(() => {
    if (!isAutoLoggingOut) return;
    if (logoutCountdown <= 0) {
      exitExamPlayer();
      logout();
      return;
    }
    const timer = setTimeout(() => {
      setLogoutCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isAutoLoggingOut, logoutCountdown, exitExamPlayer, logout]);

  // Touch Swipe Handlers for Android & iPhone (Geser Soal)
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;

    const diffX = touchEndX - touchStartX.current;
    const diffY = touchEndY - touchStartY.current;

    // Minimum swipe threshold 50px horizontal, with minimal vertical deviation
    if (Math.abs(diffX) > 50 && Math.abs(diffY) < 70) {
      if (diffX < 0) {
        // Swipe left -> Soal Selanjutnya
        setCurrentIndex((prev) => Math.min(exam.soalList.length - 1, prev + 1));
      } else {
        // Swipe right -> Soal Sebelumnya
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleAutoSubmit = () => {
    const result = finishAndSubmitExam();
    if (result) {
      setIsExamCompleted(true);
      setCompletedResult(result);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsAutoLoggingOut(true);
      setLogoutCountdown(3);
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

      // Mulai countdown otomatis logout siswa
      setIsAutoLoggingOut(true);
      setLogoutCountdown(3);
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
  const totalRaguRagu = exam.soalList.filter((q) => !!submission.jawabanMap[q.id]?.raguRagu).length;

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

        {/* Kanan Atas: Zoom Controls + Timer Countdown + Kirim */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Zoom controls for desktop/tablet */}
          <div className="hidden sm:flex items-center gap-1 bg-slate-100 rounded-xl p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(80, z - 15))}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs shadow-2xs cursor-pointer"
              title="Perkecil Teks & Soal (A-)"
            >
              A-
            </button>
            <span className="text-[11px] font-mono font-bold text-slate-700 px-1.5">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="w-7 h-7 flex items-center justify-center rounded-lg bg-white text-slate-700 hover:bg-slate-200 font-bold text-xs shadow-2xs cursor-pointer"
              title="Perbesar Teks & Soal (A+)"
            >
              A+
            </button>
          </div>

          {/* Tombol Tampilkan / Sembunyikan Navigasi Soal */}
          <button
            type="button"
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer shadow-2xs ${
              showQuestionNav
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={showQuestionNav ? 'Sembunyikan Navigasi Soal' : 'Tampilkan Navigasi Soal'}
            aria-label={showQuestionNav ? 'Sembunyikan Navigasi Soal' : 'Tampilkan Navigasi Soal'}
          >
            {showQuestionNav ? (
              <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span className="hidden md:inline">
              {showQuestionNav ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
            </span>
            <span className="md:hidden">
              {showQuestionNav ? 'Tutup Nav' : 'Navigasi'}
            </span>
          </button>

          <div
            className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl font-mono text-xs sm:text-sm font-bold border transition ${
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kirim Jawaban</span>
          </button>
        </div>
      </header>

      {/* Mobile Horizontal Navigation & Zoom Controls (Khusus Android & iPhone) */}
      <div className="lg:hidden bg-white border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 shrink-0 shadow-2xs">
        {showQuestionNav ? (
          <div className="flex items-center gap-1.5 overflow-x-auto py-1 scrollbar-none flex-1">
            {exam.soalList.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const isAns = isQuestionAnswered(q.id);
              const isRagu = !!submission.jawabanMap[q.id]?.raguRagu;
              return (
                <button
                  key={q.id}
                  type="button"
                  onClick={() => setCurrentIndex(idx)}
                  className={`w-7 h-7 rounded-lg font-bold text-xs shrink-0 transition flex items-center justify-center cursor-pointer relative ${
                    isCurrent
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                      : isRagu
                      ? 'bg-amber-400 text-slate-900 border border-amber-500'
                      : isAns
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isRagu && (
                    <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-slate-950" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center gap-2 py-0.5 flex-1">
            <span className="text-[11px] font-bold text-slate-700">
              Soal No. {currentIndex + 1} dari {totalQuestions}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
              Terjawab: {totalAnswered}/{totalQuestions}
            </span>
          </div>
        )}

        {/* Mobile Nav Toggle & Zoom Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className={`p-1.5 rounded-xl border text-[11px] font-bold flex items-center gap-1 transition cursor-pointer ${
              showQuestionNav
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
            }`}
            title={showQuestionNav ? 'Sembunyikan Navigasi Soal' : 'Tampilkan Navigasi Soal'}
          >
            {showQuestionNav ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            <span>{showQuestionNav ? 'Tutup' : 'Buka No'}</span>
          </button>

          {/* Zoom Controls for Mobile (A- dan A+) */}
          <div className="flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded-xl p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(80, z - 15))}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
              title="Perkecil Teks (A-)"
            >
              A-
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-600 px-1">{zoomLevel}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-white text-slate-700 font-bold text-[11px] shadow-2xs cursor-pointer"
              title="Perbesar Teks (A+)"
            >
              A+
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN EXAM BODY (Question area + Palette Grid) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left / Center: Question Renderer */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className={`${showQuestionNav ? 'max-w-3xl' : 'max-w-4xl'} mx-auto space-y-5 transition-all duration-200`}>
            {currentSoal ? (
              <div
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
                style={{ fontSize: `${zoomLevel}%` }}
                className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-8 shadow-sm transition-all duration-150 touch-pan-y"
              >
                {/* Swipe guidance & scale indicator */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pb-3 mb-3 border-b border-slate-100">
                  <span className="flex items-center gap-1.5 text-indigo-600 font-semibold">
                    <MoveHorizontal className="w-3.5 h-3.5" />
                    <span>Geser layar (swipe) kiri/kanan untuk ganti soal</span>
                  </span>
                  <span className="font-mono text-slate-400 text-[10px]">Ukuran: {zoomLevel}%</span>
                </div>

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

                {/* Question Image (Redaksi Soal) if available */}
                {currentSoal.gambar && (
                  <div
                    onClick={() => {
                      setPreviewImage(currentSoal.gambar!);
                      setPreviewZoom(1);
                    }}
                    className="my-4 p-2.5 bg-slate-50 border border-slate-200 hover:border-indigo-400 rounded-2xl flex flex-col items-center justify-center cursor-zoom-in transition group shadow-2xs"
                    title="Ketuk atau klik untuk memperbesar gambar"
                  >
                    <img
                      src={currentSoal.gambar}
                      alt="Gambar Redaksi Soal"
                      className="max-h-80 max-w-full rounded-xl object-contain shadow-xs group-hover:scale-[1.02] transition"
                    />
                    <span className="text-[10px] text-indigo-600 font-bold mt-1.5 flex items-center gap-1">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>🔍 Ketuk gambar untuk memperbesar / zoom detail</span>
                    </span>
                  </div>
                )}

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
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span
                            className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 transition mt-0.5 ${
                              isSelected
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {opt.label}
                          </span>
                          <div className="flex-1">
                            <span className="leading-snug block">{opt.text}</span>
                            {opt.gambar && (
                              <div className="mt-2 p-1.5 bg-white border border-slate-200 rounded-xl inline-block max-w-full">
                                <img
                                  src={opt.gambar}
                                  alt={`Gambar Opsi ${opt.label}`}
                                  className="max-h-40 max-w-full object-contain rounded-lg"
                                />
                              </div>
                            )}
                          </div>
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
                          className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm flex items-start gap-3.5 transition cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-semibold ring-2 ring-indigo-500/20 shadow-xs'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5 ${
                              isSelected ? 'bg-indigo-600' : 'border-2 border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <CheckCircle2 className="w-4 h-4" />}
                          </div>
                          <div className="flex-1">
                            <span className="leading-snug block">
                              <strong>{opt.label}.</strong> {opt.text}
                            </span>
                            {opt.gambar && (
                              <div className="mt-2 p-1.5 bg-white border border-slate-200 rounded-xl inline-block max-w-full">
                                <img
                                  src={opt.gambar}
                                  alt={`Gambar Opsi ${opt.label}`}
                                  className="max-h-40 max-w-full object-contain rounded-lg"
                                />
                              </div>
                            )}
                          </div>
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

        {/* Right Sidebar: Palette Grid Nomor Soal - Kompak & Bisa Ditampilkan / Disembunyikan */}
        {showQuestionNav && (
          <aside className="w-full lg:w-72 bg-white border-t lg:border-t-0 lg:border-l border-slate-300 p-3.5 sm:p-4 flex flex-col justify-between shrink-0 shadow-sm animate-in fade-in slide-in-from-right-2 duration-150">
            <div>
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 mb-2.5">
                <div className="flex items-center gap-1.5">
                  <LayoutGrid className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs font-extrabold text-slate-900 uppercase tracking-wide">
                    Navigasi Soal
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 font-mono">
                    <strong className="text-emerald-600">{totalAnswered}</strong>/{totalQuestions}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuestionNav(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                    title="Sembunyikan Navigasi Soal"
                    aria-label="Sembunyikan Navigasi Soal"
                  >
                    <EyeOff className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Grid Palette - Dibuat Lebih Kecil & Kompak */}
              <div className="grid grid-cols-5 sm:grid-cols-6 gap-1.5 max-h-56 lg:max-h-[58vh] overflow-y-auto p-0.5">
                {exam.soalList.map((q, idx) => {
                  const answered = isQuestionAnswered(q.id);
                  const isCurrent = idx === currentIndex;
                  const isDoubt = submission.jawabanMap[q.id]?.raguRagu;

                  let colorStyle = 'bg-white text-slate-800 border border-slate-300 hover:border-slate-400 hover:bg-slate-50'; // Belum dijawab = PUTIH

                  if (answered) {
                    colorStyle = 'bg-emerald-600 text-white border border-emerald-600 shadow-2xs'; // Sudah dijawab = HIJAU
                  }

                  if (isDoubt) {
                    colorStyle = 'bg-amber-400 text-slate-950 border border-amber-500 font-extrabold'; // Ragu-ragu = KUNING
                  }

                  return (
                    <button
                      key={q.id}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-8 sm:h-8.5 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer relative ${colorStyle} ${
                        isCurrent ? 'ring-2 ring-indigo-500 ring-offset-1' : ''
                      }`}
                      title={`Soal No ${idx + 1}: ${isDoubt ? 'Ragu-ragu' : answered ? 'Sudah dijawab' : 'Belum dijawab'}`}
                    >
                      <span>{idx + 1}</span>
                      {isDoubt && (
                        <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-950" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend / Keterangan Warna - Kompak */}
              <div className="mt-3 pt-2.5 border-t border-slate-200 grid grid-cols-3 gap-1 text-[10px] font-bold text-slate-600">
                <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-1.5 py-1 rounded-lg border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                  <span className="truncate">Sudah ({totalAnswered})</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 text-slate-700 px-1.5 py-1 rounded-lg border border-slate-300">
                  <span className="w-2 h-2 rounded-full bg-white border border-slate-400 shrink-0" />
                  <span className="truncate">Belum ({totalQuestions - totalAnswered})</span>
                </div>
                <div className="flex items-center gap-1 bg-amber-50 text-amber-800 px-1.5 py-1 rounded-lg border border-amber-300">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                  <span className="truncate">Ragu ({totalRaguRagu})</span>
                </div>
              </div>
            </div>

            {/* Quick Submit Info */}
            <div className="mt-3 pt-2.5 border-t border-slate-200">
              <button
                onClick={() => setIsSubmitConfirmOpen(true)}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Send className="w-3.5 h-3.5 text-emerald-400" />
                <span>Selesai & Kumpulkan</span>
              </button>
            </div>
          </aside>
        )}
      </div>

      {/* Floating Button Buka Navigasi Soal jika sedang disembunyikan */}
      {!showQuestionNav && (
        <button
          type="button"
          onClick={() => setShowQuestionNav(true)}
          className="fixed bottom-20 right-4 z-40 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold transition-all animate-in fade-in slide-in-from-right-4 cursor-pointer hover:scale-105"
          title="Tampilkan Navigasi Soal"
          aria-label="Tampilkan Navigasi Soal"
        >
          <LayoutGrid className="w-4 h-4 text-indigo-200" />
          <span>Navigasi Soal</span>
          <span className="px-1.5 py-0.5 rounded-md bg-white/20 text-[10px] font-mono">
            {totalAnswered}/{totalQuestions}
          </span>
        </button>
      )}

      {/* 3. BOTTOM CONTROL BAR (Requirement 7: Tombol Back dan Next, Ragu-ragu, Navigasi Soal) */}
      <footer className="h-16 bg-white border-t border-slate-300 px-3 sm:px-6 flex items-center justify-between shrink-0 shadow-lg">
        {/* Tombol Back / Sebelumnya */}
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
          className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden xs:inline">Sebelumnya</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Tombol Ragu-ragu */}
          {currentSoal && (
            <button
              type="button"
              onClick={() => {
                updateStudentAnswer(currentSoal.id, currentAnswer, !isRaguRagu);
              }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                isRaguRagu
                  ? 'bg-amber-400 border-amber-500 text-slate-950 font-extrabold shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>Ragu-Ragu</span>
            </button>
          )}

          {/* Tombol Tampilkan/Sembunyikan Navigasi Soal di Footer */}
          <button
            type="button"
            onClick={() => setShowQuestionNav(!showQuestionNav)}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs font-bold border transition cursor-pointer ${
              showQuestionNav
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
            }`}
            title={showQuestionNav ? 'Sembunyikan Daftar Nomor Soal' : 'Tampilkan Daftar Nomor Soal'}
          >
            {showQuestionNav ? (
              <EyeOff className="w-3.5 h-3.5 text-indigo-600" />
            ) : (
              <LayoutGrid className="w-3.5 h-3.5 text-indigo-600" />
            )}
            <span className="hidden sm:inline">
              {showQuestionNav ? 'Sembunyikan Navigasi' : 'Navigasi Soal'}
            </span>
            <span className="sm:hidden text-[11px] font-mono">
              {showQuestionNav ? 'Tutup' : `No (${totalAnswered}/${totalQuestions})`}
            </span>
          </button>
        </div>

        {/* Tombol Next / Selanjutnya atau Submit */}
        {currentIndex < totalQuestions - 1 ? (
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
            className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white shadow-md transition"
          >
            <span className="hidden xs:inline">Selanjutnya</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsSubmitConfirmOpen(true)}
            className="flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-md transition cursor-pointer"
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

      {/* 6. MODAL PERBESAR GAMBAR (IMAGE LIGHTBOX FOR MOBILE & DESKTOP) */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center p-3 animate-in fade-in">
          {/* Top Bar Lightbox */}
          <div className="w-full max-w-3xl flex items-center justify-between text-white pb-3 mb-2 border-b border-white/20">
            <span className="text-xs font-bold flex items-center gap-1.5">
              <ZoomIn className="w-4 h-4 text-indigo-400" />
              <span>Pratinjau Gambar Soal ({Math.round(previewZoom * 100)}%)</span>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(0.75, z - 0.25))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                title="Perkecil (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom(1)}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                title="Reset Ukuran (100%)"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(3, z + 0.25))}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-xs cursor-pointer"
                title="Perbesar (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs ml-2 cursor-pointer"
                title="Tutup (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Image Container with Scroll & Zoom */}
          <div className="flex-1 w-full max-w-3xl overflow-auto flex items-center justify-center p-2">
            <img
              src={previewImage}
              alt="Detail Gambar Soal"
              style={{ transform: `scale(${previewZoom})`, transition: 'transform 0.2s ease-out' }}
              className="max-h-[80vh] max-w-full object-contain rounded-xl shadow-2xl origin-center"
            />
          </div>
        </div>
      )}

      {/* 7. MODAL AUTO LOGOUT SETELAH KIRIM JAWABAN */}
      {isAutoLoggingOut && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-7 sm:p-8 text-center shadow-2xl border border-slate-200 animate-in zoom-in-95">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4 border-4 border-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-xl font-black text-slate-900">
              Jawaban Berhasil Terkirim!
            </h3>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Terima kasih, lembar jawaban dan skor Anda untuk <strong>{exam.judul}</strong> telah tersimpan di server.
            </p>

            <div className="my-5 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-950">
              <p className="text-xs font-semibold">
                Sesi ujian telah selesai. Untuk menjaga keamanan akun siswa, Anda akan otomatis logout dalam:
              </p>
              <div className="text-3xl font-black font-mono text-indigo-700 mt-2">
                {logoutCountdown} <span className="text-sm font-normal text-indigo-500">detik</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                exitExamPlayer();
                logout();
              }}
              className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Logout Sekarang</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
