import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, ClipboardType } from 'lucide-react';
import { fetchStudents, addStudents, deleteStudent, updateStudent } from '../api';

export default function StudentManager() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [bulkInput, setBulkInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadStudents = async () => {
    setLoading(true);
    const data = await fetchStudents();
    setStudents(data);
    setLoading(false);
  };

  useEffect(() => {
    loadStudents();
  }, []);

  const handleAddBulk = async () => {
    if (!bulkInput.trim()) return;
    const names = bulkInput.split('\n').map(n => n.trim()).filter(n => n);
    if (names.length > 0) {
      await addStudents(names);
      setBulkInput('');
      setIsAdding(false);
      loadStudents();
    }
  };

  const handleDelete = async (id: string) => {
    await deleteStudent(id);
    setConfirmDeleteId(null);
    loadStudents();
  };

  const startEdit = (student: any) => {
    setEditingId(student.id);
    setEditName(student.name);
  };

  const saveEdit = async () => {
    if (editingId && editName.trim()) {
      await updateStudent(editingId, editName.trim());
      setEditingId(null);
      loadStudents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Danh sách Học sinh</h2>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 flex items-center space-x-1"
        >
          <Plus className="w-3 h-3" />
          <span>THÊM HỌC SINH</span>
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-4 rounded shadow-sm border border-slate-200">
          <div className="flex items-center space-x-2 mb-2 text-slate-700">
            <ClipboardType className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-tight">Thêm nhiều (Mỗi tên 1 dòng)</span>
          </div>
          <p className="text-[10px] text-slate-500 mb-3">Copy/paste trực tiếp từ Excel vào đây.</p>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            rows={5}
            className="w-full border border-slate-300 rounded p-3 text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
            placeholder="Nguyễn Văn A&#10;Trần Thị B..."
          />
          <div className="mt-3 flex justify-end space-x-2">
            <button 
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50"
            >
              HỦY
            </button>
            <button 
              onClick={handleAddBulk}
              className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              LƯU DANH SÁCH
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">Đang tải dữ liệu...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
              <tr>
                <th className="px-4 py-2 border-b border-slate-200">STT</th>
                <th className="px-4 py-2 border-b border-slate-200">Họ và Tên</th>
                <th className="px-4 py-2 border-b border-slate-200">Lần trực gần nhất</th>
                <th className="px-4 py-2 border-b border-slate-200 text-center w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {students.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500 italic">Chưa có học sinh nào.</td></tr>
              ) : (
                students.map((student, idx) => (
                  <tr key={student.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {editingId === student.id ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                          className="border border-indigo-400 rounded px-2 py-1 outline-none text-xs w-full max-w-xs"
                        />
                      ) : (
                        student.name
                      )}
                    </td>
                    <td className="px-4 py-2 text-slate-500">
                      {student.lastCleaned ? new Date(student.lastCleaned).toLocaleDateString('vi-VN') : 'Chưa trực'}
                    </td>
                    <td className="px-4 py-2">
                      {editingId === student.id ? (
                        <div className="flex justify-center space-x-1">
                          <button onClick={saveEdit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ) : confirmDeleteId === student.id ? (
                        <div className="flex justify-center items-center space-x-1">
                          <span className="text-[9px] text-red-500 font-bold tracking-tight">XÓA?</span>
                          <button onClick={() => handleDelete(student.id)} className="p-1 text-white bg-red-500 hover:bg-red-600 rounded shadow-sm"><Check className="w-3 h-3" /></button>
                          <button onClick={() => setConfirmDeleteId(null)} className="p-1 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded"><X className="w-3 h-3" /></button>
                        </div>
                      ) : (
                        <div className="flex justify-center space-x-1">
                          <button onClick={() => startEdit(student)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDeleteId(student.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
