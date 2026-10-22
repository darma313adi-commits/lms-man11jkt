import { QuestionItem, StudentAnswer, ExamSubmission, ItemAnalysis } from '../types';

/**
 * Menghitung skor untuk satu butir soal berdasarkan jawaban siswa
 */
export function evaluateAnswer(soal: QuestionItem, studentAns: any): { skor: number; isCorrect: boolean } {
  if (studentAns === undefined || studentAns === null || studentAns === '') {
    return { skor: 0, isCorrect: false };
  }

  const bobot = soal.bobot || 10;

  switch (soal.type) {
    case 'pilihan_ganda': {
      const correctKey = typeof soal.kunciJawaban === 'string' ? soal.kunciJawaban.trim().toUpperCase() : '';
      const userKey = typeof studentAns === 'string' ? studentAns.trim().toUpperCase() : '';
      const isCorrect = userKey !== '' && userKey === correctKey;
      return {
        skor: isCorrect ? bobot : 0,
        isCorrect,
      };
    }

    case 'pilihan_ganda_kompleks': {
      const correctKeys: string[] = Array.isArray(soal.kunciJawaban)
        ? soal.kunciJawaban.map((k) => String(k).trim().toUpperCase())
        : [String(soal.kunciJawaban || '').trim().toUpperCase()];

      const userKeys: string[] = Array.isArray(studentAns)
        ? studentAns.map((k) => String(k).trim().toUpperCase())
        : [String(studentAns || '').trim().toUpperCase()];

      if (userKeys.length === 0 || correctKeys.length === 0) {
        return { skor: 0, isCorrect: false };
      }

      // Hitung kesesuaian: jika memilih opsi salah, ada penalti atau proporsi benar
      const correctSelected = userKeys.filter((k) => correctKeys.includes(k)).length;
      const wrongSelected = userKeys.filter((k) => !correctKeys.includes(k)).length;

      // Proporsionalitas: (benar dipilih - salah dipilih) / total kunci benar
      const netScore = Math.max(0, (correctSelected - wrongSelected) / correctKeys.length);
      const isFullCorrect = correctSelected === correctKeys.length && wrongSelected === 0;

      return {
        skor: Math.round(netScore * bobot * 10) / 10,
        isCorrect: isFullCorrect,
      };
    }

    case 'isian_singkat': {
      const userText = String(studentAns).trim().toLowerCase();
      if (!userText) return { skor: 0, isCorrect: false };

      // Kunci bisa multiple dipisah koma atau slash atau array
      let acceptable: string[] = [];
      if (Array.isArray(soal.kunciJawaban)) {
        acceptable = soal.kunciJawaban.map((k) => String(k).trim().toLowerCase());
      } else {
        const keyStr = String(soal.kunciJawaban || '').toLowerCase();
        acceptable = keyStr.split(/[/;,|]/).map((s) => s.trim()).filter(Boolean);
      }

      const isCorrect = acceptable.some((k) => k === userText || userText.includes(k) && userText.length < k.length + 5);
      return {
        skor: isCorrect ? bobot : 0,
        isCorrect,
      };
    }

    case 'menjodohkan': {
      // studentAns is Record<premisId, jawabanId> or similar
      const pasangan = soal.pasangan || [];
      if (pasangan.length === 0 || typeof studentAns !== 'object') {
        return { skor: 0, isCorrect: false };
      }

      let matchedCorrect = 0;
      pasangan.forEach((p) => {
        const userMatchedAnswer = studentAns[p.id];
        if (userMatchedAnswer && String(userMatchedAnswer).trim().toLowerCase() === p.jawaban.trim().toLowerCase()) {
          matchedCorrect++;
        }
      });

      const ratio = matchedCorrect / pasangan.length;
      return {
        skor: Math.round(ratio * bobot * 10) / 10,
        isCorrect: matchedCorrect === pasangan.length,
      };
    }

    case 'tka_benar_salah': {
      // 3 pernyataan, studentAns is Record<pernyataanId, 'Benar' | 'Salah'>
      const statements = soal.pernyataanTKA || [];
      if (statements.length === 0 || typeof studentAns !== 'object') {
        return { skor: 0, isCorrect: false };
      }

      let correctCount = 0;
      statements.forEach((stmt) => {
        const userChoice = studentAns[stmt.id];
        if (userChoice && String(userChoice).trim().toLowerCase() === stmt.kunci.trim().toLowerCase()) {
          correctCount++;
        }
      });

      const ratio = correctCount / statements.length;
      return {
        skor: Math.round(ratio * bobot * 10) / 10,
        isCorrect: correctCount === statements.length,
      };
    }

    default:
      return { skor: 0, isCorrect: false };
  }
}

/**
 * Menghitung total skor dan skala nilai /100 untuk satu lembar pengerjaan siswa
 */
export function calculateExamScore(
  soalList: QuestionItem[],
  jawabanMap: Record<string, StudentAnswer>
): { totalSkor: number; maxSkor: number; nilai100: number; evaluatedMap: Record<string, StudentAnswer> } {
  let totalSkor = 0;
  let maxSkor = 0;
  const evaluatedMap: Record<string, StudentAnswer> = {};

  soalList.forEach((soal) => {
    const bobot = soal.bobot || 10;
    maxSkor += bobot;

    const studentAnsObj = jawabanMap[soal.id] || {
      questionId: soal.id,
      jawaban: undefined,
      raguRagu: false,
    };

    const evalResult = evaluateAnswer(soal, studentAnsObj.jawaban);
    totalSkor += evalResult.skor;

    evaluatedMap[soal.id] = {
      ...studentAnsObj,
      skorDiperoleh: evalResult.skor,
      isCorrect: evalResult.isCorrect,
    };
  });

  const nilai100 = maxSkor > 0 ? Math.round((totalSkor / maxSkor) * 100 * 10) / 10 : 0;

  return {
    totalSkor: Math.round(totalSkor * 10) / 10,
    maxSkor,
    nilai100,
    evaluatedMap,
  };
}

/**
 * Analisis Butir Soal (Item Analysis)
 * Menghitung Tingkat Kesukaran (P), Daya Pembeda (D), dan persentase benar
 */
export function analyzeExamQuestions(
  soalList: QuestionItem[],
  submissions: ExamSubmission[]
): ItemAnalysis[] {
  const completed = submissions.filter((s) => s.status === 'sudah_dikumpulkan');
  const totalPeserta = completed.length;

  if (totalPeserta === 0) {
    return soalList.map((soal) => ({
      questionId: soal.id,
      nomor: soal.nomor,
      type: soal.type,
      pertanyaan: soal.pertanyaan,
      totalPeserta: 0,
      jumlahBenar: 0,
      persentaseBenar: 0,
      tingkatKesukaran: 'Sedang',
      dayaPembeda: 0,
      kategoriDayaPembeda: 'Cukup',
    }));
  }

  // Urutkan siswa dari nilai tertinggi ke terendah untuk kelompok atas & kelompok bawah
  const sorted = [...completed].sort((a, b) => b.nilai100 - a.nilai100);
  const groupSize = Math.max(1, Math.floor(sorted.length * 0.3)); // 30% kelompok atas dan bawah
  const upperGroup = sorted.slice(0, groupSize);
  const lowerGroup = sorted.slice(-groupSize);

  return soalList.map((soal) => {
    let jumlahBenar = 0;
    let upperCorrect = 0;
    let lowerCorrect = 0;
    const distribusiPilihan: Record<string, number> = {};

    completed.forEach((sub) => {
      const ansObj = sub.jawabanMap[soal.id];
      if (ansObj) {
        if (ansObj.isCorrect) jumlahBenar++;
        if (soal.type === 'pilihan_ganda' && typeof ansObj.jawaban === 'string') {
          distribusiPilihan[ansObj.jawaban] = (distribusiPilihan[ansObj.jawaban] || 0) + 1;
        }
      }
    });

    upperGroup.forEach((sub) => {
      if (sub.jawabanMap[soal.id]?.isCorrect) upperCorrect++;
    });

    lowerGroup.forEach((sub) => {
      if (sub.jawabanMap[soal.id]?.isCorrect) lowerCorrect++;
    });

    // Indeks Kesukaran P = B / N
    const pVal = jumlahBenar / totalPeserta;
    let tingkatKesukaran: 'Sukar' | 'Sedang' | 'Mudah' = 'Sedang';
    if (pVal < 0.3) tingkatKesukaran = 'Sukar';
    else if (pVal > 0.7) tingkatKesukaran = 'Mudah';

    // Daya Pembeda D = (B_A - B_B) / groupSize
    const dVal = Math.round(((upperCorrect - lowerCorrect) / groupSize) * 100) / 100;
    let kategoriDayaPembeda: 'Sangat Baik' | 'Baik' | 'Cukup' | 'Jelek / Revisi' = 'Cukup';
    if (dVal >= 0.4) kategoriDayaPembeda = 'Sangat Baik';
    else if (dVal >= 0.3) kategoriDayaPembeda = 'Baik';
    else if (dVal >= 0.2) kategoriDayaPembeda = 'Cukup';
    else kategoriDayaPembeda = 'Jelek / Revisi';

    return {
      questionId: soal.id,
      nomor: soal.nomor,
      type: soal.type,
      pertanyaan: soal.pertanyaan,
      totalPeserta,
      jumlahBenar,
      persentaseBenar: Math.round(pVal * 100),
      tingkatKesukaran,
      dayaPembeda: dVal,
      kategoriDayaPembeda,
      distribusiPilihan,
    };
  });
}
