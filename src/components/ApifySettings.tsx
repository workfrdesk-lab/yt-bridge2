import React, { useState, useEffect, useCallback } from "react";
import { Key, CheckCircle, Loader2, ExternalLink, ShieldCheck, Cpu, RefreshCw, AlertCircle, Plus, Trash2, ArrowUp, ArrowDown, User, DollarSign, Zap } from "lucide-react";
import { supabase } from "../lib/supabase";

interface ApifySettingsProps {
  userId?: string;
  onSaved?: () => void;
}

interface ApifyAccount {
  token: string;
  username?: string;
  email?: string;
  plan?: string;
  monthlyUsageUsd?: number;
  maxMonthlyUsageUsd?: number;
  prepaidCreditUsd?: number;
  totalAllowanceUsd?: number;
  remainingBalanceUsd?: number;
  isDepleted?: boolean;
  valid?: boolean;
  error?: string;
  checking?: boolean;
}

export default function ApifySettings({ userId, onSaved }: ApifySettingsProps) {
  const [accounts, setAccounts] = useState<ApifyAccount[]>([]);
  const [apifyActorId, setApifyActorId] = useState<string>(() => localStorage.getItem("apify_actor_id") || "apify/facebook-posts-scraper");
  const [customActor, setCustomActor] = useState<string>("");

  const [apifyInstagramActorId, setApifyInstagramActorId] = useState<string>(() => localStorage.getItem("apify_instagram_actor_id") || "apify/instagram-reel-scraper");
  const [customInstagramActor, setCustomInstagramActor] = useState<string>("");
  
  const [newTokenInput, setNewTokenInput] = useState<string>("");
  const [addingToken, setAddingToken] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Fetch account status info from server for a list of tokens
  const refreshAccountsInfo = useCallback(async (tokensList: string[]) => {
    if (tokensList.length === 0) {
      setAccounts([]);
      return;
    }

    setFetchingInfo(true);
    try {
      const res = await fetch("/api/apify-accounts-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens: tokensList })
      });
      const data = await res.json();
      if (data && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
      } else {
        // Fallback: create basic objects
        setAccounts(tokensList.map((t) => ({ token: t, valid: true })));
      }
    } catch (err) {
      console.warn("Failed to fetch accounts info:", err);
      setAccounts(tokensList.map((t) => ({ token: t, valid: true })));
    } finally {
      setFetchingInfo(false);
    }
  }, []);

  useEffect(() => {
    // 1. Initial load from localStorage
    const savedTokensJson = localStorage.getItem("apify_tokens");
    let initialTokens: string[] = [];
    if (savedTokensJson) {
      try {
        const parsed = JSON.parse(savedTokensJson);
        if (Array.isArray(parsed)) initialTokens = parsed;
      } catch {
        initialTokens = savedTokensJson.split(/[\n,]/).map((t) => t.trim()).filter(Boolean);
      }
    }
    const single = localStorage.getItem("apify_token");
    if (initialTokens.length === 0 && single) {
      initialTokens = [single];
    }

    // 2. Fetch global_settings from PostgreSQL
    fetch("/api/global-apify")
      .then((res) => res.json())
      .then((data) => {
        let loadedTokens: string[] = [];
        if (data) {
          if (Array.isArray(data.apify_tokens) && data.apify_tokens.length > 0) {
            loadedTokens = data.apify_tokens;
          } else if (data.apify_token) {
            loadedTokens = [data.apify_token];
          }

          if (data.apify_actor_id) {
            setApifyActorId(data.apify_actor_id);
            localStorage.setItem("apify_actor_id", data.apify_actor_id);
          }
          if (data.apify_instagram_actor_id) {
            setApifyInstagramActorId(data.apify_instagram_actor_id);
            localStorage.setItem("apify_instagram_actor_id", data.apify_instagram_actor_id);
          }
        }

        const finalTokens = Array.from(new Set([...loadedTokens, ...initialTokens])).filter(Boolean);
        if (finalTokens.length > 0) {
          refreshAccountsInfo(finalTokens);
        }
      })
      .catch((err) => {
        console.warn("Failed to load global apify settings:", err);
        if (initialTokens.length > 0) {
          refreshAccountsInfo(initialTokens);
        }
      });

    // 3. User settings from PostgreSQL
    if (userId) {
      supabase.settings.get(userId).then(({ data }) => {
        if (data) {
          let userTokens: string[] = [];
          if ((data as any).apify_tokens) {
            try {
              const p = JSON.parse((data as any).apify_tokens);
              if (Array.isArray(p)) userTokens = p;
            } catch {
              userTokens = (data as any).apify_tokens.split(/[\n,]/).map((t: string) => t.trim()).filter(Boolean);
            }
          }
          if (userTokens.length === 0 && data.apify_token) {
            userTokens = [data.apify_token];
          }

          if (userTokens.length > 0) {
            setAccounts((prev) => {
              const existingTokens = prev.map((a) => a.token);
              const combined = Array.from(new Set([...existingTokens, ...userTokens])).filter(Boolean);
              if (combined.length !== existingTokens.length) {
                refreshAccountsInfo(combined);
              }
              return prev;
            });
          }
        }
      });
    }
  }, [userId, refreshAccountsInfo]);

  // Check individual account balance
  const checkSingleAccount = async (index: number) => {
    const acc = accounts[index];
    if (!acc || !acc.token) return;

    setAccounts((prev) =>
      prev.map((a, i) => (i === index ? { ...a, checking: true } : a))
    );

    try {
      const res = await fetch("/api/test-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apifyToken: acc.token })
      });
      const data = await res.json();
      if (data.success) {
        setAccounts((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  username: data.username,
                  email: data.email,
                  plan: data.plan,
                  monthlyUsageUsd: data.monthlyUsageUsd,
                  maxMonthlyUsageUsd: data.maxMonthlyUsageUsd,
                  remainingBalanceUsd: data.remainingBalanceUsd,
                  isDepleted: data.isDepleted,
                  valid: true,
                  error: undefined,
                  checking: false
                }
              : a
          )
        );
      } else {
        setAccounts((prev) =>
          prev.map((a, i) =>
            i === index
              ? {
                  ...a,
                  valid: false,
                  isDepleted: true,
                  error: data.error || "رمز غير صالح",
                  checking: false
                }
              : a
          )
        );
      }
    } catch (err: any) {
      setAccounts((prev) =>
        prev.map((a, i) =>
          i === index
            ? { ...a, checking: false, error: err.message }
            : a
        )
      );
    }
  };

  // Add new account
  const handleAddAccount = async () => {
    const tokenClean = newTokenInput.trim();
    if (!tokenClean) {
      setAddError("يرجى إدخال رمز Apify API Token أولاً.");
      return;
    }

    if (accounts.some((a) => a.token === tokenClean)) {
      setAddError("هذا الحساب مضاف بالفعل القائمة.");
      return;
    }

    setAddingToken(true);
    setAddError(null);

    try {
      const res = await fetch("/api/test-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apifyToken: tokenClean })
      });
      const data = await res.json();

      let newAcc: ApifyAccount = {
        token: tokenClean,
        valid: data.success === true
      };

      if (data.success) {
        newAcc = {
          ...newAcc,
          username: data.username,
          email: data.email,
          plan: data.plan,
          monthlyUsageUsd: data.monthlyUsageUsd,
          maxMonthlyUsageUsd: data.maxMonthlyUsageUsd,
          remainingBalanceUsd: data.remainingBalanceUsd,
          isDepleted: data.isDepleted,
          valid: true
        };
      } else {
        newAcc = {
          ...newAcc,
          username: "رمز غير صالح",
          valid: false,
          isDepleted: true,
          error: data.error || "رمز API غير صالح"
        };
      }

      const updated = [...accounts, newAcc];
      setAccounts(updated);
      setNewTokenInput("");

      // Auto save updated tokens list
      saveAccountsToDb(updated);
    } catch (err: any) {
      setAddError(`فشل فحص الحساب: ${err.message}`);
    } finally {
      setAddingToken(false);
    }
  };

  // Move account up or down
  const moveAccount = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= accounts.length) return;

    const newAccounts = [...accounts];
    const temp = newAccounts[index];
    newAccounts[index] = newAccounts[targetIndex];
    newAccounts[targetIndex] = temp;

    setAccounts(newAccounts);
    saveAccountsToDb(newAccounts);
  };

  // Remove account
  const removeAccount = (index: number) => {
    const updated = accounts.filter((_, i) => i !== index);
    setAccounts(updated);
    saveAccountsToDb(updated);
  };

  // Helper to persist accounts array to backend & localStorage
  const saveAccountsToDb = async (accountsList: ApifyAccount[]) => {
    setSaving(true);
    setSaveSuccess(false);

    const activeActor = apifyActorId === "custom" ? customActor.trim() : apifyActorId;
    const activeInstagramActor = apifyInstagramActorId === "custom" ? customInstagramActor.trim() : apifyInstagramActorId;
    const tokensArray = accountsList.map((a) => a.token.trim()).filter(Boolean);
    const primaryToken = tokensArray[0] || "";

    try {
      localStorage.setItem("apify_tokens", JSON.stringify(tokensArray));
      localStorage.setItem("apify_token", primaryToken);
      localStorage.setItem("apify_actor_id", activeActor);
      localStorage.setItem("apify_instagram_actor_id", activeInstagramActor);

      // Save to global_settings table in PostgreSQL
      await fetch("/api/global-apify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apify_token: primaryToken,
          apify_tokens: tokensArray,
          apify_actor_id: activeActor,
          apify_instagram_actor_id: activeInstagramActor
        })
      });

      // Save to user_settings table in PostgreSQL
      if (userId) {
        await supabase.settings.update(userId, {
          apify_token: primaryToken,
          apify_tokens: JSON.stringify(tokensArray),
          apify_actor_id: activeActor,
          apify_instagram_actor_id: activeInstagramActor
        } as any);
      }

      setSaveSuccess(true);
      if (onSaved) onSaved();
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      console.error("Failed to save Apify settings:", err);
    } finally {
      setSaving(false);
    }
  };

  const maskToken = (tok: string) => {
    if (!tok) return "";
    if (tok.length <= 14) return tok;
    return `${tok.substring(0, 10)}...${tok.substring(tok.length - 4)}`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-right space-y-6 animate-fade-in" id="apify-settings-card">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <Cpu className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-800">إدارة حسابات Apify API لجلب فيديوهات فيسبوك وانستقرام</h3>
            <p className="text-xs text-slate-500">إضافة عدة حسابات مع الانتقال التلقائي للحساب التالي عند نفاد الرصيد لمنع الحظر والتجاوز</p>
          </div>
        </div>

        <a
          href="https://console.apify.com/billing/integrations"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 hover:underline flex items-center gap-1.5 bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-100/80 transition-all self-start sm:self-auto"
        >
          <span>احصل على API Key من Apify</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      {/* Failover Feature Notice */}
      <div className="bg-indigo-50/80 border border-indigo-100 rounded-xl p-3.5 text-xs text-indigo-950 flex items-start gap-2.5 leading-relaxed">
        <Zap className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block mb-0.5 text-indigo-900">ميزة التنقل الذكي التلقائي عند نفاد الرصيد (Multi-Account Failover):</strong>
          عند ربط أكثر من حساب Apify، سينتقل النظام تلقائياً للحساب الذي يليه فور نفاد رصيد الحساب الحالي أو مواجهة خطأ حظر، مما يضمن استمرارية جلب الفيديوهات والريلز بدون انقطاع.
        </div>
      </div>

      {/* Add New Account Form */}
      <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-4 space-y-3">
        <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Plus className="w-4 h-4 text-indigo-600" />
          إضافة حساب Apify جديد:
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <input
              type="password"
              placeholder="أدخل Apify API Token الجديد (apify_api_xxxxxxxx...)"
              value={newTokenInput}
              onChange={(e) => {
                setNewTokenInput(e.target.value);
                if (addError) setAddError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddAccount();
              }}
              className="w-full p-2.5 bg-white border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-mono focus:outline-none transition-all placeholder:text-slate-400 text-left"
              style={{ direction: "ltr" }}
            />
          </div>
          <button
            type="button"
            onClick={handleAddAccount}
            disabled={addingToken || !newTokenInput.trim()}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
          >
            {addingToken ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            <span>فحص وإضافة الحساب</span>
          </button>
        </div>

        {addError && (
          <p className="text-xs text-rose-600 font-medium flex items-center gap-1 animate-fade-in">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{addError}</span>
          </p>
        )}
      </div>

      {/* Accounts List Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5 text-indigo-600" />
            <span>قائمة الحسابات المفعلة ({accounts.length}):</span>
          </h4>
          <button
            type="button"
            onClick={() => refreshAccountsInfo(Array.isArray(accounts) ? accounts.map((a) => a.token) : [])}
            disabled={fetchingInfo || !Array.isArray(accounts) || accounts.length === 0}
            className="text-xs font-semibold text-slate-600 hover:text-indigo-600 flex items-center gap-1 transition-all disabled:opacity-40 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${fetchingInfo ? "animate-spin text-indigo-600" : ""}`} />
            <span>تحديث أحياد كل الحسابات</span>
          </button>
        </div>

        {accounts.length === 0 ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center text-xs text-slate-400 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
            <p>لا توجد حسابات Apify مضافة حالياً. يرجى إضافة حساب واحد على الأقل أعلاه.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {Array.isArray(accounts) && accounts.map((acc, idx) => {
              const isPrimary = idx === 0;
              const isDepleted = acc.isDepleted === true;
              const isValid = acc.valid !== false;

              return (
                <div
                  key={`${acc.token}-${idx}`}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                    isPrimary
                      ? "bg-indigo-50/40 border-indigo-200 shadow-xs"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Account Metadata */}
                  <div className="flex items-start md:items-center gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${
                          isPrimary
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {isPrimary ? "#1 الرئيسي" : `#${idx + 1}`}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {/* Username & Plan */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{acc.username || "جاري جلب اسم المستخدم..."}</span>
                        </span>

                        {acc.email && (
                          <span className="text-[11px] text-slate-400 font-mono">({acc.email})</span>
                        )}

                        {acc.plan && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {acc.plan}
                          </span>
                        )}
                      </div>

                      {/* Token Preview */}
                      <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2">
                        <span>الرمز:</span>
                        <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold dir-ltr">
                          {maskToken(acc.token)}
                        </code>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Remaining Balance & Actions */}
                  <div className="flex items-center justify-between md:justify-end gap-3 border-t md:border-t-0 pt-2 md:pt-0 border-slate-100">
                    {/* Remaining Balance Badge */}
                    <div className="flex items-center gap-1.5">
                      {acc.checking ? (
                        <div className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-lg">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                          <span>فحص الرصيد...</span>
                        </div>
                      ) : !isValid ? (
                        <div className="flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>رمز غير صالح ❌</span>
                        </div>
                      ) : isDepleted ? (
                        <div className="flex flex-col items-end gap-0.5">
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                            <span>نفذ الرصيد المتاح ⚠️</span>
                          </div>
                          {acc.monthlyUsageUsd !== undefined && (
                            <span className="text-[10px] text-slate-500 dir-rtl">
                              تم استهلاك: ${acc.monthlyUsageUsd.toFixed(2)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                            <span>
                              الرصيد المتبقي: ${acc.remainingBalanceUsd !== undefined ? acc.remainingBalanceUsd.toFixed(2) : "0.00"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                            <span>المستهلك: ${acc.monthlyUsageUsd !== undefined ? acc.monthlyUsageUsd.toFixed(2) : "0.00"}</span>
                            <span>•</span>
                            <span>الحد الإجمالي: ${acc.totalAllowanceUsd !== undefined ? acc.totalAllowanceUsd.toFixed(2) : (acc.maxMonthlyUsageUsd || 5).toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Actions buttons */}
                    <div className="flex items-center gap-1">
                      {/* Check Balance */}
                      <button
                        type="button"
                        title="إعادة فحص رصيد هذا الحساب"
                        onClick={() => checkSingleAccount(idx)}
                        disabled={acc.checking}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${acc.checking ? "animate-spin text-indigo-600" : ""}`} />
                      </button>

                      {/* Move Up */}
                      <button
                        type="button"
                        title="تقديم الأولوية (أعلى)"
                        disabled={idx === 0}
                        onClick={() => moveAccount(idx, "up")}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        title="تأخير الأولوية (أسفل)"
                        disabled={idx === accounts.length - 1}
                        onClick={() => moveAccount(idx, "down")}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all disabled:opacity-30 cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        title="حذف هذا الحساب"
                        onClick={() => removeAccount(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Facebook Actor Selector */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4">
        <label className="block text-xs font-bold text-slate-700">مكشطة فيسبوك المفضلة (Apify Facebook Actor):</label>
        <select
          value={apifyActorId}
          onChange={(e) => {
            setApifyActorId(e.target.value);
            localStorage.setItem("apify_actor_id", e.target.value);
          }}
          className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-medium focus:outline-none transition-all"
        >
          <option value="apify/facebook-posts-scraper">apify/facebook-posts-scraper (منشورات وفيديوهات الصفحات - موصى به)</option>
          <option value="apify/facebook-reels-scraper">apify/facebook-reels-scraper (ريلز ومقاطع فيسبوك القصيرة)</option>
          <option value="apify/facebook-pages-scraper">apify/facebook-pages-scraper (صفحات ومحتوى فيسبوك)</option>
          <option value="custom">مكشطة مخصصة (Custom Actor ID)...</option>
        </select>
      </div>

      {apifyActorId === "custom" && (
        <div className="space-y-1 animate-fade-in">
          <label className="block text-xs font-bold text-slate-700">أدخل معرّف مكشطة فيسبوك المخصصة (Actor ID):</label>
          <input
            type="text"
            placeholder="username/actor-name"
            value={customActor}
            onChange={(e) => setCustomActor(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono focus:outline-none text-left"
            style={{ direction: "ltr" }}
          />
        </div>
      )}

      {/* Instagram Actor Selector */}
      <div className="space-y-1.5 border-t border-slate-100 pt-4">
        <label className="block text-xs font-bold text-slate-700">مكشطة انستقرام المفضلة (Apify Instagram Actor):</label>
        <select
          value={apifyInstagramActorId}
          onChange={(e) => {
            setApifyInstagramActorId(e.target.value);
            localStorage.setItem("apify_instagram_actor_id", e.target.value);
          }}
          className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs font-medium focus:outline-none transition-all"
        >
          <option value="apify/instagram-reel-scraper">apify/instagram-reel-scraper (ريلز ومقاطع انستقرام القصيرة - موصى به)</option>
          <option value="apify/instagram-scraper">apify/instagram-scraper (ريلز وبوستات انستقرام الشاملة)</option>
          <option value="apify/instagram-post-scraper">apify/instagram-post-scraper (منشورات وفيديوهات انستقرام)</option>
          <option value="apify/instagram-profile-scraper">apify/instagram-profile-scraper (بروفايل ومحتوى انستقرام الكامل)</option>
          <option value="custom">مكشطة مخصصة (Custom Actor ID)...</option>
        </select>
      </div>

      {apifyInstagramActorId === "custom" && (
        <div className="space-y-1 animate-fade-in">
          <label className="block text-xs font-bold text-slate-700">أدخل معرّف مكشطة انستقرام المخصصة (Actor ID):</label>
          <input
            type="text"
            placeholder="username/actor-name"
            value={customInstagramActor}
            onChange={(e) => setCustomInstagramActor(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl text-xs font-mono focus:outline-none text-left"
            style={{ direction: "ltr" }}
          />
        </div>
      )}

      {/* Save All Accounts Button */}
      <div className="pt-2 flex items-center justify-between border-t border-slate-100">
        <button
          type="button"
          onClick={() => saveAccountsToDb(accounts)}
          disabled={saving}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
          <span>حفظ جميع الحسابات والإعدادات</span>
        </button>

        {saveSuccess && (
          <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in">
            <CheckCircle className="w-4 h-4" />
            تم حفظ جميع الحسابات وقاعدة البيانات بنجاح!
          </span>
        )}
      </div>
    </div>
  );
}
