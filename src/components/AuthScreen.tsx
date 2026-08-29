import React, { useState, useEffect } from "react";
import { 
  KeyRound, Mail, User, ShieldCheck, HelpCircle, Database, RefreshCw, 
  Loader2, Sparkles, Check, AlertCircle, LogOut, Users, Cloud
} from "lucide-react";
import { supabase } from "../lib/supabase";
import MembersList from "./MembersList";
import CloudinarySettings from "./CloudinarySettings";

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
  currentUser: any;
  onLogout: () => void;
}

export default function AuthScreen({ onAuthSuccess, currentUser, onLogout }: AuthScreenProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // PostgreSQL self-hosted status states
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; url: string }>({ configured: false, url: "" });
  const [checkingDb, setCheckingDb] = useState(true);

  const fetchDbStatus = () => {
    setCheckingDb(true);
    fetch("/api/db/status")
      .then(res => res.json())
      .then(data => {
        setDbStatus(data);
        setCheckingDb(false);
      })
      .catch(err => {
        console.error("Failed to check database status", err);
        setCheckingDb(false);
      });
  };

  useEffect(() => {
    fetchDbStatus();
  }, []);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrorMsg("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (isSignUp) {
        const res: any = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
          options: {
            data: {
              full_name: fullName.trim() || "صانع محتوى",
            }
          }
        });

        if (res.error) throw res.error;
        
        if (res.requiresApproval) {
          setSuccessMsg(res.message || "تم إنشاء الحساب بنجاح! حسابك بانتظار موافقة المسؤول لتفعيل إمكانية الدخول.");
          setIsSignUp(false);
          return;
        }

        setSuccessMsg("تم إنشاء الحساب وتسجيل الدخول بنجاح! 🎉");
        setTimeout(() => {
          onAuthSuccess(res.data?.user);
        }, 1200);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        });

        if (error) throw error;

        setSuccessMsg("تم تسجيل الدخول بنجاح. أهلاً بك مجدداً! 👋");
        setTimeout(() => {
          onAuthSuccess(data.user);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMsg(err.message || "حدث خطأ أثناء محاولة المصادقة.");
    } finally {
      setLoading(false);
    }
  };

  // If already logged in, show user profile details and database connection status
  if (currentUser) {
    const isAdmin = currentUser.email?.toLowerCase() === 'aamaanaah22@gmail.com' || currentUser.role === 'admin' || currentUser.isAdmin;

    return (
      <div className="space-y-6 max-w-2xl mx-auto animate-fade-in" id="auth-profile-card">
        {/* Profile Details Card */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs text-right space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <button
              onClick={onLogout}
              className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>تسجيل الخروج</span>
            </button>
            <div className="flex items-center gap-3">
              <div>
                <div className="flex items-center gap-1.5 justify-end">
                  {isAdmin && (
                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold rounded-md flex items-center gap-1">
                      <span>👑</span>
                      <span>مسؤول النظام</span>
                    </span>
                  )}
                  <h4 className="font-bold text-slate-800 text-sm">
                    {currentUser.user_metadata?.full_name || "عضو نشط"}
                  </h4>
                </div>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{currentUser.email}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold font-sans">
                {(currentUser.email || "U").charAt(0).toUpperCase()}
              </div>
            </div>
          </div>

          {/* Cloudinary Integration Section for each user */}
          <CloudinarySettings userId={currentUser.id} />

          {/* Database info panel */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4" id="postgres-status-panel">
            <div className="flex items-start justify-between gap-3">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                dbStatus.configured 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                  : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
              }`}>
                {dbStatus.configured ? "خادم PostgreSQL نشط ومتصل 🟢" : "فشل الاتصال بقاعدة البيانات 🔴"}
              </span>
              <div className="space-y-1">
                <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 justify-end">
                  <span>قاعدة البيانات المتصلة</span>
                  <Database className="w-4 h-4 text-indigo-600" />
                </h5>
                <p className="text-[10px] text-slate-500 leading-normal">
                  {dbStatus.configured 
                    ? "يتم الآن حفظ جميع البيانات وسجلات الأتمتة وحسابات المستخدمين بأمان داخل خادم PostgreSQL الذاتي الخاص بك بنجاح."
                    : "حدث خطأ أثناء محاولة الاتصال بقاعدة بيانات PostgreSQL. يرجى إدخال الرابط الصحيح في متغير البيئة DATABASE_URL."
                  }
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl p-3 border border-slate-100/80 text-[10px] font-mono text-slate-600 flex flex-col gap-2">
              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                <span className="text-slate-800 font-sans font-bold">خادم PostgreSQL</span>
                <span style={{ direction: "ltr" }}>{checkingDb ? "جاري الفحص..." : dbStatus.url}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 pb-1.5">
                <span className="text-slate-800 font-sans font-bold">الحالة الحالية</span>
                <span className={dbStatus.configured ? "text-emerald-600 font-sans font-bold" : "text-rose-600 font-sans font-bold"}>
                  {dbStatus.configured ? "متصل ومفعل ✓" : "غير متصل (خطأ)"}
                </span>
              </div>
              {!(dbStatus as any).configured && (dbStatus as any).error && (
                <div className="pt-1.5 text-rose-600 leading-relaxed font-sans text-right" style={{ direction: "rtl" }}>
                  <span className="font-bold">تفاصيل الخطأ:</span> {(dbStatus as any).error}
                </div>
              )}
            </div>
            
            <div className="flex justify-end pt-1">
              <button 
                onClick={fetchDbStatus} 
                disabled={checkingDb}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-[10px] font-bold text-slate-600 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${checkingDb ? "animate-spin" : ""}`} />
                <span>تحديث حالة الاتصال</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Members List section */}
        {isAdmin && <MembersList adminUserId={currentUser.id} />}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-md max-w-md mx-auto text-right space-y-6 animate-fade-in" id="auth-main-card">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mx-auto border border-indigo-100 shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          {isSignUp ? "إنشاء حساب جديد لمنشئي المحتوى" : "تسجيل الدخول للمنصة الذكية"}
        </h3>
        <p className="text-xs text-slate-500">
          {isSignUp 
            ? "ابدأ بتتبع قنوات اليوتيوب ونشر الفيديوهات المفلترة تلقائياً"
            : "سجل دخولك لإدارة أتمتة النشر وقواعد البيانات الذكية"
          }
        </p>
      </div>

      <form onSubmit={handleAuthSubmit} className="space-y-4">
        {isSignUp && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">الاسم بالكامل</label>
            <div className="relative">
              <input
                type="text"
                placeholder="مثال: أحمد صانع المحتوى"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none"
                required={isSignUp}
              />
              <User className="absolute top-1/2 right-3.5 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">البريد الإلكتروني</label>
          <div className="relative">
            <input
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none text-left font-sans"
              style={{ direction: "ltr" }}
              required
            />
            <Mail className="absolute top-1/2 right-3.5 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-700">كلمة المرور</label>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-semibold focus:outline-none text-left font-sans"
              style={{ direction: "ltr" }}
              required
            />
            <KeyRound className="absolute top-1/2 right-3.5 -translate-y-1/2 w-4 h-4 text-slate-400" />
          </div>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-150 text-rose-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-150 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-bold text-xs rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>جاري المعالجة...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isSignUp ? "تسجيل حساب جديد" : "تسجيل الدخول للمنصة"}</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setErrorMsg(null);
            setSuccessMsg(null);
          }}
          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors cursor-pointer"
        >
          {isSignUp ? "لديك حساب بالفعل؟ سجل دخولك" : "ليس لديك حساب؟ أنشئ حساباً جديداً مجاناً"}
        </button>
      </div>

      {/* Info indicator */}
      <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
        <Database className="w-3.5 h-3.5" />
        <span>
          {checkingDb ? "جاري فحص حالة قاعدة البيانات..." : dbStatus.configured ? "خادم PostgreSQL الذاتي متصل ومستقر" : "يتم التشغيل باستخدام المحاكاة المحلية المستقرة"}
        </span>
      </div>
    </div>
  );
}
