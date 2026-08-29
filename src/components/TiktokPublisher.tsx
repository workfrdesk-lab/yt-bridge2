import { useState, useEffect } from "react";
import { 
  CheckCircle2, Info, Settings, Check, ExternalLink, HelpCircle, Send, Globe, 
  AlertCircle, Sparkles, Loader2, Key, Share2, Copy, Shield, ToggleLeft, Clipboard, List, ArrowRight
} from "lucide-react";
import { VideoInfo } from "../types";
import { supabase } from "../lib/supabase";
import { generateSmartCaption } from "../lib/captionUtils";
import { CustomSelect } from "./CustomSelect";

interface TiktokPublisherProps {
  activeVideo: VideoInfo | null;
}

export default function TiktokPublisher({ activeVideo }: TiktokPublisherProps) {
  // TikTok session configuration
  const [sessionid, setSessionid] = useState("");
  const [username, setUsername] = useState("");
  const [nickname, setNickname] = useState("");
  const [savingSession, setSavingSession] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Connection State
  const [connectedAccount, setConnectedAccount] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Form State
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [privacy, setPrivacy] = useState("public");
  const [selectedProxy, setSelectedProxy] = useState("");
  const [availableProxies, setAvailableProxies] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [allowComment, setAllowComment] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  const [scheduleTime, setScheduleTime] = useState("");

  // Publish Output State
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishLogs, setPublishLogs] = useState<string[]>([]);
  const [solution, setSolution] = useState<string | null>(null);
  const [pythonScript, setPythonScript] = useState<string | null>(null);
  const [nodeScript, setNodeScript] = useState<string | null>(null);
  const [copiedScriptType, setCopiedScriptType] = useState<"python" | "node" | null>(null);

  // Cloudinary History for choosing videos
  const [cloudinaryHistory, setCloudinaryHistory] = useState<any[]>([]);

  // ... (rest of the component)

  // Fetch session on mount or when auth changed
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      
      // Load proxies
      const storedProxies = localStorage.getItem("yt_proxy");
      if (storedProxies) {
        try {
          const parsed = JSON.parse(storedProxies);
          setAvailableProxies(Array.isArray(parsed) ? parsed : [storedProxies]);
        } catch (e) {
          setAvailableProxies(storedProxies.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean));
        }
      }

      if (user) {
        // Load saved session details from supabase settings or localStorage
        const savedSession = localStorage.getItem("tiktok_sessionid") || "";
        const savedUsername = localStorage.getItem("tiktok_username") || "";
        setSessionid(savedSession);
        setUsername(savedUsername);

        if (savedSession) {
          // Attempt automatic background verification
          handleVerify(savedSession, savedUsername);
        }
      } else {
        const savedSession = localStorage.getItem("tiktok_sessionid") || "";
        const savedUsername = localStorage.getItem("tiktok_username") || "";
        setSessionid(savedSession);
        setUsername(savedUsername);
      }
    });
    
    // Load recent cloudinary history from localStorage
    try {
      const history = JSON.parse(localStorage.getItem("yt_cloudinary_history") || "[]");
      setCloudinaryHistory(history);
    } catch (e) {
      console.error("Failed to load cloudinary history", e);
    }
  }, []);

  // Pre-populate Form with active video if available
  useEffect(() => {
    if (activeVideo) {
      if (!caption) {
        setCaption(generateSmartCaption(activeVideo.title));
      }
    }
  }, [activeVideo]);

  // Handle Session Verification
  const handleVerify = async (sidToVerify = sessionid, userToVerify = username) => {
    if (!sidToVerify.trim()) {
      setVerifyError("يرجى إدخال رمز الجلسة (sessionid) أولاً.");
      return;
    }

    setVerifying(true);
    setVerifyError(null);
    setConnectedAccount(null);

    try {
      const res = await fetch("/api/tiktok/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionid: sidToVerify.trim(),
          username: userToVerify.trim() || "tiktok_user",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل التحقق من الجلسة.");
      }

      setConnectedAccount(data);
      setNickname(data.nickname);
      
      // Save credentials locally
      localStorage.setItem("tiktok_sessionid", sidToVerify.trim());
      localStorage.setItem("tiktok_username", userToVerify.trim());

      // Save to database
      if (currentUser) {
        try {
          const accountId = `tt_${Date.now()}`;
          await fetch("/api/db/tiktok_accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: accountId,
              user_id: currentUser.id,
              sessionid: sidToVerify.trim(),
              username: userToVerify.trim() || "tiktok_user",
              nickname: data.nickname || ""
            })
          });
        } catch (dbErr) {
          console.error("Failed to save tiktok account to db", dbErr);
        }
      }

      setSessionSaved(true);
      setTimeout(() => setSessionSaved(false), 2000);
    } catch (err: any) {
      setVerifyError(err.message || "حدث خطأ أثناء الاتصال بالخادم للتحقق.");
    } finally {
      setVerifying(false);
    }
  };

  // Main Publish Action
  const handlePublish = async () => {
    if (!sessionid.trim()) {
      setPublishError("يرجى إدخال رمز الجلسة (sessionid) للتحقق والنشر.");
      return;
    }
    if (!mediaUrl.trim()) {
      setPublishError("يرجى إدخال أو اختيار رابط الفيديو من Cloudinary أولاً.");
      return;
    }

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishLogs([]);
    setSolution(null);
    setPythonScript(null);
    setNodeScript(null);

    try {
      const res = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionid: sessionid.trim(),
          username: username.trim() || "user",
          videoUrl: mediaUrl.trim(),
          caption: caption.trim(),
          proxy: selectedProxy,
          privacy,
          allowComment,
          allowDuet,
          allowStitch,
          scheduleTime: scheduleTime || undefined
        }),
      });

      const data = await res.json();
      
      if (data.logs) {
        setPublishLogs(data.logs);
      }

      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال طلب النشر إلى تيك توك.");
      }

      if (data.success) {
        setPublishSuccess(true);
      } else {
        // Handle cloud blocking solution/scripts response
        setPublishError(data.error || "تنبيه: تم حظر النشر التلقائي السحابي بواسطة حماية تيك توك.");
        if (data.solution) {
          setSolution(data.solution);
          setPythonScript(data.localPythonScript);
          setNodeScript(data.localNodeScript);
        }
      }
    } catch (err: any) {
      setPublishError(err.message || "حدث خطأ غير متوقع أثناء محاولة النشر.");
    } finally {
      setPublishing(false);
    }
  };

  const copyScript = async (code: string | null, type: "python" | "node") => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopiedScriptType(type);
      setTimeout(() => setCopiedScriptType(null), 2500);
    } catch (err) {
      console.error("Failed to copy code", err);
    }
  };

  return (
    <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md max-w-4xl mx-auto space-y-8 animate-fade-in" style={{ direction: "rtl" }}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-teal-400 border border-zinc-800 shadow-md">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94 1.18 2.22 2.02 3.61 2.45.02 1.35.01 2.68.01 4.02-1.34-.14-2.61-.69-3.61-1.57-.45-.4-.84-.86-1.15-1.37v6.07c.07 1.48-.3 2.97-1.13 4.2-1.12 1.63-2.91 2.72-4.88 2.94-1.92.23-3.9-.3-5.38-1.55-1.53-1.28-2.39-3.26-2.28-5.26.11-2.1 1.25-4.06 3.06-5.11 1.34-.8 2.92-1.07 4.45-.75.01 1.39.01 2.77.01 4.15-1 .15-2.02.66-2.58 1.51-.55.83-.58 1.95-.12 2.77.46.82 1.34 1.36 2.28 1.39.95.03 1.9-.38 2.44-1.15.54-.76.71-1.74.56-2.67V0h3.91z"/>
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>بوابة نشر TikTok المباشرة</span>
              <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-full font-bold">اتصال آمن وموثوق</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              انشر فيديوهاتك المعدلة والمجهزة لتفادي حقوق الطبع والنشر مباشرة إلى حسابك على تيك توك باستخدام معرف الجلسة الخاص بك
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer animate-pulse-subtle"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>كيفية استخراج Session ID؟</span>
        </button>
      </div>

      {/* Guide Details Panel */}
      {showGuide && (
        <div className="bg-slate-100 border border-slate-300/60 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed space-y-3 animate-fade-in text-right">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600" />
            <span>طريقة الحصول على ملف تعريف الارتباط (sessionid) الخاص بتيك توك:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-2 pr-2">
            <li>افتح متصفحك على الكمبيوتر واذهب إلى موقع <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" className="text-teal-600 font-bold underline">TikTok.com</a> وقم بتسجيل الدخول لحسابك.</li>
            <li>اضغط على زر الفأرة الأيمن في أي مكان بالصفحة واختر <strong>فحص (Inspect)</strong> أو اضغط على زر <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded font-mono text-[10px] shadow-2xs">F12</kbd>.</li>
            <li>توجه إلى تبويب <strong>التطبيق (Application)</strong> أو <strong>التخزين (Storage)</strong> في الأعلى.</li>
            <li>في القائمة الجانبية اليسرى، افتح <strong>ملفات تعريف الارتباط (Cookies)</strong> ثم اختر الرابط الخاص بـ <code className="font-bold text-teal-600">https://www.tiktok.com</code>.</li>
            <li>ابحث عن الملف الذي يحمل الاسم <strong className="font-mono text-teal-700">sessionid</strong> وقم بنسخ القيمة الطويلة الخاصة به المكونة من حروف وأرقام.</li>
            <li>قم بلصق الرمز في حقل الاتصال أدناه لحفظه والبدء بالنشر المباشر والآمن.</li>
          </ol>
          <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-xl font-bold mt-2">
            ⚠️ تنبيه هام: رمز الجلسة (sessionid) بمثابة مفتاح دخول لحسابك، لا تقم بمشاركته مع أي جهة غير موثوقة. نقوم بحفظه وتشفيره بأمان على حسابك الشخصي لتمكين الرفع الفوري.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: TikTok Connection */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-800">إعدادات الاتصال والربط</h3>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">معرف الجلسة (sessionid):</label>
              <div className="relative">
                <input
                  type="password"
                  value={sessionid}
                  onChange={(e) => setSessionid(e.target.value)}
                  placeholder="أدخل رمز sessionid المكون من 32 رمزاً..."
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                  style={{ direction: "ltr" }}
                />
                <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3.5" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-700">اسم المستخدم (Username):</label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="أدخل اسم مستخدم الحساب @..."
                  className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono text-left"
                  style={{ direction: "ltr" }}
                />
                <span className="absolute right-3 top-2.5 font-bold text-slate-400 text-xs">@</span>
              </div>
            </div>

            <button
              onClick={() => handleVerify()}
              disabled={verifying}
              className="w-full py-2.5 px-4 bg-zinc-950 hover:bg-zinc-900 disabled:bg-zinc-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-xs border border-zinc-800"
            >
              {verifying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-400" />
                  <span>جاري التحقق والاتصال...</span>
                </>
              ) : sessionSaved ? (
                <>
                  <Check className="w-4 h-4 text-teal-400 animate-bounce" />
                  <span>تم حفظ وتأكيد الحساب بنجاح!</span>
                </>
              ) : (
                <>
                  <Shield className="w-3.5 h-3.5 text-teal-400" />
                  <span>التحقق وربط الحساب</span>
                </>
              )}
            </button>
          </div>

          {verifyError && (
            <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700 text-[10px] leading-relaxed">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{verifyError}</span>
            </div>
          )}

          {/* Account Profile Card on success */}
          {connectedAccount && (
            <div className="p-4 bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl space-y-3 shadow-md animate-fade-in text-white">
              <div className="flex items-center gap-3">
                <img 
                  src={connectedAccount.avatar} 
                  alt={connectedAccount.username} 
                  className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-teal-400 object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="text-right flex-1">
                  <h4 className="text-xs font-black text-white">{connectedAccount.nickname}</h4>
                  <p className="text-[10px] text-teal-400 font-mono mt-0.5">{connectedAccount.username}</p>
                </div>
                <span className="text-[9px] bg-teal-900/40 text-teal-300 px-2 py-0.5 rounded-full font-bold border border-teal-500/20">
                  {connectedAccount.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-zinc-800/60">
                <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/30">
                  <span className="block text-[9px] text-zinc-400">المتابعون</span>
                  <span className="text-xs font-extrabold text-teal-400">{connectedAccount.followers.toLocaleString()}</span>
                </div>
                <div className="bg-zinc-900/60 p-2 rounded-xl border border-zinc-800/30">
                  <span className="block text-[9px] text-zinc-400">تسجيلات الإعجاب</span>
                  <span className="text-xs font-extrabold text-teal-400">{connectedAccount.likes.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Compose Form */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-800">تجهيز محتوى المنشور على TikTok</h3>
              </div>
              {activeVideo && (
                <div className="flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-bold">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>فيديو مفرد محمل</span>
                </div>
              )}
            </div>

            {/* Preview loaded video */}
            {activeVideo && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center gap-3">
                <img 
                  src={activeVideo.thumbnail} 
                  alt={activeVideo.title} 
                  className="w-16 h-10 object-cover rounded-lg bg-slate-200"
                  referrerPolicy="no-referrer"
                />
                <div className="flex-1 text-right min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{activeVideo.title}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">القناة: {activeVideo.uploader || "قناة يوتيوب"}</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Caption Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">شرح الفيديو / الهاشتاقات (Caption):</label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={4}
                  placeholder="اكتب شرحاً جذاباً عن المقطع... أضف هاشتاقات ترند لزيادة الوصول مثل #fyp #foryou #viral"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 leading-relaxed text-right"
                />
              </div>

              {/* Proxy Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">البروكسي المستخدم للنشر:</label>
                <select
                  value={selectedProxy}
                  onChange={(e) => setSelectedProxy(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                >
                  <option value="">بدون بروكسي (استخدام IP السيرفر)</option>
                  {availableProxies.map((p, i) => (
                    <option key={i} value={p}>{p}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500">اختر أحد البروكسيات المضافة في الإعدادات لتجاوز الحظر.</p>
              </div>

              {/* Uploaded Videos Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">اختر الفيديو المرفوع للنشر:</label>
                
                {cloudinaryHistory.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-1">
                    {cloudinaryHistory.map((item: any, index: number) => {
                      const isSelected = mediaUrl === item.cloudinaryUrl;
                      return (
                        <div
                          key={`tiktok-cl-${item.id || ""}-${item.cloudinaryUrl || ""}-${index}`}
                          onClick={() => {
                            setMediaUrl(item.cloudinaryUrl);
                            if (!caption.trim() || caption.includes("شاهد المقطع الرائع") || caption.includes("شاهد مقطع الفيديو الرائع") || caption.includes("#fyp")) {
                              setCaption(generateSmartCaption(item.title));
                            }
                          }}
                          className={`group flex gap-3 p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                            isSelected 
                              ? "bg-teal-50/60 border-teal-500 shadow-sm" 
                              : "bg-slate-50 border-slate-100 hover:border-teal-300 hover:bg-slate-100"
                          }`}
                        >
                          <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                            <img
                              src={item.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100"}
                              alt={item.title}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                            {isSelected && (
                              <div className="absolute inset-0 bg-teal-600/20 flex items-center justify-center backdrop-blur-[1px]">
                                <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-md">
                                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex flex-col justify-between overflow-hidden flex-1 text-right">
                            <div className="space-y-0.5">
                              <h4 className={`text-xs font-semibold truncate transition-colors ${
                                isSelected ? "text-teal-800" : "text-slate-700 group-hover:text-teal-600"
                              }`}>
                                {item.title}
                              </h4>
                              {item.createdAt && (
                                <p className="text-[10px] text-slate-400">
                                  {new Date(item.createdAt).toLocaleDateString("ar-EG", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </p>
                              )}
                            </div>
                            <p className="text-[9px] text-slate-400 font-mono mt-2 truncate text-left w-full" style={{ direction: "ltr" }}>
                              {item.cloudinaryUrl}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                    <p className="text-xs font-bold text-amber-800">لا توجد فيديوهات مرفوعة مسبقاً.</p>
                    <p className="text-[10px] text-amber-600 mt-1">يرجى رفع فيديو من خلال محرر الفيديوهات أو قسم الرفع أولاً لتتمكن من نشره هنا.</p>
                  </div>
                )}
              </div>

              {/* Privacy and Audience Settings */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-4">
                <h4 className="text-xs font-bold text-slate-800">إعدادات الخصوصية والجمهور</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] text-slate-500 font-bold">من يمكنه رؤية الفيديو:</label>
                    <CustomSelect
                      options={[
                        { value: "public", label: "الجميع (Public)" },
                        { value: "friends", label: "الأصدقاء فقط (Friends)" },
                        { value: "private", label: "أنا فقط (Private)" },
                      ]}
                      value={privacy}
                      onChange={(val) => setPrivacy(val)}
                      placeholder="اختر إعداد الخصوصية..."
                      searchable={false}
                    />
                  </div>

                  <div className="space-y-2 pt-4 sm:pt-0">
                    <label className="block text-[11px] text-slate-500 font-bold">خيارات التفاعل والمشاركة:</label>
                    <div className="space-y-2 text-xs">
                      <label className="flex items-center gap-2 cursor-pointer justify-end">
                        <span className="text-slate-700 font-medium">السماح بالتعليقات</span>
                        <input
                          type="checkbox"
                          checked={allowComment}
                          onChange={(e) => setAllowComment(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer justify-end">
                        <span className="text-slate-700 font-medium">السماح بـ الدويتو (Duet)</span>
                        <input
                          type="checkbox"
                          checked={allowDuet}
                          onChange={(e) => setAllowDuet(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer justify-end">
                        <span className="text-slate-700 font-medium">السماح بـ الدمج (Stitch)</span>
                        <input
                          type="checkbox"
                          checked={allowStitch}
                          onChange={(e) => setAllowStitch(e.target.checked)}
                          className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress logs during publish */}
              {publishLogs.length > 0 && (
                <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-right">
                  <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                    <List className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                    <span className="text-[11px] font-mono font-bold text-slate-300">سجل عمليات الرفع السحابي:</span>
                  </div>
                  <div className="space-y-1.5 font-mono text-[10px] text-slate-400 max-h-40 overflow-y-auto pr-1">
                    {publishLogs.map((log, index) => (
                      <p key={index} className={`flex items-start gap-1 justify-end ${log.includes("🎉") || log.includes("[+]") ? "text-teal-400 font-bold" : log.includes("⚠️") || log.includes("[-]") ? "text-amber-400" : ""}`}>
                        <span>{log}</span>
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Error messages */}
              {publishError && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-fade-in text-right">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <p className="font-bold">{publishError}</p>
                    {solution && <p className="text-[11px] text-rose-700 mt-1 leading-relaxed">{solution}</p>}
                  </div>
                </div>
              )}

              {/* Special Bypassing Instructions & Local Script Runners when blocked by TikTok Security */}
              {solution && pythonScript && (
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-right text-white animate-fade-in">
                  <div className="flex items-center gap-2 border-b border-zinc-800 pb-3">
                    <Shield className="w-5 h-5 text-amber-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-white">سكربت التشغيل المحلي الجاهز (لتخطي حظر تيك توك)</h4>
                      <p className="text-[10px] text-zinc-400">بسبب قيود السيرفرات السحابية، يمكنك تشغيل هذا السكربت على جهازك للنشر الفوري والآمن بنسبة 100%.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <button 
                          onClick={() => copyScript(pythonScript, "python")}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {copiedScriptType === "python" ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                          <span>{copiedScriptType === "python" ? "تم نسخ كود بايثون" : "نسخ سكربت بايثون"}</span>
                        </button>
                        <button 
                          onClick={() => copyScript(nodeScript, "node")}
                          className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded-lg flex items-center gap-1 transition-colors"
                        >
                          {copiedScriptType === "node" ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3 text-zinc-400" />}
                          <span>{copiedScriptType === "node" ? "تم نسخ كود نود" : "نسخ سكربت Node.js"}</span>
                        </button>
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400">تعليمات التشغيل السريع:</span>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-300 text-left overflow-x-auto max-h-56 select-text" style={{ direction: "ltr" }}>
                      <pre>{pythonScript}</pre>
                    </div>

                    <div className="bg-zinc-950/40 p-3 rounded-xl border border-zinc-800 text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
                      <p className="font-bold text-white">كيفية تشغيل السكربت على جهازك:</p>
                      <ol className="list-decimal list-inside space-y-1 pr-1 text-right" style={{ direction: "rtl" }}>
                        <li>قم بإنشاء ملف نصي على جهازك باسم <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-white text-[10px]">tiktok_uploader.py</code>.</li>
                        <li>قم بلصق السكربت المنسوخ أعلاه داخل الملف واحفظه.</li>
                        <li>افتح نافذة الأوامر (Terminal / CMD) واكتب: <code className="font-mono bg-zinc-800 px-1 py-0.5 rounded text-white text-[10px]">pip install requests</code>.</li>
                        <li>شغّل السكربت بكتابة الأمر: <code className="font-mono bg-zinc-800 px-1.5 py-0.5 rounded text-teal-400 text-[10px]">python tiktok_uploader.py</code>.</li>
                      </ol>
                    </div>
                  </div>
                </div>
              )}

              {/* Success message */}
              {publishSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 text-emerald-800 text-xs animate-fade-in text-right">
                  <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1 space-y-1">
                    <p className="font-bold">تم إرسال ونشر الفيديو بنجاح! 🎉</p>
                    <p className="text-[10px] text-emerald-600">
                      تهانينا! تم رفع الفيديو ونشره بشكل مباشر على حسابك الشخصي على تيك توك بنجاح. يمكنك التحقق من تطبيق تيك توك الآن لمشاهدته.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-950 hover:from-black hover:to-zinc-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer border border-zinc-800"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                    <span>جاري الرفع والنشر المباشر على TikTok...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 text-teal-400" />
                    <span>رفع ونشر الفيديو على TikTok المباشر</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
