import * as XLSX from 'xlsx';
import { User, QuestionItem, ExamSubmission, ItemAnalysis, Exam } from '../types';

/**
 * Parsing file Excel / CSV data pengguna (Guru / Siswa)
 */
export async function parseExcelUsers(file: File): Promise<Partial<User>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsedUsers: Partial<User>[] = [];

  for (const row of rawRows) {
    // Normalisasi kunci header
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalized[k.trim().toLowerCase().replace(/[\s_]+/g, '')] = row[k];
    });

    const nama = normalized['nama'] || normalized['namalengkap'] || normalized['name'] || '';
    const username = normalized['username'] || normalized['user'] || normalized['nisn'] || normalized['nip'] || '';
    const password = normalized['password'] || normalized['pass'] || '123456';
    const rawRole = String(normalized['role'] || normalized['peran'] || 'siswa').toLowerCase();
    const role = rawRole.includes('guru') || rawRole.includes('pengajar') ? 'guru' : rawRole.includes('admin') ? 'admin' : 'siswa';
    const kelas = normalized['kelas'] || normalized['rombel'] || (role === 'siswa' ? 'X MIPA 1' : undefined);
    const nipNisn = normalized['nip'] || normalized['nisn'] || normalized['nipnisn'] || '';
    const email = normalized['email'] || `${username || 'user'}@sekolah.sch.id`;

    if (nama && (username || nipNisn)) {
      parsedUsers.push({
        name: String(nama).trim(),
        username: String(username || nipNisn).trim().toLowerCase().replace(/\s+/g, '_'),
        password: String(password).trim(),
        role: role as any,
        kelas: kelas ? String(kelas).trim() : undefined,
        nip: role === 'guru' ? String(nipNisn).trim() : undefined,
        nisn: role === 'siswa' ? String(nipNisn).trim() : undefined,
        email: String(email).trim(),
        status: 'aktif',
      });
    }
  }

  return parsedUsers;
}

/**
 * Download Template Excel untuk Import User (Guru & Siswa)
 */
export function downloadUserTemplateExcel() {
  const sampleData = [
    {
      'Nama Lengkap': 'Drs. H. Mulyadi, M.Pd',
      'Username': 'guru_mulyadi',
      'Password': 'password123',
      'Role (guru/siswa)': 'guru',
      'Kelas (khusus siswa)': '',
      'NIP / NISN': '197508122000031002',
      'Email': 'mulyadi@sekolah.sch.id',
      'Mata Pelajaran': 'Fisika',
    },
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'Username': 'ahmad_fauzi',
      'Password': 'password123',
      'Role (guru/siswa)': 'siswa',
      'Kelas (khusus siswa)': 'X MIPA 1',
      'NIP / NISN': '0067823411',
      'Email': 'ahmad.fauzi@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Rani Anggraini',
      'Username': 'rani_anggraini',
      'Password': 'password123',
      'Role (guru/siswa)': 'siswa',
      'Kelas (khusus siswa)': 'X MIPA 1',
      'NIP / NISN': '0067823412',
      'Email': 'rani.a@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Bagus Perkasa',
      'Username': 'bagus_p',
      'Password': 'password123',
      'Role (guru/siswa)': 'siswa',
      'Kelas (khusus siswa)': 'X MIPA 2',
      'NIP / NISN': '0067823413',
      'Email': 'bagus.p@siswa.sch.id',
      'Mata Pelajaran': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pengguna');
  XLSX.writeFile(wb, 'Template_Import_Pengguna_LMS.xlsx');
}

/**
 * Unduh daftar akun ke Excel
 */
export function exportUsersExcel(users: User[]) {
  const exportData = users.map((u, i) => ({
    'No': i + 1,
    'Nama Lengkap': u.name,
    'Username': u.username,
    'Password': u.password,
    'Role': u.role.toUpperCase(),
    'Kelas': u.kelas || '-',
    'NIP / NISN': u.nip || u.nisn || '-',
    'Email': u.email || '-',
    'Status': u.status,
  }));

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Daftar Pengguna');
  XLSX.writeFile(wb, `Data_Pengguna_LMS_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Download Template Excel Pembuatan Soal
 */
export function downloadQuestionTemplateExcel() {
  const templateQuestions = [
    {
      'No': 1,
      'Tipe Soal': 'pilihan_ganda',
      'Pertanyaan': 'Manakah organel sel yang berfungsi sebagai tempat respirasi seluler dan menghasilkan ATP?',
      'Stimulus / Wacana': '',
      'Opsi A': 'Ribosom',
      'Opsi B': 'Mitokondria',
      'Opsi C': 'Badan Golgi',
      'Opsi D': 'Lisosom',
      'Opsi E': 'Retikulum Endoplasma',
      'Kunci Jawaban': 'B',
      'Bobot': 10,
      'Pembahasan': 'Mitokondria adalah the powerhouse of cell yang memproduksi ATP melalui respirasi sel.',
    },
    {
      'No': 2,
      'Tipe Soal': 'pilihan_ganda_kompleks',
      'Pertanyaan': 'Pilihlah komponen-komponen yang terdapat pada sel tumbuhan namun TIDAK ADA pada sel hewan! (Bisa pilih lebih dari satu)',
      'Stimulus / Wacana': '',
      'Opsi A': 'Dinding Sel',
      'Opsi B': 'Kloroplas',
      'Opsi C': 'Sentriol',
      'Opsi D': 'Vakuola Berukuran Besar',
      'Opsi E': 'Membran Sel',
      'Kunci Jawaban': 'A, B, D',
      'Bobot': 20,
      'Pembahasan': 'Sel tumbuhan memiliki dinding sel, kloroplas, dan vakuola sentral besar.',
    },
    {
      'No': 3,
      'Tipe Soal': 'isian_singkat',
      'Pertanyaan': 'Proses perombakan glukosa menjadi asam piruvat pada tahap awal respirasi seluler dinamakan proses...',
      'Stimulus / Wacana': '',
      'Opsi A': '',
      'Opsi B': '',
      'Opsi C': '',
      'Opsi D': '',
      'Opsi E': '',
      'Kunci Jawaban': 'Glikolisis / Glycolysis',
      'Bobot': 15,
      'Pembahasan': 'Glikolisis adalah proses pemecahan glukosa (6 karbon) menjadi 2 molekul asam piruvat (3 karbon).',
    },
    {
      'No': 4,
      'Tipe Soal': 'menjodohkan',
      'Pertanyaan': 'Jodohkanlah fase pembelahan mitosis berikut dengan peristiwa utamanya!',
      'Stimulus / Wacana': 'Fase Mitosis: Profase, Metafase, Anafase, Telofase',
      'Opsi A': 'Profase -> Kromatin memadat menjadi kromosom',
      'Opsi B': 'Metafase -> Kromosom berjejer di bidang ekuator',
      'Opsi C': 'Anafase -> Kromatid saudara berpisah ke kutub berlawanan',
      'Opsi D': 'Telofase -> Terbentuk kembali membran inti sel',
      'Opsi E': '',
      'Kunci Jawaban': 'Profase:Kromatin memadat; Metafase:Kromosom berjejer; Anafase:Kromatid saudara berpisah; Telofase:Terbentuk kembali membran inti',
      'Bobot': 25,
      'Pembahasan': 'Setiap fase memiliki ciri khas morfologi kromosom yang spesifik.',
    },
    {
      'No': 5,
      'Tipe Soal': 'tka_benar_salah',
      'Pertanyaan': 'Berdasarkan wacana berikut, tentukan nilai kebenaran (Benar/Salah) untuk ketiga pernyataan di bawahnya!',
      'Stimulus / Wacana': 'Fotosintesis terjadi dalam dua tahapan: Reaksi Terang di tilakoid yang memerlukan cahaya untuk fotolisis air dan menghasilkan ATP serta NADPH, dan Reaksi Gelap (Siklus Calvin) di stroma yang mereduksi CO2 menjadi glukosa tanpa bergantung langsung pada foton cahaya.',
      'Opsi A': 'Pernyataan 1: Fotolisis air pada reaksi terang menghasilkan molekul oksigen bebas. (Benar)',
      'Opsi B': 'Pernyataan 2: Siklus Calvin berlangsung di membran luar mitokondria. (Salah)',
      'Opsi C': 'Pernyataan 3: NADPH dan ATP dari reaksi terang digunakan untuk fiksasi karbon di stroma. (Benar)',
      'Opsi D': '',
      'Opsi E': '',
      'Kunci Jawaban': 'Benar, Salah, Benar',
      'Bobot': 30,
      'Pembahasan': 'P1 Benar (reaksi fotolisis melepaskan O2), P2 Salah (Siklus Calvin berlangsung di stroma kloroplas), P3 Benar.',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateQuestions);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Soal');
  XLSX.writeFile(wb, 'Template_Soal_LMS_Lengkap.xlsx');
}

/**
 * Parsing file Excel / CSV soal ujian
 */
export async function parseExcelQuestions(file: File): Promise<QuestionItem[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const questions: QuestionItem[] = [];

  rows.forEach((row, idx) => {
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      normalized[k.trim().toLowerCase().replace(/[\s_]+/g, '')] = row[k];
    });

    const tipeRaw = String(normalized['tipesoal'] || normalized['tipe'] || normalized['jenis'] || 'pilihan_ganda').toLowerCase();
    let type: any = 'pilihan_ganda';
    if (tipeRaw.includes('kompleks')) type = 'pilihan_ganda_kompleks';
    else if (tipeRaw.includes('isian') || tipeRaw.includes('singkat') || tipeRaw.includes('essay')) type = 'isian_singkat';
    else if (tipeRaw.includes('jodoh') || tipeRaw.includes('pasang')) type = 'menjodohkan';
    else if (tipeRaw.includes('tka') || tipeRaw.includes('benar') || tipeRaw.includes('salah')) type = 'tka_benar_salah';

    const pertanyaan = String(normalized['pertanyaan'] || normalized['soal'] || `Soal Nomor ${idx + 1}`).trim();
    const stimulus = String(normalized['stimulus/wacana'] || normalized['stimulus'] || normalized['wacana'] || normalized['deskripsi'] || '').trim();
    const bobot = Number(normalized['bobot']) || 10;
    const pembahasan = String(normalized['pembahasan'] || '').trim();

    const rawKunci = String(normalized['kuncijawaban'] || normalized['kunci'] || '').trim();

    if (type === 'tka_benar_salah') {
      // 3 pernyataan
      const rawA = String(normalized['opsia'] || normalized['pernyataan1'] || 'Pernyataan 1').trim();
      const rawB = String(normalized['opsib'] || normalized['pernyataan2'] || 'Pernyataan 2').trim();
      const rawC = String(normalized['opsic'] || normalized['pernyataan3'] || 'Pernyataan 3').trim();

      const kunciParts = rawKunci.split(/[,;\s]+/).map((s) => s.trim().toLowerCase());
      const p1Kunci = kunciParts[0]?.includes('benar') || kunciParts[0] === 'b' ? 'Benar' : 'Salah';
      const p2Kunci = kunciParts[1]?.includes('benar') || kunciParts[1] === 'b' ? 'Benar' : 'Salah';
      const p3Kunci = kunciParts[2]?.includes('benar') || kunciParts[2] === 'b' ? 'Benar' : 'Salah';

      questions.push({
        id: `q_${Date.now()}_${idx}`,
        nomor: idx + 1,
        type: 'tka_benar_salah',
        pertanyaan,
        deskripsiStimulus: stimulus || 'Baca dan cermati teks informasi berikut dengan saksama:',
        bobot,
        pembahasan,
        pernyataanTKA: [
          { id: `stmt_1_${idx}`, pernyataan: rawA.replace(/^Pernyataan\s*\d*[:.-]?\s*/i, ''), kunci: p1Kunci },
          { id: `stmt_2_${idx}`, pernyataan: rawB.replace(/^Pernyataan\s*\d*[:.-]?\s*/i, ''), kunci: p2Kunci },
          { id: `stmt_3_${idx}`, pernyataan: rawC.replace(/^Pernyataan\s*\d*[:.-]?\s*/i, ''), kunci: p3Kunci },
        ],
      });
    } else if (type === 'menjodohkan') {
      const pasangan: any[] = [];
      const keysPairs = rawKunci.split(/[;|\n]+/).filter(Boolean);
      if (keysPairs.length > 0) {
        keysPairs.forEach((pair, pIdx) => {
          const parts = pair.split(/[:\->=]+/);
          if (parts.length >= 2) {
            pasangan.push({
              id: `pair_${idx}_${pIdx}`,
              premis: parts[0].trim(),
              jawaban: parts[1].trim(),
            });
          }
        });
      }
      if (pasangan.length === 0) {
        // Fallback default sample pairs
        pasangan.push(
          { id: `pair_${idx}_1`, premis: 'Premis A', jawaban: 'Jawaban A' },
          { id: `pair_${idx}_2`, premis: 'Premis B', jawaban: 'Jawaban B' }
        );
      }
      questions.push({
        id: `q_${Date.now()}_${idx}`,
        nomor: idx + 1,
        type: 'menjodohkan',
        pertanyaan,
        deskripsiStimulus: stimulus,
        bobot,
        pembahasan,
        pasangan,
      });
    } else if (type === 'isian_singkat') {
      questions.push({
        id: `q_${Date.now()}_${idx}`,
        nomor: idx + 1,
        type: 'isian_singkat',
        pertanyaan,
        deskripsiStimulus: stimulus,
        bobot,
        kunciJawaban: rawKunci,
        pembahasan,
      });
    } else {
      // Pilihan Ganda atau PG Kompleks
      const pilihan = [
        { id: 'opt_A', label: 'A', text: String(normalized['opsia'] || normalized['a'] || 'Opsi A').trim() },
        { id: 'opt_B', label: 'B', text: String(normalized['opsib'] || normalized['b'] || 'Opsi B').trim() },
        { id: 'opt_C', label: 'C', text: String(normalized['opsic'] || normalized['c'] || 'Opsi C').trim() },
        { id: 'opt_D', label: 'D', text: String(normalized['opsid'] || normalized['d'] || 'Opsi D').trim() },
      ];
      if (normalized['opsie'] || normalized['e']) {
        pilihan.push({ id: 'opt_E', label: 'E', text: String(normalized['opsie'] || normalized['e']).trim() });
      }

      const kunci = type === 'pilihan_ganda_kompleks'
        ? rawKunci.split(/[,;\s]+/).map((s) => s.trim().toUpperCase()).filter(Boolean)
        : rawKunci.trim().toUpperCase().charAt(0) || 'A';

      questions.push({
        id: `q_${Date.now()}_${idx}`,
        nomor: idx + 1,
        type,
        pertanyaan,
        deskripsiStimulus: stimulus,
        pilihan,
        kunciJawaban: kunci,
        bobot,
        pembahasan,
      });
    }
  });

  return questions;
}

/**
 * Unduh Rekap Nilai ke Excel
 */
export function exportGradesExcel(submissions: ExamSubmission[], exam: Exam) {
  const rows = submissions.map((sub, i) => {
    const isLulus = sub.nilai100 >= exam.kkm;
    return {
      'No': i + 1,
      'Nama Siswa': sub.siswaNama,
      'Kelas': sub.siswaKelas,
      'NISN': sub.siswaNisn,
      'Mata Pelajaran': exam.mataPelajaran,
      'Judul Ujian': exam.judul,
      'Total Skor': sub.totalSkor,
      'Skor Maksimal': sub.maxSkor,
      'Nilai (/100)': sub.nilai100,
      'KKM': exam.kkm,
      'Status Kelulusan': isLulus ? 'TUNTAS' : 'REMIDI',
      'Pelanggaran Curang': sub.violations?.length || 0,
      'Status Pengerjaan': sub.status === 'sudah_dikumpulkan' ? 'Selesai' : 'Sedang Mengerjakan',
      'Waktu Mulai': sub.waktuMulai ? new Date(sub.waktuMulai).toLocaleTimeString('id-ID') : '-',
      'Waktu Selesai': sub.waktuSelesai ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID') : '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Rekap Nilai Siswa');
  const sanitizedTitle = exam.judul.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Rekap_Nilai_${sanitizedTitle}.xlsx`);
}

/**
 * Unduh Analisa Butir Soal ke Excel
 */
export function exportItemAnalysisExcel(analysis: ItemAnalysis[], exam: Exam) {
  const rows = analysis.map((item) => ({
    'No Soal': item.nomor,
    'Tipe Soal': item.type.toUpperCase(),
    'Pertanyaan': item.pertanyaan,
    'Total Peserta': item.totalPeserta,
    'Jumlah Jawaban Benar': item.jumlahBenar,
    'Persentase Benar (%)': `${item.persentaseBenar}%`,
    'Tingkat Kesukaran (P)': item.tingkatKesukaran,
    'Daya Pembeda (D)': item.dayaPembeda,
    'Status Soal': item.kategoriDayaPembeda,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Analisa Butir Soal');
  const sanitizedTitle = exam.judul.replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `Analisis_Butir_Soal_${sanitizedTitle}.xlsx`);
}
