import React, { useState, useEffect } from "react";
import { 
  Share2, Key, UserCheck, RefreshCw, AlertCircle, Loader2, Sparkles, 
  CheckCircle2, Info, Settings, Check, ExternalLink, HelpCircle, Network, Layers
} from "lucide-react";
import { VideoInfo } from "../types";
import { supabase } from "../lib/supabase";
import { generateSmartCaption } from "../lib/captionUtils";

interface BufferProfile {
  id: string;
  service: string;
  service_username: string;
  avatar: string;
  formatted_service: string;
  service_type: string;
}

interface BufferPublisherProps {
  activeVideo: VideoInfo | null;
}

export default function BufferPublisher({ activeVideo }: BufferPublisherProps) {
  // Connection & Profiles State
  const [profiles, setProfiles] = useState<BufferProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);
  
  // Linked accounts from settings database
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Post/Publish Form State
  const [text, setText] = useState("");
  const [postType, setPostType] = useState<"text" | "video" | "link">("text");
  const [linkUrl, setLinkUrl] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [postImmediately, setPostImmediately] = useState(true);
  const [cloudinaryHistory, setCloudinaryHistory] = useState<any[]>([]);

  // Execution States
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<any>(null);

  // Guide panel toggle
  const [showGuide, setShowGuide] = useState(false);

  const selectAccount = (acc: any) => {
    setSelectedAccountId(acc.id);
    setAccessToken(acc.access_token || "");
    fetchProfiles(acc.access_token || "");
  };

  const loadLinkedAccounts = async (uid: string) => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.from("buffer_accounts").select("*").eq("user_id", uid);
      if (error) throw error;
      const list = data || [];
      setLinkedAccounts(list);
      
      // Select the first account by default if available
      if (list.length > 0) {
        setSelectedAccountId(list[0].id);
        setAccessToken(list[0].access_token || "");
        fetchProfiles(list[0].access_token || "");
      } else {
        // If no accounts, clear states
        setAccessToken("");
        setProfiles([]);
      }
    } catch (err) {
      console.error("Error loading linked Buffer accounts inside Publisher:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch accounts on mount
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setCurrentUser(user);
      if (user) {
        loadLinkedAccounts(user.id);
      }
    });
  }, []);

  // Load history from localStorage on mount/activeVideo change
  useEffect(() => {
    try {
      const saved = localStorage.getItem("yt_cloudinary_history");
      if (saved) {
        setCloudinaryHistory(JSON.parse(saved));
      }
    } catch (e) {
      console.warn("Could not load Cloudinary history inside BufferPublisher:", e);
    }
  }, [activeVideo]);

  // Autofill post from active video
  useEffect(() => {
    if (activeVideo) {
      setText(generateSmartCaption(activeVideo.title));
      setPostType("video");

      // Attempt to look for a matching Cloudinary URL in the history
      try {
        const saved = localStorage.getItem("yt_cloudinary_history");
        if (saved) {
          const parsed = JSON.parse(saved);
          const match = parsed.find(
            (item: any) => 
              item.youtubeUrl === activeVideo.videoUrl || 
              item.title === activeVideo.title
          );
          if (match && match.cloudinaryUrl) {
            setMediaUrl(match.cloudinaryUrl);
            console.log("[BufferPublisher] Found matching Cloudinary URL from history:", match.cloudinaryUrl);
            return;
          }
        }
      } catch (e) {
        console.warn(e);
      }

      if (activeVideo.videoUrl) {
        setMediaUrl(activeVideo.videoUrl);
      }
    }
  }, [activeVideo]);

  // Fetch associated Buffer profiles/accounts
  const fetchProfiles = async (tokenOverride?: string) => {
    const tokenToUse = tokenOverride || accessToken;
    if (!tokenToUse.trim()) {
      setProfilesError("يرجى إدخال رمز وصول (Access Token) صالح أولاً.");
      return;
    }
    setLoadingProfiles(true);
    setProfilesError(null);
    setProfiles([]);

    try {
      const res = await fetch("/api/buffer/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: tokenToUse.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "فشل جلب الحسابات من Buffer.");
      }

      setProfiles(data.profiles || []);
      // Auto-select all profiles by default
      if (data.profiles && data.profiles.length > 0) {
        setSelectedProfileIds(data.profiles.map((p: BufferProfile) => p.id));
      }
    } catch (err: any) {
      setProfilesError(err.message || "حدث خطأ أثناء تحميل الحسابات من Buffer.");
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Toggle selection of a profile
  const toggleProfile = (id: string) => {
    setSelectedProfileIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Quick hashtag inserter
  const addHashtag = (tag: string) => {
    if (!text.includes(tag)) {
      setText((prev) => {
        const trimmed = prev.trim();
        return trimmed ? `${trimmed} ${tag}` : tag;
      });
    }
  };

  // Main Publish Action
  const handlePublish = async () => {
    if (selectedProfileIds.length === 0) {
      setPublishError("يرجى اختيار حساب واحد على الأقل للنشر إليه.");
      return;
    }
    if (!text.trim()) {
      setPublishError("يرجى كتابة نص المنشور.");
      return;
    }

    setPublishing(true);
    setPublishError(null);
    setPublishSuccess(false);
    setPublishResult(null);

    // Prepare media block
    let media: any = null;
    if (postType === "video" && mediaUrl.trim()) {
      media = {
        video: mediaUrl.trim(),
        thumbnail: activeVideo?.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=300",
      };
    } else if (postType === "link" && linkUrl.trim()) {
      media = {
        link: linkUrl.trim(),
      };
    }

    try {
      const res = await fetch("/api/buffer/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessToken: accessToken.trim(),
          profileIds: selectedProfileIds,
          text: text.trim(),
          media,
          now: postImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال المنشور إلى Buffer.");
      }

      setPublishSuccess(true);
      setPublishResult(data.result);
      // Clean form on success
      if (postType !== "video") {
        setText("");
        setLinkUrl("");
      }
    } catch (err: any) {
      setPublishError(err.message || "حدث خطأ أثناء إرسال المنشور إلى Buffer.");
    } finally {
      setPublishing(false);
    }
  };

  const popularHashtags = ["#foryou", "#fyp", "#viral", "#trending", "#shorts", "#video", "#reels", "#explore"];

  // Helper to color-code and brand the social network badges
  const getServiceStyle = (service: string) => {
    const s = service.toLowerCase();
    if (s.includes("twitter") || s.includes("x")) {
      return { bg: "bg-slate-900", text: "text-white", border: "border-slate-800", label: "X / Twitter" };
    } else if (s.includes("facebook")) {
      return { bg: "bg-blue-600", text: "text-white", border: "border-blue-700", label: "Facebook" };
    } else if (s.includes("linkedin")) {
      return { bg: "bg-indigo-700", text: "text-white", border: "border-indigo-800", label: "LinkedIn" };
    } else if (s.includes("instagram")) {
      return { bg: "bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-600", text: "text-white", border: "border-pink-600", label: "Instagram" };
    } else if (s.includes("tiktok")) {
      return { bg: "bg-zinc-950", text: "text-teal-400", border: "border-zinc-850", label: "TikTok" };
    } else if (s.includes("pinterest")) {
      return { bg: "bg-rose-600", text: "text-white", border: "border-rose-700", label: "Pinterest" };
    }
    return { bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200", label: service.toUpperCase() };
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-6 text-right animate-fade-in" id="buffer-publisher-root">
      
      {/* Banner Header */}
      <div className="flex flex-col md:flex-row items-center md:items-start justify-between bg-indigo-950/5 border border-indigo-500/10 rounded-2xl p-5 gap-4" id="buffer-banner">
        <div className="space-y-1 text-center md:text-right">
          <h3 className="text-md font-bold text-slate-900 flex items-center gap-1.5 justify-center md:justify-end">
            <span>مدير النشر الموحد عبر Buffer 🌐</span>
            <Share2 className="w-5 h-5 text-indigo-600" />
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            انشر فيديوهاتك ومقاطعك المعدلة في جميع منصات التواصل الاجتماعي (X, LinkedIn, FB, TikTok, Instagram) دفعة واحدة باستخدام حساب Buffer الخاص بك.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-1.5 rounded-full font-bold transition-all flex items-center gap-1"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>كيف أحصل على الـ API؟</span>
          </button>
          <span className="bg-indigo-600 text-white text-[10px] px-3 py-1.5 rounded-full font-bold self-center">Buffer Publish API</span>
        </div>
      </div>

      {/* Guide Panel */}
      {showGuide && (
        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 text-xs text-amber-900 space-y-2 animate-fade-in" id="buffer-guide-panel">
          <h4 className="font-bold flex items-center gap-1 justify-end">
            <span>خطوات الحصول على رمز الوصول (Access Token) المجاني الخاص بك:</span>
            <Info className="w-4 h-4 text-amber-600" />
          </h4>
          <ol className="list-decimal list-inside space-y-1.5 leading-relaxed pr-2">
            <li>قم بتسجيل الدخول إلى حسابك على <a href="https://buffer.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">Buffer</a> واربط حساباتك الاجتماعية.</li>
            <li>اذهب إلى صفحة المطورين: <a href="https://publish.buffer.com/developers/apps" target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline font-semibold">Buffer Developer Portal</a>.</li>
            <li>اضغط على <strong>Create an Application</strong> واملأ البيانات باسم من اختيارك (مثال: My Publisher app).</li>
            <li>بعد الإنشاء مباشرة، ستجد قسماً بالأسفل يسمى <strong>Access Token</strong> يحتوي على مفتاحك الشخصي الطويل.</li>
            <li>انسخ الرمز والصقه هنا للربط المباشر والآمن.</li>
          </ol>
        </div>
      )}

      {/* Grid: Token configuration & accounts management */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* RIGHT COLUMN: API Access & Accounts List */}
        <div className="md:col-span-5 space-y-5">
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
              <span>ربط ومزامنة حساب Buffer</span>
              <Key className="w-4 h-4 text-indigo-600" />
            </h4>
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-500">اختر حساب Buffer مسجل</label>
              {loadingAccounts ? (
                <div className="flex items-center justify-center py-4 text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin" />
                </div>
              ) : linkedAccounts.length === 0 ? (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-amber-800 text-xs font-semibold flex items-center justify-between">
                  <span>لا توجد حسابات مسجلة. قم بإضافتها في الإعدادات.</span>
                </div>
              ) : (
                <div className="space-y-2">
                  <select
                    value={selectedAccountId}
                    onChange={(e) => {
                      const acc = linkedAccounts.find(a => a.id === e.target.value);
                      if (acc) selectAccount(acc);
                    }}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
                  >
                    {Array.isArray(linkedAccounts) && linkedAccounts.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Connected Profiles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              {accessToken.trim() && (
                <button
                  onClick={fetchProfiles}
                  disabled={loadingProfiles}
                  className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="تحديث قائمة القنوات"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingProfiles ? "animate-spin" : ""}`} />
                </button>
              )}
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <span>الحسابات الاجتماعية المتصلة ({profiles.length})</span>
                <Network className="w-4 h-4 text-indigo-500" />
              </h4>
            </div>

            {loadingProfiles ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-8 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mx-auto" />
                <p className="text-xs text-slate-500 font-bold">جاري جلب القنوات والحسابات المرتبطة...</p>
              </div>
            ) : profilesError ? (
              <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 space-y-1.5 text-right">
                <div className="flex items-center gap-1.5 justify-end text-rose-800 font-bold text-xs">
                  <span>فشل التحقق من الحسابات</span>
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                </div>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  {profilesError}
                </p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center space-y-1">
                <p className="text-xs text-slate-500 font-bold">لا توجد حسابات اجتماعية معروضة.</p>
                <p className="text-[10px] text-slate-400 leading-normal">
                  قم بوضع الـ Token واضغط حفظ لجلب حسابات فيسبوك، إكس، تيك توك ولينكد إن المرتبطة بـ Buffer.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-0.5" id="buffer-profiles-list">
                <div className="text-[10px] text-slate-400 font-semibold mb-1 text-left">
                  اختر المنصات التي تود النشر إليها:
                </div>
                {profiles.map((profile, index) => {
                  const isSelected = selectedProfileIds.includes(profile.id);
                  const style = getServiceStyle(profile.service);

                  return (
                    <div
                      key={`buffer-profile-${profile.id || ""}-${index}`}
                      onClick={() => toggleProfile(profile.id)}
                      className={`border rounded-2xl p-3 flex items-center justify-between cursor-pointer transition-all ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/25 shadow-xs"
                          : "border-slate-100 hover:border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center border ${
                          isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <div className="text-right">
                          <h5 className="text-xs font-bold text-slate-800">{profile.service_username}</h5>
                          <span className={`inline-block text-[9px] px-2 py-0.5 rounded-full font-bold mt-1 ${style.bg} ${style.text}`}>
                            {style.label}
                          </span>
                        </div>
                        <div className="relative">
                          <img
                            src={profile.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${profile.id}`}
                            alt={profile.service_username}
                            className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* LEFT COLUMN: Post Composer & Actions */}
        <div className="md:col-span-7 space-y-4">
          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1 justify-end">
            <span>صانع وناشر المنشورات الموحد</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </h4>

          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
            
            {/* Attachment Type Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">نوع المنشور والمرفقات</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPostType("text")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition-all border ${
                    postType === "text"
                      ? "bg-white border-indigo-600 text-indigo-700 shadow-sm"
                      : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  نص عادي فقط
                </button>
                <button
                  type="button"
                  onClick={() => setPostType("video")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition-all border ${
                    postType === "video"
                      ? "bg-white border-indigo-600 text-indigo-700 shadow-sm"
                      : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  مقطع فيديو مدمج
                </button>
                <button
                  type="button"
                  onClick={() => setPostType("link")}
                  className={`py-2 text-[11px] font-bold rounded-xl transition-all border ${
                    postType === "link"
                      ? "bg-white border-indigo-600 text-indigo-700 shadow-sm"
                      : "bg-slate-100 border-transparent text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  إضافة رابط تشعبي
                </button>
              </div>
            </div>

            {/* Dynamic fields based on Attachment Type */}
            {postType === "video" && (
              <div className="space-y-2 animate-fade-in bg-white p-3 border border-slate-200/60 rounded-xl">
                {activeVideo ? (
                  <div className="bg-emerald-50 border border-emerald-100/60 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-800">
                    <span className="font-bold truncate max-w-[200px] text-slate-700 font-sans" style={{ direction: "ltr" }}>
                      {activeVideo.title}
                    </span>
                    <div className="flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>فيديو المحرر جاهز للنشر 🎬</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-100 p-2.5 rounded-lg leading-normal">
                    💡 يرجى سحب وتعديل مقطع يوتيوب أولاً في تبويب "فيديو مفرد" ليتم تفعيله وتصديره تلقائياً هنا، أو ضع رابط فيديو MP4 مباشر أدناه.
                  </p>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 block">رابط الفيديو المباشر (Direct Video URL)</label>
                  <input
                    type="text"
                    placeholder="https://res.cloudinary.com/..."
                    value={mediaUrl}
                    onChange={(e) => setMediaUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left"
                    style={{ direction: "ltr" }}
                  />
                  {!mediaUrl.includes("cloudinary.com") && mediaUrl.trim() !== "" && (
                    <div className="text-[10px] text-amber-700 bg-amber-50/50 border border-amber-100 p-2 rounded-lg mt-1 leading-normal">
                      ⚠️ الرابط الحالي ليس رابط Cloudinary سحابي مباشر. يرجى العلم أن النشر في Buffer يتطلب ملف فيديو مباشر (.mp4) كـ Cloudinary، وإرسال رابط يوتيوب العادي سيفشل برسالة "zero content-length". يرجى استخدام الرفع لـ Cloudinary في تبويب "فيديو مفرد" أولاً.
                    </div>
                  )}
                </div>

                {cloudinaryHistory.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 space-y-2 text-right">
                    <label className="text-[11px] font-bold text-slate-600 block flex items-center justify-between">
                      <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full">جاهز للنشر السريع ⚡</span>
                      <span>اختر من الفيديوهات المرفوعة مؤخراً على Cloudinary:</span>
                    </label>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {cloudinaryHistory.slice(0, 5).map((item: any, index: number) => {
                        const isSelected = mediaUrl === item.cloudinaryUrl;
                        return (
                          <div
                            key={`buffer-cl-${item.id || ""}-${item.cloudinaryUrl || ""}-${index}`}
                            onClick={() => {
                              setMediaUrl(item.cloudinaryUrl);
                              if (!text.trim() || text.includes("شاهد المقطع الممتع") || text.includes("شاهد مقطع الفيديو الرائع") || text.includes("#fyp")) {
                                setText(generateSmartCaption(item.title));
                              }
                            }}
                            className={`p-2 rounded-xl transition-all flex items-center gap-3 border cursor-pointer hover:border-indigo-300 ${
                              isSelected
                                ? "bg-indigo-50/60 border-indigo-500 shadow-2xs"
                                : "bg-slate-50/80 border-slate-150 hover:bg-slate-100"
                            }`}
                          >
                            {/* Option status indicator */}
                            <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                            }`}>
                              {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                            </div>

                            {/* Title & Info */}
                            <div className="flex-1 text-right min-w-0 pr-1">
                              <h5 className="text-xs font-bold text-slate-800 truncate leading-tight">{item.title}</h5>
                              <p className="text-[9px] text-slate-400 font-mono mt-1 flex items-center justify-end gap-1">
                                <span className="truncate max-w-[150px]" style={{ direction: "ltr" }}>{item.cloudinaryUrl}</span>
                                <span>• URL:</span>
                              </p>
                            </div>

                            {/* Thumbnail */}
                            <div className="relative w-14 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-150">
                              <img
                                src={item.thumbnail || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100"}
                                alt={item.title}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {postType === "link" && (
              <div className="space-y-1.5 animate-fade-in bg-white p-3 border border-slate-200/60 rounded-xl">
                <label className="text-[10px] font-bold text-slate-500 block">الرابط المرفق (Hyperlink URL)</label>
                <input
                  type="text"
                  placeholder="https://example.com/blog-post"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-left"
                  style={{ direction: "ltr" }}
                />
              </div>
            )}

            {/* Post text area */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-slate-400 font-sans">{text.length} حرف</span>
                <label className="text-xs font-bold text-slate-700">محتوى المنشور (Caption)</label>
              </div>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="اكتب رسالتك لجميع الحسابات بذكاء هنا..."
                className="w-full h-28 p-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-100 rounded-xl text-xs font-semibold focus:outline-none placeholder:text-slate-400"
              />
              
              {/* Preset Tags */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {popularHashtags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => addHashtag(tag)}
                    className="px-2 py-1 text-[9px] bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 rounded-lg text-slate-600 transition-colors font-bold"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Delivery Toggles */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div className="flex gap-4">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={postImmediately}
                    onChange={() => setPostImmediately(true)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>نشر الآن (Publish Now)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-600 cursor-pointer">
                  <input
                    type="radio"
                    name="schedule"
                    checked={!postImmediately}
                    onChange={() => setPostImmediately(false)}
                    className="text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>إضافة لجدول Buffer (Queue)</span>
                </label>
              </div>
              <span className="text-[10px] text-slate-400 font-bold">جدولة الإرسال</span>
            </div>

            {/* Error Indicators */}
            {publishError && (
              <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs flex gap-2 items-start justify-end text-right">
                <div className="space-y-0.5">
                  <h5 className="font-bold">فشل النشر</h5>
                  <p className="text-[10px] text-rose-700 leading-relaxed">{publishError}</p>
                </div>
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              </div>
            )}

            {/* Success Indicators */}
            {publishSuccess && (
              <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-4 rounded-xl space-y-2 text-right animate-fade-in">
                <div className="flex gap-2 items-start justify-end">
                  <div className="space-y-0.5">
                    <h5 className="font-bold text-xs">تم إرسال المنشور إلى Buffer بنجاح! 🎉</h5>
                    <p className="text-[10px] text-emerald-700 leading-normal">
                      لقد نجح تصدير منشورك ومرفقاته إلى المنصات المحددة عبر Buffer. يمكنك مراجعة حالتها وتأكيدها من لوحة تحكم Buffer.
                    </p>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                </div>
                {publishResult && publishResult.updates && (
                  <div className="bg-white/60 p-2 rounded-lg border border-emerald-100/50 text-[10px] font-mono leading-relaxed text-left">
                    <div className="font-bold text-slate-700 text-right mb-1">بيانات الـ API المستلمة:</div>
                    <div>Updates Created: {publishResult.updates.length} items</div>
                    <div>Buffer ID: {publishResult.updates[0]?.id || "N/A"}</div>
                  </div>
                )}
              </div>
            )}

            {/* Big Action Button */}
            <div className="pt-3 border-t border-slate-200/60">
              <button
                type="button"
                onClick={handlePublish}
                disabled={publishing || selectedProfileIds.length === 0 || !accessToken.trim()}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-sm rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري إرسال المنشور والوسائط لـ Buffer...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>نشر المنشور الموحد في كل المنصات 🚀</span>
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
