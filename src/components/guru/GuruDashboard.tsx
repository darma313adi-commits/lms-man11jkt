import React, { useState, useRef } from 'react';
import { useLMS } from '../../context/LMSContext';
import { Exam, QuestionItem, QuestionType, ExamSubmission, LessonMaterial } from '../../types';
import {
  BookOpen,
  Sparkles,
  FileSpreadsheet,
  FileText,
  Upload,
  Download,
  Plus,
  Trash2,
  Edit3,
  CheckCircle2,
  AlertTriangle,
  Award,
  BarChart3,
  Eye,
  Clock,
  Layers,
  ChevronRight,
  ShieldAlert,
  Search,
  FileCode,
  FileCheck,
  FolderOpen,
} from 'lucide-react';
import {
  downloadQuestionTemplateExcel,
  parseExcelQuestions,
  exportGradesExcel,
  exportItemAnalysisExcel,
} from '../../utils/fileParser';
import { generateQuestionsWithAI, parseRawTextToQuestions } from '../../utils/aiGenerator';
import { analyzeExamQuestions } from '../../utils/examScoring';

export const GuruDashboard: React.FC = () => {
  const {
    currentUser,
    exams,
    createExam,
    updateExam,
    deleteExam,
    addQuestionsToExam,
    submissions,
    updateSubmissionReview,
    materials,
    addMaterial,
    deleteMaterial,
  } = useLMS();

  const [activeTab, setActiveTab] = useState<'ujian' | 'buat_ai' | 'upload_file' | 'materi' | 'koreksi' | 'analisis' | 'curang'>('ujian');
  const [selectedExamId, setSelectedExamId] = useState<string>(exams[0]?.id || '');

  // AI Generator Form State
  const [aiTopic, setAiTopic] = useState('Sistem Ekskresi & Metabolisme Sel');
  const [aiSubject, setAiSubject] = useState(currentUser?.mataPelajaran || 'Biologi');
  const [aiGrade, setAiGrade] = useState('X MIPA');
  const [aiCount, setAiCount] = useState(5);
  const [aiTypes, setAiTypes] = useState<QuestionType[]>([
    'pilihan_ganda',
    'pilihan_ganda_kompleks',
    'isian_singkat',
    'menjodohkan',
    'tka_benar_salah',
  ]);
  const [aiStimulus, setAiStimulus] = useState('');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [generatedPreviewQuestions, setGeneratedPreviewQuestions] = useState<QuestionItem[]>([]);

  // Create New Exam Modal (Asesmen Sumatif & Formatif)
  const [showCreateExamModal, setShowCreateExamModal] = useState(false);
  const [newExamData, setNewExamData] = useState({
    judul: '',
    deskripsi: '',
    mataPelajaran: currentUser?.mataPelajaran || 'Biologi',
    kelasTarget: 'X MIPA 1, X MIPA 2',
    durasiMenit: 60,
    kkm: 75,
    jenisAsesmen: 'sumatif_lingkup_materi' as 'sumatif_lingkup_materi' | 'sumatif_akhir_semester' | 'formatif',
    kodeUjian: `EXAM-${Math.floor(1000 + Math.random() * 9000)}`,
  });

  // Upload Materi PDF State
  const [materialForm, setMaterialForm] = useState({
    judul: '',
    deskripsi: '',
    mataPelajaran: currentUser?.mataPelajaran || 'Biologi',
    kelasTarget: 'X MIPA 1, X MIPA 2',
    fileName: '',
    fileSize: '',
  });
  const [selectedPdfFile, setSelectedPdfFile] = useState<File | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<LessonMaterial | null>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  // Submission correction modal
  const [reviewSubmission, setReviewSubmission] = useState<ExamSubmission | null>(null);
  const [overrideScore, setOverrideScore] = useState<number>(0);
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');

  // File Upload State
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [uploadFeedback, setUploadFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [manualTextToParse, setManualTextToParse] = useState('');

  // Selected Exam
  const activeExam = exams.find((e) => e.id === selectedExamId) || exams[0];
  const examSubmissions = submissions.filter((s) => s.examId === activeExam?.id);
  const itemAnalysis = activeExam ? analyzeExamQuestions(activeExam.soalList, examSubmissions) : [];

  // Cheating violations across all exams
  const allViolations = submissions.flatMap((s) =>
    (s.violations || []).map((v) => ({
      ...v,
      siswaNama: s.siswaNama,
      siswaKelas: s.siswaKelas,
      examJudul: s.examJudul,
    }))
  );

  const handleGenerateAI = async () => {
    setIsAiGenerating(true);
    setUploadFeedback(null);
    try {
      const generated = await generateQuestionsWithAI({
        topik: aiTopic,
        mataPelajaran: aiSubject,
        tingkatKelas: aiGrade,
        jumlahSoal: aiCount,
        tipeSoalTerpilih: aiTypes,
        tingkatKesulitan: 'Campuran',
        stimulusText: aiStimulus.trim() || undefined,
      });

      setGeneratedPreviewQuestions(generated);
      setUploadFeedback(`Berhasil membuat ${generated.length} butir soal dengan AI! Silakan periksa di bawah.`);
    } catch {
      setUploadFeedback('Gagal membuat soal AI.');
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveAiQuestionsToExam = () => {
    if (!activeExam) {
      alert('Pilih atau buat ujian terlebih dahulu!');
      return;
    }
    if (generatedPreviewQuestions.length === 0) return;

    addQuestionsToExam(activeExam.id, generatedPreviewQuestions);
    setGeneratedPreviewQuestions([]);
    alert(`Berhasil menambahkan ${generatedPreviewQuestions.length} butir soal ke ujian "${activeExam.judul}"!`);
    setActiveTab('ujian');
  };

  const handleUploadQuestionFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeExam) return;

    setIsProcessingFile(true);
    setUploadFeedback(null);

    try {
      let questions: QuestionItem[] = [];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls') || file.name.endsWith('.csv')) {
        questions = await parseExcelQuestions(file);
      } else {
        // Text / Docx fallback parser
        const text = await file.text();
        questions = parseRawTextToQuestions(text);
      }

      if (questions.length > 0) {
        addQuestionsToExam(activeExam.id, questions);
        setUploadFeedback(`Sukses mengimpor ${questions.length} butir soal dari "${file.name}" ke ujian "${activeExam.judul}"!`);
      } else {
        setUploadFeedback('Tidak ada butir soal yang valid terbaca dari file.');
      }
    } catch (err: any) {
      setUploadFeedback(`Gagal membaca file soal: ${err.message || 'Format tidak valid'}`);
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleParsePastedText = () => {
    if (!manualTextToParse.trim() || !activeExam) return;
    const questions = parseRawTextToQuestions(manualTextToParse);
    if (questions.length > 0) {
      addQuestionsToExam(activeExam.id, questions);
      setUploadFeedback(`Sukses menambahkan ${questions.length} butir soal dari teks ke ujian "${activeExam.judul}"!`);
      setManualTextToParse('');
      setActiveTab('ujian');
    }
  };

  const handleCreateExamSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const created = createExam({
      judul: newExamData.judul,
      deskripsi: newExamData.deskripsi,
      mataPelajaran: newExamData.mataPelajaran,
      kelasTarget: newExamData.kelasTarget.split(',').map((k) => k.trim()),
      durasiMenit: Number(newExamData.durasiMenit) || 60,
      kkm: Number(newExamData.kkm) || 75,
      jenisAsesmen: newExamData.jenisAsesmen,
      guruId: currentUser?.id || 'guru',
      guruNama: currentUser?.name || 'Guru Pengampu',
      status: 'aktif',
      kodeUjian: newExamData.kodeUjian.toUpperCase(),
      acakSoal: false,
      acakOpsi: false,
      tampilkanNilai: true,
      soalList: [],
    });

    setSelectedExamId(created.id);
    setShowCreateExamModal(false);
    alert(`Ujian "${created.judul}" berhasil dibuat! Silakan tambahkan butir soal via AI atau Import File.`);
    setActiveTab('buat_ai');
  };

  const handlePdfFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPdfFile(file);
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
    setMaterialForm((prev) => ({
      ...prev,
      judul: prev.judul || file.name.replace(/\.pdf$/i, '').replace(/[-_]/g, ' '),
      fileName: file.name,
      fileSize: `${sizeInMB} MB`,
    }));
  };

  const handleUploadPdfMaterialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!materialForm.judul.trim()) {
      alert('Judul materi pelajaran wajib diisi!');
      return;
    }

    const fileName = selectedPdfFile?.name || materialForm.fileName || 'Materi_Pelajaran_MAN11.pdf';
    const fileSize = selectedPdfFile
      ? `${(selectedPdfFile.size / (1024 * 1024)).toFixed(1)} MB`
      : materialForm.fileSize || '2.1 MB';

    addMaterial({
      judul: materialForm.judul,
      deskripsi: materialForm.deskripsi || 'Materi bahan ajar pendukung untuk persiapan Asesmen Sumatif.',
      mataPelajaran: materialForm.mataPelajaran || currentUser?.mataPelajaran || 'Biologi',
      kelasTarget: materialForm.kelasTarget.split(',').map((k) => k.trim()),
      guruId: currentUser?.id || 'guru',
      guruNama: currentUser?.name || 'Guru Pengampu',
      fileName,
      fileSize,
      tipe: 'pdf',
    });

    setMaterialForm({
      judul: '',
      deskripsi: '',
      mataPelajaran: currentUser?.mataPelajaran || 'Biologi',
      kelasTarget: 'X MIPA 1, X MIPA 2',
      fileName: '',
      fileSize: '',
    });
    setSelectedPdfFile(null);
    if (pdfInputRef.current) pdfInputRef.current.value = '';

    setUploadFeedback(`Materi PDF berhasil diunggah dan dibagikan ke siswa kelas sasaran!`);
  };

  const openReviewModal = (sub: ExamSubmission) => {
    setReviewSubmission(sub);
    setOverrideScore(sub.nilai100);
    setTeacherFeedback(sub.catatanGuru || '');
  };

  const saveReviewModal = () => {
    if (!reviewSubmission) return;
    updateSubmissionReview(
      reviewSubmission.id,
      Math.round((overrideScore / 100) * reviewSubmission.maxSkor),
      overrideScore,
      teacherFeedback
    );
    setReviewSubmission(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
                Portal Guru & Pembuat Soal
              </span>
              <span className="text-xs text-indigo-200">Mata Pelajaran: {currentUser?.mataPelajaran || 'Sains Terpadu'}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Pusat Penilaian & Bank Soal CBT — MAN 11 Jakarta
            </h1>
            <p className="mt-1 text-sm text-slate-300 max-w-2xl">
              Unggah materi pelajaran PDF, buat Asesmen Sumatif dan Formatif dengan AI Generator, impor soal Excel/Word/PDF, serta tinjau analisa butir soal dan rekapitulasi nilai.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                setNewExamData((prev) => ({
                  ...prev,
                  judul: 'Asesmen Sumatif Lingkup Materi',
                  jenisAsesmen: 'sumatif_lingkup_materi',
                }));
                setShowCreateExamModal(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Buat Asesmen Sumatif</span>
            </button>
            <button
              onClick={() => setActiveTab('materi')}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>+ Unggah Materi PDF</span>
            </button>
            <button
              onClick={downloadQuestionTemplateExcel}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition border border-white/20 backdrop-blur cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Template Soal (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Selected Exam Selector */}
        {exams.length > 0 && (
          <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-200 font-bold">Pilih Ujian Aktif:</span>
              <select
                value={selectedExamId}
                onChange={(e) => setSelectedExamId(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
              >
                {exams.map((ex) => (
                  <option key={ex.id} value={ex.id} className="bg-slate-900 text-white">
                    {ex.judul} ({ex.soalList.length} Soal)
                  </option>
                ))}
              </select>
            </div>

            {activeExam && (
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span>
                  Kode: <strong className="font-mono text-emerald-400">{activeExam.kodeUjian}</strong>
                </span>
                <span>Durasi: <strong>{activeExam.durasiMenit} Menit</strong></span>
                <span>KKM: <strong>{activeExam.kkm}</strong></span>
                <span>Target: <strong>{activeExam.kelasTarget.join(', ')}</strong></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Feedback Banner */}
      {uploadFeedback && (
        <div className="mb-6 p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-900 flex items-center justify-between text-xs font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>{uploadFeedback}</span>
          </div>
          <button onClick={() => setUploadFeedback(null)} className="font-bold underline text-indigo-700">
            Tutup
          </button>
        </div>
      )}

      {/* Tabs Menu */}
      <div className="flex items-center gap-2 overflow-x-auto border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('ujian')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'ujian'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Daftar Soal ({activeExam?.soalList.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('materi')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'materi'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4 text-emerald-600" />
          <span>Materi Pelajaran PDF ({materials.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('buat_ai')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'buat_ai'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-4 h-4 text-violet-600" />
          <span>AI Question Generator</span>
        </button>

        <button
          onClick={() => setActiveTab('upload_file')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'upload_file'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>Import Soal (Excel/Word/PDF)</span>
        </button>

        <button
          onClick={() => setActiveTab('koreksi')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'koreksi'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Koreksi & Rekap Nilai ({examSubmissions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analisis')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'analisis'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analisis Butir Soal</span>
        </button>

        <button
          onClick={() => setActiveTab('curang')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
            activeTab === 'curang'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-rose-500" />
          <span>Laporan Curang ({allViolations.length})</span>
        </button>
      </div>

      {/* TAB 1: Daftar Soal Ujian Aktif */}
      {activeTab === 'ujian' && activeExam && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-2xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">{activeExam.judul}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeExam.deskripsi}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('buat_ai')}
                className="px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tambah Soal via AI</span>
              </button>
              <button
                onClick={() => setActiveTab('upload_file')}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Unggah Excel/Word</span>
              </button>
            </div>
          </div>

          {activeExam.soalList.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300 p-8">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-sm font-bold text-slate-800">Ujian ini belum memiliki butir soal</h3>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Gunakan tab "AI Question Generator" untuk membuat soal otomatis dalam hitungan detik, atau unggah file spreadsheet Excel template.
              </p>
              <div className="mt-4 flex justify-center gap-3">
                <button
                  onClick={() => setActiveTab('buat_ai')}
                  className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs shadow-md"
                >
                  Buat dengan AI Sekarang
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {activeExam.soalList.map((soal, idx) => (
                <div key={soal.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {soal.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs text-slate-400">• Bobot: {soal.bobot} Poin</span>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Hapus soal nomor ${idx + 1}?`)) {
                          const updated = activeExam.soalList.filter((s) => s.id !== soal.id);
                          updateExam({ ...activeExam, soalList: updated });
                        }
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Hapus Soal"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Stimulus / Deskripsi Wacana jika ada */}
                  {soal.deskripsiStimulus && (
                    <div className="my-3 p-3.5 rounded-xl bg-slate-50 border-l-4 border-indigo-500 text-xs text-slate-800 leading-relaxed font-sans">
                      <p className="font-bold text-indigo-900 text-[11px] mb-1 uppercase tracking-wide">
                        Wacana / Stimulus Bacaan:
                      </p>
                      <p className="whitespace-pre-line">{soal.deskripsiStimulus}</p>
                    </div>
                  )}

                  <p className="text-xs font-semibold text-slate-900 leading-relaxed">{soal.pertanyaan}</p>

                  {/* Render based on Question Type */}
                  {/* 1. Pilihan Ganda & PG Kompleks */}
                  {soal.pilihan && soal.pilihan.length > 0 && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {soal.pilihan.map((opt) => {
                        const isCorrect = Array.isArray(soal.kunciJawaban)
                          ? soal.kunciJawaban.includes(opt.label)
                          : soal.kunciJawaban === opt.label;
                        return (
                          <div
                            key={opt.id}
                            className={`p-2.5 rounded-xl border text-xs flex items-center gap-2.5 ${
                              isCorrect
                                ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950 font-medium'
                                : 'bg-slate-50/50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span
                              className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] ${
                                isCorrect ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="flex-1">{opt.text}</span>
                            {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 2. Isian Singkat */}
                  {soal.type === 'isian_singkat' && (
                    <div className="mt-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                      <span className="font-bold text-slate-700">Kunci Jawaban yang Diterima: </span>
                      <span className="font-mono text-indigo-700 font-semibold">{String(soal.kunciJawaban)}</span>
                    </div>
                  )}

                  {/* 3. Menjodohkan */}
                  {soal.type === 'menjodohkan' && soal.pasangan && (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-[11px] font-bold text-slate-700">Pasangan yang Benar:</p>
                      {soal.pasangan.map((p) => (
                        <div key={p.id} className="flex items-center gap-2 text-xs bg-slate-50 p-2 rounded-lg border border-slate-200">
                          <span className="font-semibold text-slate-800">{p.premis}</span>
                          <span className="text-slate-400">➔</span>
                          <span className="font-bold text-indigo-700">{p.jawaban}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 4. Benar-Salah Model TKA (3 Pernyataan) */}
                  {soal.type === 'tka_benar_salah' && soal.pernyataanTKA && (
                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] font-bold text-indigo-900 uppercase">
                        3 Pernyataan Model TKA & Kunci:
                      </p>
                      <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                        {soal.pernyataanTKA.map((stmt, sIdx) => (
                          <div key={stmt.id} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                            <span className="font-medium text-slate-800">
                              {sIdx + 1}. {stmt.pernyataan}
                            </span>
                            <span
                              className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] shrink-0 ${
                                stmt.kunci === 'Benar'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}
                            >
                              Kunci: {stmt.kunci}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {soal.pembahasan && (
                    <div className="mt-3 pt-2 text-[11px] text-slate-500 border-t border-slate-100">
                      <strong>Pembahasan:</strong> {soal.pembahasan}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AI Question Generator */}
      {activeTab === 'buat_ai' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Konfigurasi AI Generator</h3>
                <p className="text-[11px] text-slate-500">Mendukung 5 jenis soal termasuk Model TKA 3 Pernyataan</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={aiSubject}
                  onChange={(e) => setAiSubject(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Contoh: Biologi, Matematika, Kimia"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Topik / Materi Spesifik *</label>
                <input
                  type="text"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  placeholder="Contoh: Fotosintesis & Reaksi Gelap Terang, Logika Aljabar"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Tingkat Kelas</label>
                  <input
                    type="text"
                    value={aiGrade}
                    onChange={(e) => setAiGrade(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                    placeholder="Contoh: X MIPA"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Jumlah Butir</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={aiCount}
                    onChange={(e) => setAiCount(parseInt(e.target.value, 10) || 5)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Format Soal yang Diikutsertakan:
                </label>
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                  {[
                    { id: 'pilihan_ganda', label: '1. Pilihan Ganda (Single Choice)' },
                    { id: 'pilihan_ganda_kompleks', label: '2. Pilihan Ganda Kompleks (Multi Select)' },
                    { id: 'isian_singkat', label: '3. Isian Singkat' },
                    { id: 'menjodohkan', label: '4. Menjodohkan / Memasangkan' },
                    { id: 'tka_benar_salah', label: '5. Benar-Salah Model TKA (1 Deskripsi + 3 Pernyataan)' },
                  ].map((t) => {
                    const isChecked = aiTypes.includes(t.id as any);
                    return (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setAiTypes([...aiTypes, t.id as any]);
                            } else {
                              setAiTypes(aiTypes.filter((x) => x !== t.id));
                            }
                          }}
                          className="rounded text-indigo-600"
                        />
                        <span>{t.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Stimulus / Teks Wacana Khusus (Opsional):
                </label>
                <textarea
                  rows={3}
                  value={aiStimulus}
                  onChange={(e) => setAiStimulus(e.target.value)}
                  placeholder="Tempel teks wacana sains, studi kasus, atau bacaan TKA jika ingin AI membuat soal dari wacana tersebut..."
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                type="button"
                onClick={handleGenerateAI}
                disabled={isAiGenerating || !aiTopic.trim()}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isAiGenerating ? 'AI Sedang Merumuskan Soal...' : 'Generate Soal dengan AI'}</span>
              </button>
            </div>
          </div>

          {/* Preview generated questions */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Pratinjau Hasil Soal AI ({generatedPreviewQuestions.length})
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Review butir soal sebelum disimpan ke ujian "{activeExam?.judul}"
                  </p>
                </div>
                {generatedPreviewQuestions.length > 0 && (
                  <button
                    onClick={handleSaveAiQuestionsToExam}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan ke Ujian</span>
                  </button>
                )}
              </div>

              {generatedPreviewQuestions.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold">Belum ada soal yang digenerate.</p>
                  <p className="text-[11px]">Klik "Generate Soal dengan AI" untuk mulai merumuskan soal otomatis.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                  {generatedPreviewQuestions.map((q, qIdx) => (
                    <div key={q.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 text-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-indigo-700">No. {qIdx + 1} • {q.type.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-500">Bobot: {q.bobot} pt</span>
                      </div>
                      {q.deskripsiStimulus && (
                        <div className="my-2 p-2.5 rounded-lg bg-indigo-50 border-l-2 border-indigo-500 text-[11px] text-indigo-950 font-sans">
                          <strong>Wacana:</strong> {q.deskripsiStimulus}
                        </div>
                      )}
                      <p className="font-semibold text-slate-900 mb-2">{q.pertanyaan}</p>

                      {q.pernyataanTKA && (
                        <div className="space-y-1 my-2 bg-white p-2 rounded border border-slate-200">
                          {q.pernyataanTKA.map((st, i) => (
                            <div key={st.id} className="flex justify-between items-center text-[11px]">
                              <span>{i + 1}. {st.pernyataan}</span>
                              <span className="font-bold text-indigo-600 ml-2">[{st.kunci}]</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Import File (Excel, Word, PDF) */}
      {activeTab === 'upload_file' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Upload File Excel / CSV Soal</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Unggah spreadsheet Excel berisikan butir-butir soal lengkap beserta wacana stimulus dan kunci jawaban.
              </p>

              <div className="mt-4 p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                <p className="font-bold">Gunakan Template Resmi:</p>
                <p className="mt-1 text-[11px] text-emerald-700">
                  Pastikan format kolom sesuai (No, Tipe Soal, Pertanyaan, Stimulus, Opsi A-E, Kunci, Bobot).
                </p>
                <button
                  type="button"
                  onClick={downloadQuestionTemplateExcel}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Template Soal Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-200">
              <input
                type="file"
                ref={fileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadQuestionFile}
                className="hidden"
                id="file-soal-upload"
              />
              <label
                htmlFor="file-soal-upload"
                className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-md transition ${
                  isProcessingFile ? 'opacity-50 cursor-wait' : ''
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>{isProcessingFile ? 'Membaca Soal...' : 'Pilih File Excel & Unggah ke Ujian'}</span>
              </label>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900">Tempel Teks Soal Dokumen / PDF</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Salin teks naskah soal dari dokumen Word atau PDF. Sistem pintar kami akan mengekstrak pertanyaan, opsi A/B/C/D, dan kunci jawaban secara otomatis.
              </p>

              <div className="mt-4">
                <textarea
                  rows={6}
                  value={manualTextToParse}
                  onChange={(e) => setManualTextToParse(e.target.value)}
                  placeholder={`1. Organel penghasil energi adalah...\nA. Ribosom\nB. Mitokondria\nC. Lisosom\nKunci: B\n\n2. Jelaskan fungsi klorofil...\nKunci: Fotosintesis`}
                  className="w-full text-xs font-mono p-3 border border-slate-300 rounded-xl bg-slate-50"
                />
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={handleParsePastedText}
                disabled={!manualTextToParse.trim()}
                className="w-full py-3 rounded-xl font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 shadow-md transition disabled:opacity-50"
              >
                Ekstrak & Tambahkan ke Ujian
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB MATERI PELAJARAN PDF */}
      {activeTab === 'materi' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-900 to-teal-900 rounded-2xl p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/30 text-emerald-200 border border-emerald-400/30 mb-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Materi & Modul Pembelajaran PDF</span>
              </span>
              <h2 className="text-xl font-bold">Unggah Materi Bahan Ajar & Modul Siswa</h2>
              <p className="text-emerald-100/80 text-xs mt-1 leading-relaxed">
                Bagikan modul ajar, rangkuman, kisi-kisi, dan handout berformat PDF kepada siswa MAN 11 Jakarta sebagai referensi belajar sebelum menghadapi Asesmen Sumatif.
              </p>
            </div>
          </div>

          {uploadFeedback && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{uploadFeedback}</span>
              </div>
              <button
                type="button"
                onClick={() => setUploadFeedback(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 font-bold"
              >
                Tutup
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Unggah PDF */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 mb-1 flex items-center gap-2">
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Unggah Dokumen PDF Baru</span>
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                Pilih file PDF materi dari perangkat Anda dan tentukan kelas penerima.
              </p>

              <form onSubmit={handleUploadPdfMaterialSubmit} className="space-y-4">
                {/* File Dropzone */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Pilih File PDF *</label>
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${
                      selectedPdfFile
                        ? 'border-emerald-500 bg-emerald-50/50'
                        : 'border-slate-300 hover:border-emerald-500 bg-slate-50'
                    }`}
                  >
                    <input
                      ref={pdfInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      onChange={handlePdfFileSelect}
                      className="hidden"
                    />
                    <FileText className="w-8 h-8 mx-auto text-emerald-600 mb-2" />
                    {selectedPdfFile ? (
                      <div>
                        <p className="text-xs font-bold text-emerald-800 break-all">{selectedPdfFile.name}</p>
                        <p className="text-[11px] text-emerald-600">
                          {(selectedPdfFile.size / (1024 * 1024)).toFixed(2)} MB • Siap diunggah
                        </p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-bold text-slate-700">Klik untuk memilih file PDF</p>
                        <p className="text-[11px] text-slate-400">Format dokumen .PDF resmi (Maks 25MB)</p>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Judul Materi Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={materialForm.judul}
                    onChange={(e) => setMaterialForm({ ...materialForm, judul: e.target.value })}
                    placeholder="Contoh: Modul Struktur Sel & Bioproses"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi / Ringkasan</label>
                  <textarea
                    rows={2}
                    value={materialForm.deskripsi}
                    onChange={(e) => setMaterialForm({ ...materialForm, deskripsi: e.target.value })}
                    placeholder="Penjelasan pokok bahasan atau panduan membaca bagi siswa..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                    <input
                      type="text"
                      required
                      value={materialForm.mataPelajaran}
                      onChange={(e) => setMaterialForm({ ...materialForm, mataPelajaran: e.target.value })}
                      placeholder="Biologi"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Sasaran</label>
                    <input
                      type="text"
                      required
                      value={materialForm.kelasTarget}
                      onChange={(e) => setMaterialForm({ ...materialForm, kelasTarget: e.target.value })}
                      placeholder="X MIPA 1, X MIPA 2"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Unggah & Bagikan Materi ke Siswa</span>
                </button>
              </form>
            </div>

            {/* Daftar Materi PDF Terunggah */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Koleksi Materi PDF Aktif</h3>
                  <p className="text-xs text-slate-500">
                    Total {materials.length} materi telah dipublikasikan untuk siswa MAN 11 Jakarta.
                  </p>
                </div>
              </div>

              {materials.length === 0 ? (
                <div className="text-center py-12 px-4 border border-dashed border-slate-200 rounded-xl">
                  <FolderOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-xs font-bold text-slate-600">Belum ada materi pelajaran PDF</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Gunakan formulir di sebelah kiri untuk mengunggah materi pelajaran pertama Anda.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {materials.map((m) => (
                    <div
                      key={m.id}
                      className="border border-slate-200 hover:border-emerald-300 rounded-xl p-4 transition bg-white hover:bg-emerald-50/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 font-bold text-xs border border-red-200">
                            PDF
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">{m.judul}</h4>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{m.deskripsi}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {m.mataPelajaran}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                Sasaran: {m.kelasTarget.join(', ')}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                {m.fileName} • {m.fileSize}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewMaterial(m)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-emerald-700 hover:bg-emerald-50 transition"
                            title="Pratinjau Materi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <a
                            href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                              `[MAN 11 JAKARTA - MODUL PDF]\nJudul: ${m.judul}\nMapel: ${m.mataPelajaran}\nKelas: ${m.kelasTarget.join(', ')}\nDeskripsi: ${m.deskripsi}\nPengampu: ${m.guruNama}`
                            )}`}
                            download={m.fileName}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50 transition"
                            title="Unduh File"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Hapus materi "${m.judul}"?`)) {
                                deleteMaterial(m.id);
                              }
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                            title="Hapus Materi"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Koreksi & Rekap Nilai */}
      {activeTab === 'koreksi' && activeExam && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Rekapitulasi Nilai & Koreksi: {activeExam.judul}
              </h3>
              <p className="text-xs text-slate-500">
                Total {examSubmissions.length} siswa telah mengirimkan lembar ujian.
              </p>
            </div>

            <button
              onClick={() => exportGradesExcel(examSubmissions, activeExam)}
              disabled={examSubmissions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Nilai (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Skor Diperoleh</th>
                  <th className="px-4 py-3">Nilai (/100)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Pelanggaran Curang</th>
                  <th className="px-4 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {examSubmissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Belum ada siswa yang mengumpulkan jawaban untuk ujian ini.
                    </td>
                  </tr>
                ) : (
                  examSubmissions.map((sub) => {
                    const isPassed = sub.nilai100 >= activeExam.kkm;
                    const violationCount = sub.violations?.length || 0;
                    return (
                      <tr key={sub.id} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          <div>{sub.siswaNama}</div>
                          <div className="text-[10px] text-slate-400 font-mono">NISN: {sub.siswaNisn}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 font-bold text-[11px] text-slate-700">
                            {sub.siswaKelas}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                          {sub.totalSkor} / {sub.maxSkor}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-black text-indigo-700 font-mono">{sub.nilai100}</span>
                          <span className="text-slate-400 text-[10px]"> / 100</span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              isPassed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {isPassed ? 'TUNTAS' : 'REMIDI'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {violationCount > 0 ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] bg-rose-100 text-rose-800">
                              <ShieldAlert className="w-3 h-3 text-rose-600" />
                              {violationCount}x Peringatan
                            </span>
                          ) : (
                            <span className="text-emerald-600 font-bold text-[11px]">Bersih (0)</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => openReviewModal(sub)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Koreksi / Review</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Analisis Butir Soal */}
      {activeTab === 'analisis' && activeExam && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Analisis Butir Soal (Item Analysis): {activeExam.judul}
              </h3>
              <p className="text-xs text-slate-500">
                Parameter Tingkat Kesukaran (P) dan Daya Pembeda (D) dihitung secara matematis.
              </p>
            </div>

            <button
              onClick={() => exportItemAnalysisExcel(itemAnalysis, activeExam)}
              disabled={itemAnalysis.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Analisis Soal (.xlsx)</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">No</th>
                  <th className="px-4 py-3">Tipe Soal</th>
                  <th className="px-4 py-3">Pertanyaan</th>
                  <th className="px-4 py-3">Jumlah Benar</th>
                  <th className="px-4 py-3">Tingkat Kesukaran (P)</th>
                  <th className="px-4 py-3">Daya Pembeda (D)</th>
                  <th className="px-4 py-3">Status Mutu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {itemAnalysis.map((item) => (
                  <tr key={item.questionId} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-bold text-indigo-700">#{item.nomor}</td>
                    <td className="px-4 py-3 font-medium text-slate-500 uppercase text-[10px]">
                      {item.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900 max-w-md truncate">
                      {item.pertanyaan}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{item.jumlahBenar} / {item.totalPeserta} Siswa</div>
                      <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${item.persentaseBenar}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          item.tingkatKesukaran === 'Mudah'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.tingkatKesukaran === 'Sedang'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.tingkatKesukaran} ({item.persentaseBenar}%)
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-800">
                      {item.dayaPembeda.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                          item.kategoriDayaPembeda === 'Sangat Baik' || item.kategoriDayaPembeda === 'Baik'
                            ? 'bg-emerald-100 text-emerald-800'
                            : item.kategoriDayaPembeda === 'Cukup'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {item.kategoriDayaPembeda}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: Laporan Anti-Curang & Pelanggaran */}
      {activeTab === 'curang' && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-rose-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
              <div>
                <h3 className="text-sm font-bold text-rose-950">
                  Laporan Pelanggaran Layar & Anti-Curang ({allViolations.length} Insiden Terdeteksi)
                </h3>
                <p className="text-xs text-rose-800">
                  Sistem otomatis merekam saat siswa mencoba keluar fullscreen, beralih tab, atau menekan tombol pintas.
                </p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 font-bold text-slate-700">
                <tr>
                  <th className="px-4 py-3">Waktu Kejadian</th>
                  <th className="px-4 py-3">Nama Siswa</th>
                  <th className="px-4 py-3">Kelas</th>
                  <th className="px-4 py-3">Nama Ujian</th>
                  <th className="px-4 py-3">Jenis Pelanggaran</th>
                  <th className="px-4 py-3">Keterangan Sistem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {allViolations.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                      Tidak ada catatan kecurangan terdeteksi. Semua siswa tertib di layar ujian.
                    </td>
                  </tr>
                ) : (
                  allViolations.map((v) => (
                    <tr key={v.id} className="hover:bg-rose-50/40">
                      <td className="px-4 py-3 font-mono text-slate-500">
                        {new Date(v.timestamp).toLocaleString('id-ID')}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">{v.siswaNama}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700">{v.siswaKelas}</td>
                      <td className="px-4 py-3 text-slate-700">{v.examJudul}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-rose-100 text-rose-800 uppercase">
                          {v.tipe}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-medium">{v.deskripsi}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Buat Ujian Baru */}
      {showCreateExamModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-in fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">Buat Ujian Baru</h3>
            <p className="text-xs text-slate-500 mb-4">Lengkapi informasi asesmen atau ujian yang akan diselenggarakan.</p>

            <form onSubmit={handleCreateExamSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Judul Ujian *</label>
                <input
                  type="text"
                  required
                  value={newExamData.judul}
                  onChange={(e) => setNewExamData({ ...newExamData, judul: e.target.value })}
                  placeholder="Contoh: Asesmen Sumatif Akhir Semester Biologi"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Deskripsi Singkat</label>
                <textarea
                  rows={2}
                  value={newExamData.deskripsi}
                  onChange={(e) => setNewExamData({ ...newExamData, deskripsi: e.target.value })}
                  placeholder="Petunjuk pengerjaan atau kisi-kisi asesmen..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Jenis Asesmen *</label>
                <select
                  value={newExamData.jenisAsesmen}
                  onChange={(e) =>
                    setNewExamData({
                      ...newExamData,
                      jenisAsesmen: e.target.value as 'sumatif_lingkup_materi' | 'sumatif_akhir_semester' | 'formatif',
                    })
                  }
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl bg-white font-medium focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="sumatif_lingkup_materi">Asesmen Sumatif Lingkup Materi (ASLM)</option>
                  <option value="sumatif_akhir_semester">Asesmen Sumatif Akhir Semester (ASAS / ASTS)</option>
                  <option value="formatif">Asesmen Formatif / Latihan Harian</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={newExamData.mataPelajaran}
                    onChange={(e) => setNewExamData({ ...newExamData, mataPelajaran: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kode Ujian</label>
                  <input
                    type="text"
                    required
                    value={newExamData.kodeUjian}
                    onChange={(e) => setNewExamData({ ...newExamData, kodeUjian: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-mono uppercase"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Durasi (Menit)</label>
                  <input
                    type="number"
                    min={5}
                    max={240}
                    value={newExamData.durasiMenit}
                    onChange={(e) => setNewExamData({ ...newExamData, durasiMenit: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nilai KKM</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={newExamData.kkm}
                    onChange={(e) => setNewExamData({ ...newExamData, kkm: Number(e.target.value) })}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kelas Sasaran (Pisahkan koma)</label>
                <input
                  type="text"
                  value={newExamData.kelasTarget}
                  onChange={(e) => setNewExamData({ ...newExamData, kelasTarget: e.target.value })}
                  placeholder="Contoh: X MIPA 1, X MIPA 2"
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateExamModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Simpan & Buat Soal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Review / Koreksi Lembar Jawaban Siswa */}
      {reviewSubmission && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col justify-between animate-in fade-in">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Koreksi Jawaban: {reviewSubmission.siswaNama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Kelas: {reviewSubmission.siswaKelas} • NISN: {reviewSubmission.siswaNisn}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-black text-indigo-700 font-mono">
                    {reviewSubmission.nilai100}
                  </span>
                  <span className="text-xs text-slate-400"> / 100</span>
                </div>
              </div>

              {/* Answers list */}
              <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-2">
                {activeExam?.soalList.map((soal, i) => {
                  const studentAns = reviewSubmission.jawabanMap[soal.id];
                  return (
                    <div key={soal.id} className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 text-xs">
                      <div className="flex justify-between font-bold text-slate-800 mb-1">
                        <span>Soal No. {i + 1} ({soal.type})</span>
                        <span className={studentAns?.isCorrect ? 'text-emerald-600' : 'text-rose-600'}>
                          Skor: {studentAns?.skorDiperoleh || 0} / {soal.bobot} pt
                        </span>
                      </div>
                      <p className="text-slate-600 mb-1.5">{soal.pertanyaan}</p>
                      <div className="p-2 rounded bg-white border border-slate-200">
                        <span className="font-semibold text-slate-500">Jawaban Siswa: </span>
                        <span className="font-bold text-slate-900">
                          {typeof studentAns?.jawaban === 'object'
                            ? JSON.stringify(studentAns?.jawaban)
                            : String(studentAns?.jawaban || 'Tidak dijawab')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ubah Nilai Akhir (/100):
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={overrideScore}
                    onChange={(e) => setOverrideScore(Number(e.target.value))}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Catatan / Evaluasi Guru:
                  </label>
                  <input
                    type="text"
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    placeholder="Contoh: Sudah bagus, tingkatkan penalaran TKA"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReviewSubmission(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={saveReviewModal}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Simpan Koreksi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pratinjau Materi PDF */}
      {previewMaterial && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full p-6 max-h-[88vh] flex flex-col justify-between animate-in fade-in">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs border border-red-200">
                  PDF
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{previewMaterial.judul}</h3>
                  <p className="text-xs text-slate-500">
                    {previewMaterial.mataPelajaran} • Pengampu: {previewMaterial.guruNama} • Sasaran: {previewMaterial.kelasTarget.join(', ')}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewMaterial(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Viewer Canvas Area */}
            <div className="my-4 overflow-y-auto flex-1 bg-slate-100 border border-slate-200 rounded-xl p-6 text-slate-800">
              <div className="max-w-xl mx-auto bg-white rounded-lg shadow-xs border border-slate-300 p-6 min-h-[360px] font-serif">
                <div className="text-center pb-4 border-b border-slate-200 mb-5">
                  <span className="text-[10px] uppercase tracking-wider font-sans font-bold text-emerald-700">
                    Madrasah Aliyah Negeri 11 Jakarta — Bahan Ajar Digital
                  </span>
                  <h2 className="text-lg font-bold font-sans text-slate-900 mt-1">{previewMaterial.judul}</h2>
                  <p className="text-xs text-slate-500 font-sans mt-0.5">
                    Mata Pelajaran: {previewMaterial.mataPelajaran} | Kurikulum Merdeka
                  </p>
                </div>

                <div className="text-xs space-y-3 font-sans leading-relaxed text-slate-700">
                  <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-lg text-emerald-950 font-medium text-[11px]">
                    <strong>Ringkasan Modul:</strong> {previewMaterial.deskripsi}
                  </div>

                  <h4 className="font-bold text-slate-900 text-xs pt-2">I. Capaian Pembelajaran & Tujuan</h4>
                  <p>
                    Peserta didik mampu memahami dan menganalisis konsep-konsep esensial pada materi {previewMaterial.mataPelajaran}, 
                    menerapkan pemecahan masalah secara kritis, serta mempersiapkan penguasaan materi untuk Asesmen Sumatif.
                  </p>

                  <h4 className="font-bold text-slate-900 text-xs pt-2">II. Poin-Poin Kunci & Glosarium</h4>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600">
                    <li>Pemahaman terminologi inti dan klasifikasi materi.</li>
                    <li>Hubungan sebab-akibat antar komponen dalam topik bahasan.</li>
                    <li>Aplikasi praktis dan latihan soal model asesmen sumatif / TKA.</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-200">
              <span className="text-xs text-slate-500 font-medium">
                Nama File: <span className="font-mono text-slate-700">{previewMaterial.fileName}</span> ({previewMaterial.fileSize})
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={`data:text/plain;charset=utf-8,${encodeURIComponent(
                    `[MAN 11 JAKARTA - MODUL PDF]\nJudul: ${previewMaterial.judul}\nMapel: ${previewMaterial.mataPelajaran}\nKelas: ${previewMaterial.kelasTarget.join(', ')}\nDeskripsi: ${previewMaterial.deskripsi}\nPengampu: ${previewMaterial.guruNama}`
                  )}`}
                  download={previewMaterial.fileName}
                  className="px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh Dokumen</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewMaterial(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
