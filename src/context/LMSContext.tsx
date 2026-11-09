import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
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
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

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
  isCloudSynced: boolean;
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
  resetExamSubmission: (submissionId: string) => void;
  resetExamParticipant: (examId: string, studentId: string) => void;
  resetExamParticipantsByClass: (examId: string, className: string) => void;
  resetAllDataToDefault: () => void;
}

const LMSContext = createContext<LMSContextType | undefined>(undefined);

const STORAGE_KEY_CURRENT_USER = 'educbt_current_user_v1';
const STORAGE_KEY_USERS = 'educbt_users_v1';
const STORAGE_KEY_EXAMS = 'educbt_exams_v1';
const STORAGE_KEY_SUBMISSIONS = 'educbt_submissions_v1';
const STORAGE_KEY_MATERIALS = 'educbt_materials_v1';
const STORAGE_KEY_ROMBEL = 'educbt_rombel_v1';
const STORAGE_KEY_MAPEL = 'educbt_mapel_v1';
const STORAGE_KEY_KELAS_MAPEL = 'educbt_kelas_mapel_v1';

/**
 * Deleted classes per user instruction (X 1, X 2, XI 1, XI 2, XI 3, XI 4, XII 1, XII 2)
 */
export const DELETED_CLASSES = ['X 1', 'X 2', 'XI 1', 'XI 2', 'XI 3', 'XI 4', 'XII 1', 'XII 2'];

/**
 * Deleted teachers per user instruction (Dra. Siti Aminah, M.Pd & Bambang Prakoso, S.Pd)
 */
export const DELETED_TEACHER_USERNAMES = ['guru_siti', 'guru_bambang'];
export const DELETED_TEACHER_IDS = ['user_guru_siti', 'user_guru_bambang'];

export function isDeletedTeacher(u?: Partial<User> | null): boolean {
  if (!u) return false;
  const uname = (u.username || '').toLowerCase();
  const uid = (u.id || '').toLowerCase();
  const name = (u.name || '').toLowerCase();
  return (
    DELETED_TEACHER_USERNAMES.includes(uname) ||
    DELETED_TEACHER_IDS.includes(uid) ||
    name.includes('siti aminah') ||
    name.includes('bambang prakoso')
  );
}

/**
 * Helper to remove legacy MIPA, MIA, IPS from class names into clean Kurikulum Merdeka numbering
 */
export function sanitizeClassName(rawName?: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/XI\s+IPS\s+1/gi, 'XII 3')
    .replace(/XI\s+IPS\s+2/gi, 'XII 3')
    .replace(/XII\s+IPS\s+1/gi, 'XII 4')
    .replace(/XII\s+IPS\s+2/gi, 'XII 4')
    .replace(/\b(MIPA|MIA|IPA|IPS)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean data for Firestore to avoid "Unsupported field value: undefined" errors
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map((item) => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const res: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        res[key] = cleanForFirestore(value);
      }
    }
    return res;
  }
  return data;
}

export const LMSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_USERS);
      const parsed: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
      return parsed
        .filter((u) => !isDeletedTeacher(u))
        .map((u) => {
          let cleanK = u.kelas ? sanitizeClassName(u.kelas) : undefined;
          if (cleanK && DELETED_CLASSES.includes(cleanK)) {
            cleanK = 'XII 3';
          }
          let cleanKA = u.kelasAjar
            ?.map(sanitizeClassName)
            .filter((k) => !DELETED_CLASSES.includes(k));
          return {
            ...u,
            kelas: cleanK,
            kelasAjar: cleanKA,
          };
        });
    } catch {
      return INITIAL_USERS;
    }
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_EXAMS);
      const parsed: Exam[] = saved ? JSON.parse(saved) : INITIAL_EXAMS;
      return parsed.map((e) => {
        let cleanKT = (e.kelasTarget || [])
          .map(sanitizeClassName)
          .filter((k) => !DELETED_CLASSES.includes(k));
        if (cleanKT.length === 0) cleanKT = ['XII 3', 'XII 4'];
        return {
          ...e,
          kelasTarget: cleanKT,
        };
      });
    } catch {
      return INITIAL_EXAMS;
    }
  });

  const [submissions, setSubmissions] = useState<ExamSubmission[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_SUBMISSIONS);
      const parsed: ExamSubmission[] = saved ? JSON.parse(saved) : INITIAL_SUBMISSIONS;
      return parsed.map((s) => {
        let cleanSK = sanitizeClassName(s.siswaKelas);
        if (DELETED_CLASSES.includes(cleanSK)) {
          cleanSK = 'XII 3';
        }
        return {
          ...s,
          siswaKelas: cleanSK,
        };
      });
    } catch {
      return INITIAL_SUBMISSIONS;
    }
  });

  const [materials, setMaterials] = useState<LessonMaterial[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MATERIALS);
      const parsed: LessonMaterial[] = saved ? JSON.parse(saved) : INITIAL_MATERIALS;
      return parsed.map((m) => {
        let cleanKT = (m.kelasTarget || [])
          .map(sanitizeClassName)
          .filter((k) => !DELETED_CLASSES.includes(k));
        if (cleanKT.length === 0) cleanKT = ['XII 3', 'XII 4'];
        return {
          ...m,
          kelasTarget: cleanKT,
        };
      });
    } catch {
      return INITIAL_MATERIALS;
    }
  });

  const [rombelList, setRombelList] = useState<RombelKelas[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ROMBEL);
      const parsed: RombelKelas[] = saved ? JSON.parse(saved) : INITIAL_ROMBEL;
      return parsed
        .map((r) => ({
          ...r,
          nama: sanitizeClassName(r.nama),
          jurusan: r.jurusan === 'MIPA' || r.jurusan === 'IPS' ? 'Umum' : r.jurusan,
        }))
        .filter((r) => !DELETED_CLASSES.includes(r.nama));
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
      const parsed: KelasMapelPengampu[] = saved ? JSON.parse(saved) : INITIAL_KELAS_MAPEL;
      return parsed
        .map((k) => ({
          ...k,
          kelasNama: sanitizeClassName(k.kelasNama),
        }))
        .filter((k) => !DELETED_CLASSES.includes(k.kelasNama));
    } catch {
      return INITIAL_KELAS_MAPEL;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isDeletedTeacher(parsed)) {
          localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          return null;
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<ExamSubmission | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const isInitialSeedDone = useRef<boolean>(false);

  // Sync state to localStorage as fast client-cache
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
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  // --- Real-time Firestore Listeners & Cloud Sync ---
  useEffect(() => {
    if (!db) return;

    // Helper to seed cloud if completely blank
    const seedCloudIfEmpty = async () => {
      if (isInitialSeedDone.current) return;
      isInitialSeedDone.current = true;
      try {
        const batch = writeBatch(db);
        INITIAL_USERS.forEach((u) => {
          batch.set(doc(db, 'users', u.id), cleanForFirestore(u));
        });
        INITIAL_ROMBEL.forEach((r) => {
          batch.set(doc(db, 'rombels', r.id), cleanForFirestore(r));
        });
        INITIAL_MAPEL.forEach((m) => {
          batch.set(doc(db, 'mataPelajaran', m.id), cleanForFirestore(m));
        });
        INITIAL_KELAS_MAPEL.forEach((kmp) => {
          batch.set(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(kmp));
        });
        INITIAL_EXAMS.forEach((e) => {
          batch.set(doc(db, 'exams', e.id), cleanForFirestore(e));
        });
        INITIAL_MATERIALS.forEach((m) => {
          batch.set(doc(db, 'materials', m.id), cleanForFirestore(m));
        });
        INITIAL_SUBMISSIONS.forEach((s) => {
          batch.set(doc(db, 'submissions', s.id), cleanForFirestore(s));
        });
        await batch.commit();
        setIsCloudSynced(true);
      } catch (err) {
        console.warn('Auto-seed cloud error:', err);
      }
    };

    // 1. Users Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setIsCloudSynced(true);
        if (snapshot.empty) {
          seedCloudIfEmpty();
        } else {
          // Permanently delete targeted deleted teachers from Firestore
          for (const d of snapshot.docs) {
            const uData = d.data() as User;
            if (isDeletedTeacher(uData)) {
              deleteDoc(doc(db, 'users', d.id)).catch(() => {});
            }
          }
          const rawLoaded = snapshot.docs
            .map((d) => d.data() as User)
            .filter((u) => !isDeletedTeacher(u));
          // Preserve darma313adi guarantee
          if (!rawLoaded.some((u) => u.username === 'darma313adi')) {
            const admin = INITIAL_USERS[0];
            setDoc(doc(db, 'users', admin.id), cleanForFirestore(admin)).catch(() => {});
            rawLoaded.unshift(admin);
          }
          const loaded = rawLoaded.map((u) => {
            let cleanK = u.kelas ? sanitizeClassName(u.kelas) : undefined;
            if (cleanK && DELETED_CLASSES.includes(cleanK)) {
              cleanK = 'XII 3';
            }
            let cleanKA = u.kelasAjar
              ?.map(sanitizeClassName)
              .filter((k) => !DELETED_CLASSES.includes(k));
            if (
              (u.kelas && u.kelas !== cleanK) ||
              (u.kelasAjar && JSON.stringify(u.kelasAjar) !== JSON.stringify(cleanKA))
            ) {
              const updatedU = { ...u, kelas: cleanK, kelasAjar: cleanKA };
              setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedU)).catch(() => {});
              return updatedU;
            }
            return { ...u, kelas: cleanK, kelasAjar: cleanKA };
          });
          setUsers(loaded);
          // Update currentUser if matched or logout if deleted
          if (currentUser) {
            if (isDeletedTeacher(currentUser)) {
              setCurrentUser(null);
              localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
            } else {
              const updatedSelf = loaded.find((u) => u.id === currentUser.id);
              if (updatedSelf) setCurrentUser(updatedSelf);
            }
          }
        }
      },
      (err) => console.warn('Firestore Users Listener error:', err)
    );

    // 2. Rombel Listener
    const unsubRombel = onSnapshot(
      collection(db, 'rombels'),
      (snapshot) => {
        if (!snapshot.empty) {
          const rawRombels = snapshot.docs.map((d) => d.data() as RombelKelas);
          const loadedRombels: RombelKelas[] = [];
          for (const r of rawRombels) {
            const cleanN = sanitizeClassName(r.nama);
            if (DELETED_CLASSES.includes(cleanN)) {
              // Delete document permanently from Firestore
              deleteDoc(doc(db, 'rombels', r.id)).catch(() => {});
              continue;
            }
            const cleanJ = r.jurusan === 'MIPA' || r.jurusan === 'IPS' ? 'Umum' : r.jurusan;
            if (r.nama !== cleanN || r.jurusan !== cleanJ) {
              const updatedR = { ...r, nama: cleanN, jurusan: cleanJ };
              setDoc(doc(db, 'rombels', r.id), cleanForFirestore(updatedR)).catch(() => {});
              loadedRombels.push(updatedR);
            } else {
              loadedRombels.push(r);
            }
          }
          setRombelList(loadedRombels);
        }
      },
      (err) => console.warn('Firestore Rombels Listener error:', err)
    );

    // 3. Mata Pelajaran Listener
    const unsubMapel = onSnapshot(
      collection(db, 'mataPelajaran'),
      (snapshot) => {
        if (!snapshot.empty) {
          setMataPelajaranList(snapshot.docs.map((d) => d.data() as MataPelajaran));
        }
      },
      (err) => console.warn('Firestore Mapel Listener error:', err)
    );

    // 4. Kelas Mapel Pengampu Listener
    const unsubKelasMapel = onSnapshot(
      collection(db, 'kelasMapelPengampu'),
      (snapshot) => {
        if (!snapshot.empty) {
          const rawKmp = snapshot.docs.map((d) => d.data() as KelasMapelPengampu);
          const loadedKmp: KelasMapelPengampu[] = [];
          for (const k of rawKmp) {
            const cleanKN = sanitizeClassName(k.kelasNama);
            if (DELETED_CLASSES.includes(cleanKN)) {
              // Delete permanently from Firestore
              deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {});
              continue;
            }
            if (k.kelasNama !== cleanKN) {
              const updatedK = { ...k, kelasNama: cleanKN };
              setDoc(doc(db, 'kelasMapelPengampu', k.id), cleanForFirestore(updatedK)).catch(() => {});
              loadedKmp.push(updatedK);
            } else {
              loadedKmp.push(k);
            }
          }
          setKelasMapelPengampuList(loadedKmp);
        }
      },
      (err) => console.warn('Firestore Plotting Listener error:', err)
    );

    // 5. Exams Listener
    const unsubExams = onSnapshot(
      collection(db, 'exams'),
      (snapshot) => {
        if (!snapshot.empty) {
          const rawExams = snapshot.docs.map((d) => d.data() as Exam);
          const loadedExams = rawExams.map((e) => {
            let cleanKT = (e.kelasTarget || [])
              .map(sanitizeClassName)
              .filter((k) => !DELETED_CLASSES.includes(k));
            if (cleanKT.length === 0) cleanKT = ['XII 3', 'XII 4'];
            if (JSON.stringify(e.kelasTarget) !== JSON.stringify(cleanKT)) {
              const updatedE = { ...e, kelasTarget: cleanKT };
              setDoc(doc(db, 'exams', e.id), cleanForFirestore(updatedE)).catch(() => {});
              return updatedE;
            }
            return { ...e, kelasTarget: cleanKT };
          });
          setExams(loadedExams);
        }
      },
      (err) => console.warn('Firestore Exams Listener error:', err)
    );

    // 6. Materials Listener
    const unsubMaterials = onSnapshot(
      collection(db, 'materials'),
      (snapshot) => {
        if (!snapshot.empty) {
          const rawMats = snapshot.docs.map((d) => d.data() as LessonMaterial);
          const loadedMats = rawMats.map((m) => {
            let cleanKT = (m.kelasTarget || [])
              .map(sanitizeClassName)
              .filter((k) => !DELETED_CLASSES.includes(k));
            if (cleanKT.length === 0) cleanKT = ['XII 3', 'XII 4'];
            if (JSON.stringify(m.kelasTarget) !== JSON.stringify(cleanKT)) {
              const updatedM = { ...m, kelasTarget: cleanKT };
              setDoc(doc(db, 'materials', m.id), cleanForFirestore(updatedM)).catch(() => {});
              return updatedM;
            }
            return { ...m, kelasTarget: cleanKT };
          });
          setMaterials(loadedMats);
        }
      },
      (err) => console.warn('Firestore Materials Listener error:', err)
    );

    // 7. Submissions Listener
    const unsubSubmissions = onSnapshot(
      collection(db, 'submissions'),
      (snapshot) => {
        if (!snapshot.empty) {
          const rawSubs = snapshot.docs.map((d) => d.data() as ExamSubmission);
          const loadedSubs = rawSubs.map((s) => {
            let cleanSK = sanitizeClassName(s.siswaKelas);
            if (DELETED_CLASSES.includes(cleanSK)) {
              cleanSK = 'XII 3';
            }
            if (s.siswaKelas !== cleanSK) {
              const updatedS = { ...s, siswaKelas: cleanSK };
              setDoc(doc(db, 'submissions', s.id), cleanForFirestore(updatedS)).catch(() => {});
              return updatedS;
            }
            return { ...s, siswaKelas: cleanSK };
          });
          setSubmissions(loadedSubs);
        }
      },
      (err) => console.warn('Firestore Submissions Listener error:', err)
    );

    return () => {
      unsubUsers();
      unsubRombel();
      unsubMapel();
      unsubKelasMapel();
      unsubExams();
      unsubMaterials();
      unsubSubmissions();
    };
  }, []);

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

    // Direct write to Cloud Firestore
    setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser)).catch((err) =>
      console.error('Failed to sync newUser to Firestore:', err)
    );
  };

  const updateUser = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
    }

    // Direct write to Cloud Firestore
    setDoc(doc(db, 'users', updated.id), cleanForFirestore(updated)).catch((err) =>
      console.error('Failed to update user in Firestore:', err)
    );
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target?.username === 'darma313adi') return; // Lindungi akun admin utama

    setUsers((prev) => prev.filter((u) => u.id !== userId));

    // Delete in Cloud Firestore
    deleteDoc(doc(db, 'users', userId)).catch((err) =>
      console.error('Failed to delete user in Firestore:', err)
    );

    // Jika guru dihapus, bersihkan penugasan wali kelas dan plotting
    if (target?.role === 'guru') {
      setRombelList((prev) =>
        prev.map((r) => {
          if (r.waliKelasId === userId) {
            const updatedR = { ...r, waliKelasId: undefined, waliKelasNama: undefined };
            setDoc(doc(db, 'rombels', r.id), cleanForFirestore(updatedR)).catch(() => {});
            return updatedR;
          }
          return r;
        })
      );
      setKelasMapelPengampuList((prev) =>
        prev.map((kmp) => {
          if (kmp.guruId === userId) {
            const updatedK = { ...kmp, guruId: undefined, guruNama: undefined };
            setDoc(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(updatedK)).catch(() => {});
            return updatedK;
          }
          return kmp;
        })
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

    validIds.forEach((id) => {
      deleteDoc(doc(db, 'users', id)).catch(() => {});
    });

    // Bersihkan wali kelas dan plotting jika ada guru yang dihapus
    setRombelList((prev) =>
      prev.map((r) => {
        if (r.waliKelasId && validIds.includes(r.waliKelasId)) {
          const updatedR = { ...r, waliKelasId: undefined, waliKelasNama: undefined };
          setDoc(doc(db, 'rombels', r.id), cleanForFirestore(updatedR)).catch(() => {});
          return updatedR;
        }
        return r;
      })
    );
    setKelasMapelPengampuList((prev) =>
      prev.map((kmp) => {
        if (kmp.guruId && validIds.includes(kmp.guruId)) {
          const updatedK = { ...kmp, guruId: undefined, guruNama: undefined };
          setDoc(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(updatedK)).catch(() => {});
          return updatedK;
        }
        return kmp;
      })
    );
  };

  const toggleUserStatus = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.username === 'darma313adi') return;
    const nextStatus: 'aktif' | 'nonaktif' = target.status === 'aktif' ? 'nonaktif' : 'aktif';
    const updated = { ...target, status: nextStatus };
    setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
    setDoc(doc(db, 'users', userId), cleanForFirestore(updated)).catch(() => {});
  };

  const resetUserPassword = (userId: string, newPassword?: string): string => {
    const pass = newPassword || '123456';
    const target = users.find((u) => u.id === userId);
    if (target) {
      const updated = { ...target, password: pass };
      setUsers((prev) => prev.map((u) => (u.id === userId ? updated : u)));
      setDoc(doc(db, 'users', userId), cleanForFirestore(updated)).catch(() => {});
    }
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
    setDoc(doc(db, 'users', userId), cleanForFirestore(updatedUser)).catch(() => {});

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
    setDoc(doc(db, 'rombels', newRombel.id), cleanForFirestore(newRombel)).catch(() => {});
    return newRombel;
  };

  const updateRombel = (updated: RombelKelas) => {
    const oldRombel = rombelList.find((r) => r.id === updated.id);
    setRombelList((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setDoc(doc(db, 'rombels', updated.id), cleanForFirestore(updated)).catch(() => {});

    // Jika nama kelas berubah, sinkronkan nama kelas di tabel plotting kelasMapelPengampu
    if (oldRombel && oldRombel.nama !== updated.nama) {
      setKelasMapelPengampuList((prev) =>
        prev.map((kmp) => {
          if (kmp.kelasNama === oldRombel.nama) {
            const updatedKmp = { ...kmp, kelasNama: updated.nama };
            setDoc(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(updatedKmp)).catch(() => {});
            return updatedKmp;
          }
          return kmp;
        })
      );
      // Sinkronkan juga pada user siswa
      setUsers((prev) =>
        prev.map((u) => {
          if (u.kelas === oldRombel.nama) {
            const updatedU = { ...u, kelas: updated.nama };
            setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedU)).catch(() => {});
            return updatedU;
          }
          return u;
        })
      );
    }
  };

  const deleteRombel = (rombelId: string) => {
    const target = rombelList.find((r) => r.id === rombelId);
    setRombelList((prev) => prev.filter((r) => r.id !== rombelId));
    deleteDoc(doc(db, 'rombels', rombelId)).catch(() => {});

    if (target) {
      // Hapus alokasi mapel kelas ini
      setKelasMapelPengampuList((prev) => {
        const remaining = prev.filter((kmp) => kmp.kelasNama !== target.nama);
        const removed = prev.filter((kmp) => kmp.kelasNama === target.nama);
        removed.forEach((k) => deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {}));
        return remaining;
      });
      // Lepas kelas dari siswa agar tidak dangling
      setUsers((prev) =>
        prev.map((u) => {
          if (u.kelas === target.nama) {
            const updatedU = { ...u, kelas: undefined };
            setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedU)).catch(() => {});
            return updatedU;
          }
          return u;
        })
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
    setDoc(doc(db, 'mataPelajaran', newMapel.id), cleanForFirestore(newMapel)).catch(() => {});
    return newMapel;
  };

  const updateMataPelajaran = (updated: MataPelajaran) => {
    const oldMapel = mataPelajaranList.find((m) => m.id === updated.id);
    setMataPelajaranList((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    setDoc(doc(db, 'mataPelajaran', updated.id), cleanForFirestore(updated)).catch(() => {});

    // Sinkronkan nama dan kode di tabel plotting
    setKelasMapelPengampuList((prev) =>
      prev.map((kmp) => {
        if (kmp.mapelId === updated.id) {
          const updatedKmp = { ...kmp, mapelNama: updated.nama, mapelKode: updated.kode };
          setDoc(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(updatedKmp)).catch(() => {});
          return updatedKmp;
        }
        return kmp;
      })
    );

    // Sinkronkan nama mapel pada ujian jika berubah
    if (oldMapel && oldMapel.nama !== updated.nama) {
      setExams((prev) =>
        prev.map((e) => {
          if (e.mataPelajaran === oldMapel.nama) {
            const updatedE = { ...e, mataPelajaran: updated.nama };
            setDoc(doc(db, 'exams', e.id), cleanForFirestore(updatedE)).catch(() => {});
            return updatedE;
          }
          return e;
        })
      );
    }
  };

  const deleteMataPelajaran = (mapelId: string) => {
    setMataPelajaranList((prev) => prev.filter((m) => m.id !== mapelId));
    deleteDoc(doc(db, 'mataPelajaran', mapelId)).catch(() => {});
    setKelasMapelPengampuList((prev) => {
      const remaining = prev.filter((kmp) => kmp.mapelId !== mapelId);
      const removed = prev.filter((kmp) => kmp.mapelId === mapelId);
      removed.forEach((k) => deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {}));
      return remaining;
    });
  };

  // --- Plotting Mapel & Guru Pengampu per Kelas ---
  const setKelasMataPelajaran = (kelasNama: string, mapelIds: string[]) => {
    setKelasMapelPengampuList((prev) => {
      const existingForClass = prev.filter(
        (kmp) => kmp.kelasNama === kelasNama && mapelIds.includes(kmp.mapelId)
      );
      const otherClasses = prev.filter((kmp) => kmp.kelasNama !== kelasNama);

      // Mapel yang dibuang dari kelas ini: hapus dari Firestore
      const toDelete = prev.filter(
        (kmp) => kmp.kelasNama === kelasNama && !mapelIds.includes(kmp.mapelId)
      );
      toDelete.forEach((k) => deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {}));

      // Tambahkan mapel yang baru dialokasikan ke kelas
      const newlyAdded: KelasMapelPengampu[] = [];
      mapelIds.forEach((mId) => {
        const alreadyAllocated = existingForClass.find((kmp) => kmp.mapelId === mId);
        if (!alreadyAllocated) {
          const mapelObj = mataPelajaranList.find((m) => m.id === mId);
          if (mapelObj) {
            const newItem: KelasMapelPengampu = {
              id: `kmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
              kelasNama,
              mapelId: mapelObj.id,
              mapelNama: mapelObj.nama,
              mapelKode: mapelObj.kode,
            };
            newlyAdded.push(newItem);
            setDoc(doc(db, 'kelasMapelPengampu', newItem.id), cleanForFirestore(newItem)).catch(() => {});
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
          const updated = {
            ...kmp,
            guruId: guruId || undefined,
            guruNama: guruNama || undefined,
          };
          setDoc(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(updated)).catch(() => {});
          return updated;
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

            const updatedGuru = {
              ...u,
              kelasAjar: updatedKelasAjar,
              mataPelajaran: updatedMapel,
            };
            setDoc(doc(db, 'users', u.id), cleanForFirestore(updatedGuru)).catch(() => {});
            return updatedGuru;
          }
          return u;
        })
      );
    }
  };

  const removeMapelFromKelas = (kelasNama: string, mapelId: string) => {
    setKelasMapelPengampuList((prev) => {
      const target = prev.find((kmp) => kmp.kelasNama === kelasNama && kmp.mapelId === mapelId);
      if (target) {
        deleteDoc(doc(db, 'kelasMapelPengampu', target.id)).catch(() => {});
      }
      return prev.filter((kmp) => !(kmp.kelasNama === kelasNama && kmp.mapelId === mapelId));
    });
  };

  const importUsers = (newUsers: Partial<User>[]): number => {
    let count = 0;
    const addedList: User[] = [];
    const updatedUserMap = new Map<string, User>();
    const newRombelsToCreate: RombelKelas[] = [];
    const existingRombelNames = new Set(rombelList.map((r) => r.nama.trim().toLowerCase()));

    // Helper untuk auto-register rombel baru jika belum ada di sistem
    const ensureRombelExists = (kelasNama?: string) => {
      if (!kelasNama) return;
      const cleanNama = sanitizeClassName(kelasNama);
      if (!cleanNama) return;
      if (existingRombelNames.has(cleanNama.toLowerCase())) return;

      let tingkat: 'X' | 'XI' | 'XII' | string = 'X';
      if (/^XII\b|^XII[\s_-]/i.test(cleanNama)) tingkat = 'XII';
      else if (/^XI\b|^XI[\s_-]/i.test(cleanNama)) tingkat = 'XI';
      else if (/^X\b|^X[\s_-]/i.test(cleanNama)) tingkat = 'X';
      else if (cleanNama.includes('12')) tingkat = 'XII';
      else if (cleanNama.includes('11')) tingkat = 'XI';
      else if (cleanNama.includes('10')) tingkat = 'X';

      let jurusan: 'Umum' | 'Peminatan' | 'Keagamaan' | 'Bahasa' | string = 'Umum';
      if (/Bahasa/i.test(cleanNama)) jurusan = 'Bahasa';
      else if (/Agama|Keagamaan/i.test(cleanNama)) jurusan = 'Keagamaan';
      else if (/Pilihan|Peminatan/i.test(cleanNama)) jurusan = 'Peminatan';
      else jurusan = 'Umum';

      const newRombel: RombelKelas = {
        id: `rombel_${Date.now()}_${Math.floor(Math.random() * 10000)}_${newRombelsToCreate.length}`,
        nama: cleanNama,
        tingkat,
        jurusan,
        tahunAjaran: '2025/2026',
        createdAt: new Date().toISOString(),
      };

      newRombelsToCreate.push(newRombel);
      existingRombelNames.add(cleanNama.toLowerCase());
      setDoc(doc(db, 'rombels', newRombel.id), cleanForFirestore(newRombel)).catch(() => {});
    };

    newUsers.forEach((nu) => {
      if (!nu.username || !nu.name) return;
      const cleanUsername = nu.username.trim().toLowerCase();
      const userKelas = nu.kelas ? sanitizeClassName(nu.kelas) : undefined;

      // Pastikan rombel kelas siswa terdaftar di database
      if (userKelas) {
        ensureRombelExists(userKelas);
      }
      // Jika guru memiliki daftar kelas ajar, pastikan juga terdaftar
      if (nu.kelasAjar && Array.isArray(nu.kelasAjar)) {
        nu.kelasAjar = nu.kelasAjar.map(sanitizeClassName);
        nu.kelasAjar.forEach((ka) => ensureRombelExists(ka));
      }

      const existingUser = users.find(
        (u) =>
          u.username.toLowerCase() === cleanUsername ||
          (nu.role === 'siswa' && nu.nisn && u.nisn && u.nisn.trim() === nu.nisn.trim())
      );

      if (existingUser) {
        // PERBARUI akun yang sudah ada dengan data dari template (termasuk kelas baru)
        const updated: User = {
          ...existingUser,
          name: nu.name.trim(),
          email: nu.email || existingUser.email,
          role: nu.role || existingUser.role,
          // Update kelas persis sesuai template (tidak lagi tertahan atau tertimpa default)
          kelas: userKelas !== undefined ? userKelas : existingUser.kelas,
          nip: nu.nip !== undefined ? nu.nip : existingUser.nip,
          nisn: nu.nisn !== undefined ? nu.nisn : existingUser.nisn,
          mataPelajaran: nu.mataPelajaran !== undefined ? nu.mataPelajaran : existingUser.mataPelajaran,
          kelasAjar: nu.kelasAjar !== undefined ? nu.kelasAjar : existingUser.kelasAjar,
        };
        // Update password hanya jika diberikan password baru yang bukan kosong
        if (nu.password && nu.password.trim() !== '') {
          updated.password = nu.password.trim();
        }

        updatedUserMap.set(existingUser.id, updated);
        setDoc(doc(db, 'users', existingUser.id), cleanForFirestore(updated)).catch(() => {});
        count++;
      } else {
        // TAMBAH akun baru
        const newUser: User = {
          id: `usr_${Date.now()}_${count}_${Math.floor(Math.random() * 1000)}`,
          username: cleanUsername,
          password: nu.password || '123456',
          name: nu.name.trim(),
          email: nu.email || `${cleanUsername}@sekolah.sch.id`,
          role: nu.role || 'siswa',
          kelas: userKelas,
          nip: nu.nip,
          nisn: nu.nisn,
          mataPelajaran: nu.mataPelajaran,
          kelasAjar: nu.kelasAjar,
          status: 'aktif',
          createdAt: new Date().toISOString(),
        };
        addedList.push(newUser);
        setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser)).catch(() => {});
        count++;
      }
    });

    if (newRombelsToCreate.length > 0) {
      setRombelList((prev) => [...prev, ...newRombelsToCreate]);
    }

    if (addedList.length > 0 || updatedUserMap.size > 0) {
      setUsers((prev) => {
        const mapped = prev.map((u) => updatedUserMap.get(u.id) || u);
        return [...addedList, ...mapped];
      });
    }

    return count;
  };

  const createExam = (examData: Omit<Exam, 'id' | 'createdAt'>): Exam => {
    const newExam: Exam = {
      ...examData,
      id: `exam_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString(),
    };
    setExams((prev) => [newExam, ...prev]);
    setDoc(doc(db, 'exams', newExam.id), cleanForFirestore(newExam)).catch(() => {});
    return newExam;
  };

  const updateExam = (updated: Exam) => {
    setExams((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    if (activeExam?.id === updated.id) {
      setActiveExam(updated);
    }
    setDoc(doc(db, 'exams', updated.id), cleanForFirestore(updated)).catch(() => {});
  };

  const deleteExam = (examId: string) => {
    setExams((prev) => prev.filter((e) => e.id !== examId));
    deleteDoc(doc(db, 'exams', examId)).catch(() => {});
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
          const updatedExam = {
            ...e,
            soalList: [...e.soalList, ...renumbered],
          };
          setDoc(doc(db, 'exams', examId), cleanForFirestore(updatedExam)).catch(() => {});
          return updatedExam;
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
    setDoc(doc(db, 'materials', newMaterial.id), cleanForFirestore(newMaterial)).catch(() => {});
    return newMaterial;
  };

  const deleteMaterial = (materialId: string) => {
    setMaterials((prev) => prev.filter((m) => m.id !== materialId));
    deleteDoc(doc(db, 'materials', materialId)).catch(() => {});
  };

  const startExamSession = (exam: Exam, siswa: User): ExamSubmission => {
    // Check if student already submitted this exam
    const alreadySubmitted = submissions.find(
      (s) => s.examId === exam.id && s.siswaId === siswa.id && s.status === 'sudah_dikumpulkan'
    );
    if (alreadySubmitted) {
      alert(`Peringatan: Anda sudah menyelesaikan dan mengirim jawaban untuk ujian "${exam.judul}". Anda tidak dapat login kembali pada ujian yang sama.`);
      return alreadySubmitted;
    }

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
      siswaKelas: siswa.kelas || 'XII 3',
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
    setDoc(doc(db, 'submissions', newSub.id), cleanForFirestore(newSub)).catch(() => {});
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

    // Persist final submission to Firestore
    setDoc(doc(db, 'submissions', completed.id), cleanForFirestore(completed)).catch((err) =>
      console.error('Failed to save submission to Firestore:', err)
    );

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
          const updated = {
            ...s,
            totalSkor,
            nilai100,
            catatanGuru: catatanGuru !== undefined ? catatanGuru : s.catatanGuru,
          };
          setDoc(doc(db, 'submissions', submissionId), cleanForFirestore(updated)).catch(() => {});
          return updated;
        }
        return s;
      })
    );
  };

  const resetExamSubmission = (submissionId: string) => {
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    if (activeSubmission?.id === submissionId) {
      setActiveSubmission(null);
    }
    deleteDoc(doc(db, 'submissions', submissionId)).catch((err) =>
      console.error('Failed to reset submission in Firestore:', err)
    );
  };

  const resetExamParticipant = (examId: string, studentId: string) => {
    const toRemove = submissions.filter(
      (s) => s.examId === examId && s.siswaId === studentId
    );
    if (toRemove.length === 0) return;

    setSubmissions((prev) =>
      prev.filter((s) => !(s.examId === examId && s.siswaId === studentId))
    );
    if (activeSubmission?.examId === examId && activeSubmission?.siswaId === studentId) {
      setActiveSubmission(null);
    }
    toRemove.forEach((sub) => {
      deleteDoc(doc(db, 'submissions', sub.id)).catch((err) =>
        console.error('Failed to reset participant in Firestore:', err)
      );
    });
  };

  const resetExamParticipantsByClass = (examId: string, className: string) => {
    const cleanClass = className.trim().toLowerCase();
    const toRemove = submissions.filter((s) => {
      if (s.examId !== examId) return false;
      const subClass = (s.siswaKelas || '').trim().toLowerCase();
      if (subClass === cleanClass) return true;
      const user = users.find((u) => u.id === s.siswaId);
      return (user?.kelas || '').trim().toLowerCase() === cleanClass;
    });

    if (toRemove.length === 0) return;

    const removeIds = new Set(toRemove.map((s) => s.id));
    setSubmissions((prev) => prev.filter((s) => !removeIds.has(s.id)));
    if (activeSubmission && removeIds.has(activeSubmission.id)) {
      setActiveSubmission(null);
    }
    toRemove.forEach((sub) => {
      deleteDoc(doc(db, 'submissions', sub.id)).catch((err) =>
        console.error('Failed to delete class submission from Firestore:', err)
      );
    });
  };

  const resetAllDataToDefault = async () => {
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

    // Sync reset to Firestore
    try {
      const batch = writeBatch(db);
      INITIAL_USERS.forEach((u) => batch.set(doc(db, 'users', u.id), cleanForFirestore(u)));
      INITIAL_ROMBEL.forEach((r) => batch.set(doc(db, 'rombels', r.id), cleanForFirestore(r)));
      INITIAL_MAPEL.forEach((m) => batch.set(doc(db, 'mataPelajaran', m.id), cleanForFirestore(m)));
      INITIAL_KELAS_MAPEL.forEach((kmp) => batch.set(doc(db, 'kelasMapelPengampu', kmp.id), cleanForFirestore(kmp)));
      INITIAL_EXAMS.forEach((e) => batch.set(doc(db, 'exams', e.id), cleanForFirestore(e)));
      INITIAL_MATERIALS.forEach((m) => batch.set(doc(db, 'materials', m.id), cleanForFirestore(m)));
      INITIAL_SUBMISSIONS.forEach((s) => batch.set(doc(db, 'submissions', s.id), cleanForFirestore(s)));
      await batch.commit();
    } catch (err) {
      console.warn('Reset Firestore error:', err);
    }
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
        isCloudSynced,
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
        resetExamSubmission,
        resetExamParticipant,
        resetExamParticipantsByClass,
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
