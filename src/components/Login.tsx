import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserCircle, Shield, Users } from 'lucide-react';
import { verifyPin } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState<'Admin' | 'Manager' | null>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!role) return;
    try {
      setError('');
      const res = await verifyPin(role, pin);
      localStorage.setItem('userRole', res.role);
      localStorage.setItem('userName', res.name);
      navigate('/dashboard');
    } catch (err) {
      setError('Mã PIN không chính xác.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded shadow-sm border border-slate-200 p-6 space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Quản Lý Trực Nhật</h1>
          <p className="text-xs text-slate-500 mt-1">Vui lòng chọn vai trò để đăng nhập</p>
        </div>

        {!role ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={() => setRole('Admin')}
                className="flex items-center justify-center space-x-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded shadow-sm transition-colors text-xs font-bold"
              >
                <Shield className="w-4 h-4" />
                <span>GIÁO VIÊN CHỦ NHIỆM</span>
              </button>
              <button
                onClick={() => setRole('Manager')}
                className="flex items-center justify-center space-x-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded shadow-sm transition-colors text-xs font-bold"
              >
                <UserCircle className="w-4 h-4" />
                <span>LỚP PHÓ LAO ĐỘNG</span>
              </button>
            </div>
            
            <div className="pt-2 text-center border-t border-slate-100">
              <button 
                onClick={() => navigate('/public')}
                className="text-xs font-bold text-indigo-600 hover:underline mt-4"
              >
                XEM GIAO DIỆN HỌC SINH (PUBLIC LINK)
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-sm font-bold text-center mb-4">{role === 'Admin' ? 'GIÁO VIÊN CHỦ NHIỆM' : 'LỚP PHÓ LAO ĐỘNG'}</h2>
            
            {error && <div className="p-2 bg-red-50 text-red-600 text-xs font-bold rounded text-center">{error}</div>}
            
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Mã PIN</label>
              <input 
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Nhập mã PIN"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-center tracking-widest"
                autoFocus
              />
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                type="button"
                onClick={() => { setRole(null); setPin(''); setError(''); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded transition-colors text-xs font-bold"
              >
                QUAY LẠI
              </button>
              <button
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded shadow-sm transition-colors text-xs font-bold"
              >
                ĐĂNG NHẬP
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
