import React, { useState, useEffect } from "react";
import { VideoInfo, VideoFormat, CloudinaryUploadResult } from "../types";
import { CloudUpload, Copy, Check, AlertTriangle, ExternalLink, Sparkles, CheckCircle2, Cloud, Info } from "lucide-react";
import { CustomSelect } from "./CustomSelect";

interface CloudinaryUploaderProps {
  videoInfo: VideoInfo;
  selectedFormat: VideoFormat | null;
  onUploadSuccess: (cloudinaryUrl: string) => void;
  currentUser?: any;
  userId?: string;
  onNavigateToAuth?: () => void;
}

export default function CloudinaryUploader({ 
  videoInfo, 
  selectedFormat, 
  onUploadSuccess,
  currentUser,
  userId,
  onNavigateToAuth
}: CloudinaryUploaderProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [uploadResult, setUploadResult] = useState<CloudinaryUploadResult | null>(null);
  const [applyBypass, setApplyBypass] = useState(false);
  const [hflip, setHflip] = useState(true);
  const [speedUp, setSpeedUp] = useState(true);
  const [colorBoost, setColorBoost] = useState(true);
  const [pitchShift, setPitchShift] = useState(true);

  const [enableLogo, setEnableLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPosition, setLogoPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left" | "center">("top_right");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [logoOpacity, setLogoOpacity] = useState(0.85);

  const activeUserId = currentUser?.id || userId;
  const [savedCloudName, setSavedCloudName] = useState<string>(localStorage.getItem("cloudinary_cloud_name") || "");

  useEffect(() => {
    const cloud = localStorage.getItem("cloudinary_cloud_name") || "";
    setSavedCloudName(cloud);
  }, [currentUser]);

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
          body: JSON.stringify({ 
            imageBase64: base64, 
            filename: file.name,
            userId: activeUserId,
            user_id: activeUserId
          })
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

  const handleUpload = async () => {
    setStatus("loading");
    setErrorMsg(null);
    setUploadResult(null);

    const directUrl = selectedFormat ? selectedFormat.url : videoInfo.bestVideoUrl;

    try {
      const response = await fetch("/api/upload-cloudinary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId: activeUserId,
          user_id: activeUserId,
          directUrl,
          title: videoInfo.title,
          videoUrl: videoInfo.videoUrl || "",
          formatId: selectedFormat ? selectedFormat.formatId : "best",
          cookiesText: "",
          avoidCopyright: applyBypass,
          hflip,
          speedUp,
          colorBoost,
          pitchShift,
          enableLogo,
          logoUrl,
          logoPosition,
          logoSize,
          logoOpacity
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل الرفع إلى كلاوديناري.");
      }

      setUploadResult(data);
      setStatus("success");
      onUploadSuccess(data.secureUrl);
    } catch (err: any) {
      console.error("Cloudinary upload failed:", err);
      setStatus("error");
      setErrorMsg(err.message || "حدث خطأ غير متوقع أثناء الرفع.");
    }
  };

  const copyToClipboard = async () => {
    if (!uploadResult) return;
    try {
      await navigator.clipboard.writeText(uploadResult.secureUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link", err);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-6 space-y-6" id="cloudinary-uploader-panel">
      <div className="flex items-center justify-between border-b border-slate-50 pb-3">
        <div>
          {savedCloudName ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 font-mono">
              <span>🟢</span>
              <span>السحابة: {savedCloudName}</span>
            </span>
          ) : (
            <button
              onClick={onNavigateToAuth}
              className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1 transition-all cursor-pointer"
            >
              <span>⚙️</span>
              <span>ربط حساب Cloudinary في "حسابي"</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="text-right">
            <h3 className="text-md font-bold text-slate-800">الرفع السحابي إلى Cloudinary</h3>
            <p className="text-[10px] text-slate-500">ارفع مقطع يوتيوب مباشرة إلى مساحتك السحابية</p>
          </div>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-500">
            <CloudUpload className="w-5 h-5" />
          </div>
        </div>
      </div>

      {status === "idle" && (
        <div className="space-y-4">
          <div className="bg-sky-50/50 rounded-xl p-4 border border-sky-100/50 flex gap-3">
            <Sparkles className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-sky-950">سرعة فائقة (URL-based Upload)</h4>
              <p className="text-xs text-sky-800 leading-relaxed">
                يتم نقل الفيديو مباشرة من سيرفرات يوتيوب إلى كلاوديناري دون استهلاك إنترنت جهازك أو سعة التحميل الخاصة به.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <span className="text-slate-500 font-medium">الجودة المحددة للرفع: </span>
              <span className="font-bold text-slate-800">
                {selectedFormat ? selectedFormat.formatNote : "أفضل جودة تلقائية"}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">امتداد الملف: </span>
              <span className="font-mono font-bold uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                {selectedFormat ? selectedFormat.ext : "MP4"}
              </span>
            </div>
          </div>

          {/* Smart Copyright Avoidance Options */}
          <div className="bg-amber-50/20 border border-amber-500/20 rounded-xl p-4 space-y-3 text-right">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-right">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-bold text-amber-950">تطبيق تفادي الكوبيرايت الذكي قبل الرفع</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer shrink-0">
                <input
                  type="checkbox"
                  checked={applyBypass}
                  onChange={(e) => setApplyBypass(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            
            {applyBypass && (
              <div className="grid grid-cols-2 gap-2 text-[10px] bg-white/60 p-2.5 rounded-lg border border-amber-500/10 text-slate-700 animate-fade-in text-right">
                <label className="flex items-center gap-1.5 cursor-pointer justify-end">
                  <span>انعكاس أفقي (Mirror)</span>
                  <input
                    type="checkbox"
                    checked={hflip}
                    onChange={(e) => setHflip(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer justify-end">
                  <span>تسريع خفيف (1.06x)</span>
                  <input
                    type="checkbox"
                    checked={speedUp}
                    onChange={(e) => setSpeedUp(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer justify-end">
                  <span>تعديل تباين/سطوع الألوان</span>
                  <input
                    type="checkbox"
                    checked={colorBoost}
                    onChange={(e) => setColorBoost(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer justify-end">
                  <span>تعديل نبرة الصوت (Pitch)</span>
                  <input
                    type="checkbox"
                    checked={pitchShift}
                    onChange={(e) => setPitchShift(e.target.checked)}
                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                  />
                </label>
              </div>
            )}

            {/* Logo & Watermark Overlay Option */}
            <div className="border-t border-amber-200/60 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-500">إضافة علامة مائية أو شعار قناتك على الفيديو</span>
                <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                  <span>إضافة لوغو / شعار على الفيديو 🖼️</span>
                  <input
                    type="checkbox"
                    checked={enableLogo}
                    onChange={(e) => setEnableLogo(e.target.checked)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                </label>
              </div>

              {enableLogo && (
                <div className="bg-white rounded-xl p-3 border border-sky-100 shadow-2xs space-y-3 text-right text-xs">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700 block">اختيار أو رفع الشعار (PNG transparent)</label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        placeholder="رابط الشعار المباشر (https://...)"
                        value={logoUrl}
                        onChange={(e) => setLogoUrl(e.target.value)}
                        className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
                        style={{ direction: "ltr" }}
                      />
                      <label className="px-3 py-1.5 bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 rounded-lg text-xs font-bold cursor-pointer transition-all">
                        <span>رفع من الجهاز</span>
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
                    <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      <img src={logoUrl} alt="Logo Preview" className="w-10 h-10 object-contain rounded bg-slate-200/50 p-1" />
                      <span className="text-[10px] text-emerald-600 font-bold">✓ تم إدراج الشعار</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">تحديد زاوية الوضع (الموقع)</label>
                      <CustomSelect
                        options={[
                          { value: "top_right", label: "↗️ أعلى اليمين (Top Right)" },
                          { value: "top_left", label: "↖️ أعلى اليسار (Top Left)" },
                          { value: "bottom_right", label: "↘️ أسفل اليمين (Bottom Right)" },
                          { value: "bottom_left", label: "↙️ أسفل اليسار (Bottom Left)" },
                          { value: "center", label: "🎯 المنتصف (Center)" },
                        ]}
                        value={logoPosition}
                        onChange={(val) => setLogoPosition(val as any)}
                        size="sm"
                        searchable={false}
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-1">حجم الشعار</label>
                      <CustomSelect
                        options={[
                          { value: "small", label: "صغير (120px)" },
                          { value: "medium", label: "متوسط (180px)" },
                          { value: "large", label: "كبير (260px)" },
                        ]}
                        value={logoSize}
                        onChange={(val) => setLogoSize(val as any)}
                        size="sm"
                        searchable={false}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpload}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <CloudUpload className="w-5 h-5" />
            <span>ابدأ الرفع السحابي الآن</span>
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="flex flex-col items-center justify-center py-8 px-4 space-y-4 text-center">
          <div className="relative w-16 h-16">
            <span className="absolute inset-0 rounded-full border-4 border-sky-100"></span>
            <span className="absolute inset-0 rounded-full border-4 border-t-sky-500 border-r-indigo-500 animate-spin"></span>
            <div className="absolute inset-0 flex items-center justify-center text-sky-500">
              <CloudUpload className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">جاري الرفع السحابي المباشر...</h4>
            <p className="text-xs text-slate-500 max-w-sm">
              نقوم حالياً بسحب تدفق الفيديو ونقله مباشرة إلى حساب Cloudinary الخاص بك. يرجى الانتظار، لا تغلق الصفحة.
            </p>
          </div>
        </div>
      )}

      {status === "success" && uploadResult && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-950">اكتمل الرفع بنجاح!</h4>
              <p className="text-xs text-emerald-800 leading-relaxed">
                تم حفظ مقطع الفيديو وتجهيزه على حساب كلاوديناري الخاص بك ويمكنك الآن استخدامه عبر الـ API.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              رابط كلاوديناري الآمن (Secure URL)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={uploadResult.secureUrl}
                className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-mono text-slate-600 block w-full focus:outline-none"
              />
              <button
                onClick={copyToClipboard}
                className="px-4 bg-slate-900 text-white hover:bg-slate-800 font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? "تم النسخ" : "نسخ الرابط"}</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-slate-600 font-mono">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Public ID</span>
              <span className="font-semibold text-slate-800 break-all">{uploadResult.publicId}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">الأبعاد</span>
              <span className="font-semibold text-slate-800">{uploadResult.width}x{uploadResult.height}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">النوع والامتداد</span>
              <span className="font-semibold text-slate-800 uppercase bg-sky-50 text-sky-600 px-1.5 py-0.5 rounded-md text-[10px] inline-block mt-0.5">
                {uploadResult.format}
              </span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={uploadResult.secureUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2.5 px-4 text-center rounded-xl font-bold text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>عرض الفيديو المرفوع</span>
            </a>

            <button
              onClick={() => setStatus("idle")}
              className="py-2.5 px-4 rounded-xl font-bold text-xs border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              رفع مرة أخرى
            </button>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="space-y-4 animate-fade-in">
          <div className="bg-rose-50 rounded-xl p-4 border border-rose-100 flex gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold text-rose-950">فشل عملية الرفع</h4>
              <p className="text-xs text-rose-800 leading-relaxed">
                {errorMsg || "تأكد من صحة إعدادات كلاوديناري ورابط البث المباشر."}
              </p>
              
              {errorMsg?.includes("credentials") && (
                <div className="bg-white/80 rounded-lg p-3 border border-rose-200/50 text-rose-900 space-y-1 mt-2 text-[11px]">
                  <p className="font-bold">خطوات حل المشكلة:</p>
                  <ol className="list-decimal list-inside space-y-0.5">
                    <li>افتح لوحة الإعدادات (Settings / Secrets) في AI Studio</li>
                    <li>أضف المتغيرات التالية:</li>
                    <ul className="list-disc list-inside mr-4 font-mono font-bold text-rose-800">
                      <li>CLOUDINARY_CLOUD_NAME</li>
                      <li>CLOUDINARY_API_KEY</li>
                      <li>CLOUDINARY_API_SECRET</li>
                    </ul>
                    <li>قم بإعادة تشغيل الخادم لحفظ التغييرات</li>
                  </ol>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleUpload}
            className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer"
          >
            إعادة محاولة الرفع السحابي
          </button>
        </div>
      )}
    </div>
  );
}
