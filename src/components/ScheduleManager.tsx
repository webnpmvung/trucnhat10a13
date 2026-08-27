import React, { useState, useEffect } from 'react';
import { format, startOfWeek, addDays } from 'date-fns';
import { Sparkles, Copy, Trash, X, Edit2, Camera, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchSchedules, fetchStudents, generateSchedule, updateSchedule, deleteSchedule, completeSchedule } from '../api';
import { clsx } from 'clsx';


const TASK_OPTIONS = [
  "Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)",
  "Giặt khăn, Lau bảng, bàn GV + Tắt đèn, quạt + Khóa cửa"
];

export default function ScheduleManager() {
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [taskContent, setTaskContent] = useState('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
  const [photosBase64, setPhotosBase64] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [schedules, setSchedules] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Date context (current week)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [copyMsg, setCopyMsg] = useState('');
  const [editingScheduleId, setEditingScheduleId] = useState<string | null>(null);
  const [viewingPhoto, setViewingPhoto] = useState<{urls: string[], time: number | null, index: number} | null>(null);

  // Generation Modal State
  const daysOfCurrentWeek = Array.from({ length: 6 }).map((_, i) => addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), i));
  const [showGenModal, setShowGenModal] = useState(false);
  const [genStartDate, setGenStartDate] = useState(format(daysOfCurrentWeek[0], 'yyyy-MM-dd'));
  const [genEndDate, setGenEndDate] = useState(format(daysOfCurrentWeek[daysOfCurrentWeek.length - 1], 'yyyy-MM-dd'));
  const [genSelectedDates, setGenSelectedDates] = useState<string[]>([]);
  const [allDatesInRange, setAllDatesInRange] = useState<string[]>([]);
  const [studentsPerDay, setStudentsPerDay] = useState(3);

  useEffect(() => {
    if (!showGenModal) return;
    const start = new Date(genStartDate);
    const end = new Date(genEndDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      setAllDatesInRange([]);
      setGenSelectedDates([]);
      return;
    }
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(format(d, 'yyyy-MM-dd'));
    }
    setAllDatesInRange(dates);
    // Auto-select non-Sundays when date range changes
    setGenSelectedDates(dates.filter(d => new Date(d).getDay() !== 0));
  }, [genStartDate, genEndDate, showGenModal]);

  const toggleGenDate = (dStr: string) => {
    setGenSelectedDates(prev => prev.includes(dStr) ? prev.filter(x => x !== dStr) : [...prev, dStr].sort());
  };
  
  
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    
    for (const f of files) {
      if (f.size > 2 * 1024 * 1024) {
        setErrorMsg('Kích thước mỗi ảnh phải nhỏ hơn 2MB');
        return;
      }
    }

    const promises = files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(promises).then(results => {
      setPhotosBase64(prev => [...prev, ...results].slice(0, 5)); // Tối đa 5 ảnh
      setErrorMsg('');
    });
  };

  const submitCompletion = async () => {
    if (!taskContent.trim()) {
      setErrorMsg('Vui lòng chọn hoặc nhập nội dung công việc');
      return;
    }
    
    await completeSchedule(selectedSchedule.id, taskContent, photosBase64);
    setSuccessMsg('Đã ghi nhận hoàn thành trực nhật!');
    setTimeout(() => setSuccessMsg(''), 3000);
    setSelectedSchedule(null);
    setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
    setPhotosBase64([]);
    setErrorMsg('');
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    const [schedData, studData] = await Promise.all([fetchSchedules(), fetchStudents()]);
    setSchedules(schedData);
    setStudents(studData);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const getWeekDays = () => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
    return Array.from({ length: 6 }).map((_, i) => addDays(start, i)); // Mon to Sat
  };

  const days = getWeekDays();

  const handleAutoGenerate = async () => {
    if (genSelectedDates.length === 0) return;
    await generateSchedule(genSelectedDates, studentsPerDay);
    setShowGenModal(false);
    loadData();
  };

  const copyToZalo = () => {
    let text = `📅 Lịch Trực Nhật Tuần ${format(days[0], 'dd/MM')} - ${format(days[days.length - 1], 'dd/MM')}\n\n`;
    
    days.forEach(day => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dayName = format(day, 'EEEE');
      // Format dayname to Vietnamese
      const vnDayMap: Record<string, string> = {
        'Monday': 'Thứ 2', 'Tuesday': 'Thứ 3', 'Wednesday': 'Thứ 4',
        'Thursday': 'Thứ 5', 'Friday': 'Thứ 6', 'Saturday': 'Thứ 7'
      };
      
      const dailySchedules = schedules.filter(s => s.date === dateStr);
      text += `📍 ${vnDayMap[dayName]} (${format(day, 'dd/MM')}): `;
      
      if (dailySchedules.length === 0) {
        text += `Trống\n`;
      } else {
        const names = dailySchedules.map(s => {
          const student = students.find(st => st.id === s.studentId);
          return student ? student.name : 'Unknown';
        });
        text += names.join(', ') + '\n';
      }
    });
    
    text += `\nLink báo cáo: ${window.location.origin}/public`;
    
    navigator.clipboard.writeText(text);
    setCopyMsg('Đã copy!');
    setTimeout(() => setCopyMsg(''), 3000);
  };

  // HTML5 Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent, scheduleId: string) => {
    e.dataTransfer.setData('scheduleId', scheduleId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, targetDate: string) => {
    e.preventDefault();
    const scheduleId = e.dataTransfer.getData('scheduleId');
    if (!scheduleId) return;

    // Optimistic UI update
    const prev = [...schedules];
    setSchedules(prev => prev.map(s => s.id === scheduleId ? { ...s, date: targetDate } : s));

    try {
      await updateSchedule(scheduleId, { date: targetDate });
      loadData();
    } catch (err) {
      setSchedules(prev); // revert on error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Lịch Trực Nhật</h2>
          <p className="text-slate-500 text-xs mt-1">Kéo thả tên học sinh để đổi lịch.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center space-x-1 mr-4 bg-white border border-slate-200 rounded shadow-sm p-1">
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, -7))}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded text-xs font-bold"
            >
              TRƯỚC
            </button>
            <span className="px-3 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded">
              {format(days[0], 'dd/MM')} - {format(days[days.length - 1], 'dd/MM')}
            </span>
            <button 
              onClick={() => setCurrentDate(addDays(currentDate, 7))}
              className="px-2 py-1 text-slate-500 hover:text-slate-800 hover:bg-slate-50 rounded text-xs font-bold"
            >
              SAU
            </button>
          </div>

          <button 
            onClick={() => setShowGenModal(true)}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded shadow-sm hover:bg-indigo-700 flex items-center space-x-1"
          >
            <Sparkles className="w-3 h-3" />
            <span>TẠO LỊCH TỰ ĐỘNG</span>
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={copyToZalo}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded shadow-sm hover:bg-emerald-700 flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3" />
              <span>GỬI ZALO</span>
            </button>
            {copyMsg && <span className="text-[10px] text-emerald-600 font-bold">{copyMsg}</span>}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white rounded border border-slate-200">Đang tải dữ liệu...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {days.map((day, idx) => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const daySchedules = schedules.filter(s => s.date === dateStr);
            const vnDayNames = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
            const isWeekend = idx === 5; // Sat

            return (
              <div 
                key={dateStr}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, dateStr)}
                className={clsx(
                  "bg-white border-l-4 p-3 shadow-sm rounded border border-slate-200 flex flex-col",
                  isWeekend ? "border-l-rose-400" : "border-l-indigo-400"
                )}
              >
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase mb-2">
                  <span>{vnDayNames[idx]}</span>
                  <span className="opacity-70">{format(day, 'dd/MM')}</span>
                </div>
                
                <div className="space-y-2 flex-1 min-h-[80px]">
                  {daySchedules.length === 0 ? (
                    <div className="p-2 bg-slate-50 rounded text-[11px] border border-slate-100 italic opacity-50">Chưa phân công</div>
                  ) : (
                    daySchedules.map(schedule => {
                      const student = students.find(s => s.id === schedule.studentId);
                      const isDone = schedule.status === 'completed';
                      return (
                        <div
                          key={schedule.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, schedule.id)}
                          className={clsx(
                            "p-2 rounded text-xs border flex flex-col justify-between cursor-move transition-colors",
                            isDone 
                              ? "bg-emerald-50 border-emerald-100 text-emerald-900" 
                              : "bg-slate-50 border-slate-200 text-slate-800 hover:border-indigo-300"
                          )}
                        >
                          <div className="flex items-center justify-between group">
                            {editingScheduleId === schedule.id ? (
                              <select 
                                className="text-[10px] p-1 border rounded w-full bg-white text-slate-800 outline-none"
                                value={schedule.studentId}
                                onChange={(e) => {
                                  updateSchedule(schedule.id, { studentId: e.target.value }).then(() => {
                                    setEditingScheduleId(null);
                                    loadData();
                                  });
                                }}
                                onBlur={() => setEditingScheduleId(null)}
                                autoFocus
                              >
                                {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                              </select>
                            ) : (
                              <>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <span className="font-medium truncate">{student?.name || 'Unknown'}</span>
                                  {schedule.assignedTask && (
                                    <span className="text-[9px] font-normal text-slate-500 truncate" title={schedule.assignedTask}>{schedule.assignedTask}</span>
                                  )}
                                </div>
                                <div className="flex items-center">
                                  {isDone ? (
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)] flex-shrink-0 ml-2"></span>
                                  ) : (
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center transition-opacity">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingScheduleId(schedule.id);
                                        }}
                                        className="p-0.5 text-indigo-500 hover:bg-indigo-100 rounded mr-1"
                                        title="Đổi người"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          deleteSchedule(schedule.id).then(loadData);
                                        }}
                                        className="p-0.5 text-red-500 hover:bg-red-100 rounded"
                                        title="Xóa phân công"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center w-full justify-between">
                              {isDone ? (
                                <span className="text-[9px] uppercase font-bold opacity-60 truncate mr-2">
                                  Xong: {schedule.taskContent || schedule.completedBy || ''}
                                </span>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setSelectedSchedule({ ...schedule, studentName: student?.name });
                                    setTaskContent(schedule.assignedTask || 'Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
                                  }} 
                                  className="text-[9px] bg-indigo-600 text-white px-2 py-0.5 rounded font-bold hover:bg-indigo-700 cursor-pointer mr-2"
                                >
                                  ĐÁNH DẤU HOÀN THÀNH
                                </button>
                              )}
                              
                              {(schedule.photos || schedule.photoBase64) && (
                                <button 
                                  onClick={() => setViewingPhoto({
                                    urls: schedule.photos || [schedule.photoBase64], 
                                    time: schedule.completedAt || null,
                                    index: 0
                                  })} 
                                  className="text-[9px] bg-indigo-100 text-indigo-700 px-1 py-0.5 rounded font-bold hover:bg-indigo-200 cursor-pointer"
                                >
                                  XEM ẢNH {schedule.photos?.length > 1 ? `(${schedule.photos.length})` : ''}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Generate Schedule Modal */}
      {showGenModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded shadow-xl max-w-md w-full p-5 flex flex-col border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Tạo Lịch Tự Động</h3>
              <button onClick={() => setShowGenModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Từ ngày</label>
                <input type="date" value={genStartDate} onChange={e => setGenStartDate(e.target.value)} className="w-full text-xs border border-slate-300 rounded p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Đến ngày</label>
                <input type="date" value={genEndDate} onChange={e => setGenEndDate(e.target.value)} className="w-full text-xs border border-slate-300 rounded p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Số HS mỗi ngày</label>
              <input type="number" min="1" max="10" value={studentsPerDay} onChange={e => setStudentsPerDay(Number(e.target.value))} className="w-full text-xs border border-slate-300 rounded p-2 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </div>

            <div className="mb-5">
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Chọn các ngày phân công (bỏ qua ngày nghỉ)</label>
              <div className="max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded p-2 grid grid-cols-2 gap-2">
                {allDatesInRange.length === 0 && <div className="col-span-2 text-xs text-slate-400 italic">Không có ngày hợp lệ</div>}
                {allDatesInRange.map(dStr => {
                  const isSelected = genSelectedDates.includes(dStr);
                  const dayName = format(new Date(dStr), 'EEEE');
                  const vnDayMap: Record<string, string> = { 'Monday': 'T2', 'Tuesday': 'T3', 'Wednesday': 'T4', 'Thursday': 'T5', 'Friday': 'T6', 'Saturday': 'T7', 'Sunday': 'CN' };
                  return (
                    <label key={dStr} className="flex items-center space-x-2 text-xs cursor-pointer bg-white p-1.5 border border-slate-200 rounded hover:bg-indigo-50 transition-colors">
                      <input type="checkbox" checked={isSelected} onChange={() => toggleGenDate(dStr)} className="rounded text-indigo-600 focus:ring-indigo-500" />
                      <span className="font-medium text-slate-700">{vnDayMap[dayName]} - {format(new Date(dStr), 'dd/MM')}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button onClick={() => setShowGenModal(false)} className="px-3 py-1.5 text-xs font-bold text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-50">HỦY</button>
              <button onClick={handleAutoGenerate} disabled={genSelectedDates.length === 0} className="px-3 py-1.5 text-xs font-bold bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed">PHÂN CÔNG NGAY</button>
            </div>
          </div>
        </div>
      )}
      {selectedSchedule && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Báo cáo trực nhật</h3>
            <p className="text-gray-500 text-sm mb-6">Xác nhận hoàn thành cho: <strong className="text-gray-800">{selectedSchedule.studentName}</strong></p>
            
            <div className="space-y-4">
              {errorMsg && <div className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100 font-bold">{errorMsg}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung công việc</label>
                <select 
                  value={TASK_OPTIONS.includes(taskContent) ? taskContent : 'Khác'}
                  onChange={(e) => setTaskContent(e.target.value === 'Khác' ? '' : e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-2"
                >
                  {TASK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  <option value="Khác">Khác...</option>
                </select>
                {!TASK_OPTIONS.includes(taskContent) && (
                  <input 
                    type="text" 
                    value={taskContent}
                    onChange={(e) => setTaskContent(e.target.value)}
                    placeholder="Nhập nội dung công việc khác..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ảnh xác thực (Tùy chọn - Tối đa 5 ảnh)</label>
                {photosBase64.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {photosBase64.map((p, i) => (
                      <div key={i} className="relative w-16 h-16 rounded overflow-hidden shadow-sm border border-slate-200 group">
                        <img src={p} alt="Preview" className="w-full h-full object-cover" />
                        <button 
                          onClick={(e) => { e.stopPropagation(); setPhotosBase64(prev => prev.filter((_, idx) => idx !== i)); }}
                          className="absolute top-0 right-0 bg-red-500 text-white p-0.5 rounded-bl opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photosBase64.length < 5 && (
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-16 h-16 border-2 border-dashed border-gray-300 rounded flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer"
                      >
                        <Camera className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-blue-400 transition-colors cursor-pointer relative"
                  >
                    <Camera className="w-6 h-6 mb-2" />
                    <span className="text-xs">Bấm để tải ảnh lên (Hỗ trợ nhiều ảnh)</span>
                  </div>
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handlePhotoUpload}
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button 
                  onClick={() => {
                    setSelectedSchedule(null);
                    setPhotosBase64([]);
                    setTaskContent('Quét lớp + Thay túi rác, đổ rác (2 lần, đầu & cuối buổi học)');
                    setErrorMsg('');
                  }}
                  className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded transition-colors"
                >
                  HỦY
                </button>
                <button 
                  onClick={submitCompletion}
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded shadow-sm transition-colors"
                >
                  GỬI BÁO CÁO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {viewingPhoto && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60]" onClick={() => setViewingPhoto(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center justify-center" onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewingPhoto(null)} className="absolute -top-10 right-0 text-white font-bold p-2">ĐÓNG [X]</button>
            <img src={viewingPhoto} alt="Xác thực" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}
