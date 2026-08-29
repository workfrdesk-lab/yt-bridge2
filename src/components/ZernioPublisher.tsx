import React, { useState, useEffect } from "react";
import { 
  Share2, Key, UserCheck, RefreshCw, AlertCircle, Loader2, Sparkles, 
  CheckCircle2, Info, Settings, Check, ExternalLink, HelpCircle, Send, Globe
} from "lucide-react";
import { VideoInfo } from "../types";
import { supabase } from "../lib/supabase";
import { generateSmartCaption } from "../lib/captionUtils";

interface ZernioProfile {
  id: string;
  service: string;
  service_username: string;
  avatar: string;
  formatted_service: string;
  service_type: string;
}

interface ZernioPublisherProps {
  activeVideo: VideoInfo | null;
}

export default function ZernioPublisher({ activeVideo }: ZernioPublisherProps) {
  // Mode selection: API Key vs Webhook URL
  const [integrationMode, setIntegrationMode] = useState<"api" | "webhook">("webhook");

  // API Credentials
  const [apiKey, setApiKey] = useState("");

  // Webhook Credentials
  const [webhookUrl, setWebhookUrl] = useState("");

  const [currentUser, setCurrentUser] = useState<any>(null);

  // Connection & Profiles State
  const [profiles, setProfiles] = useState<ZernioProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [profilesError, setProfilesError] = useState<string | null>(null);
  const [selectedProfileIds, setSelectedProfileIds] = useState<string[]>([]);

  // Linked accounts from settings database
  const [linkedAccounts, setLinkedAccounts] = useState<any[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Post/Publish Form State
  const [text, setText] = useState("");
  const [postType, setPostType] = useState<"text" | "video">("video");
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
    if (acc.webhook_url && acc.api_key === "WEBHOOK_MODE") {
      setIntegrationMode("webhook");
      setWebhookUrl(acc.webhook_url);
      setApiKey("");
      setProfiles([]);
      setSelectedProfileIds([]);
    } else {
      setIntegrationMode("api");
      setApiKey(acc.api_key || "");
      setWebhookUrl("");
      // Fetch profiles immediately using the selected API Key
      fetchProfiles(acc.api_key || "");
    }
  };

  const loadLinkedAccounts = async (uid: string) => {
    setLoadingAccounts(true);
    try {
      const { data, error } = await supabase.from("zernio_accounts").select("*").eq("user_id", uid);
      if (error) throw error;
      const list = data || [];
      setLinkedAccounts(list);
      
      // Select the first account by default if available
      if (list.length > 0) {
        setSelectedAccountId(list[0].id);
        if (list[0].webhook_url && list[0].api_key === "WEBHOOK_MODE") {
          setIntegrationMode("webhook");
          setWebhookUrl(list[0].webhook_url);
          setApiKey("");
          setProfiles([]);
          setSelectedProfileIds([]);
        } else {
          setIntegrationMode("api");
          setApiKey(list[0].api_key || "");
          setWebhookUrl("");
          fetchProfiles(list[0].api_key || "");
        }
      } else {
        // If no accounts, clear states
        setApiKey("");
        setWebhookUrl("");
        setProfiles([]);
      }
    } catch (err) {
      console.error("Error loading linked Zernio accounts inside Publisher:", err);
    } finally {
      setLoadingAccounts(false);
    }
  };

  // Fetch profiles on mount or when token is changed/validated
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
      console.warn("Could not load Cloudinary history inside ZernioPublisher:", e);
    }
  }, [activeVideo]);

  // Autofill post from active video
  useEffect(() => {
    if (activeVideo) {
      setText(generateSmartCaption(activeVideo.title, "#Zernio"));
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
            console.log("[ZernioPublisher] Found matching Cloudinary URL from history:", match.cloudinaryUrl);
            return;
          }
        }
      } catch (e) {
        console.warn(e);
      }

      // Fallback
      if (activeVideo.videoUrl) {
        setMediaUrl(activeVideo.videoUrl);
      }
    }
  }, [activeVideo]);

  // Fetch available social channels linked to Zernio
  const fetchProfiles = async (keyOverride?: string) => {
    const keyToUse = keyOverride !== undefined ? keyOverride : apiKey;
    if (!keyToUse.trim()) return;
    setLoadingProfiles(true);
    setProfilesError(null);
    try {
      const res = await fetch("/api/zernio/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: keyToUse.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشل الاتصال بمنصة Zernio.");

      setProfiles(data.profiles || []);
      if (data.profiles && data.profiles.length > 0) {
        // Preselect the first profile by default
        setSelectedProfileIds([data.profiles[0].id]);
      }
    } catch (err: any) {
      setProfilesError(err.message || "حدث خطأ غير متوقع أثناء جلب حسابات Zernio.");
    } finally {
      setLoadingProfiles(false);
    }
  };

  // Main Publish Action
  const handlePublish = async () => {
    if (integrationMode === "api" && selectedProfileIds.length === 0) {
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
    }

    try {
      const res = await fetch("/api/zernio/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          webhookUrl: integrationMode === "webhook" ? webhookUrl.trim() : undefined,
          profileIds: integrationMode === "api" ? selectedProfileIds : undefined,
          text: text.trim(),
          media,
          now: postImmediately,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "فشل إرسال المنشور إلى Zernio.");
      }

      setPublishSuccess(true);
      setPublishResult(data.result);
      if (postType !== "video") {
        setText("");
      }
    } catch (err: any) {
      setPublishError(err.message || "حدث خطأ أثناء إرسال المنشور إلى Zernio.");
    } finally {
      setPublishing(false);
    }
  };

  const toggleProfile = (id: string) => {
    if (selectedProfileIds.includes(id)) {
      setSelectedProfileIds(selectedProfileIds.filter((pId) => pId !== id));
    } else {
      setSelectedProfileIds([...selectedProfileIds, id]);
    }
  };

  return (
    <div className="bg-slate-50 rounded-3xl p-6 md:p-8 border border-slate-200 shadow-md max-w-4xl mx-auto space-y-8 animate-fade-in" style={{ direction: "rtl" }}>
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-md">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <span>بوابة نشر Zernio.com</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">ذكي ومتكامل</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              انشر فيديوهاتك المعدلة والخالية من حقوق الطبع والنشر إلى منصات التواصل الاجتماعي عبر Zernio.com
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-xl transition-all text-xs font-bold text-slate-700 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>كيفية الاستخدام؟</span>
        </button>
      </div>

      {/* Guide details Panel */}
      {showGuide && (
        <div className="bg-slate-100 border border-slate-300/60 rounded-2xl p-5 text-slate-700 text-xs leading-relaxed space-y-3 animate-fade-in">
          <h4 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-600" />
            <span>دليل التكامل مع منصة Zernio:</span>
          </h4>
          <ol className="list-decimal list-inside space-y-2 pr-2">
            <li>توجه إلى حسابك في <a href="https://zernio.com" target="_blank" rel="noreferrer" className="text-indigo-600 font-bold underline inline-flex items-center gap-0.5">Zernio.com <ExternalLink className="w-2.5 h-2.5 inline" /></a>.</li>
            <li>اذهب إلى الإعدادات ثم المطورين للحصول على <strong>مفتاح API Key</strong> أو قم بإنشاء <strong>Webhook URL</strong> لاستقبال الفيديوهات.</li>
            <li>الصق المفتاح أو الرابط أدناه في تبويب الإعدادات ثم انقر على حفظ لمزامنة حسابات السوشيال ميديا الخاصة بك.</li>
            <li>عند اختيار فيديو، سيظهر المقطع تلقائياً في نافذة النشر السريع وجاهزاً لإعادة النشر الفوري.</li>
          </ol>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Setup Credentials */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Settings className="w-4 h-4 text-slate-500" />
            <h3 className="font-bold text-sm text-slate-800">حساب Zernio المختار للنشر</h3>
          </div>

          {loadingAccounts ? (
            <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
              <span className="text-[10px]">جاري تحميل حساباتك المربوطة...</span>
            </div>
          ) : linkedAccounts.length === 0 ? (
            <div className="p-5 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 space-y-3">
              <p>لا توجد حسابات Zernio مربوطة حالياً في الإعدادات.</p>
              <p className="text-[10px] text-slate-400 leading-relaxed">يرجى الذهاب إلى تبويب "إعدادات وحسابات Zernio" لربط وتوثيق حسابك الجديد.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-700">اختر الحساب المراد استخدامه للنشر:</label>
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto pr-1">
                {Array.isArray(linkedAccounts) && linkedAccounts.map((acc) => {
                  const isSelected = selectedAccountId === acc.id;
                  const isWebhook = acc.api_key === "WEBHOOK_MODE";
                  return (
                    <div
                      key={`linked-acc-pub-${acc.id}`}
                      onClick={() => {
                        setSelectedAccountId(acc.id);
                        selectAccount(acc);
                      }}
                      className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50/50 border-indigo-400 shadow-2xs"
                          : "bg-slate-50 border-slate-150 hover:bg-slate-100/75"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                          {isWebhook ? (
                            <Globe className="w-3.5 h-3.5 text-indigo-600" />
                          ) : (
                            <Key className="w-3.5 h-3.5 text-indigo-600" />
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{acc.name}</p>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded mt-1 inline-block ${
                            isWebhook ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                          }`}>
                            {isWebhook ? "Webhook" : "API Key"}
                          </span>
                        </div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                      }`}>
                        {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Social Profiles Selector (Visible in both Webhook and API modes when API key is present) */}
          {apiKey.trim() && (
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-700">
                  {integrationMode === "api" ? "قنوات النشر المتوفرة لتحديدها:" : "حسابات قنوات Zernio المرتبطة بك:"}
                </label>
                <button 
                  onClick={() => fetchProfiles()} 
                  disabled={loadingProfiles}
                  className="text-indigo-600 hover:text-indigo-800 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingProfiles ? "animate-spin" : ""}`} />
                  <span>تحديث</span>
                </button>
              </div>

              {loadingProfiles ? (
                <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                  <span className="text-[10px]">جاري جلب القنوات المتصلة...</span>
                </div>
              ) : profilesError ? (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700 text-[10px] leading-relaxed">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{profilesError}</span>
                </div>
              ) : profiles.length === 0 ? (
                <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-[10px] text-slate-400">
                  لا توجد حسابات مرتبطة بـ Zernio. يرجى التحقق من صحة مفتاح الـ API.
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {profiles.map((p, index) => {
                    const isSelected = selectedProfileIds.includes(p.id);
                    const canSelect = integrationMode === "api";
                    return (
                      <div
                        key={`zernio-profile-${p.id || ""}-${index}`}
                        onClick={() => canSelect && toggleProfile(p.id)}
                        className={`p-2.5 rounded-xl border transition-all flex items-center justify-between ${
                          canSelect 
                            ? "cursor-pointer" 
                            : "cursor-default opacity-85"
                        } ${
                          isSelected && canSelect
                            ? "bg-indigo-50/50 border-indigo-200" 
                            : "bg-slate-50/50 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img 
                            src={p.avatar} 
                            alt={p.service_username} 
                            className="w-7 h-7 rounded-full bg-slate-200 border border-slate-100 object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-800">{p.service_username}</p>
                            <span className="text-[9px] text-indigo-600 font-semibold">{p.formatted_service}</span>
                          </div>
                        </div>
                        {canSelect ? (
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                            isSelected ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 stroke-[3px]" />}
                          </div>
                        ) : (
                          <span className="text-[9px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">مربوط ✓</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column: Compose & Publish Form */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-800">إنشاء ونشر منشور جديد</h3>
              </div>
              {activeVideo && (
                <div className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full font-bold">
                  <Sparkles className="w-3 h-3 animate-pulse" />
                  <span>محمل من المقطع الحالي</span>
                </div>
              )}
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Media Preview Box if video is present */}
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

              {/* Text Area */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">نص المنشور / الوصف:</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={4}
                  placeholder="اكتب شيئاً جذاباً عن المقطع... استخدم الهاشتاقات المناسبة للترند!"
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 leading-relaxed text-right"
                />
              </div>

              {/* Media URL for video publishing */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700">رابط الفيديو المباشر (رابط Cloudinary المعدل):</label>
                  {cloudinaryHistory.length > 0 && (
                    <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">رابط الحفظ التلقائي متوفر</span>
                  )}
                </div>
                <input
                  type="url"
                  value={mediaUrl}
                  onChange={(e) => setMediaUrl(e.target.value)}
                  placeholder="https://res.cloudinary.com/..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500 font-mono"
                  style={{ direction: "ltr" }}
                />
                <p className="text-[10px] text-slate-500">
                  لمنع الحظر، ينصح برفع الفيديو أولاً إلى Cloudinary باستخدام خيارات "تعديل تفادي الكوبيرايت" وتمرير رابطه هنا.
                </p>

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
                            key={`zernio-cl-${item.id || ""}-${item.cloudinaryUrl || ""}-${index}`}
                            onClick={() => {
                              setMediaUrl(item.cloudinaryUrl);
                              if (!text.trim() || text.includes("شاهد المقطع الرائع") || text.includes("شاهد مقطع الفيديو الرائع") || text.includes("#fyp")) {
                                setText(generateSmartCaption(item.title, "#Zernio"));
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

              {/* Schedule options */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-700">توقيت النشر</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">اختر ما إذا كنت ترغب في النشر فوراً أو الإضافة لجدول النشر.</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPostImmediately(true)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                      postImmediately 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    نشر فوري الآن
                  </button>
                  <button
                    type="button"
                    onClick={() => setPostImmediately(false)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all border cursor-pointer ${
                      !postImmediately 
                        ? "bg-indigo-600 border-indigo-600 text-white" 
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    إضافة إلى قائمة الانتظار
                  </button>
                </div>
              </div>

              {/* Error & Success Messages */}
              {publishError && (
                <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2.5 text-rose-800 text-xs animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{publishError}</span>
                </div>
              )}

              {publishSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-2.5 text-emerald-800 text-xs animate-fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                  <div className="flex-1 text-right">
                    <p className="font-bold">تم إرسال المنشور ونشره بنجاح! 🎉</p>
                    <p className="text-[10px] text-emerald-600 mt-0.5">
                      {integrationMode === "webhook" 
                        ? "تم إرسال البيانات بنجاح إلى رابط ويب-هوك Zernio وبدء تشغيل الأتمتة المبرمجة."
                        : "تم إدراج المنشور ومزامنته بجدول النشر التابع لحساب Zernio بنجاح."}
                    </p>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handlePublish}
                disabled={publishing}
                className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white rounded-xl text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {publishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري النشر والمزامنة مع Zernio...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{integrationMode === "webhook" ? "إرسال إلى ويب-هوك Zernio" : "نشر المنشور عبر Zernio"}</span>
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
