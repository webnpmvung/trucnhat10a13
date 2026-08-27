import React, { useState, useEffect } from 'react';
import { Shield, UserCircle, Edit2, Check, X } from 'lucide-react';
import { fetchAccounts, updateAccount, resetAllData } from '../api';
import { AlertTriangle } from 'lucide-react';

export default function AccountManager() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPin, setEditPin] = useState('');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await fetchAccounts();
    setAccounts(data);
    setLoading(false);
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const startEdit = (acc: any) => {
    setEditingRole(acc.role);
    setEditName(acc.name);
    setEditPin(acc.pin);
  };

  const saveEdit = async () => {
    if (!editingRole || !editName.trim() || !editPin.trim()) return;
    await updateAccount(editingRole, { name: editName, pin: editPin });
    setEditingRole(null);
    loadAccounts();
  };

  if (loading) return <div className="text-xs text-slate-500 animate-pulse">Đang tải...</div>;

  return (
    <div className="space-y-6">
      <header>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Quản Lý Tài Khoản</h2>
        <p className="text-xs text-slate-500 mt-1">Cấu hình tên và mã PIN cho các vai trò.</p>
      </header>

      <div className="bg-white rounded shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              <th className="p-3 border-b border-slate-200">Vai trò</th>
              <th className="p-3 border-b border-slate-200">Tên hiển thị</th>
              <th className="p-3 border-b border-slate-200">Mã PIN</th>
              <th className="p-3 border-b border-slate-200 w-24 text-center">Thao tác</th>
            </tr>
          </thead>
          <tbody className="text-sm text-slate-700 divide-y divide-slate-100">
            {accounts.map((acc, i) => (
              <tr key={acc.role} className="hover:bg-slate-50/50">
                <td className="p-3 font-medium flex items-center space-x-2">
                  {acc.role === 'Admin' ? <Shield className="w-4 h-4 text-indigo-500" /> : <UserCircle className="w-4 h-4 text-emerald-500" />}
                  <span>{acc.role === 'Admin' ? 'GV Chủ Nhiệm' : 'Lớp Phó'}</span>
                </td>
                <td className="p-3">
                  {editingRole === acc.role ? (
                    <input 
                      type="text" 
                      value={editName} 
                      onChange={e => setEditName(e.target.value)} 
                      className="w-full px-2 py-1 text-xs border border-indigo-500 rounded outline-none" 
                    />
                  ) : (
                    acc.name
                  )}
                </td>
                <td className="p-3">
                  {editingRole === acc.role ? (
                    <input 
                      type="text" 
                      value={editPin} 
                      onChange={e => setEditPin(e.target.value)} 
                      className="w-full px-2 py-1 text-xs border border-indigo-500 rounded outline-none" 
                    />
                  ) : (
                    <span className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{acc.pin}</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  {editingRole === acc.role ? (
                    <div className="flex justify-center space-x-1">
                      <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setEditingRole(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => startEdit(acc)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


      <div className="mt-8 pt-8 border-t border-red-100">
        <h3 className="text-sm font-bold text-red-600 flex items-center mb-2">
          <AlertTriangle className="w-4 h-4 mr-2" /> Vùng nguy hiểm
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Xóa toàn bộ dữ liệu hiện có (Danh sách học sinh, Lịch phân công trực nhật, Nhật ký hệ thống). 
          Tài khoản và mã PIN sẽ KHÔNG bị xóa. Hành động này không thể hoàn tác.
        </p>
        <button 
          onClick={() => setShowResetConfirm(true)}
          className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded text-xs font-bold transition-colors"
        >
          XÓA TOÀN BỘ DỮ LIỆU (RESET)
        </button>
      </div>
    {showResetConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-red-600 flex items-center mb-4">
              <AlertTriangle className="w-5 h-5 mr-2" /> Xóa toàn bộ dữ liệu
            </h3>
            <p className="text-sm text-slate-600 mb-6">
              CẢNH BÁO: Toàn bộ học sinh và lịch trực nhật sẽ bị xoá vĩnh viễn!
              Tài khoản và mã PIN sẽ KHÔNG bị xóa. Hành động này không thể hoàn tác.
              <br /><br />
              Bạn có chắc chắn muốn XÓA TOÀN BỘ DỮ LIỆU?
            </p>
            <div className="flex justify-end space-x-3">
              <button 
                onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded"
                disabled={loading}
              >
                HỦY
              </button>
              <button 
                onClick={async () => {
                  setLoading(true);
                  await resetAllData();
                  setLoading(false);
                  setShowResetConfirm(false);
                  setResetSuccess(true);
                  setTimeout(() => setResetSuccess(false), 3000);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded disabled:opacity-50"
                disabled={loading}
              >
                {loading ? 'ĐANG XÓA...' : 'XÁC NHẬN XÓA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resetSuccess && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded max-w-sm w-full p-6 shadow-2xl text-center">
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Thành công!</h3>
            <p className="text-sm text-slate-600 mb-6">Đã xóa toàn bộ dữ liệu thành công.</p>
            <button 
              onClick={() => setResetSuccess(false)}
              className="px-4 py-2 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded"
            >
              ĐÓNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
