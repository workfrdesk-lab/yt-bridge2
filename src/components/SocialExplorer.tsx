import { useState, useEffect } from "react";
import { 
  Search, 
  Loader2, 
  AlertCircle, 
  Settings, 
  Info, 
  CheckCircle2, 
  Flame, 
  ShieldCheck, 
  Download, 
  Eye, 
  ArrowUpDown, 
  Clock, 
  Copy, 
  Play, 
  X, 
  Edit3, 
  ExternalLink,
  Share2,
  ThumbsUp,
  SlidersHorizontal,
  CheckSquare,
  Square,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Terminal,
  HelpCircle,
  Sparkles,
  CopyCheck,
  Zap,
  FileText,
  Calendar,
  Instagram,
  Youtube
} from "lucide-react";
import { SocialVideo, SocialChannelData, VideoInfo } from "../types";
import VideoEditor from "./VideoEditor";
import CloudinaryUploader from "./CloudinaryUploader";
import { supabase } from "../lib/supabase";
import { CopyContentModal } from "./CopyContentModal";

interface SocialExplorerProps {
  cookiesText: string;
  proxyText: string;
  onUploadSuccess: (cloudinaryUrl: string, videoInfo: VideoInfo) => void;
  onSelectForMainWorkspace?: (videoInfo: VideoInfo) => void;
  onScheduleSelected?: (videos: any[]) => void;
  currentUser?: any;
}

export default function SocialExplorer({
  cookiesText,
  proxyText,
  onUploadSuccess,
  onSelectForMainWorkspace,
  onScheduleSelected,
  currentUser
}: SocialExplorerProps) {
  // Active platform tab
  const [platform, setPlatform] = useState<"tiktok" | "facebook" | "youtube" | "instagram">("tiktok");

  // Inputs
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [data, setData] = useState<SocialChannelData | null>(null);

  // Search history for social explorer
  const [exploredAccounts, setExploredAccounts] = useState<{ platform: "tiktok" | "facebook" | "youtube" | "instagram"; title: string; query: string }[]>(() => {
    try {
      const saved = localStorage.getItem("social_explored_accounts");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to read explored accounts from localStorage:", e);
    }
    return [
      { platform: "tiktok", title: "Khaby Lame", query: "@khaby.lame" },
      { platform: "youtube", title: "MrBeast", query: "@MrBeast" },
      { platform: "instagram", title: "National Geographic", query: "natgeo" },
      { platform: "facebook", title: "BBC News", query: "BBCNews" }
    ];
  });

  useEffect(() => {
    try {
      localStorage.setItem("social_explored_accounts", JSON.stringify(exploredAccounts));
    } catch (e) {
      console.warn("Failed to write explored accounts to localStorage:", e);
    }
  }, [exploredAccounts]);

  // Filtering & Sorting
  const [searchFilter, setSearchFilter] = useState("");
  const [sortBy, setSortBy] = useState<"default" | "views_desc" | "likes_desc" | "duration_desc" | "duration_asc">("default");
  const [selectedVideos, setSelectedVideos] = useState<SocialVideo[]>([]);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [data, searchFilter, sortBy, platform]);

  // Sequential Scheduling & Copy Content Modal state
  const [isLocalCopyModalOpen, setIsLocalCopyModalOpen] = useState(false);
  const [localModalVideos, setLocalModalVideos] = useState<any[]>([]);

  const handleTriggerCopySchedule = (vidsToSchedule: SocialVideo[]) => {
    if (!vidsToSchedule || vidsToSchedule.length === 0) return;
    const mapped = vidsToSchedule.map((v) => ({
      id: v.id,
      title: v.title || v.description || "فيديو بدون عنوان",
      url: v.url || v.directVideoUrl || "",
      thumbnail: v.thumbnail || "",
      description: v.description || "",
      uploader: v.uploader || "Social Creator",
      platform: v.platform || platform
    }));

    if (onScheduleSelected) {
      onScheduleSelected(mapped);
    } else {
      setLocalModalVideos(mapped);
      setIsLocalCopyModalOpen(true);
    }
  };

  // Preview & Editing states
  const [previewVideo, setPreviewVideo] = useState<SocialVideo | null>(null);
  const [previewStreamUrl, setPreviewStreamUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [copiedCaption, setCopiedCaption] = useState<boolean>(false);

  const [editingVideoInfo, setEditingVideoInfo] = useState<VideoInfo | null>(null);
  const [extractingVideoId, setExtractingVideoId] = useState<string | null>(null);

  // Anti-bot settings panel
  const [showConfig, setShowConfig] = useState(false);
  const [localCookies, setLocalCookies] = useState(cookiesText);
  const [apifyToken, setApifyToken] = useState<string>(() => localStorage.getItem("apify_token") || "");
  const [apifyActorId, setApifyActorId] = useState<string>(() => localStorage.getItem("apify_actor_id") || "apify/facebook-posts-scraper");
  const [apifyInstagramActorId, setApifyInstagramActorId] = useState<string>(() => localStorage.getItem("apify_instagram_actor_id") || "apify/instagram-reel-scraper");
  const [apifyTesting, setApifyTesting] = useState(false);
  const [apifySavingDb, setApifySavingDb] = useState(false);
  const [apifySavedToDb, setApifySavedToDb] = useState(false);
  const [apifyTestMsg, setApifyTestMsg] = useState<{ success: boolean; message: string } | null>(null);

  // Error UI states
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [copiedError, setCopiedError] = useState(false);

  useEffect(() => {
    // Load from database on component mount
    fetch("/api/global-apify")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.apify_token) {
          setApifyToken(data.apify_token);
          localStorage.setItem("apify_token", data.apify_token);
        }
        if (data && data.apify_actor_id) {
          setApifyActorId(data.apify_actor_id);
          localStorage.setItem("apify_actor_id", data.apify_actor_id);
        }
        if (data && data.apify_instagram_actor_id) {
          setApifyInstagramActorId(data.apify_instagram_actor_id);
          localStorage.setItem("apify_instagram_actor_id", data.apify_instagram_actor_id);
        }
      })
      .catch((err) => console.warn("Failed to load global Apify settings in SocialExplorer:", err));

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) {
        supabase.settings.get(data.user.id).then(({ data: userSet }) => {
          if (userSet?.apify_token) {
            setApifyToken(userSet.apify_token);
            localStorage.setItem("apify_token", userSet.apify_token);
          }
          if (userSet?.apify_actor_id) {
            setApifyActorId(userSet.apify_actor_id);
            localStorage.setItem("apify_actor_id", userSet.apify_actor_id);
          }
          if ((userSet as any)?.apify_instagram_actor_id) {
            setApifyInstagramActorId((userSet as any).apify_instagram_actor_id);
            localStorage.setItem("apify_instagram_actor_id", (userSet as any).apify_instagram_actor_id);
          }
        });
      }
    });
  }, []);

  const handleSaveApifyToken = (token: string) => {
    setApifyToken(token);
    localStorage.setItem("apify_token", token);
  };

  const handleSaveApifyActorId = (actorId: string) => {
    setApifyActorId(actorId);
    localStorage.setItem("apify_actor_id", actorId);
  };

  const handlePersistApifyToDb = async (overrideToken?: string, overrideActor?: string) => {
    const tokenVal = (overrideToken !== undefined ? overrideToken : apifyToken).trim();
    const actorVal = (overrideActor !== undefined ? overrideActor : apifyActorId).trim();

    setApifySavingDb(true);
    setApifySavedToDb(false);

    try {
      localStorage.setItem("apify_token", tokenVal);
      localStorage.setItem("apify_actor_id", actorVal);

      // Save to global_settings table in PostgreSQL
      await fetch("/api/global-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apify_token: tokenVal,
          apify_actor_id: actorVal
        })
      });

      // Also save to user_settings table if logged in
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        await supabase.settings.update(data.user.id, {
          apify_token: tokenVal,
          apify_actor_id: actorVal
        });
      }

      setApifySavedToDb(true);
      setTimeout(() => setApifySavedToDb(false), 4000);
    } catch (err: any) {
      console.error("Failed to save Apify token to database:", err);
      alert("فشل حفظ الرمز في قاعدة البيانات: " + err.message);
    } finally {
      setApifySavingDb(false);
    }
  };

  const handleTestApifyToken = async () => {
    if (!apifyToken.trim()) {
      setApifyTestMsg({ success: false, message: "يرجى إدخال رمز Apify أولاً." });
      return;
    }
    setApifyTesting(true);
    setApifyTestMsg(null);
    try {
      const res = await fetch("/api/test-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apifyToken: apifyToken.trim() })
      });
      const result = await res.json();
      if (result.success) {
        setApifyTestMsg({
          success: true,
          message: `تم الاتصال بـ Apify بنجاح! اسم المستخدم: ${result.username} | الباقة: ${result.plan}`
        });
      } else {
        setApifyTestMsg({
          success: false,
          message: result.error || "رمز Apify غير صالح."
        });
      }
    } catch (err: any) {
      setApifyTestMsg({
        success: false,
        message: `فشل الفحص: ${err.message}`
      });
    } finally {
      setApifyTesting(false);
    }
  };

  // Presets
  const tiktokPresets = [
    { name: "Khaby Lame 🇮🇹", handle: "@khaby.lame" },
    { name: "Zach King 🧙‍♂️", handle: "@zachking" },
    { name: "Charli D'Amelio ✨", handle: "@charlidamelio" },
    { name: "TikTok Official 🎵", handle: "@tiktok" }
  ];

  const facebookPresets = [
    { name: "National Geographic 🌍", handle: "NationalGeographic" },
    { name: "BBC News 📰", handle: "BBCNews" },
    { name: "NASA Space 🚀", handle: "NASA" },
    { name: "TED Talks 💡", handle: "TED" }
  ];

  const youtubePresets = [
    { name: "MrBeast 🏆", handle: "@MrBeast" },
    { name: "MKBHD 📱", handle: "@mkbhd" },
    { name: "الجزيرة 📰", handle: "@AlJazeeraArabic" },
    { name: "العربية 🇸🇦", handle: "@AlArabiya" },
    { name: "DW عربية 🇩🇪", handle: "@dwarabic" },
    { name: "TED 💡", handle: "@TED" }
  ];

  const instagramPresets = [
    { name: "Cristiano Ronaldo ⚽", handle: "cristiano" },
    { name: "National Geographic 🌍", handle: "natgeo" },
    { name: "Instagram 📷", handle: "instagram" },
    { name: "NASA 🚀", handle: "nasa" }
  ];

  // Fetch videos for a handle or account
  const handleFetchVideos = async (overrideQuery?: string, overridePlatform?: "tiktok" | "facebook" | "youtube" | "instagram") => {
    let targetPlatform = overridePlatform || platform;
    const targetQuery = overrideQuery !== undefined ? overrideQuery : query;

    // Auto-detect platform from URL if user pasted a link
    if (targetQuery.includes("youtube.com") || targetQuery.includes("youtu.be")) {
      targetPlatform = "youtube";
      setPlatform("youtube");
    } else if (targetQuery.includes("instagram.com")) {
      targetPlatform = "instagram";
      setPlatform("instagram");
    } else if (targetQuery.includes("facebook.com") || targetQuery.includes("fb.watch") || targetQuery.includes("fb.com")) {
      targetPlatform = "facebook";
      setPlatform("facebook");
    } else if (targetQuery.includes("tiktok.com")) {
      targetPlatform = "tiktok";
      setPlatform("tiktok");
    }

    if (!targetQuery.trim()) {
      let msg = "يرجى إدخال اسم مستخدم تيكتوك أولاً.";
      if (targetPlatform === "facebook") msg = "يرجى إدخال رابط أو اسم صفحة فيسبوك أولاً.";
      else if (targetPlatform === "youtube") msg = "يرجى إدخال رابط أو اسم قناة يوتيوب أولاً.";
      else if (targetPlatform === "instagram") msg = "يرجى إدخال رابط أو اسم حساب انستقرام أولاً.";
      setError(msg);
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setData(null);
    setSelectedVideos([]);
    setEditingVideoInfo(null);

    try {
      const res = await fetch("/api/social-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: targetPlatform,
          query: targetQuery,
          cookiesText: localCookies || cookiesText,
          proxyUrl: proxyText,
          apifyToken: apifyToken || localStorage.getItem("apify_token") || "",
          apifyActorId: apifyActorId || localStorage.getItem("apify_actor_id") || "",
          apifyInstagramActorId: apifyInstagramActorId || localStorage.getItem("apify_instagram_actor_id") || ""
        })
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error || "فشل جلب قائمة الفيديوهات.");
        setErrorDetails(result.details || null);
        return;
      }

      setData(result);
      if (overrideQuery) setQuery(overrideQuery);

      // Save to history
      setExploredAccounts((prev) => {
        const filtered = prev.filter((item) => !(item.platform === targetPlatform && item.query === targetQuery));
        return [{ platform: targetPlatform, title: result.accountName || targetQuery, query: targetQuery }, ...filtered].slice(0, 12);
      });

    } catch (err: any) {
      console.error("Social videos fetch error:", err);
      setError("حدث خطأ أثناء الاتصال بالخادم لجلب مقاطع الفيديو.");
      setErrorDetails(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  // Helper to open video preview and resolve streamable video player URL
  const handleOpenPreview = async (video: SocialVideo) => {
    setPreviewVideo(video);
    setPreviewError(null);
    setCopiedCaption(false);

    // If video already has a local stream URL (e.g. /api/tiktok/serve)
    if (video.directVideoUrl && video.directVideoUrl.startsWith("/api/")) {
      setPreviewStreamUrl(video.directVideoUrl);
      setPreviewLoading(false);
      return;
    }

    setPreviewLoading(true);
    setPreviewStreamUrl(null);

    try {
      const res = await fetch("/api/social-video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: video.url,
          directVideoUrl: video.directVideoUrl,
          title: video.title,
          thumbnail: video.thumbnail,
          uploader: video.uploader,
          description: video.description,
          platform: video.platform || platform,
          cookiesText: localCookies || cookiesText,
          proxyUrl: proxyText,
          apifyToken: apifyToken || localStorage.getItem("apify_token") || "",
          apifyActorId: apifyActorId || localStorage.getItem("apify_actor_id") || "",
          apifyInstagramActorId: apifyInstagramActorId || localStorage.getItem("apify_instagram_actor_id") || ""
        })
      });

      const info: any = await res.json();
      if (res.ok) {
        if (info.bestVideoUrl) {
          setPreviewStreamUrl(info.bestVideoUrl);
        }
        if (info.description) {
          video.description = info.description;
        }
        if (info.title && !info.title.includes("منشور فيسبوك (")) {
          video.title = info.title;
        }
        setPreviewVideo((prev) => prev ? {
          ...prev,
          description: info.description || prev.description,
          title: info.title || prev.title,
          uploader: info.uploader || prev.uploader
        } : null);
      } else {
        setPreviewError(info.error || "تعذر تجهيز مشغل الفيديو المباشر داخل هذه النافذة.");
      }
    } catch (err: any) {
      console.warn("[Preview] Stream resolution failed:", err);
      setPreviewError("فشل الاتصال بالخادم لجلب رابط تشغيل الفيديو.");
    } finally {
      setPreviewLoading(false);
    }
  };

  // Helper to extract detailed video info and start editing
  const handleStartEditing = async (video: SocialVideo) => {
    setExtractingVideoId(video.id);
    setError(null);

    try {
      const res = await fetch("/api/social-video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: video.url,
          directVideoUrl: video.directVideoUrl,
          title: video.title,
          thumbnail: video.thumbnail,
          uploader: video.uploader,
          description: video.description,
          platform: video.platform || platform,
          cookiesText: localCookies || cookiesText,
          proxyUrl: proxyText,
          apifyToken: apifyToken || localStorage.getItem("apify_token") || "",
          apifyActorId: apifyActorId || localStorage.getItem("apify_actor_id") || "",
          apifyInstagramActorId: apifyInstagramActorId || localStorage.getItem("apify_instagram_actor_id") || ""
        })
      });

      const videoInfo: VideoInfo = await res.json();

      if (!res.ok) {
        const cleanDesc = (video.description && !video.description.includes("منشور فيسبوك (") && !video.description.startsWith("Facebook Creator -")) ? video.description : "";
        const fallbackInfo: VideoInfo = {
          id: video.id,
          title: video.title,
          thumbnail: video.thumbnail,
          duration: video.duration,
          uploader: video.uploader || "Social Creator",
          description: cleanDesc,
          bestVideoUrl: video.directVideoUrl || video.url,
          videoUrl: video.url,
          formats: []
        };
        setEditingVideoInfo(fallbackInfo);
        if (onSelectForMainWorkspace) onSelectForMainWorkspace(fallbackInfo);
        return;
      }

      if (!videoInfo.description || videoInfo.description.includes("منشور فيسبوك (") || videoInfo.description.startsWith("Facebook Creator -")) {
        videoInfo.description = (video.description && !video.description.includes("منشور فيسبوك (") && !video.description.startsWith("Facebook Creator -"))
          ? video.description
          : "";
      }

      setEditingVideoInfo(videoInfo);
      if (onSelectForMainWorkspace) onSelectForMainWorkspace(videoInfo);

    } catch (err: any) {
      console.warn("Falling back to basic info:", err);
      const cleanDesc = (video.description && !video.description.includes("منشور فيسبوك (") && !video.description.startsWith("Facebook Creator -")) ? video.description : "";
      const fallbackInfo: VideoInfo = {
        id: video.id,
        title: video.title,
        thumbnail: video.thumbnail,
        duration: video.duration,
        uploader: video.uploader || "Social Creator",
        description: cleanDesc,
        bestVideoUrl: video.directVideoUrl || video.url,
        videoUrl: video.url,
        formats: []
      };
      setEditingVideoInfo(fallbackInfo);
    } finally {
      setExtractingVideoId(null);
    }
  };

  // Checkbox Selection Logic
  const toggleSelectVideo = (video: SocialVideo) => {
    setSelectedVideos((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      if (exists) return prev.filter((v) => v.id !== video.id);
      return [...prev, video];
    });
  };

  const handleSelectAll = (filteredVideos: SocialVideo[]) => {
    const allSelected = filteredVideos.every((v) => selectedVideos.some((sv) => sv.id === v.id));
    if (allSelected) {
      setSelectedVideos((prev) => prev.filter((v) => !filteredVideos.some((fv) => fv.id === v.id)));
    } else {
      setSelectedVideos((prev) => {
        const toAdd = filteredVideos.filter((fv) => !prev.some((sv) => sv.id === fv.id));
        return [...prev, ...toAdd];
      });
    }
  };

  const copySelectedUrls = () => {
    if (selectedVideos.length === 0) return;
    const urlsText = selectedVideos.map((v) => v.url).join("\n");
    navigator.clipboard.writeText(urlsText);
    alert(`تم نسخ ${selectedVideos.length} رابط بنجاح إلى الحافظة!`);
  };

  // Filtered & Sorted Videos
  const filteredVideos = (data?.videos || [])
    .filter((v) => {
      if (!searchFilter.trim()) return true;
      return v.title.toLowerCase().includes(searchFilter.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "views_desc") return (b.views || 0) - (a.views || 0);
      if (sortBy === "likes_desc") return (b.likes || 0) - (a.likes || 0);
      if (sortBy === "duration_desc") return (b.duration || 0) - (a.duration || 0);
      if (sortBy === "duration_asc") return (a.duration || 0) - (b.duration || 0);
      return 0; // default
    });

  const totalPages = Math.ceil(filteredVideos.length / ITEMS_PER_PAGE) || 1;
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  const paginatedVideos = filteredVideos.slice((validCurrentPage - 1) * ITEMS_PER_PAGE, validCurrentPage * ITEMS_PER_PAGE);

  const formatDuration = (secs: number) => {
    if (!secs) return "00:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const formatNumber = (num?: number | null) => {
    if (!num) return null;
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  return (
    <div className="space-y-6 animate-fade-in" id="social-explorer">
      {/* Top Main Section Card */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-5">
        
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Share2 className="w-5 h-5 text-indigo-600" />
              <span>مستكشف Social Media</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              استعرض قائمة الفيديوهات لأي حساب تيكتوك، صفحة فيسبوك، قناة يوتيوب، أو حساب انستقرام، ثم قم بمعاينتها أو تعديلها أو رفعها مباشرة لحساباتك.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setPlatform("tiktok");
                setQuery("");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platform === "tiktok"
                  ? "bg-zinc-950 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94 1.18 2.22 2.02 3.61 2.45.02 1.35.01 2.68.01 4.02-1.34-.14-2.61-.69-3.61-1.57-.45-.4-.84-.86-1.15-1.37v6.07c.07 1.48-.3 2.97-1.13 4.2-1.12 1.63-2.91 2.72-4.88 2.94-1.92.23-3.9-.3-5.38-1.55-1.53-1.28-2.39-3.26-2.28-5.26.11-2.1 1.25-4.06 3.06-5.11 1.34-.8 2.92-1.07 4.45-.75.01 1.39.01 2.77.01 4.15-1 .15-2.02.66-2.58 1.51-.55.83-.58 1.95-.12 2.77.46.82 1.34 1.36 2.28 1.39.95.03 1.9-.38 2.44-1.15.54-.76.71-1.74.56-2.67V0h3.91z"/>
              </svg>
              <span>تيكتوك</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform("facebook");
                setQuery("");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platform === "facebook"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="font-extrabold text-sm">f</span>
              <span>فيسبوك</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform("youtube");
                setQuery("");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platform === "youtube"
                  ? "bg-red-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current text-white" viewBox="0 0 24 24">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
              <span>يوتيوب</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setPlatform("instagram");
                setQuery("");
                setError(null);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                platform === "instagram"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
              </svg>
              <span>انستقرام</span>
            </button>
          </div>
        </div>

        {/* Input & Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder={
                platform === "tiktok"
                  ? "أدخل اسم مستخدم تيكتوك (مثال: @khaby.lame أو khaby.lame أو رابط الحساب)"
                  : platform === "facebook"
                  ? "أدخل رابط أو اسم صفحة فيسبوك (مثال: NationalGeographic أو رابط الصفحة)"
                  : platform === "youtube"
                  ? "أدخل اسم قناة يوتيوب أو المعرّف (مثال: @MrBeast أو رابط القناة)"
                  : "أدخل اسم مستخدم انستقرام (مثال: natgeo أو رابط الحساب)"
              }
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={loading}
              className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-sm focus:outline-none transition-all placeholder:text-slate-400 text-right"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleFetchVideos();
              }}
            />
            <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400">
              <Search className="w-5 h-5" />
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleFetchVideos()}
            disabled={loading}
            className={`px-6 py-3.5 font-bold text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 text-white shrink-0 min-w-[150px] ${
              platform === "tiktok"
                ? "bg-zinc-900 hover:bg-zinc-800"
                : platform === "facebook"
                ? "bg-blue-600 hover:bg-blue-700"
                : platform === "youtube"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري السحب...</span>
              </>
            ) : (
              <>
                <span>جلب الفيديوهات</span>
              </>
            )}
          </button>

          {platform === "youtube" && (
            <button
              type="button"
              onClick={() => handleFetchVideos("trending", "youtube")}
              disabled={loading}
              className="px-4 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
              <span>الأكثر رواجاً 🔥</span>
            </button>
          )}
        </div>

        {/* Preset Quick Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <span className="text-slate-400 font-medium">مقترحات للتجربة السريعة:</span>
          {(platform === "tiktok"
            ? tiktokPresets
            : platform === "facebook"
            ? facebookPresets
            : platform === "youtube"
            ? youtubePresets
            : instagramPresets
          ).map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleFetchVideos(preset.handle)}
              disabled={loading}
              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 font-medium transition-colors cursor-pointer flex items-center gap-1"
            >
              <span>{preset.name}</span>
            </button>
          ))}
        </div>

        {/* Collapsible Cookie Settings Panel */}
        <div id="apify-settings-panel" className="border-t border-slate-100 pt-3">
          <button
            type="button"
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>إعدادات تجنب الحظر والبروكسي (إذا طلب الحساب إثبات الهوية)</span>
          </button>

          {showConfig && (
            <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4 animate-fade-in text-right">
              {/* Apify API Section */}
              <div className="bg-white p-3.5 rounded-lg border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                    تكامل Apify.com لجلب فيديوهات وريلز فيسبوك (موصى به)
                  </span>
                  <a
                    href="https://console.apify.com/billing/integrations"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                  >
                    احصل على API Key مجاناً من Apify
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  عند إضافة مفتاح API الخاص بك من Apify، سيتم جلب فيديوهات وريلز فيسبوك عبر خوادم Apify السحابية لتجنب جدران الحماية ونوافذ تسجيل الدخول بالكامل.
                </p>

                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-700">Apify API Token:</label>
                  <div className="flex gap-2">
                    <input
                      type="password"
                      placeholder="apify_api_..."
                      value={apifyToken}
                      onChange={(e) => handleSaveApifyToken(e.target.value)}
                      onBlur={() => handlePersistApifyToDb()}
                      className="flex-1 p-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-mono focus:outline-none placeholder:text-slate-400 text-left"
                      style={{ direction: "ltr" }}
                    />
                    <button
                      type="button"
                      onClick={() => handlePersistApifyToDb()}
                      disabled={apifySavingDb || !apifyToken.trim()}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {apifySavingDb ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                      <span>حفظ في قاعدة البيانات</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleTestApifyToken}
                      disabled={apifyTesting || !apifyToken.trim()}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      {apifyTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "فحص الرمز"}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-semibold text-slate-700">مكشطة Apify المفضلة (Actor ID):</label>
                  <select
                    value={apifyActorId}
                    onChange={(e) => {
                      handleSaveApifyActorId(e.target.value);
                      handlePersistApifyToDb(apifyToken, e.target.value);
                    }}
                    className="w-full p-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs focus:outline-none"
                  >
                    <option value="apify/facebook-posts-scraper">apify/facebook-posts-scraper (منشورات وفيديوهات الصفحات)</option>
                    <option value="apify/facebook-reels-scraper">apify/facebook-reels-scraper (ريلز فيسبوك)</option>
                    <option value="apify/facebook-pages-scraper">apify/facebook-pages-scraper (صفحات فيسبوك الكاملة)</option>
                  </select>
                </div>

                {apifySavedToDb && (
                  <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>تم حفظ الرمز وإعدادات Apify في قاعدة البيانات بنجاح!</span>
                  </div>
                )}

                {apifyTestMsg && (
                  <div className={`p-2.5 rounded-lg text-xs ${apifyTestMsg.success ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-rose-50 text-rose-800 border border-rose-200"}`}>
                    {apifyTestMsg.message}
                  </div>
                )}
              </div>

              {/* Cookies & Proxy Fallback Section */}
              <div className="space-y-2 pt-1 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <span>ملفات تعريف الارتباط (Netscape HTTP Cookies) لمنع الحظر:</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${localCookies.trim() ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-600"}`}>
                      {localCookies.trim() ? "مُفعّلة ✓" : "اختياري"}
                    </span>
                  </p>
                  {localCookies.trim() && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalCookies("");
                        localStorage.removeItem("yt_cookies");
                      }}
                      className="text-xs text-rose-600 hover:underline cursor-pointer font-medium"
                    >
                      مسح الكوكيز
                    </button>
                  )}
                </div>
                <textarea
                  placeholder="# Netscape HTTP Cookie File..."
                  value={localCookies}
                  onChange={(e) => {
                    setLocalCookies(e.target.value);
                    localStorage.setItem("yt_cookies", e.target.value);
                  }}
                  className="w-full h-24 p-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-mono focus:outline-none placeholder:text-slate-400 text-left"
                  style={{ direction: "ltr" }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Explored Accounts History Pills */}
      {exploredAccounts.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs space-y-2">
          <h4 className="text-xs font-bold text-slate-600">السجل والسحب السابق:</h4>
          <div className="flex flex-wrap gap-2">
            {exploredAccounts.map((item, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setPlatform(item.platform);
                  handleFetchVideos(item.query, item.platform);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-indigo-300 text-xs text-slate-700 font-semibold transition-all cursor-pointer flex items-center gap-1.5"
              >
                <span className={`w-2 h-2 rounded-full ${
                  item.platform === "tiktok"
                    ? "bg-zinc-900"
                    : item.platform === "facebook"
                    ? "bg-blue-600"
                    : item.platform === "youtube"
                    ? "bg-red-600"
                    : "bg-pink-600"
                }`}></span>
                <span>{item.title}</span>
                <span className="text-[10px] text-slate-400">
                  ({item.platform === "tiktok" ? "TikTok" : item.platform === "facebook" ? "Facebook" : item.platform === "youtube" ? "YouTube" : "Instagram"})
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Enhanced Interactive Error Card */}
      {error && (
        <div className="bg-gradient-to-br from-rose-50/90 via-white to-amber-50/40 border border-rose-200 rounded-2xl p-5 shadow-xs space-y-4 animate-fade-in text-right">
          
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-rose-100 pb-3.5">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                error.includes("Apify") || error.includes("401") || error.includes("402") || error.includes("429") || error.includes("رمز")
                  ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : error.includes("404") || error.includes("لم تُرجع") || error.includes("نتائج")
                  ? "bg-sky-100 text-sky-700 border border-sky-200"
                  : "bg-rose-100 text-rose-700 border border-rose-200"
              }`}>
                {error.includes("Apify") || error.includes("401") || error.includes("402") || error.includes("429") || error.includes("رمز") ? (
                  <KeyRound className="w-5 h-5" />
                ) : error.includes("404") || error.includes("لم تُرجع") ? (
                  <HelpCircle className="w-5 h-5" />
                ) : (
                  <ShieldAlert className="w-5 h-5" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900">
                    {error.includes("Apify") || error.includes("401") || error.includes("402") || error.includes("429")
                      ? "مشكلة في إعدادات أو رصيد Apify"
                      : error.includes("لم تُرجع") || error.includes("404")
                      ? "لم يتم العثور على مقاطع فيديو متاحة"
                      : `فشل جلب فيديوهات ${platform === "facebook" ? "صفحة فيسبوك" : platform === "youtube" ? "قناة يوتيوب" : platform === "instagram" ? "حساب انستقرام" : "حساب تيكتوك"}`}
                  </h4>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                    error.includes("Apify") || error.includes("401") || error.includes("402")
                      ? "bg-amber-100 text-amber-800"
                      : platform === "youtube"
                      ? "bg-red-100 text-red-800"
                      : platform === "instagram"
                      ? "bg-pink-100 text-pink-800"
                      : platform === "facebook"
                      ? "bg-blue-100 text-blue-800"
                      : "bg-rose-100 text-rose-800"
                  }`}>
                    {platform === "facebook" ? "فيسبوك Facebook" : platform === "youtube" ? "يوتيوب YouTube" : platform === "instagram" ? "انستقرام Instagram" : "تيكتوك TikTok"}
                  </span>
                </div>
                <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                  {error}
                </p>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap w-full sm:w-auto">
              <button
                type="button"
                onClick={() => handleFetchVideos()}
                disabled={loading}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                <span>إعادة المحاولة</span>
              </button>

              {(platform === "facebook" || error.includes("Apify") || error.includes("رمز")) && (
                <button
                  type="button"
                  onClick={() => {
                    setShowConfig(true);
                    setTimeout(() => {
                      document.getElementById("apify-settings-panel")?.scrollIntoView({ behavior: "smooth" });
                    }, 100);
                  }}
                  className="flex-1 sm:flex-none px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>تحديث رمز Apify</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  const fullText = `الخطأ: ${error}\n\nالتفاصيل: ${errorDetails || "لا توجد تفاصيل إضافية"}`;
                  navigator.clipboard.writeText(fullText);
                  setCopiedError(true);
                  setTimeout(() => setCopiedError(false), 3000);
                }}
                className="px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                title="نسخ تفاصيل الخطأ"
              >
                {copiedError ? (
                  <>
                    <CopyCheck className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">تم النسخ</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>نسخ الخطأ</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Actionable Solution & Tips Grid */}
          <div className="bg-white/80 rounded-xl p-3.5 border border-slate-200/80 space-y-2.5">
            <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>خطوات موصى بها لحل هذه المشكلة:</span>
            </h5>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
              {platform === "facebook" ? (
                <>
                  <div className="flex items-start gap-2 bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                    <Zap className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>إدخال API Token:</strong> احصل على مفتاح مجاني من <a href="https://console.apify.com/" target="_blank" rel="noreferrer" className="text-indigo-600 underline font-bold">Apify.com</a> وأدخله في إعدادات اللوحة بالأسفل.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>اختيار المكشطة المناسبة:</strong> اختر <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">apify/facebook-reels-scraper</code> للريلز أو <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">apify/facebook-posts-scraper</code> للمنشورات.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <ExternalLink className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span><strong>التحقق من الرابط:</strong> تأكد أن الصفحة عامة (Public Page) وليس بروفايل شخصي مغلق.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <Settings className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span><strong>البروكسي والكوكيز:</strong> إذا ظهر حظر من فيسبوك، أضف ملف Netscape Cookies في قسم الإعدادات.</span>
                  </div>
                </>
              ) : platform === "youtube" ? (
                <>
                  <div className="flex items-start gap-2 bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                    <CheckCircle2 className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span><strong>صيغة معرّف القناة:</strong> أدخل المعرف بـ @ مثل <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">@MrBeast</code> أو <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">@OldCarPlayer</code> أو الرابط المباشر.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span><strong>حل حظر "Sign in to confirm you're not a bot":</strong> قم بإضافة كوكيز يوتيوب من قسم الإعدادات بالأسفل لتجاوز الحظر فوراً.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <Flame className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span><strong>الأكثر رواجاً:</strong> جرب زر "الأكثر رواجاً 🔥" لجلب الفيديوهات الشائعة حالياً.</span>
                  </div>
                </>
              ) : platform === "instagram" ? (
                <>
                  <div className="flex items-start gap-2 bg-pink-50 p-2.5 rounded-lg border border-pink-100">
                    <CheckCircle2 className="w-4 h-4 text-pink-600 shrink-0 mt-0.5" />
                    <span><strong>اسم المستخدم:</strong> أدخل اليوزر مثل <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">@cristiano</code> أو رابط الريلز المباشر.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>جلب فائق عبر Apify:</strong> يمكنك إضافة مفتاح Apify API Token من قسم الإعدادات لجلب كافة ريلز وفيديوهات انستقرام بسرعة فائقة ودون حظر.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                    <span><strong>الحسابات العامة فقط:</strong> تأكد من أن حساب انستقرام عام لتتمكن من استعراض وسحب الريلز.</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <CheckCircle2 className="w-4 h-4 text-zinc-900 shrink-0 mt-0.5" />
                    <span><strong>صيغة اسم المستخدم:</strong> ادخل اسم اليوزر بدون مسافات، مثل: <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">@khaby.lame</code> أو <code className="bg-slate-200 px-1 py-0.5 rounded text-[10px]">khaby.lame</code>.</span>
                  </div>
                  <div className="flex items-start gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    <span><strong>الحسابات العامة فقط:</strong> يتيح المستكشف سحب الفيديوهات من الحسابات العامة (Public). الحسابات الخاصة لا تظهر مقاطعها.</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Collapsible Technical Details */}
          {errorDetails && (
            <div className="border-t border-rose-100 pt-3">
              <button
                type="button"
                onClick={() => setShowErrorDetails(!showErrorDetails)}
                className="flex items-center justify-between w-full text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-slate-500" />
                  <span>سجل التفاصيل التقنية للخطأ (Technical Error Logs)</span>
                </span>
                {showErrorDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showErrorDetails && (
                <div className="mt-2.5 bg-slate-900 text-slate-100 rounded-xl p-3.5 text-[11px] font-mono overflow-x-auto whitespace-pre-wrap max-h-48 border border-slate-800 animate-fade-in relative group" dir="ltr">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(errorDetails);
                      setCopiedError(true);
                      setTimeout(() => setCopiedError(false), 3000);
                    }}
                    className="absolute top-2 right-2 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[10px] font-sans flex items-center gap-1 cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Logs</span>
                  </button>
                  {errorDetails}
                </div>
              )}
            </div>
          )}

        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 space-y-3">
              <div className="bg-slate-200 aspect-video w-full rounded-xl"></div>
              <div className="h-4 bg-slate-200 rounded w-5/6"></div>
              <div className="h-3 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Active Modal View */}
      {editingVideoInfo && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-6 shadow-md space-y-6 animate-fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">تعديل واستيراد مقطع الفيديو: {editingVideoInfo.title}</h3>
                <p className="text-xs text-slate-500">قم بتطبيق الفلاتر وإعادة التوليد لتفادي حقوق النشر، ثم ارفعه مباشرة لحساباتك.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditingVideoInfo(null)}
              className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <VideoEditor videoInfo={editingVideoInfo} selectedFormat={null} />
          
          <CloudinaryUploader
            videoInfo={editingVideoInfo}
            selectedFormat={null}
            onUploadSuccess={(url) => {
              onUploadSuccess(url, editingVideoInfo);
              setEditingVideoInfo(null);
            }}
          />
        </div>
      )}

      {/* Results Section */}
      {data && !loading && (
        <div className="space-y-4 animate-fade-in" id="social-results-section">
          
          {/* Header Stats Bar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-indigo-50 border border-indigo-100 rounded-2xl p-4 gap-3">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl text-white ${
                data.platform === "tiktok"
                  ? "bg-zinc-950"
                  : data.platform === "instagram"
                  ? "bg-gradient-to-r from-purple-600 to-pink-600"
                  : data.platform === "youtube"
                  ? "bg-red-600"
                  : "bg-blue-600"
              }`}>
                {data.platform === "tiktok" ? (
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94 1.18 2.22 2.02 3.61 2.45.02 1.35.01 2.68.01 4.02-1.34-.14-2.61-.69-3.61-1.57-.45-.4-.84-.86-1.15-1.37v6.07c.07 1.48-.3 2.97-1.13 4.2-1.12 1.63-2.91 2.72-4.88 2.94-1.92.23-3.9-.3-5.38-1.55-1.53-1.28-2.39-3.26-2.28-5.26.11-2.1 1.25-4.06 3.06-5.11 1.34-.8 2.92-1.07 4.45-.75.01 1.39.01 2.77.01 4.15-1 .15-2.02.66-2.58 1.51-.55.83-.58 1.95-.12 2.77.46.82 1.34 1.36 2.28 1.39.95.03 1.9-.38 2.44-1.15.54-.76.71-1.74.56-2.67V0h3.91z"/>
                  </svg>
                ) : data.platform === "instagram" ? (
                  <Instagram className="w-5 h-5" />
                ) : data.platform === "youtube" ? (
                  <Youtube className="w-5 h-5" />
                ) : (
                  <span className="font-bold text-lg leading-none">f</span>
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {data.platform === "tiktok"
                    ? "حساب تيكتوك"
                    : data.platform === "instagram"
                    ? "حساب انستقرام"
                    : data.platform === "youtube"
                    ? "قناة يوتيوب"
                    : "صفحة فيسبوك"}: {data.accountName}
                </h3>
                <a
                  href={data.accountUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1 mt-0.5"
                >
                  <span>عرض الحساب الأصلي</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1.5 rounded-xl">
                إجمالي المقاطع: {data.videos.length} فيديو
              </span>
            </div>
          </div>

          {/* Filtering and Sort Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-100 shadow-xs">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="تصفية في عناوين الفيديوهات..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="w-full pl-3 pr-9 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs focus:outline-none"
              />
              <Search className="w-4 h-4 text-slate-400 absolute top-1/2 right-3 -translate-y-1/2" />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-2 rounded-xl text-xs font-medium text-slate-700">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                <span>الترتيب:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent font-bold focus:outline-none text-slate-800 cursor-pointer"
                >
                  <option value="default">الافتراضي</option>
                  <option value="views_desc">الأكثر مشاهدة</option>
                  <option value="likes_desc">الأكثر إعجاباً</option>
                  <option value="duration_desc">الأطول مدة</option>
                  <option value="duration_asc">الأقصر مدة</option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handleSelectAll(filteredVideos)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
              >
                {filteredVideos.every((v) => selectedVideos.some((sv) => sv.id === v.id)) && filteredVideos.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400" />
                )}
                <span>تحديد الكل ({filteredVideos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedVideos(filteredVideos);
                  handleTriggerCopySchedule(filteredVideos);
                }}
                className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5 shrink-0"
                title="نسخ وجدولة جميع المقاطع المعروضة بالتتابع في صفحة الجدولة"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
                <span>نسخ كل المحتوى</span>
              </button>
            </div>
          </div>

          {/* Bulk Selection Toolbar */}
          {selectedVideos.length > 0 && (
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3 animate-fade-in shadow-md border border-indigo-500/30">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-4.5 h-4.5 text-emerald-300" />
                <span>تم تحديد {selectedVideos.length} فيديو للنسخ والجدولة المتتابعة</span>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleTriggerCopySchedule(selectedVideos)}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold rounded-xl text-xs transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-amber-200" />
                  <span>نسخ وجدولة المحتوى المحدد ⚡</span>
                </button>

                <button
                  type="button"
                  onClick={copySelectedUrls}
                  className="px-3 py-2 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>نسخ الروابط</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedVideos([])}
                  className="px-2.5 py-2 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl text-xs transition-all cursor-pointer"
                >
                  إلغاء التحديد
                </button>
              </div>
            </div>
          )}

          {/* Videos Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {paginatedVideos.map((video) => {
              const isSelected = selectedVideos.some((sv) => sv.id === video.id);
              const isExtracting = extractingVideoId === video.id;

              return (
                <div
                  key={video.id}
                  className={`bg-white border rounded-2xl overflow-hidden transition-all flex flex-col justify-between group hover:shadow-md ${
                    isSelected ? "border-indigo-500 ring-2 ring-indigo-500/20" : "border-slate-100"
                  }`}
                >
                  {/* Thumbnail & Badges */}
                  <div className="relative aspect-video bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 overflow-hidden cursor-pointer" onClick={() => handleOpenPreview(video)}>
                    {video.thumbnail ? (
                      <img
                        src={video.thumbnail}
                        alt={video.title}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                          if (fallback) fallback.classList.remove("hidden");
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : null}

                    {/* Fallback container if thumbnail is missing or fails to load */}
                    <div className={`w-full h-full flex flex-col items-center justify-center p-4 text-center text-slate-300 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 ${video.thumbnail ? "hidden" : ""}`}>
                      <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xs flex items-center justify-center text-white mb-2 group-hover:scale-110 transition-transform">
                        <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                      </div>
                      <p className="text-[11px] font-medium text-slate-300 line-clamp-2 leading-tight px-2">
                        {video.title}
                      </p>
                    </div>

                    {/* Platform Badge */}
                    <div className="absolute top-2.5 right-2.5">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold text-white flex items-center gap-1 shadow-xs ${
                        video.platform === "tiktok"
                          ? "bg-zinc-950"
                          : video.platform === "instagram"
                          ? "bg-gradient-to-r from-purple-600 to-pink-600"
                          : video.platform === "youtube"
                          ? "bg-red-600"
                          : "bg-blue-600"
                      }`}>
                        {video.platform === "tiktok"
                          ? "TikTok"
                          : video.platform === "instagram"
                          ? "Instagram"
                          : video.platform === "youtube"
                          ? "YouTube"
                          : "Facebook"}
                      </span>
                    </div>

                    {/* Duration Badge */}
                    {video.duration > 0 && (
                      <div className="absolute bottom-2.5 left-2.5 bg-black/75 text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
                        {formatDuration(video.duration)}
                      </div>
                    )}

                    {/* Checkbox Overlay */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelectVideo(video);
                      }}
                      className="absolute top-2.5 left-2.5 p-1 bg-white/90 hover:bg-white rounded-lg transition-all cursor-pointer shadow-xs"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>

                    {/* Play Button Center Hover Overlay */}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center text-slate-900 shadow-md">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-3.5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-1.5">
                      <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug" title={video.title}>
                        {video.title}
                      </h4>
                      {video.description && video.description.trim() !== "" && video.description !== video.title && (
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-normal" title={video.description}>
                          {video.description}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-400">المنشئ: {video.uploader}</p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium border-t border-slate-50 pt-2">
                      {video.views !== null && video.views !== undefined && (
                        <span className="flex items-center gap-1" title="عدد المشاهدات">
                          <Eye className="w-3.5 h-3.5 text-indigo-500" />
                          <span>{formatNumber(video.views)}</span>
                        </span>
                      )}
                      {video.likes !== null && video.likes !== undefined && (
                        <span className="flex items-center gap-1" title="عدد الإعجابات">
                          <ThumbsUp className="w-3.5 h-3.5 text-rose-500" />
                          <span>{formatNumber(video.likes)}</span>
                        </span>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditing(video)}
                        disabled={isExtracting}
                        className="flex-1 py-2 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                      >
                        {isExtracting ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Edit3 className="w-3.5 h-3.5" />
                        )}
                        <span>تعديل واستيراد</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleTriggerCopySchedule([video])}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center shrink-0"
                        title="جدولة هذا الفيديو بالتتابع"
                      >
                        <Sparkles className="w-4 h-4 text-emerald-600" />
                      </button>

                      <a
                        href={video.url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors cursor-pointer shrink-0"
                        title="فتح الفيديو في نافذة جديدة"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-xs mt-6">
              <div className="text-xs text-slate-500 font-medium">
                عرض <span className="font-bold text-slate-800">{(validCurrentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-800">{Math.min(validCurrentPage * ITEMS_PER_PAGE, filteredVideos.length)}</span> من إجمالي <span className="font-bold text-indigo-600">{filteredVideos.length}</span> فيديو (الصفحة <span className="font-bold text-slate-800">{validCurrentPage}</span> من <span className="font-bold text-slate-800">{totalPages}</span>)
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((prev) => Math.max(1, prev - 1));
                    document.getElementById("social-results-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  disabled={validCurrentPage === 1}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <ChevronRight className="w-4 h-4" />
                  <span>السابق</span>
                </button>

                <div className="flex items-center gap-1 px-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      return (
                        page === 1 ||
                        page === totalPages ||
                        Math.abs(page - validCurrentPage) <= 1
                      );
                    })
                    .map((page, idx, arr) => {
                      const prevPage = arr[idx - 1];
                      const showEllipsis = prevPage && page - prevPage > 1;

                      return (
                        <div key={page} className="flex items-center gap-1">
                          {showEllipsis && <span className="text-slate-400 text-xs px-1">...</span>}
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentPage(page);
                              document.getElementById("social-results-section")?.scrollIntoView({ behavior: "smooth" });
                            }}
                            className={`w-8 h-8 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              validCurrentPage === page
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            {page}
                          </button>
                        </div>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
                    document.getElementById("social-results-section")?.scrollIntoView({ behavior: "smooth" });
                  }}
                  disabled={validCurrentPage >= totalPages}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span>التالي</span>
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {filteredVideos.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center space-y-2">
              <p className="text-sm font-bold text-slate-700">لم يتم العثور على أية فيديوهات تطابق البحث.</p>
              <p className="text-xs text-slate-400">جرب البحث بكلمة أخرى أو تغيير الترتيب.</p>
            </div>
          )}
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-xl border border-slate-100 relative text-right">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold text-white ${
                  previewVideo.platform === "tiktok"
                    ? "bg-zinc-900"
                    : previewVideo.platform === "instagram"
                    ? "bg-gradient-to-r from-purple-600 to-pink-600"
                    : previewVideo.platform === "youtube"
                    ? "bg-red-600"
                    : "bg-blue-600"
                }`}>
                  {previewVideo.platform === "tiktok"
                    ? "TikTok"
                    : previewVideo.platform === "instagram"
                    ? "Instagram"
                    : previewVideo.platform === "youtube"
                    ? "YouTube"
                    : "Facebook"}
                </span>
                <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{previewVideo.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPreviewVideo(null);
                  setPreviewStreamUrl(null);
                }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="relative aspect-video bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-900">
              {previewLoading ? (
                <div className="flex flex-col items-center justify-center space-y-3 p-4 text-center">
                  <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-medium">جاري تحضير مشغل الفيديو المباشر وتجاوز حظر المتصفح...</p>
                </div>
              ) : previewStreamUrl ? (
                <video
                  src={previewStreamUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                  onError={() => {
                    setPreviewError("فشل تشغيل ملف الفيديو داخل مشغل المتصفح.");
                    setPreviewStreamUrl(null);
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center space-y-3">
                  {previewVideo.thumbnail ? (
                    <img src={previewVideo.thumbnail} alt={previewVideo.title} className="absolute inset-0 w-full h-full object-cover opacity-30" />
                  ) : null}
                  <div className="relative z-10 p-3 bg-slate-900/90 rounded-full text-amber-400 border border-slate-800">
                    <Play className="w-6 h-6" />
                  </div>
                  <div className="relative z-10 space-y-1 max-w-sm">
                    <p className="text-xs font-bold text-white">
                      {previewError || "يتعذر التشغيل المباشر داخل هذه النافذة المنبثقة"}
                    </p>
                    <p className="text-[11px] text-slate-300">
                      يمكنك استيراد وتعديل المقطع مباشرةً، أو فتح الفيديو في موقع المنصة الأصلي.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Video Caption / Text Import Section */}
            {(previewVideo.description || previewVideo.title) && (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-right">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>نص وصف المنشور المستورد:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const textToCopy = previewVideo.description || previewVideo.title;
                      navigator.clipboard.writeText(textToCopy);
                      setCopiedCaption(true);
                      setTimeout(() => setCopiedCaption(false), 2500);
                    }}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                  >
                    {copiedCaption ? (
                      <>
                        <CopyCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">تم النسخ</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>نسخ النص</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed max-h-32 overflow-y-auto p-2.5 bg-white rounded-lg border border-slate-100 font-sans">
                  {previewVideo.description || previewVideo.title}
                </p>
              </div>
            )}

            {/* Modal Actions Footer */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const v = previewVideo;
                  setPreviewVideo(null);
                  setPreviewStreamUrl(null);
                  handleStartEditing(v);
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 className="w-4 h-4" />
                <span>تعديل واستيراد هذا المقطع مع النص</span>
              </button>

              <a
                href={previewVideo.url}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 shrink-0"
              >
                <span>الرابط الأصلي</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fallback Copy Content Modal if onScheduleSelected is not passed */}
      {!onScheduleSelected && isLocalCopyModalOpen && currentUser && (
        <CopyContentModal
          isOpen={isLocalCopyModalOpen}
          onClose={() => setIsLocalCopyModalOpen(false)}
          selectedVideos={localModalVideos}
          onSuccess={() => {
            setIsLocalCopyModalOpen(false);
            setSelectedVideos([]);
          }}
          currentUser={currentUser}
        />
      )}
    </div>
  );
}
