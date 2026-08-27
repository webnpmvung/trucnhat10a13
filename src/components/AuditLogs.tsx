import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { fetchLogs } from '../api';

export default function AuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadLogs = async () => {
      const data = await fetchLogs();
      setLogs(data);
      setLoading(false);
    };
    loadLogs();
  }, []);

  const downloadCSV = () => {
    if (logs.length === 0) return;
    const header = ['Thời gian', 'Người dùng', 'Hành động', 'Chi tiết'];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString('vi-VN'),
      `"${l.user}"`,
      `"${l.action}"`,
      `"${l.details}"`
    ]);
    
    const csvContent = [header.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `nhat_ky_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Nhật ký Hệ thống</h2>
        <button 
          onClick={downloadCSV}
          className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-sm hover:bg-slate-50 flex items-center space-x-1"
        >
          <Download className="w-3 h-3" />
          <span>XUẤT FILE CSV</span>
        </button>
      </div>

      <div className="bg-white rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
        {loading ? (
          <div className="p-6 text-center text-xs text-slate-500">Đang tải nhật ký...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 sticky top-0">
              <tr>
                <th className="px-4 py-2 border-b border-slate-200 w-48">Thời gian</th>
                <th className="px-4 py-2 border-b border-slate-200 w-48">Người dùng</th>
                <th className="px-4 py-2 border-b border-slate-200 w-48">Hành động</th>
                <th className="px-4 py-2 border-b border-slate-200">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500 italic">Chưa có bản ghi nào.</td></tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-400 font-mono">
                      {new Date(log.timestamp).toLocaleString('vi-VN', {
                        month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
                      })}
                    </td>
                    <td className="px-4 py-2 font-medium text-slate-800">
                      {log.user}
                    </td>
                    <td className="px-4 py-2">
                      <span className="text-indigo-600 font-medium text-[11px] uppercase tracking-wide">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600">
                      {log.details}
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
