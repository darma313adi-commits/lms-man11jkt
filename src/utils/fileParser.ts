import * as XLSX from 'xlsx';
import { User, QuestionItem, ExamSubmission, ItemAnalysis, Exam } from '../types';

/**
 * Parsing file Excel / CSV data pengguna (Guru / Siswa)
 * Secara presisi mengekstrak nama kelas sesuai yang tertulis di template.
 */
export async function parseExcelUsers(file: File): Promise<Partial<User>[]> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  const parsedUsers: Partial<User>[] = [];

  for (const row of rawRows) {
    // Normalisasi kunci header untuk pencarian cepat
    const normalized: Record<string, any> = {};
    Object.keys(row).forEach((k) => {
      // Hapus spasi, kurung, garis miring, strip, garis bawah
      const cleanKey = k.trim().toLowerCase().replace(/[\s_()\-/\\]+/g, '');
      normalized[cleanKey] = row[k];
    });

    // Helper untuk mengambil nilai kolom dengan berbagai variasi nama header
    const getVal = (aliases: string[], excludeSubstrings: string[] = []): string => {
      // 1. Cek di normalized dengan exact match
      for (const a of aliases) {
        const cleanA = a.toLowerCase().replace(/[\s_()\-/\\]+/g, '');
        if (normalized[cleanA] !== undefined && String(normalized[cleanA]).trim() !== '') {
          return String(normalized[cleanA]).trim();
        }
      }
      // 2. Cek di row asli (exact match setelah dibersihkan)
      for (const origKey of Object.keys(row)) {
        const cleanK = origKey.trim().toLowerCase().replace(/[\s_()\-/\\]+/g, '');
        for (const a of aliases) {
          const cleanA = a.toLowerCase().replace(/[\s_()\-/\\]+/g, '');
          if (cleanK === cleanA) {
            const v = row[origKey];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return String(v).trim();
            }
          }
        }
      }
      // 3. Cek di row asli (substring match dengan perlindungan excludeSubstrings)
      for (const origKey of Object.keys(row)) {
        const cleanK = origKey.trim().toLowerCase().replace(/[\s_()\-/\\]+/g, '');
        if (excludeSubstrings.some((ex) => cleanK.includes(ex))) {
          continue;
        }
        for (const a of aliases) {
          const cleanA = a.toLowerCase().replace(/[\s_()\-/\\]+/g, '');
          if (cleanK.includes(cleanA)) {
            const v = row[origKey];
            if (v !== undefined && v !== null && String(v).trim() !== '') {
              return String(v).trim();
            }
          }
        }
      }
      return '';
    };

    const nama = getVal(['nama', 'namalengkap', 'name', 'fullname', 'peserta', 'siswa', 'guru']);
    const username = getVal(['username', 'user', 'nisn', 'nip', 'id', 'nomorinduk']);
    const password = getVal(['password', 'pass', 'sandi', 'katasandi']) || '123456';
    const rawRole = getVal(['role', 'peran', 'jabatan', 'status']).toLowerCase() || 'siswa';
    const role: 'guru' | 'siswa' | 'admin' =
      rawRole.includes('guru') || rawRole.includes('pengajar') || rawRole.includes('teacher')
        ? 'guru'
        : rawRole.includes('admin')
        ? 'admin'
        : 'siswa';

    // EKSTRAK KELAS DARI TEMPLATE:
    // Mendukung variasi: "Kelas", "Kelas (khusus siswa)", "Kelas/Rombel", "Rombel", "Rombongan Belajar", "Kelas Siswa", dll.
    const rawKelas = getVal(
      [
        'kelas',
        'kelaskhusussiswa',
        'kelasrombel',
        'rombelkelas',
        'rombel',
        'namarombel',
        'rombonganbelajar',
        'rombongan',
        'kelassiswa',
        'namakelas',
        'tingkatkelas',
        'tingkat',
        'class',
        'section',
        'ruangkelas',
        'classroom',
      ],
      ['ajar', 'pengampu', 'ampu'] // hindari kolom guru "kelas yang diajar" terbaca sebagai kelas siswa
    );

    const nipNisn = getVal(['nip', 'nisn', 'nipnisn', 'nomorinduk', 'noinduk']);
    const email = getVal(['email', 'surel']) || `${username || 'user'}@sekolah.sch.id`;
    const mataPelajaran = getVal(['matapelajaran', 'mapel', 'subject', 'pelajaran']);

    if (nama && (username || nipNisn)) {
      const finalUsername = String(username || nipNisn).trim().toLowerCase().replace(/\s+/g, '_');
      
      // Kelas hanya untuk siswa, atau jika guru untuk kelasAjar
      const rawCleaned = rawKelas ? rawKelas.trim().replace(/\s+/g, ' ') : undefined;
      const cleanKelas = rawCleaned
        ? rawCleaned
            .replace(/XI\s+IPS\s+1/gi, 'XII 3')
            .replace(/XI\s+IPS\s+2/gi, 'XII 3')
            .replace(/XII\s+IPS\s+1/gi, 'XII 4')
            .replace(/XII\s+IPS\s+2/gi, 'XII 4')
            .replace(/\b(MIPA|MIA|IPA|IPS)\s*/gi, '')
            .trim()
        : undefined;
      const finalKelas = role === 'siswa' && cleanKelas ? cleanKelas : undefined;
      
      const teacherKelasAjar =
        getVal(['kelasyangdiajar', 'kelasajar', 'kelasdiampu', 'daftarkelas', 'daftarruang']) || cleanKelas;
      const finalKelasAjar =
        role === 'guru' && teacherKelasAjar
          ? teacherKelasAjar
              .split(',')
              .map((k) =>
                k
                  .trim()
                  .replace(/XI\s+IPS\s+1/gi, 'XII 3')
                  .replace(/XI\s+IPS\s+2/gi, 'XII 3')
                  .replace(/XII\s+IPS\s+1/gi, 'XII 4')
                  .replace(/XII\s+IPS\s+2/gi, 'XII 4')
                  .replace(/\b(MIPA|MIA|IPA|IPS)\s*/gi, '')
                  .trim()
              )
              .filter(Boolean)
          : undefined;

      parsedUsers.push({
        name: String(nama).trim(),
        username: finalUsername,
        password: String(password).trim(),
        role: role as any,
        kelas: finalKelas,
        kelasAjar: finalKelasAjar,
        nip: role === 'guru' ? (nipNisn ? String(nipNisn).trim() : undefined) : undefined,
        nisn: role === 'siswa' ? (nipNisn ? String(nipNisn).trim() : finalUsername) : undefined,
        email: String(email).trim(),
        mataPelajaran: role === 'guru' ? (mataPelajaran ? String(mataPelajaran).trim() : undefined) : undefined,
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
      'Role': 'guru',
      'Kelas': '',
      'NIP / NISN': '197508122000031002',
      'Email': 'mulyadi@sekolah.sch.id',
      'Mata Pelajaran': 'Fisika',
    },
    {
      'Nama Lengkap': 'Ahmad Fauzi',
      'Username': 'ahmad_fauzi',
      'Password': 'password123',
      'Role': 'siswa',
      'Kelas': 'X 1',
      'NIP / NISN': '0067823411',
      'Email': 'ahmad.fauzi@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Rani Anggraini',
      'Username': 'rani_anggraini',
      'Password': 'password123',
      'Role': 'siswa',
      'Kelas': 'X 2',
      'NIP / NISN': '0067823412',
      'Email': 'rani.a@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Bagus Perkasa',
      'Username': 'bagus_p',
      'Password': 'password123',
      'Role': 'siswa',
      'Kelas': 'X 4',
      'NIP / NISN': '0067823413',
      'Email': 'bagus.p@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Dewi Lestari',
      'Username': 'dewi_lestari',
      'Password': 'password123',
      'Role': 'siswa',
      'Kelas': 'XII 3',
      'NIP / NISN': '0067823414',
      'Email': 'dewi.l@siswa.sch.id',
      'Mata Pelajaran': '',
    },
    {
      'Nama Lengkap': 'Rizky Pratama',
      'Username': 'rizky_p',
      'Password': 'password123',
      'Role': 'siswa',
      'Kelas': 'XII 4',
      'NIP / NISN': '0067823415',
      'Email': 'rizky.p@siswa.sch.id',
      'Mata Pelajaran': '',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data Pengguna');
  XLSX.writeFile(wb, 'Template_Import_Pengguna_LMS.xlsx');
}

/**
 * Download Template Khusus Akun Guru / Pendidik
 */
export function downloadGuruTemplateExcel() {
  const sampleTeachers = [
    {
      'Nama Lengkap (dengan Gelar)': 'Dra. Hj. Nurjanah, M.Pd',
      'Username': 'guru_nurjanah',
      'Password': 'password123',
      'Role': 'guru',
      'NIP': '197604122003122001',
      'Email': 'nurjanah@man11jakarta.sch.id',
      'Mata Pelajaran Diampu': 'Biologi',
      'Kelas yang Diajar': 'X 3, X 4, XII 3',
    },
    {
      'Nama Lengkap (dengan Gelar)': 'Ahmad Fauzan, S.Pd, M.Si',
      'Username': 'guru_fauzan',
      'Password': 'password123',
      'Role': 'guru',
      'NIP': '198103192008011005',
      'Email': 'ahmad.fauzan@man11jakarta.sch.id',
      'Mata Pelajaran Diampu': 'Fisika',
      'Kelas yang Diajar': 'XII 3, XII 4',
    },
    {
      'Nama Lengkap (dengan Gelar)': 'Nurul Hidayah, S.Pd',
      'Username': 'guru_nurul',
      'Password': 'password123',
      'Role': 'guru',
      'NIP': '198509212010012008',
      'Email': 'nurul.hidayah@man11jakarta.sch.id',
      'Mata Pelajaran Diampu': 'Kimia',
      'Kelas yang Diajar': 'XII 3, XII 4',
    },
    {
      'Nama Lengkap (dengan Gelar)': 'Rahmat Hidayat, M.Kom',
      'Username': 'guru_rahmat',
      'Password': 'password123',
      'Role': 'guru',
      'NIP': '198811052014021003',
      'Email': 'rahmat.h@man11jakarta.sch.id',
      'Mata Pelajaran Diampu': 'Informatika',
      'Kelas yang Diajar': 'X 3, X 4, XII 3',
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleTeachers);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template Guru');
  XLSX.writeFile(wb, 'Template_Import_Akun_Guru_MAN11.xlsx');
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
 * Unduh Rekap Nilai ke Excel (Dapat difilter per kelas)
 */
export function exportGradesExcel(submissions: ExamSubmission[], exam: Exam, className?: string) {
  const filteredSubs =
    className && className !== 'all'
      ? submissions.filter(
          (s) => (s.siswaKelas || '').trim().toLowerCase() === className.trim().toLowerCase()
        )
      : submissions;

  const rows = filteredSubs.map((sub, i) => {
    const isLulus = sub.nilai100 >= exam.kkm;
    const violations = sub.violations || [];
    const detailCurang =
      violations.length > 0
        ? violations
            .map(
              (v, idx) =>
                `[${idx + 1}] ${new Date(v.timestamp).toLocaleTimeString('id-ID', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })} (${v.tipe.toUpperCase()}): ${v.deskripsi}`
            )
            .join(' | ')
        : 'Tidak ada pelanggaran';
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
      'Pelanggaran Curang': violations.length,
      'Status Kecurangan': violations.length > 0 ? `TERDETEKSI (${violations.length}x)` : 'BERSIH',
      'Detail Laporan Kecurangan': detailCurang,
      'Status Pengerjaan': sub.status === 'sudah_dikumpulkan' ? 'Selesai' : 'Sedang Mengerjakan',
      'Jam Login': sub.waktuMulai ? new Date(sub.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
      'Jam Kirim Jawaban': sub.waktuSelesai ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-',
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  const sheetTitle =
    className && className !== 'all'
      ? `Nilai ${className}`.slice(0, 31)
      : 'Rekap Nilai Siswa';
  XLSX.utils.book_append_sheet(wb, ws, sheetTitle);
  const sanitizedTitle = exam.judul.replace(/[/\\?%*:|"<>]/g, '_');
  const classSuffix =
    className && className !== 'all'
      ? `_Kelas_${className.replace(/[/\\?%*:|"<> ]/g, '_')}`
      : '';
  XLSX.writeFile(wb, `Rekap_Nilai_${sanitizedTitle}${classSuffix}.xlsx`);
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
