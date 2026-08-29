import React, { useState, useEffect } from "react";
import { 
  Plus, Trash2, Key, AlertCircle, CheckCircle2, Loader2, 
  RefreshCw, Globe, ShieldAlert
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { useConfirm } from "./ConfirmModal";

export default function BufferAccounts({ userId }: { userId: string }) {
  const { confirm } = useConfirm();
  const [accounts, setAccounts] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [accessToken, setAccessToken] = useState("");
  
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
      const { data, error } = await supabase.from("buffer_accounts").select("*").eq("user_id", userId);
      if (error) throw error;
      setAccounts(data || []);
    } catch (err: any) {
      console.error("Error loading Buffer accounts:", err);
      setErrorMsg(err.message || "فشل جلب الحسابات من قاعدة البيانات.");
    } finally {
      setLoadingList(false);
    }
  };

  const validateAccessToken = async (token: string): Promise<boolean> => {
    try {
      const res = await fetch("/api/buffer/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken: token.trim() }),
      });
      if (!res.ok) {
        throw new Error("فشل الاتصال بمنصة Buffer.");
      }
      const data = await res.json();
      return Array.isArray(data.profiles) && data.profiles.length > 0;
    } catch (err: any) {
      console.warn("Buffer validation warning:", err.message);
      return false;
    }
  };

  const testSingleAccount = async (account: any) => {
    setTestingAccountId(account.id);
    try {
      const isValid = await validateAccessToken(account.access_token);
      if (isValid) {
        setAccountStatus(prev => ({
          ...prev,
          [account.id]: { ok: true, message: "رمز الوصول نشط ✓" }
        }));
      } else {
        setAccountStatus(prev => ({
          ...prev,
          [account.id]: { ok: false, message: "رمز الوصول غير صالح ✗" }
        }));
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

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("الرجاء إدخال اسم توضيحي للحساب.");
      return;
    }
    if (!accessToken.trim()) {
      setErrorMsg("الرجاء إدخال رمز الوصول (Access Token).");
      return;
    }
    
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    
    try {
      setValidating(true);
      const isValid = await validateAccessToken(accessToken);
      if (!isValid) {
        throw new Error("رمز الوصول غير صالح أو أن الحساب لا يحتوي على صفحات/قنوات فعالة.");
      }
      
      const newAcc = {
        id: `buf_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        user_id: userId,
        name: name.trim(),
        access_token: accessToken.trim(),
      };
      
      const { error } = await supabase.from("buffer_accounts").insert([newAcc]);
      
      if (error) throw error;
      
      setSuccessMsg("تم إضافة وربط الحساب بنجاح!");
      setName("");
      setAccessToken("");
      
      setTimeout(() => setSuccessMsg(null), 3000);
      loadAccounts();
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء حفظ الحساب.");
    } finally {
      setLoading(false);
      setValidating(false);
    }
  };

  const deleteAccount = async (id: string, accName: string) => {
    if (await confirm(`هل أنت متأكد من حذف حساب "${accName}" من القائمة؟`)) {
      try {
        const { error } = await supabase.from("buffer_accounts").delete().eq("id", id);
        if (error) throw error;
        setAccounts(prev => prev.filter(a => a.id !== id));
      } catch (err: any) {
        alert("فشل الحذف: " + (err.message || "حدث خطأ غير معروف"));
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <Globe className="w-5 h-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-extrabold text-slate-800 text-sm">حسابات Buffer المتعددة</h3>
          <p className="text-[11px] text-slate-500 font-medium">أضف حسابات Buffer لنشر المحتوى في صفحاتك المختلفة</p>
        </div>
      </div>

      <form onSubmit={handleAddAccount} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-4">
        <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5 border-b border-slate-200 pb-2">
          <Plus className="w-4 h-4 text-indigo-500" />
          <span>إضافة حساب Buffer جديد</span>
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">اسم توضيحي للحساب</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثال: حساب Buffer الرئيسي"
              className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:bg-white bg-white rounded-xl text-xs font-semibold focus:outline-none"
              required
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-600">Buffer Access Token</label>
            <input
              type="password"
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
              placeholder="أدخل رمز الـ Access Token"
              className="w-full px-3 py-2 border border-slate-200 focus:border-indigo-500 focus:bg-white bg-white rounded-xl text-xs font-semibold focus:outline-none font-sans text-left"
              style={{ direction: "ltr" }}
              required
            />
          </div>
        </div>

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

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-xs"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{validating ? "جاري التحقق من صحة الرمز في Buffer..." : "جاري حفظ الحساب..."}</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>حفظ وتوثيق حساب Buffer الجديد</span>
            </>
          )}
        </button>
      </form>

      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-700">قائمة حساباتك المسجلة ({accounts.length})</h4>
        
        {loadingList ? (
          <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="text-xs">جاري تحميل حسابات Buffer...</span>
          </div>
        ) : !Array.isArray(accounts) || accounts.length === 0 ? (
          <div className="border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs">
            <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
            <span>لا توجد حسابات Buffer مربوطة حالياً. استخدم النموذج أعلاه لربط حسابك.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {accounts.map((acc) => {
              const status = accountStatus[acc.id];
              return (
                <div 
                  key={acc.id} 
                  className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-slate-50 hover:bg-slate-100/80 border border-slate-100 p-3 rounded-xl transition-all gap-3"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <Key className="w-4 h-4 text-indigo-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-slate-800 text-xs">{acc.name}</span>
                        <span className="px-1.5 py-0.5 rounded-md text-[8px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Access Token
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono select-all truncate max-w-xs" style={{ direction: "ltr" }}>
                        {acc.access_token.substring(0, 8)}••••••••••••
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-slate-150 pt-2 sm:pt-0">
                    {status && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg ${
                        status.ok ? "text-emerald-700 bg-emerald-50" : "text-rose-700 bg-rose-50"
                      }`}>
                        {status.message}
                      </span>
                    )}
                    
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
