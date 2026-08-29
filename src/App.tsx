import { useState, useEffect } from "react";
import { Youtube, Search, Loader2, Sparkles, AlertCircle, RefreshCw, Settings, Info, CheckCircle2, Tv, Flame, ShieldCheck, ChevronLeft, ChevronRight, BookOpen, UserCheck, Key, Shield, Share2, Globe, CheckSquare, Clock, Download, Eye, ArrowUpDown, Calendar, TrendingUp } from "lucide-react";
import Header from "./components/Header";
import VideoDetails from "./components/VideoDetails";
import VideoEditor from "./components/VideoEditor";
import CloudinaryUploader from "./components/CloudinaryUploader";
import HistoryList, { HistoryItem } from "./components/HistoryList";
import { VideoInfo, VideoFormat } from "./types";
import BufferPublisher from "./components/BufferPublisher";
import ZernioPublisher from "./components/ZernioPublisher";
import TiktokPublisher from "./components/TiktokPublisher";
import TikTokDownloader from "./components/TikTokDownloader";
import AuthScreen from "./components/AuthScreen";
import ChannelTrackerHub from "./components/ChannelTrackerHub";
import ProxyManager from "./components/ProxyManager";
import ZernioAccounts from "./components/ZernioAccounts";
import BufferAccounts from "./components/BufferAccounts";
import ApiDocs from "./components/ApiDocs";
import AdminLogs from "./components/AdminLogs";
import { supabase } from "./lib/supabase";
import { CopyContentModal } from "./components/CopyContentModal";
import { ScheduledClonesQueue } from "./components/ScheduledClonesQueue";
import QueueSchedulerPage from "./components/QueueSchedulerPage";
import { ConfirmProvider } from "./components/ConfirmModal";
import SocialExplorer from "./components/SocialExplorer";
import ApifySettings from "./components/ApifySettings";
import YouTubeSettings from "./components/YouTubeSettings";
import CloudinarySettings from "./components/CloudinarySettings";
import CaptionTemplateManager from "./components/CaptionTemplateManager";

export default function App() {
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Active Tab at page level
  const [activeTab, setActiveTab] = useState<"single" | "channel" | "social-explorer" | "tiktok" | "tiktok-downloader" | "buffer" | "zernio" | "tracker" | "scheduler" | "apidocs" | "auth" | "settings">("single");

  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        supabase.settings.get(user.id).then(({ data }) => {
          if (data && data.yt_cookies !== undefined) {
            setCookiesText(data.yt_cookies || "");
          }
          if (data && data.yt_proxy !== undefined) {
            setProxyText(data.yt_proxy || "");
          }
          setRefreshTrigger((prev) => prev + 1);
        });
      } else {
        // Fetch from global-cookies database endpoint if user is a guest
        fetch("/api/global-cookies")
          .then((res) => res.json())
          .then((data) => {
            if (data && data.yt_cookies) {
              setCookiesText(data.yt_cookies);
            }
          })
          .catch((err) => console.warn("Failed to load global cookies:", err));

        // Fetch from global-proxy database endpoint if user is a guest
        fetch("/api/global-proxy")
          .then((res) => res.json())
          .then((data) => {
            if (data && data.yt_proxy) {
              setProxyText(data.yt_proxy);
            }
          })
          .catch((err) => console.warn("Failed to load global proxy:", err));
      }
      setCheckingAuth(false);
    }).catch(() => {
      setCheckingAuth(false);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    try {
      localStorage.removeItem("yt_cookies");
      localStorage.removeItem("yt_cloudinary_history");
      localStorage.removeItem("buffer_access_token");
      localStorage.removeItem("zernio_integration_mode");
      localStorage.removeItem("zernio_api_key");
      localStorage.removeItem("zernio_webhook_url");
    } catch (e) {
      console.warn("Could not clean localStorage on logout:", e);
    }
    setCookiesText("");
    setRefreshTrigger((prev) => prev + 1);
  };

  // Channel States
  const [channelQuery, setChannelQuery] = useState("");
  const [exploredChannels, setExploredChannels] = useState<{title: string, url: string}[]>(() => {
    try {
      const saved = localStorage.getItem("yt_explored_channels");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Failed to load explored channels from local storage", e);
    }
    return [];
  });

  // Save to local storage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem("yt_explored_channels", JSON.stringify(exploredChannels));
    } catch (e) {
      console.warn("Failed to save explored channels to local storage", e);
    }
  }, [exploredChannels]);
  const [channelLoading, setChannelLoading] = useState(false);
  const [channelError, setChannelError] = useState<string | null>(null);
  const [channelErrorDetails, setChannelErrorDetails] = useState<string | null>(null);
  const [channelData, setChannelData] = useState<{ channelTitle: string; channelUrl: string; videos: any[] } | null>(null);
  const [channelPage, setChannelPage] = useState(1);
  const [channelFilter, setChannelFilter] = useState<"all" | "videos" | "shorts">("all");
  const [channelSortBy, setChannelSortBy] = useState<"default" | "views_desc" | "views_asc" | "date_desc" | "date_asc">("default");
  const [autoAvoidCopyright, setAutoAvoidCopyright] = useState(false);
  const [selectedVideos, setSelectedVideos] = useState<any[]>([]);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [channelSubTab, setChannelSubTab] = useState<"explorer" | "queue">("explorer");

  // Bot-detection bypass cookie states
  const [cookiesText, setCookiesText] = useState(() => {
    try {
      return localStorage.getItem("yt_cookies") || "";
    } catch (e) {
      console.warn("localStorage is not accessible in this context:", e);
      return "";
    }
  });

  const [proxyText, setProxyText] = useState(() => {
    try {
      return localStorage.getItem("yt_proxy") || "";
    } catch (e) {
      console.warn("localStorage is not accessible in this context:", e);
      return "";
    }
  });
  const [showCookiesConfig, setShowCookiesConfig] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Quick-test sample links
  const sampleLinks = [
    {
      title: "مقطع تجريبي 1",
      url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ",
    },
    {
      title: "مقطع تجريبي 2",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    }
  ];

  // Preset Channels to try
  const presetChannels = [
    { title: "NoCopyrightSounds", handle: "@NoCopyrightSounds" },
    { title: "NASA Space", handle: "@NASA" },
    { title: "Nature relaxation", handle: "@naturerelaxation" },
    { title: "LoFi Girl", handle: "@LofiGirl" }
  ];

  const saveCookies = () => {
    try {
      localStorage.setItem("yt_cookies", cookiesText);
      
      // Save globally in PostgreSQL database
      fetch("/api/global-cookies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yt_cookies: cookiesText })
      })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.yt_cookies) {
          setCookiesText(data.yt_cookies);
          localStorage.setItem("yt_cookies", data.yt_cookies);
          
          // If logged in, also update user settings in database
          if (currentUser) {
            supabase.settings.update(currentUser.id, { yt_cookies: data.yt_cookies });
          }
        }
      })
      .catch((err) => console.warn("Failed to save global cookies to DB:", err));

    } catch (e) {
      console.warn("localStorage write is blocked in this context:", e);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExtract = async (urlToUse?: string) => {
    const targetUrl = urlToUse || videoUrl;
    if (!targetUrl.trim()) {
      setError("يرجى إدخال رابط فيديو أولاً.");
      return;
    }

    setLoading(true);
    setError(null);
    setErrorDetails(null);
    setVideoInfo(null);
    setSelectedFormat(null);

    // If they aren't extracting via the channel action, reset autoAvoidCopyright
    if (!urlToUse) {
      setAutoAvoidCopyright(false);
    }

    try {
      const isSocialUrl = targetUrl.includes("tiktok.com") || targetUrl.includes("facebook.com") || targetUrl.includes("fb.watch");
      const apiEndpoint = isSocialUrl ? "/api/social-video-info" : "/api/video-info";

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          videoUrl: targetUrl,
          cookiesText: cookiesText,
          proxyUrl: proxyText
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "فشل جلب معلومات الفيديو.");
        setErrorDetails(data.details || null);
        return;
      }

      setVideoInfo(data);
      if (urlToUse) {
        setVideoUrl(urlToUse);
      }
    } catch (err: any) {
      console.error("Extraction error:", err);
      setError("حدث خطأ أثناء الاتصال بالخادم لسحب الفيديو.");
      setErrorDetails(err.message || err.toString());
    } finally {
      setLoading(false);
    }
  };

  const handleFetchChannel = async (queryToUse?: string, fetchTrendingOverride?: boolean) => {
    const qLower = (queryToUse || channelQuery || "").toLowerCase();
    const isTrending = fetchTrendingOverride || qLower.includes("trending") || qLower.includes("رواج") || qLower.includes("ترند") || qLower.includes("feed/trending");
    const query = isTrending ? "trending" : (queryToUse || channelQuery);
    if (!isTrending && !query.trim()) {
      setChannelError("يرجى إدخال اسم مستخدم أو رابط قناة يوتيوب أولاً.");
      return;
    }

    setChannelLoading(true);
    setChannelError(null);
    setChannelErrorDetails(null);
    setChannelData(null);
    setChannelPage(1);
    setChannelFilter("all");

    try {
      const response = await fetch("/api/channel-videos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          channelQuery: query,
          fetchTrending: isTrending,
          cookiesText: cookiesText,
          proxyUrl: proxyText,
          apifyToken: localStorage.getItem("apify_token") || "",
          apifyActorId: localStorage.getItem("apify_actor_id") || ""
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setChannelError(data.error || "فشل جلب فيديوهات القناة.");
        setChannelErrorDetails(data.details || null);
        return;
      }

      if (data && data.videos && Array.isArray(data.videos)) {
        data.videos = data.videos.map((v: any) => ({
          ...v,
          channel_name: data.channelTitle || v.uploader || "قناة يوتيوب",
          uploader: v.uploader || data.channelTitle
        }));
      }
      setChannelData(data);
      if (isTrending) {
        setChannelQuery("🔥 الفيديوهات الأكثر رواجاً (Trending)");
      } else if (queryToUse) {
        setChannelQuery(queryToUse);
      }
      setExploredChannels(prev => {
        const filtered = prev.filter(c => c.url !== (data.channelUrl || query));
        return [{title: data.channelTitle, url: data.channelUrl || query}, ...filtered].slice(0, 10);
      });
    } catch (err: any) {
      console.error("Channel fetch error:", err);
      setChannelError("حدث خطأ أثناء الاتصال بالخادم لجلب فيديوهات القناة.");
      setChannelErrorDetails(err.message || err.toString());
    } finally {
      setChannelLoading(false);
    }
  };

  const selectChannelVideo = (url: string) => {
    setAutoAvoidCopyright(true);
    handleExtract(url);
  };

  const handleToggleVideoSelection = (video: any) => {
    setSelectedVideos((prev) => {
      const exists = prev.some((v) => v.id === video.id);
      if (exists) {
        const next = prev.filter((v) => v.id !== video.id);
        console.log("Video deselected, new selection count:", next.length);
        return next;
      } else {
        const next = [...prev, video];
        console.log("Video selected, new selection count:", next.length);
        return next;
      }
    });
  };

  const handleSelectAllVideos = (videosOnPage: any[]) => {
    const allSelected = videosOnPage.every(v => selectedVideos.some(sv => sv.id === v.id));
    if (allSelected) {
      setSelectedVideos(prev => {
        const next = prev.filter(v => !videosOnPage.some(vp => vp.id === v.id));
        console.log("All deselected, new selection count:", next.length);
        return next;
      });
    } else {
      setSelectedVideos(prev => {
        const toAdd = videosOnPage.filter(vp => !prev.some(sv => sv.id === vp.id));
        const next = [...prev, ...toAdd];
        console.log("All selected, new selection count:", next.length);
        return next;
      });
    }
  };

  const handleUploadSuccess = (cloudinaryUrl: string, customVideoInfo?: VideoInfo) => {
    const infoToUse = customVideoInfo || videoInfo;
    if (!infoToUse) return;

    try {
      // Load current history
      const saved = localStorage.getItem("yt_cloudinary_history");
      const currentHistory: HistoryItem[] = saved ? JSON.parse(saved) : [];

      // Avoid duplicates
      const newHistory = currentHistory.filter(
        (item) => item.cloudinaryUrl !== cloudinaryUrl
      );

      // Prepend new upload item
      const newItem: HistoryItem = {
        id: `${infoToUse.id}_${Date.now()}`,
        title: infoToUse.title,
        thumbnail: infoToUse.thumbnail,
        youtubeUrl: infoToUse.videoUrl,
        cloudinaryUrl,
        createdAt: new Date().toISOString(),
      };

      const updatedHistory = [newItem, ...newHistory];
      localStorage.setItem(
        "yt_cloudinary_history",
        JSON.stringify(updatedHistory)
      );

      if (currentUser) {
        supabase.settings.update(currentUser.id, { cloudinary_history: updatedHistory });
      }

      // Trigger history list refresh
      setRefreshTrigger((prev) => prev + 1);
    } catch (e) {
      console.error("Failed to save history", e);
    }
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans" id="auth-checking-screen">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mx-auto" />
          <p className="text-xs text-slate-500 font-bold">جاري التحقق من حالة تسجيل الدخول...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root-gated">
        {/* Header */}
        <Header />

        {/* Auth Barrier container */}
        <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-12 flex items-center justify-center">
          <AuthScreen 
            currentUser={null}
            onAuthSuccess={(user) => {
              setCurrentUser(user);
              setActiveTab("single"); // Default to single video workspace on success
            }}
            onLogout={handleLogout}
          />
        </main>

        {/* Gated Footer */}
        <footer className="w-full py-8 text-center text-xs text-slate-400 bg-white border-t border-slate-100 mt-12" id="app-footer-gated">
          <div className="max-w-4xl mx-auto px-4 space-y-2">
            <p>© {new Date().getFullYear()} ساحب ومحمل اليوتيوب إلى كلاوديناري. جميع الحقوق محفوظة.</p>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <ConfirmProvider>
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans" id="app-root">
        {/* Header */}
      <Header />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-4xl mx-auto px-4 py-8 space-y-6">
        
        {/* Navigation Tabs (Single Video vs. Channel Explorer vs. TikTok Publisher vs. Buffer Publisher vs. Zernio Publisher vs. Tracker Hub vs. API Docs vs. Auth) */}
        <div className="flex flex-wrap justify-center bg-slate-200/60 p-1.5 rounded-2xl gap-2 w-full max-w-4xl mx-auto font-bold" id="app-tabs">
          <button
            onClick={() => setActiveTab("single")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "single"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-rose-500" />
            <span>فيديو مفرد</span>
          </button>
          <button
            onClick={() => setActiveTab("channel")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "channel"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tv className="w-3.5 h-3.5 text-indigo-500" />
            <span>مستكشف يوتيوب</span>
          </button>
          <button
            onClick={() => setActiveTab("social-explorer")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[140px] font-bold ${
              activeTab === "social-explorer"
                ? "bg-gradient-to-r from-zinc-900 to-blue-600 text-white shadow-sm"
                : "text-slate-700 hover:text-slate-900 bg-slate-100/80"
            }`}
          >
            <Share2 className="w-3.5 h-3.5 text-sky-400 animate-pulse" />
            <span>مستكشف Social Media 🌐</span>
          </button>
          <button
            onClick={() => setActiveTab("scheduler")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "scheduler"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600 animate-pulse" />
            <span>الجدولة والتنظيم</span>
          </button>
          <button
            onClick={() => setActiveTab("tracker")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "tracker"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
            <span>الأتمتة والتتبع</span>
          </button>
          <button
            onClick={() => setActiveTab("buffer")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "buffer"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>ناشر Buffer 🌐</span>
          </button>
          <button
            onClick={() => setActiveTab("zernio")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "zernio"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500 animate-pulse-subtle" />
            <span>ناشر Zernio ⚡</span>
          </button>
          <button
            onClick={() => setActiveTab("tiktok")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "tiktok"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <svg className={`w-3.5 h-3.5 fill-current ${activeTab === "tiktok" ? "text-zinc-950" : "text-slate-500"}`} viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94 1.18 2.22 2.02 3.61 2.45.02 1.35.01 2.68.01 4.02-1.34-.14-2.61-.69-3.61-1.57-.45-.4-.84-.86-1.15-1.37v6.07c.07 1.48-.3 2.97-1.13 4.2-1.12 1.63-2.91 2.72-4.88 2.94-1.92.23-3.9-.3-5.38-1.55-1.53-1.28-2.39-3.26-2.28-5.26.11-2.1 1.25-4.06 3.06-5.11 1.34-.8 2.92-1.07 4.45-.75.01 1.39.01 2.77.01 4.15-1 .15-2.02.66-2.58 1.51-.55.83-.58 1.95-.12 2.77.46.82 1.34 1.36 2.28 1.39.95.03 1.9-.38 2.44-1.15.54-.76.71-1.74.56-2.67V0h3.91z"/>
            </svg>
            <span>ناشر TikTok 🎵</span>
          </button>
          <button
            onClick={() => setActiveTab("tiktok-downloader")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "tiktok-downloader"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Download className="w-3.5 h-3.5 text-teal-500" />
            <span>مستعرضTikTok</span>
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "settings"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>الإعدادات</span>
          </button>
          <button
            onClick={() => setActiveTab("apidocs")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "apidocs"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
            <span>واجهات الـ API</span>
          </button>
          <button
            onClick={() => setActiveTab("auth")}
            className={`py-3 px-3.5 text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer flex-1 min-w-[110px] ${
              activeTab === "auth"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>{currentUser ? "حسابي" : "الدخول"}</span>
          </button>
        </div>

        {/* TAB: TIKTOK & FACEBOOK SOCIAL EXPLORER */}
        {activeTab === "social-explorer" && (
          <SocialExplorer
            cookiesText={cookiesText}
            proxyText={proxyText}
            onUploadSuccess={handleUploadSuccess}
            onSelectForMainWorkspace={(info) => {
              setVideoInfo(info);
              setActiveTab("single");
            }}
            onScheduleSelected={(vids) => {
              setSelectedVideos(vids);
              setIsCopyModalOpen(true);
            }}
            currentUser={currentUser}
          />
        )}

        {/* TAB: TIKTOK DOWNLOADER */}
        {activeTab === "tiktok-downloader" && (
          <TikTokDownloader onUploadSuccess={handleUploadSuccess} />
        )}

        {/* TAB 1: SINGLE VIDEO SELECTION */}
        {activeTab === "single" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 animate-fade-in" id="input-section">
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                <Tv className="w-5 h-5 text-indigo-500" />
                <span>أدخل رابط مقطع فيديو</span>
              </h3>
              <p className="text-xs text-slate-500">
                قم بلصق رابط المقطع من أي موقع ويب أو شبكة اجتماعية لبدء المعالجة واستخراج الفيديو.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="https://..."
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  disabled={loading}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl text-sm focus:outline-none transition-all placeholder:text-slate-400 text-left"
                  style={{ direction: "ltr" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleExtract();
                    }
                  }}
                />
                <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
              </div>

              <button
                onClick={() => handleExtract()}
                disabled={loading}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 min-w-[140px]"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري السحب...</span>
                  </>
                ) : (
                  <>
                    <span>سحب وعرض الفيديو</span>
                  </>
                )}
              </button>
            </div>

            {/* Quick-try presets */}
            <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
              <span className="text-slate-400">روابط سريعة للتجربة:</span>
              {sampleLinks.map((link, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleExtract(link.url)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer"
                >
                  {link.title}
                </button>
              ))}
            </div>

            {/* Collapsible Cookies Panel inside Input Block */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowCookiesConfig(!showCookiesConfig)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>إعدادات تجنب الحظر (حل مشكلة Sign in to confirm you're not a bot)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-normal ${cookiesText.trim() ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {cookiesText.trim() ? "مُفعّل ✓" : "اختياري"}
                </span>
              </button>

              {showCookiesConfig && (
                <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 animate-fade-in text-right">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <span>ملفات تعريف الارتباط الخاصة بيوتيوب (Netscape Cookies)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      منصات الاستضافة تحجب يوتيوب أحياناً وتطلب إثبات الروبوت. يمكنك حل المشكلة بسهولة عن طريق تثبيت إضافة 
                      <a 
                        href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/ccmkkfoeffgofandgihmnopehgkimplg" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline mx-1 font-semibold inline-block"
                        style={{ direction: "ltr" }}
                      >
                        "Get cookies.txt LOCALLY"
                      </a> 
                      لمتصفحك، ثم نسخ الكوكيز بصيغة Netscape ولصقها هنا. يتم حفظ الكوكيز في متصفحك محلياً بشكل آمن.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      placeholder="# Netscape HTTP Cookie File..."
                      value={cookiesText}
                      onChange={(e) => setCookiesText(e.target.value)}
                      className="w-full h-24 p-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] font-mono focus:outline-none placeholder:text-slate-400 text-left"
                      style={{ direction: "ltr" }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={saveCookies}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {saveSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>تم الحفظ في المتصفح!</span>
                          </>
                        ) : (
                          <span>حفظ الإعدادات</span>
                        )}
                      </button>
                      {cookiesText.trim() && (
                        <button
                          type="button"
                          onClick={() => {
                            setCookiesText("");
                            try {
                              localStorage.removeItem("yt_cookies");
                            } catch (e) {
                              console.warn("localStorage remove is blocked in this context:", e);
                            }
                          }}
                          className="text-xs text-rose-600 hover:underline cursor-pointer"
                        >
                          مسح الكوكيز
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CHANNEL EXPLORER */}
        {activeTab === "channel" && (
          <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 animate-fade-in" id="channel-section">
            <div className="space-y-1">
              <h3 className="text-md font-bold text-slate-800 flex items-center gap-1.5">
                <Tv className="w-5 h-5 text-indigo-500" />
                <span>مستكشف واستيراد قنوات اليوتيوب</span>
              </h3>
              <p className="text-xs text-slate-500">
                ابحث عن أي فيديو أو قناة (مثل <code className="bg-slate-50 px-1.5 py-0.5 rounded text-indigo-600 font-bold font-sans">قطط مضحكة</code> أو <code className="bg-slate-50 px-1.5 py-0.5 rounded text-indigo-600 font-bold font-sans">@NoCopyrightSounds</code>) لسحب الفيديوهات واستيرادها.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="أدخل رابط القناة، المعرف @، أو كلمة للبحث (مثال: قطط مضحكة)"
                  value={channelQuery}
                  onChange={(e) => setChannelQuery(e.target.value)}
                  disabled={channelLoading}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50 border border-slate-100 focus:border-indigo-500 focus:bg-white rounded-xl text-sm focus:outline-none transition-all placeholder:text-slate-400 text-right"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleFetchChannel();
                    }
                  }}
                />
                <div className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
              </div>

              <button
                onClick={() => handleFetchChannel()}
                disabled={channelLoading}
                className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0 min-w-[140px]"
              >
                {channelLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري البحث...</span>
                  </>
                ) : (
                  <>
                    <span>جلب فيديوهات القناة</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleFetchChannel("trending", true)}
                disabled={channelLoading}
                className="px-5 py-3.5 bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
              >
                <Flame className="w-4 h-4 text-amber-200 animate-pulse" />
                <span>الفيديوهات الأكثر رواجاً 🔥</span>
              </button>
            </div>

            {/* Quick-try presets for channels */}
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="text-slate-400">قنوات مقترحة للتجربة السريعة:</span>
              {presetChannels.map((ch, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleFetchChannel(ch.handle)}
                  disabled={channelLoading}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-600 font-medium transition-colors cursor-pointer flex items-center gap-1"
                >
                  <Flame className="w-3.5 h-3.5 text-amber-500" />
                  <span>{ch.title}</span>
                </button>
              ))}
            </div>

            {/* Collapsible Cookies Panel also on channel tab */}
            <div className="border-t border-slate-100 pt-4 mt-2">
              <button
                type="button"
                onClick={() => setShowCookiesConfig(!showCookiesConfig)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>إعدادات تجنب الحظر (حل مشكلة Sign in to confirm you're not a bot)</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-normal ${cookiesText.trim() ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                  {cookiesText.trim() ? "مُفعّل ✓" : "اختياري"}
                </span>
              </button>

              {showCookiesConfig && (
                <div className="mt-3 bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3 animate-fade-in text-right">
                  <div className="space-y-1">
                    <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                      <Info className="w-4 h-4 text-indigo-500" />
                      <span>ملفات تعريف الارتباط الخاصة بيوتيوب (Netscape Cookies)</span>
                    </h4>
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      منصات الاستضافة تحجب يوتيوب أحياناً وتطلب إثبات الروبوت. يمكنك حل المشكلة بسهولة عن طريق نسخ الكوكيز بصيغة Netscape ولصقها هنا.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <textarea
                      placeholder="# Netscape HTTP Cookie File..."
                      value={cookiesText}
                      onChange={(e) => setCookiesText(e.target.value)}
                      className="w-full h-24 p-3 bg-white border border-slate-200 focus:border-indigo-500 rounded-lg text-[11px] font-mono focus:outline-none placeholder:text-slate-400 text-left"
                      style={{ direction: "ltr" }}
                    />
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={saveCookies}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                      >
                        {saveSuccess ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>تم الحفظ!</span>
                          </>
                        ) : (
                          <span>حفظ الإعدادات</span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Channel Error State */}
        {channelError && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-2 animate-fade-in text-right" id="channel-error-box">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <h4 className="text-xs font-bold text-rose-950">خطأ في جلب بيانات القناة</h4>
                <p className="text-xs text-rose-800 leading-relaxed whitespace-pre-wrap">{channelError}</p>
              </div>
            </div>
            {channelErrorDetails && (
              <div className="mt-2 pt-2 border-t border-rose-100/50 text-[11px] text-rose-700/80 font-mono bg-white/40 p-2.5 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-40" dir="ltr">
                {channelErrorDetails}
              </div>
            )}
          </div>
        )}

        {/* Channel Loading Skeleton */}
        {channelLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl overflow-hidden p-3 space-y-3">
                <div className="bg-slate-200 aspect-video w-full rounded-xl"></div>
                <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                <div className="h-3 bg-slate-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        )}

        {/* Channel Results Grid */}
        {channelData && activeTab === "channel" && (
          <div className="space-y-4 animate-fade-in" id="channel-results">
            <div className="flex items-center justify-between bg-indigo-50 border border-indigo-100/50 rounded-2xl p-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-600">
                  <Tv className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">فيديوهات قناة: {channelData.channelTitle}</h3>
                  <a href={channelData.channelUrl} target="_blank" rel="noreferrer" className="text-[11px] text-indigo-600 hover:underline">عرض القناة على يوتيوب</a>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>جاهز للتعديل التلقائي ⚡</span>
              </span>
            </div>

            {/* Secondary Navigation Sub-Tabs */}
            <div className="flex items-center justify-start border-b border-slate-100 pb-1 gap-6">
              <button
                type="button"
                onClick={() => setChannelSubTab("explorer")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer ${
                  channelSubTab === "explorer"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                مستكشف واستيراد الفيديوهات
              </button>
              <button
                type="button"
                onClick={() => setChannelSubTab("queue")}
                className={`pb-2.5 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  channelSubTab === "queue"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <span>قائمة الجدولة المتتابعة</span>
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full text-[9px]">🕒 تلقائي</span>
              </button>
            </div>

            {channelSubTab === "queue" ? (
              <ScheduledClonesQueue />
            ) : (
              <>
                {/* Selection Action Bar */}
                {selectedVideos.length > 0 && (
                  <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in text-right">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-indigo-950">تم تحديد {selectedVideos.length} فيديو للنسخ والجدولة المتتابعة</h4>
                      <p className="text-[11px] text-indigo-700">سيتم تطبيق فلاتر تخطي الكوبيرايت ونشرها تلقائياً بالترتيب الزمني.</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsCopyModalOpen(true)}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>نسخ وجدولة المحتوى ⚡</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSelectedVideos([])}
                        className="px-4 py-2.5 bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>
                )}

                {/* Filter and Selection Control Buttons */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100">
                  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                    {/* Content Type Tabs */}
                    <div className="flex items-center gap-1.5 bg-slate-200/60 p-1 rounded-xl">
                      <button
                        type="button"
                        onClick={() => { setChannelFilter("all"); setChannelPage(1); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          channelFilter === "all"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        الكل ({channelData.videos.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChannelFilter("videos"); setChannelPage(1); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          channelFilter === "videos"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        فيديوهات طويلة 🎥 ({channelData.videos.filter(v => !v.isShort).length})
                      </button>
                      <button
                        type="button"
                        onClick={() => { setChannelFilter("shorts"); setChannelPage(1); }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          channelFilter === "shorts"
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        Shorts ⚡ ({channelData.videos.filter(v => v.isShort).length})
                      </button>
                    </div>

                    {/* Sort Dropdown */}
                    <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-2xs">
                      <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span className="text-[11px] font-bold text-slate-500 hidden sm:inline shrink-0">تصنيف:</span>
                      <select
                        value={channelSortBy}
                        onChange={(e) => {
                          setChannelSortBy(e.target.value as any);
                          setChannelPage(1);
                        }}
                        className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer py-0.5"
                      >
                        <option value="default">🔀 الترتيب الافتراضي</option>
                        <option value="views_desc">🔥 الأكثر مشاهدة (تنازلي)</option>
                        <option value="views_asc">👁️ الأقل مشاهدة (تصاعدي)</option>
                        <option value="date_desc">📅 الأحدث تاريخاً (الأجدد أولاً)</option>
                        <option value="date_asc">⏳ الأقدم تاريخاً</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const itemsPerPage = 12;
                    const filtered = channelData.videos.filter((vid) => {
                      if (channelFilter === "videos") return !vid.isShort;
                      if (channelFilter === "shorts") return vid.isShort;
                      return true;
                    });
                    const startIndex = (channelPage - 1) * itemsPerPage;
                    const paginated = filtered.slice(startIndex, startIndex + itemsPerPage);
                    
                    return (
                      <div className="flex gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedVideos(filtered);
                            setIsCopyModalOpen(true);
                          }}
                          className="px-3.5 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                          <span>نسخ كل المحتوى</span>
                        </button>
                        {paginated.length > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSelectAllVideos(paginated)}
                            className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                          >
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500" />
                            <span>
                              {paginated.every(v => selectedVideos.some(sv => sv.id === v.id)) 
                                ? "إلغاء تحديد الصفحة" 
                                : "تحديد كل الصفحة"
                              }
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {(() => {
                  const itemsPerPage = 12;
                  const filteredVideos = channelData.videos.filter((vid) => {
                    if (channelFilter === "videos") return !vid.isShort;
                    if (channelFilter === "shorts") return vid.isShort;
                    return true;
                  });

                  // Perform sorting
                  const sortedVideos = [...filteredVideos].sort((a, b) => {
                    if (channelSortBy === "views_desc") {
                      return (b.views || 0) - (a.views || 0);
                    }
                    if (channelSortBy === "views_asc") {
                      return (a.views || 0) - (b.views || 0);
                    }
                    if (channelSortBy === "date_desc") {
                      const tA = a.timestamp || (a.uploadDate ? new Date(a.uploadDate).getTime() : 0);
                      const tB = b.timestamp || (b.uploadDate ? new Date(b.uploadDate).getTime() : 0);
                      return tB - tA;
                    }
                    if (channelSortBy === "date_asc") {
                      const tA = a.timestamp || (a.uploadDate ? new Date(a.uploadDate).getTime() : 0);
                      const tB = b.timestamp || (b.uploadDate ? new Date(b.uploadDate).getTime() : 0);
                      return tA - tB;
                    }
                    return 0;
                  });

                  const totalVideos = sortedVideos.length;
                  const totalPages = Math.ceil(totalVideos / itemsPerPage);
                  const startIndex = (channelPage - 1) * itemsPerPage;
                  const paginatedVideos = sortedVideos.slice(startIndex, startIndex + itemsPerPage);

                  return (
                    <>
                      {totalVideos === 0 ? (
                        <div className="bg-slate-50 border border-slate-150 rounded-2xl p-12 text-center text-slate-500 text-sm font-semibold">
                          لا توجد مقاطع متوفرة في هذا الفلتر حالياً.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                          {paginatedVideos.map((vid) => {
                            const isSelected = selectedVideos.some(v => v.id === vid.id);
                            return (
                              <div 
                                key={vid.id} 
                                className={`bg-white border hover:border-indigo-100 hover:shadow-md rounded-2xl overflow-hidden p-3 space-y-3 transition-all flex flex-col justify-between group relative ${
                                  isSelected ? "border-indigo-500 ring-2 ring-indigo-500/10" : "border-slate-100"
                                }`}
                              >
                                <div className="space-y-2">
                                  <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-slate-100">
                                    {/* Selection Checkbox Overlay */}
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleVideoSelection(vid);
                                      }}
                                      className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur-xs p-1.5 rounded-lg shadow-xs border border-slate-150 cursor-pointer flex items-center justify-center transition-transform active:scale-95"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => {}} // handled by parent div click
                                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                                      />
                                    </div>

                                    <img 
                                      src={vid.thumbnail} 
                                      alt={vid.title} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                                      referrerPolicy="no-referrer"
                                    />
                                    {vid.duration > 0 && (
                                      <span className="absolute bottom-1.5 right-1.5 bg-slate-900/80 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                                        {Math.floor(vid.duration / 60)}:{(vid.duration % 60).toString().padStart(2, "0")}
                                      </span>
                                    )}
                                    {vid.isShort && (
                                      <span className="absolute top-1.5 left-1.5 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-lg shadow-sm flex items-center gap-0.5">
                                        <span>Shorts ⚡</span>
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-relaxed" title={vid.title}>
                                    {vid.title}
                                  </h4>

                                  {/* Views and Upload Date Metadata */}
                                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-100">
                                    {vid.views !== null && vid.views !== undefined ? (
                                      <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md flex items-center gap-1" title={`${vid.views.toLocaleString()} مشاهدة`}>
                                        <Eye className="w-3 h-3 text-indigo-500 shrink-0" />
                                        <span>
                                          {vid.views >= 1_000_000
                                            ? `${(vid.views / 1_000_000).toFixed(1)}M`
                                            : vid.views >= 1_000
                                            ? `${(vid.views / 1_000).toFixed(1)}k`
                                            : vid.views.toLocaleString()}{" "}
                                          مشاهدة
                                        </span>
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">مشاهدات غير متاحة</span>
                                    )}

                                    {vid.uploadDate ? (
                                      <span className="text-slate-500 font-mono flex items-center gap-1">
                                        <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span>{vid.uploadDate}</span>
                                      </span>
                                    ) : (
                                      vid.uploader ? (
                                        <span className="text-slate-400 truncate max-w-[100px]">{vid.uploader}</span>
                                      ) : null
                                    )}
                                  </div>
                                </div>

                                <button
                                  onClick={() => selectChannelVideo(vid.url)}
                                  className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-600 hover:text-white text-indigo-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 border border-indigo-100 group-hover:border-indigo-600"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                  <span>تعديل وتفادي الكوبيرايت ⚡</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Pagination Controls */}
                      {totalPages > 1 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-100 mt-6 bg-slate-50/60 p-4 rounded-2xl">
                          <div className="text-xs font-semibold text-slate-500">
                            عرض <span className="font-bold text-indigo-600">{startIndex + 1}</span> إلى{" "}
                            <span className="font-bold text-indigo-600">
                              {Math.min(startIndex + itemsPerPage, totalVideos)}
                            </span>{" "}
                            من أصل <span className="font-bold text-indigo-600">{totalVideos}</span> فيديو
                          </div>

                          <div className="flex items-center gap-1.5" style={{ direction: "rtl" }}>
                            <button
                              onClick={() => setChannelPage((prev) => Math.max(prev - 1, 1))}
                              disabled={channelPage === 1}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                            >
                              <ChevronRight className="w-4 h-4" />
                              <span>السابق</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {Array.from({ length: totalPages }).map((_, i) => {
                                const pageNum = i + 1;
                                const isNear = Math.abs(channelPage - pageNum) <= 1;
                                const isFirstOrLast = pageNum === 1 || pageNum === totalPages;
                                
                                if (!isNear && !isFirstOrLast) {
                                  if (pageNum === 2 && channelPage > 3) {
                                    return <span key={`dots-start-${pageNum}`} className="text-slate-400 px-1 font-bold">...</span>;
                                  }
                                  if (pageNum === totalPages - 1 && channelPage < totalPages - 2) {
                                    return <span key={`dots-end-${pageNum}`} className="text-slate-400 px-1 font-bold">...</span>;
                                  }
                                  return null;
                                }

                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setChannelPage(pageNum)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                      channelPage === pageNum
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-100"
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                            </div>

                            <button
                              onClick={() => setChannelPage((prev) => Math.min(prev + 1, totalPages))}
                              disabled={channelPage === totalPages}
                              className="px-3 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white rounded-xl transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shrink-0 shadow-2xs"
                            >
                              <span>التالي</span>
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </>
            )}
            
            {/* Channel History */}
            {exploredChannels.length > 0 && activeTab === "channel" && (
                <div className="mt-8 border-t border-slate-100 pt-6 animate-fade-in" id="channel-history">
                  <h4 className="text-sm font-bold text-slate-800 mb-3 text-right">سجل القنوات المستكشفة مؤخراً</h4>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {exploredChannels.map((ch, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleFetchChannel(ch.url)}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-700 hover:border-indigo-200 hover:shadow-xs transition-all cursor-pointer text-right"
                        >
                            {ch.title}
                        </button>
                    ))}
                  </div>
                </div>
            )}
          </div>
        )}

        {/* TAB 3.5: BUFFER PUBLISHER */}
        {activeTab === "buffer" && (
          <BufferPublisher activeVideo={videoInfo} />
        )}

        {/* TAB 3.6: ZERNIO PUBLISHER */}
        {activeTab === "zernio" && (
          <ZernioPublisher activeVideo={videoInfo} />
        )}

        {/* TAB 3.7: TIKTOK PUBLISHER */}
        {activeTab === "tiktok" && (
          <TiktokPublisher activeVideo={videoInfo} />
        )}

        {/* TAB 4: AUTOMATED CHANNEL TRACKER HUB */}
        {activeTab === "tracker" && (
          <ChannelTrackerHub />
        )}

        {/* TAB 4.5: QUEUE SCHEDULER & IP SAFETY ORGANIZER */}
        {activeTab === "scheduler" && (
          <QueueSchedulerPage />
        )}

        {/* TAB 5: API DOCUMENTATION REFERENCE */}
        {activeTab === "apidocs" && (
          <ApiDocs />
        )}

        {/* TAB 6: AUTHENTICATION SCREEN */}
        {activeTab === "auth" && (
          <AuthScreen 
            currentUser={currentUser} 
            onAuthSuccess={(user) => {
              setCurrentUser(user);
              if (user) {
                supabase.settings.get(user.id).then(({ data }) => {
                  if (data && data.yt_cookies !== undefined) {
                    setCookiesText(data.yt_cookies || "");
                  }
                  setRefreshTrigger((prev) => prev + 1);
                });
              }
              setActiveTab("tracker"); // Redirect to tracker on success
            }} 
            onLogout={handleLogout} 
          />
        )}

        {/* TAB 7: SETTINGS & PROFILES */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in">
            <CloudinarySettings userId={currentUser?.id} />
            <CaptionTemplateManager userId={currentUser?.id} />
            <YouTubeSettings userId={currentUser?.id} />
            <ApifySettings userId={currentUser?.id} />
            <ProxyManager userId={currentUser?.id || ""} />
            {currentUser && <ZernioAccounts userId={currentUser.id} />}
            {currentUser && <BufferAccounts userId={currentUser.id} />}
          </div>
        )}

        {/* Video Extract Error State */}
        {activeTab === "single" && error && (
          <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex flex-col gap-2 animate-fade-in text-right" id="error-box">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <h4 className="text-xs font-bold text-rose-950">خطأ في جلب المقطع</h4>
                <p className="text-xs text-rose-800 leading-relaxed">{error}</p>
              </div>
            </div>
            {errorDetails && (
              <div className="mt-2 pt-2 border-t border-rose-100/50 text-[11px] text-rose-700/80 font-mono bg-white/40 p-2.5 rounded-xl overflow-x-auto whitespace-pre-wrap max-h-40" dir="ltr">
                {errorDetails}
              </div>
            )}
          </div>
        )}

        {/* Loading Skeleton during Video Info Fetch */}
        {activeTab === "single" && loading && (
          <div className="space-y-6 animate-pulse" id="loading-skeleton">
            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
              <div className="bg-slate-200 aspect-video w-full"></div>
              <div className="p-6 space-y-4">
                <div className="h-6 bg-slate-200 rounded-md w-3/4"></div>
                <div className="h-4 bg-slate-200 rounded-md w-1/4"></div>
                <div className="h-10 bg-slate-200 rounded-md w-full"></div>
              </div>
            </div>
          </div>
        )}

        {/* Video Workspace (Only visible when video metadata is successfully fetched) */}
        {activeTab === "single" && videoInfo && (
          <div className="space-y-6 animate-fade-in" id="workspace-section">
            {/* Column 1: Video details & Player */}
            <VideoDetails
              videoInfo={videoInfo}
              selectedFormat={selectedFormat}
              onFormatSelect={setSelectedFormat}
            />

            {/* Column 2: Interactive Video Editor Timeline Suite (OpenCut Style) */}
            <VideoEditor
              videoInfo={videoInfo}
              selectedFormat={selectedFormat}
              autoAvoidCopyright={autoAvoidCopyright}
            />

            {/* Column 3: Cloudinary Upload Widget */}
            <CloudinaryUploader
              videoInfo={videoInfo}
              selectedFormat={selectedFormat}
              onUploadSuccess={handleUploadSuccess}
              currentUser={currentUser}
              onNavigateToAuth={() => setActiveTab("auth")}
            />
          </div>
        )}

        {/* Upload History list */}
        {(activeTab === "single" || activeTab === "tiktok-downloader") && (
          <HistoryList refreshTrigger={refreshTrigger} />
        )}
        
        {/* Admin Logs for Admin users */}
        {(currentUser?.email?.toLowerCase() === 'aamaanaah22@gmail.com' || currentUser?.role === 'admin' || currentUser?.isAdmin) && <AdminLogs userId={currentUser?.id} />}
      </main>

      {/* Copy Content Scheduling Modal */}
      {currentUser && (
        <CopyContentModal
          isOpen={isCopyModalOpen}
          onClose={() => setIsCopyModalOpen(false)}
          selectedVideos={selectedVideos}
          onSuccess={() => {
            setIsCopyModalOpen(false);
            setSelectedVideos([]);
            setChannelSubTab("queue");
            setActiveTab("channel-cloner");
          }}
          currentUser={currentUser}
        />
      )}

      {/* Footer */}
      <footer className="w-full py-8 text-center text-xs text-slate-400 bg-white border-t border-slate-100 mt-12" id="app-footer">
        <div className="max-w-4xl mx-auto px-4 space-y-2">
          <p>© {new Date().getFullYear()} ساحب ومحمل اليوتيوب إلى كلاوديناري. جميع الحقوق محفوظة.</p>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            تتم جميع معالجات الفيديو وسحب الملفات بشكل آمن على الخادم (Server-Side) لضمان حماية بياناتك ومفاتيح الـ API الخاصة بك.
          </p>
        </div>
      </footer>
    </div>
    </ConfirmProvider>
  );
}
