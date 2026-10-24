import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Exam,
  ExamSubmission,
  CheatingViolation,
  StudentAnswer,
  QuestionItem,
  LessonMaterial,
  RombelKelas,
  MataPelajaran,
  KelasMapelPengampu,
} from '../types';
import {
  INITIAL_USERS,
  INITIAL_EXAMS,
  INITIAL_SUBMISSIONS,
  INITIAL_MATERIALS,
  INITIAL_ROMBEL,
  INITIAL_MAPEL,
  INITIAL_KELAS_MAPEL,
} from '../data/initialData';
import { calculateExamScore } from '../utils/examScoring';
import { validatePasswordChange } from '../utils/authUtils';

interface LMSContextType {
  currentUser: User | null;
  users: User[];
  exams: Exam[];
  submissions: ExamSubmission[];
  materials: LessonMaterial[];
  rombelList: RombelKelas[];
  mataPelajaranList: MataPelajaran[];
  kelasMapelPengampuList: KelasMapelPengampu[];
  activeExam: Exam | null;
  activeSubmission: ExamSubmission | null;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (user: User) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  deleteUsers: (userIds: string[]) => void;
  toggleUserStatus: (userId: string) => void;
  resetUserPassword: (userId: string, newPassword?: string) => string;
  importUsers: (newUsers: Partial<User>[]) => number;
  changePassword: (
    userId: string,
    currentPasswordInput: string,
    newPassword: string,
    confirmPassword?: string
  ) => { success: boolean; message: string };
  // Rombel Management
  addRombel: (rombelData: Omit<RombelKelas, 'id' | 'createdAt'>) => RombelKelas;
  updateRombel: (rombel: RombelKelas) => void;
  deleteRombel: (rombelId: string) => void;
  // Mata Pelajaran Management
  addMataPelajaran: (mapelData: Omit<MataPelajaran, 'id' | 'createdAt'>) => MataPelajaran;
  updateMataPelajaran: (mapel: MataPelajaran) => void;
  deleteMataPelajaran: (mapelId: string) => void;
  // Plotting Mapel & Guru per Kelas
  setKelasMataPelajaran: (kelasNama: string, mapelIds: string[]) => void;
  assignGuruPengampu: (kelasNama: string, mapelId: string, guruId: string, guruNama: string) => void;
  removeMapelFromKelas: (kelasNama: string, mapelId: string) => void;
  // Exam & Materials
  createExam: (examData: Omit<Exam, 'id' | 'createdAt'>) => Exam;
  updateExam: (exam: Exam) => void;
  deleteExam: (examId: string) => void;
  addQuestionsToExam: (examId: string, questions: QuestionItem[]) => void;
  addMaterial: (materialData: Omit<LessonMaterial, 'id' | 'createdAt'>) => LessonMaterial;
  deleteMaterial: (materialId: string) => void;
  startExamSession: (exam: Exam, siswa: User) => ExamSubmission;
  updateStudentAnswer: (questionId: string, answer: any, raguRagu?: boolean) => void;
  recordCheatingViolation: (tipe: CheatingViolation['tipe'], deskripsi: string) => void;
  finishAndSubmitExam: () => ExamSubmission | null;
  exitExamPlayer: () => void;
  updateSubmissionReview: (submissionId: string, totalSkor: number, nilai100: number, catatanGuru?: string) => void;
  resetAllDataToDefault: () => void;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'educbt_users_v1';
const STORAGE_KEY_EXAMS = 'educbt_exams_v1';
const STORAGE_KEY_SUBMISSIONS = 'educbt_submissions_v1';
const STORAGE_KEY_CURRENT_USER = 'educbt_current_user_v1';
const STORAGE_KEY_MATERIALS = 'educbt_materials_v1';
const STORAGE_KEY_ROMBEL = 'educbt_rombel_v1';
const STORAGE_KEY_MAPEL = 'educbt_mapel_v1';
const STORAGE_KEY_KELAS_MAPEL = 'educbt_kelas_mapel_v1';

export const LMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      return saved ? JSON.parse(saved) : INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXAMS);
      return saved ? JSON.parse(saved) : INITIAL_EXAMS;
    } catch {
      return INITIAL_EXAMS;
    }
  });

  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      return saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
    } catch {
      return INITIAL_SUBMISSIONS;
    }
  });

  const [materials, setMaterials] = useState<LessonMaterial[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATERIALS);
      return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
    } catch {
      return INITIAL_MATERIALS;
    }
  });

  const [rombelList, setRombelList] = useState<RombelKelas[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROMBEL);
      return saved ? JSON.parse(saved) : INITIAL_ROMBEL;
    } catch {
      return INITIAL_ROMBEL;
    }
  });

  const [mataPelajaranList, setMataPelajaranList] = useState<MataPelajaran[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MAPEL);
      return saved ? JSON.parse(saved) : INITIAL_MAPEL;
    } catch {
      return INITIAL_MAPEL;
    }
  });

  const [kelasMapelPengampuList, setKelasMapelPengampuList] = useState<KelasMapelPengampu[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_KELAS_MAPEL);
      return saved ? JSON.parse(saved) : INITIAL_KELAS_MAPEL;
    } catch {
      return INITIAL_KELAS_MAPEL;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
      return null;
    } catch {
      return null;
    }
  });

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<ExamSubmission | null>(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EXAMS, JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ROMBEL, JSON.stringify(rombelList));
  }, [rombelList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MAPEL, JSON.stringify(mataPelajaranList));
  }, [mataPelajaranList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_KELAS_MAPEL, JSON.stringify(kelasMapelPengampuList));
  }, [kelasMapelPengampuList]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SUBMISSIONS, JSON.stringify(submissions));
  }, [submissions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_MATERIALS, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  const login = (username: string, password: string) => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // Check special admin requirement #11: darma313adi / masdar313 & any registered user (by username, email, nip, nisn)
    const foundUser = users.find(
      (u) =>
        (u.username.toLowerCase() === trimmedUser ||
          u.email?.toLowerCase() === trimmedUser ||
          u.nip?.toLowerCase() === trimmedUser ||
          u.nisn?.toLowerCase() === trimmedUser) &&
        u.password === trimmedPass
    );

    if (foundUser) {
      if (foundUser.status === 'nonaktif') {
        return { success: false, message: 'Akun Anda dinonaktifkan oleh administrator.' };
      }
      setCurrentUser(foundUser);
      return { success: true };
    }

    return { success: false, message: 'Username atau password salah! Silakan periksa kembali.' };
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveExam(null);
    setActiveSubmission(null);
  };

  const switchUser = (user: User) => {
    setCurrentUser(user);
    setActiveExam(null);
    setActiveSubmission(null);
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setUsers((prev) => [newUser, ...prev]);
  };

  const updateUser = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
    }
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.username === 'darma313adi') return; // Lindungi akun admin utama

    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Jika guru dihapus, bersihkan penugasan wali kelas dan plotting
    if (target?.role === 'guru') {
      setRombelList((prev) =>
        prev.map((r) =>
          r.waliKelasId === userId ? { ...r, waliKelasId: undefined, waliKelasNama: undefined } : r
        )
      );
      setKelasMapelPengampuList((prev) =>
        prev.map((kmp) =>
          kmp.guruId === userId ? { ...kmp, guruId: undefined, guruNama: undefined } : kmp
        )
      );
    }
  };

  const deleteUsers = (userIds: string[]) => {
    const validIds = userIds.filter((id) => {
      const u = users.find((user) => user.id === id);
      return u?.username !== 'darma313adi';
    });
    if (validIds.length === 0) return;

    setUsers((prev) => prev.filter((u) => !validIds.includes(u.id)));

    // Bersihkan wali kelas dan plotting jika ada guru yang dihapus
    setRombelList((prev) =>
      prev.map((r) =>
        r.waliKelasId && validIds.includes(r.waliKelasId)
          ? { ...r, waliKelasId: undefined, waliKelasNama: undefined }
          : r
      )
    );
    setKelasMapelPengampuList((prev) =>
      prev.map((kmp) =>
        kmp.guruId && validIds.includes(kmp.guruId)
          ? { ...kmp, guruId: undefined, guruNama: undefined }
          : kmp
      )
    );
  };

  const toggleUserStatus = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.username === 'darma313adi') return;
    const nextStatus: 'aktif' | 'nonaktif' = target.status === 'aktif' ? 'nonaktif' : 'aktif';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status: nextStatus } : u))
    );
  };

  const resetUserPassword = (userId: string, newPassword?: string): string => {
    const pass = newPassword || '123456';
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, password: pass } : u))
    );
    return pass;
  };

  const changePassword = (
    userId: string,
    currentPasswordInput: string,
    newPassword: string,
    confirmPassword?: string
  ): { success: boolean; message: string } => {
    const userToUpdate = users.find((u) => u.id === userId);
    if (!userToUpdate) {
      return { success: false, message: 'Pengguna tidak ditemukan.' };
    }

    const validation = validatePasswordChange(
      currentPasswordInput,
      userToUpdate.password,
      newPassword,
      confirmPassword
    );

    if (!validation.valid) {
      return { success: false, message: validation.message || validation.error || 'Kata sandi tidak valid.' };
    }

    const updatedUser: User = {
      ...userToUpdate,
      password: newPassword.trim(),
    };

    setUsers((prev) => prev.map((u) => (u.id === userId ? updatedUser : u)));
    if (currentUser?.id === userId) {
      setCurrentUser(updatedUser);
    }

    return { success: true, message: 'Kata sandi berhasil diperbarui!' };
  };

  // --- Rombongan Kelas (Rombel) Management ---
  const addRombel = (rombelData: Omit<RombelKelas, 'id' | 'createdAt'>): RombelKelas => {
    const newRombel: RombelKelas = {
      ...rombelData,
      id: `rombel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setRombelList((prev) => [...prev, newRombel]);
    return newRombel;
  };

  const updateRombel = (updated: RombelKelas) => {
    const oldRombel = rombelList.find((r) => r.id === updated.id);
    setRombelList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));

    // Jika nama kelas berubah, sinkronkan nama kelas di tabel plotting kelasMapelPengampu
    if (oldRombel && oldRombel.nama !== updated.nama) {
      setKelasMapelPengampuList((prev) =>
        prev.map((kmp) => (kmp.kelasNama === oldRombel.nama ? { ...kmp, kelasNama: updated.nama } : kmp))
      );
      // Sinkronkan juga pada user siswa
      setUsers((prev) =>
        prev.map((u) => (u.kelas === oldRombel.nama ? { ...u, kelas: updated.nama } : u))
      );
      // Sinkronkan pada target ujian
      setExams((prev) =>
        prev.map((e) => ({
          ...e,
          kelasTarget: (e.kelasTarget || []).map((k) => (k === oldRombel.nama ? updated.nama : k)),
        }))
      );
      // Sinkronkan pada kelas ajar guru
      setUsers((prev) =>
        prev.map((u) =>
          u.role === 'guru' && u.kelasAjar
            ? { ...u, kelasAjar: u.kelasAjar.map((k) => (k === oldRombel.nama ? updated.nama : k)) }
            : u
        )
      );
    }
  };

  const deleteRombel = (rombelId: string) => {
    const target = rombelList.find((r) => r.id === rombelId);
    setRombelList((prev) => prev.filter((r) => r.id !== rombelId));
    if (target) {
      // Hapus alokasi mapel kelas ini
      setKelasMapelPengampuList((prev) => prev.filter((kmp) => kmp.kelasNama !== target.nama));
      // Lepas kelas dari siswa agar tidak dangling
      setUsers((prev) =>
        prev.map((u) => (u.kelas === target.nama ? { ...u, kelas: undefined } : u))
      );
      // Hapus kelas dari target ujian
      setExams((prev) =>
        prev.map((e) => ({
          ...e,
          kelasTarget: (e.kelasTarget || []).filter((k) => k !== target.nama),
        }))
      );
      // Hapus dari kelas ajar guru
      setUsers((prev) =>
        prev.map((u) =>
          u.role === 'guru' && u.kelasAjar
            ? { ...u, kelasAjar: u.kelasAjar.filter((k) => k !== target.nama) }
            : u
        )
      );
    }
  };

  // --- Mata Pelajaran Management ---
  const addMataPelajaran = (mapelData: Omit<MataPelajaran, 'id' | 'createdAt'>): MataPelajaran => {
    const newMapel: MataPelajaran = {
      ...mapelData,
      id: `mapel_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setMataPelajaranList((prev) => [...prev, newMapel]);
    return newMapel;
  };

  const updateMataPelajaran = (updated: MataPelajaran) => {
    const oldMapel = mataPelajaranList.find((m) => m.id === updated.id);
    setMataPelajaranList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    // Sinkronkan nama dan kode di tabel plotting
    setKelasMapelPengampuList((prev) =>
      prev.map((kmp) =>
        kmp.mapelId === updated.id
          ? { ...kmp, mapelNama: updated.nama, mapelKode: updated.kode }
          : kmp
      )
    );
    // Sinkronkan nama mapel pada ujian jika berubah
    if (oldMapel && oldMapel.nama !== updated.nama) {
      setExams((prev) =>
        prev.map((e) => (e.mataPelajaran === oldMapel.nama ? { ...e, mataPelajaran: updated.nama } : e))
      );
    }
  };

  const deleteMataPelajaran = (mapelId: string) => {
    setMataPelajaranList((prev) => prev.filter((m) => m.id !== mapelId));
    setKelasMapelPengampuList((prev) => prev.filter((kmp) => kmp.mapelId !== mapelId));
  };

  // --- Plotting Mapel & Guru Pengampu per Kelas ---
  const setKelasMataPelajaran = (kelasNama: string, mapelIds: string[]) => {
    setKelasMapelPengampuList((prev) => {
      // Pertahankan alokasi yang sudah ada di kelas ini bila ID mapelnya tetap dipilih
      const existingForClass = prev.filter(
        (kmp) => kmp.kelasNama === kelasNama && mapelIds.includes(kmp.mapelId)
      );
      const otherClasses = prev.filter((kmp) => kmp.kelasNama !== kelasNama);

      // Tambahkan mapel yang baru dialokasikan ke kelas
      const newlyAdded: KelasMapelPengampu[] = [];
      mapelIds.forEach((mId) => {
        const alreadyAllocated = existingForClass.find((kmp) => kmp.mapelId === mId);
        if (!alreadyAllocated) {
          const mapelObj = mataPelajaranList.find((m) => m.id === mId);
          if (mapelObj) {
            newlyAdded.push({
              id: `kmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              kelasNama,
              mapelId: mapelObj.id,
              mapelNama: mapelObj.nama,
              mapelKode: mapelObj.kode,
            });
          }
        }
      });

      return [...otherClasses, ...existingForClass, ...newlyAdded];
    });
  };

  const assignGuruPengampu = (
    kelasNama: string,
    mapelId: string,
    guruId: string,
    guruNama: string
  ) => {
    setKelasMapelPengampuList((prev) =>
      prev.map((kmp) => {
        if (kmp.kelasNama === kelasNama && kmp.mapelId === mapelId) {
          return {
            ...kmp,
            guruId: guruId || undefined,
            guruNama: guruNama || undefined,
          };
        }
        return kmp;
      })
    );

    // Otomatis sinkronkan profil guru terpilih (tambahkan kelasAjar dan update mataPelajaran)
    if (guruId) {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.id === guruId) {
            const currentKelasAjar = u.kelasAjar || [];
            const updatedKelasAjar = currentKelasAjar.includes(kelasNama)
              ? currentKelasAjar
              : [...currentKelasAjar, kelasNama];

            const mapelObj = mataPelajaranList.find((m) => m.id === mapelId);
            const currentMapel = u.mataPelajaran || '';
            let updatedMapel = currentMapel;
            if (mapelObj && !currentMapel.toLowerCase().includes(mapelObj.nama.toLowerCase())) {
              updatedMapel = currentMapel ? `${currentMapel}, ${mapelObj.nama}` : mapelObj.nama;
            }

            return {
              ...u,
              kelasAjar: updatedKelasAjar,
              mataPelajaran: updatedMapel,
            };
          }
          return u;
        })
      );
    }
  };

  const removeMapelFromKelas = (kelasNama: string, mapelId: string) => {
    setKelasMapelPengampuList((prev) =>
      prev.filter((kmp) => !(kmp.kelasNama === kelasNama && kmp.mapelId === mapelId))
    );
  };

  const importUsers = (newUsers: Partial<User>[]): number => {
    let count = 0;
    const addedList: User[] = [];

    newUsers.forEach((nu) => {
      if (!nu.username || !nu.name) return;
      // Jangan duplikasi username yang sudah ada
      const exists = users.some((u) => u.username.toLowerCase() === nu.username?.toLowerCase());
      if (!exists) {
        addedList.push({
          id: `usr_${Date.now()}_${count}_${Math.floor(Math.random() * 1000)}`,
          username: nu.username,
          password: nu.password || '123456',
          name: nu.name,
          email: nu.email || `${nu.username}@sekolah.sch.id`,
          role: nu.role || 'siswa',
          kelas: nu.kelas,
          nip: nu.nip,
          nisn: nu.nisn,
          status: 'aktif',
          createdAt: new Date().toISOString(),
        });
        count++;
      }
    });

    if (addedList.length > 0) {
      setUsers((prev) => [...addedList, ...prev]);
    }
    return count;
  };

  const createExam = (examData: Omit<Exam, 'id' | 'createdAt'>): Exam => {
    const newExam: Exam = {
      ...examData,
      id: `exam_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setExams((prev) => [newExam, ...prev]);
    return newExam;
  };

  const updateExam = (updated: Exam) => {
    setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (activeExam?.id === updated.id) {
      setActiveExam(updated);
    }
  };

  const deleteExam = (examId: string) => {
    setExams((prev) => prev.filter((e) => e.id !== examId));
  };

  const addQuestionsToExam = (examId: string, questions: QuestionItem[]) => {
    setExams((prev) =>
      prev.map((e) => {
        if (e.id === examId) {
          const currentCount = e.soalList.length;
          const renumbered = questions.map((q, idx) => ({
            ...q,
            nomor: currentCount + idx + 1,
          }));
          return {
            ...e,
            soalList: [...e.soalList, ...renumbered],
          };
        }
        return e;
      })
    );
  };

  const addMaterial = (materialData: Omit<LessonMaterial, 'id' | 'createdAt'>): LessonMaterial => {
    const newMaterial: LessonMaterial = {
      ...materialData,
      id: `mat_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setMaterials((prev) => [newMaterial, ...prev]);
    return newMaterial;
  };

  const deleteMaterial = (materialId: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
  };

  const startExamSession = (exam: Exam, siswa: User): ExamSubmission => {
    // Periksa apakah sudah ada pengerjaan sebelumnya yang belum selesai
    const existing = submissions.find(
      (s) => s.examId === exam.id && s.siswaId === siswa.id && s.status === 'sedang_mengerjakan'
    );

    if (existing) {
      setActiveExam(exam);
      setActiveSubmission(existing);
      return existing;
    }

    const initialJawabanMap: Record<string, StudentAnswer> = {};
    exam.soalList.forEach((q) => {
      initialJawabanMap[q.id] = {
        questionId: q.id,
        jawaban: undefined,
        raguRagu: false,
      };
    });

    let maxSkor = 0;
    exam.soalList.forEach((q) => (maxSkor += q.bobot || 10));

    const newSub: ExamSubmission = {
      id: `sub_${Date.now()}_${siswa.id}`,
      examId: exam.id,
      examJudul: exam.judul,
      mataPelajaran: exam.mataPelajaran,
      siswaId: siswa.id,
      siswaNama: siswa.name,
      siswaKelas: siswa.kelas || 'X MIPA 1',
      siswaNisn: siswa.nisn || siswa.username,
      waktuMulai: new Date().toISOString(),
      sisaWaktuDetik: exam.durasiMenit * 60,
      jawabanMap: initialJawabanMap,
      totalSkor: 0,
      maxSkor,
      nilai100: 0,
      status: 'sedang_mengerjakan',
      violations: [],
    };

    setActiveExam(exam);
    setActiveSubmission(newSub);
    setSubmissions((prev) => [newSub, ...prev.filter((s) => !(s.examId === exam.id && s.siswaId === siswa.id))]);
    return newSub;
  };

  const updateStudentAnswer = (questionId: string, answer: any, raguRagu?: boolean) => {
    if (!activeSubmission) return;

    setActiveSubmission((prev) => {
      if (!prev) return null;
      const current = prev.jawabanMap[questionId] || {
        questionId,
        jawaban: undefined,
        raguRagu: false,
      };

      const updatedMap = {
        ...prev.jawabanMap,
        [questionId]: {
          ...current,
          jawaban: answer,
          raguRagu: raguRagu !== undefined ? raguRagu : current.raguRagu,
        },
      };

      const updatedSubmission: ExamSubmission = {
        ...prev,
        jawabanMap: updatedMap,
      };

      // update in global submissions array
      setSubmissions((subs) => subs.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s)));

      return updatedSubmission;
    });
  };

  const recordCheatingViolation = (tipe: CheatingViolation['tipe'], deskripsi: string) => {
    if (!activeSubmission) return;

    const violation: CheatingViolation = {
      id: `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      tipe,
      deskripsi,
    };

    setActiveSubmission((prev) => {
      if (!prev) return null;
      const updatedViolations = [...prev.violations, violation];
      const updatedSubmission: ExamSubmission = {
        ...prev,
        violations: updatedViolations,
      };

      setSubmissions((subs) => subs.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s)));
      return updatedSubmission;
    });
  };

  const finishAndSubmitExam = (): ExamSubmission | null => {
    if (!activeSubmission || !activeExam) return null;

    const { totalSkor, maxSkor, nilai100, evaluatedMap } = calculateExamScore(
      activeExam.soalList,
      activeSubmission.jawabanMap
    );

    const completed: ExamSubmission = {
      ...activeSubmission,
      jawabanMap: evaluatedMap,
      totalSkor,
      maxSkor,
      nilai100,
      waktuSelesai: new Date().toISOString(),
      status: 'sudah_dikumpulkan',
    };

    setActiveSubmission(completed);
    setSubmissions((subs) => subs.map((s) => (s.id === completed.id ? completed : s)));
    return completed;
  };

  const exitExamPlayer = () => {
    setActiveExam(null);
    setActiveSubmission(null);
  };

  const updateSubmissionReview = (
    submissionId: string,
    totalSkor: number,
    nilai100: number,
    catatanGuru?: string
  ) => {
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s.id === submissionId) {
          return {
            ...s,
            totalSkor,
            nilai100,
            catatanGuru: catatanGuru !== undefined ? catatanGuru : s.catatanGuru,
          };
        }
        return s;
      })
    );
  };

  const resetAllDataToDefault = () => {
    localStorage.removeItem(STORAGE_KEY_USERS);
    localStorage.removeItem(STORAGE_KEY_EXAMS);
    localStorage.removeItem(STORAGE_KEY_SUBMISSIONS);
    localStorage.removeItem(STORAGE_KEY_MATERIALS);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    localStorage.removeItem(STORAGE_KEY_ROMBEL);
    localStorage.removeItem(STORAGE_KEY_MAPEL);
    localStorage.removeItem(STORAGE_KEY_KELAS_MAPEL);
    setUsers(INITIAL_USERS);
    setExams(INITIAL_EXAMS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setMaterials(INITIAL_MATERIALS);
    setRombelList(INITIAL_ROMBEL);
    setMataPelajaranList(INITIAL_MAPEL);
    setKelasMapelPengampuList(INITIAL_KELAS_MAPEL);
    setCurrentUser(null);
    setActiveExam(null);
    setActiveSubmission(null);
  };

  return (
    <LMSContext.Provider
      value={{
        currentUser,
        users,
        exams,
        submissions,
        materials,
        rombelList,
        mataPelajaranList,
        kelasMapelPengampuList,
        activeExam,
        activeSubmission,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        deleteUsers,
        toggleUserStatus,
        resetUserPassword,
        importUsers,
        changePassword,
        addRombel,
        updateRombel,
        deleteRombel,
        addMataPelajaran,
        updateMataPelajaran,
        deleteMataPelajaran,
        setKelasMataPelajaran,
        assignGuruPengampu,
        removeMapelFromKelas,
        createExam,
        updateExam,
        deleteExam,
        addQuestionsToExam,
        addMaterial,
        deleteMaterial,
        startExamSession,
        updateStudentAnswer,
        recordCheatingViolation,
        finishAndSubmitExam,
        exitExamPlayer,
        updateSubmissionReview,
        resetAllDataToDefault,
      }}
    >
      {children}
    </LMSContext.Provider>
  );
};

export const useLMS = () => {
  const context = useContext(LMSContext);
  if (!context) {
    throw new Error('useLMS must be used within an LMSProvider');
  }
  return context;
};
