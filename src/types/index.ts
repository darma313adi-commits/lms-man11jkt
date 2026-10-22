export type UserRole = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  username: string;
  password: string;
  name: string;
  email?: string;
  role: UserRole;
  kelas?: string; // Khusus siswa e.g., 'X MIPA 1', 'XI IPS 2'
  nip?: string;
  nisn?: string;
  mataPelajaran?: string; // Khusus guru
  status: 'aktif' | 'nonaktif';
  createdAt: string;
}

export type QuestionType =
  | 'pilihan_ganda'
  | 'pilihan_ganda_kompleks'
  | 'isian_singkat'
  | 'menjodohkan'
  | 'tka_benar_salah';

export interface PilihanOpsi {
  id: string;
  label: string; // 'A', 'B', 'C', 'D', 'E'
  text: string;
}

export interface PasanganMenjodohkan {
  id: string;
  premis: string; // Bagian kiri
  jawaban: string; // Bagian kanan yang cocok
}

export interface PernyataanTKA {
  id: string;
  pernyataan: string;
  kunci: 'Benar' | 'Salah';
}

export interface QuestionItem {
  id: string;
  type: QuestionType;
  nomor: number;
  pertanyaan: string; // Pertanyaan teks/wacana
  deskripsiStimulus?: string; // Khusus Model TKA / Soal Cerita
  pilihan?: PilihanOpsi[]; // Untuk PG & PG Kompleks
  kunciJawaban?: string | string[]; // string untuk PG/isian, string[] untuk PG Kompleks
  pasangan?: PasanganMenjodohkan[]; // Untuk Menjodohkan
  pernyataanTKA?: PernyataanTKA[]; // TKA: 1 deskripsi wacana + 3 pernyataan (Benar/Salah)
  bobot: number;
  pembahasan?: string;
}

export interface Exam {
  id: string;
  judul: string;
  deskripsi: string;
  mataPelajaran: string;
  kelasTarget: string[];
  durasiMenit: number;
  guruId: string;
  guruNama: string;
  status: 'draft' | 'aktif' | 'selesai';
  kodeUjian: string;
  soalList: QuestionItem[];
  kkm: number;
  jenisAsesmen?: 'sumatif_lingkup_materi' | 'sumatif_akhir_semester' | 'formatif';
  acakSoal?: boolean;
  acakOpsi?: boolean;
  tampilkanNilai?: boolean;
  createdAt: string;
}

export interface LessonMaterial {
  id: string;
  judul: string;
  deskripsi: string;
  mataPelajaran: string;
  kelasTarget: string[];
  guruId: string;
  guruNama: string;
  fileName: string;
  fileSize?: string;
  fileData?: string; // Data URL or text representation
  tipe: 'pdf' | 'dokumen';
  createdAt: string;
}

export interface CheatingViolation {
  id: string;
  timestamp: string;
  tipe: 'tab_switch' | 'exit_fullscreen' | 'key_shortcut' | 'context_menu' | 'window_blur';
  deskripsi: string;
}

export interface StudentAnswer {
  questionId: string;
  // string (PG/isian), string[] (PG Kompleks), Record<premisId, jawabanId> (menjodohkan), Record<pernyataanId, 'Benar'|'Salah'> (TKA)
  jawaban: any;
  raguRagu: boolean;
  skorDiperoleh?: number;
  isCorrect?: boolean;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examJudul: string;
  mataPelajaran: string;
  siswaId: string;
  siswaNama: string;
  siswaKelas: string;
  siswaNisn: string;
  waktuMulai: string;
  waktuSelesai?: string;
  sisaWaktuDetik: number;
  jawabanMap: Record<string, StudentAnswer>;
  totalSkor: number;
  maxSkor: number;
  nilai100: number;
  status: 'sedang_mengerjakan' | 'sudah_dikumpulkan' | 'terkunci_curang';
  violations: CheatingViolation[];
  catatanGuru?: string;
}

export interface ItemAnalysis {
  questionId: string;
  nomor: number;
  type: QuestionType;
  pertanyaan: string;
  totalPeserta: number;
  jumlahBenar: number;
  persentaseBenar: number;
  tingkatKesukaran: 'Sukar' | 'Sedang' | 'Mudah';
  dayaPembeda: number; // -1.0 to 1.0
  kategoriDayaPembeda: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek / Revisi';
  distribusiPilihan?: Record<string, number>;
}
