/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import DashboardLayout from './components/DashboardLayout';
import StudentManager from './components/StudentManager';
import ScheduleManager from './components/ScheduleManager';
import AuditLogs from './components/AuditLogs';
import PublicSchedule from './components/PublicSchedule';
import PhotoGallery from './components/PhotoGallery';
import AccountManager from './components/AccountManager';

export default function App() {
  // Clear auth data on refresh (F5) or tab close
  useEffect(() => {
    const handleBeforeUnload = () => {
      localStorage.removeItem('userRole');
      localStorage.removeItem('userName');
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  
  // Anti-Tamper Security Measures
  useEffect(() => {
    // 1. Chống chuột phải (Right-click)
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. Chống copy (Ctrl+C)
    const handleCopy = (e) => {
      e.preventDefault();
      // Optional: alert('Hành động copy không được phép!');
    };
    document.addEventListener('copy', handleCopy);

    // 3. Chống các phím tắt DevTools (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
    const handleKeyDown = (e) => {
      // F12
      if (e.keyCode === 123) {
        e.preventDefault();
      }
      // Ctrl+Shift+I
      if (e.ctrlKey && e.shiftKey && e.keyCode === 73) {
        e.preventDefault();
      }
      // Ctrl+Shift+J
      if (e.ctrlKey && e.shiftKey && e.keyCode === 74) {
        e.preventDefault();
      }
      // Ctrl+U (View Source)
      if (e.ctrlKey && e.keyCode === 85) {
        e.preventDefault();
      }
      // Ctrl+S (Save as)
      if (e.ctrlKey && e.keyCode === 83) {
        e.preventDefault();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 4. Anti-Debugger Loop (Làm sập console nếu mở)
    const antiDebug = setInterval(() => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      // Nếu debugger chạy, thời gian sẽ lớn hơn 100ms
      if (end - start > 500) {
        document.body.innerHTML = '<h1 style="color:red; text-align:center; margin-top:20%">Hệ thống phát hiện hành động can thiệp bất hợp pháp. Đã khóa phiên làm việc.</h1>';
      }
    }, 1000);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(antiDebug);
    };
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/dashboard/schedule" />} />
          <Route path="students" element={<StudentManager />} />
          <Route path="schedule" element={<ScheduleManager />} />
          <Route path="photos" element={<PhotoGallery />} />
          <Route path="logs" element={<AuditLogs />} />
          <Route path="accounts" element={<AccountManager />} />
        </Route>
        <Route path="/public" element={<PublicSchedule />} />
      </Routes>
    </Router>
  );
}
