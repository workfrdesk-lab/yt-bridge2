import { useState, useEffect } from "react";
import { Loader2, RefreshCw, Terminal, X } from "lucide-react";

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

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-slate-900 text-slate-300 rounded-xl shadow-2xl border border-slate-700 flex flex-col z-50 overflow-hidden">
      <div className="p-3 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <h3 className="text-xs font-bold text-white">سجلات النظام (Admin Logs)</h3>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="p-1 hover:bg-slate-700 rounded transition-colors">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
          </button>
          <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-slate-700 rounded transition-colors">
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>
      <div className="p-2 text-[10px] overflow-y-auto flex-1 font-mono space-y-1">
        {logs.length === 0 && <p className="text-center p-4">لا توجد سجلات حالياً.</p>}
        {logs.map(log => (
          <div key={log.id} className="border-b border-slate-800 pb-1">
            <span className="text-slate-500">[{new Date(log.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}]</span>
            <span className={`mx-1 ${log.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
              [{log.status}]
            </span>
            <span className="text-white">{log.message}</span>
            {log.video_title && <div className="text-slate-500 truncate">الفيديو: {log.video_title}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
