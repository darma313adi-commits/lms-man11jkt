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
  kamadName?: string;
  kamadNip?: string;
}

export function exportGradesPdf({
  exam,
  submissions,
  allStudentsInClass,
  kelasName,
  guruName,
  guruNip,
  kamadName,
  kamadNip,
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
      : exam.jenisAsesmen === 'tugas'
      ? 'Tugas / Penugasan'
      : 'Sumatif Lingkup Materi';
  doc.text(`: ${jenisLabel}`, col2X, curY);
  doc.text('Tanggal Cetak', rightX, curY);
  doc.text(`: ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, col4X, curY);

  const scopedStudents =
    exam.targetSiswaIds && exam.targetSiswaIds.length > 0
      ? allStudentsInClass.filter((st) => exam.targetSiswaIds!.includes(st.id))
      : allStudentsInClass;

  const filteredClassStudents =
    kelasName === 'Semua Kelas'
      ? scopedStudents
      : scopedStudents.filter((st) => st.kelas?.trim().toLowerCase() === kelasName.trim().toLowerCase());

  // Calculate statistics
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
  const totalSiswaTerdaftar = filteredClassStudents.length > 0 ? filteredClassStudents.length : totalSiswaHadir;
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
  const totalCheatCases = classSubmissions.filter((s) => (s.violations?.length || 0) > 0).length;
  doc.text(`Terindikasi Curang: ${totalCheatCases} Siswa`, 145, statY2);

  // Table Data Siswa
  const tableRows: any[] = [];

  const rosterToRender = filteredClassStudents.length > 0 ? filteredClassStudents : [];
  if (rosterToRender.length > 0) {
    rosterToRender.forEach((st, idx) => {
      const sub = classSubmissions.find(
        (s) => s.siswaId === st.id || (st.nisn && s.siswaNisn === st.nisn)
      );
      const nilai = sub ? sub.nilai100 : null;
      const statusKetuntasan = nilai !== null ? (nilai >= exam.kkm ? 'TUNTAS' : 'REMEDIAL') : 'BELUM UJIAN';
      const vCount = sub?.violations?.length || 0;
      const cheatStatus = sub ? (vCount > 0 ? `${vCount}x Curang` : 'Bersih (0)') : '-';
      const jamLogin = sub?.waktuMulai
        ? new Date(sub.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';
      const jamKirim = sub?.waktuSelesai
        ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      tableRows.push([
        idx + 1,
        st.nisn || st.username,
        st.name,
        st.kelas || kelasName,
        nilai !== null ? nilai : '-',
        statusKetuntasan,
        cheatStatus,
        jamLogin,
        jamKirim,
      ]);
    });
  } else {
    classSubmissions.forEach((sub, idx) => {
      const statusKetuntasan = sub.nilai100 >= exam.kkm ? 'TUNTAS' : 'REMEDIAL';
      const vCount = sub.violations?.length || 0;
      const cheatStatus = vCount > 0 ? `${vCount}x Curang` : 'Bersih (0)';
      const jamLogin = sub.waktuMulai
        ? new Date(sub.waktuMulai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';
      const jamKirim = sub.waktuSelesai
        ? new Date(sub.waktuSelesai).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
        : '-';

      tableRows.push([
        idx + 1,
        sub.siswaNisn || sub.siswaId,
        sub.siswaNama,
        sub.siswaKelas || kelasName,
        sub.nilai100,
        statusKetuntasan,
        cheatStatus,
        jamLogin,
        jamKirim,
      ]);
    });
  }

  autoTable(doc, {
    startY: curY + 18,
    head: [['No', 'NISN / User', 'Nama Siswa', 'Kelas', 'Nilai', 'Status', 'Kecurangan', 'Login', 'Kirim']],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 1.8,
      textColor: [30, 41, 59],
    },
    headStyles: {
      fillColor: [30, 58, 138],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 24 },
      2: { halign: 'left' },
      3: { halign: 'center', cellWidth: 16 },
      4: { halign: 'center', fontStyle: 'bold', cellWidth: 13 },
      5: { halign: 'center', cellWidth: 22 },
      6: { halign: 'center', cellWidth: 22 },
      7: { halign: 'center', cellWidth: 14 },
      8: { halign: 'center', cellWidth: 14 },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        if (data.cell.raw === 'TUNTAS') {
          data.cell.styles.textColor = [22, 101, 52];
          data.cell.styles.fontStyle = 'bold';
        } else if (data.cell.raw === 'REMEDIAL') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else {
          data.cell.styles.textColor = [148, 163, 184];
        }
      }
      if (data.section === 'body' && data.column.index === 6) {
        const text = String(data.cell.raw || '');
        if (text.includes('Curang')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Bersih')) {
          data.cell.styles.textColor = [22, 101, 52];
        }
      }
    },
  });

  // Detailed Cheating Incident Report Section
  let afterTableY = (doc as any).lastAutoTable?.finalY || 180;
  const violatingSubs = classSubmissions.filter((s) => (s.violations?.length || 0) > 0);
  if (afterTableY > 245) {
    doc.addPage();
    afterTableY = 20;
  } else {
    afterTableY += 8;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(153, 27, 27);
  doc.text('LAPORAN CATATAN KECURANGAN & PELANGGARAN UJIAN SISWA', 14, afterTableY);

  if (violatingSubs.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(22, 101, 52);
    doc.text('Tidak ada catatan pelanggaran kecurangan terdeteksi pada pelaksanaan ujian ini. Seluruh peserta tertib.', 14, afterTableY + 5);
    afterTableY += 10;
  } else {
    const cheatRows: any[] = [];
    violatingSubs.forEach((sub) => {
      (sub.violations || []).forEach((v, vIdx) => {
        cheatRows.push([
          cheatRows.length + 1,
          sub.siswaNama,
          sub.siswaKelas,
          `Ke-${vIdx + 1}`,
          new Date(v.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          v.tipe.toUpperCase(),
          v.deskripsi,
        ]);
      });
    });

    autoTable(doc, {
      startY: afterTableY + 3,
      head: [['No', 'Nama Siswa', 'Kelas', 'Pelanggaran', 'Waktu', 'Jenis', 'Keterangan Sistem']],
      body: cheatRows,
      theme: 'grid',
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [30, 41, 59],
      },
      headStyles: {
        fillColor: [185, 28, 28],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { halign: 'left', cellWidth: 34 },
        2: { halign: 'center', cellWidth: 16 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 24 },
        6: { halign: 'left' },
      },
    });
    afterTableY = (doc as any).lastAutoTable?.finalY || afterTableY + 20;
  }

  // Signature Block
  const signY = afterTableY > 235 ? 250 : afterTableY + 12;
  if (afterTableY > 235) {
    doc.addPage();
  }

  const signPageY = afterTableY > 235 ? 30 : signY;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(30, 41, 59);

  doc.text('Mengetahui,', 25, signPageY);
  doc.text('Kepala MAN 11 Jakarta', 25, signPageY + 5);
  doc.text(kamadName || 'Drs. H. Ahmad Fauzi, M.Pd.I', 25, signPageY + 28);
  doc.text(`NIP. ${kamadNip || '196807121995031002'}`, 25, signPageY + 33);

  const rightSignX = pageWidth - 65;
  doc.text(`Jakarta, ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, rightSignX, signPageY);
  doc.text('Guru Mata Pelajaran,', rightSignX, signPageY + 5);
  doc.text(guruName, rightSignX, signPageY + 28);
  doc.text(`NIP. ${guruNip || '198205142008012015'}`, rightSignX, signPageY + 33);

  const sanitizedJudul = exam.judul.replace(/[^a-zA-Z0-9]/g, '_');
  const sanitizedKelas = kelasName.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Laporan_Nilai_${sanitizedKelas}_${sanitizedJudul}.pdf`);
}
