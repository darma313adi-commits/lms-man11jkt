import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateAnswer, calculateExamScore, analyzeExamQuestions } from './examScoring';
import { QuestionItem, ExamSubmission } from '../types';

test('Single choice question scoring', () => {
  const soal: QuestionItem = {
    id: 'q1',
    type: 'pilihan_ganda',
    nomor: 1,
    pertanyaan: 'Ibukota Indonesia adalah?',
    bobot: 10,
    kunciJawaban: 'B',
  };

  const correct = evaluateAnswer(soal, 'B');
  assert.equal(correct.isCorrect, true);
  assert.equal(correct.skor, 10);

  const incorrect = evaluateAnswer(soal, 'A');
  assert.equal(incorrect.isCorrect, false);
  assert.equal(incorrect.skor, 0);
});

test('Multiple response (PG Kompleks) question scoring', () => {
  const soal: QuestionItem = {
    id: 'q2',
    type: 'pilihan_ganda_kompleks',
    nomor: 2,
    pertanyaan: 'Manakah yang termasuk bilangan prima?',
    bobot: 20,
    kunciJawaban: ['A', 'C'],
  };

  // Full correct
  const res1 = evaluateAnswer(soal, ['A', 'C']);
  assert.equal(res1.isCorrect, true);
  assert.equal(res1.skor, 20);

  // Partial correct (1 out of 2, 0 wrong)
  const res2 = evaluateAnswer(soal, ['A']);
  assert.equal(res2.isCorrect, false);
  assert.equal(res2.skor, 10);

  // Wrong selected penalty
  const res3 = evaluateAnswer(soal, ['A', 'B']); // A correct, B wrong
  assert.equal(res3.skor, 0);
});

test('Short answer (Isian Singkat) question scoring', () => {
  const soal: QuestionItem = {
    id: 'q3',
    type: 'isian_singkat',
    nomor: 3,
    pertanyaan: 'Organel sel penghasil energi adalah...',
    bobot: 10,
    kunciJawaban: 'Mitokondria / Mitochondria',
  };

  const correct1 = evaluateAnswer(soal, 'mitokondria');
  assert.equal(correct1.isCorrect, true);
  assert.equal(correct1.skor, 10);

  const correct2 = evaluateAnswer(soal, 'MITOCHONDRIA');
  assert.equal(correct2.isCorrect, true);

  const wrong = evaluateAnswer(soal, 'Ribosom');
  assert.equal(wrong.isCorrect, false);
  assert.equal(wrong.skor, 0);
});

test('Matching (Menjodohkan) question scoring', () => {
  const soal: QuestionItem = {
    id: 'q4',
    type: 'menjodohkan',
    nomor: 4,
    pertanyaan: 'Jodohkan negara dengan ibukotanya',
    bobot: 20,
    pasangan: [
      { id: 'p1', premis: 'Jepang', jawaban: 'Tokyo' },
      { id: 'p2', premis: 'Perancis', jawaban: 'Paris' },
    ],
  };

  // Both correct
  const resFull = evaluateAnswer(soal, { p1: 'Tokyo', p2: 'Paris' });
  assert.equal(resFull.isCorrect, true);
  assert.equal(resFull.skor, 20);

  // 1 correct out of 2
  const resHalf = evaluateAnswer(soal, { p1: 'Tokyo', p2: 'London' });
  assert.equal(resHalf.isCorrect, false);
  assert.equal(resHalf.skor, 10);
});

test('TKA Benar-Salah model with 3 statements scoring', () => {
  const soal: QuestionItem = {
    id: 'q5',
    type: 'tka_benar_salah',
    nomor: 5,
    pertanyaan: 'Berdasarkan wacana tentang energi terbarukan, tentukan Benar atau Salah pernyataan berikut:',
    deskripsiStimulus: 'Energi surya dan angin merupakan sumber energi bersih yang terus berkembang pesat.',
    bobot: 30,
    pernyataanTKA: [
      { id: 's1', pernyataan: 'Energi surya menghasilkan emisi gas rumah kaca saat beroperasi.', kunci: 'Salah' },
      { id: 's2', pernyataan: 'Energi angin bergantung pada cuaca dan kecepatan angin.', kunci: 'Benar' },
      { id: 's3', pernyataan: 'Keduanya termasuk sumber energi terbarukan.', kunci: 'Benar' },
    ],
  };

  // All 3 correct
  const res3 = evaluateAnswer(soal, { s1: 'Salah', s2: 'Benar', s3: 'Benar' });
  assert.equal(res3.isCorrect, true);
  assert.equal(res3.skor, 30);

  // 2 out of 3 correct
  const res2 = evaluateAnswer(soal, { s1: 'Benar', s2: 'Benar', s3: 'Benar' });
  assert.equal(res2.isCorrect, false);
  assert.equal(res2.skor, 20);
});

test('Full exam calculation scaled to 100', () => {
  const soalList: QuestionItem[] = [
    { id: 'q1', type: 'pilihan_ganda', nomor: 1, pertanyaan: 'Q1', bobot: 25, kunciJawaban: 'A' },
    { id: 'q2', type: 'pilihan_ganda', nomor: 2, pertanyaan: 'Q2', bobot: 25, kunciJawaban: 'B' },
    { id: 'q3', type: 'pilihan_ganda', nomor: 3, pertanyaan: 'Q3', bobot: 50, kunciJawaban: 'C' },
  ];

  const jawabanMap = {
    q1: { questionId: 'q1', jawaban: 'A', raguRagu: false },
    q2: { questionId: 'q2', jawaban: 'B', raguRagu: false },
    q3: { questionId: 'q3', jawaban: 'D', raguRagu: false }, // wrong
  };

  const calculated = calculateExamScore(soalList, jawabanMap);
  assert.equal(calculated.maxSkor, 100);
  assert.equal(calculated.totalSkor, 50);
  assert.equal(calculated.nilai100, 50);
});
