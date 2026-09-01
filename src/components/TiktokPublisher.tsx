import { useState, useEffect } from "react";
import { 
  CheckCircle2, Info, Settings, Check, ExternalLink, HelpCircle, Send, Globe, 
  AlertCircle, Sparkles, Loader2, Key, Share2, Copy, Shield, ToggleLeft, Clipboard, 
  List, ArrowRight, Music, Clock, Eye, Download, Code2, Terminal, RefreshCw, FileText, CheckCircle
} from "lucide-react";
import { VideoInfo } from "../types";
import { supabase } from "../lib/supabase";
import { generateSmartCaption } from "../lib/captionUtils";
import { CustomSelect } from "./CustomSelect";

interface TiktokPublisherProps {
  activeVideo: VideoInfo | null;
}

export default function TiktokPublisher({ activeVideo }: TiktokPublisherProps) {
  // TikTok session / credentials configuration
  const [authMode, setAuthMode] = useState<"session_id" | "cookies_json">("session_id");
  const [sessionid, setSessionid] = useState("");
  const [cookiesJson, setCookiesJson] = useState("");
  const [username, setUsername] = useState("");
  const [accountname, setAccountname] = useState("");
  const [nickname, setNickname] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Connection State
  const [connectedAccount, setConnectedAccount] = useState<any>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Form State
  const [caption, setCaption] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [privacy, setPrivacy] = useState("everyone");
  const [selectedProxy, setSelectedProxy] = useState("");
  const [availableProxies, setAvailableProxies] = useState<string[]>([]);
  const [showGuide, setShowGuide] = useState(false);
  const [allowComment, setAllowComment] = useState(true);
  const [allowDuet, setAllowDuet] = useState(true);
  const [allowStitch, setAllowStitch] = useState(true);
  
  // Advanced TikTokAutoUploader Settings (haziq-exe/TikTokAutoUploader)
  const [stealthMode, setStealthMode] = useState(true);
  const [copyrightCheck, setCopyrightCheck] = useState(true);
  const [soundName, setSoundName] = useState("");
  const [soundAudVol, setSoundAudVol] = useState<"main" | "mix" | "background">("mix");
  const [enableSchedule, setEnableSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("19:30");
  const [scheduleDay, setScheduleDay] = useState("");

  // Publish Output State
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishLogs, setPublishLogs] = useState<string[]>([]);
  const [generatedPythonScript, setGeneratedPythonScript] = useState<string | null>(null);
  const [generatedCookieJson, setGeneratedCookieJson] = useState<any>(null);
  const [generatedCookieFilename, setGeneratedCookieFilename] = useState<string>("TK_cookies_main_account.json");
  const [copiedScriptType, setCopiedScriptType] = useState<"python" | "bash" | "cookies" | null>(null);

  // Cloudinary History for choosing videos
  const [cloudinaryHistory, setCloudinaryHistory] = useState<any[]>([]);

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

      const savedSession = localStorage.getItem("tiktok_sessionid") || "";
      const savedUsername = localStorage.getItem("tiktok_username") || "";
      const savedCookies = localStorage.getItem("tiktok_cookies_json") || "";
      const savedAccountName = localStorage.getItem("tiktok_accountname") || "";

      setSessionid(savedSession);
      setUsername(savedUsername);
      setCookiesJson(savedCookies);
      setAccountname(savedAccountName || (savedUsername ? savedUsername.replace(/^@/, "") : "main_account"));

      if (savedSession || savedCookies) {
        handleVerify(savedSession, savedUsername, savedCookies);
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

  // Handle Session / Cookies Verification
  const handleVerify = async (
    sidToVerify = sessionid, 
    userToVerify = username, 
    cookiesToVerify = cookiesJson
  ) => {
    if (authMode === "session_id" && !sidToVerify.trim()) {
      setVerifyError("يرجى إدخال رمز الجلسة (sessionid) أولاً.");
      return;
    }
    if (authMode === "cookies_json" && !cookiesToVerify.trim()) {
      setVerifyError("يرجى لصق ملف الكوكيز بصيغة JSON أولاً.");
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
          cookiesJson: authMode === "cookies_json" ? cookiesToVerify.trim() : undefined,
          username: userToVerify.trim() || "tiktok_user",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل التحقق من بيانات الاتصال.");
      }

      setConnectedAccount(data);
      setNickname(data.nickname);
      
      const cleanUser = userToVerify.trim().replace(/^@/, "");
      if (cleanUser && !accountname) {
        setAccountname(cleanUser);
      }

      // Save credentials locally
      if (sidToVerify.trim()) localStorage.setItem("tiktok_sessionid", sidToVerify.trim());
      if (userToVerify.trim()) localStorage.setItem("tiktok_username", userToVerify.trim());
      if (cookiesToVerify.trim()) localStorage.setItem("tiktok_cookies_json", cookiesToVerify.trim());
      localStorage.setItem("tiktok_accountname", accountname || cleanUser || "main_account");

      // Save to database if logged in
      if (currentUser) {
        try {
          const accountId = `tt_${Date.now()}`;
          await fetch("/api/db/tiktok_accounts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: accountId,
              user_id: currentUser.id,
              sessionid: sidToVerify.trim() || "COOKIES_JSON_AUTH",
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
      setVerifyError(err.message || "حدث خطأ أثناء الاتصال بخوادم التحقق.");
    } finally {
      setVerifying(false);
    }
  };

  // Main Publish Action using haziq-exe/TikTokAutoUploader
  const handlePublish = async () => {
    if (authMode === "session_id" && !sessionid.trim()) {
      setPublishError("يرجى إدخال رمز الجلسة (sessionid) للتحقق والنشر.");
      return;
    }
    if (authMode === "cookies_json" && !cookiesJson.trim()) {
      setPublishError("يرجى إدخال ملف كوكيز JSON للتحقق والنشر.");
      return;
    }
    if (!mediaUrl.trim()) {
      setPublishError("يرجى إدخال أو اختيار رابط الفيديو من الفيديوهات المرفوعة أولاً.");
      return;
    }

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishLogs([]);

    try {
      const res = await fetch("/api/tiktok/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionid: sessionid.trim(),
          cookiesJson: authMode === "cookies_json" ? cookiesJson.trim() : undefined,
          username: username.trim() || "user",
          accountname: accountname.trim() || username.trim().replace(/^@/, "") || "main_account",
          videoUrl: mediaUrl.trim(),
          caption: caption.trim(),
          privacy,
          sound_name: soundName.trim() || undefined,
          sound_aud_vol: soundName.trim() ? soundAudVol : undefined,
          scheduleTime: enableSchedule ? scheduleTime : undefined,
          scheduleDay: enableSchedule && scheduleDay ? parseInt(scheduleDay, 10) : undefined,
          copyrightcheck: copyrightCheck,
          stealth: stealthMode,
          allowComment,
          allowDuet,
          allowStitch,
          proxy: selectedProxy || undefined,
        }),
      });

      const data = await res.json();
      
      if (data.logs) {
        setPublishLogs(data.logs);
      }

      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال طلب النشر عبر TikTokAutoUploader.");
      }

      if (data.localPythonScript) {
        setGeneratedPythonScript(data.localPythonScript);
      }
      if (data.cookieJson) {
        setGeneratedCookieJson(data.cookieJson);
      }
      if (data.cookieFilename) {
        setGeneratedCookieFilename(data.cookieFilename);
      }

      setPublishSuccess(true);
    } catch (err: any) {
      setPublishError(err.message || "حدث خطأ غير متوقع أثناء محاولة النشر.");
    } finally {
      setPublishing(false);
    }
  };

  const copyToClipboard = async (text: string | null, type: "python" | "bash" | "cookies") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedScriptType(type);
      setTimeout(() => setCopiedScriptType(null), 2500);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType = "text/plain") => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md max-w-5xl mx-auto space-y-8 animate-fade-in" style={{ direction: "rtl" }}>
      {/* Header section with haziq-exe/TikTokAutoUploader Badge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-zinc-950 flex items-center justify-center text-teal-400 border border-zinc-800 shadow-md">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.59 4.23.94 1.18 2.22 2.02 3.61 2.45.02 1.35.01 2.68.01 4.02-1.34-.14-2.61-.69-3.61-1.57-.45-.4-.84-.86-1.15-1.37v6.07c.07 1.48-.3 2.97-1.13 4.2-1.12 1.63-2.91 2.72-4.88 2.94-1.92.23-3.9-.3-5.38-1.55-1.53-1.28-2.39-3.26-2.28-5.26.11-2.1 1.25-4.06 3.06-5.11 1.34-.8 2.92-1.07 4.45-.75.01 1.39.01 2.77.01 4.15-1 .15-2.02.66-2.58 1.51-.55.83-.58 1.95-.12 2.77.46.82 1.34 1.36 2.28 1.39.95.03 1.9-.38 2.44-1.15.54-.76.71-1.74.56-2.67V0h3.91z"/>
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-black text-slate-800">
                ناشر TikTok المباشر 🎵
              </h2>
              <span className="text-[11px] bg-teal-500/10 text-teal-700 border border-teal-500/20 px-2.5 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                <Shield className="w-3 h-3 text-teal-600" />
                TikTokAutoUploader (haziq-exe)
              </span>
              <span className="text-[10px] bg-zinc-900 text-teal-300 px-2 py-0.5 rounded-full font-mono font-bold">
                Phantomwright Stealth Engine
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-1">
              نشر آمن للفيديوهات عبر محرك <strong className="text-slate-700">TikTokAutoUploader</strong> مع تخطي كشف الروبوتات وفحص حقوق النشر المسبق ومزامنة أصوات TikTok.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <a
            href="https://github.com/haziq-exe/TikTokAutoUploader"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-black text-white rounded-xl transition-all text-xs font-bold shadow-xs cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-teal-400" />
            <span>مستودع GitHub للأداة</span>
          </a>
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5 text-teal-600" />
            <span>طريقة استخراج الكوكيز</span>
          </button>
        </div>
      </div>

      {/* Guide Details Panel */}
      {showGuide && (
        <div className="bg-slate-100 border border-slate-300/70 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed space-y-3 animate-fade-in text-right">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-teal-600" />
            <span>كيفية استخراج رمز الجلسة (Session ID) أو ملف الكوكيز TK_cookies.json:</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-100 pb-1.5">
                الطريقة 1: استخراج sessionid من أدوات المطور (F12)
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600">
                <li>افتح <a href="https://www.tiktok.com" target="_blank" rel="noreferrer" className="text-teal-600 font-bold underline">TikTok.com</a> وسجل الدخول بحسابك.</li>
                <li>اضغط <kbd className="px-1 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-[9px]">F12</kbd> لفتح أدوات المطور (Inspect).</li>
                <li>انتقل إلى تبويب <strong>Application</strong> أو <strong>Storage</strong>.</li>
                <li>افتح <strong>Cookies</strong> واختر رابط <code className="font-bold text-teal-700">https://www.tiktok.com</code>.</li>
                <li>انسخ قيمة الكوكي المسمى <strong className="font-mono text-teal-700">sessionid</strong> والصقه هنا.</li>
              </ol>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
              <span className="font-bold text-slate-800 text-xs block border-b border-slate-100 pb-1.5">
                الطريقة 2: تصدير ملف TK_cookies.json باستخدام إضافة المتصفح
              </span>
              <ol className="list-decimal list-inside space-y-1.5 text-[11px] text-slate-600">
                <li>ثبّت إضافة تصدير كوكيز مثل <em>Cookie-Editor</em> أو <em>EditThisCookie</em>.</li>
                <li>افتح موقع TikTok واضغط على الإضافة ثم اختر <strong>Export (JSON)</strong>.</li>
                <li>اختر تبويب "ملف كوكيز JSON" أدناه والصق الكوكيز مباشرة.</li>
                <li>تتعرف أداة <strong className="text-slate-800">TikTokAutoUploader</strong> تلقائياً على الملف وتخزنه باسم <code className="font-mono text-teal-700">TK_cookies_account.json</code>.</li>
              </ol>
            </div>
          </div>
          <p className="text-[10px] text-teal-800 bg-teal-50 border border-teal-200/60 p-2.5 rounded-xl font-bold mt-1">
            🛡️ حماية وخصوصية تامة: يتم تشفير وحفظ ملفات الارتباط محلياً ولا يتم مشاركتها مطلقاً.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: TikTok Connection & Account Config */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-slate-500" />
              <h3 className="font-bold text-sm text-slate-800">إعدادات الاتصال والتوثيق</h3>
            </div>
            
            {/* Auth Mode Toggle */}
            <div className="flex p-0.5 bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-bold">
              <button
                type="button"
                onClick={() => setAuthMode("session_id")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  authMode === "session_id" ? "bg-white text-teal-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Session ID
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("cookies_json")}
                className={`px-2 py-1 rounded-md transition-all cursor-pointer ${
                  authMode === "cookies_json" ? "bg-white text-teal-700 shadow-2xs" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Cookies JSON
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {authMode === "session_id" ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">معرف الجلسة (sessionid):</label>
                <div className="relative">
                  <input
                    type="password"
                    value={sessionid}
                    onChange={(e) => setSessionid(e.target.value)}
                    placeholder="أدخل رمز sessionid..."
                    className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                    style={{ direction: "ltr" }}
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute right-3 top-3" />
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">محتوى ملف الكوكيز (JSON):</label>
                <textarea
                  rows={4}
                  value={cookiesJson}
                  onChange={(e) => setCookiesJson(e.target.value)}
                  placeholder='[ { "name": "sessionid", "value": "..." }, ... ]'
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                  style={{ direction: "ltr" }}
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">اسم المستخدم (Username):</label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="@username"
                    className="w-full pl-2 pr-6 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono text-left"
                    style={{ direction: "ltr" }}
                  />
                  <span className="absolute right-2.5 top-2 font-bold text-slate-400 text-xs">@</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-700">معرف الحساب بالأداة:</label>
                <input
                  type="text"
                  value={accountname}
                  onChange={(e) => setAccountname(e.target.value)}
                  placeholder="main_account"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono text-left"
                  style={{ direction: "ltr" }}
                />
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
                  <span>التحقق وربط الحساب مع الأداة</span>
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
                <div className="text-right flex-1 min-w-0">
                  <h4 className="text-xs font-black text-white truncate">{connectedAccount.nickname}</h4>
                  <p className="text-[10px] text-teal-400 font-mono mt-0.5 truncate">{connectedAccount.username}</p>
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

          {/* TikTokAutoUploader Stealth Highlights */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2 text-right">
            <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-teal-600" />
              <span>مزايا النشر الآمن مع TikTokAutoUploader:</span>
            </span>
            <ul className="text-[10px] text-slate-600 space-y-1 pr-1">
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" />
                <span>محرك Phantomwright ضد كشف أتمتة المتصفح</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" />
                <span>فحص حقوق النشر المسبق لتفادي كتم الصوت أو الحظر</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" />
                <span>إدراج أصوات تيك توك وموازنتها بدقة</span>
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3 text-teal-500 shrink-0" />
                <span>حفظ وتوليد ملفات TK_cookies.json بنقرة واحدة</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Right column: Compose Form & Advanced Settings */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-teal-600" />
                <h3 className="font-bold text-sm text-slate-800">تجهيز المحتوى وخيارات الأداة المتقدمة</h3>
              </div>
              {activeVideo && (
                <div className="flex items-center gap-1 text-[10px] text-teal-700 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded-full font-bold">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>فيديو جاهز</span>
                </div>
              )}
            </div>

            {/* Video Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">اختر الفيديو المراد رفعه ونشره:</label>
              
              {cloudinaryHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
                  {cloudinaryHistory.map((item: any, index: number) => {
                    const isSelected = mediaUrl === item.cloudinaryUrl;
                    return (
                      <div
                        key={`tt-vid-${index}`}
                        onClick={() => {
                          setMediaUrl(item.cloudinaryUrl);
                          if (!caption.trim() || caption.includes("شاهد المقطع") || caption.includes("#fyp")) {
                            setCaption(generateSmartCaption(item.title));
                          }
                        }}
                        className={`group flex gap-2.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? "bg-teal-50/60 border-teal-500 shadow-xs" 
                            : "bg-slate-50 border-slate-100 hover:border-teal-300 hover:bg-slate-100"
                        }`}
                      >
                        <div className="relative w-20 h-14 rounded-lg overflow-hidden bg-slate-200 shrink-0">
                          <img
                            src={item.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100"}
                            alt={item.title}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-teal-600/30 flex items-center justify-center backdrop-blur-[0.5px]">
                              <Check className="w-4 h-4 text-white stroke-[3]" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex flex-col justify-between overflow-hidden flex-1 text-right">
                          <h4 className={`text-xs font-semibold truncate transition-colors ${
                            isSelected ? "text-teal-800" : "text-slate-700 group-hover:text-teal-600"
                          }`}>
                            {item.title}
                          </h4>
                          <p className="text-[9px] text-slate-400 font-mono truncate text-left" style={{ direction: "ltr" }}>
                            {item.cloudinaryUrl}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-100 rounded-xl text-center">
                  <p className="text-xs font-bold text-amber-800">لا توجد فيديوهات مرفوعة مسبقاً.</p>
                  <p className="text-[10px] text-amber-600 mt-0.5">يمكنك رفع مقطع من قسم الرفع أو إدخال رابط مباشر أدناه.</p>
                </div>
              )}

              {/* Direct Media URL Input */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="أو الصق رابط الفيديو المباشر (Cloudinary / MP4 URL)..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono text-left"
                  style={{ direction: "ltr" }}
                />
              </div>
            </div>

            {/* Caption Input */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">شرح الفيديو والهاشتاقات (Caption & Hashtags):</label>
                <button
                  type="button"
                  onClick={() => {
                    if (activeVideo?.title) {
                      setCaption(generateSmartCaption(activeVideo.title));
                    } else {
                      setCaption("مقطع فيديو رائع ومميز تم إنتاجه بالذكاء الاصطناعي 🚀 #fyp #foryou #viral #explore");
                    }
                  }}
                  className="text-[10px] text-teal-600 hover:text-teal-700 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>توليد وصف تلقائي</span>
                </button>
              </div>
              <textarea
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={3}
                placeholder="اكتب شرحاً جذاباً عن المقطع... الهاشتاقات سيتم استخراجها وتمريرها لمحرك TikTokAutoUploader تلقائياً."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 leading-relaxed text-right"
              />
            </div>

            {/* Advanced TikTokAutoUploader Controls Accordion */}
            <div className="border border-slate-200 bg-slate-50/70 rounded-2xl p-4 space-y-4">
              <h4 className="text-xs font-black text-slate-800 flex items-center gap-2 border-b border-slate-200 pb-2">
                <Shield className="w-4 h-4 text-teal-600" />
                <span>إعدادات محرك TikTokAutoUploader الآمن (haziq-exe)</span>
              </h4>

              {/* Stealth & Copyright Pre-Check */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <label className="flex items-start gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-300 transition-all">
                  <input
                    type="checkbox"
                    checked={stealthMode}
                    onChange={(e) => setStealthMode(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">محرك التخفي Phantomwright (Stealth)</span>
                    <span className="text-[10px] text-slate-500">محاكاة تصرفات بشرية وتأخير عشوائي لتفادي الحظر.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2.5 bg-white border border-slate-200 rounded-xl cursor-pointer hover:border-teal-300 transition-all">
                  <input
                    type="checkbox"
                    checked={copyrightCheck}
                    onChange={(e) => setCopyrightCheck(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 mt-0.5"
                  />
                  <div>
                    <span className="font-bold text-slate-800 block text-xs">فحص حقوق النشر المسبق (Copyright Check)</span>
                    <span className="text-[10px] text-slate-500">إيقاف النشر فوراً في حال تعارض الصوت مع حقوق الطبع.</span>
                  </div>
                </label>
              </div>

              {/* TikTok Sound Integration */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                  <Music className="w-4 h-4 text-teal-600" />
                  <span>دمج صوت / موسيقى تيك توك الرسمية (TikTok Sound):</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600">اسم الصوت في TikTok (اختياري):</label>
                    <input
                      type="text"
                      value={soundName}
                      onChange={(e) => setSoundName(e.target.value)}
                      placeholder="مثال: Original Sound - Artist"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold text-slate-600">موازنة الصوت (Sound Balance):</label>
                    <CustomSelect
                      options={[
                        { value: "mix", label: "دمج الصوتين معاً (Mix - مستحسن)" },
                        { value: "main", label: "صوت الفيديو فقط (Main Audio)" },
                        { value: "background", label: "صوت تيك توك كخلفية (Background)" },
                      ]}
                      value={soundAudVol}
                      onChange={(val) => setSoundAudVol(val as any)}
                      placeholder="اختر موازنة الصوت..."
                      searchable={false}
                    />
                  </div>
                </div>
              </div>

              {/* Scheduling */}
              <div className="bg-white p-3.5 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Clock className="w-4 h-4 text-teal-600" />
                    <span>جدولة النشر التلقائي (Schedule Upload):</span>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                    <span>تفعيل الجدولة</span>
                    <input
                      type="checkbox"
                      checked={enableSchedule}
                      onChange={(e) => setEnableSchedule(e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                  </label>
                </div>

                {enableSchedule && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 animate-fade-in">
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">وقت النشر (HH:MM):</label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-[10px] font-bold text-slate-600">يوم الشهر (اختياري، حتى 10 أيام مقدماً):</label>
                      <input
                        type="number"
                        min={1}
                        max={31}
                        value={scheduleDay}
                        onChange={(e) => setScheduleDay(e.target.value)}
                        placeholder="اليوم الحالي"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Privacy & Permissions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">ظهور وخصوصية الفيديو (Visibility):</label>
                  <CustomSelect
                    options={[
                      { value: "everyone", label: "الجميع (Everyone - عام)" },
                      { value: "friends", label: "الأصدقاء فقط (Friends)" },
                      { value: "private", label: "أنا فقط (Private - خاص)" },
                    ]}
                    value={privacy}
                    onChange={(val) => setPrivacy(val)}
                    placeholder="اختر إعداد الخصوصية..."
                    searchable={false}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold text-slate-700">بروكسي الاتصال (Proxy):</label>
                  <select
                    value={selectedProxy}
                    onChange={(e) => setSelectedProxy(e.target.value)}
                    className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-teal-500 font-mono"
                  >
                    <option value="">تلقائي (IP السيرفر / اتصال مباشر)</option>
                    {availableProxies.map((p, i) => (
                      <option key={i} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Interactions Toggles */}
              <div className="flex items-center gap-4 text-xs font-medium text-slate-700 flex-wrap pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowComment}
                    onChange={(e) => setAllowComment(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>السماح بالتعليقات</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowDuet}
                    onChange={(e) => setAllowDuet(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>السماح بالدويتو (Duet)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowStitch}
                    onChange={(e) => setAllowStitch(e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span>السماح بالدمج (Stitch)</span>
                </label>
              </div>
            </div>

            {/* Execution logs */}
            {publishLogs.length > 0 && (
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-2 text-right">
                <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <List className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
                  <span className="text-[11px] font-mono font-bold text-slate-300">سجل عمليات TikTokAutoUploader:</span>
                </div>
                <div className="space-y-1.5 font-mono text-[10px] text-slate-300 max-h-40 overflow-y-auto pr-1" style={{ direction: "ltr" }}>
                  {publishLogs.map((log, index) => (
                    <p key={index} className={`text-left ${log.includes("🎉") || log.includes("✓") || log.includes("SUCCESS") ? "text-teal-400 font-bold" : log.includes("⚠️") || log.includes("Error") ? "text-rose-400" : "text-slate-300"}`}>
                      {log}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Error message */}
            {publishError && (
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-fade-in text-right">
                <AlertCircle className="w-5 h-5 shrink-0 text-rose-500 mt-0.5" />
                <div className="space-y-1 flex-1">
                  <p className="font-bold">{publishError}</p>
                </div>
              </div>
            )}

            {/* Success Banner & Generated Python Script Block */}
            {publishSuccess && generatedPythonScript && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 text-right text-white animate-fade-in">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0" />
                    <div>
                      <h4 className="text-xs font-black text-white">تم تجهيز وتشغيل سكريبت TikTokAutoUploader بنجاح! 🚀</h4>
                      <p className="text-[10px] text-zinc-400">يمكنك نسخ أو تنزيل ملف السكربت والكوكيز للتشغيل المباشر على أي سيرفر أو جهاز.</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadFile(generatedPythonScript, "tiktok_uploader.py")}
                      className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded-lg flex items-center gap-1 text-teal-300 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>تحميل tiktok_uploader.py</span>
                    </button>

                    {generatedCookieJson && (
                      <button
                        type="button"
                        onClick={() => downloadFile(JSON.stringify(generatedCookieJson, null, 2), generatedCookieFilename, "application/json")}
                        className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-bold rounded-lg flex items-center gap-1 text-amber-300 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>تحميل {generatedCookieFilename}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Code display */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>كود بايثون الجاهز (Python Script):</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(generatedPythonScript, "python")}
                      className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-md text-[10px] text-zinc-300 font-mono font-bold flex items-center gap-1 cursor-pointer"
                    >
                      {copiedScriptType === "python" ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedScriptType === "python" ? "تم نسخ الكود!" : "نسخ كود بايثون"}</span>
                    </button>
                  </div>

                  <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-800 font-mono text-[10px] text-zinc-300 text-left overflow-x-auto max-h-60 select-text" style={{ direction: "ltr" }}>
                    <pre>{generatedPythonScript}</pre>
                  </div>
                </div>

                {/* Quick run command */}
                <div className="bg-zinc-950/70 p-3 rounded-xl border border-zinc-800 space-y-2 text-right">
                  <span className="text-[11px] font-bold text-zinc-300">أمر التثبيت والتشغيل السريع (Terminal):</span>
                  <div className="flex items-center justify-between bg-zinc-900 px-3 py-2 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-teal-400" style={{ direction: "ltr" }}>
                    <span>pip install tiktokautouploader requests && python tiktok_uploader.py</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard("pip install tiktokautouploader requests && python tiktok_uploader.py", "bash")}
                      className="p-1 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white cursor-pointer"
                      title="نسخ الأمر"
                    >
                      {copiedScriptType === "bash" ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handlePublish}
              disabled={publishing}
              className="w-full py-4 bg-gradient-to-r from-zinc-900 to-zinc-950 hover:from-black hover:to-zinc-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer border border-zinc-800"
            >
              {publishing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
                  <span>جاري تنفيذ النشر الآمن عبر TikTokAutoUploader...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-teal-400" />
                  <span>رفع ونشر آمن باستخدام TikTokAutoUploader 🚀</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
