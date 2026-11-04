import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Exam, QuestionItem, LessonMaterial } from '../types';

export interface ExamPrintOptions {
  includeAnswerKey?: boolean;
  schoolName?: string;
  subTitle?: string;
}

/**
 * Format string HTML naskah ujian standar MAN 11 Jakarta
 */
export function generateExamHtml(exam: Exam, options: ExamPrintOptions = {}): string {
  const includeKeys = options.includeAnswerKey ?? false;
  const schoolName = options.schoolName || 'MADRASAH ALIYAH NEGERI (MAN) 11 JAKARTA';
  const subTitle =
    options.subTitle ||
    (exam.jenisAsesmen === 'sumatif_akhir_semester'
      ? 'ASESMEN SUMATIF AKHIR SEMESTER (SAS)'
      : exam.jenisAsesmen === 'formatif'
      ? 'ASESMEN FORMATIF PEMBELAJARAN'
      : 'ASESMEN SUMATIF LINGKUP MATERI');

  const questionItemsHtml = exam.soalList
    .map((soal, index) => {
      let optionsHtml = '';

      if (soal.type === 'pilihan_ganda' || soal.type === 'pilihan_ganda_kompleks') {
        const pilihanList = soal.pilihan || [];
        optionsHtml = `
          <div style="margin-left: 20px; margin-top: 6px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px;">
            ${pilihanList
              .map(
                (p) => `
                <div style="display: flex; align-items: flex-start; gap: 8px; font-size: 13px; line-height: 1.4;">
                  <span style="font-weight: bold; min-width: 18px;">${p.label}.</span>
                  <span>${p.text}</span>
                  ${p.gambar ? `<div style="margin-top: 4px;"><img src="${p.gambar}" style="max-height: 80px; max-width: 100%; border: 1px solid #ccc; border-radius: 4px;" /></div>` : ''}
                </div>
              `
              )
              .join('')}
          </div>
        `;
      } else if (soal.type === 'menjodohkan') {
        const pasangan = soal.pasangan || [];
        optionsHtml = `
          <div style="margin-left: 20px; margin-top: 8px;">
            <p style="font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #334155;">Pasangkan pernyataan kolom kiri dengan jawaban yang sesuai di kolom kanan:</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; width: 50%;">Pernyataan / Premis (Kiri)</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; width: 50%;">Pasangan Jawaban (Kanan)</th>
                </tr>
              </thead>
              <tbody>
                ${pasangan
                  .map(
                    (p, pIdx) => `
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${pIdx + 1}. ${p.premis}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">[ &nbsp; &nbsp; ] &nbsp; ${p.jawaban}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      } else if (soal.type === 'tka_benar_salah') {
        const pernPilihan = soal.pernyataanTKA || [];
        optionsHtml = `
          <div style="margin-left: 20px; margin-top: 8px;">
            <p style="font-size: 12px; font-weight: bold; margin-bottom: 4px; color: #334155;">Tentukan kebenaran masing-masing pernyataan berikut (Beri tanda centang ✓ pada kolom Benar atau Salah):</p>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 4px;">
              <thead>
                <tr style="background: #f1f5f9;">
                  <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Pernyataan</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; width: 80px;">Benar</th>
                  <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; width: 80px;">Salah</th>
                </tr>
              </thead>
              <tbody>
                ${pernPilihan
                  .map(
                    (item, itIdx) => `
                    <tr>
                      <td style="border: 1px solid #cbd5e1; padding: 6px 10px;">${itIdx + 1}. ${item.pernyataan}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${includeKeys && item.kunci === 'Benar' ? '<b>✓</b>' : '[ &nbsp; ]'}</td>
                      <td style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center;">${includeKeys && item.kunci === 'Salah' ? '<b>✓</b>' : '[ &nbsp; ]'}</td>
                    </tr>
                  `
                  )
                  .join('')}
              </tbody>
            </table>
          </div>
        `;
      } else if (soal.type === 'isian_singkat') {
        optionsHtml = `
          <div style="margin-left: 20px; margin-top: 8px;">
            <p style="font-size: 12px; color: #475569;">Jawaban Singkat: ____________________________________________________________________</p>
          </div>
        `;
      }

      // Kunci Jawaban jika diaktifkan
      let keyHtml = '';
      if (includeKeys) {
        let keyText = '';
        if (soal.type === 'pilihan_ganda' || soal.type === 'isian_singkat') {
          keyText = Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban.join(', ') : soal.kunciJawaban || '-';
        } else if (soal.type === 'pilihan_ganda_kompleks') {
          keyText = Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban.join(', ') : soal.kunciJawaban || '-';
        } else if (soal.type === 'menjodohkan') {
          keyText = (soal.pasangan || []).map((p) => `${p.premis} ➔ ${p.jawaban}`).join('; ');
        } else if (soal.type === 'tka_benar_salah') {
          keyText = (soal.pernyataanTKA || []).map((p, idx) => `Pernyataan ${idx + 1}: ${p.kunci}`).join('; ');
        }

        keyHtml = `
          <div style="margin-left: 20px; margin-top: 8px; padding: 6px 10px; background: #ecfdf5; border-left: 3px solid #10b981; font-size: 11px; color: #065f46; border-radius: 0 4px 4px 0;">
            <strong>Kunci Jawaban:</strong> ${keyText} &nbsp;•&nbsp; <strong>Bobot:</strong> ${soal.bobot} Poin
            ${soal.pembahasan ? `<br/><em>Pembahasan:</em> ${soal.pembahasan}` : ''}
          </div>
        `;
      }

      return `
        <div style="margin-bottom: 20px; page-break-inside: avoid;">
          <div style="display: flex; align-items: flex-start; gap: 8px;">
            <span style="font-weight: bold; min-width: 22px; font-size: 13px;">${index + 1}.</span>
            <div style="flex: 1;">
              ${
                soal.deskripsiStimulus
                  ? `<div style="background: #f8fafc; border-left: 3px solid #6366f1; padding: 8px 12px; margin-bottom: 8px; font-size: 12px; font-style: italic; color: #334155; line-height: 1.5;">${soal.deskripsiStimulus}</div>`
                  : ''
              }
              <div style="font-size: 13px; line-height: 1.5; color: #0f172a; font-weight: 500;">
                ${soal.pertanyaan}
              </div>
              ${
                soal.gambar
                  ? `<div style="margin: 8px 0;"><img src="${soal.gambar}" style="max-height: 200px; max-width: 100%; border: 1px solid #e2e8f0; border-radius: 6px;" /></div>`
                  : ''
              }
              ${optionsHtml}
              ${keyHtml}
            </div>
          </div>
        </div>
      `;
    })
    .join('');

  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${exam.judul} - Naskah Soal MAN 11 Jakarta</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 15mm 15mm 15mm 15mm;
        }
        body {
          font-family: 'Times New Roman', Times, serif, Arial, sans-serif;
          color: #000;
          line-height: 1.4;
          margin: 0;
          padding: 20px;
          background: #fff;
        }
        .header-kop {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 12px;
          position: relative;
        }
        .header-kop h3 {
          margin: 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        .header-kop h2 {
          margin: 2px 0;
          font-size: 16pt;
          font-weight: bold;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .header-kop p {
          margin: 2px 0;
          font-size: 9pt;
          color: #333;
        }
        .line-double {
          border-top: 1px solid #000;
          margin-top: 2px;
        }
        .exam-info-box {
          border: 1.5px solid #000;
          padding: 8px 12px;
          margin-bottom: 14px;
          font-size: 10pt;
        }
        .exam-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4px 20px;
        }
        .info-row {
          display: flex;
        }
        .info-label {
          width: 120px;
          font-weight: bold;
        }
        .info-val {
          flex: 1;
        }
        .instructions {
          font-size: 9pt;
          font-style: italic;
          background: #f8fafc;
          border: 1px dashed #94a3b8;
          padding: 6px 10px;
          margin-bottom: 16px;
        }
        .badge-key {
          display: inline-block;
          padding: 2px 8px;
          background: #10b981;
          color: #fff;
          font-weight: bold;
          font-size: 9pt;
          border-radius: 4px;
        }
        @media print {
          body {
            padding: 0;
          }
          .no-print {
            display: none !important;
          }
        }
      </style>
    </head>
    <body>
      <div class="header-kop">
        <h3>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h3>
        <h3>KANTOR KEMENTERIAN AGAMA KOTA JAKARTA SELATAN</h3>
        <h2>${schoolName}</h2>
        <p>Jl. H. Rohimin No. 1, RT.04/RW.03, Ulujami, Pesanggrahan, Jakarta Selatan 12250</p>
        <p>Telepon: (021) 7350720 | Website: https://man11jakarta.sch.id | Email: info@man11jakarta.sch.id</p>
        <div class="line-double"></div>
      </div>

      <div style="text-align: center; margin-bottom: 10px;">
        <h4 style="margin: 0; font-size: 13pt; text-transform: uppercase; font-weight: bold; text-decoration: underline;">
          ${subTitle}
        </h4>
        <p style="margin: 2px 0 0 0; font-size: 11pt; font-weight: bold;">
          ${exam.judul}
        </p>
        ${
          includeKeys
            ? '<span class="badge-key" style="margin-top: 4px;">NASKAH MASTER GURU & KUNCI JAWABAN</span>'
            : ''
        }
      </div>

      <div class="exam-info-box">
        <div class="exam-info-grid">
          <div class="info-row">
            <span class="info-label">Mata Pelajaran</span>
            <span class="info-val">: <strong>${exam.mataPelajaran}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">Hari / Tanggal</span>
            <span class="info-val">: ${new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kelas / Sasaran</span>
            <span class="info-val">: ${exam.kelasTarget.join(', ')}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Alokasi Waktu</span>
            <span class="info-val">: ${exam.durasiMenit} Menit (${exam.soalList.length} Butir Soal)</span>
          </div>
          <div class="info-row">
            <span class="info-label">Guru Pengampu</span>
            <span class="info-val">: ${exam.guruNama || 'Guru Mapel'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nama Siswa</span>
            <span class="info-val">: ................................................................</span>
          </div>
          <div class="info-row">
            <span class="info-label">Kode Ujian</span>
            <span class="info-val">: <strong style="font-family: monospace;">${exam.kodeUjian}</strong></span>
          </div>
          <div class="info-row">
            <span class="info-label">No. Peserta / NISN</span>
            <span class="info-val">: ................................................................</span>
          </div>
        </div>
      </div>

      <div class="instructions">
        <strong>PETUNJUK UMUM:</strong>
        1. Berdoalah sebelum mulai mengerjakan naskah soal.
        2. Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawab.
        3. Dahulukan menjawab soal-soal yang Anda anggap paling mudah.
        4. Lembar soal ini dapat digunakan untuk pembelajaran dan asesmen resmi Madrasah Aliyah Negeri 11 Jakarta.
      </div>

      <div class="questions-container">
        ${questionItemsHtml}
      </div>

      <div style="margin-top: 30px; display: flex; justify-content: flex-end; page-break-inside: avoid;">
        <div style="text-align: center; width: 250px; font-size: 11pt;">
          <p style="margin: 0;">Jakarta, ${new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}</p>
          <p style="margin: 2px 0 50px 0;">Guru Mata Pelajaran,</p>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">${exam.guruNama || 'Guru Mata Pelajaran'}</p>
          <p style="margin: 0; font-size: 9pt;">NIP: ................................................</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Membuka jendela print langsung dari browser
 */
export function printExamDirectly(exam: Exam, options: ExamPrintOptions = {}) {
  const html = generateExamHtml(exam, options);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Izinkan popup untuk mencetak naskah ujian.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Ekspor naskah soal ke Word (.doc) yang dapat diedit langsung di Microsoft Word / Google Docs
 */
export function exportExamWordDoc(exam: Exam, options: ExamPrintOptions = {}) {
  const html = generateExamHtml(exam, options);
  const blob = new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const fileName = `Naskah_Soal_${exam.mataPelajaran.replace(/\s+/g, '_')}_${exam.judul.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Ekspor naskah soal resmi ke PDF menggunakan jsPDF
 */
export function exportExamPdf(exam: Exam, options: ExamPrintOptions = {}) {
  const includeKeys = options.includeAnswerKey ?? false;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 14;

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, curY, { align: 'center' });
  curY += 5;
  doc.text('KANTOR KEMENTERIAN AGAMA KOTA JAKARTA SELATAN', pageWidth / 2, curY, { align: 'center' });
  curY += 6;
  doc.setFontSize(13);
  doc.text('MADRASAH ALIYAH NEGERI (MAN) 11 JAKARTA', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Jl. H. Rohimin No. 1, RT.04/RW.03, Ulujami, Pesanggrahan, Jakarta Selatan 12250',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += 4;
  doc.text(
    'Telepon: (021) 7350720 | Website: https://man11jakarta.sch.id | Email: info@man11jakarta.sch.id',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += 3;

  // Garis Dobel Kop
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(14, curY, pageWidth - 14, curY);
  curY += 0.8;
  doc.setLineWidth(0.2);
  doc.line(14, curY, pageWidth - 14, curY);
  curY += 6;

  // Judul Naskah
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  const subTitle =
    exam.jenisAsesmen === 'sumatif_akhir_semester'
      ? 'ASESMEN SUMATIF AKHIR SEMESTER'
      : exam.jenisAsesmen === 'formatif'
      ? 'ASESMEN FORMATIF'
      : 'ASESMEN SUMATIF LINGKUP MATERI';
  doc.text(subTitle, pageWidth / 2, curY, { align: 'center' });
  curY += 5;
  doc.setFontSize(12);
  doc.text(exam.judul.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
  curY += 5;

  if (includeKeys) {
    doc.setFontSize(9);
    doc.setTextColor(16, 185, 129);
    doc.text('[ NASKAH MASTER GURU & KUNCI JAWABAN ]', pageWidth / 2, curY, { align: 'center' });
    curY += 5;
  }

  // Info Box
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, curY, pageWidth - 28, 22, 2, 2, 'FD');

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const leftCol = 18;
  const valCol = 48;
  const rightCol = 110;
  const valRight = 142;
  const rowH = 4.8;
  let boxY = curY + 5;

  doc.text('Mata Pelajaran', leftCol, boxY);
  doc.text(`: ${exam.mataPelajaran}`, valCol, boxY);
  doc.text('Hari / Tanggal', rightCol, boxY);
  doc.text(`: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, valRight, boxY);

  boxY += rowH;
  doc.text('Kelas / Sasaran', leftCol, boxY);
  doc.text(`: ${exam.kelasTarget.join(', ')}`, valCol, boxY);
  doc.text('Alokasi Waktu', rightCol, boxY);
  doc.text(`: ${exam.durasiMenit} Menit (${exam.soalList.length} Soal)`, valRight, boxY);

  boxY += rowH;
  doc.text('Kode Ujian', leftCol, boxY);
  doc.text(`: ${exam.kodeUjian}`, valCol, boxY);
  doc.text('Nama Siswa', rightCol, boxY);
  doc.text(': .....................................................', valRight, boxY);

  boxY += rowH;
  doc.text('Guru Pengampu', leftCol, boxY);
  doc.text(`: ${exam.guruNama || '-'}`, valCol, boxY);
  doc.text('No. Peserta / NISN', rightCol, boxY);
  doc.text(': .....................................................', valRight, boxY);

  curY += 26;

  // Petunjuk
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Petunjuk: Berdoalah sebelum mengerjakan. Baca tiap butir dengan seksama dan dahulukan soal yang lebih mudah.',
    14,
    curY
  );
  curY += 6;

  // Soal-soal
  exam.soalList.forEach((soal, idx) => {
    // Cek batas halaman
    if (curY > 260) {
      doc.addPage();
      curY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`${idx + 1}.`, 14, curY);

    // Stimulus wacana jika ada
    if (soal.deskripsiStimulus) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      const splitStimulus = doc.splitTextToSize(`[Wacana/Stimulus]: ${soal.deskripsiStimulus}`, pageWidth - 36);
      doc.text(splitStimulus, 20, curY);
      curY += splitStimulus.length * 4 + 2;
    }

    // Teks Pertanyaan
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    const splitQuestion = doc.splitTextToSize(soal.pertanyaan, pageWidth - 36);
    doc.text(splitQuestion, 20, curY);
    curY += splitQuestion.length * 4.2 + 2;

    // Opsi Pilihan Ganda
    if (soal.type === 'pilihan_ganda' || soal.type === 'pilihan_ganda_kompleks') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(51, 65, 85);
      (soal.pilihan || []).forEach((p) => {
        if (curY > 275) {
          doc.addPage();
          curY = 16;
        }
        const optText = `${p.label}. ${p.text}`;
        const splitOpt = doc.splitTextToSize(optText, pageWidth - 42);
        doc.text(splitOpt, 24, curY);
        curY += splitOpt.length * 3.8 + 1;
      });
    } else if (soal.type === 'menjodohkan') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      (soal.pasangan || []).forEach((p, pIdx) => {
        if (curY > 275) {
          doc.addPage();
          curY = 16;
        }
        doc.text(`[Kiri] ${pIdx + 1}. ${p.premis}   ----->   [Kanan] [ .... ] ${p.jawaban}`, 24, curY);
        curY += 4;
      });
    } else if (soal.type === 'tka_benar_salah') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      (soal.pernyataanTKA || []).forEach((item, itIdx) => {
        if (curY > 275) {
          doc.addPage();
          curY = 16;
        }
        const checkB = includeKeys && item.kunci === 'Benar' ? '[✓ Benar]' : '[  ] Benar';
        const checkS = includeKeys && item.kunci === 'Salah' ? '[✓ Salah]' : '[  ] Salah';
        doc.text(`${itIdx + 1}. ${item.pernyataan}   (${checkB} / ${checkS})`, 24, curY);
        curY += 4.2;
      });
    } else if (soal.type === 'isian_singkat') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text('Jawaban Singkat: __________________________________________________', 24, curY);
      curY += 4.5;
    }

    // Kunci jika dicetak untuk guru/admin
    if (includeKeys) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(16, 185, 129);
      let keyVal = '';
      if (Array.isArray(soal.kunciJawaban)) keyVal = soal.kunciJawaban.join(', ');
      else if (soal.kunciJawaban) keyVal = String(soal.kunciJawaban);
      else if (soal.type === 'menjodohkan') keyVal = (soal.pasangan || []).map((p) => `${p.premis} ➔ ${p.jawaban}`).join('; ');
      else if (soal.type === 'tka_benar_salah') keyVal = (soal.pernyataanTKA || []).map((p, i) => `P${i + 1}:${p.kunci}`).join('; ');

      doc.text(`Kunci Jawaban: ${keyVal} • Bobot: ${soal.bobot} Poin`, 24, curY);
      curY += 4;
    }

    curY += 3;
  });

  // Tanda Tangan
  if (curY > 240) {
    doc.addPage();
    curY = 20;
  }
  curY += 8;
  const signX = pageWidth - 65;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    signX,
    curY
  );
  curY += 4.5;
  doc.text('Guru Mata Pelajaran,', signX, curY);
  curY += 20;
  doc.setFont('helvetica', 'bold');
  doc.text(exam.guruNama || 'Guru Mata Pelajaran', signX, curY);
  curY += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text('NIP: ................................................', signX, curY);

  const fileName = `Naskah_Soal_${exam.mataPelajaran.replace(/\s+/g, '_')}_${exam.judul.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}

/**
 * Format string HTML materi pelajaran MAN 11 Jakarta
 */
export function generateMaterialHtml(material: LessonMaterial): string {
  return `
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="utf-8">
      <title>${material.judul} - Materi Pembelajaran MAN 11 Jakarta</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body {
          font-family: Arial, sans-serif;
          color: #1e293b;
          line-height: 1.6;
          padding: 20px;
          background: #fff;
        }
        .header-kop {
          text-align: center;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
          margin-bottom: 16px;
        }
        .header-kop h3 { margin: 0; font-size: 13pt; font-weight: bold; }
        .header-kop h2 { margin: 2px 0; font-size: 15pt; font-weight: bold; }
        .header-kop p { margin: 2px 0; font-size: 8.5pt; color: #475569; }
        .badge {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: bold;
          background: #ecfdf5;
          color: #065f46;
          border: 1px solid #a7f3d0;
          margin-bottom: 8px;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 16px 0;
          font-size: 12px;
        }
        .info-table td {
          padding: 6px 12px;
          border-bottom: 1px solid #e2e8f0;
        }
        .info-table td.label {
          font-weight: bold;
          width: 160px;
          color: #475569;
          background: #f8fafc;
        }
        .content-box {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          padding: 16px;
          margin-top: 16px;
        }
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="header-kop">
        <h3>KEMENTERIAN AGAMA REPUBLIK INDONESIA</h3>
        <h3>KANTOR KEMENTERIAN AGAMA KOTA JAKARTA SELATAN</h3>
        <h2>MADRASAH ALIYAH NEGERI (MAN) 11 JAKARTA</h2>
        <p>Jl. H. Rohimin No. 1, RT.04/RW.03, Ulujami, Pesanggrahan, Jakarta Selatan 12250</p>
        <p>Telepon: (021) 7350720 | Website: https://man11jakarta.sch.id | Email: info@man11jakarta.sch.id</p>
      </div>

      <div style="text-align: center; margin-bottom: 14px;">
        <span class="badge">LEMBAR PANDUAN & RINGKASAN MATERI PELAJARAN</span>
        <h2 style="margin: 6px 0; font-size: 16pt; color: #0f172a;">${material.judul}</h2>
        <p style="margin: 0; font-size: 11pt; color: #475569;">Mata Pelajaran: <strong>${material.mataPelajaran}</strong></p>
      </div>

      <table class="info-table">
        <tr>
          <td class="label">Judul Materi</td>
          <td><strong>${material.judul}</strong></td>
        </tr>
        <tr>
          <td class="label">Mata Pelajaran</td>
          <td>${material.mataPelajaran}</td>
        </tr>
        <tr>
          <td class="label">Kelas / Sasaran</td>
          <td>${material.kelasTarget.join(', ')}</td>
        </tr>
        <tr>
          <td class="label">Guru Pengampu</td>
          <td>${material.guruNama || 'Guru Mapel'}</td>
        </tr>
        <tr>
          <td class="label">Nama File Asli</td>
          <td>${material.fileName} (${material.fileSize || 'Dokumen PDF'})</td>
        </tr>
        <tr>
          <td class="label">Tanggal Publikasi</td>
          <td>${new Date(material.createdAt).toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}</td>
        </tr>
      </table>

      <div class="content-box">
        <h4 style="margin: 0 0 8px 0; font-size: 13px; color: #0f172a;">Deskripsi & Pokok Bahasan Materi:</h4>
        <p style="margin: 0; font-size: 12px; color: #334155; white-space: pre-line;">${
          material.deskripsi || 'Materi pembelajaran resmi untuk mendukung persiapan Asesmen Siswa MAN 11 Jakarta.'
        }</p>
      </div>

      <div style="margin-top: 24px; padding: 12px; border: 1px dashed #6366f1; border-radius: 8px; background: #eef2ff; font-size: 11px; color: #3730a3;">
        <strong>Catatan untuk Siswa:</strong>
        Pelajari materi ini dengan cermat. Anda dapat mengunduh dokumen lengkap (.PDF) melalui aplikasi LMS MAN 11 Jakarta untuk membaca secara luring atau mencetaknya sebagai pegangan belajar.
      </div>

      <div style="margin-top: 36px; display: flex; justify-content: flex-end;">
        <div style="text-align: center; width: 220px; font-size: 11pt;">
          <p style="margin: 0;">Jakarta, ${new Date().toLocaleDateString('id-ID', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          })}</p>
          <p style="margin: 2px 0 50px 0;">Guru Mata Pelajaran,</p>
          <p style="margin: 0; font-weight: bold; text-decoration: underline;">${material.guruNama || 'Guru Mata Pelajaran'}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Cetak lembar materi pelajaran langsung
 */
export function printMaterialDirectly(material: LessonMaterial) {
  const html = generateMaterialHtml(material);
  const printWindow = window.open('', '_blank', 'width=850,height=900');
  if (!printWindow) {
    alert('Popup diblokir oleh browser. Izinkan popup untuk mencetak materi.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

/**
 * Ekspor ringkasan materi pelajaran ke PDF
 */
export function exportMaterialPdf(material: LessonMaterial) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let curY = 16;

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, curY, { align: 'center' });
  curY += 5;
  doc.setFontSize(13);
  doc.text('MADRASAH ALIYAH NEGERI (MAN) 11 JAKARTA', pageWidth / 2, curY, { align: 'center' });
  curY += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(
    'Jl. H. Rohimin No. 1, RT.04/RW.03, Ulujami, Pesanggrahan, Jakarta Selatan 12250',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += 4;
  doc.text(
    'Telepon: (021) 7350720 | Website: https://man11jakarta.sch.id | Email: info@man11jakarta.sch.id',
    pageWidth / 2,
    curY,
    { align: 'center' }
  );
  curY += 3;

  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(14, curY, pageWidth - 14, curY);
  curY += 0.8;
  doc.setLineWidth(0.2);
  doc.line(14, curY, pageWidth - 14, curY);
  curY += 8;

  // Judul
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LEMBAR MODUL & MATERI PEMBELAJARAN', pageWidth / 2, curY, { align: 'center' });
  curY += 6;
  doc.setFontSize(13);
  doc.text(material.judul.toUpperCase(), pageWidth / 2, curY, { align: 'center' });
  curY += 8;

  // Tabel Metadata
  autoTable(doc, {
    startY: curY,
    theme: 'grid',
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 45, fillColor: [248, 250, 252] },
      1: { cellWidth: 135 },
    },
    body: [
      ['Judul Materi', material.judul],
      ['Mata Pelajaran', material.mataPelajaran],
      ['Kelas / Sasaran', material.kelasTarget.join(', ')],
      ['Guru Pengampu', material.guruNama || '-'],
      ['Nama File Dokumen', `${material.fileName} (${material.fileSize || 'PDF'})`],
      [
        'Tanggal Unggah',
        new Date(material.createdAt).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        }),
      ],
    ],
  });

  const lastTable = (doc as any).lastAutoTable;
  curY = (lastTable ? lastTable.finalY : curY) + 8;

  // Box Deskripsi
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Deskripsi / Ringkasan Pokok Bahasan:', 14, curY);
  curY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(51, 65, 85);
  const splitDesc = doc.splitTextToSize(
    material.deskripsi ||
      'Materi ini berisi penjelasan konsep, bahan ajar, dan panduan belajar untuk siswa MAN 11 Jakarta.',
    pageWidth - 28
  );
  doc.text(splitDesc, 14, curY);
  curY += splitDesc.length * 4.5 + 12;

  // Tanda Tangan
  const signX = pageWidth - 65;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    signX,
    curY
  );
  curY += 4.5;
  doc.text('Guru Mata Pelajaran,', signX, curY);
  curY += 20;
  doc.setFont('helvetica', 'bold');
  doc.text(material.guruNama || 'Guru Mata Pelajaran', signX, curY);

  const fileName = `Materi_${material.mataPelajaran.replace(/\s+/g, '_')}_${material.judul.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(fileName);
}
