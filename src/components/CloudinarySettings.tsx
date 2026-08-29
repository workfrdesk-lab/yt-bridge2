import React, { useState, useEffect } from "react";
import { 
  Cloud, 
  Key, 
  Shield, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  RefreshCw, 
  ExternalLink, 
  Trash2, 
  HelpCircle,
  Sparkles,
  Zap,
  Info,
  Check
} from "lucide-react";
import { supabase } from "../lib/supabase";

interface CloudinarySettingsProps {
  userId?: string;
  onSaved?: () => void;
}

export default function CloudinarySettings({ userId, onSaved }: CloudinarySettingsProps) {
  const [cloudName, setCloudName] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [apiSecret, setApiSecret] = useState<string>("");
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [showGuide, setShowGuide] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    cloudName?: string;
    plan?: string;
  } | null>(null);

  // Load initial settings
  useEffect(() => {
    // 1. Check localStorage first
    const localCloudName = localStorage.getItem("cloudinary_cloud_name") || "";
    const localApiKey = localStorage.getItem("cloudinary_api_key") || "";
    const localApiSecret = localStorage.getItem("cloudinary_api_secret") || "";

    if (localCloudName) setCloudName(localCloudName);
    if (localApiKey) setApiKey(localApiKey);
    if (localApiSecret) setApiSecret(localApiSecret);

    // 2. Fetch from DB if user is logged in
    if (userId) {
      setLoading(true);
      supabase.settings.get(userId)
        .then(({ data }) => {
          if (data) {
            if (data.cloudinary_cloud_name !== undefined) {
              setCloudName(data.cloudinary_cloud_name || "");
            }
            if (data.cloudinary_api_key !== undefined) {
              setApiKey(data.cloudinary_api_key || "");
            }
            if (data.cloudinary_api_secret !== undefined) {
              setApiSecret(data.cloudinary_api_secret || "");
            }
          }
        })
        .catch((err) => console.error("Error loading user cloudinary settings:", err))
        .finally(() => setLoading(false));
    }
  }, [userId]);

  const isConfigured = Boolean(cloudName.trim() && apiKey.trim() && apiSecret.trim());

  const handleTestConnection = async () => {
    if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      setTestResult({
        success: false,
        message: "يرجى تعبئة الحقول الثلاثة (Cloud Name, API Key, API Secret) أولاً لإجراء الفحص."
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/cloudinary/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          cloudName: cloudName.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({
          success: true,
          message: data.message || "تم الاتصال بنجاح وتأكيد صلاحية المفاتيح!",
          cloudName: data.cloudName || cloudName.trim(),
          plan: data.plan
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "فشل الاتصال. تأكد من صحة بيانات Cloud Name و API Key و API Secret."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `تعذر الاتصال بالخادم: ${err.message}`
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const trimmedCloudName = cloudName.trim();
      const trimmedApiKey = apiKey.trim();
      const trimmedApiSecret = apiSecret.trim();

      // Save to localStorage
      localStorage.setItem("cloudinary_cloud_name", trimmedCloudName);
      localStorage.setItem("cloudinary_api_key", trimmedApiKey);
      localStorage.setItem("cloudinary_api_secret", trimmedApiSecret);

      // Save to DB
      if (userId) {
        await supabase.settings.update(userId, {
          cloudinary_cloud_name: trimmedCloudName,
          cloudinary_api_key: trimmedApiKey,
          cloudinary_api_secret: trimmedApiSecret
        });
      }

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Error saving Cloudinary settings:", err);
      setTestResult({
        success: false,
        message: `فشل حفظ الإعدادات: ${err.message}`
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (window.confirm("هل أنت متأكد من رغبتك في حذف بيانات ربط Cloudinary من حسابك؟")) {
      setCloudName("");
      setApiKey("");
      setApiSecret("");
      setTestResult(null);
      
      localStorage.removeItem("cloudinary_cloud_name");
      localStorage.removeItem("cloudinary_api_key");
      localStorage.removeItem("cloudinary_api_secret");

      if (userId) {
        await supabase.settings.update(userId, {
          cloudinary_cloud_name: "",
          cloudinary_api_key: "",
          cloudinary_api_secret: ""
        });
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs text-right space-y-6 animate-fade-in" id="cloudinary-account-settings">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <span>🟢</span>
              <span>حسابك السحابي متصل</span>
            </span>
          ) : (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
              <span>⚪</span>
              <span>غير مرتبط بعد</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 justify-end">
          <div className="space-y-0.5">
            <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5 justify-end">
              <span>ربط حساب Cloudinary السحابي</span>
              <Cloud className="w-4 h-4 text-sky-500" />
            </h4>
            <p className="text-xs text-slate-500">
              اربط حسابك الخاص في Cloudinary ليتم رفع وحفظ فيديوهاتك وشعاراتك في مساحتك المنفصلة تلقائياً.
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
            <Cloud className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Connection Notice / Banner */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
        isConfigured 
          ? "bg-emerald-50/40 border-emerald-100/80 text-emerald-900" 
          : "bg-sky-50/40 border-sky-100/80 text-sky-900"
      }`}>
        {isConfigured ? (
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
        ) : (
          <Info className="w-5 h-5 text-sky-500 shrink-0 mt-0.5" />
        )}
        <div className="space-y-1">
          <p className="font-bold">
            {isConfigured 
              ? `يتم رفع جميع الفيديوهات الحالية والمجدولة إلى سحابة حسابك: (${cloudName})` 
              : "لماذا نقوم بربط حساب Cloudinary الخاص بك؟"}
          </p>
          <p className="text-[11px] opacity-90">
            {isConfigured
              ? "فيديوهاتك آمنة ومخزنة في مساحتك الخاصة مع سرعة تحميل واستضافة سحابية فورية لمنصات Buffer و Zernio و TikTok."
              : "بدلاً من مشاركة سحابة عامة، يتيح لك النظام ربط حساب Cloudinary مجاني خاص بك لرفع الفيديوهات بروابط سريعة ومباشرة دون أي قيود على مساحتك."}
          </p>
        </div>
      </div>

      {/* Form Fields */}
      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Cloud Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 justify-end">
              <span>اسم السحابة (Cloud Name)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: dyx1abc2"
                value={cloudName}
                onChange={(e) => setCloudName(e.target.value)}
                disabled={loading || saving}
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none transition-all text-left"
                style={{ direction: "ltr" }}
                required
              />
              <Cloud className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 justify-end">
              <span>مفتاح الـ API (API Key)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: 948271638491029"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                disabled={loading || saving}
                className="w-full pl-3 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none transition-all text-left"
                style={{ direction: "ltr" }}
                required
              />
              <Key className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* API Secret */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1 justify-end">
              <span>المفتاح السري (API Secret)</span>
              <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                placeholder="••••••••••••••••••••••••"
                value={apiSecret}
                onChange={(e) => setApiSecret(e.target.value)}
                disabled={loading || saving}
                className="w-full pl-9 pr-9 py-2.5 bg-slate-50 border border-slate-200 focus:border-sky-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none transition-all text-left"
                style={{ direction: "ltr" }}
                required
              />
              <Shield className="absolute top-1/2 right-3 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <button
                type="button"
                onClick={() => setShowSecret(!showSecret)}
                className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showSecret ? "إخفاء" : "إظهار"}
              >
                {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 animate-fade-in ${
            testResult.success 
              ? "bg-emerald-50 text-emerald-800 border-emerald-200" 
              : "bg-rose-50 text-rose-800 border-rose-200"
          }`}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{testResult.message}</span>
            </div>
            {testResult.success && testResult.plan && (
              <span className="px-2 py-0.5 bg-white text-emerald-700 rounded-md text-[10px] font-bold border border-emerald-200 font-sans">
                الباقة: {testResult.plan}
              </span>
            )}
          </div>
        )}

        {/* Save Success Notice */}
        {saveSuccess && (
          <div className="p-3.5 rounded-xl border bg-emerald-50 text-emerald-800 border-emerald-200 text-xs font-bold flex items-center gap-2 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>تم حفظ بيانات ربط Cloudinary بنجاح في حسابك! ستتم عمليات الرفع إلى حسابك مباشرة.</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-2 text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>{showGuide ? "إخفاء التعليمات" : "كيف أحصل على المفاتيح مجاناً؟"}</span>
            </button>

            {isConfigured && (
              <button
                type="button"
                onClick={handleDisconnect}
                className="px-3 py-2 text-rose-600 hover:bg-rose-50 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>فصل الحساب</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !cloudName.trim() || !apiKey.trim() || !apiSecret.trim()}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {testing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-600" />
                  <span>جاري فحص الاتصال...</span>
                </>
              ) : (
                <>
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>فحص واختبار الاتصال</span>
                </>
              )}
            </button>

            <button
              type="submit"
              disabled={saving || loading}
              className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:bg-sky-400 text-white font-bold text-xs rounded-xl transition-all shadow-xs hover:shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>حفظ الإعدادات في حسابي</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Quick Step-by-Step Guide Accordion */}
      {showGuide && (
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-xs animate-fade-in text-right">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2">
            <a
              href="https://cloudinary.com/users/register_free"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 text-[11px] underline"
            >
              <span>تسجيل حساب مجاني في Cloudinary</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <span className="font-bold text-slate-800">خطوات الحصول على بيانات الربط (مجاناً 100%):</span>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-slate-600 pr-1 leading-relaxed">
            <li>
              توجه إلى موقع <a href="https://cloudinary.com" target="_blank" rel="noopener noreferrer" className="text-sky-600 font-bold underline">Cloudinary.com</a> وسجل حساباً مجانياً (Free Tier يعطيك مساحة ضخمة مجانية شهرياً).
            </li>
            <li>
              بعد تسجيل الدخول، افتح لوحة التحكم الرئيسية (<span className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">Dashboard</span>).
            </li>
            <li>
              ستجد بطاقة في الأعلى باسم <span className="font-bold text-slate-800">Product Environment Credentials</span>.
            </li>
            <li>
              انسخ الحقول الثلاثة:
              <ul className="list-disc list-inside pr-4 pt-1 space-y-1 font-mono text-[11px] text-slate-700">
                <li>Cloud name ⬅️ الصقه في اسم السحابة</li>
                <li>API Key ⬅️ الصقه في مفتاح الـ API</li>
                <li>API Secret ⬅️ اضغط زر النسخ والصقه في المفتاح السري</li>
              </ul>
            </li>
            <li>
              اضغط على زر <span className="font-bold text-amber-600">"فحص واختبار الاتصال"</span> للتأكد، ثم اضغط <span className="font-bold text-sky-600">"حفظ الإعدادات"</span>.
            </li>
          </ol>
        </div>
      )}
    </div>
  );
}
