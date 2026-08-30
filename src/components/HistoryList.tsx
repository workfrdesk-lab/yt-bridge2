import { useState, useEffect } from "react";
import { Link2, Trash2, Copy, Check, ExternalLink, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabase";
import { useConfirm } from "./ConfirmModal";

export interface HistoryItem {
  id: string;
  title: string;
  thumbnail: string;
  youtubeUrl: string;
  cloudinaryUrl: string;
  createdAt: string;
}

interface HistoryListProps {
  refreshTrigger: number;
}

export default function HistoryList({ refreshTrigger }: HistoryListProps) {
  const { confirm } = useConfirm();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
    });
  }, []);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadHistory();
    if (currentUser) {
      syncWithServer();
    }
  }, [refreshTrigger, currentUser]);

  const loadHistory = () => {
    try {
      const saved = localStorage.getItem("yt_cloudinary_history");
      if (saved) {
        setHistory(JSON.parse(saved));
      } else {
        setHistory([]);
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  };

  const syncWithServer = async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const { data } = await supabase.settings.get(currentUser.id);
      if (data && data.cloudinary_history !== undefined) {
        let historyData = [];
        if (Array.isArray(data.cloudinary_history)) {
          historyData = data.cloudinary_history;
        } else if (typeof data.cloudinary_history === 'string') {
          historyData = JSON.parse(data.cloudinary_history);
        }
        setHistory(historyData);
        localStorage.setItem("yt_cloudinary_history", JSON.stringify(historyData));
      }
    } catch (err) {
      console.error("Failed to sync history with server:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      const updated = history.filter((item) => item.id !== id);
      localStorage.setItem("yt_cloudinary_history", JSON.stringify(updated));
      setHistory(updated);
      if (currentUser) {
        await supabase.settings.update(currentUser.id, { cloudinary_history: updated });
      }
    } catch (e) {
      console.error("Failed to delete item", e);
    }
  };

  const clearAll = async () => {
    const isOk = await confirm({
      title: "مسح سجل الرفع بالكامل",
      message: "هل أنت متأكد من رغبتك في مسح جميع العناصر المحفوظة في السجل بشكل نهائي؟",
      confirmText: "مسح الكل",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!isOk) return;

    try {
      localStorage.removeItem("yt_cloudinary_history");
      setHistory([]);
      if (currentUser) {
        await supabase.settings.update(currentUser.id, { cloudinary_history: [] });
      }
    } catch (e) {
      console.error("Failed to clear history", e);
    }
  };

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy text", err);
    }
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs mt-6" id="history-panel">
      <div className="flex items-center justify-between mb-4 border-b border-slate-50 pb-3">
        <div className="flex items-center gap-2">
          <span className="w-2 h-5 rounded-full bg-indigo-500"></span>
          <h3 className="text-md font-bold text-slate-800">سجل الفيديوهات المرفوعة</h3>
          <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2.5 py-0.5 rounded-full">
            {history.length} فيديو
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={syncWithServer}
            disabled={isRefreshing}
            className={`text-xs text-indigo-500 hover:text-indigo-700 flex items-center gap-1 cursor-pointer transition-all ${isRefreshing ? 'opacity-50' : ''}`}
            title="تحديث السجل من الخادم"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>تحديث</span>
          </button>
          <button
            onClick={clearAll}
            className="text-xs text-rose-500 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح السجل</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {history.map((item, index) => (
          <div
            key={`history-${item.id || ""}-${index}`}
            className="group flex gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-all duration-200"
          >
            <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
              <img
                src={item.thumbnail}
                alt={item.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="flex flex-col justify-between overflow-hidden flex-1">
              <div className="space-y-0.5">
                <h4 className="text-xs font-semibold text-slate-700 truncate group-hover:text-indigo-600 transition-colors">
                  {item.title}
                </h4>
                <p className="text-[10px] text-slate-400">
                  {new Date(item.createdAt).toLocaleDateString("ar-EG-u-nu-latn", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <button
                  onClick={() => copyToClipboard(item.cloudinaryUrl, item.id)}
                  className="p-1.5 rounded-md bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-indigo-600 cursor-pointer transition-colors flex items-center justify-center"
                  title="نسخ رابط كلاوديناري"
                >
                  {copiedId === item.id ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>

                <a
                  href={item.cloudinaryUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 rounded-md bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-sky-600 transition-colors flex items-center justify-center"
                  title="فتح الرابط"
                >
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={item.youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] text-slate-500 hover:text-rose-500 hover:underline flex items-center gap-0.5 ml-auto truncate max-w-[120px]"
                >
                  <Link2 className="w-2.5 h-2.5 shrink-0" />
                  <span className="truncate">رابط المصدر</span>
                </a>

                <button
                  onClick={() => deleteItem(item.id)}
                  className="p-1.5 rounded-md bg-white border border-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors flex items-center justify-center ml-1"
                  title="حذف"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
