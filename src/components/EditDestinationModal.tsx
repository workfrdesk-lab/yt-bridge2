import React, { useState, useEffect, useMemo } from "react";
import { 
  X, Globe, Check, Loader2, AlertCircle, Sparkles, 
  Layers, CheckCircle2, ArrowRight, Share2, Tv, Video, RefreshCw
} from "lucide-react";

export interface PublishingProfile {
  id: string;
  platform: "zernio" | "buffer";
  service: string;
  formatted_service: string;
  service_username: string;
  avatar?: string;
  account_name?: string;
  account_id?: string;
}

export interface ScheduledCloneTarget {
  id: string;
  video_title?: string;
  video_id?: string;
  thumbnail_url?: string;
  channel_name?: string;
  target_platform?: string;
  target_profile_id?: string;
}

interface EditDestinationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (newTargetInfo: { platform: string; profileId: string; accountId?: string; updatedCount: number }) => void;
  targetItems: ScheduledCloneTarget[];
  channelName?: string;
  publishingProfiles: Record<string, PublishingProfile>;
  initialPlatform?: string;
  initialProfileId?: string;
}

export default function EditDestinationModal({
  isOpen,
  onClose,
  onSaved,
  targetItems,
  channelName,
  publishingProfiles: initialProfiles,
  initialPlatform,
  initialProfileId,
}: EditDestinationModalProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<"zernio" | "buffer">("zernio");
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [updateChannelDefault, setUpdateChannelDefault] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [publishingProfiles, setPublishingProfiles] = useState<Record<string, PublishingProfile>>(initialProfiles || {});

  // Fetch fresh profiles from server
  const fetchFreshProfiles = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/db/publishing_profiles?fresh=true");
      if (res.ok) {
        const data = await res.json();
        if (data.profiles) {
          setPublishingProfiles(data.profiles);
        }
      }
    } catch (e) {
      console.warn("Failed to fetch fresh profiles:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialProfiles && Object.keys(initialProfiles).length > 0) {
      setPublishingProfiles(initialProfiles);
    }
  }, [initialProfiles]);

  // Initialize selected values whenever modal opens or initial values change
  useEffect(() => {
    if (!isOpen) return;

    setError(null);
    setSearchTerm("");
    fetchFreshProfiles();

    let targetPlat: "zernio" | "buffer" = "zernio";
    if (initialPlatform === "buffer" || initialPlatform === "zernio") {
      targetPlat = initialPlatform;
    } else if (targetItems.length > 0 && targetItems[0].target_platform) {
      targetPlat = targetItems[0].target_platform === "buffer" ? "buffer" : "zernio";
    }
    setSelectedPlatform(targetPlat);

    if (initialProfileId) {
      setSelectedProfileId(initialProfileId);
    } else if (targetItems.length > 0 && targetItems[0].target_profile_id) {
      setSelectedProfileId(targetItems[0].target_profile_id);
    } else {
      // Pick first available profile for selected platform
      const firstProf = (Object.values(publishingProfiles) as PublishingProfile[]).find(p => p.platform === targetPlat);
      if (firstProf) {
        setSelectedProfileId(firstProf.id);
      }
    }
  }, [isOpen, initialPlatform, initialProfileId, targetItems]);

  // Ensure an active profile is selected when profiles list changes or platform switches
  useEffect(() => {
    if (!selectedProfileId || !publishingProfiles[selectedProfileId] || publishingProfiles[selectedProfileId].platform !== selectedPlatform) {
      const firstProf = (Object.values(publishingProfiles) as PublishingProfile[]).find(p => p.platform === selectedPlatform);
      if (firstProf) {
        setSelectedProfileId(firstProf.id);
      } else if (selectedPlatform === "zernio") {
        setSelectedProfileId("WEBHOOK_MODE");
      }
    }
  }, [selectedPlatform, publishingProfiles]);

  // When switching platforms, auto-select first profile of that platform if current is not in that platform
  const handlePlatformSwitch = (platform: "zernio" | "buffer") => {
    setSelectedPlatform(platform);
    const curr = publishingProfiles[selectedProfileId];
    if (!curr || curr.platform !== platform) {
      const match = (Object.values(publishingProfiles) as PublishingProfile[]).find(p => p.platform === platform);
      if (match) {
        setSelectedProfileId(match.id);
      } else {
        setSelectedProfileId(platform === "zernio" ? "WEBHOOK_MODE" : "");
      }
    }
  };

  // Filter profiles for active platform
  const availableProfiles = useMemo(() => {
    const list = (Object.values(publishingProfiles) as PublishingProfile[]).filter(p => p.platform === selectedPlatform);
    if (!searchTerm.trim()) return list;

    const term = searchTerm.toLowerCase().trim();
    return list.filter(p => 
      (p.service_username && p.service_username.toLowerCase().includes(term)) ||
      (p.formatted_service && p.formatted_service.toLowerCase().includes(term)) ||
      (p.account_name && p.account_name.toLowerCase().includes(term)) ||
      (p.service && p.service.toLowerCase().includes(term))
    );
  }, [publishingProfiles, selectedPlatform, searchTerm]);

  // Group available profiles by account name
  const groupedProfiles = useMemo(() => {
    const groups: Record<string, PublishingProfile[]> = {};
    availableProfiles.forEach(p => {
      const acc = p.account_name || (p.platform === "zernio" ? "حساب Zernio" : "حساب Buffer");
      if (!groups[acc]) groups[acc] = [];
      groups[acc].push(p);
    });
    return groups;
  }, [availableProfiles]);

  const totalZernioCount = useMemo(() => 
    (Object.values(publishingProfiles) as PublishingProfile[]).filter(p => p.platform === "zernio").length, 
    [publishingProfiles]
  );

  const totalBufferCount = useMemo(() => 
    (Object.values(publishingProfiles) as PublishingProfile[]).filter(p => p.platform === "buffer").length, 
    [publishingProfiles]
  );

  // Helper for platform icon and badge styling
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

  const handleSave = async () => {
    if (!selectedProfileId) {
      setError("يرجى اختيار حساب أو بروفايل النشر المطلوب.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const targetProf = publishingProfiles[selectedProfileId];
      const accountId = targetProf?.account_id;
      const ids = targetItems.map(item => item.id);

      const payload: any = {
        target_platform: selectedPlatform,
        target_profile_id: selectedProfileId,
        account_id: accountId,
        update_channel_default: updateChannelDefault && !!channelName,
        channel_name: channelName
      };

      if (ids.length > 0) {
        payload.ids = ids;
      }

      const res = await fetch("/api/scheduled-clones/update-destination", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "فشل تحديث وجهة النشر في قاعدة البيانات.");
      }

      onSaved({
        platform: selectedPlatform,
        profileId: selectedProfileId,
        accountId,
        updatedCount: data.updatedCount || ids.length
      });
      onClose();
    } catch (err: any) {
      console.error("Error saving destination:", err);
      setError(err.message || "حدث خطأ أثناء حفظ وجهة النشر.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  const isSingleItem = targetItems.length === 1 && !channelName;
  const targetChannelTitle = channelName || (targetItems.length > 0 ? targetItems[0].channel_name : null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs font-sans text-right animate-fade-in" dir="rtl" id="edit-destination-modal-overlay">
      <div 
        className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scale-up"
        onClick={(e) => e.stopPropagation()}
        id="edit-destination-modal-container"
      >
        
        {/* Modal Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/40 border-b border-slate-150 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-2xl shadow-xs">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">
                تعديل وجهة النشر والحساب المستهدف
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {channelName ? (
                  <span>تعديل وجهة النشر لجميع فيديوهات قناة: <strong className="text-indigo-600">{channelName}</strong></span>
                ) : isSingleItem ? (
                  <span>تعديل وجهة النشر للفيديو المحدد</span>
                ) : (
                  <span>تعديل وجهة النشر لـ <strong className="text-indigo-600">{targetItems.length}</strong> فيديو محدد</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={saving}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          
          {/* Target Preview Strip */}
          {targetItems.length > 0 && (
            <div className="bg-slate-50 border border-slate-200/70 rounded-2xl p-3.5 flex items-center gap-3.5">
              {isSingleItem && targetItems[0].thumbnail_url ? (
                <div className="w-16 aspect-video rounded-xl overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                  <img 
                    src={targetItems[0].thumbnail_url} 
                    alt={targetItems[0].video_title || "فيديو"} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Tv className="w-5 h-5" />
                </div>
              )}

              <div className="space-y-1 min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-800 line-clamp-1">
                  {isSingleItem ? targetItems[0].video_title : `${targetItems.length} فيديو قيد الانتظار أو الإيقاف`}
                </div>
                {targetChannelTitle && (
                  <div className="text-[11px] text-slate-500 font-medium">
                    القناة المصدر: <span className="font-bold text-slate-700">{targetChannelTitle}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Platform Tabs Switcher */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              1. اختر منصة / مزود الربط:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePlatformSwitch("zernio")}
                className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  selectedPlatform === "zernio"
                    ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">⚡</span>
                  <div className="text-right">
                    <div className="font-extrabold text-sm">منصة Zernio</div>
                    <div className="text-[10px] text-slate-500 font-medium">نشر تيك توك، فيسبوك ريلز، وغيرها</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-indigo-100/70 text-indigo-700">
                  {totalZernioCount} حساب
                </span>
              </button>

              <button
                type="button"
                onClick={() => handlePlatformSwitch("buffer")}
                className={`p-3.5 rounded-2xl border-2 font-bold text-xs flex items-center justify-between gap-2 transition-all cursor-pointer ${
                  selectedPlatform === "buffer"
                    ? "border-cyan-600 bg-cyan-50/50 text-cyan-950 shadow-xs"
                    : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">🌐</span>
                  <div className="text-right">
                    <div className="font-extrabold text-sm">منصة Buffer</div>
                    <div className="text-[10px] text-slate-500 font-medium">نشر متعدد للمنصات الاجتماعية</div>
                  </div>
                </div>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-cyan-100/70 text-cyan-700">
                  {totalBufferCount} حساب
                </span>
              </button>
            </div>
          </div>

          {/* Social Profiles / Accounts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="block text-xs font-bold text-slate-700">
                  2. اختر الحساب / الصفحة المستهدفة للنشر:
                </label>
                <button
                  type="button"
                  onClick={fetchFreshProfiles}
                  disabled={refreshing}
                  title="تحديث قائمة الحسابات والبروفايلات فوراً"
                  className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin text-indigo-600" : ""}`} />
                </button>
              </div>

              {availableProfiles.length > 3 && (
                <input
                  type="text"
                  placeholder="بحث في الحسابات..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-indigo-500 text-right w-44"
                />
              )}
            </div>

            {refreshing && availableProfiles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <RefreshCw className="w-7 h-7 text-indigo-600 animate-spin mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  جاري فحص وتحديث الحسابات المتصلة...
                </div>
              </div>
            ) : availableProfiles.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                <div className="text-xs font-bold text-slate-700">
                  لا توجد حسابات متصلة بهذه المنصة حالياً
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm mx-auto">
                  يمكنك الذهاب لتبويب {selectedPlatform === "zernio" ? "إعدادات Zernio" : "إعدادات Buffer"} وربط حساباتك أولاً.
                </p>
                <button
                  type="button"
                  onClick={fetchFreshProfiles}
                  className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:border-indigo-400 text-slate-700 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>إعادة المحاولة والتحديث</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {(Object.entries(groupedProfiles) as [string, PublishingProfile[]][]).map(([accName, profiles]) => (
                  <div key={`modal-acc-group-${accName}`} className="space-y-2">
                    <div className="text-[11px] font-extrabold text-slate-500 flex items-center gap-1.5 px-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                      <span>{accName}</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {profiles.map((profile) => {
                        const isSelected = selectedProfileId === profile.id;
                        return (
                          <div
                            key={`profile-card-${profile.id}`}
                            onClick={() => setSelectedProfileId(profile.id)}
                            className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-right ${
                              isSelected
                                ? "border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs"
                                : "border-slate-200 hover:border-indigo-200 hover:bg-slate-50/60 bg-white"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="relative shrink-0">
                                {profile.avatar ? (
                                  <img 
                                    src={profile.avatar} 
                                    alt={profile.service_username} 
                                    className="w-8 h-8 rounded-full object-cover border border-slate-200" 
                                    referrerPolicy="no-referrer"
                                  />
                                ) : (
                                  <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-sm">
                                    {getPlatformIcon(profile.service, profile.platform)}
                                  </div>
                                )}
                                <span className="absolute -bottom-1 -left-1 text-[10px]">
                                  {getPlatformIcon(profile.service, profile.platform)}
                                </span>
                              </div>

                              <div className="space-y-0.5 min-w-0">
                                <div className="text-xs font-bold text-slate-900 truncate">
                                  {profile.formatted_service}
                                </div>
                                <div className="text-[11px] text-slate-600 font-mono truncate" dir="ltr">
                                  @{profile.service_username}
                                </div>
                              </div>
                            </div>

                            <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                              isSelected 
                                ? "bg-indigo-600 text-white" 
                                : "border border-slate-300 bg-white"
                            }`}>
                              {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Scope and Channel options */}
          {channelName && (
            <div className="bg-indigo-50/40 border border-indigo-100 rounded-2xl p-3.5 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-right">
                <input
                  type="checkbox"
                  checked={updateChannelDefault}
                  onChange={(e) => setUpdateChannelDefault(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-indigo-600 focus:ring-indigo-500 rounded-md border-slate-300 cursor-pointer"
                />
                <div className="text-xs text-slate-700 leading-relaxed font-medium">
                  <strong>تعيين كوجهة افتراضية لقناة &quot;{channelName}&quot;</strong>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    سيتم استخدام هذه الوجهة تلقائياً لأي فيديوهات جديدة يتم استيرادها أو جدولتها مستقبلاً من هذه القناة.
                  </p>
                </div>
              </label>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-150 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
          >
            إلغاء
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedProfileId}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 disabled:text-slate-500 text-white text-xs font-extrabold rounded-2xl shadow-sm hover:shadow-md transition-all flex items-center gap-2 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>جاري حفظ وتحديث الوجهة...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>حفظ وتحديث وجهة النشر</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
