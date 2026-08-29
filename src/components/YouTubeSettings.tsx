import React, { useState, useEffect } from "react";
import { Youtube, Settings, CheckCircle2, Info, Loader2, RefreshCw, ShieldAlert, Globe, Trash2, ExternalLink } from "lucide-react";
import { supabase } from "../lib/supabase";

interface YouTubeSettingsProps {
  userId?: string;
  onSaved?: () => void;
}

export default function YouTubeSettings({ userId, onSaved }: YouTubeSettingsProps) {
  const [cookiesText, setCookiesText] = useState<string>("");
  const [proxyUrl, setProxyUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load initial settings
  useEffect(() => {
    // 1. LocalStorage
    const localCookies = localStorage.getItem("yt_cookies") || "";
    setCookiesText(localCookies);

    const localProxy = localStorage.getItem("yt_proxy") || "";
    setProxyUrl(localProxy);

    // 2. PostgreSQL DB
    if (userId) {
      supabase.settings.get(userId).then(({ data }) => {
        if (data) {
          if (data.yt_cookies !== undefined) {
            setCookiesText(data.yt_cookies || "");
            localStorage.setItem("yt_cookies", data.yt_cookies || "");
          }
          if (data.yt_proxy) {
            setProxyUrl(data.yt_proxy);
            localStorage.setItem("yt_proxy", data.yt_proxy);
          }
        }
      });
    } else {
      // Global fallback
      fetch("/api/global-proxy")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.yt_proxy) {
            setProxyUrl(data.yt_proxy);
          }
        })
        .catch((e) => console.warn("Failed to load global proxy:", e));
    }
  }, [userId]);

  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);

    try {
      localStorage.setItem("yt_cookies", cookiesText);
      localStorage.setItem("yt_proxy", proxyUrl);

      if (userId) {
        await supabase.settings.update(userId, {
          yt_cookies: cookiesText,
          yt_proxy: proxyUrl
        });
      }

      // Also update backend endpoint if available
      await fetch("/api/global-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yt_proxy: proxyUrl, yt_cookies: cookiesText })
      }).catch((e) => console.warn("Failed to update global proxy:", e));

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err) {
      console.error("Error saving YouTube settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleClearCookies = async () => {
    setCookiesText("");
    localStorage.removeItem("yt_cookies");
    if (userId) {
      await supabase.settings.update(userId, { yt_cookies: "" }).catch(() => {});
    }
  };

  const handleTestYouTube = async () => {
    setTestingConnection(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/social-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          platform: "youtube",
          query: "@MrBeast",
          cookiesText: cookiesText,
          proxyUrl: proxyUrl
        })
      });

      const data = await res.json();
      if (res.ok && data.videos && data.videos.length > 0) {
        setTestResult({
          success: true,
          message: `تم الاتصال بيوتيوب بنجاح! تم العثور على ${data.videos.length} فيديو لقناة MrBeast.`
        });
      } else {
        setTestResult({
          success: false,
          message: data.error || "فشل الاتصال بيوتيوب. يرجى التحقق من الكوكيز أو البروكسي."
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `خطأ في الاتصال: ${err.message || "فشل الاتصال بالسيرفر"}`
      });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-right space-y-6 animate-fade-in" id="youtube-settings-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0 border border-rose-100">
            <Youtube className="w-6 h-6 text-rose-600" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span>إعدادات يوتيوب وحل مشاكل الحظر (Anti-Bot)</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${cookiesText.trim() ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {cookiesText.trim() ? "الكوكيز مُفعّلة ✓" : "بدون كوكيز"}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              تكوين ملفات تعريف الارتباط Netscape Cookies والبروكسي لتجاوز حظر "Sign in to confirm you're not a bot" بسلاسة
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleTestYouTube}
          disabled={testingConnection}
          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl transition-all shadow-xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          {testingConnection ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري فحص الاتصال...</span>
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              <span>فحص الاتصال بيوتيوب ⚡</span>
            </>
          )}
        </button>
      </div>

      {testResult && (
        <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 animate-fade-in ${
          testResult.success
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
        <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Info className="w-4 h-4 text-rose-500" />
          <span>كيفية استخراج ملفات الكوكيز بصيغة Netscape:</span>
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          1. قم بتثبيت إضافة متصفح كروم الرسمية: 
          <a
            href="https://chromewebstore.google.com/detail/get-cookiestxt-locally/ccmkkfoeffgofandgihmnopehgkimplg"
            target="_blank"
            rel="noopener noreferrer"
            className="text-rose-600 hover:underline mx-1 font-bold inline-flex items-center gap-0.5"
            style={{ direction: "ltr" }}
          >
            "Get cookies.txt LOCALLY"
            <ExternalLink className="w-3 h-3" />
          </a>.
          <br />
          2. افتح موقع <a href="https://www.youtube.com" target="_blank" rel="noreferrer" className="text-rose-600 font-bold hover:underline">YouTube.com</a> وسجّل الدخول بحسابك.
          <br />
          3. انقر على إضافة الكوكيز ثم اضغط <strong>Export Cookies</strong> وانسخ النص بالكامل والمسه هنا.
        </p>
      </div>

      {/* Cookies Textarea */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-700">
            ملفات تعريف الارتباط الخاصة بيوتيوب (Netscape HTTP Cookie File):
          </label>
          {cookiesText.trim() && (
            <button
              type="button"
              onClick={handleClearCookies}
              className="text-xs text-rose-600 hover:underline flex items-center gap-1 cursor-pointer font-medium"
            >
              <Trash2 className="w-3 h-3" />
              <span>مسح الكوكيز</span>
            </button>
          )}
        </div>
        <textarea
          placeholder="# Netscape HTTP Cookie File&#10;# http://curl.haxx.se/rfc/cookie_spec.html&#10;.youtube.com TRUE / FALSE 1750000000 GPS 1..."
          value={cookiesText}
          onChange={(e) => setCookiesText(e.target.value)}
          className="w-full h-32 p-3 bg-slate-50 border border-slate-200 focus:border-rose-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none placeholder:text-slate-400 text-left transition-all"
          style={{ direction: "ltr" }}
        />
      </div>

      {/* Proxy Settings Input */}
      <div className="space-y-2">
        <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
          <Globe className="w-4 h-4 text-indigo-500" />
          <span>عنوان البروكسي الخاص بيوتيوب (اختياري Proxy URL):</span>
        </label>
        <input
          type="text"
          placeholder="http://username:password@ip:port أو socks5://..."
          value={proxyUrl}
          onChange={(e) => setProxyUrl(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none placeholder:text-slate-400 text-left transition-all"
          style={{ direction: "ltr" }}
        />
        <p className="text-[11px] text-slate-400">
          يمكنك إدخال رابط بروكسي واحد أو الاعتماد على قائمة البروكسي في مدير البروكسي أدناه.
        </p>
      </div>

      {/* Save Button Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-xs"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري الحفظ...</span>
            </>
          ) : saveSuccess ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>تم حفظ إعدادات يوتيوب!</span>
            </>
          ) : (
            <>
              <Settings className="w-4 h-4" />
              <span>حفظ إعدادات يوتيوب</span>
            </>
          )}
        </button>

        <span className="text-[11px] text-slate-400">
          تُحفظ الإعدادات في متصفحك وقاعدة البيانات تلقائياً
        </span>
      </div>
    </div>
  );
}
