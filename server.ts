import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { randomUUID } from 'crypto';
import fs from 'fs';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// --- In-Memory Data Store (Resets on restart) ---
interface Account {
  role: 'Admin' | 'Manager';
  pin: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  lastCleaned: number | null;
}

interface Schedule {
  id: string;
  date: string; // YYYY-MM-DD
  studentId: string;
  status: 'pending' | 'completed';
  completedBy?: string;
  completedAt?: number;
  photoBase64?: string;
}

interface AuditLog {
  id: string;
  timestamp: number;
  user: string;
  action: string;
  details: string;
}

let students: Student[] = [
  { id: '1', name: 'Nguyễn Văn A', lastCleaned: null },
  { id: '2', name: 'Trần Thị B', lastCleaned: null },
  { id: '3', name: 'Lê Hoàng C', lastCleaned: null },
  { id: '4', name: 'Phạm D', lastCleaned: null },
  { id: '5', name: 'Hoàng E', lastCleaned: null },
];
let schedules: Schedule[] = [];
let auditLogs: AuditLog[] = [];

let accounts: Account[] = [
  { role: 'Admin', pin: '8888', name: 'Giáo viên chủ nhiệm' },
  { role: 'Manager', pin: '1013', name: 'Lớp phó' }
];

// Helper to log actions
const logAction = (user: string, action: string, details: string) => {
  auditLogs.push({
    id: randomUUID(),
    timestamp: Date.now(),
    user: user || 'Unknown',
    action,
    details,
  });
};

// Extract user info from headers
const getUser = (req: express.Request) => {
  const role = req.headers['x-user-role'] as string || 'Guest';
  const nameEncoded = req.headers['x-user-name'] as string || '';
  const name = nameEncoded ? decodeURIComponent(nameEncoded) : 'Unknown';
  return `[${role}] ${name}`;
};

// --- API ENDPOINTS ---

// LOGIN Verification
app.post('/api/login', (req, res) => {
  const { role, pin } = req.body;
  const account = accounts.find(a => a.role === role && a.pin === pin);
  
  if (account) {
    res.json({ success: true, name: account.name, role: account.role });
  } else {
    res.status(401).json({ error: 'Mã PIN không chính xác' });
  }
});

// GET Accounts
app.get('/api/accounts', (req, res) => {
  res.json(accounts);
});

// UPDATE Account
app.put('/api/accounts/:role', (req, res) => {
  const user = getUser(req);
  const { role } = req.params;
  const { pin, name } = req.body;
  const account = accounts.find(a => a.role === role);
  if (!account) return res.status(404).json({ error: 'Not found' });
  
  account.pin = pin || account.pin;
  account.name = name || account.name;
  
  logAction(user, 'Update Account', `Cập nhật tài khoản ${role}`);
  res.json(account);
});

// GET Students
app.get('/api/students', (req, res) => {
  res.json(students);
});

// ADD Students (Supports bulk/copy-paste)
app.post('/api/students', (req, res) => {
  const user = getUser(req);
  const { names } = req.body; // array of strings
  if (!Array.isArray(names)) {
    return res.status(400).json({ error: 'Expected an array of names' });
  }
  const newStudents = names.map(n => ({ id: randomUUID(), name: n, lastCleaned: null }));
  students.push(...newStudents);
  logAction(user, 'Add Student', `Thêm ${names.length} học sinh mới`);
  res.json(newStudents);
});

// UPDATE Student
app.put('/api/students/:id', (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const { name } = req.body;
  const student = students.find(s => s.id === id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  
  const oldName = student.name;
  student.name = name;
  logAction(user, 'Update Student', `Sửa tên học sinh từ "${oldName}" thành "${name}"`);
  res.json(student);
});

// DELETE Student
app.delete('/api/students/:id', (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const student = students.find(s => s.id === id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  
  students = students.filter(s => s.id !== id);
  // Also remove from schedules
  schedules = schedules.filter(s => s.studentId !== id);
  
  logAction(user, 'Delete Student', `Xóa học sinh "${student.name}"`);
  res.json({ success: true });
});

// GET Schedules
app.get('/api/schedules', (req, res) => {
  res.json(schedules);
});

// AUTO-GENERATE Schedules
app.post('/api/schedules/generate', (req, res) => {
  const user = getUser(req);
  const { dates, studentsPerDay } = req.body;
  
  if (!Array.isArray(dates) || dates.length === 0) {
    return res.status(400).json({ error: 'Invalid dates array' });
  }

  const perDay = studentsPerDay || 3;
  const newSchedules: Schedule[] = [];
  
  if (students.length === 0) {
    return res.status(400).json({ error: 'Danh sách học sinh trống' });
  }

  // Calculate existing duties, EXCLUDING the dates we are going to overwrite
  const keptSchedules = schedules.filter(s => !dates.includes(s.date));
  const dutyCounts: Record<string, number> = {};
  students.forEach(s => { dutyCounts[s.id] = 0; });
  keptSchedules.forEach(s => {
    if (dutyCounts[s.studentId] !== undefined) {
      dutyCounts[s.studentId]++;
    }
  });

  // Track simulated lastCleaned
  const lastCleanedMap: Record<string, number | null> = {};
  students.forEach(s => { lastCleanedMap[s.id] = s.lastCleaned; });

  for (const date of dates) {
    for (let i = 0; i < perDay; i++) {
      // Sort students based on: 1. Fewest duties, 2. Longest time since last cleaned
      const sortedStudents = [...students].sort((a, b) => {
        const countA = dutyCounts[a.id];
        const countB = dutyCounts[b.id];
        if (countA !== countB) {
          return countA - countB;
        }
        
        // Tie-breaker: lastCleaned
        const timeA = lastCleanedMap[a.id];
        const timeB = lastCleanedMap[b.id];
        if (timeA === null && timeB === null) return 0;
        if (timeA === null) return -1;
        if (timeB === null) return 1;
        return timeA - timeB;
      });

      const selectedStudent = sortedStudents[0];
      
      newSchedules.push({
        id: randomUUID(),
        date,
        studentId: selectedStudent.id,
        status: 'pending'
      });
      
      dutyCounts[selectedStudent.id]++;
      lastCleanedMap[selectedStudent.id] = new Date(date).getTime();
    }
  }

  // Apply changes to database
  schedules = keptSchedules;
  schedules.push(...newSchedules);
  
  students.forEach(s => {
    s.lastCleaned = lastCleanedMap[s.id];
  });

  logAction(user, 'Generate Schedule', `Tạo lịch tự động cho ${dates.length} ngày`);
  res.json({ success: true, count: newSchedules.length });
});

// UPDATE Schedule (Drag and drop)
app.put('/api/schedules/:id', (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const { date, studentId } = req.body;
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return res.status(404).json({ error: 'Not found' });
  
  schedule.date = date || schedule.date;
  schedule.studentId = studentId || schedule.studentId;
  
  logAction(user, 'Update Schedule', `Chỉnh sửa thủ công lịch trực của ID: ${id}`);
  res.json(schedule);
});

// DELETE Schedule
app.delete('/api/schedules/:id', (req, res) => {
  const user = getUser(req);
  const { id } = req.params;
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return res.status(404).json({ error: 'Not found' });
  
  schedules = schedules.filter(s => s.id !== id);
  
  logAction(user, 'Delete Schedule', `Xóa lịch trực ngày ${schedule.date}`);
  res.json({ success: true });
});

// ADD manual schedule
app.post('/api/schedules', (req, res) => {
  const user = getUser(req);
  const { date, studentId } = req.body;
  if (!date || !studentId) return res.status(400).json({ error: 'Missing date or studentId' });

  const newSchedule: Schedule = {
    id: randomUUID(),
    date,
    studentId,
    status: 'pending'
  };
  schedules.push(newSchedule);
  
  logAction(user, 'Add Schedule', `Thêm thủ công học sinh vào ngày ${date}`);
  res.json(newSchedule);
});

// MARK SCHEDULE COMPLETE (Public Link)
app.post('/api/schedules/:id/complete', (req, res) => {
  const { id } = req.params;
  const { completedBy, photoBase64 } = req.body;
  
  const schedule = schedules.find(s => s.id === id);
  if (!schedule) return res.status(404).json({ error: 'Not found' });
  
  schedule.status = 'completed';
  schedule.completedBy = completedBy;
  schedule.completedAt = Date.now();
  if (photoBase64) {
    schedule.photoBase64 = photoBase64;
  }
  
  const student = students.find(s => s.id === schedule.studentId);
  const studentName = student ? student.name : 'Unknown';
  
  logAction('Public', 'Mark Complete', `Đánh dấu hoàn thành lịch trực ngày ${schedule.date} cho học sinh ${studentName} bởi ${completedBy}`);
  res.json(schedule);
});

// GET Audit Logs
app.get('/api/logs', (req, res) => {
  res.json(auditLogs.sort((a, b) => b.timestamp - a.timestamp));
});

// --- VITE MIDDLEWARE ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
