import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Exam, ExamSubmission, CheatingViolation, StudentAnswer, QuestionItem, LessonMaterial } from '../types';
import { INITIAL_USERS, INITIAL_EXAMS, INITIAL_SUBMISSIONS, INITIAL_MATERIALS } from '../data/initialData';
import { calculateExamScore } from '../utils/examScoring';
import { validatePasswordChange } from '../utils/authUtils';

interface LMSContextType {
  currentUser: User | null;
  users: User[];
  exams: Exam[];
  submissions: ExamSubmission[];
  materials: LessonMaterial[];
  activeExam: Exam | null;
  activeSubmission: ExamSubmission | null;
  login: (username: string, password: string) => { success: boolean; message?: string };
  logout: () => void;
  switchUser: (user: User) => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (user: User) => void;
  deleteUser: (userId: string) => void;
  importUsers: (newUsers: Partial<User>[]) => number;
  changePassword: (
    userId: string,
    currentPasswordInput: string,
    newPassword: string,
    confirmPassword?: string
  ) => { success: boolean; message: string };
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

  const STORAGE_KEY_MATERIALS = 'educbt_materials_v1';
  const [materials, setMaterials] = useState<LessonMaterial[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATERIALS);
      return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
    } catch {
      return INITIAL_MATERIALS;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) return JSON.parse(saved);
      // Default auto-login to Admin darma313adi or null
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
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  const login = (username: string, password: string) => {
    const trimmedUser = username.trim().toLowerCase();
    const trimmedPass = password.trim();

    // Check special admin requirement #11: darma313adi / masdar313
    const foundUser = users.find(
      (u) =>
        (u.username.toLowerCase() === trimmedUser || u.email?.toLowerCase() === trimmedUser) &&
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
    setUsers((prev) => prev.filter((u) => u.id !== userId));
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
    setUsers(INITIAL_USERS);
    setExams(INITIAL_EXAMS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setMaterials(INITIAL_MATERIALS);
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
        activeExam,
        activeSubmission,
        login,
        logout,
        switchUser,
        addUser,
        updateUser,
        deleteUser,
        importUsers,
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
