import React, { useState, useEffect } from "react";
import { Plus, Trash2, Globe, CheckCircle, Loader2, Activity, AlertCircle, Check } from "lucide-react";
import { supabase } from "../lib/supabase";

interface ProxyTestResult {
  loading: boolean;
  success?: boolean;
  ip?: string;
  country?: string;
  countryCode?: string;
  isp?: string;
  latencyMs?: number;
  error?: string;
}

export default function ProxyManager({ userId }: { userId: string }) {
  const [proxies, setProxies] = useState<string[]>([]);
  const [newProxy, setNewProxy] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, ProxyTestResult>>({});

  useEffect(() => {
    if (userId) {
      supabase.settings.get(userId).then(({ data }) => {
        if (data && data.yt_proxy) {
          try {
            const parsed = JSON.parse(data.yt_proxy);
            if (Array.isArray(parsed)) {
              setProxies(parsed);
            } else {
              setProxies([data.yt_proxy]);
            }
          } catch (e) {
            // It's a plain string of comma-separated or single proxy
            const list = data.yt_proxy.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
            setProxies(list);
          }
        }
      });
    } else {
      // Fallback for guest or general local storage
      const stored = localStorage.getItem("yt_proxy") || "";
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            setProxies(parsed);
          } else {
            setProxies([stored]);
          }
        } catch (e) {
          const list = stored.split(/[\n,]+/).map((p: string) => p.trim()).filter(Boolean);
          setProxies(list);
        }
      }
    }
  }, [userId]);

  const saveProxies = (updatedList: string[]) => {
    setProxies(updatedList);
    const serialized = JSON.stringify(updatedList);
    localStorage.setItem("yt_proxy", serialized);

    if (userId) {
      supabase.settings.update(userId, { yt_proxy: serialized })
        .then(() => {
          setSaveSuccess(true);
          setTimeout(() => setSaveSuccess(false), 3000);
        })
        .catch(err => {
          console.error("Failed to save proxies:", err);
        });
    } else {
      // Also save to global-proxy endpoint if guest
      fetch("/api/global-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ yt_proxy: serialized })
      })
      .then(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      })
      .catch(err => console.error("Failed to save global proxy:", err));
    }
  };

  const addProxy = () => {
    let formattedProxy = newProxy.trim();
    if (!formattedProxy) return;

    // Smart parsing for common proxy formats:
    // Format 1: IP:PORT:USER:PASS (commonly used by SOCKS5/HTTP providers)
    const colonParts = formattedProxy.split(":");
    if (colonParts.length === 4) {
      const [ip, port, user, pass] = colonParts;
      if (!isNaN(Number(port))) {
        // We'll standardise as socks5 protocol, which is typical for this format
        formattedProxy = `socks5://${user}:${pass}@${ip}:${port}`;
      }
    } else if (colonParts.length === 2 && !isNaN(Number(colonParts[1]))) {
      // Format 2: IP:PORT
      formattedProxy = `http://${formattedProxy}`;
    }

    if (formattedProxy && !proxies.includes(formattedProxy)) {
      const updated = [...proxies, formattedProxy];
      saveProxies(updated);
      setNewProxy("");
    }
  };

  const [maxLatency, setMaxLatency] = useState(1500);

  const checkAllProxies = async () => {
    const updatedProxies = [...proxies];
    const results = { ...testResults };
    
    for (const proxy of proxies) {
      results[proxy] = { loading: true };
      setTestResults({ ...results });

      try {
        const res = await fetch("/api/test-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proxyUrl: proxy })
        });
        const data = await res.json();
        
        if (data.success && data.latencyMs <= maxLatency) {
          results[proxy] = { loading: false, success: true, ip: data.ip, country: data.country, countryCode: data.countryCode, isp: data.isp, latencyMs: data.latencyMs };
        } else {
          results[proxy] = { loading: false, success: false, error: !data.success ? data.error : `الاستجابة بطيئة جداً (${data.latencyMs}ms)` };
          // Remove from list if check fails or latency exceeded
          const idx = updatedProxies.indexOf(proxy);
          if (idx > -1) updatedProxies.splice(idx, 1);
        }
      } catch (err: any) {
        results[proxy] = { loading: false, success: false, error: "خطأ في الشبكة" };
        const idx = updatedProxies.indexOf(proxy);
        if (idx > -1) updatedProxies.splice(idx, 1);
      }
    }
    
    setTestResults(results);
    saveProxies(updatedProxies);
    alert("تم الانتهاء من فحص البروكسيات وحذف التي لا تعمل.");
  };

  const importProxies = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const lines = text.split(/\r?\n/);
      const uniqueProxies = [...proxies];
      
      for (const line of lines) {
        let formattedProxy = line.trim();
        if (!formattedProxy) continue;

        // Same parsing as addProxy
        const colonParts = formattedProxy.split(":");
        if (colonParts.length === 4) {
          const [ip, port, user, pass] = colonParts;
          if (!isNaN(Number(port))) {
            formattedProxy = `socks5://${user}:${pass}@${ip}:${port}`;
          }
        } else if (colonParts.length === 2 && !isNaN(Number(colonParts[1]))) {
          formattedProxy = `http://${formattedProxy}`;
        }
        
        if (!uniqueProxies.includes(formattedProxy)) {
          uniqueProxies.push(formattedProxy);
        }
      }

      saveProxies(uniqueProxies);
      alert("تم استيراد البروكسيات بنجاح.");
    };
    reader.readAsText(file);
  };

  const removeProxy = (proxy: string) => {
    const updated = proxies.filter((p) => p !== proxy);
    saveProxies(updated);
    
    // Clean up test result if any
    if (testResults[proxy]) {
      const updatedResults = { ...testResults };
      delete updatedResults[proxy];
      setTestResults(updatedResults);
    }
  };

  const testProxy = async (proxy: string) => {
    setTestResults((prev) => ({
      ...prev,
      [proxy]: { loading: true }
    }));

    try {
      const res = await fetch("/api/test-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proxyUrl: proxy })
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [proxy]: {
          loading: false,
          success: data.success,
          ip: data.ip,
          country: data.country,
          countryCode: data.countryCode,
          isp: data.isp,
          latencyMs: data.latencyMs,
          error: data.error
        }
      }));
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [proxy]: {
          loading: false,
          success: false,
          error: "فشل إرسال طلب الفحص إلى الخادم. يرجى التحقق من اتصالك بالإنترنت."
        }
      }));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-indigo-500" />
          <h3 className="text-md font-bold text-slate-800">إدارة البروكسيات (Proxy)</h3>
        </div>
        {saveSuccess && (
          <span className="text-xs text-emerald-600 font-bold flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg">
            <CheckCircle className="w-3.5 h-3.5" /> تم الحفظ بنجاح!
          </span>
        )}
      </div>

      <p className="text-xs text-slate-500 mb-3 leading-relaxed">
        أضف خوادم بروكسي لتجاوز حظر يوتيوب لـ IP الخادم. يدعم صيغة <code className="bg-slate-50 px-1 py-0.5 rounded font-mono">http://username:password@ip:port</code> أو <code className="bg-slate-50 px-1 py-0.5 rounded font-mono">socks5://username:password@ip:port</code>.
        <br />
        <span className="text-indigo-600 font-semibold mt-1 block">💡 يمكنك لصق صيغة شركات البروكسي مباشرة <code className="bg-indigo-50 px-1 py-0.5 rounded font-mono">IP:PORT:USER:PASS</code> وسيقوم النظام بتحويلها تلقائياً!</span>
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newProxy}
          onChange={(e) => setNewProxy(e.target.value)}
          placeholder="http://user:pass@host:port"
          className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder:text-slate-400 font-mono text-left text-indigo-600 focus:outline-hidden focus:border-indigo-400"
          style={{ direction: "ltr" }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              addProxy();
            }
          }}
        />
        <button
          onClick={addProxy}
          className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 flex items-center gap-1 cursor-pointer shrink-0 transition-all hover:scale-[1.02]"
        >
          <Plus className="w-3.5 h-3.5" /> إضافة
        </button>
        <label className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 flex items-center gap-1 cursor-pointer shrink-0 transition-all hover:scale-[1.02]">
          <input type="file" className="hidden" accept=".txt" onChange={importProxies} />
          <Globe className="w-3.5 h-3.5" /> استيراد .txt
        </label>
      </div>

      <div className="flex gap-2 mb-4 items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
        <span className="text-xs font-bold text-slate-600">زمن الاستجابة الأقصى (ms):</span>
        <input
          type="number"
          value={maxLatency}
          onChange={(e) => setMaxLatency(Number(e.target.value))}
          className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-mono"
        />
        <button
          onClick={checkAllProxies}
          className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 flex items-center gap-1 cursor-pointer transition-all hover:scale-[1.02]"
        >
          <Activity className="w-3.5 h-3.5" /> فحص وحذف البروكسيات
        </button>
      </div>

      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
        {proxies.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4 bg-slate-50/50 rounded-xl">لا توجد بروكسيات مضافة حالياً.</p>
        ) : (
          proxies.map((proxy) => {
            const result = testResults[proxy];
            return (
              <div key={proxy} className="border border-slate-100 rounded-xl p-3 bg-slate-50/40 hover:bg-slate-50 transition-all">
                <div className="flex justify-between items-center gap-3">
                  <span className="font-mono text-slate-600 text-xs truncate select-all" style={{ direction: "ltr" }} title={proxy}>
                    {proxy}
                  </span>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => testProxy(proxy)}
                      disabled={result?.loading}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all ${
                        result?.loading 
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                          : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100 active:scale-95"
                      }`}
                    >
                      {result?.loading ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Activity className="w-3 h-3" />
                      )}
                      {result?.loading ? "جاري الفحص..." : "فحص الاتصال"}
                    </button>
                    
                    <button 
                      onClick={() => removeProxy(proxy)} 
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Test results detail box */}
                {result && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100/80 text-xs">
                    {result.loading ? (
                      <div className="flex items-center gap-2 text-indigo-500 animate-pulse py-1">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>جاري فحص حالة البروكسي والاتصال بموقع يوتيوب...</span>
                      </div>
                    ) : result.success ? (
                      <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 space-y-1.5">
                        <div className="flex items-center gap-1.5 text-emerald-700 font-bold mb-0.5">
                          <Check className="w-4 h-4 bg-emerald-500 text-white rounded-full p-0.5" />
                          <span>يعمل بنجاح! متصل بالإنترنت</span>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 text-[11px] font-medium">
                          <div>الـ IP الحالي: <span className="font-mono text-slate-800 font-semibold select-all" style={{ direction: "ltr" }}>{result.ip}</span></div>
                          <div>الدولة: <span className="text-slate-800 font-semibold">{result.country}</span></div>
                          <div className="col-span-2 truncate">مزود الخدمة (ISP): <span className="text-slate-800 font-semibold">{result.isp}</span></div>
                          <div className="col-span-2">زمن الاستجابة: <span className="text-indigo-600 font-bold font-mono">{result.latencyMs}ms</span></div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-2.5">
                        <div className="flex items-center gap-1.5 text-rose-700 font-bold mb-1">
                          <AlertCircle className="w-4 h-4 text-rose-600" />
                          <span>فشل الاتصال عبر البروكسي</span>
                        </div>
                        <p className="text-[11px] text-rose-600 leading-relaxed font-mono select-all bg-white/60 p-1.5 rounded border border-rose-100/50" style={{ direction: "ltr" }}>
                          {result.error}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
