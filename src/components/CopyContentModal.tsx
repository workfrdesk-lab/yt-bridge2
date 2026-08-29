import React, { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { CustomSelect } from "./CustomSelect";
import { 
  X, Calendar, Clock, ShieldAlert, Sparkles, Loader2, 
  HelpCircle, Settings, CheckSquare, Globe, ChevronDown 
} from "lucide-react";

interface CopyContentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedVideos: any[];
  onSuccess: () => void;
  currentUser: any;
}

export function CopyContentModal({ isOpen, onClose, selectedVideos, onSuccess, currentUser }: CopyContentModalProps) {
  const [platform, setPlatform] = useState<"buffer" | "zernio">("zernio");
  
  // Buffer state
  const [bufferAccounts, setBufferAccounts] = useState<any[]>([]);
  const [selectedBufferAccountId, setSelectedBufferAccountId] = useState("");
  const [loadingBufferAccounts, setLoadingBufferAccounts] = useState(false);
  const [bufferProfiles, setBufferProfiles] = useState<any[]>([]);
  const [bufferProfileId, setBufferProfileId] = useState("");
  const [bufferToken, setBufferToken] = useState("");
  const [loadingBuffer, setLoadingBuffer] = useState(false);

  // Single vs Multi account state
  const [accountScope, setAccountScope] = useState<"single" | "multiple">("single");
  const [selectedMultiBufferProfileIds, setSelectedMultiBufferProfileIds] = useState<string[]>([]);
  const [selectedMultiZernioProfileIds, setSelectedMultiZernioProfileIds] = useState<string[]>([]);

  // Zernio state
  const [zernioAccounts, setZernioAccounts] = useState<any[]>([]);
  const [selectedZernioAccountId, setSelectedZernioAccountId] = useState("");
  const [loadingZernioAccounts, setLoadingZernioAccounts] = useState(false);
  const [zernioProfiles, setZernioProfiles] = useState<any[]>([]);
  const [zernioProfileId, setZernioProfileId] = useState("");
  const [zernioKey, setZernioKey] = useState("");
  const [zernioMode, setZernioMode] = useState("webhook");
  const [zernioWebhook, setZernioWebhook] = useState("");
  const [loadingZernio, setLoadingZernio] = useState(false);

  // Bypass state
  const [processingMode, setProcessingMode] = useState<"bypass" | "raw">("bypass");
  const [hflip, setHflip] = useState(true);
  const [speedUp, setSpeedUp] = useState(true);
  const [colorBoost, setColorBoost] = useState(true);
  const [pitchShift, setPitchShift] = useState(false);

  // Hashtag state
  const [customHashtags, setCustomHashtags] = useState("");
  const [hashtagOption, setHashtagOption] = useState<"custom_or_default" | "custom_only" | "append" | "none">("custom_or_default");

  // Logo state
  const [enableLogo, setEnableLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPosition, setLogoPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left" | "center">("top_right");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [logoOpacity, setLogoOpacity] = useState(0.85);

  // Caption template state (MoviePy)
  const [enableCaption, setEnableCaption] = useState(false);
  const [captionTemplates, setCaptionTemplates] = useState<any[]>([]);
  const [selectedCaptionTemplateId, setSelectedCaptionTemplateId] = useState<string>("");
  const [captionTextSource, setCaptionTextSource] = useState<"title" | "template" | "custom">("title");
  const [captionCustomText, setCaptionCustomText] = useState<string>("");

  useEffect(() => {
    fetch("/api/caption-templates")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setCaptionTemplates(data);
          const def = data.find((t: any) => t.is_default) || data[0];
          setSelectedCaptionTemplateId(def.id);
        }
      })
      .catch((e) => console.warn("Failed loading caption templates in clone modal:", e));
  }, []);

  const handleLogoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      try {
        const res = await fetch("/api/upload-logo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageBase64: base64, filename: file.name })
        });
        const data = await res.json();
        if (data.url) {
          setLogoUrl(data.url);
          setEnableLogo(true);
        }
      } catch (err) {
        setLogoUrl(base64);
        setEnableLogo(true);
      }
    };
    reader.readAsDataURL(file);
  };

  // Scheduling state
  const [intervalMinutes, setIntervalMinutes] = useState(60); // Default 1 hour
  const [startTime, setStartTime] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !currentUser) return;

    // Set default start time to current local time formatted for datetime-local input
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setStartTime(now.toISOString().slice(0, 16));

    const loadSettings = async () => {
      // Nothing left in user settings required for clone modal immediately except if needed later
    };

    const loadBufferAccounts = async () => {
      setLoadingBufferAccounts(true);
      try {
        const { data, error } = await supabase.from("buffer_accounts").select("*").eq("user_id", currentUser.id);
        if (error) throw error;
        const list = data || [];
        setBufferAccounts(list);
        if (list.length > 0) {
          const acc = list[0];
          setSelectedBufferAccountId(acc.id);
          setBufferToken(acc.access_token || "");
          fetchBufferProfiles(acc.access_token || "");
        }
      } catch (err) {
        console.error("Error loading Buffer accounts in Clone modal:", err);
      } finally {
        setLoadingBufferAccounts(false);
      }
    };

    const loadZernioAccounts = async () => {
      setLoadingZernioAccounts(true);
      try {
        const { data, error } = await supabase.from("zernio_accounts").select("*").eq("user_id", currentUser.id);
        if (error) throw error;
        const list = data || [];
        setZernioAccounts(list);
        if (list.length > 0) {
          const acc = list[0];
          setSelectedZernioAccountId(acc.id);
          if (acc.webhook_url && acc.api_key === "WEBHOOK_MODE") {
            setZernioMode("webhook");
            setZernioWebhook(acc.webhook_url);
            setZernioKey("");
            setZernioProfileId("WEBHOOK_MODE");
          } else {
            setZernioMode("api");
            setZernioKey(acc.api_key || "");
            setZernioWebhook("");
            fetchZernioProfiles(acc.api_key || "");
          }
        }
      } catch (err) {
        console.error("Error loading Zernio accounts in Clone modal:", err);
      } finally {
        setLoadingZernioAccounts(false);
      }
    };

    loadSettings();
    loadZernioAccounts();
    loadBufferAccounts();
  }, [isOpen, currentUser]);

  const handleBufferAccountChange = (accId: string) => {
    setSelectedBufferAccountId(accId);
    const acc = bufferAccounts.find(a => a.id === accId);
    if (!acc) return;
    setBufferToken(acc.access_token || "");
    fetchBufferProfiles(acc.access_token || "");
  };

  const handleZernioAccountChange = (accId: string) => {
    setSelectedZernioAccountId(accId);
    const acc = zernioAccounts.find(a => a.id === accId);
    if (!acc) return;
    
    if (acc.webhook_url && acc.api_key === "WEBHOOK_MODE") {
      setZernioMode("webhook");
      setZernioWebhook(acc.webhook_url);
      setZernioKey("");
      setZernioProfileId("WEBHOOK_MODE");
      setZernioProfiles([]);
    } else {
      setZernioMode("api");
      setZernioKey(acc.api_key || "");
      setZernioWebhook("");
      fetchZernioProfiles(acc.api_key || "");
    }
  };

  const fetchBufferProfiles = async (token: string) => {
    setLoadingBuffer(true);
    try {
      const res = await fetch("/api/buffer/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token }),
      });
      if (!res.ok) throw new Error("فشل جلب حسابات Buffer.");
      const resData = await res.json();
      const profilesList = resData.profiles || [];
      const fetched = profilesList.map((p: any) => ({
        id: p.id || p._id,
        service_username: p.service_username || p.username || p.service || "حساب Buffer",
        formatted_service: p.formatted_service || p.formattedService || p.service || "Buffer Channel",
        avatar: p.avatar_https || p.avatar || p.profilePicture || "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=100"
      }));
      setBufferProfiles(fetched);
      if (fetched.length > 0) {
        setBufferProfileId(fetched[0].id);
        setSelectedMultiBufferProfileIds(fetched.map((p: any) => p.id));
      }
    } catch (err) {
      console.error("Error fetching Buffer profiles:", err);
    } finally {
      setLoadingBuffer(false);
    }
  };

  const fetchZernioProfiles = async (key: string) => {
    setLoadingZernio(true);
    try {
      const res = await fetch("/api/zernio/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key }),
      });
      if (!res.ok) throw new Error("فشل جلب قنوات Zernio.");
      const data = await res.json();
      const fetched = data.profiles || [];
      setZernioProfiles(fetched);
      if (fetched.length > 0) {
        setZernioProfileId(fetched[0].id);
        setSelectedMultiZernioProfileIds(fetched.map((p: any) => p.id));
      }
    } catch (err) {
      console.error("Error fetching Zernio profiles:", err);
    } finally {
      setLoadingZernio(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      // Validation
      let target_access_token = "";
      let target_profile_ids: string[] = [];

      if (platform === "buffer") {
        if (!bufferToken) {
          throw new Error("يرجى ربط حسابك في Buffer أولاً في الإعدادات.");
        }
        target_access_token = bufferToken;
        if (accountScope === "single") {
          if (!bufferProfileId) throw new Error("يرجى تحديد قناة النشر المستهدفة في Buffer.");
          target_profile_ids = [bufferProfileId];
        } else {
          if (selectedMultiBufferProfileIds.length === 0) throw new Error("يرجى تحديد حساب واحد على الأقل للنشر فيه.");
          target_profile_ids = selectedMultiBufferProfileIds;
        }
      } else {
        if (zernioMode === "webhook") {
          if (!zernioWebhook) {
            throw new Error("يرجى إدخال عنوان ويبهوك Zernio أولاً في الإعدادات.");
          }
          target_access_token = zernioWebhook;
          target_profile_ids = ["WEBHOOK_MODE"];
        } else {
          if (!zernioKey) {
            throw new Error("يرجى ربط حساب Zernio الخاص بك برمز الوصول أولاً.");
          }
          target_access_token = zernioKey;
          if (accountScope === "single") {
            if (!zernioProfileId) throw new Error("يرجى تحديد قناة النشر المستهدفة في Zernio.");
            target_profile_ids = [zernioProfileId];
          } else {
            if (selectedMultiZernioProfileIds.length === 0) throw new Error("يرجى تحديد حساب واحد على الأقل للنشر فيه.");
            target_profile_ids = selectedMultiZernioProfileIds;
          }
        }
      }

      if (!startTime) {
        throw new Error("يرجى تحديد وقت وتاريخ بدء النشر.");
      }

      const baseStartTime = new Date(startTime);
      const itemsToSchedule: any[] = [];

      selectedVideos.forEach((vid, videoIdx) => {
        const chName = vid.channel_name || vid.uploader || vid.channelTitle || vid.author || vid.channel || "قناة غير محددة";
        
        target_profile_ids.forEach((profId, profIdx) => {
          const totalOffsetIndex = videoIdx * target_profile_ids.length + profIdx;
          const schedTime = new Date(baseStartTime.getTime() + totalOffsetIndex * intervalMinutes * 60 * 1000);

          itemsToSchedule.push({
            video_id: vid.id,
            video_title: vid.title,
            video_url: vid.url,
            thumbnail_url: vid.thumbnail,
            target_platform: platform,
            target_profile_id: profId,
            target_access_token: target_access_token,
            channel_name: chName,
            bypass_settings: {
              processingMode,
              rawUpload: processingMode === "raw",
              hflip,
              speedUp,
              colorBoost,
              pitchShift,
              custom_hashtags: customHashtags,
              hashtag_option: hashtagOption,
              enableLogo,
              logoUrl,
              logoPosition,
              logoSize,
              logoOpacity,
              enableCaption,
              caption_template_id: enableCaption ? selectedCaptionTemplateId : null,
              caption_text_source: enableCaption ? captionTextSource : "title",
              caption_custom_text: (enableCaption && captionTextSource === "custom") ? captionCustomText : "",
              channel_name: chName
            },
            scheduled_time: schedTime.toISOString(),
            user_id: currentUser.id
          });
        });
      });

      console.log("Scheduling items:", itemsToSchedule.length, itemsToSchedule);

      // Changed from bulk insert to individual inserts for better reliability
      for (const item of itemsToSchedule) {
        const { error: indError } = await supabase.from("scheduled_clones").insert(item);
        if (indError) {
          console.error("Individual insert failed:", item.video_id, indError);
          throw indError;
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "حدث خطأ أثناء جدولة الفيديوهات.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4" style={{ direction: "rtl" }}>
      <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-500 animate-pulse" />
            <span className="font-bold text-sm text-slate-800">نسخ وجدولة المحتوى المحدّد بالتتابع</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6 text-right">
          
          {error && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3.5 rounded-xl text-xs font-semibold leading-relaxed">
              {error}
            </div>
          )}

          {/* Videos Summary */}
          <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-xl p-4 space-y-3">
            <h5 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-indigo-500" />
              <span>لقد حددت {selectedVideos.length} فيديو للجدولة:</span>
            </h5>
            <div className="max-h-24 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {selectedVideos.map((vid, i) => (
                <div key={vid.id} className="flex items-center gap-2 text-[11px] font-semibold text-slate-600 bg-white border border-slate-100 p-1.5 rounded-lg">
                  <span className="bg-indigo-100 text-indigo-700 w-4 h-4 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0">{i + 1}</span>
                  <p className="truncate w-full">{vid.title}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Publishing platform selection */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700">حدد منصة النشر التلقائي</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPlatform("zernio")}
                className={`py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  platform === "zernio"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>منصة Zernio ⚡</span>
              </button>

              <button
                type="button"
                onClick={() => setPlatform("buffer")}
                className={`py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  platform === "buffer"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs"
                    : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Globe className="w-4 h-4" />
                <span>منصة Buffer 🌐</span>
              </button>
            </div>
          </div>

          {/* Connected Profiles Dropdown */}
          <div className="space-y-2">
            {platform === "zernio" ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">حدد حساب Zernio</label>
                  {loadingZernioAccounts ? (
                    <div className="flex items-center gap-2 py-3 bg-slate-50 rounded-xl justify-center text-xs text-slate-500 font-semibold border border-slate-100">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري تحميل الحسابات...</span>
                    </div>
                  ) : zernioAccounts.length > 0 ? (
                    <CustomSelect
                      options={zernioAccounts.map((acc) => ({
                        value: acc.id,
                        label: acc.name,
                        badge: acc.api_key === "WEBHOOK_MODE" ? "Webhook" : "API",
                      }))}
                      value={selectedZernioAccountId}
                      onChange={handleZernioAccountChange}
                      placeholder="اختر حساب Zernio..."
                      variant="glass"
                    />
                  ) : (
                    <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">لم يتم العثور على حسابات Zernio مربوطة.</p>
                  )}
                </div>

                {zernioMode === "webhook" && selectedZernioAccountId ? (
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-150 text-[11px] text-slate-600 space-y-1">
                    <p className="font-bold text-slate-700">وضع الإرسال: الويبهوك التلقائي (Webhook Mode)</p>
                    <p>سيتم توجيه الفيديوهات بعد تعديلها للويبهوك المحفوظ في إعداداتك.</p>
                  </div>
                ) : selectedZernioAccountId ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">حدد قنوات النشر في Zernio</label>
                      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAccountScope("single")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            accountScope === "single"
                              ? "bg-white text-indigo-600 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          حساب واحد 👤
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountScope("multiple")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            accountScope === "multiple"
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          عدة حسابات 👥 ({selectedMultiZernioProfileIds.length})
                        </button>
                      </div>
                    </div>

                    {loadingZernio ? (
                      <div className="flex items-center gap-2 py-3 bg-slate-50 rounded-xl justify-center text-xs text-slate-500 font-semibold border border-slate-100">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري تحميل قنوات Zernio...</span>
                      </div>
                    ) : zernioProfiles.length > 0 ? (
                      accountScope === "single" ? (
                        <CustomSelect
                          options={zernioProfiles.map((p) => ({
                            value: p.id,
                            label: `${p.formatted_service.toUpperCase()} @${p.service_username}`,
                            badge: p.formatted_service,
                          }))}
                          value={zernioProfileId}
                          onChange={(val) => setZernioProfileId(val)}
                          placeholder="اختر قناة Zernio..."
                          variant="glass"
                        />
                      ) : (
                        <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-600">اختر الحسابات المراد النشر فيها:</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedMultiZernioProfileIds.length === zernioProfiles.length) {
                                  setSelectedMultiZernioProfileIds([]);
                                } else {
                                  setSelectedMultiZernioProfileIds(zernioProfiles.map(p => p.id));
                                }
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {selectedMultiZernioProfileIds.length === zernioProfiles.length ? "إلغاء الكل" : "تحديد الكل"}
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {zernioProfiles.map((p) => {
                              const isChecked = selectedMultiZernioProfileIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSelectedMultiZernioProfileIds(prev =>
                                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                        );
                                      }}
                                      className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                    />
                                    {p.avatar && (
                                      <img
                                        src={p.avatar}
                                        alt={p.service_username}
                                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <span className="truncate font-bold text-[11px] text-slate-800">
                                      {p.formatted_service} (@{p.service_username})
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                    {p.formatted_service}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">لم يتم العثور على قنوات متصلة بـ Zernio. تأكد من إعداد المفتاح بشكل صحيح.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">حدد حساب Buffer</label>
                  {loadingBufferAccounts ? (
                    <div className="flex items-center gap-2 py-3 bg-slate-50 rounded-xl justify-center text-xs text-slate-500 font-semibold border border-slate-100">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>جاري تحميل الحسابات...</span>
                    </div>
                  ) : bufferAccounts.length > 0 ? (
                    <CustomSelect
                      options={bufferAccounts.map((acc) => ({
                        value: acc.id,
                        label: acc.name,
                        badge: "API",
                      }))}
                      value={selectedBufferAccountId}
                      onChange={handleBufferAccountChange}
                      placeholder="اختر حساب Buffer..."
                      variant="glass"
                    />
                  ) : (
                    <p className="text-[11px] text-amber-600 font-semibold bg-amber-50 p-2 rounded-lg">لا توجد حسابات مسجلة لـ Buffer في إعداداتك.</p>
                  )}
                </div>

                {selectedBufferAccountId ? (
                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700">حدد قنوات النشر في Buffer</label>
                      <div className="inline-flex p-0.5 bg-slate-100 rounded-lg">
                        <button
                          type="button"
                          onClick={() => setAccountScope("single")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            accountScope === "single"
                              ? "bg-white text-indigo-600 shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          حساب واحد 👤
                        </button>
                        <button
                          type="button"
                          onClick={() => setAccountScope("multiple")}
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                            accountScope === "multiple"
                              ? "bg-indigo-600 text-white shadow-2xs"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          عدة حسابات 👥 ({selectedMultiBufferProfileIds.length})
                        </button>
                      </div>
                    </div>

                    {loadingBuffer ? (
                      <div className="flex items-center gap-2 py-3 bg-slate-50 rounded-xl justify-center text-xs text-slate-500 font-semibold border border-slate-100">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري تحميل حسابات Buffer...</span>
                      </div>
                    ) : bufferProfiles.length > 0 ? (
                      accountScope === "single" ? (
                        <CustomSelect
                          options={bufferProfiles.map((p) => ({
                            value: p.id,
                            label: `${p.formatted_service} @${p.service_username}`,
                            badge: p.formatted_service,
                          }))}
                          value={bufferProfileId}
                          onChange={(val) => setBufferProfileId(val)}
                          placeholder="اختر حساب Buffer..."
                          variant="glass"
                        />
                      ) : (
                        <div className="space-y-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between pb-1 border-b border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-600">اختر الحسابات المراد النشر فيها:</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (selectedMultiBufferProfileIds.length === bufferProfiles.length) {
                                  setSelectedMultiBufferProfileIds([]);
                                } else {
                                  setSelectedMultiBufferProfileIds(bufferProfiles.map(p => p.id));
                                }
                              }}
                              className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                            >
                              {selectedMultiBufferProfileIds.length === bufferProfiles.length ? "إلغاء الكل" : "تحديد الكل"}
                            </button>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                            {bufferProfiles.map((p) => {
                              const isChecked = selectedMultiBufferProfileIds.includes(p.id);
                              return (
                                <label
                                  key={p.id}
                                  className={`flex items-center justify-between p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isChecked
                                      ? "bg-indigo-50 border-indigo-200 text-indigo-950 font-semibold"
                                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100/70"
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSelectedMultiBufferProfileIds(prev =>
                                          prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                        );
                                      }}
                                      className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer shrink-0"
                                    />
                                    {p.avatar && (
                                      <img
                                        src={p.avatar}
                                        alt={p.service_username}
                                        className="w-5 h-5 rounded-full object-cover shrink-0 border border-slate-200"
                                        referrerPolicy="no-referrer"
                                      />
                                    )}
                                    <span className="truncate font-bold text-[11px] text-slate-800">
                                      {p.formatted_service} (@{p.service_username})
                                    </span>
                                  </div>
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                                    {p.formatted_service}
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )
                    ) : (
                      <p className="text-[11px] text-rose-600 font-semibold bg-rose-50 p-2 rounded-lg">لم يتم العثور على قنوات متصلة بـ Buffer. يرجى ربط حسابك في الإعدادات.</p>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* Anti-Copyright Filter Toggles & Raw Upload Choice */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Settings className="w-4 h-4 text-slate-500" />
              <span>طريقة معالجة الفيديو قبل الرفع ⚡</span>
            </h5>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProcessingMode("bypass")}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                  processingMode === "bypass"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🛡️</span>
                  <span className="text-xs font-bold">فلاتر تخطي الكوبيرايت</span>
                </div>
                <input type="radio" checked={processingMode === "bypass"} readOnly className="accent-indigo-500" />
              </button>

              <button
                type="button"
                onClick={() => setProcessingMode("raw")}
                className={`p-2.5 rounded-xl border text-right transition-all flex items-center justify-between cursor-pointer ${
                  processingMode === "raw"
                    ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>🚀</span>
                  <span className="text-xs font-bold">رفع فيديو خام مباشر</span>
                </div>
                <input type="radio" checked={processingMode === "raw"} readOnly className="accent-emerald-500" />
              </button>
            </div>

            {processingMode === "bypass" ? (
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hflip}
                    onChange={(e) => setHflip(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>تأثير المرآة المائل (Hflip)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={speedUp}
                    onChange={(e) => setSpeedUp(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>تسريع الفيديو (+6%)</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={colorBoost}
                    onChange={(e) => setColorBoost(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>تعزيز تباين الألوان</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={pitchShift}
                    onChange={(e) => setPitchShift(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>تعديل نبرة الصوت (Pitch)</span>
                </label>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-xl p-2.5 text-emerald-800 text-xs font-semibold">
                ✨ سيتم رفع مقاطع هذه النسخ خام فوراً بدقتها الأصلية دون تعديل إلى Cloudinary.
              </div>
            )}

            {/* Custom Hashtags Selection */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-2">
                <span className="text-sm">#️⃣</span>
                <span>قائمة الهاشتاغات المخصصة لهذه الحزمة</span>
              </h5>
              <div className="space-y-2">
                <select
                  value={hashtagOption}
                  onChange={(e) => setHashtagOption(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-bold text-slate-800"
                >
                  <option value="custom_or_default">✨ استخدام المخصصة (وإذا كانت فارغة تُستخدم الافتراضية)</option>
                  <option value="custom_only">🎯 استخدام الهاشتاغات المخصصة فقط</option>
                  <option value="append">➕ دمج المخصصة مع الافتراضية</option>
                  <option value="none">🚫 عدم إضافة أي هاشتاغ (عنوان الفيديو فقط)</option>
                </select>
                
                {hashtagOption !== "none" && (
                  <input
                    type="text"
                    value={customHashtags}
                    onChange={(e) => setCustomHashtags(e.target.value)}
                    placeholder="مثال: #fyp #viral #explore #فيديو"
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-lg text-xs font-mono font-medium text-slate-800 placeholder-slate-400"
                  />
                )}
              </div>
            </div>

            {/* Logo Watermark Option */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">طباعة اللوغو الخاص بك على كل الفيديوهات المجدولة</span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <span>إضافة لوغو / علامة مائية 🖼️</span>
                  <input
                    type="checkbox"
                    checked={enableLogo}
                    onChange={(e) => setEnableLogo(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {enableLogo && (
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 space-y-3 text-right text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">رابط الشعار أو رفعه من الجهاز (PNG)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="رابط اللوغو (https://...)"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono bg-white"
                        style={{ direction: "ltr" }}
                      />
                      <label className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-lg text-xs font-bold cursor-pointer transition-all shrink-0">
                        <span>رفع</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {logoUrl && (
                    <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-slate-200">
                      <img src={logoUrl} alt="Logo preview" className="w-8 h-8 object-contain rounded bg-slate-100 p-0.5" />
                      <span className="text-[10px] text-emerald-600 font-bold">✓ تم إدراج الشعار</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">الموقع / الزاوية</label>
                      <select
                        value={logoPosition}
                        onChange={(e) => setLogoPosition(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="top_right">↗️ أعلى اليمين (Top Right)</option>
                        <option value="top_left">↖️ أعلى اليسار (Top Left)</option>
                        <option value="bottom_right">↘️ أسفل اليمين (Bottom Right)</option>
                        <option value="bottom_left">↙️ أسفل اليسار (Bottom Left)</option>
                        <option value="center">🎯 المنتصف (Center)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">الحجم</label>
                      <select
                        value={logoSize}
                        onChange={(e) => setLogoSize(e.target.value as any)}
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="small">صغير (120px)</option>
                        <option value="medium">متوسط (180px)</option>
                        <option value="large">كبير (260px)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* MoviePy Caption Template Selection */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">كتابة كابشن احترافي عربي بواسطة MoviePy</span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <span>إضافة كابشن على الفيديو ✍️</span>
                  <input
                    type="checkbox"
                    checked={enableCaption}
                    onChange={(e) => setEnableCaption(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                </label>
              </div>

              {enableCaption && (
                <div className="bg-indigo-50/50 rounded-xl p-3 border border-indigo-100 space-y-3 text-right text-xs animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">اختر قالب الكابشن المجهز مسبقاً</label>
                    <select
                      value={selectedCaptionTemplateId}
                      onChange={(e) => setSelectedCaptionTemplateId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-indigo-500/20"
                    >
                      {captionTemplates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.font_family} - {t.font_size}pt - {t.position === "bottom" ? "أسفل" : t.position === "top" ? "أعلى" : "المنتصف"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Caption Text Source Selector */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-bold text-slate-700 block">
                      مصدر نص الكابشن الذي سيظهر في الفيديو:
                    </label>
                    <div className="grid grid-cols-1 gap-1.5 bg-white p-2 rounded-xl border border-indigo-100">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                        <input
                          type="radio"
                          name="cloneCaptionTextSource"
                          value="title"
                          checked={captionTextSource === "title"}
                          onChange={() => setCaptionTextSource("title")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>🎬 عنوان الفيديو الأصلي (Dynamic Title)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                        <input
                          type="radio"
                          name="cloneCaptionTextSource"
                          value="template"
                          checked={captionTextSource === "template"}
                          onChange={() => setCaptionTextSource("template")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>📝 الكابشن الافتراضي المجهز في القالب (Template Text)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50">
                        <input
                          type="radio"
                          name="cloneCaptionTextSource"
                          value="custom"
                          checked={captionTextSource === "custom"}
                          onChange={() => setCaptionTextSource("custom")}
                          className="w-4 h-4 text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span>✍️ كتابة كابشن مخصص ثابت لهذه الجدولة</span>
                      </label>
                    </div>

                    {captionTextSource === "custom" && (
                      <div className="pt-1">
                        <input
                          type="text"
                          value={captionCustomText}
                          onChange={(e) => setCaptionCustomText(e.target.value)}
                          placeholder="اكتب نص الكابشن المخصص هنا..."
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20"
                        />
                      </div>
                    )}
                  </div>

                  <p className="text-[10px] text-indigo-600 font-medium">
                    {captionTextSource === "title"
                      ? "💡 سيتم وضع عنوان كل فيديو ككابشن مدمج داخله بدقة واحترافية."
                      : captionTextSource === "template"
                      ? "💡 سيتم استخدام الكابشن الافتراضي المسجل في القالب."
                      : "💡 سيتم استخدام النص المخصص الذي كتبته أعلاه على كافة الفيديوهات المجدولة."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Sequential Scheduling Config */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-indigo-500" />
              <span>جدولة التتابع والتوقيت (Publish Interval)</span>
            </h5>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-500">معدل الفاصل الزمني (بين كل فيديو)</label>
                <div className="relative">
                  <select
                    value={intervalMinutes}
                    onChange={(e) => setIntervalMinutes(Number(e.target.value))}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none appearance-none"
                  >
                    <option value={15}>كل 15 دقيقة</option>
                    <option value={30}>كل 30 دقيقة</option>
                    <option value={60}>كل ساعة واحدة</option>
                    <option value={120}>كل ساعتين (2h)</option>
                    <option value={240}>كل 4 ساعات (4h)</option>
                    <option value={360}>كل 6 ساعات (6h)</option>
                    <option value={720}>كل 12 ساعة (12h)</option>
                    <option value={1440}>كل 24 ساعة (يومياً)</option>
                  </select>
                  <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-1.5 text-right">
                <label className="text-[11px] font-bold text-slate-500">موعد وتاريخ بدء نشر الفيديو الأول</label>
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none text-left"
                    style={{ direction: "ltr" }}
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none block sm:hidden" />
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
              <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-[10px] text-amber-800 leading-relaxed font-semibold">
                سيتم جدولة الفيديو الأول في <span className="font-bold underline">{startTime ? new Date(startTime).toLocaleString("ar-EG") : "البداية"}</span>، 
                ثم سيتم جدولة الفيديوهات التالية بفاصل <span className="font-bold underline">{intervalMinutes} دقيقة</span> بالتتابع تماماً!
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="submit"
              disabled={saving || selectedVideos.length === 0}
              className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري جدولة الفيديوهات...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>تأكيد وجدولة {selectedVideos.length} فيديو بالتتابع ⚡</span>
                </>
              )}
            </button>
            
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
            >
              إلغاء
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
