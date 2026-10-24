export type UserRole = 'admin' | 'guru' | 'siswa';

export interface RombelKelas {
  id: string;
  nama: string; // e.g. 'X MIPA 1', 'XI IPS 2'
  tingkat: 'X' | 'XI' | 'XII' | string;
  jurusan: 'MIPA' | 'IPS' | 'Bahasa' | 'Keagamaan' | 'Umum' | string;
  waliKelasId?: string;
  waliKelasNama?: string;
  tahunAjaran?: string; // e.g. '2025/2026'
  kapasitas?: number;
  keterangan?: string;
  createdAt?: string;
}

export interface MataPelajaran {
  id: string;
  kode: string; // e.g. 'BIO-01', 'MAT-W'
  nama: string; // e.g. 'Biologi', 'Matematika Peminatan'
  kategori: 'Peminatan MIPA' | 'Peminatan IPS' | 'Umum / Wajib' | 'Peminatan Bahasa' | 'Keagamaan' | string;
  kkmDefault: number;
  jamPerMinggu?: number;
  createdAt?: string;
}

export interface KelasMapelPengampu {
  id: string;
  kelasNama: string; // e.g. 'X MIPA 1'
  mapelId: string;
  mapelNama: string;
  mapelKode?: string;
  guruId?: string;
  guruNama?: string;
  jadwalHari?: string;
  jamMulai?: string;
  jamSelesai?: string;
}

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
  kelasAjar?: string[]; // Khusus guru: daftar kelas yang diajar
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
  gambar?: string; // URL / Base64 image data untuk opsi jawaban
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
  gambar?: string; // URL / Base64 image data untuk redaksi soal / stimulus
  deskripsiStimulus?: string; // Khusus Model TKA / Soal Cerita
  pilihan?: PilihanOpsi[]; // Untuk PG & PG Kompleks
  kunciJawaban?: string | string[]; // string untuk PG/isian, string[] untuk PG Kompleks
  pasangan?: PasanganMenjodohkan[]; // Untuk Menjodohkan
  pernyataanTKA?: PernyataanTKA[]; // TKA: 1 deskripsi wacana + 3 pernyataan (Benar/Salah)
  bobot: number;
  pembahasan?: string;
}

export interface ExamToken {
  id: string;
  token: string;
  nomor: number; // 1, 2, 3, 4, dst.
  label: string; // 'Token 1', 'Token 2', 'Token 3', ...
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (10 menit setelah createdAt)
  isCustom?: boolean;
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
  waktuMulai?: string; // Waktu mulai aktif ujian (ISO / YYYY-MM-DDTHH:mm)
  waktuKadaluarsa?: string; // Waktu batas akhir / kadaluarsa ujian
  tokenUjian?: string; // Token masuk ujian utama / aktif saat ini
  tokenList?: ExamToken[]; // Daftar multi-token bergilir (Token 1, Token 2, Token 3, dst.) yang expired setelah 10 menit
  useToken?: boolean; // Mengharuskan siswa memasukkan token
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
