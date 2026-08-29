import React, { useState, useEffect, useRef } from "react";
import {
  Type,
  Sliders,
  Play,
  Save,
  Trash2,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  Eye,
  Layers,
  Palette,
  AlignVerticalSpaceAround,
  MoveVertical,
  Plus,
  Copy,
  Star,
  Film,
  Video,
  MonitorPlay,
  Loader2,
  AlertCircle
} from "lucide-react";
import { CaptionTemplate } from "../types";

interface CaptionTemplateManagerProps {
  userId?: string;
  onTemplateSelected?: (template: CaptionTemplate) => void;
}

const FONT_OPTIONS = [
  // Arabic Fonts
  { id: "Cairo", name: "Cairo (كايرو)", lang: "ar", category: "عربي", desc: "خط عربي حديث وأنيق ومثالي للسوشيال ميديا", sample: "أبجد هوز - كابشن احترافي" },
  { id: "Tajawal", name: "Tajawal (تجوال)", lang: "ar", category: "عربي", desc: "خط عربي هندسي ناعم وواضح جداً", sample: "أبجد هوز - خط تجوال الأنيق" },
  { id: "Amiri", name: "Amiri (أميري)", lang: "ar", category: "عربي", desc: "خط عربي كلاسيكي فخم", sample: "أبجد هوز - خط أميري فخم" },
  
  // English & Viral Fonts
  { id: "Anton", name: "Anton / Impact", lang: "en", category: "إنجليزي فيروسي", desc: "خط عريض جداً ممتاز لفيديوهات الـ Hooks والـ Viral Shorts", sample: "VIRAL HOOK BOLD" },
  { id: "Bebas", name: "Bebas Neue", lang: "en", category: "إنجليزي فيروسي", desc: "خط الكابشن الأكثر شهرة على تيك توك وريلز (Condensed Bold)", sample: "TIKTOK REELS VIRAL" },
  { id: "Oswald", name: "Oswald Bold", lang: "en", category: "إنجليزي فيروسي", desc: "خط إنجليزي مكثف وقوي للعناوين الجذابة", sample: "BOLD HOOK CAPTION" },
  { id: "Poppins", name: "Poppins Bold", lang: "en", category: "إنجليزي حديث", desc: "خط هندسي ناعم ومحبوب عالمياً", sample: "Modern Aesthetic Subtitle" },
  { id: "Montserrat", name: "Montserrat", lang: "en", category: "إنجليزي حديث", desc: "خط لاتيني وعربي عصري وأنيق عالي الفخامة", sample: "Modern Caption Style 2026" },
  { id: "Roboto", name: "Roboto Black", lang: "en", category: "إنجليزي حديث", desc: "خط تكنولوجي مقروء وجريء جداً", sample: "CLEAN TECH HOOK" },
  { id: "League Spartan", name: "League Spartan", lang: "en", category: "إنجليزي فيروسي", desc: "خط عريض حديث هندسي رائع للعناوين", sample: "SPARTAN IMPACT" },
  { id: "Cinzel", name: "Cinzel Bold", lang: "en", category: "إنجليزي سينمائي", desc: "خط سينمائي كلاسيكي فاخر", sample: "CINEMATIC LUXURY" },
  { id: "DejaVu", name: "DejaVu Sans", lang: "en", category: "شامل", desc: "خط قياسي متناسق وواضح", sample: "DejaVu Universal Bold" }
];

const PRESET_COLORS = [
  { label: "أصفر ذهبي", hex: "#FDE047" },
  { label: "أبيض ناصع", hex: "#FFFFFF" },
  { label: "أخضر نيون", hex: "#4ADE80" },
  { label: "أزرق سماوي", hex: "#38BDF8" },
  { label: "وردي ناري", hex: "#FB7185" },
  { label: "برتقالي", hex: "#FB923C" },
  { label: "أسود داكن", hex: "#000000" }
];

const PRESET_BG_COLORS = [
  { label: "كحلي داكن", hex: "#0F172A" },
  { label: "أسود نقي", hex: "#000000" },
  { label: "أحمر عاجل", hex: "#DC2626" },
  { label: "زمردي داكن", hex: "#022C22" },
  { label: "بنفسجي ملكي", hex: "#4338CA" },
  { label: "رمادي فحمي", hex: "#1E293B" }
];

const DEFAULT_TEMPLATE: CaptionTemplate = {
  id: "tpl_viral_yellow",
  name: "Viral Yellow Impact (الأصفر الفيروسي)",
  font_family: "Anton",
  font_size: 48,
  font_color: "#FDE047",
  background_color: "#0F172A",
  background_opacity: 0.85,
  has_background: true,
  stroke_color: "#000000",
  stroke_width: 3,
  position: "bottom",
  position_y_percent: 80,
  padding_x: 24,
  padding_y: 14,
  border_radius: 16,
  sample_text: "🚀 سر النجاح في صناعة المحتوى | شاهد للنهاية!",
  text_source: "title",
  is_default: true
};

export default function CaptionTemplateManager({ userId, onTemplateSelected }: CaptionTemplateManagerProps) {
  const [templates, setTemplates] = useState<CaptionTemplate[]>([]);
  const [currentTemplate, setCurrentTemplate] = useState<CaptionTemplate>(DEFAULT_TEMPLATE);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<"9:16" | "16:9">("9:16");
  const [fontCategory, setFontCategory] = useState<"all" | "ar" | "en">("all");
  
  // Direct MoviePy Live Render
  const [renderingMoviePy, setRenderingMoviePy] = useState<boolean>(false);
  const [moviePyVideoUrl, setMoviePyVideoUrl] = useState<string | null>(null);
  const [moviePyError, setMoviePyError] = useState<string | null>(null);

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // 1. Fetch templates from API
  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/caption-templates");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setTemplates(data);
          const defaultTpl = data.find((t: CaptionTemplate) => t.is_default) || data[0];
          setCurrentTemplate(defaultTpl);
        }
      }
    } catch (e) {
      console.warn("Failed fetching caption templates:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [userId]);

  // Handle template selection
  const handleSelectTemplate = (tpl: CaptionTemplate) => {
    setCurrentTemplate(tpl);
    setMoviePyVideoUrl(null);
    setMoviePyError(null);
    if (onTemplateSelected) {
      onTemplateSelected(tpl);
    }
  };

  // Save or update template
  const handleSaveTemplate = async (isNew = false) => {
    setSaving(true);
    setSaveSuccess(null);
    try {
      const payload: CaptionTemplate = {
        ...currentTemplate,
        id: isNew ? `tpl_${Date.now().toString(36)}` : currentTemplate.id,
        user_id: userId || null,
        name: isNew ? `${currentTemplate.name} (نسخة)` : currentTemplate.name
      };

      const res = await fetch("/api/caption-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const saved = await res.json();
        setSaveSuccess(isNew ? "تم حفظ القالب كقالب جديد بنجاح!" : "تم تحديث القالب بنجاح!");
        await fetchTemplates();
        setCurrentTemplate(saved);
        setTimeout(() => setSaveSuccess(null), 3500);
      } else {
        const err = await res.json();
        alert(err.error || "فشل حفظ القالب");
      }
    } catch (e: any) {
      alert("خطأ في الاتصال بالخادم: " + e.message);
    } finally {
      setSaving(false);
    }
  };

  // Delete template
  const handleDeleteTemplate = async (id: string) => {
    if (templates.length <= 1) {
      alert("يجب الاحتفاظ بقالب واحد على الأقل.");
      return;
    }
    if (!confirm("هل أنت متأكد من حذف هذا القالب؟")) return;

    try {
      const res = await fetch(`/api/caption-templates/${id}`, { method: "DELETE" });
      if (res.ok) {
        const remaining = templates.filter((t) => t.id !== id);
        setTemplates(remaining);
        if (currentTemplate.id === id) {
          setCurrentTemplate(remaining[0]);
        }
      }
    } catch (e: any) {
      alert("تعذر حذف القالب: " + e.message);
    }
  };

  // Render Genuine MoviePy Video Preview
  const handleRenderMoviePyPreview = async () => {
    setRenderingMoviePy(true);
    setMoviePyError(null);
    setMoviePyVideoUrl(null);

    try {
      const res = await fetch("/api/caption-templates/render-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          template: currentTemplate,
          customText: currentTemplate.sample_text
        })
      });

      const data = await res.json();
      if (res.ok && data.videoUrl) {
        setMoviePyVideoUrl(data.videoUrl);
      } else {
        throw new Error(data.error || "فشل معالجة الفيديو في سيرفر MoviePy");
      }
    } catch (e: any) {
      console.error("MoviePy render preview error:", e);
      setMoviePyError(e.message);
    } finally {
      setRenderingMoviePy(false);
    }
  };

  // Handle Dragging Caption in Preview Box
  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !previewContainerRef.current) return;
    const rect = previewContainerRef.current.getBoundingClientRect();
    const relativeY = e.clientY - rect.top;
    const percent = Math.max(5, Math.min(95, Math.round((relativeY / rect.height) * 100)));
    setCurrentTemplate((prev) => ({
      ...prev,
      position_y_percent: percent,
      position: "custom"
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden text-right" dir="rtl" id="caption-template-manager">
      {/* HEADER */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300 shadow-inner">
              <Type className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  محرر قوالب كابشن الفيديو (MoviePy Engine)
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" /> مفعّل بالبايثون و MoviePy
                </span>
              </div>
              <p className="text-xs text-slate-400">
                صمم قوالب كتابة النصوص المتحركة والبارزة على الفيديوهات مع دعم كامل للغة العربية وموضع مخصص.
              </p>
            </div>
          </div>
        </div>

        {/* TOP ACTIONS */}
        <div className="flex items-center gap-2 w-full md:w-auto justify-end flex-wrap">
          <button
            onClick={() => handleSaveTemplate(false)}
            disabled={saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            <span>حفظ القالب</span>
          </button>
          <button
            onClick={() => handleSaveTemplate(true)}
            disabled={saving}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>حفظ كنسخة جديدة</span>
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* TEMPLATES SELECTOR BAR */}
      <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center gap-2 overflow-x-auto">
        <span className="text-xs font-bold text-slate-500 whitespace-nowrap ml-2">القوالب المحفوظة:</span>
        <div className="flex items-center gap-2">
          {templates.map((tpl) => {
            const isSelected = currentTemplate.id === tpl.id;
            return (
              <button
                key={tpl.id}
                onClick={() => handleSelectTemplate(tpl)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                  isSelected
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "bg-white text-slate-700 hover:bg-slate-100 border-slate-200"
                }`}
              >
                {tpl.is_default && <Star className="w-3 h-3 text-amber-300 fill-amber-300" />}
                <span>{tpl.name}</span>
                {isSelected && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteTemplate(tpl.id);
                    }}
                    className="p-0.5 hover:bg-indigo-700 rounded text-indigo-200 hover:text-white"
                    title="حذف القالب"
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN STUDIO GRID */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: INTERACTIVE LIVE PREVIEW CANVAS (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900">شاشة المعاينة الفورية</h4>
            </div>

            {/* Aspect ratio buttons */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                onClick={() => setAspectRatio("9:16")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  aspectRatio === "9:16" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                9:16 (Shorts/Reels)
              </button>
              <button
                onClick={() => setAspectRatio("16:9")}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  aspectRatio === "16:9" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                16:9 (عريض)
              </button>
            </div>
          </div>

          {/* PREVIEW STAGE CONTAINER */}
          <div
            ref={previewContainerRef}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            className={`relative mx-auto rounded-2xl overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 shadow-lg border-2 border-slate-800 transition-all select-none ${
              aspectRatio === "9:16" ? "w-full max-w-[290px] aspect-[9/16]" : "w-full aspect-video"
            }`}
          >
            {/* Simulated Animated Video Background or MoviePy Player */}
            {moviePyVideoUrl ? (
              <video
                src={moviePyVideoUrl}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            ) : (
              <>
                {/* Background ambient animation */}
                <div className="absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_50%_40%,rgba(99,102,241,0.4),transparent_70%)] animate-pulse" />
                
                {/* Simulated video frame badges */}
                <div className="absolute top-3 left-3 right-3 flex items-center justify-between text-[10px] text-white/70 font-mono z-10">
                  <span className="bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">720x1280 • 30FPS</span>
                  <span className="bg-red-500/80 px-1.5 py-0.5 rounded text-white font-bold animate-pulse">REC</span>
                </div>

                {/* Simulated Short Video Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-white/50 pointer-events-none">
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2">
                    <Video className="w-6 h-6 text-white/40" />
                  </div>
                  <span className="text-xs font-medium">مساحة محتوى الفيديو</span>
                  <span className="text-[10px] text-white/30">اسحب الكابشن أدناه لتحديد موضعه بحرية</span>
                </div>

                {/* THE CAPTION OVERLAY BOX */}
                <div
                  onMouseDown={handleMouseDown}
                  style={{
                    top: `${currentTemplate.position_y_percent}%`,
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    maxWidth: "88%",
                    backgroundColor: currentTemplate.has_background
                      ? `${currentTemplate.background_color}${Math.round(currentTemplate.background_opacity * 255)
                          .toString(16)
                          .padStart(2, "0")}`
                      : "transparent",
                    color: currentTemplate.font_color,
                    fontSize: `${Math.max(14, Math.min(32, Math.round(currentTemplate.font_size * 0.42)))}px`,
                    fontFamily: currentTemplate.font_family,
                    padding: `${currentTemplate.padding_y * 0.4}px ${currentTemplate.padding_x * 0.4}px`,
                    borderRadius: `${currentTemplate.border_radius * 0.5}px`,
                    textShadow:
                      currentTemplate.stroke_width > 0
                        ? `-${currentTemplate.stroke_width}px -${currentTemplate.stroke_width}px 0 ${currentTemplate.stroke_color}, ${currentTemplate.stroke_width}px -${currentTemplate.stroke_width}px 0 ${currentTemplate.stroke_color}, -${currentTemplate.stroke_width}px ${currentTemplate.stroke_width}px 0 ${currentTemplate.stroke_color}, ${currentTemplate.stroke_width}px ${currentTemplate.stroke_width}px 0 ${currentTemplate.stroke_color}`
                        : "none",
                    cursor: isDragging ? "grabbing" : "grab"
                  }}
                  className="absolute text-center leading-snug font-bold transition-transform duration-75 shadow-md flex items-center justify-center select-none active:scale-95 border border-white/10"
                >
                  {currentTemplate.sample_text || "🔥 كابشن جذاب يظهر في الفيديو"}
                </div>
              </>
            )}
          </div>

          {/* MOVIEPY TEST RENDER BUTTON */}
          <div className="space-y-2">
            <button
              onClick={handleRenderMoviePyPreview}
              disabled={renderingMoviePy}
              className="w-full py-3 px-4 bg-gradient-to-r from-slate-900 to-indigo-900 hover:from-slate-800 hover:to-indigo-800 text-white rounded-2xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {renderingMoviePy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-300" />
                  <span>جاري معالجة المعاينة بمحرك MoviePy...</span>
                </>
              ) : (
                <>
                  <MonitorPlay className="w-4 h-4 text-emerald-400" />
                  <span>معاينة حية حقيقية عبر MoviePy (توليد MP4)</span>
                </>
              )}
            </button>

            {moviePyError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-mono">
                خطأ في المعالجة: {moviePyError}
              </div>
            )}
          </div>

          {/* Positioning Info */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-[11px] text-slate-600 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MoveVertical className="w-3.5 h-3.5 text-indigo-600" />
              <span>الموضع الرأسي:</span>
              <strong className="text-slate-900 font-mono">{currentTemplate.position_y_percent}%</strong>
            </span>
            <span className="text-[10px] text-slate-400">
              {currentTemplate.position === "bottom"
                ? "أسفل الفيديو"
                : currentTemplate.position === "top"
                ? "أعلى الفيديو"
                : currentTemplate.position === "center"
                ? "المنتصف"
                : "مخصص"}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: CONTROLS & SETTINGS (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Template General Info */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                <span>اسم القالب</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTemplate.is_default || false}
                  onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">تعيين كقالب افتراضي لجميع الأتمتة</span>
              </label>
            </div>
            <input
              type="text"
              value={currentTemplate.name}
              onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="مثال: Viral Yellow Shorts"
              className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* 2. Typography & Fonts */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Type className="w-4 h-4 text-indigo-600" />
                <span>نوع وحجم الخط (Typography)</span>
              </h5>
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold">
                  {FONT_OPTIONS.find((f) => f.id.toLowerCase() === currentTemplate.font_family.toLowerCase())?.category || "محدد"}
                </span>
                <span className="text-[11px] font-mono text-indigo-600 font-bold">{currentTemplate.font_family}</span>
              </div>
            </div>

            {/* Font Language / Category Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-xl overflow-x-auto">
              <button
                type="button"
                onClick={() => setFontCategory("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  fontCategory === "all" ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                جميع الخطوط ({FONT_OPTIONS.length})
              </button>
              <button
                type="button"
                onClick={() => setFontCategory("ar")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  fontCategory === "ar" ? "bg-white text-emerald-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>🌟 خطوط عربية</span>
                <span className="text-[10px] opacity-75">({FONT_OPTIONS.filter((f) => f.lang === "ar").length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFontCategory("en")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1 ${
                  fontCategory === "en" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <span>⚡ خطوط إنجليزية وفيروسية</span>
                <span className="text-[10px] opacity-75">({FONT_OPTIONS.filter((f) => f.lang === "en").length})</span>
              </button>
            </div>

            {/* Font Family Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {FONT_OPTIONS.filter((f) => fontCategory === "all" || f.lang === fontCategory).map((f) => {
                const isSelected = currentTemplate.font_family.toLowerCase() === f.id.toLowerCase();
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setCurrentTemplate((prev) => ({
                        ...prev,
                        font_family: f.id as any,
                        sample_text:
                          f.lang === "en" && prev.sample_text.includes("أبجد")
                            ? "🔥 VIRAL REELS HOOK | WATCH TILL END!"
                            : prev.sample_text
                      }));
                    }}
                    className={`p-3 rounded-xl border text-right transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-indigo-50/90 border-indigo-500 text-indigo-950 shadow-xs ring-1 ring-indigo-500"
                        : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-xs font-bold">{f.name}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                          f.lang === "ar"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {f.category}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-500 line-clamp-1 mb-1">{f.desc}</div>
                    <div
                      className="text-[11px] font-bold text-slate-800 bg-white/70 px-2 py-1 rounded border border-slate-200/50 truncate"
                      dir={f.lang === "ar" ? "rtl" : "ltr"}
                    >
                      {f.sample}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Font Size Slider */}
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>حجم الخط:</span>
                <span className="font-mono font-bold text-indigo-600">{currentTemplate.font_size}pt</span>
              </div>
              <input
                type="range"
                min="20"
                max="84"
                step="2"
                value={currentTemplate.font_size}
                onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, font_size: Number(e.target.value) }))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>

            {/* Font Color Picker & Shortcuts */}
            <div className="space-y-2 pt-1">
              <span className="text-xs font-medium text-slate-700">لون النص:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="color"
                  value={currentTemplate.font_color}
                  onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, font_color: e.target.value }))}
                  className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                />
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.hex}
                    type="button"
                    onClick={() => setCurrentTemplate((prev) => ({ ...prev, font_color: c.hex }))}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      currentTemplate.font_color.toLowerCase() === c.hex.toLowerCase()
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-black shadow-xs"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 3. Background Box Styling */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>شريط وخلفية الكابشن (Background Box)</span>
              </h5>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={currentTemplate.has_background}
                  onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, has_background: e.target.checked }))}
                  className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-xs font-bold text-slate-700">تفعيل شريط الخلفية</span>
              </label>
            </div>

            {currentTemplate.has_background && (
              <div className="space-y-4 animate-fade-in">
                {/* Background Color */}
                <div className="space-y-2">
                  <span className="text-xs font-medium text-slate-700">لون الخلفية:</span>
                  <div className="flex items-center gap-2 flex-wrap">
                    <input
                      type="color"
                      value={currentTemplate.background_color}
                      onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, background_color: e.target.value }))}
                      className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                    />
                    {PRESET_BG_COLORS.map((c) => (
                      <button
                        key={c.hex}
                        onClick={() => setCurrentTemplate((prev) => ({ ...prev, background_color: c.hex }))}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                          currentTemplate.background_color.toLowerCase() === c.hex.toLowerCase()
                            ? "border-indigo-600 bg-indigo-50 text-indigo-900 font-black shadow-xs"
                            : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-black/20" style={{ backgroundColor: c.hex }} />
                        <span>{c.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Opacity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>شفافية الخلفية (Opacity):</span>
                    <span className="font-mono font-bold text-indigo-600">{Math.round(currentTemplate.background_opacity * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={currentTemplate.background_opacity}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, background_opacity: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>

                {/* Border Radius Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>انحناء الزوايا (Corner Radius):</span>
                    <span className="font-mono font-bold text-indigo-600">{currentTemplate.border_radius}px</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="32"
                    step="2"
                    value={currentTemplate.border_radius}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, border_radius: Number(e.target.value) }))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Stroke & Outline */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Palette className="w-4 h-4 text-indigo-600" />
                <span>إطار وحدود النص (Text Stroke / Outline)</span>
              </h5>
              <span className="text-[11px] font-mono text-indigo-600 font-bold">{currentTemplate.stroke_width}px</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium text-slate-700">
                  <span>سُمك الإطار:</span>
                  <span className="font-mono font-bold text-indigo-600">{currentTemplate.stroke_width}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={currentTemplate.stroke_width}
                  onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, stroke_width: Number(e.target.value) }))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-medium text-slate-700">لون الإطار:</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={currentTemplate.stroke_color}
                    onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, stroke_color: e.target.value }))}
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-slate-600 font-bold">{currentTemplate.stroke_color}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Positioning Presets & Sliders */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <AlignVerticalSpaceAround className="w-4 h-4 text-indigo-600" />
                <span>موضع الكابشن في الفيديو</span>
              </h5>
            </div>

            {/* Position Fast Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, position: "top", position_y_percent: 10 }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentTemplate.position === "top"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                أعلى الفيديو (10%)
              </button>
              <button
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, position: "center", position_y_percent: 50 }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentTemplate.position === "center"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                المنتصف (50%)
              </button>
              <button
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, position: "bottom", position_y_percent: 82 }))}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  currentTemplate.position === "bottom"
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                    : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                أسفل الفيديو (82%)
              </button>
            </div>

            {/* Vertical Position Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium text-slate-700">
                <span>تعديل الموضع الرأسي بدقة:</span>
                <span className="font-mono font-bold text-indigo-600">{currentTemplate.position_y_percent}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="95"
                step="1"
                value={currentTemplate.position_y_percent}
                onChange={(e) =>
                  setCurrentTemplate((prev) => ({
                    ...prev,
                    position_y_percent: Number(e.target.value),
                    position: "custom"
                  }))
                }
                className="w-full accent-indigo-600 cursor-pointer"
              />
            </div>
          </div>

          {/* 6. Sample / Dynamic Text Input & Source */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>مصدر نص الكابشن الافتراضي (Caption Text Source)</span>
              </h5>
            </div>

            {/* Text Source Toggle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, text_source: "title" }))}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  (currentTemplate.text_source || "title") === "title"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-500"
                    : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">🎬 عنوان الفيديو تلقائياً</span>
                  {(currentTemplate.text_source || "title") === "title" && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  سيتم تحويل عنوان كل فيديو (سواء تم تتبعه أو جدولته) لكابشن مدمج ديناميكي.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, text_source: "custom" }))}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  currentTemplate.text_source === "custom"
                    ? "bg-indigo-50 border-indigo-500 text-indigo-950 font-bold shadow-xs ring-1 ring-indigo-500"
                    : "bg-slate-50/60 border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold">✍️ نص ثابت مخصص للقالب</span>
                  {currentTemplate.text_source === "custom" && (
                    <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="text-[10px] text-slate-500 mt-1">
                  سيتم استخدام النص المحدد أدناه ككابشن ثابت لجميع الفيديوهات بدون تغيير.
                </div>
              </button>
            </div>

            {/* Custom / Sample Text Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 block">
                {currentTemplate.text_source === "custom" ? "النص المخصص الثابت للقالب:" : "نص المعاينة الحية في الاستوديو:"}
              </label>
              <input
                type="text"
                value={currentTemplate.sample_text}
                onChange={(e) => setCurrentTemplate((prev) => ({ ...prev, sample_text: e.target.value }))}
                placeholder="اكتب نص الكابشن هنا..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {/* Quick Sample Presets */}
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <span className="text-[10px] text-slate-500 font-bold">عبارات سريعة:</span>
              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, sample_text: "🚀 سر النجاح في صناعة المحتوى | شاهد للنهاية!" }))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-all"
              >
                عربي فيروسي
              </button>
              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, sample_text: "🔥 VIRAL REELS HOOK | WAIT TILL THE END!" }))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-all"
              >
                Viral English Hook
              </button>
              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, sample_text: "💡 معلومة صادمة ستغير تفكيرك تماماً 😱" }))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-all"
              >
                فضول وتشويق
              </button>
              <button
                type="button"
                onClick={() => setCurrentTemplate((prev) => ({ ...prev, sample_text: "💥 UNBELIEVABLE TRICK YOU MUST TRY!" }))}
                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-medium transition-all"
              >
                English Trick
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
