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
  AttendanceRecord,
  PortalSettings,
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
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface LocalExamDraft {
  examId: string;
  siswaId: string;
  submissionId?: string;
  jawabanMap: Record<string, StudentAnswer>;
  sisaWaktuDetik: number;
  currentIndex?: number;
  violations?: CheatingViolation[];
  updatedAt: string;
}

interface LMSContextType {
  currentUser: User | null;
  users: User[];
  exams: Exam[];
  submissions: ExamSubmission[];
  materials: LessonMaterial[];
  rombelList: RombelKelas[];
  mataPelajaranList: MataPelajaran[];
  kelasMapelPengampuList: KelasMapelPengampu[];
  attendanceList: AttendanceRecord[];
  activeExam: Exam | null;
  activeSubmission: ExamSubmission | null;
  isCloudSynced: boolean;
  portalSettings: PortalSettings;
  isPortalChecking: boolean;
  refreshPortalSettings: (silent?: boolean) => Promise<PortalSettings>;
  updatePortalSettings: (
    updates: Partial<PortalSettings>
  ) => Promise<{ success: boolean; error?: string }>;
  login: (
    username: string,
    password: string
  ) => Promise<{ success: boolean; message?: string; blockedByPortal?: boolean }>;
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
  // Absensi Siswa
  saveAttendance: (
    recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ) => AttendanceRecord;
  deleteAttendance: (attendanceId: string) => void;
  // Exam & Materials
  createExam: (examData: Omit<Exam, 'id' | 'createdAt'>) => Exam;
  updateExam: (exam: Exam) => void;
  deleteExam: (examId: string) => void;
  addQuestionsToExam: (examId: string, questions: QuestionItem[]) => void;
  addMaterial: (materialData: Omit<LessonMaterial, 'id' | 'createdAt'>) => LessonMaterial;
  deleteMaterial: (materialId: string) => void;
  startExamSession: (exam: Exam, siswa: User) => ExamSubmission;
  updateStudentAnswer: (questionId: string, answer: any, raguRagu?: boolean) => void;
  updateLocalExamProgress: (sisaWaktuDetik: number, currentIndex?: number) => void;
  loadLocalExamDraft: (examId: string, siswaId: string) => LocalExamDraft | null;
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

export const DEFAULT_PORTAL_SETTINGS: PortalSettings = {
  isOpen: true,
  closedMessage:
    'Portal Ujian & Pembelajaran MAN 11 Jakarta sedang ditutup sementara oleh Administrator. Silakan tunggu informasi lebih lanjut untuk jadwal pembukaan portal kembali.',
};

const STORAGE_KEY_CURRENT_USER = 'educbt_current_user_v1';
const STORAGE_KEY_USERS = 'educbt_users_v1';
const STORAGE_KEY_EXAMS = 'educbt_exams_v1';
const STORAGE_KEY_SUBMISSIONS = 'educbt_submissions_v1';
const STORAGE_KEY_MATERIALS = 'educbt_materials_v1';
const STORAGE_KEY_ROMBEL = 'educbt_rombel_v1';
const STORAGE_KEY_MAPEL = 'educbt_mapel_v1';
const STORAGE_KEY_KELAS_MAPEL = 'educbt_kelas_mapel_v1';
const STORAGE_KEY_ATTENDANCE = 'educbt_absensi_v1';

const getLocalDraftKey = (examId: string, siswaId: string) =>
  `educbt_local_draft_${examId}_${siswaId}`;

export function loadLocalDraftFromStorage(examId: string, siswaId: string): LocalExamDraft | null {
  try {
    const raw = localStorage.getItem(getLocalDraftKey(examId, siswaId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalExamDraft;
  } catch {
    return null;
  }
}

export function saveLocalDraftToStorage(draft: LocalExamDraft): void {
  try {
    localStorage.setItem(getLocalDraftKey(draft.examId, draft.siswaId), JSON.stringify(draft));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearLocalDraftFromStorage(examId: string, siswaId: string): void {
  try {
    localStorage.removeItem(getLocalDraftKey(examId, siswaId));
  } catch {
    // Ignore errors
  }
}

function hasAnswerValue(ans?: StudentAnswer): boolean {
  if (!ans || ans.jawaban === undefined || ans.jawaban === null || ans.jawaban === '') {
    return false;
  }
  if (Array.isArray(ans.jawaban)) return ans.jawaban.length > 0;
  if (typeof ans.jawaban === 'object') return Object.keys(ans.jawaban).length > 0;
  return true;
}

function mergeLocalDraftIntoSubmission(
  sub: ExamSubmission,
  draft: LocalExamDraft | null
): ExamSubmission {
  if (!draft || sub.status !== 'sedang_mengerjakan') return sub;

  const mergedMap: Record<string, StudentAnswer> = { ...(sub.jawabanMap || {}) };
  Object.entries(draft.jawabanMap || {}).forEach(([qId, localAns]) => {
    const cloudAns = mergedMap[qId];
    if (hasAnswerValue(localAns) || localAns?.raguRagu) {
      mergedMap[qId] = {
        ...(cloudAns || { questionId: qId, jawaban: undefined, raguRagu: false }),
        ...localAns,
      };
    }
  });

  // Merge violations deduplicated by id
  const vMap = new Map<string, CheatingViolation>();
  (sub.violations || []).forEach((v) => vMap.set(v.id, v));
  (draft.violations || []).forEach((v) => vMap.set(v.id, v));

  return {
    ...sub,
    jawabanMap: mergedMap,
    sisaWaktuDetik:
      typeof draft.sisaWaktuDetik === 'number' && draft.sisaWaktuDetik > 0
        ? Math.min(sub.sisaWaktuDetik || draft.sisaWaktuDetik, draft.sisaWaktuDetik)
        : sub.sisaWaktuDetik,
    violations: Array.from(vMap.values()),
  };
}

/**
 * Deleted classes filter cleared so all levels (X, XI, XII) remain intact
 */
export const DELETED_CLASSES: string[] = [];

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
 * Helper to remove legacy MIPA, MIA, IPS from class names while preserving level (X, XI, XII)
 */
export function sanitizeClassName(rawName?: string): string {
  if (!rawName) return '';
  return rawName
    .replace(/\b(MIPA|MIA|IPA|IPS)\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean data for Cloud Firestore (strip `undefined` values completely)
 */
function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return null as any;
  if (Array.isArray(data)) {
    return data.map((item) => (item === undefined ? null : cleanForFirestore(item))) as any;
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

/**
 * Defensive converter for Firestore snapshots (handles arrays stored as objects or omitted fields)
 */
function toArray<T>(val: any): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val.filter((x) => x !== null && x !== undefined);
  if (typeof val === 'object') {
    return Object.values(val).filter((x) => x !== null && x !== undefined) as T[];
  }
  return [];
}

function normalizeUser(u: User): User {
  const cleanKA = u.kelasAjar
    ? toArray<string>(u.kelasAjar)
        .map(sanitizeClassName)
        .filter((k) => Boolean(k) && !DELETED_CLASSES.includes(k))
    : undefined;
  return {
    ...u,
    kelasAjar: cleanKA,
  };
}

function normalizeExam(e: Exam): Exam {
  return {
    ...e,
    kelasTarget: toArray<string>(e.kelasTarget),
    targetSiswaIds: e.targetSiswaIds ? toArray<string>(e.targetSiswaIds) : undefined,
    tokenList: e.tokenList ? toArray(e.tokenList) : undefined,
    soalList: toArray<QuestionItem>(e.soalList).map((q) => ({
      ...q,
      pilihan: q.pilihan ? toArray(q.pilihan) : undefined,
      pasangan: q.pasangan ? toArray(q.pasangan) : undefined,
      pernyataanTKA: q.pernyataanTKA ? toArray(q.pernyataanTKA) : undefined,
      kunciJawaban:
        Array.isArray(q.kunciJawaban)
          ? q.kunciJawaban
          : q.kunciJawaban && typeof q.kunciJawaban === 'object'
          ? toArray<string>(q.kunciJawaban)
          : q.kunciJawaban,
    })),
  };
}

function normalizeMaterial(m: LessonMaterial): LessonMaterial {
  return {
    ...m,
    kelasTarget: toArray<string>(m.kelasTarget),
  };
}

function normalizeSubmission(s: ExamSubmission): ExamSubmission {
  return {
    ...s,
    jawabanMap: s.jawabanMap || {},
    violations: toArray<CheatingViolation>(s.violations),
  };
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
          const cleanKA = u.kelasAjar
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
        const normalized = normalizeSubmission({ ...s, siswaKelas: cleanSK });
        const draft = loadLocalDraftFromStorage(normalized.examId, normalized.siswaId);
        return mergeLocalDraftIntoSubmission(normalized, draft);
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
      const cleaned = parsed
        .map((r) => ({
          ...r,
          nama: sanitizeClassName(r.nama),
          jurusan: r.jurusan === 'MIPA' || r.jurusan === 'IPS' ? 'Umum' : r.jurusan,
        }))
        .filter((r) => !DELETED_CLASSES.includes(r.nama));
      // Ensure X, XI, XII exist if legacy storage was missing XI/XII
      const existingNames = new Set(cleaned.map((r) => r.nama.toLowerCase()));
      const hasXI = cleaned.some((r) => r.tingkat === 'XI' || /^XI\b/i.test(r.nama));
      const hasXII = cleaned.some((r) => r.tingkat === 'XII' || /^XII\b/i.test(r.nama));
      const additions = INITIAL_ROMBEL.filter((ir) => {
        if (existingNames.has(ir.nama.toLowerCase())) return false;
        if (!hasXI && ir.tingkat === 'XI') return true;
        if (!hasXII && ir.tingkat === 'XII') return true;
        return false;
      });
      return [...cleaned, ...additions];
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

  const [attendanceList, setAttendanceList] = useState<AttendanceRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_ATTENDANCE);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
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

  const currentUserRef = useRef<User | null>(currentUser);
  currentUserRef.current = currentUser;

  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [activeSubmission, setActiveSubmission] = useState<ExamSubmission | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const [portalSettings, setPortalSettings] = useState<PortalSettings>(DEFAULT_PORTAL_SETTINGS);
  const [isPortalChecking, setIsPortalChecking] = useState<boolean>(true);
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
    localStorage.setItem(STORAGE_KEY_ATTENDANCE, JSON.stringify(attendanceList));
  }, [attendanceList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    }
  }, [currentUser]);

  const refreshPortalSettings = async (silent = false): Promise<PortalSettings> => {
    if (!silent) setIsPortalChecking(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'portal'));
      if (snap.exists()) {
        const data = snap.data() as Partial<PortalSettings>;
        const next: PortalSettings = {
          isOpen: data.isOpen !== undefined ? Boolean(data.isOpen) : true,
          closedMessage:
            typeof data.closedMessage === 'string' && data.closedMessage.trim()
              ? data.closedMessage
              : DEFAULT_PORTAL_SETTINGS.closedMessage,
          updatedAt: data.updatedAt,
          updatedBy: data.updatedBy,
        };
        setPortalSettings(next);
        return next;
      }
      setPortalSettings(DEFAULT_PORTAL_SETTINGS);
      return DEFAULT_PORTAL_SETTINGS;
    } catch (err) {
      console.warn('Gagal membaca settings/portal dari Firestore:', err);
      return portalSettings;
    } finally {
      if (!silent) setIsPortalChecking(false);
    }
  };

  const updatePortalSettings = async (
    updates: Partial<PortalSettings>
  ): Promise<{ success: boolean; error?: string }> => {
    const next: PortalSettings = {
      ...portalSettings,
      ...updates,
      closedMessage:
        updates.closedMessage !== undefined
          ? updates.closedMessage
          : portalSettings.closedMessage,
      updatedAt: new Date().toISOString(),
      updatedBy: currentUserRef.current?.name || 'Administrator',
    };
    setPortalSettings(next);
    try {
      await setDoc(doc(db, 'settings', 'portal'), cleanForFirestore(next), { merge: true });
      return { success: true };
    } catch (err: any) {
      console.error('Gagal menyimpan settings/portal ke Firestore:', err);
      return {
        success: false,
        error: err?.message || 'Gagal menyimpan pengaturan portal ke Firestore.',
      };
    }
  };

  // --- Single getDoc Read for Portal Access Settings on App Boot ---
  useEffect(() => {
    if (!db) {
      setIsPortalChecking(false);
      return;
    }
    refreshPortalSettings();
  }, []);

  // --- Real-time Cloud Firestore Listeners & Cloud Sync ---
  useEffect(() => {
    if (!db) return;

    const seedCloudIfEmpty = async () => {
      if (isInitialSeedDone.current) return;
      isInitialSeedDone.current = true;
      try {
        const ops: Array<{ col: string; id: string; data: any }> = [];
        INITIAL_USERS.forEach((u) =>
          ops.push({ col: 'users', id: u.id, data: cleanForFirestore(u) })
        );
        INITIAL_ROMBEL.forEach((r) =>
          ops.push({ col: 'rombels', id: r.id, data: cleanForFirestore(r) })
        );
        INITIAL_MAPEL.forEach((m) =>
          ops.push({ col: 'mataPelajaran', id: m.id, data: cleanForFirestore(m) })
        );
        INITIAL_KELAS_MAPEL.forEach((kmp) =>
          ops.push({ col: 'kelasMapelPengampu', id: kmp.id, data: cleanForFirestore(kmp) })
        );
        INITIAL_EXAMS.forEach((e) =>
          ops.push({ col: 'exams', id: e.id, data: cleanForFirestore(e) })
        );
        INITIAL_MATERIALS.forEach((m) =>
          ops.push({ col: 'materials', id: m.id, data: cleanForFirestore(m) })
        );
        INITIAL_SUBMISSIONS.forEach((s) =>
          ops.push({ col: 'submissions', id: s.id, data: cleanForFirestore(s) })
        );
        ops.push({
          col: 'settings',
          id: 'portal',
          data: cleanForFirestore(DEFAULT_PORTAL_SETTINGS),
        });

        for (let i = 0; i < ops.length; i += 450) {
          const batch = writeBatch(db);
          ops.slice(i, i + 450).forEach((op) => {
            batch.set(doc(db, op.col, op.id), op.data);
          });
          await batch.commit();
        }
        setIsCloudSynced(true);
      } catch (err) {
        console.warn('Auto-seed Firestore error:', err);
      }
    };

    // 1. Users Listener
    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        setIsCloudSynced(true);
        if (snapshot.empty) {
          seedCloudIfEmpty();
          return;
        }
        const entries: [string, User][] = snapshot.docs.map((d) => [
          d.id,
          d.data() as User,
        ]);
        entries.forEach(([id, uData]) => {
          if (isDeletedTeacher(uData)) {
            deleteDoc(doc(db, 'users', id)).catch(() => {});
          }
        });

        const rawLoaded = entries
          .map(([id, uData]) => normalizeUser({ ...uData, id: uData.id || id }))
          .filter((u) => !isDeletedTeacher(u));

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
          const cleanKA = u.kelasAjar
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

        const activeCurUser = currentUserRef.current;
        if (activeCurUser) {
          if (isDeletedTeacher(activeCurUser)) {
            setCurrentUser(null);
            localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
          } else {
            const updatedSelf = loaded.find((u) => u.id === activeCurUser.id);
            if (updatedSelf) setCurrentUser(updatedSelf);
          }
        }
      },
      (err) => console.warn('Firestore Users Listener error:', err)
    );

    // 2. Rombel Listener
    const unsubRombel = onSnapshot(
      collection(db, 'rombels'),
      (snapshot) => {
        if (snapshot.empty) return;
        const rawRombels: RombelKelas[] = snapshot.docs.map((d) => {
          const data = d.data() as RombelKelas;
          return { ...data, id: data.id || d.id };
        });
        const loadedRombels: RombelKelas[] = [];
        for (const r of rawRombels) {
          const cleanN = sanitizeClassName(r.nama);
          if (DELETED_CLASSES.includes(cleanN)) {
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
        // Auto-restore missing XI or XII rombels if previously stripped
        const existingNames = new Set(loadedRombels.map((r) => r.nama.trim().toLowerCase()));
        const hasXI = loadedRombels.some((r) => r.tingkat === 'XI' || /^XI\b/i.test(r.nama));
        const hasXII = loadedRombels.some((r) => r.tingkat === 'XII' || /^XII\b/i.test(r.nama));
        for (const ir of INITIAL_ROMBEL) {
          if (
            !existingNames.has(ir.nama.trim().toLowerCase()) &&
            ((!hasXI && ir.tingkat === 'XI') || (!hasXII && ir.tingkat === 'XII'))
          ) {
            loadedRombels.push(ir);
            setDoc(doc(db, 'rombels', ir.id), cleanForFirestore(ir)).catch(() => {});
          }
        }
        setRombelList(loadedRombels);
      },
      (err) => console.warn('Firestore Rombels Listener error:', err)
    );

    // 3. Mata Pelajaran Listener
    const unsubMapel = onSnapshot(
      collection(db, 'mataPelajaran'),
      (snapshot) => {
        if (!snapshot.empty) {
          setMataPelajaranList(
            snapshot.docs.map((d) => {
              const data = d.data() as MataPelajaran;
              return { ...data, id: data.id || d.id };
            })
          );
        }
      },
      (err) => console.warn('Firestore Mapel Listener error:', err)
    );

    // 4. Kelas Mapel Pengampu Listener
    const unsubKelasMapel = onSnapshot(
      collection(db, 'kelasMapelPengampu'),
      (snapshot) => {
        if (snapshot.empty) return;
        const rawKmp: KelasMapelPengampu[] = snapshot.docs.map((d) => {
          const data = d.data() as KelasMapelPengampu;
          return { ...data, id: data.id || d.id };
        });
        const loadedKmp: KelasMapelPengampu[] = [];
        for (const k of rawKmp) {
          const cleanKN = sanitizeClassName(k.kelasNama);
          if (DELETED_CLASSES.includes(cleanKN)) {
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
      },
      (err) => console.warn('Firestore Plotting Listener error:', err)
    );

    // 5. Exams Listener
    const unsubExams = onSnapshot(
      collection(db, 'exams'),
      (snapshot) => {
        if (snapshot.empty) return;
        const rawExams = snapshot.docs
          .map((d) => {
            const data = d.data() as Exam;
            return normalizeExam({ ...data, id: data.id || d.id });
          });
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
      },
      (err) => console.warn('Firestore Exams Listener error:', err)
    );

    // 6. Materials Listener
    const unsubMaterials = onSnapshot(
      collection(db, 'materials'),
      (snapshot) => {
        if (snapshot.empty) return;
        const rawMats = snapshot.docs
          .map((d) => {
            const data = d.data() as LessonMaterial;
            return normalizeMaterial({ ...data, id: data.id || d.id });
          });
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
      },
      (err) => console.warn('Firestore Materials Listener error:', err)
    );

    // 7. Submissions Listener (Preserve local unsent student answers on this device!)
    const unsubSubmissions = onSnapshot(
      collection(db, 'submissions'),
      (snapshot) => {
        if (snapshot.empty) {
          setSubmissions([]);
          return;
        }
        const rawSubs = snapshot.docs
          .map((d) => {
            const data = d.data() as ExamSubmission;
            return normalizeSubmission({ ...data, id: data.id || d.id });
          });
        const loadedSubs = rawSubs.map((s) => {
          let cleanSK = sanitizeClassName(s.siswaKelas);
          if (DELETED_CLASSES.includes(cleanSK)) {
            cleanSK = 'XII 3';
          }
          let processed = s.siswaKelas !== cleanSK ? { ...s, siswaKelas: cleanSK } : s;
          if (s.siswaKelas !== cleanSK) {
            setDoc(doc(db, 'submissions', s.id), cleanForFirestore(processed)).catch(() => {});
          }
          // Merge device-local draft if student is still working on this device
          if (processed.status === 'sedang_mengerjakan') {
            const localDraft = loadLocalDraftFromStorage(processed.examId, processed.siswaId);
            processed = mergeLocalDraftIntoSubmission(processed, localDraft);
          }
          return processed;
        });
        setSubmissions(loadedSubs);
      },
      (err) => console.warn('Firestore Submissions Listener error:', err)
    );

    // 8. Attendance (Absensi Siswa) Listener
    const unsubAttendance = onSnapshot(
      collection(db, 'absensi'),
      (snapshot) => {
        if (snapshot.empty) {
          setAttendanceList([]);
          return;
        }
        const loadedAttendance: AttendanceRecord[] = snapshot.docs.map((d) => {
          const data = d.data() as AttendanceRecord;
          return {
            ...data,
            id: data.id || d.id,
            records: data.records || {},
          };
        });
        setAttendanceList(loadedAttendance);
      },
      (err) => console.warn('Firestore Absensi Listener error:', err)
    );

    return () => {
      unsubUsers();
      unsubRombel();
      unsubMapel();
      unsubKelasMapel();
      unsubExams();
      unsubMaterials();
      unsubSubmissions();
      unsubAttendance();
    };
  }, []);

  const login = async (
    username: string,
    password: string
  ): Promise<{ success: boolean; message?: string; blockedByPortal?: boolean }> => {
    const trimmedUser = username.trim().toLowerCase();
    const cleanUserDigits = trimmedUser.replace(/\D/g, '');
    const trimmedPass = password.trim();

    const matchUser = (u: User) => {
      const userUname = (u.username || '').toLowerCase();
      const userEmail = (u.email || '').toLowerCase();
      const userNip = (u.nip || '').toLowerCase();
      const userNipDigits = u.nip ? u.nip.replace(/\D/g, '') : '';
      const userNisn = (u.nisn || '').toLowerCase();
      const userNisnDigits = u.nisn ? u.nisn.replace(/\D/g, '') : '';

      const isUsernameMatch =
        userUname === trimmedUser ||
        userEmail === trimmedUser ||
        userNip === trimmedUser ||
        userNisn === trimmedUser ||
        (cleanUserDigits.length >= 6 &&
          (userNipDigits === cleanUserDigits || userNisnDigits === cleanUserDigits));

      return isUsernameMatch && u.password === trimmedPass;
    };

    let foundUser = users.find(matchUser);

    // Direct Firestore fetch fallback for fresh browser/cross-device login before initial sync completes
    if (!foundUser) {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        if (!usersSnap.empty) {
          const freshUsers: User[] = usersSnap.docs
            .map((d) => {
              const data = d.data() as User;
              return normalizeUser({ ...data, id: data.id || d.id });
            })
            .filter((u) => !isDeletedTeacher(u));

          if (freshUsers.length > 0) {
            setUsers((prev) => {
              const map = new Map<string, User>();
              prev.forEach((u) => map.set(u.id, u));
              freshUsers.forEach((u) => map.set(u.id, u));
              const merged = Array.from(map.values());
              try {
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(merged));
              } catch {}
              return merged;
            });

            foundUser = freshUsers.find(matchUser);
          }
        }
      } catch (err) {
        console.warn('Direct Firestore fetch during login fallback error:', err);
      }
    }

    if (foundUser) {
      if (foundUser.status === 'nonaktif') {
        return { success: false, message: 'Akun Anda dinonaktifkan oleh administrator.' };
      }

      // Single getDoc read to verify portal status before allowing non-admin login
      const latestPortal = await refreshPortalSettings(true);
      if (!latestPortal.isOpen && foundUser.role !== 'admin') {
        return {
          success: false,
          blockedByPortal: true,
          message: latestPortal.closedMessage || DEFAULT_PORTAL_SETTINGS.closedMessage,
        };
      }

      setCurrentUser(foundUser);
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(foundUser));
      } catch {}
      return { success: true };
    }

    return {
      success: false,
      message: 'Username/NIP/NISN/Email atau password salah! Silakan periksa kembali.',
    };
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
    setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser)).catch((err) =>
      console.error('Failed to sync newUser to Firestore:', err)
    );
  };

  const updateUser = (updated: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    if (currentUser?.id === updated.id) {
      setCurrentUser(updated);
    }
    setDoc(doc(db, 'users', updated.id), cleanForFirestore(updated)).catch((err) =>
      console.error('Failed to update user in Firestore:', err)
    );
  };

  const deleteUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (!target || target.username === 'darma313adi') return;
    if (target.id === currentUser?.id) return;
    if (target.role === 'admin') {
      const totalAdmins = users.filter((u) => u.role === 'admin').length;
      if (totalAdmins <= 1) return;
    }

    setUsers((prev) => prev.filter((u) => u.id !== userId));
    deleteDoc(doc(db, 'users', userId)).catch((err) =>
      console.error('Failed to delete user in Firestore:', err)
    );

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
    let validIds = userIds.filter((id) => {
      const u = users.find((user) => user.id === id);
      return u && u.username !== 'darma313adi' && u.id !== currentUser?.id;
    });
    const allAdmins = users.filter((u) => u.role === 'admin');
    const remainingAdmins = allAdmins.filter((a) => !validIds.includes(a.id));
    if (remainingAdmins.length === 0 && allAdmins.length > 0) {
      const keepAdminId = allAdmins[0].id;
      validIds = validIds.filter((id) => id !== keepAdminId);
    }
    if (validIds.length === 0) return;

    setUsers((prev) => prev.filter((u) => !validIds.includes(u.id)));
    validIds.forEach((id) => {
      deleteDoc(doc(db, 'users', id)).catch(() => {});
    });

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
    if (!target || target.username === 'darma313adi' || target.id === currentUser?.id) return;
    if (target.role === 'admin' && target.status === 'aktif') {
      const activeAdmins = users.filter((u) => u.role === 'admin' && u.status === 'aktif');
      if (activeAdmins.length <= 1) return;
    }
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
      setKelasMapelPengampuList((prev) => {
        const remaining = prev.filter((kmp) => kmp.kelasNama !== target.nama);
        const removed = prev.filter((kmp) => kmp.kelasNama === target.nama);
        removed.forEach((k) => deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {}));
        return remaining;
      });
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

      const toDelete = prev.filter(
        (kmp) => kmp.kelasNama === kelasNama && !mapelIds.includes(kmp.mapelId)
      );
      toDelete.forEach((k) => deleteDoc(doc(db, 'kelasMapelPengampu', k.id)).catch(() => {}));

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

  // --- Absensi Siswa ---
  const saveAttendance = (
    recordData: Omit<AttendanceRecord, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }
  ): AttendanceRecord => {
    const now = new Date().toISOString();
    const existing = recordData.id
      ? attendanceList.find((a) => a.id === recordData.id)
      : attendanceList.find(
          (a) =>
            a.tanggal === recordData.tanggal &&
            a.kelasNama.trim().toLowerCase() === recordData.kelasNama.trim().toLowerCase() &&
            a.guruId === recordData.guruId
        );

    const record: AttendanceRecord = {
      ...recordData,
      id:
        existing?.id ||
        recordData.id ||
        `abs_${recordData.tanggal}_${recordData.kelasNama.replace(/\s+/g, '_')}_${recordData.guruId}`,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
    };

    setAttendanceList((prev) => {
      const idx = prev.findIndex((a) => a.id === record.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = record;
        return copy;
      }
      return [record, ...prev];
    });

    setDoc(doc(db, 'absensi', record.id), cleanForFirestore(record)).catch((err) =>
      console.error('Failed to save attendance to Firestore:', err)
    );

    return record;
  };

  const deleteAttendance = (attendanceId: string) => {
    setAttendanceList((prev) => prev.filter((a) => a.id !== attendanceId));
    deleteDoc(doc(db, 'absensi', attendanceId)).catch(() => {});
  };

  const importUsers = (newUsers: Partial<User>[]): number => {
    let count = 0;
    const addedList: User[] = [];
    const updatedUserMap = new Map<string, User>();
    const newRombelsToCreate: RombelKelas[] = [];
    const existingRombelNames = new Set(rombelList.map((r) => r.nama.trim().toLowerCase()));

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

      if (userKelas) {
        ensureRombelExists(userKelas);
      }
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
        const updated: User = {
          ...existingUser,
          name: nu.name.trim(),
          email: nu.email || existingUser.email,
          role: nu.role || existingUser.role,
          kelas: userKelas !== undefined ? userKelas : existingUser.kelas,
          nip: nu.nip !== undefined ? nu.nip : existingUser.nip,
          nisn: nu.nisn !== undefined ? nu.nisn : existingUser.nisn,
          mataPelajaran: nu.mataPelajaran !== undefined ? nu.mataPelajaran : existingUser.mataPelajaran,
          kelasAjar: nu.kelasAjar !== undefined ? nu.kelasAjar : existingUser.kelasAjar,
        };
        if (nu.password && nu.password.trim() !== '') {
          updated.password = nu.password.trim();
        }

        updatedUserMap.set(existingUser.id, updated);
        setDoc(doc(db, 'users', existingUser.id), cleanForFirestore(updated)).catch(() => {});
        count++;
      } else {
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
    const alreadySubmitted = submissions.find(
      (s) => s.examId === exam.id && s.siswaId === siswa.id && s.status === 'sudah_dikumpulkan'
    );
    if (alreadySubmitted) {
      clearLocalDraftFromStorage(exam.id, siswa.id);
      alert(
        `Peringatan: Anda sudah menyelesaikan dan mengirim jawaban untuk ujian "${exam.judul}". Anda tidak dapat login kembali pada ujian yang sama.`
      );
      return alreadySubmitted;
    }

    const localDraft = loadLocalDraftFromStorage(exam.id, siswa.id);
    const existing = submissions.find(
      (s) => s.examId === exam.id && s.siswaId === siswa.id && s.status === 'sedang_mengerjakan'
    );

    if (existing) {
      const restored = mergeLocalDraftIntoSubmission(existing, localDraft);
      setActiveExam(exam);
      setActiveSubmission(restored);
      setSubmissions((prev) => prev.map((s) => (s.id === restored.id ? restored : s)));
      return restored;
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

    let newSub: ExamSubmission = {
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

    if (localDraft) {
      newSub = mergeLocalDraftIntoSubmission(newSub, localDraft);
    }

    saveLocalDraftToStorage({
      examId: exam.id,
      siswaId: siswa.id,
      submissionId: newSub.id,
      jawabanMap: newSub.jawabanMap,
      sisaWaktuDetik: newSub.sisaWaktuDetik,
      currentIndex: localDraft?.currentIndex || 0,
      violations: newSub.violations,
      updatedAt: new Date().toISOString(),
    });

    setActiveExam(exam);
    setActiveSubmission(newSub);
    setSubmissions((prev) => [
      newSub,
      ...prev.filter((s) => !(s.examId === exam.id && s.siswaId === siswa.id)),
    ]);
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

      // Simpan otomatis jawaban ke penyimpanan lokal perangkat siswa (tahan logout/reload)
      const existingDraft = loadLocalDraftFromStorage(prev.examId, prev.siswaId);
      saveLocalDraftToStorage({
        examId: prev.examId,
        siswaId: prev.siswaId,
        submissionId: prev.id,
        jawabanMap: updatedMap,
        sisaWaktuDetik: existingDraft?.sisaWaktuDetik || prev.sisaWaktuDetik,
        currentIndex: existingDraft?.currentIndex,
        violations: updatedSubmission.violations,
        updatedAt: new Date().toISOString(),
      });

      setSubmissions((subs) =>
        subs.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s))
      );
      return updatedSubmission;
    });
  };

  const updateLocalExamProgress = (sisaWaktuDetik: number, currentIndex?: number) => {
    if (!activeSubmission) return;
    const existingDraft = loadLocalDraftFromStorage(activeSubmission.examId, activeSubmission.siswaId);
    saveLocalDraftToStorage({
      examId: activeSubmission.examId,
      siswaId: activeSubmission.siswaId,
      submissionId: activeSubmission.id,
      jawabanMap: existingDraft?.jawabanMap || activeSubmission.jawabanMap,
      sisaWaktuDetik,
      currentIndex: currentIndex !== undefined ? currentIndex : existingDraft?.currentIndex,
      violations: activeSubmission.violations,
      updatedAt: new Date().toISOString(),
    });
  };

  const loadLocalExamDraft = (examId: string, siswaId: string): LocalExamDraft | null => {
    return loadLocalDraftFromStorage(examId, siswaId);
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
      const updatedViolations = [...(prev.violations || []), violation];
      const updatedSubmission: ExamSubmission = {
        ...prev,
        violations: updatedViolations,
      };

      const existingDraft = loadLocalDraftFromStorage(prev.examId, prev.siswaId);
      saveLocalDraftToStorage({
        examId: prev.examId,
        siswaId: prev.siswaId,
        submissionId: prev.id,
        jawabanMap: existingDraft?.jawabanMap || prev.jawabanMap,
        sisaWaktuDetik: existingDraft?.sisaWaktuDetik || prev.sisaWaktuDetik,
        currentIndex: existingDraft?.currentIndex,
        violations: updatedViolations,
        updatedAt: new Date().toISOString(),
      });

      setDoc(
        doc(db, 'submissions', prev.id),
        { violations: cleanForFirestore(updatedViolations) },
        { merge: true }
      ).catch(() => {});
      setSubmissions((subs) =>
        subs.map((s) => (s.id === updatedSubmission.id ? updatedSubmission : s))
      );
      return updatedSubmission;
    });
  };

  const finishAndSubmitExam = (): ExamSubmission | null => {
    if (!activeSubmission || !activeExam) return null;

    // Pastikan jawaban lokal terakhir ikut tergabung saat submit
    const localDraft = loadLocalDraftFromStorage(activeSubmission.examId, activeSubmission.siswaId);
    const mergedSub = mergeLocalDraftIntoSubmission(activeSubmission, localDraft);

    const { totalSkor, maxSkor, nilai100, evaluatedMap } = calculateExamScore(
      activeExam.soalList,
      mergedSub.jawabanMap
    );

    const completed: ExamSubmission = {
      ...mergedSub,
      jawabanMap: evaluatedMap,
      totalSkor,
      maxSkor,
      nilai100,
      waktuSelesai: new Date().toISOString(),
      status: 'sudah_dikumpulkan',
    };

    clearLocalDraftFromStorage(completed.examId, completed.siswaId);
    setActiveSubmission(completed);
    setSubmissions((subs) => subs.map((s) => (s.id === completed.id ? completed : s)));

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
    const target = submissions.find((s) => s.id === submissionId);
    if (target) {
      clearLocalDraftFromStorage(target.examId, target.siswaId);
    }
    setSubmissions((prev) => prev.filter((s) => s.id !== submissionId));
    if (activeSubmission?.id === submissionId) {
      setActiveSubmission(null);
    }
    deleteDoc(doc(db, 'submissions', submissionId)).catch((err) =>
      console.error('Failed to reset submission in Firestore:', err)
    );
  };

  const resetExamParticipant = (examId: string, studentId: string) => {
    clearLocalDraftFromStorage(examId, studentId);
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
    toRemove.forEach((s) => clearLocalDraftFromStorage(s.examId, s.siswaId));
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
    localStorage.removeItem(STORAGE_KEY_ATTENDANCE);

    setUsers(INITIAL_USERS);
    setExams(INITIAL_EXAMS);
    setSubmissions(INITIAL_SUBMISSIONS);
    setMaterials(INITIAL_MATERIALS);
    setRombelList(INITIAL_ROMBEL);
    setMataPelajaranList(INITIAL_MAPEL);
    setKelasMapelPengampuList(INITIAL_KELAS_MAPEL);
    setAttendanceList([]);
    setCurrentUser(null);
    setActiveExam(null);
    setActiveSubmission(null);

    try {
      const collectionsToClear = [
        'users',
        'rombels',
        'mataPelajaran',
        'kelasMapelPengampu',
        'exams',
        'materials',
        'submissions',
        'absensi',
      ];
      const deleteOps: Array<{ col: string; id: string }> = [];
      for (const colName of collectionsToClear) {
        const snap = await getDocs(collection(db, colName));
        snap.docs.forEach((d) => deleteOps.push({ col: colName, id: d.id }));
      }
      for (let i = 0; i < deleteOps.length; i += 450) {
        const batch = writeBatch(db);
        deleteOps.slice(i, i + 450).forEach((op) => {
          batch.delete(doc(db, op.col, op.id));
        });
        await batch.commit();
      }

      const seedOps: Array<{ col: string; id: string; data: any }> = [];
      INITIAL_USERS.forEach((u) =>
        seedOps.push({ col: 'users', id: u.id, data: cleanForFirestore(u) })
      );
      INITIAL_ROMBEL.forEach((r) =>
        seedOps.push({ col: 'rombels', id: r.id, data: cleanForFirestore(r) })
      );
      INITIAL_MAPEL.forEach((m) =>
        seedOps.push({ col: 'mataPelajaran', id: m.id, data: cleanForFirestore(m) })
      );
      INITIAL_KELAS_MAPEL.forEach((kmp) =>
        seedOps.push({ col: 'kelasMapelPengampu', id: kmp.id, data: cleanForFirestore(kmp) })
      );
      INITIAL_EXAMS.forEach((e) =>
        seedOps.push({ col: 'exams', id: e.id, data: cleanForFirestore(e) })
      );
      INITIAL_MATERIALS.forEach((m) =>
        seedOps.push({ col: 'materials', id: m.id, data: cleanForFirestore(m) })
      );
      INITIAL_SUBMISSIONS.forEach((s) =>
        seedOps.push({ col: 'submissions', id: s.id, data: cleanForFirestore(s) })
      );
      seedOps.push({
        col: 'settings',
        id: 'portal',
        data: cleanForFirestore(DEFAULT_PORTAL_SETTINGS),
      });
      setPortalSettings(DEFAULT_PORTAL_SETTINGS);
      for (let i = 0; i < seedOps.length; i += 450) {
        const batch = writeBatch(db);
        seedOps.slice(i, i + 450).forEach((op) => {
          batch.set(doc(db, op.col, op.id), op.data);
        });
        await batch.commit();
      }
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
        attendanceList,
        activeExam,
        activeSubmission,
        isCloudSynced,
        portalSettings,
        isPortalChecking,
        refreshPortalSettings,
        updatePortalSettings,
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
        saveAttendance,
        deleteAttendance,
        createExam,
        updateExam,
        deleteExam,
        addQuestionsToExam,
        addMaterial,
        deleteMaterial,
        startExamSession,
        updateStudentAnswer,
        updateLocalExamProgress,
        loadLocalExamDraft,
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
