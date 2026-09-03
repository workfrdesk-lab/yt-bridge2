import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useConfirm } from "./ConfirmModal";
import { 
  Clock, Trash2, Play, CheckCircle2, XCircle, 
  Loader2, AlertTriangle, Sparkles, RefreshCw, ExternalLink, Pause,
  Tv, ChevronDown, ChevronUp, Layers, Globe
} from "lucide-react";

interface ScheduledClone {
  id: string;
  video_id: string;
  video_title: string;
  video_url: string;
  thumbnail_url: string;
  target_platform: string;
  target_profile_id: string;
  channel_name?: string;
  bypass_settings: {
    hflip?: boolean;
    speedUp?: boolean;
    colorBoost?: boolean;
    pitchShift?: boolean;
    channel_name?: string;
    enableLogo?: boolean;
    logoUrl?: string;
    enableCaption?: boolean;
    caption_template_id?: string | null;
    caption_text_source?: string;
    caption_custom_text?: string;
    [key: string]: any;
  };
  scheduled_time: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  error_message?: string;
  created_at: string;
}

interface PublishingProfile {
  id: string;
  platform: "zernio" | "buffer";
  service: string;
  formatted_service: string;
  service_username: string;
  avatar?: string;
  account_name?: string;
  account_id?: string;
}

export function ScheduledClonesQueue() {
  const { confirm } = useConfirm();
  const [clones, setClones] = useState<ScheduledClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [openChannels, setOpenChannels] = useState<Record<string, boolean>>({});
  const [publishingProfiles, setPublishingProfiles] = useState<Record<string, PublishingProfile>>({});
  const [channelTargets, setChannelTargets] = useState<Record<string, any>>({});

  const fetchProfiles = async () => {
    try {
      const res = await fetch("/api/db/publishing_profiles");
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) {
          setPublishingProfiles(data.profiles);
        }
        if (data.channelTargets) {
          setChannelTargets(data.channelTargets);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch profiles:", e);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const isUserAdmin = user.email?.toLowerCase() === "aamaanaah22@gmail.com" || user.role === "admin";
        let query = supabase.from("scheduled_clones").select("*");
        if (!isUserAdmin) {
          query = query.eq("user_id", user.id);
        }
        const { data, error } = await query;
        if (error) throw error;
        setClones(data || []);
      } else {
        setClones([]);
      }
      setError(null);
      fetchProfiles();
    } catch (err: any) {
      console.error("Failed to load scheduled clones queue:", err);
      setError("فشل تحميل قائمة الجدولة التلقائية.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    fetchProfiles();
    // Refresh queue automatically every 15 seconds
    const interval = setInterval(() => {
      fetchQueue();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleRetry = async (id: string) => {
    setActionId(id);
    try {
      const nowIso = new Date().toISOString();
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ 
          status: 'pending',
          scheduled_time: nowIso,
          error_message: null
        })
        .eq("id", id);
      
      if (error) throw error;
      
      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: 'pending', scheduled_time: nowIso, error_message: undefined } : item
        )
      );
    } catch (err: any) {
      alert("فشل إعادة المحاولة: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleRetryAllFailed = async (itemsToRetry?: ScheduledClone[]) => {
    const failedItems = itemsToRetry || clones.filter(i => i.status === "failed");
    if (failedItems.length === 0) return;

    setLoading(true);
    try {
      const nowIso = new Date().toISOString();
      const ids = failedItems.map(i => i.id);
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ 
          status: 'pending',
          scheduled_time: nowIso,
          error_message: null
        })
        .in("id", ids);
      
      if (error) throw error;
      
      setClones((prev) =>
        prev.map((item) =>
          ids.includes(item.id) ? { ...item, status: 'pending', scheduled_time: nowIso, error_message: undefined } : item
        )
      );
    } catch (err: any) {
      alert("فشل إعادة محاولة الفيديوهات: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'paused') => {
    setActionId(id);
    try {
      const updatePayload: any = { status: newStatus };
      if (newStatus === 'pending') {
        updatePayload.error_message = null;
      }
      const { error } = await supabase
        .from("scheduled_clones")
        .update(updatePayload)
        .eq("id", id);
      
      if (error) throw error;
      
      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus, error_message: newStatus === 'pending' ? undefined : item.error_message } : item
        )
      );
    } catch (err: any) {
      alert("فشل تحديث حالة الفيديو: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handlePauseChannel = async (chName: string, channelItems: ScheduledClone[]) => {
    const pendingItems = channelItems.filter(i => i.status === "pending" || !i.status);
    if (pendingItems.length === 0) {
      alert("لا توجد فيديوهات بانتظار النشر لهذه القناة لإيقافها مؤقتاً.");
      return;
    }

    const isOk = await confirm({
      title: "إيقاف مؤقت لجدولة القناة",
      message: `هل تريد إيقاف جدولة ${pendingItems.length} فيديو لقناة "${chName}" مؤقتاً؟`,
      confirmText: "إيقاف مؤقت",
      cancelText: "إلغاء",
      variant: "warning",
    });
    if (!isOk) return;

    setLoading(true);
    try {
      const idsToPause = pendingItems.map(i => i.id);
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ status: "paused" })
        .in("id", idsToPause);

      if (error) throw error;

      setClones((prev) =>
        prev.map((item) =>
          idsToPause.includes(item.id) ? { ...item, status: "paused" } : item
        )
      );
    } catch (err: any) {
      alert("فشل إيقاف جدولة القناة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResumeChannel = async (chName: string, channelItems: ScheduledClone[]) => {
    const pausedItems = channelItems.filter(i => i.status === "paused");
    if (pausedItems.length === 0) {
      alert("لا توجد فيديوهات موقوفة مؤقتاً لهذه القناة لاستئنافها.");
      return;
    }

    const isOk = await confirm({
      title: "استئناف جدولة القناة",
      message: `هل تريد استئناف جدولة ${pausedItems.length} فيديو لقناة "${chName}"؟`,
      confirmText: "استئناف النشر",
      cancelText: "إلغاء",
      variant: "warning",
    });
    if (!isOk) return;

    setLoading(true);
    try {
      const idsToResume = pausedItems.map(i => i.id);
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ status: "pending" })
        .in("id", idsToResume);

      if (error) throw error;

      setClones((prev) =>
        prev.map((item) =>
          idsToResume.includes(item.id) ? { ...item, status: "pending" } : item
        )
      );
    } catch (err: any) {
      alert("فشل استئناف جدولة القناة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChannel = async (chName: string, channelItems: ScheduledClone[]) => {
    const activeItems = channelItems.filter(i => i.status !== "completed");
    if (activeItems.length === 0) {
      alert("لا توجد فيديوهات مجدولة نشطة لهذه القناة لطلب إلغائها.");
      return;
    }

    const isOk = await confirm({
      title: "إلغاء جدولة وحذف فيديوهات القناة",
      message: `هل أنت متأكد من إلغاء جدولة وحذف ${activeItems.length} فيديو لقناة "${chName}" نهائياً من القائمة؟`,
      confirmText: "إلغاء الجدولة وحذف",
      cancelText: "تراجع",
      variant: "danger",
    });
    if (!isOk) return;

    setLoading(true);
    try {
      const idsToDelete = activeItems.map(i => i.id);
      const { error } = await supabase
        .from("scheduled_clones")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      setClones((prev) => prev.filter((item) => !idsToDelete.includes(item.id)));
    } catch (err: any) {
      alert("فشل إلغاء جدولة القناة: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const isOk = await confirm({
      title: "حذف فيديو مجدول",
      message: "هل أنت متأكد من رغبتك في حذف هذا الفيديو نهائياً من قائمة الانتظار المجدولة؟",
      confirmText: "حذف الفيديو",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!isOk) return;

    setActionId(id);
    try {
      const { error } = await supabase.from("scheduled_clones").delete().eq("id", id);
      if (error) throw error;
      setClones((prev) => prev.filter((item) => item.id !== id));
    } catch (err: any) {
      alert("فشل حذف الفيديو من القائمة: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handlePublishNow = async (id: string) => {
    setActionId(id);
    try {
      // Set scheduled_time to now
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ scheduled_time: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      
      // Update local state to reflect changes
      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, scheduled_time: new Date().toISOString() } : item
        )
      );
      
      alert("تم تعديل وقت الجدولة للنشر الفوري. سيتم البدء في المعالجة والنشر خلال ثوانٍ معدودة.");
    } catch (err: any) {
      alert("فشل تعديل وقت الجدولة: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("ar-EG-u-nu-latn", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const getChannelName = (item: ScheduledClone) => {
    return item.channel_name || item.bypass_settings?.channel_name || "فيديوهات عامة / قنوات متنوعة";
  };

  // Helper functions for platform icon and badge styling
  const getPlatformIcon = (service?: string, platform?: string) => {
    const s = (service || platform || "").toLowerCase();
    if (s.includes("tiktok")) return "🎵";
    if (s.includes("facebook") || s.includes("fb")) return "👥";
    if (s.includes("youtube") || s.includes("yt")) return "▶️";
    if (s.includes("instagram") || s.includes("ig")) return "📸";
    if (s.includes("twitter") || s.includes("x")) return "𝕏";
    if (s.includes("linkedin")) return "💼";
    if (s.includes("threads")) return "🧵";
    if (s.includes("pinterest")) return "📌";
    if (s.includes("webhook")) return "⚡";
    return "🌐";
  };

  const getPlatformBadgeStyle = (service?: string, platform?: string) => {
    const s = (service || platform || "").toLowerCase();
    if (s.includes("tiktok")) return "bg-pink-50 text-pink-700 border-pink-200/80";
    if (s.includes("facebook")) return "bg-blue-50 text-blue-700 border-blue-200/80";
    if (s.includes("youtube")) return "bg-rose-50 text-rose-700 border-rose-200/80";
    if (s.includes("instagram")) return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200/80";
    if (s.includes("twitter") || s.includes("x")) return "bg-slate-900 text-white border-slate-700";
    if (s.includes("linkedin")) return "bg-sky-50 text-sky-700 border-sky-200/80";
    if (s.includes("webhook")) return "bg-amber-50 text-amber-800 border-amber-200/80";
    return "bg-cyan-50 text-cyan-700 border-cyan-200/80";
  };

  // Resolve target profile details for a given clone item
  const resolveTargetInfo = (item: ScheduledClone) => {
    const profId = item.target_profile_id;
    if (profId && publishingProfiles[profId]) {
      const p = publishingProfiles[profId];
      return {
        id: profId,
        platform: item.target_platform || p.platform || "zernio",
        service: p.service,
        formatted_service: p.formatted_service,
        service_username: p.service_username,
        avatar: p.avatar,
        account_name: p.account_name || "",
      };
    }

    const chName = getChannelName(item);
    const mapped = channelTargets[chName];
    if (mapped?.profile) {
      return {
        id: mapped.profile_id || profId,
        platform: mapped.platform || item.target_platform || "zernio",
        service: mapped.profile.service,
        formatted_service: mapped.profile.formatted_service,
        service_username: mapped.profile.service_username,
        avatar: mapped.profile.avatar,
        account_name: mapped.profile.account_name || "",
      };
    }

    if (profId === "WEBHOOK_MODE" || (!profId && item.target_platform === "zernio")) {
      return {
        id: "WEBHOOK_MODE",
        platform: "zernio",
        service: "webhook",
        formatted_service: "Zernio Webhook ⚡",
        service_username: "ويب-هوك تلقائي",
        avatar: "",
        account_name: "Webhook",
      };
    }

    return {
      id: profId || "default",
      platform: item.target_platform || "zernio",
      service: item.target_platform === "zernio" ? "zernio" : "buffer",
      formatted_service: item.target_platform === "zernio" ? "Zernio ⚡" : "Buffer 🌐",
      service_username: profId ? `معرف: ${profId.slice(0, 10)}...` : "حساب افتراضي",
      avatar: "",
      account_name: "",
    };
  };

  // Get distinct publishing targets for an entire group of channel items
  const getChannelTargetsSummary = (channelItems: ScheduledClone[]) => {
    const map = new Map<string, ReturnType<typeof resolveTargetInfo>>();
    channelItems.forEach(item => {
      const info = resolveTargetInfo(item);
      const key = `${info.platform}_${info.id}_${info.service_username}`;
      if (!map.has(key)) {
        map.set(key, info);
      }
    });
    return Array.from(map.values());
  };

  const groupedClones = useMemo(() => {
    const groups: Record<string, ScheduledClone[]> = {};
    clones.forEach((item) => {
      const chName = getChannelName(item);
      if (!groups[chName]) {
        groups[chName] = [];
      }
      groups[chName].push(item);
    });
    return groups;
  }, [clones]);

  const toggleChannelOpen = (chName: string) => {
    setOpenChannels(prev => ({
      ...prev,
      [chName]: prev[chName] === undefined ? false : !prev[chName]
    }));
  };

  const renderQueueItem = (item: ScheduledClone) => {
    const hasBypass = Object.values(item.bypass_settings || {}).some(v => v === true);
    const targetInfo = resolveTargetInfo(item);
    
    return (
      <div key={item.id} className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between text-right hover:bg-slate-50/50 transition-colors">
        {/* Video Meta */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative w-24 aspect-video rounded-lg overflow-hidden bg-slate-100 shrink-0 border border-slate-150">
            <img 
              src={item.thumbnail_url} 
              alt={item.video_title} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <span className="absolute bottom-1 right-1 bg-slate-900/80 text-white text-[8px] font-mono px-1 py-0.2 rounded">
              {item.target_platform === "zernio" ? "Zernio ⚡" : "Buffer 🌐"}
            </span>
          </div>
          
          <div className="space-y-1.5 overflow-hidden min-w-0">
            <h5 className="text-xs font-bold text-slate-800 line-clamp-1 leading-relaxed" title={item.video_title}>
              {item.video_title}
            </h5>

            {/* Target Platform & Account Destination */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold shadow-2xs ${getPlatformBadgeStyle(targetInfo.service, targetInfo.platform)}`}>
                {targetInfo.avatar ? (
                  <img 
                    src={targetInfo.avatar} 
                    alt={targetInfo.service_username} 
                    className="w-3.5 h-3.5 rounded-full object-cover border border-white/80" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span>{getPlatformIcon(targetInfo.service, targetInfo.platform)}</span>
                )}
                <span>{targetInfo.formatted_service}:</span>
                <span className="font-mono" dir="ltr">@{targetInfo.service_username}</span>
              </span>
              {targetInfo.account_name && (
                <span className="text-[9px] text-slate-400 font-medium">
                  ({targetInfo.account_name})
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-1.5 justify-end">
              {item.bypass_settings?.hflip && (
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-1.5 py-0.5 rounded-md">مرآة مائل</span>
              )}
              {item.bypass_settings?.speedUp && (
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-1.5 py-0.5 rounded-md">سرعة +6%</span>
              )}
              {item.bypass_settings?.colorBoost && (
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-1.5 py-0.5 rounded-md">تعزيز الألوان</span>
              )}
              {item.bypass_settings?.pitchShift && (
                <span className="text-[9px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100/50 px-1.5 py-0.5 rounded-md">طبقة الصوت</span>
              )}
              {(item.bypass_settings?.enableCaption || item.bypass_settings?.caption_template_id) && (
                <span className="text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 px-1.5 py-0.5 rounded-md">كابشن مدمج ✍️</span>
              )}
              {!hasBypass && !item.bypass_settings?.enableCaption && !item.bypass_settings?.caption_template_id && (
                <span className="text-[9px] text-slate-400">بدون فلاتر كوبيرايت</span>
              )}
            </div>

            <div className="text-[10px] text-slate-400 font-medium">
              تاريخ الجدولة: {formatDate(item.scheduled_time)}
            </div>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
          {/* Status Badge */}
          <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1">
            {item.status === "paused" && (
              <span className="text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Pause className="w-3 h-3" />
                <span>مؤقت</span>
              </span>
            )}
            {item.status === "pending" && (
              <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Clock className="w-3 h-3 animate-pulse text-amber-600" />
                <span>في الانتظار</span>
              </span>
            )}
            {item.status === "processing" && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                <span>جاري المعالجة والرفع...</span>
              </span>
            )}
            {item.status === "completed" && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                <span>تم النشر بنجاح</span>
              </span>
            )}
            {item.status === "failed" && (
              <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-lg flex items-center gap-1" title={item.error_message}>
                <XCircle className="w-3 h-3 text-rose-600" />
                <span>فشل النشر</span>
              </span>
            )}

            {item.status === "failed" && item.error_message && (
              <p className="text-[9px] text-slate-400 max-w-[200px] truncate text-left" title={item.error_message}>
                {item.error_message}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            {item.status === "failed" && (
              <button
                onClick={() => handleRetry(item.id)}
                disabled={actionId === item.id}
                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                title="إعادة المحاولة فوراً"
              >
                {actionId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </button>
            )}
            
            {item.status === "pending" && (
              <button
                onClick={() => handlePublishNow(item.id)}
                disabled={actionId === item.id}
                className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="نشر الآن فوراً"
              >
                {actionId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}
            
            {item.status === "pending" && (
              <button
                onClick={() => handleUpdateStatus(item.id, 'paused')}
                disabled={actionId === item.id}
                className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors cursor-pointer"
                title="إيقاف مؤقت"
              >
                 <Pause className="w-4 h-4" />
              </button>
            )}

            {item.status === "paused" && (
              <button
                onClick={() => handleUpdateStatus(item.id, 'pending')}
                disabled={actionId === item.id}
                className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                title="استئناف النشر"
              >
                 <Play className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleDelete(item.id)}
              disabled={actionId === item.id}
              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
              title="حذف من الجدولة"
            >
              {actionId === item.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in" id="scheduled-clones-queue-root">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5 text-right">
          <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5 justify-end">
            <Clock className="w-4 h-4 text-indigo-500" />
            <span>قائمة الانتظار والجدولة (مجمعة حسب القنوات)</span>
          </h4>
          <p className="text-[11px] text-slate-500">
            تتم معالجة الفيديوهات ونشرها بالتتابع تلقائياً طبقاً للجدولة المحددة أدناه لكافة القنوات.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {clones.some(i => i.status === "failed") && (
            <button
              onClick={() => handleRetryAllFailed()}
              disabled={loading}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-bold"
              title="إعادة محاولة كافة الفيديوهات الفاشلة فوراً"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>إعادة محاولة الفاشل ({clones.filter(i => i.status === "failed").length})</span>
            </button>
          )}

          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs text-right">
          {error}
        </div>
      )}

      {loading && clones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <span className="text-xs text-slate-500 font-bold">جاري تحميل قائمة الجدولة...</span>
        </div>
      ) : clones.length === 0 ? (
        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-500 text-xs font-semibold">
          لا توجد فيديوهات في قائمة الانتظار المجدولة حالياً. يمكنك الذهاب لمستكشف القنوات وتحديد الفيديوهات ثم النقر على "نسخ المحتوى" لجدولتها هنا.
        </div>
      ) : (
        <div className="space-y-3">
          {(Object.entries(groupedClones) as [string, ScheduledClone[]][]).map(([chName, channelItems]) => {
            const isExpanded = openChannels[chName] !== false; // Default open
            const chPending = channelItems.filter(i => i.status === "pending" || !i.status).length;
            const chCompleted = channelItems.filter(i => i.status === "completed").length;
            const chFailed = channelItems.filter(i => i.status === "failed").length;
            const channelTargetsList = getChannelTargetsSummary(channelItems);

            return (
              <div key={`queue-ch-${chName}`} className="border border-slate-200/80 rounded-2xl overflow-hidden bg-white shadow-2xs">
                {/* Channel Header */}
                <div 
                  onClick={() => toggleChannelOpen(chName)}
                  className="p-3.5 bg-slate-50/80 hover:bg-slate-100/80 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-100 select-none transition-colors"
                >
                  <div className="flex items-center gap-2.5 w-full md:w-auto">
                    <div className="p-2 bg-indigo-600 text-white rounded-lg shrink-0">
                      <Tv className="w-4 h-4" />
                    </div>
                    <div className="text-right space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h5 className="text-xs font-extrabold text-slate-900">{chName}</h5>
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
                          {channelItems.length} فيديو
                        </span>
                      </div>

                      {/* Destination Badges */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-slate-400">وجهة النشر:</span>
                        {channelTargetsList.map((target, idx) => (
                          <span
                            key={`queue-target-${idx}-${target.id}`}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-bold shadow-2xs ${getPlatformBadgeStyle(target.service, target.platform)}`}
                          >
                            {target.avatar ? (
                              <img 
                                src={target.avatar} 
                                alt={target.service_username} 
                                className="w-3 h-3 rounded-full object-cover border border-white/80 shrink-0" 
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <span className="text-[10px]">{getPlatformIcon(target.service, target.platform)}</span>
                            )}
                            <span>{target.formatted_service}:</span>
                            <span className="font-mono text-[9px]" dir="ltr">@{target.service_username}</span>
                          </span>
                        ))}
                      </div>

                      <div className="text-[10px] text-slate-400 font-medium">
                        {chPending} في الانتظار • {chCompleted} تم النشر {chFailed > 0 ? `• ${chFailed} فشل` : ""}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-100">
                    {chFailed > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRetryAllFailed(channelItems.filter(i => i.status === "failed"));
                        }}
                        disabled={loading}
                        className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="إعادة محاولة كافة الفيديوهات الفاشلة لهذه القناة"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>إعادة محاولة ({chFailed})</span>
                      </button>
                    )}

                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                      <span className="text-[11px]">{isExpanded ? "إخفاء" : "عرض الفيديوهات"}</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-500" /> : <ChevronDown className="w-4 h-4 text-indigo-500" />}
                    </div>
                  </div>
                </div>

                {/* Items */}
                {isExpanded && (
                  <div>
                    {/* Destination Summary Info Strip */}
                    <div className="p-2.5 bg-indigo-50/30 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-bold text-[11px]">
                        <Globe className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span>حسابات النشر المربوطة بالتجميعة:</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {channelTargetsList.map((target, idx) => (
                          <div 
                            key={`strip-target-${idx}-${target.id}`}
                            className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs text-[10px]"
                          >
                            <span className="font-bold text-slate-800">{target.formatted_service}</span>
                            <span className="text-indigo-600 font-mono font-bold" dir="ltr">@{target.service_username}</span>
                            {target.account_name && (
                              <span className="text-[9px] text-slate-400">({target.account_name})</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-100 bg-white">
                      {channelItems.map(item => renderQueueItem(item))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
