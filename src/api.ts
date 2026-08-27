import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, getDocs, doc, setDoc, 
  updateDoc, deleteDoc, addDoc, getDoc, query, orderBy, writeBatch 
} from 'firebase/firestore';
import config from '../firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, (config as any).firestoreDatabaseId || "(default)");

// Helpers
const getRole = () => localStorage.getItem('userRole') || 'Guest';
const getName = () => localStorage.getItem('userName') || 'Unknown';

async function logAction(action: string, details: string) {
  try {
    await addDoc(collection(db, 'auditLogs'), {
      timestamp: Date.now(),
      user: `[${getRole()}] ${getName()}`,
      action,
      details
    });
  } catch (e) {
    console.error('Failed to log action', e);
  }
}

// Initial Seeding for Accounts if empty
async function seedAccountsIfEmpty() {
  const accountsSnap = await getDocs(collection(db, 'accounts'));
  if (accountsSnap.empty) {
    await setDoc(doc(db, 'accounts', 'Admin'), { pin: '8888', name: 'Giáo viên chủ nhiệm' });
    await setDoc(doc(db, 'accounts', 'Manager'), { pin: '1013', name: 'Lớp phó' });
  }
}
seedAccountsIfEmpty();

export async function fetchStudents() {
  const snap = await getDocs(collection(db, 'students'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function addStudents(names: string[]) {
  const batch = writeBatch(db);
  const newStudents = [];
  for (const name of names) {
    const ref = doc(collection(db, 'students'));
    const data = { name, lastCleaned: null };
    batch.set(ref, data);
    newStudents.push({ id: ref.id, ...data });
  }
  await batch.commit();
  await logAction('Add Student', `Thêm ${names.length} học sinh mới`);
  return newStudents;
}

export async function updateStudent(id: string, name: string) {
  const ref = doc(db, 'students', id);
  await updateDoc(ref, { name });
  await logAction('Update Student', `Sửa tên học sinh thành "${name}"`);
  return { id, name };
}

export async function deleteStudent(id: string) {
  await deleteDoc(doc(db, 'students', id));
  // Delete related schedules (simple client-side fetch and delete)
  const scheds = await getDocs(collection(db, 'schedules'));
  const batch = writeBatch(db);
  scheds.docs.forEach(d => {
    if (d.data().studentId === id) {
      batch.delete(d.ref);
    }
  });
  await batch.commit();
  await logAction('Delete Student', `Xóa học sinh`);
  return { success: true };
}

export async function fetchSchedules() {
  const snap = await getDocs(collection(db, 'schedules'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function generateSchedule(dates: string[], studentsPerDay: number) {
  const students = await fetchStudents();
  if (students.length === 0) throw new Error('Danh sách học sinh trống');
  
  const schedules = await fetchSchedules();
  const keptSchedules = schedules.filter(s => !dates.includes(s.date));
  
  const dutyCounts: Record<string, number> = {};
  students.forEach(s => { dutyCounts[s.id] = 0; });
  keptSchedules.forEach(s => {
    if (dutyCounts[s.studentId] !== undefined) {
      dutyCounts[s.studentId]++;
    }
  });

  const lastCleanedMap: Record<string, number | null> = {};
  students.forEach(s => { lastCleanedMap[s.id] = s.lastCleaned || null; });

  const batch = writeBatch(db);
  let newCount = 0;

  for (const date of dates) {
    for (let i = 0; i < (studentsPerDay || 3); i++) {
      const sortedStudents = [...students].sort((a, b) => {
        const countA = dutyCounts[a.id];
        const countB = dutyCounts[b.id];
        if (countA !== countB) return countA - countB;
        
        const timeA = lastCleanedMap[a.id];
        const timeB = lastCleanedMap[b.id];
        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return -1;
        if (timeB === null) return 1;
        return timeA - timeB;
      });

      const selectedStudent = sortedStudents[0];
      
      const newRef = doc(collection(db, 'schedules'));
      let assignedTask = '';
      if (i === 0 || i === 1) assignedTask = 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)';
      if (i === 2) assignedTask = 'Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa';
      
      batch.set(newRef, {
        date,
        studentId: selectedStudent.id,
        status: 'pending',
        assignedTask
      });
      
      dutyCounts[selectedStudent.id]++;
      lastCleanedMap[selectedStudent.id] = new Date(date).getTime();
      newCount++;
    }
  }

  // Delete old schedules for these exact dates to avoid duplicates
  schedules.forEach(s => {
    if (dates.includes(s.date)) {
      batch.delete(doc(db, 'schedules', s.id));
    }
  });

  // Update students lastCleaned
  students.forEach(s => {
    if (lastCleanedMap[s.id] !== s.lastCleaned) {
      batch.update(doc(db, 'students', s.id), { lastCleaned: lastCleanedMap[s.id] });
    }
  });

  await batch.commit();
  await logAction('Generate Schedule', `Tạo lịch tự động cho ${dates.length} ngày`);
  return { success: true, count: newCount };
}

export async function updateSchedule(id: string, updates: any) {
  await updateDoc(doc(db, 'schedules', id), updates);
  await logAction('Update Schedule', `Chỉnh sửa thủ công lịch trực`);
  return { success: true };
}

export async function completeSchedule(id: string, taskContent: string, photos?: string[]) {
  const data: any = {
    status: 'completed',
    taskContent,
    completedAt: Date.now()
  };
  if (photos && photos.length > 0) {
    data.photos = photos;
  }
  await updateDoc(doc(db, 'schedules', id), data);
  await logAction('Mark Complete', `Đánh dấu hoàn thành lịch trực: ${taskContent}`);
  return { success: true };
}

export async function resetAllData() {
  const batch = writeBatch(db);
  
  const studentsSnap = await getDocs(collection(db, 'students'));
  studentsSnap.forEach(d => batch.delete(d.ref));
  
  const schedulesSnap = await getDocs(collection(db, 'schedules'));
  schedulesSnap.forEach(d => batch.delete(d.ref));
  
  const logsSnap = await getDocs(collection(db, 'auditLogs'));
  logsSnap.forEach(d => batch.delete(d.ref));
  
  await batch.commit();
  await logAction('Reset Data', 'Đã xoá toàn bộ dữ liệu (Học sinh, Lịch trực, Nhật ký)');
  return { success: true };
}

export async function fetchLogs() {
  const snap = await getDocs(collection(db, 'auditLogs'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => b.timestamp - a.timestamp);
}

export async function verifyPin(role: string, pin: string) {
  const d = await getDoc(doc(db, 'accounts', role));
  if (d.exists() && d.data().pin === pin) {
    return { success: true, name: d.data().name, role };
  }
  throw new Error('Invalid PIN');
}

export async function fetchAccounts() {
  const snap = await getDocs(collection(db, 'accounts'));
  return snap.docs.map(d => ({ role: d.id, ...d.data() }));
}

export async function updateAccount(role: string, updates: { pin?: string; name?: string }) {
  await updateDoc(doc(db, 'accounts', role), updates);
  await logAction('Update Account', `Cập nhật tài khoản ${role}`);
  return { success: true };
}

export async function deleteSchedule(id: string) {
  await deleteDoc(doc(db, 'schedules', id));
  await logAction('Delete Schedule', `Xóa lịch trực`);
  return { success: true };
}

export async function addSchedule(date: string, studentId: string) {
  const ref = doc(collection(db, 'schedules'));
  const data = { date, studentId, status: 'pending' };
  await setDoc(ref, data);
  await logAction('Add Schedule', `Thêm thủ công học sinh vào ngày ${date}`);
  return { id: ref.id, ...data };
}
