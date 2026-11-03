import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Exam, ExamSubmission, User } from '../types';

export interface GradeReportPdfParams {
  exam: Exam;
  submissions: ExamSubmission[];
  allStudentsInClass: User[];
  kelasName: string;
  guruName: string;
  guruNip?: string;
}

export function exportGradesPdf({
  exam,
  submissions,
  allStudentsInClass,
  kelasName,
  guruName,
  guruNip,
}: GradeReportPdfParams) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('KEMENTERIAN AGAMA REPUBLIK INDONESIA', pageWidth / 2, 14, { align: 'center' });
  doc.setFontSize(13);
  doc.text('MADRASAH ALIYAH NEGERI (MAN) 11 JAKARTA', pageWidth / 2, 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Jl. H. Rohimin No. 1, RT.04/RW.03, Ulujami, Pesanggrahan, Jakarta Selatan 12250', pageWidth / 2, 24, { align: 'center' });
  doc.text('Telepon: (021) 7350720 | Website: https://man11jakarta.sch.id | Email: info@man11jakarta.sch.id', pageWidth / 2, 28, { align: 'center' });

  // Divider line
  doc.setDrawColor(30, 41, 59);
  doc.setLineWidth(0.6);
  doc.line(14, 31, pageWidth - 14, 31);
  doc.setLineWidth(0.2);
  doc.line(14, 32, pageWidth - 14, 32);

  // Document Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text('LAPORAN HASIL ASESMEN & REKAPITULASI NILAI SISWA', pageWidth / 2, 38, { align: 'center' });

  // Metadata Table Info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);

  const leftX = 14;
  const col2X = 50;
  const rightX = 115;
  const col4X = 150;
  let curY = 45;

  doc.text('Mata Pelajaran', leftX, curY);
  doc.text(`: ${exam.mataPelajaran}`, col2X, curY);
  doc.text('Kelas / Rombel', rightX, curY);
  doc.text(`: ${kelasName}`, col4X, curY);

  curY += 5;
  doc.text('Nama Asesmen', leftX, curY);
  doc.text(`: ${exam.judul}`, col2X, curY);
  doc.text('KKM / Kriteria', rightX, curY);
  doc.text(`: ${exam.kkm} (Skala 100)`, col4X, curY);

  curY += 5;
  doc.text('Kode Ujian', leftX, curY);
  doc.text(`: ${exam.kodeUjian}`, col2X, curY);
  doc.text('Guru Pengampu', rightX, curY);
  doc.text(`: ${guruName}`, col4X, curY);

  curY += 5;
  doc.text('Jenis Asesmen', leftX, curY);
  const jenisLabel =
    exam.jenisAsesmen === 'sumatif_akhir_semester'
      ? 'Sumatif Akhir Semester'
      : exam.jenisAsesmen === 'formatif'
      ? 'Asesmen Formatif'
      : 'Sumatif Lingkup Materi';
  doc.text(`: ${jenisLabel}`, col2X, curY);
  doc.text('Tanggal Cetak', rightX, curY);
  doc.text(`: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, col4X, curY);

  // Calculate statistics
  // Match submissions for this class
  const classSubmissions = submissions.filter((s) => {
    if (s.examId !== exam.id) return false;
    if (kelasName === 'Semua Kelas') return true;
    const student = allStudentsInClass.find(
      (u) => u.id === s.siswaId || (u.nisn && u.nisn === s.siswaNisn)
    );
    return (
      student?.kelas?.toLowerCase() === kelasName.toLowerCase() ||
      s.siswaKelas?.toLowerCase() === kelasName.toLowerCase()
    );
  });

  const scores = classSubmissions.map((s) => s.nilai100);
  const totalSiswaHadir = classSubmissions.length;
  const totalSiswaTerdaftar = allStudentsInClass.length > 0 ? allStudentsInClass.length : totalSiswaHadir;
  const tingkatKehadiran = totalSiswaTerdaftar > 0 ? Math.round((totalSiswaHadir / totalSiswaTerdaftar) * 100) : 0;

  const rataRata = scores.length > 0 ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '0';
  const nilaiTertinggi = scores.length > 0 ? Math.max(...scores) : 0;
  const nilaiTerendah = scores.length > 0 ? Math.min(...scores) : 0;
  const tuntasCount = scores.filter((s) => s >= exam.kkm).length;
  const belumTuntasCount = scores.filter((s) => s < exam.kkm).length;
  const persenTuntas = scores.length > 0 ? Math.round((tuntasCount / scores.length) * 100) : 0;

  // Box Statistik Ringkas
  curY += 7;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, curY, pageWidth - 28, 14, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const statY1 = curY + 5;
  const statY2 = curY + 10;
  doc.text(`Total Peserta: ${totalSiswaHadir} / ${totalSiswaTerdaftar} Siswa (${tingkatKehadiran}% Hadir)`, 18, statY1);
  doc.text(`Rata-Rata Kelas: ${rataRata}`, 100, statY1);
  doc.text(`Nilai Tertinggi: ${nilaiTertinggi} | Terendah: ${nilaiTerendah}`, 145, statY1);

  doc.text(`Tuntas (>= ${exam.kkm}): ${tuntasCount} Siswa (${persenTuntas}%)`, 18, statY2);
  doc.text(`Belum Tuntas (< ${exam.kkm}): ${belumTuntasCount} Siswa`, 100, statY2);
  doc.text(`Status Ketuntasan: ${persenTuntas >= 75 ? 'TERCAPAI' : 'PERLU REMEDIAL'}`, 145, statY2);

  // Table Data Siswa
  const tableRows: any[] = [];
  
  // If we have class student roster, list all students (including absent ones)
  if (allStudentsInClass.length > 0) {
    allStudentsInClass.forEach((st, idx) => {
      const sub = classSubmissions.find(
        (s) => s.siswaId === st.id || (st.nisn && s.siswaNisn === st.nisn)
      );
      const nilai = sub ? sub.nilai100 : null;
      const statusKetuntasan = nilai !== null ? (nilai >= exam.kkm ? 'TUNTAS' : 'REMEDIAL') : 'BELUM UJIAN';
      const waktuSelesai = sub?.waktuSelesai
        ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      tableRows.push([
        idx + 1,
        st.nisn || st.username,
        st.name,
        st.kelas || kelasName,
        nilai !== null ? nilai : '-',
        statusKetuntasan,
        waktuSelesai,
      ]);
    });
  } else {
    // If no roster provided, list from submissions
    classSubmissions.forEach((sub, idx) => {
      const statusKetuntasan = sub.nilai100 >= exam.kkm ? 'TUNTAS' : 'REMEDIAL';
      const waktuSelesai = sub.waktuSelesai
        ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      tableRows.push([
        idx + 1,
        sub.siswaNisn || sub.siswaId,
        sub.siswaNama,
        sub.siswaKelas || kelasName,
        sub.nilai100,
        statusKetuntasan,
        waktuSelesai,
      ]);
    });
  }

  autoTable(doc, {
    startY: curY + 18,
    head: [['No', 'NISN / Username', 'Nama Siswa', 'Kelas', 'Nilai', 'Status', 'Jam Selesai']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 2,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 58, 138], // Navy blue
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'left' },
      3: { halign: 'center', cellWidth: 20 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 25 },
      6: { halign: 'center', cellWidth: 22 },
    },
    didParseCell: (data) => {
      // Highlight Remedial vs Tuntas
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'TUNTAS') {
          data.cell.styles.textColor = [22, 101, 52]; // Dark green
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'REMEDIAL') {
          data.cell.styles.textColor = [185, 28, 28]; // Dark red
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [148, 163, 184];
        }
      }
    },
  });

  // Signature Block
  const finalY = (doc as any).lastAutoTable?.finalY || 180;
  const signY = finalY > 230 ? 250 : finalY + 12;

  // Add new page if not enough space for signature
  if (finalY > 240) {
    doc.addPage();
  }

  const signPageY = finalY > 240 ? 30 : signY;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  // Left: Kepala Madrasah
  doc.text('Mengetahui,', 25, signPageY);
  doc.text('Kepala MAN 11 Jakarta', 25, signPageY + 5);
  doc.text('H. Darma Adi Saputra, M.Pd', 25, signPageY + 28);
  doc.text('NIP. 197803152003121002', 25, signPageY + 33);

  // Right: Guru Mata Pelajaran
  const rightSignX = pageWidth - 65;
  doc.text(`Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, rightSignX, signPageY);
  doc.text('Guru Mata Pelajaran,', rightSignX, signPageY + 5);
  doc.text(guruName, rightSignX, signPageY + 28);
  doc.text(`NIP. ${guruNip || '198205142008012015'}`, rightSignX, signPageY + 33);

  // Save PDF
  const sanitizedJudul = exam.judul.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedKelas = kelasName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Nilai_${sanitizedKelas}_${sanitizedJudul}.pdf`);
}
