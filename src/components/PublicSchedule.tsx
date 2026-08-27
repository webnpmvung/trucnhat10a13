import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { fetchSchedules, fetchStudents } from '../api';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PublicSchedule() {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);

  const loadData = async () => {
    const [schedData, studData] = await Promise.all([fetchSchedules(), fetchStudents()]);
    setSchedules(schedData);
    setStudents(studData);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i)); // Mon to Sat
  };

  const days = getWeekDays();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col p-4 md:p-8 font-sans">
      <div className="max-w-4xl w-full mx-auto flex-1 flex flex-col">
        <header className="bg-white rounded shadow-sm border border-slate-200 p-6 text-center mb-6">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight uppercase">Lịch Trực Nhật Lớp</h1>
          <p className="text-slate-500 text-xs mt-1">Xem lịch phân công trực nhật</p>
          
          <div className="flex items-center justify-center space-x-2 mt-4">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs font-bold border border-slate-200"
            >
              TRƯỚC
            </button>
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-bold rounded text-[11px] border border-indigo-100">
              TUẦN {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM')}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="px-2 py-1 text-slate-500 hover:bg-slate-100 rounded text-xs font-bold border border-slate-200"
            >
              SAU
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const daySchedules = schedules.filter(s => s.date === dateStr);
            const vnDayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const isToday = dateStr === format(new Date(), 'yyyy-MM-dd');

            return (
              <div 
                key={dateStr}
                className={`bg-white rounded border-l-4 p-4 shadow-sm ${isToday ? 'border-l-indigo-500 border-t-slate-200 border-r-slate-200 border-b-slate-200' : 'border-l-slate-400 border-slate-200'}`}
              >
                <div className="flex justify-between items-center mb-3">
                  <span className={`text-[11px] uppercase font-bold tracking-wider ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                    {vnDayNames[idx]} {isToday && '(HÔM NAY)'}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {format(day, 'dd/MM')}
                  </span>
                </div>
                
                <div className="space-y-2">
                  {daySchedules.length === 0 ? (
                    <div className="text-[11px] text-slate-400 italic p-2 bg-slate-50 rounded border border-slate-100">Trống</div>
                  ) : (
                    daySchedules.map(schedule => {
                      const student = students.find(s => s.id === schedule.studentId);
                      const isCompleted = schedule.status === 'completed';
                      
                      return (
                        <div 
                          key={schedule.id}
                          className={`p-3 rounded text-xs border ${isCompleted ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}
                        >
                          <div className="font-bold text-slate-800">{student?.name || 'Unknown'}</div>
                          {schedule.assignedTask && (
                            <div className="text-[10px] text-slate-500 mt-0.5 line-clamp-1" title={schedule.assignedTask}>
                              Nhiệm vụ: {schedule.assignedTask}
                            </div>
                          )}
                          
                          {isCompleted ? (
                            <div className="mt-2 text-[10px] uppercase font-bold flex items-center text-emerald-700">
                              <CheckCircle2 className="w-3 h-3 mr-1 flex-shrink-0" />
                              <span className="truncate">Xong: {schedule.taskContent || schedule.completedBy || ''}</span>
                            </div>
                          ) : (
                            <div className="mt-2 text-[10px] uppercase font-bold text-slate-400 text-center py-1 bg-slate-100 rounded">
                              CHỜ HOÀN THÀNH
                            </div>
                          )}

                          {(schedule.photos || schedule.photoBase64) && (
                            <button 
                              onClick={() => setViewingPhoto({
                                urls: schedule.photos || [schedule.photoBase64], 
                                time: schedule.completedAt || null,
                                index: 0
                              })} 
                              className="mt-2 w-full py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold rounded transition-colors"
                            >
                              XEM ẢNH {schedule.photos?.length > 1 ? `(${schedule.photos.length})` : ''}
                            </button>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2">ĐÓNG [X]</button>
            <img src={viewingPhoto.urls[viewingPhoto.index]} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
            
            {viewingPhoto.urls.length > 1 && (
              <div className="absolute top-1/2 -translate-y-1/2 w-full flex justify-between px-4">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index - 1 + prev.urls.length) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewingPhoto(prev => prev ? { ...prev, index: (prev.index + 1) % prev.urls.length } : null)
                  }}
                  className="bg-black/50 text-white p-2 rounded-full hover:bg-black/70"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </div>
            )}
            
            <div className="absolute bottom-4 flex flex-col items-center gap-2">
              {viewingPhoto.urls.length > 1 && (
                <div className="bg-black/60 text-white text-xs px-3 py-1 rounded-full font-mono">
                  {viewingPhoto.index + 1} / {viewingPhoto.urls.length}
                </div>
              )}
              {viewingPhoto.time && (
                <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full font-mono">
                  {new Date(viewingPhoto.time).toLocaleString('vi-VN')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
