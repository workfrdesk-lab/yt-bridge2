import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Terminal, X, Minus, ChevronUp } from "lucide-react";

interface LogItem {
  id: string;
  channel_name: string;
  video_title: string;
  status: string;
  message: string;
  created_at: string;
}

export default function AdminLogs({ userId }: { userId: string }) {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  const fetchLogs = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/logs?user_id=${userId}`);
      if (!response.ok) {
        if (response.status === 403) {
          // User is not an admin, clear logs or hide
          setLogs([]);
          return;
        }
        throw new Error(`Server returned status ${response.status}`);
      }
      const data = await response.json();
      if (Array.isArray(data)) {
        setLogs(data);
      }
    } catch (err) {
      console.warn("Could not load admin logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10000); // Poll every 10s
    return () => clearInterval(interval);
  }, [userId]);

  if (!isOpen) return null;

  // Minimized floating bar at the bottom
  if (isMinimized) {
    return (
      <div 
        id="admin-logs-minimized"
        className="fixed bottom-4 right-4 bg-slate-900/95 hover:bg-slate-900 text-slate-300 rounded-xl shadow-2xl border border-slate-700 hover:border-slate-500 flex items-center gap-3 px-3.5 py-2.5 z-50 transition-all duration-200 cursor-pointer backdrop-blur-md"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          </div>
          <span className="text-xs font-bold text-white">سجلات النظام</span>
          {logs.length > 0 && (
            <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {logs.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <button 
            id="admin-logs-min-refresh"
            onClick={fetchLogs} 
            title="تحديث" 
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button 
            id="admin-logs-maximize-btn"
            onClick={() => setIsMinimized(false)} 
            title="تكبير السجلات" 
            className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 rounded transition-colors flex items-center gap-1 text-[11px]"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>
          <button 
            id="admin-logs-min-close"
            onClick={() => setIsOpen(false)} 
            title="إغلاق" 
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Expanded Window
  return (
    <div id="admin-logs-expanded" className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-900 text-slate-300 rounded-xl shadow-2xl border border-slate-700 flex flex-col z-50 overflow-hidden transition-all duration-200">
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">سجلات النظام (Admin Logs)</h3>
          {logs.length > 0 && (
            <span className="text-[10px] bg-slate-900 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded-full font-mono">
              {logs.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button 
            id="admin-logs-refresh-btn"
            onClick={fetchLogs} 
            title="تحديث السجلات" 
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" /> : <RefreshCw className="w-3.5 h-3.5" />}
          </button>
          <button 
            id="admin-logs-minimize-btn"
            onClick={() => setIsMinimized(true)} 
            title="تصغير إلى الأسفل" 
            className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-700 rounded transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button 
            id="admin-logs-close-btn"
            onClick={() => setIsOpen(false)} 
            title="إغلاق" 
            className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="p-2.5 text-[10px] overflow-y-auto flex-1 font-mono space-y-1.5 scrollbar-thin">
        {logs.length === 0 && <p className="text-center p-4 text-slate-500">لا توجد سجلات حالياً.</p>}
        {logs.map(log => (
          <div key={log.id} className="border-b border-slate-800 pb-1.5 last:border-0">
            <span className="text-slate-500">[{new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]</span>
            <span className={`mx-1 font-bold ${log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              [{log.status}]
            </span>
            <span className="text-slate-200">{log.message}</span>
            {log.video_title && <div className="text-slate-500 truncate mt-0.5">الفيديو: {log.video_title}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

