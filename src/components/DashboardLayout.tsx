import React from 'react';
import { Outlet, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Users, CalendarDays, ClipboardList, LogOut, Link as LinkIcon, AlertCircle, Image as ImageIcon } from 'lucide-react';
import { clsx } from 'clsx';

export default function DashboardLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const role = localStorage.getItem('userRole');
  const name = localStorage.getItem('userName') || 'Unknown';

  // Redirect to login if not authenticated
  if (!role || role === 'Guest') {
    return <Navigate to="/" replace />;
  }

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard/schedule', icon: CalendarDays, label: 'Lịch trực nhật' },
    { path: '/dashboard/students', icon: Users, label: 'Danh sách lớp' },
    { path: '/dashboard/photos', icon: ImageIcon, label: 'Thư viện ảnh' },
    ...(role === 'Admin' ? [
      { path: '/dashboard/accounts', icon: Users, label: 'Quản lý tài khoản' },
      { path: '/dashboard/logs', icon: ClipboardList, label: 'Nhật ký hệ thống' }
    ] : [])
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-full md:w-60 bg-slate-900 text-white flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-lg font-bold tracking-tight text-indigo-400">HỆ THỐNG</h1>
          <p className="text-xs text-slate-400 mt-1">Quản lý trực nhật</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-2 px-2">Hệ thống</div>
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={clsx(
                "flex items-center space-x-3 px-3 py-2 rounded-md text-sm transition-colors",
                location.pathname === item.path
                  ? "bg-indigo-600 text-white font-medium"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span>{item.label}</span>
            </Link>
          ))}
          
          <div className="pt-4 mt-4 border-t border-slate-800">
            <Link
              to="/public"
              target="_blank"
              className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <LinkIcon className="w-4 h-4" />
              <span>Public Link (Học sinh)</span>
            </Link>
          </div>
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
                {role === 'Admin' ? 'GV' : 'LP'}
              </div>
              <div>
                <p className="text-xs font-bold">{name}</p>
                <p className="text-[10px] text-slate-400 italic">{role === 'Admin' ? 'Giáo viên chủ nhiệm' : 'Lớp phó'}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-md transition-colors"
              title="Đăng xuất"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 flex-1 space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
