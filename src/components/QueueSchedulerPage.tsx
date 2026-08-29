import React, { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useConfirm } from "./ConfirmModal";
import { 
  Clock, Trash2, Play, CheckCircle2, XCircle, 
  Loader2, AlertTriangle, Sparkles, RefreshCw, ExternalLink, Pause,
  Calendar, ShieldAlert, CheckSquare, Globe, ChevronDown, ChevronUp, Check,
  Search, Info, Sliders, Flame, ShieldCheck, Hourglass, TrendingUp, Edit3, Trash,
  Tv, Folder, Layers, ListFilter
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
    custom_hashtags?: string;
    hashtag_option?: string;
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

export default function QueueSchedulerPage() {
  const { confirm } = useConfirm();
  const [clones, setClones] = useState<ScheduledClone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  
  // Publishing Profiles and Mapping
  const [publishingProfiles, setPublishingProfiles] = useState<Record<string, PublishingProfile>>({});
  const [channelTargets, setChannelTargets] = useState<Record<string, any>>({});
  
  // View mode and channel collapse states
  const [viewMode, setViewMode] = useState<"grouped" | "flat">("grouped");
  const [openChannels, setOpenChannels] = useState<Record<string, boolean>>({});

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paused" | "processing" | "completed" | "failed">("all");
  
  // Spacing Organizer State
  const [startDatetime, setStartDatetime] = useState("");
  const [spacingMinutes, setSpacingMinutes] = useState(20);
  const [enableJitter, setEnableJitter] = useState(true);
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [organizeSuccess, setOrganizeSuccess] = useState(false);

  // Inline edit state for individual items
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTime, setEditingTime] = useState("");

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
      console.warn("Failed to fetch publishing profiles mapping:", e);
    }
  };

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("scheduled_clones").select("*");
      if (error) throw error;
      setClones(data || []);
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
    
    // Set default start time for smart organizer to current time
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset() + 5); // Start in 5 minutes
    setStartDatetime(now.toISOString().slice(0, 16));

    // Refresh queue automatically every 15 seconds
    const interval = setInterval(() => {
      fetchQueue();
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleDelete = async (id: string) => {
    const isOk = await confirm({
      title: "حذف فيديو من الجدولة",
      message: "هل أنت متأكد من رغبتك في حذف هذا الفيديو من قائمة الجدولة التلقائية؟",
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
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ scheduled_time: new Date().toISOString() })
        .eq("id", id);
      
      if (error) throw error;
      
      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, scheduled_time: new Date().toISOString() } : item
        )
      );
      
      alert("تم تقديم وقت الجدولة للنشر الآن فوراً. سيتم البدء في المعالجة والرفع خلال دقيقة.");
    } catch (err: any) {
      alert("فشل تقديم وقت الجدولة: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleUpdateIndividualTime = async (id: string, newTimeStr: string) => {
    setActionId(id);
    try {
      const utcDate = new Date(newTimeStr).toISOString();
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ scheduled_time: utcDate })
        .eq("id", id);

      if (error) throw error;

      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, scheduled_time: utcDate } : item
        )
      );
      setEditingId(null);
    } catch (err: any) {
      alert("فشل تحديث وقت الجدولة الفردي: " + err.message);
    } finally {
      setActionId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'pending' | 'paused') => {
    setActionId(id);
    try {
      const { error } = await supabase
        .from("scheduled_clones")
        .update({ status: newStatus })
        .eq("id", id);
      
      if (error) throw error;
      
      setClones((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: newStatus } : item
        )
      );
    } catch (err: any) {
      alert("فشل تغيير حالة الفيديو: " + err.message);
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

  // Bulk Smart Spacing Algorithm to prevent IP Bans / throttling
  const handleAutoSpaceQueue = async () => {
    const pendingItems = clones.filter(c => c.status === "pending" || !c.status);
    if (pendingItems.length === 0) {
      alert("لا توجد فيديوهات بحالة 'في الانتظار' لتنظيم جدولتها حالياً.");
      return;
    }

    const isOk = await confirm({
      title: "إعادة توزيع وقت الجدولة",
      message: `هل تريد إعادة توزيع وتنسيق جدولة ${pendingItems.length} فيديوهات تلقائياً بتباعد قدره ${spacingMinutes} دقيقة لتجنب الحظر؟`,
      confirmText: "تنسيق الجدولة",
      cancelText: "إلغاء",
      variant: "warning",
    });
    if (!isOk) return;

    setIsOrganizing(true);
    setOrganizeSuccess(false);

    try {
      // Sort pending items chronologically by existing scheduled_time or creation date
      const sortedPending = [...pendingItems].sort((a, b) => {
        return new Date(a.scheduled_time || a.created_at).getTime() - new Date(b.scheduled_time || b.created_at).getTime();
      });

      let currentMiliseconds = new Date(startDatetime).getTime();

      // Loop through and update each scheduled time
      for (let i = 0; i < sortedPending.length; i++) {
        const item = sortedPending[i];
        
        // Add random jitter between -3 and +3 minutes if enabled, to look natural to algorithms
        let jitterMs = 0;
        if (enableJitter) {
          const jitterMins = Math.floor(Math.random() * 7) - 3; // -3 to +3 mins
          jitterMs = jitterMins * 60 * 1000;
        }

        const scheduledDate = new Date(currentMiliseconds + jitterMs);
        const isoString = scheduledDate.toISOString();

        // Update in PostgreSQL via Supabase
        const { error } = await supabase
          .from("scheduled_clones")
          .update({ scheduled_time: isoString })
          .eq("id", item.id);

        if (error) throw error;

        // Increment baseline for the next item
        currentMiliseconds += spacingMinutes * 60 * 1000;
      }

      await fetchQueue();
      setOrganizeSuccess(true);
      setTimeout(() => setOrganizeSuccess(false), 3000);
    } catch (err: any) {
      alert("فشل تنظيم الجدولة التلقائي: " + err.message);
    } finally {
      setIsOrganizing(false);
    }
  };

  // Bulk actions: Delete all completed or all failed to clean up
  const handleCleanQueue = async (targetStatus: "completed" | "failed" | "pending") => {
    const items = clones.filter(c => c.status === targetStatus);
    if (items.length === 0) {
      alert(`لا توجد فيديوهات مطابقة للحذف.`);
      return;
    }

    const isOk = await confirm({
      title: "تنظيف الفيديوهات الجماعي",
      message: `هل أنت متأكد من رغبتك في حذف ${items.length} من الفيديوهات بهذه الحالة نهائياً؟`,
      confirmText: "تنظيف وحذف",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!isOk) return;

    setLoading(true);
    try {
      for (const item of items) {
        await supabase.from("scheduled_clones").delete().eq("id", item.id);
      }
      await fetchQueue();
    } catch (err: any) {
      alert("فشل تنظيف قائمة الانتظار: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("ar-EG", {
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

  const formatLocalInput = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    } catch {
      return "";
    }
  };

  const getChannelName = (item: ScheduledClone) => {
    return item.channel_name || item.bypass_settings?.channel_name || "فيديوهات عامة / قنوات متنوعة";
  };

  // Filter and search computation
  const filteredClones = clones.filter((item) => {
    const chName = getChannelName(item);
    const matchesSearch = 
      item.video_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.video_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = 
      statusFilter === "all" || 
      (statusFilter === "pending" && (item.status === "pending" || !item.status)) ||
      item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Group items by Channel Name
  const groupedClones = useMemo(() => {
    const groups: Record<string, ScheduledClone[]> = {};
    filteredClones.forEach((item) => {
      const chName = getChannelName(item);
      if (!groups[chName]) {
        groups[chName] = [];
      }
      groups[chName].push(item);
    });
    return groups;
  }, [filteredClones]);

  const toggleChannelOpen = (chName: string) => {
    setOpenChannels(prev => ({
      ...prev,
      [chName]: prev[chName] === undefined ? false : !prev[chName]
    }));
  };

  const setAllChannelsOpen = (open: boolean) => {
    const newState: Record<string, boolean> = {};
    Object.keys(groupedClones).forEach(chName => {
      newState[chName] = open;
    });
    setOpenChannels(newState);
  };

  // Calculate stats
  const totalCount = clones.length;
  const pendingCount = clones.filter(c => c.status === "pending" || !c.status).length;
  const pausedCount = clones.filter(c => c.status === "paused").length;
  const processingCount = clones.filter(c => c.status === "processing").length;
  const completedCount = clones.filter(c => c.status === "completed").length;
  const failedCount = clones.filter(c => c.status === "failed").length;

  // Count scheduled for today (current 24 hours) to monitor rate limit limits
  const isScheduledForToday = (dateStr: string) => {
    const d = new Date(dateStr);
    const today = new Date();
    return d.getDate() === today.getDate() &&
           d.getMonth() === today.getMonth() &&
           d.getFullYear() === today.getFullYear();
  };
  const todayCount = clones.filter(c => (c.status === "pending" || !c.status) && isScheduledForToday(c.scheduled_time)).length;

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

  const renderVideoItem = (item: ScheduledClone) => {
    const hasBypass = Object.values(item.bypass_settings || {}).some(v => v === true);
    const isPending = item.status === "pending" || !item.status;
    const isEditingThis = editingId === item.id;
    const targetInfo = resolveTargetInfo(item);

    return (
      <div key={`scheduler-item-${item.id}`} className="p-4 flex flex-col lg:flex-row gap-4 items-center justify-between text-right hover:bg-slate-50/50 transition-colors">
        {/* Video Meta and details */}
        <div className="flex items-center gap-3.5 w-full lg:w-auto">
          <div className="relative w-28 aspect-video rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200">
            <img 
              src={item.thumbnail_url} 
              alt={item.video_title} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
            <span className={`absolute bottom-1.5 right-1.5 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow-xs ${
              item.target_platform === "zernio" ? "bg-indigo-600" : "bg-cyan-600"
            }`}>
              {item.target_platform === "zernio" ? "Zernio ⚡" : "Buffer 🌐"}
            </span>
          </div>

          <div className="space-y-1.5 w-full min-w-0">
            <h5 className="text-xs font-bold text-slate-800 line-clamp-1 leading-relaxed" title={item.video_title}>
              {item.video_title}
            </h5>

            {/* Target Platform and Account Destination */}
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

            <div className="flex flex-wrap items-center gap-1.5">
              {item.bypass_settings?.hflip && (
                <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.2 rounded-md">مرآة مائل</span>
              )}
              {item.bypass_settings?.speedUp && (
                <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.2 rounded-md">سرعة +6%</span>
              )}
              {item.bypass_settings?.colorBoost && (
                <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.2 rounded-md">تعزيز الألوان</span>
              )}
              {item.bypass_settings?.pitchShift && (
                <span className="text-[8px] font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 px-1.5 py-0.2 rounded-md">طبقة الصوت</span>
              )}
              {!hasBypass && (
                <span className="text-[8px] text-slate-400">بدون فلاتر كوبيرايت</span>
              )}
            </div>

            {/* Display scheduled time / inline edit input */}
            {isEditingThis ? (
              <div className="flex items-center gap-1.5 pt-1" onClick={(e) => e.stopPropagation()}>
                <input
                  type="datetime-local"
                  value={editingTime}
                  onChange={(e) => setEditingTime(e.target.value)}
                  className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-sans text-slate-800 focus:outline-none focus:border-indigo-500"
                  style={{ direction: "ltr" }}
                />
                <button
                  onClick={() => handleUpdateIndividualTime(item.id, editingTime)}
                  disabled={actionId === item.id}
                  className="p-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-md transition-colors text-[10px] px-1.5 cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-indigo-500" />
                <span>تاريخ الجدولة المحدد:</span>
                <span className="text-slate-600 font-bold">{formatDate(item.scheduled_time)}</span>
                {isPending && (
                  <button
                    onClick={() => {
                      setEditingId(item.id);
                      setEditingTime(formatLocalInput(item.scheduled_time));
                    }}
                    className="text-indigo-600 hover:underline p-1 flex items-center gap-0.5 text-[9px] font-bold cursor-pointer"
                  >
                    <Edit3 className="w-2.5 h-2.5" />
                    <span>تعديل</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status Badges & Controls */}
        <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end shrink-0 pt-3 lg:pt-0 border-t lg:border-0 border-slate-100">
          {/* Status Badge */}
          <div className="flex flex-col items-end gap-1.5">
            {item.status === "paused" && (
              <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 border border-amber-200 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <Pause className="w-3 h-3 text-amber-700" />
                <span>موقوف مؤقتاً</span>
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
                <span>جاري السحب والرفع...</span>
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

            {item.error_message && (
              <p className="text-[9px] text-rose-600 max-w-[220px] font-medium leading-relaxed bg-rose-50/50 p-1.5 rounded-lg border border-rose-100/30 text-left overflow-x-auto whitespace-pre" title={item.error_message}>
                {item.error_message}
              </p>
            )}
          </div>

          {/* Operational Action buttons */}
          <div className="flex items-center gap-1.5">
            {isPending && (
              <>
                <button
                  onClick={() => handlePublishNow(item.id)}
                  disabled={actionId === item.id}
                  className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-colors cursor-pointer"
                  title="نشر الآن فوراً"
                >
                  {actionId === item.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={() => handleUpdateStatus(item.id, 'paused')}
                  disabled={actionId === item.id}
                  className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors cursor-pointer"
                  title="إيقاف مؤقت"
                >
                  <Pause className="w-4 h-4" />
                </button>
              </>
            )}

            {item.status === "paused" && (
              <button
                onClick={() => handleUpdateStatus(item.id, 'pending')}
                disabled={actionId === item.id}
                className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl transition-colors cursor-pointer"
                title="استئناف النشر"
              >
                {actionId === item.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </button>
            )}

            {item.status === "failed" && (
              <button
                onClick={() => handleUpdateStatus(item.id, 'pending')}
                disabled={actionId === item.id}
                className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl transition-colors cursor-pointer"
                title="إعادة المحاولة"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => handleDelete(item.id)}
              disabled={actionId === item.id}
              className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition-colors cursor-pointer"
              title="حذف من الجدولة"
            >
              {actionId === item.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-right font-sans" id="queue-scheduler-page-root">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1.5 w-full md:w-auto">
          <h3 className="text-md font-bold text-slate-800 flex items-center gap-2 justify-end md:justify-start">
            <Clock className="w-5 h-5 text-indigo-500" />
            <span>تنظيم وجدولة الفيديوهات المتتابعة</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            تنظيم ذكي للرفع المتتابع وتوزيع الفترات الزمنية لتجنب تكرار الطلبات وحظر الـ IP من المنصات المستهدفة.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>تحديث القائمة</span>
          </button>
        </div>
      </div>

      {/* Safety & IP Ban metrics dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: IP safety status */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-400 block">حالة أمان الـ IP والطلبات</span>
            <span className="text-xs font-bold text-emerald-600">آمن وحماية مفعّلة ✓</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">يتم النشر بالتتابع (Limit 1)</span>
          </div>
        </div>

        {/* Metric 2: Recommendation Interval */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Sliders className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-400 block">الفاصل الزمني الموصى به</span>
            <span className="text-xs font-bold text-slate-700">15 - 30 دقيقة لكل فيديو</span>
            <span className="text-[9px] text-indigo-500 font-medium block mt-0.5">يمنع سلوك الروبوتات المريب</span>
          </div>
        </div>

        {/* Metric 3: Scheduled today monitor */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600">
            <Flame className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-400 block">المجدول لليوم الحالي</span>
            <span className="text-xs font-bold text-slate-700">{todayCount} فيديوهات مجدولة</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">الحد الأقصى اليومي الآمن: 15</span>
          </div>
        </div>

        {/* Metric 4: Summary of Queue */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs flex items-center justify-between gap-4">
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
            <Hourglass className="w-6 h-6" />
          </div>
          <div className="space-y-0.5 text-right">
            <span className="text-[10px] font-bold text-slate-400 block">إجمالي محتوى الانتظار</span>
            <span className="text-xs font-bold text-indigo-600">{pendingCount} فيديو قيد الانتظار</span>
            <span className="text-[9px] text-slate-400 block mt-0.5">من أصل {totalCount} إجمالي العناصر</span>
          </div>
        </div>
      </div>

      {/* Smart Spacing Organizer Panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-5 border border-slate-800">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Sliders className="w-4 h-4 text-indigo-400" />
          <h4 className="text-sm font-bold">موزّع ومنسّق الجدولة الذكي (مكافحة الحظر)</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 items-end text-right">
          {/* Start Datetime */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">وقت بدء النشر المتتابع:</label>
            <input
              type="datetime-local"
              value={startDatetime}
              onChange={(e) => setStartDatetime(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-sans"
              style={{ direction: "ltr" }}
            />
          </div>

          {/* Interval selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-300">الفاصل الزمني بين الفيديوهات:</label>
            <select
              value={spacingMinutes}
              onChange={(e) => setSpacingMinutes(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-bold"
            >
              <option value={5}>5 دقائق (غير موصى به)</option>
              <option value={10}>10 دقائق</option>
              <option value={15}>15 دقيقة</option>
              <option value={20}>20 دقيقة (موصى به لـ Zernio)</option>
              <option value={30}>30 دقيقة (موصى به لـ Buffer)</option>
              <option value={45}>45 دقيقة</option>
              <option value={60}>1 ساعة</option>
              <option value={120}>ساعتين (مثالي لحسابات حديثة)</option>
            </select>
          </div>

          {/* Jitter offset toggle */}
          <div className="flex items-center gap-2 pb-3.5">
            <input
              type="checkbox"
              id="enable-jitter"
              checked={enableJitter}
              onChange={(e) => setEnableJitter(e.target.checked)}
              className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-700 rounded-md bg-slate-800 cursor-pointer"
            />
            <label htmlFor="enable-jitter" className="text-xs font-bold text-slate-300 cursor-pointer selection:bg-transparent">
              تفعيل التذبذب الزمني العشوائي (+/- 3د)
            </label>
            <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" title="يقوم بإضافة فترات عشوائية بسيطة لكي تبدو المواعيد بشرية وطبيعية تماماً لمنصات التواصل الاجتماعي" />
          </div>

          {/* Action Button */}
          <button
            onClick={handleAutoSpaceQueue}
            disabled={isOrganizing || pendingCount === 0}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm hover:shadow-md"
          >
            {isOrganizing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري إعادة الجدولة والتوزيع...</span>
              </>
            ) : organizeSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>تم توزيع الجدولة بنجاح!</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-indigo-300" />
                <span>توزيع الجدولة والتباعد تلقائياً ({pendingCount})</span>
              </>
            )}
          </button>
        </div>
        
        <p className="text-[10px] text-slate-400 leading-relaxed">
          💡 <strong>آلية عمل الموزّع:</strong> سيأخذ جميع الفيديوهات التي بوضع الانتظار، ويرتبها زمنياً، ثم يعيد جدولة مواعيد نشرها بالتتابع مع الفاصل الزمني المختار بدءاً من الوقت الذي حددته، مما يمنع نهائياً تراكم الطلبات والـ IP Block.
        </p>
      </div>

      {/* Database Queue View */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-2xs space-y-4 p-5">
        
        {/* Filters Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 justify-end">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "all" ? "bg-slate-800 text-white" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              الكل ({totalCount})
            </button>
            <button
              onClick={() => setStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "pending" ? "bg-amber-100 text-amber-800 border border-amber-200/50" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              في الانتظار ({pendingCount})
            </button>
            <button
              onClick={() => setStatusFilter("paused")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "paused" ? "bg-amber-600 text-white shadow-xs" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              موقوف مؤقتاً ({pausedCount})
            </button>
            <button
              onClick={() => setStatusFilter("processing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "processing" ? "bg-indigo-100 text-indigo-800 border border-indigo-200/50" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              جاري المعالجة ({processingCount})
            </button>
            <button
              onClick={() => setStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "completed" ? "bg-emerald-100 text-emerald-800 border border-emerald-200/50" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              تم النشر ({completedCount})
            </button>
            <button
              onClick={() => setStatusFilter("failed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                statusFilter === "failed" ? "bg-rose-100 text-rose-800 border border-rose-200/50" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
            >
              فشل النشر ({failedCount})
            </button>
          </div>

          {/* Quick Clear Buttons */}
          <div className="flex items-center gap-1.5 justify-end">
            {completedCount > 0 && (
              <button
                onClick={() => handleCleanQueue("completed")}
                className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                تنظيف المنشورة ({completedCount})
              </button>
            )}
            {failedCount > 0 && (
              <button
                onClick={() => handleCleanQueue("failed")}
                className="px-2.5 py-1 text-[10px] font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
              >
                حذف الفاشلة ({failedCount})
              </button>
            )}
          </div>
        </div>

        {/* Search & Meta */}
        <div className="relative">
          <input
            type="text"
            placeholder="البحث في قائمة الجدولة (اسم القناة، اسم الفيديو، أو معرف الفيديو)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-150 rounded-xl text-xs focus:outline-none focus:border-indigo-500 focus:bg-white text-right"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
        </div>

        {/* View Mode & Expand Controls */}
        {filteredClones.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 text-xs">
            <div className="flex items-center gap-1 bg-slate-200/70 p-1 rounded-xl w-full sm:w-auto">
              <button
                onClick={() => setViewMode("grouped")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  viewMode === "grouped" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>مجمعة حسب القنوات ({Object.keys(groupedClones).length})</span>
              </button>
              <button
                onClick={() => setViewMode("flat")}
                className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs ${
                  viewMode === "flat" ? "bg-indigo-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span>قائمة شاملة ({filteredClones.length})</span>
              </button>
            </div>

            {viewMode === "grouped" && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setAllChannelsOpen(true)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-[11px]"
                >
                  توسيع الكل
                </button>
                <button
                  onClick={() => setAllChannelsOpen(false)}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer text-[11px]"
                >
                  إغلاق الكل
                </button>
              </div>
            )}
          </div>
        )}

        {/* List Content */}
        {error && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 p-4 rounded-xl text-xs">
            {error}
          </div>
        )}

        {loading && clones.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <span className="text-xs text-slate-500 font-bold">جاري تحميل وتزامن قائمة الجدولة...</span>
          </div>
        ) : filteredClones.length === 0 ? (
          <div className="bg-slate-50 border border-slate-150 rounded-2xl p-16 text-center text-slate-500 text-xs font-semibold">
            {searchTerm || statusFilter !== "all" 
              ? "لا توجد نتائج مطابقة لفلترة البحث المحددة." 
              : "قائمة الانتظار فارغة تماماً. يمكنك الذهاب لمستكشف القنوات وجدولة الفيديوهات من هناك."}
          </div>
        ) : viewMode === "grouped" ? (
          /* Grouped by Channel View */
          <div className="space-y-4">
            {(Object.entries(groupedClones) as [string, ScheduledClone[]][]).map(([chName, channelItems]) => {
              const isExpanded = openChannels[chName] !== false; // Default open
              const chPending = channelItems.filter(i => i.status === "pending" || !i.status).length;
              const chPaused = channelItems.filter(i => i.status === "paused").length;
              const chCompleted = channelItems.filter(i => i.status === "completed").length;
              const chFailed = channelItems.filter(i => i.status === "failed").length;
              const channelTargetsList = getChannelTargetsSummary(channelItems);

              return (
                <div key={`channel-group-${chName}`} className="border border-indigo-100/80 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
                  {/* Channel Header Bar */}
                  <div 
                    onClick={() => toggleChannelOpen(chName)}
                    className="p-4 bg-gradient-to-r from-indigo-50/50 via-slate-50 to-indigo-50/30 hover:bg-indigo-50/70 cursor-pointer flex flex-col md:flex-row items-center justify-between gap-3 border-b border-slate-150 select-none transition-colors"
                  >
                    <div className="flex items-center gap-3 w-full md:w-auto">
                      <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 flex items-center justify-center">
                        <Tv className="w-5 h-5" />
                      </div>

                      <div className="space-y-1.5 text-right min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">القناة:</span>
                          <h4 className="text-sm font-extrabold text-slate-900 truncate" title={chName}>
                            {chName}
                          </h4>
                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full border border-indigo-200/50">
                            {channelItems.length} فيديو مجدول
                          </span>
                        </div>

                        {/* Destination Platform & Account Badges */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-400">وجهة النشر والحساب:</span>
                          {channelTargetsList.map((target, idx) => (
                            <span
                              key={`ch-target-${idx}-${target.id}`}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-xl border text-[11px] font-bold shadow-2xs ${getPlatformBadgeStyle(target.service, target.platform)}`}
                            >
                              {target.avatar ? (
                                <img 
                                  src={target.avatar} 
                                  alt={target.service_username} 
                                  className="w-3.5 h-3.5 rounded-full object-cover border border-white/80 shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-xs">{getPlatformIcon(target.service, target.platform)}</span>
                              )}
                              <span className="font-extrabold">{target.formatted_service}</span>
                              <span className="font-mono text-[10px]" dir="ltr">@{target.service_username}</span>
                              {target.account_name && (
                                <span className="text-[9px] opacity-75 font-normal">
                                  ({target.account_name})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 text-[10px] font-medium text-slate-500 flex-wrap">
                          {chPending > 0 && (
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 font-bold">
                              ⏳ {chPending} في الانتظار
                            </span>
                          )}
                          {chPaused > 0 && (
                            <span className="text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200 font-bold">
                              ⏸️ {chPaused} موقوف
                            </span>
                          )}
                          {chCompleted > 0 && (
                            <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 font-bold">
                              ✓ {chCompleted} تم النشر
                            </span>
                          )}
                          {chFailed > 0 && (
                            <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100 font-bold">
                              ✕ {chFailed} فشل
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto justify-between md:justify-end shrink-0 pt-2 md:pt-0 border-t md:border-0 border-slate-200/60">
                      {chPending > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePauseChannel(chName, channelItems);
                          }}
                          className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="إيقاف مؤقت لكل الفيديوهات بانتظار النشر لهذه القناة"
                        >
                          <Pause className="w-3.5 h-3.5 text-amber-700" />
                          <span>إيقاف مؤقت ({chPending})</span>
                        </button>
                      )}

                      {chPaused > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleResumeChannel(chName, channelItems);
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="استئناف نشر الفيديوهات الموقوفة مؤقتاً لهذه القناة"
                        >
                          <Play className="w-3.5 h-3.5 text-emerald-700" />
                          <span>استئناف ({chPaused})</span>
                        </button>
                      )}

                      {(chPending > 0 || chPaused > 0 || chFailed > 0) && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelChannel(chName, channelItems);
                          }}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                          title="إلغاء جدولة وحذف كافة فيديوهات هذه القناة غير المنشورة"
                        >
                          <Trash className="w-3.5 h-3.5 text-rose-600" />
                          <span>إلغاء الجدولة</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleChannelOpen(chName);
                        }}
                        className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-indigo-900 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                      >
                        <span>{isExpanded ? "إخفاء القائمة" : "عرض قائمة الفيديوهات"}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-indigo-600" /> : <ChevronDown className="w-4 h-4 text-indigo-600" />}
                      </button>
                    </div>
                  </div>

                  {/* Channel's Videos List */}
                  {isExpanded && (
                    <div className="bg-white">
                      {/* Destination Summary Info Strip */}
                      <div className="p-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/30 to-slate-50 border-b border-slate-150 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <Globe className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-bold text-slate-700">وجهة النشر والحسابات المربوطة بهذه التجميعة:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {channelTargetsList.map((target, idx) => (
                            <div 
                              key={`banner-target-${idx}-${target.id}`}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs"
                            >
                              {target.avatar ? (
                                <img 
                                  src={target.avatar} 
                                  alt={target.service_username} 
                                  className="w-5 h-5 rounded-full object-cover border border-slate-200 shrink-0" 
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <span className="text-sm">{getPlatformIcon(target.service, target.platform)}</span>
                              )}
                              <div className="text-right">
                                <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[11px]">
                                  <span>{target.formatted_service}</span>
                                  <span className="text-indigo-600 font-mono" dir="ltr">@{target.service_username}</span>
                                </div>
                                <div className="text-[9px] text-slate-400 font-medium">
                                  مزود الربط: {target.platform === "zernio" ? "Zernio ⚡" : "Buffer 🌐"} {target.account_name ? `• حساب: ${target.account_name}` : ""}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {channelItems.map((item) => renderVideoItem(item))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Flat View */
          <div className="border border-slate-100 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white">
            {filteredClones.map((item) => renderVideoItem(item))}
          </div>
        )}
      </div>
    </div>
  );
}
