import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Key, AlertCircle, CheckCircle2, Loader2, 
  RefreshCw, Link as LinkIcon, Globe, Lock, ShieldAlert, Sparkles
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useConfirm } from "./ConfirmModal";

export default function ZernioAccounts({ userId }: { userId: string }) {
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [integrationType, setIntegrationType] = useState<"api" | "webhook">("api");
  
  // Loading & UX states
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);
  const [accountStatus, setAccountStatus] = useState<Record<string, { ok: boolean; message: string }>>({});

  useEffect(() => {
    if (userId) {
      loadAccounts();
    }
  }, [userId]);

  const loadAccounts = async () => {
    setLoadingList(true);
    setErrorMsg(null);
    try {
      const { data, error } = await supabase.from("zernio_accounts").select("*").eq("user_id", userId);
      if (error) throw error;
      setAccounts(data || []);
    } catch (err: any) {
      console.error("Error loading Zernio accounts:", err);
      setErrorMsg(err.message || "فشل جلب الحسابات من قاعدة البيانات.");
    } finally {
      setLoadingList(false);
    }
  };

  const validateApiKey = async (key: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/zernio/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: key.trim() }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "فشل الاتصال بمنصة Zernio.");
      }
      const data = await res.json();
      return Array.isArray(data.profiles) && data.profiles.length > 0;
    } catch (err: any) {
      console.warn("Zernio validation warning:", err.message);
      return false;
    }
  };

  const testSingleAccount = async (account: any) => {
    setTestingAccountId(account.id);
    try {
      if (account.webhook_url) {
        // Test webhook url format
        if (account.webhook_url.startsWith("http")) {
          setAccountStatus(prev => ({
            ...prev,
            [account.id]: { ok: true, message: "رابط Webhook صالح للتلقي" }
          }));
        } else {
          setAccountStatus(prev => ({
            ...prev,
            [account.id]: { ok: false, message: "رابط Webhook غير صالح" }
          }));
        }
      } else {
        // Test API Key
        const isValid = await validateApiKey(account.api_key);
        if (isValid) {
          setAccountStatus(prev => ({
            ...prev,
            [account.id]: { ok: true, message: "مفتاح API نشط ✓" }
          }));
        } else {
          setAccountStatus(prev => ({
            ...prev,
            [account.id]: { ok: false, message: "رمز API غير صالح أو غير مصرح به ✗" }
          }));
        }
      }
    } catch (e) {
      setAccountStatus(prev => ({
        ...prev,
        [account.id]: { ok: false, message: "فشل التحقق من الاتصال" }
      }));
    } finally {
      setTestingAccountId(null);
    }
  };

  const addAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedName = name.trim();
    const trimmedKey = apiKey.trim();
    const trimmedWebhook = webhookUrl.trim();

    if (!trimmedName) {
      setErrorMsg("يرجى إدخال اسم توضيحي للحساب.");
      return;
    }

    if (integrationType === "api" && !trimmedKey) {
      setErrorMsg("يرجى إدخال رمز واجهة برمجة التطبيقات (API Key) الخاص بـ Zernio.");
      return;
    }

    if (integrationType === "webhook" && !trimmedWebhook) {
      setErrorMsg("يرجى إدخال رابط الـ Webhook.");
      return;
    }

    setLoading(true);

    try {
      // 1. Validate the API Key first if in API mode
      if (integrationType === "api") {
        setValidating(true);
        const isValid = await validateApiKey(trimmedKey);
        setValidating(false);
        if (!isValid) {
          throw new Error("رمز API Key الذي أدخلته غير صالح أو لم يتمكن من جلب أي قنوات تواصل اجتماعي من Zernio. يرجى التأكد من الرمز.");
        }
      }

      // 2. Insert into self-hosted PostgreSQL database via proxy
      const payload = {
        id: `z_acc_${Date.now()}`,
        user_id: userId,
        name: trimmedName,
        api_key: integrationType === "api" ? trimmedKey : "WEBHOOK_MODE",
        webhook_url: integrationType === "webhook" ? trimmedWebhook : null,
      };

      const { error } = await supabase.from("zernio_accounts").insert(payload);
      
      if (error) {
        throw new Error(error.message || "حدث خطأ غير معروف أثناء حفظ الحساب في قاعدة البيانات.");
      }

      setSuccessMsg(`تم ربط حساب Zernio (${trimmedName}) بنجاح! 🎉`);
      setName("");
      setApiKey("");
      setWebhookUrl("");
      
      // Reload accounts list
      await loadAccounts();
    } catch (err: any) {
      console.error("Failed to add Zernio account:", err);
      setErrorMsg(err.message || "حدث خطأ أثناء محاولة إضافة الحساب.");
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const deleteAccount = async (id: string, accName: string) => {
    const isOk = await confirm({
      title: "إزالة حساب Zernio",
      message: `هل أنت متأكد من رغبتك في حذف حساب Zernio المربوط (${accName})؟`,
      confirmText: "إزالة الحساب",
      cancelText: "إلغاء",
      variant: "danger",
    });
    if (!isOk) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      const { error } = await supabase.from("zernio_accounts").delete().eq("id", id);
      if (error) throw error;
      setSuccessMsg(`تم إزالة الحساب (${accName}) بنجاح.`);
      loadAccounts();
    } catch (err: any) {
      console.error("Error deleting Zernio account:", err);
      setErrorMsg(err.message || "فشل إزالة الحساب من قاعدة البيانات.");
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm text-right space-y-6" id="zernio-accounts-section">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-slate-50 pb-4">
        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
          <span>أتمتة ذكية</span>
        </span>
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-slate-800">حسابات Zernio المربوطة والموثقة</h3>
          <Key className="w-5 h-5 text-indigo-500" />
        </div>
      </div>

      {/* Integration type toggle */}
      <div className="space-y-1.5">
        <label className="text-xs font-bold text-slate-700 block">طريقة الربط والاتصال</label>
        <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setIntegrationType("api");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              integrationType === "api"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>مفتاح الـ API Key 🔑</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIntegrationType("webhook");
              setErrorMsg(null);
            }}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              integrationType === "webhook"
                ? "bg-white text-indigo-600 shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>رابط Webhook تلقائي ⚡</span>
          </button>
        </div>
      </div>

      {/* Form Input fields */}
      <form onSubmit={addAccount} className="space-y-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">اسم توضيحي للحساب</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حساب Zernio الرئيسي، صفحة الإنستغرام"
              className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:bg-white bg-white rounded-xl text-xs font-semibold focus:outline-none"
              required
            />
          </div>

          {integrationType === "api" ? (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">Zernio API Key</label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="أدخل رمز الـ API Key لتسجيل الحساب"
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:bg-white bg-white rounded-xl text-xs font-semibold focus:outline-none font-sans text-left"
                style={{ direction: "ltr" }}
                required={integrationType === "api"}
              />
            </div>
          ) : (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-600">رابط Webhook</label>
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://zernio.com/api/v1/webhooks/..."
                className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:bg-white bg-white rounded-xl text-xs font-semibold focus:outline-none font-sans text-left"
                style={{ direction: "ltr" }}
                required={integrationType === "webhook"}
              />
            </div>
          )}
        </div>

        {/* Display feedback messages inside form */}
        {errorMsg && (
          <div className="bg-rose-50 border border-rose-100 text-rose-800 p-3 rounded-xl text-xs font-semibold flex items-start gap-2 animate-fade-in" style={{ direction: "rtl" }}>
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-bold block">فشل الإضافة:</span>
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 p-3 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in" style={{ direction: "rtl" }}>
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Action button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{validating ? "جاري التحقق من صحة المفتاح في Zernio..." : "جاري حفظ الحساب الذاتي..."}</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>حفظ وتوثيق حساب Zernio الجديد</span>
            </>
          )}
        </button>
      </form>

      {/* List of saved accounts */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700">قائمة حساباتك المسجلة ({accounts.length})</h4>
        
        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">جاري تحميل حسابات Zernio...</span>
          </div>
        ) : !Array.isArray(accounts) || accounts.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
            <span>لا توجد حسابات Zernio مربوطة حالياً. استخدم النموذج أعلاه لربط حسابك.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {accounts.map((acc) => {
              const isWebhook = acc.api_key === "WEBHOOK_MODE";
              const status = accountStatus[acc.id];
              return (
                <div 
                  key={acc.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 hover:bg-slate-100/80 border border-slate-100 p-3 rounded-xl transition-all gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      {isWebhook ? (
                        <Globe className="w-4 h-4 text-indigo-600" />
                      ) : (
                        <Key className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs">{acc.name}</span>
                        <span className={`px-1.5 py-0.5 rounded-md text-[8px] font-bold ${
                          isWebhook ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-indigo-50 text-indigo-700 border border-indigo-100"
                        }`}>
                          {isWebhook ? "Webhook" : "API Key"}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono select-all truncate max-w-xs" style={{ direction: "ltr" }}>
                        {isWebhook ? acc.webhook_url : `${acc.api_key.substring(0, 8)}••••••••••••`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-150 pt-2 sm:pt-0">
                    {/* Status check feedback */}
                    {status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        status.ok ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                      }`}>
                        {status.message}
                      </span>
                    )}

                    {/* Test connection button */}
                    <button
                      onClick={() => testSingleAccount(acc)}
                      disabled={testingAccountId !== null}
                      className="px-2 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-semibold text-slate-600 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
                    >
                      {testingAccountId === acc.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-slate-400" />
                      ) : (
                        <RefreshCw className="w-3 h-3 text-slate-400" />
                      )}
                      <span>فحص الاتصال</span>
                    </button>

                    {/* Delete button */}
                    <button 
                      onClick={() => deleteAccount(acc.id, acc.name)} 
                      className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      title="إزالة الحساب"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
