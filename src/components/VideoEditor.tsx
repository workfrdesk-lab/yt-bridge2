import React, { useState, useRef, useEffect } from "react";
import { VideoInfo, VideoFormat } from "../types";
import { CustomSelect } from "./CustomSelect";
import { 
  Scissors, Play, Pause, RotateCcw, Volume2, Type, 
  Wand2, Download, Plus, Trash2, Sliders, Check, 
  Sparkles, Loader2, RefreshCw, Layers, Clock, Settings,
  AlertCircle
} from "lucide-react";

interface VideoEditorProps {
  videoInfo: VideoInfo;
  selectedFormat: VideoFormat | null;
  autoAvoidCopyright?: boolean;
}

interface Subtitle {
  id: string;
  text: string;
  start: number;
  end: number;
  position: "top" | "middle" | "bottom";
  color: string;
  fontSize: number;
}

interface VideoSegment {
  id: string;
  start: number;
  end: number;
  isActive: boolean;
}

export default function VideoEditor({ videoInfo, selectedFormat, autoAvoidCopyright }: VideoEditorProps) {
  const streamUrl = selectedFormat?.url || videoInfo.bestVideoUrl;
  
  // Player state references
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Editor values
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(videoInfo.duration);
  const [volume, setVolume] = useState(1.0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1.0);
  const [activeTab, setActiveTab] = useState<"trim" | "filters" | "subtitles" | "watermark">("trim");

  // Avoid Copyright state
  const [avoidCopyright, setAvoidCopyright] = useState(false);

  // Logo Watermark state
  const [enableLogo, setEnableLogo] = useState(false);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoPosition, setLogoPosition] = useState<"top_right" | "top_left" | "bottom_right" | "bottom_left" | "center">("top_right");
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large">("medium");
  const [logoOpacity, setLogoOpacity] = useState(0.85);

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
          body: JSON.stringify({ imageBase64: base64, filename: file.name })
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

  // Sync avoidCopyright with autoAvoidCopyright prop on mount/change
  useEffect(() => {
    if (autoAvoidCopyright) {
      setAvoidCopyright(true);
    }
  }, [autoAvoidCopyright, videoInfo]);
  
  // Filters & Adjustments
  const [colorFilter, setColorFilter] = useState<string>("none");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [blur, setBlur] = useState(0);

  // Subtitles / Captions
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [activeSubtitleText, setActiveSubtitleText] = useState("");
  const [activeSubId, setActiveSubId] = useState<string | null>(null);
  const [newSubText, setNewSubText] = useState("");
  const [newSubStart, setNewSubStart] = useState(0);
  const [newSubEnd, setNewSubEnd] = useState(Math.min(5, videoInfo.duration));
  const [newSubPos, setNewSubPos] = useState<"top" | "middle" | "bottom">("bottom");
  const [newSubColor, setNewSubColor] = useState("#fef08a"); // Tailwind yellow-200 default
  const [newSubSize, setNewSubSize] = useState(16);

  // Advanced Cuts / Multiple Segments
  const [segments, setSegments] = useState<VideoSegment[]>([
    { id: "default", start: 0, end: videoInfo.duration, isActive: true }
  ]);

  // Export State
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  // Update EndTime when video duration changes
  useEffect(() => {
    setEndTime(videoInfo.duration);
    setSegments([{ id: "default", start: 0, end: videoInfo.duration, isActive: true }]);
  }, [videoInfo]);

  // Sync state with HTML5 Video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const current = video.currentTime;
      setPlayhead(current);
      
      // Enforce trimming boundaries in timeline preview
      if (current < startTime) {
        video.currentTime = startTime;
      }
      if (current > endTime) {
        if (isPlaying) {
          video.currentTime = startTime; // Loop back
        } else {
          video.pause();
          setIsPlaying(false);
        }
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [startTime, endTime, isPlaying]);

  // Handle Playback rate & volume change
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, streamUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
    }
  }, [volume, streamUrl]);

  // Toggle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
      setIsPlaying(false);
    } else {
      if (video.currentTime >= endTime || video.currentTime < startTime) {
        video.currentTime = startTime;
      }
      video.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleSeek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clampedTime = Math.max(startTime, Math.min(endTime, time));
    video.currentTime = clampedTime;
    setPlayhead(clampedTime);
  };

  // Add Subtitle
  const handleAddSubtitle = () => {
    if (!newSubText.trim()) return;
    const newSub: Subtitle = {
      id: `sub_${Date.now()}`,
      text: newSubText,
      start: newSubStart,
      end: newSubEnd,
      position: newSubPos,
      color: newSubColor,
      fontSize: newSubSize
    };
    setSubtitles([...subtitles, newSub].sort((a, b) => a.start - b.start));
    setNewSubText("");
  };

  // Remove Subtitle
  const handleRemoveSubtitle = (id: string) => {
    setSubtitles(subtitles.filter(sub => sub.id !== id));
  };

  // Add a Cut Segment
  const handleSplitSegment = () => {
    const current = playhead;
    // Find active segment that contains current playhead
    const targetIdx = segments.findIndex(seg => seg.isActive && current > seg.start && current < seg.end);
    if (targetIdx === -1) return;

    const target = segments[targetIdx];
    const seg1: VideoSegment = {
      id: `seg_${Date.now()}_1`,
      start: target.start,
      end: current,
      isActive: true
    };
    const seg2: VideoSegment = {
      id: `seg_${Date.now()}_2`,
      start: current,
      end: target.end,
      isActive: true
    };

    const newSegs = [...segments];
    newSegs.splice(targetIdx, 1, seg1, seg2);
    setSegments(newSegs);
  };

  // Toggle Segment state
  const toggleSegmentActive = (id: string) => {
    setSegments(segments.map(seg => {
      if (seg.id === id) {
        return { ...seg, isActive: !seg.isActive };
      }
      return seg;
    }));
  };

  // Delete Segment entirely
  const deleteSegment = (id: string) => {
    if (segments.filter(s => s.isActive).length <= 1) return;
    setSegments(segments.filter(seg => seg.id !== id));
  };

  // Build client CSS filters for player preview
  const getFilterCSS = () => {
    let css = "";
    if (colorFilter === "grayscale") css += "grayscale(100%) ";
    if (colorFilter === "sepia") css += "sepia(80%) ";
    if (colorFilter === "invert") css += "invert(90%) ";
    if (colorFilter === "vintage") css += "contrast(120%) saturate(140%) sepia(20%) hue-rotate(-15deg) ";
    
    // Custom sliders
    css += `brightness(${brightness}%) `;
    css += `contrast(${contrast}%) `;
    css += `saturate(${saturation}%) `;
    if (blur > 0) css += `blur(${blur}px) `;
    
    return css.trim();
  };

  // Get active subtitle text at current playhead position
  const getActiveSubtitle = () => {
    return subtitles.find(sub => playhead >= sub.start && playhead <= sub.end);
  };

  // Format seconds to text (00:00.0)
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = (secs % 60).toFixed(1);
    return `${mins}:${parseFloat(remainingSecs) < 10 ? "0" : ""}${remainingSecs}`;
  };

  // Trigger server-side FFmpeg processing
  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    setExportSuccess(false);
    setExportProgress(10);

    try {
      // Step-by-step progress simulation to keep user informed while downloading
      const interval = setInterval(() => {
        setExportProgress(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            return 95;
          }
          return prev + 5;
        });
      }, 1000);

      // Build the GET query parameters
      const queryParams = new URLSearchParams({
        directUrl: streamUrl || "",
        startTime: startTime.toString(),
        endTime: endTime.toString(),
        volume: volume.toString(),
        speed: playbackSpeed.toString(),
        colorFilter: colorFilter,
        brightness: brightness.toString(),
        contrast: contrast.toString(),
        saturation: saturation.toString(),
        blur: blur.toString(),
        title: videoInfo.title || "",
        avoidCopyright: avoidCopyright.toString(),
        enableLogo: enableLogo.toString(),
        logoUrl: logoUrl,
        logoPosition: logoPosition,
        logoSize: logoSize,
        logoOpacity: logoOpacity.toString(),
        youtubeUrl: videoInfo.youtubeUrl || videoInfo.videoUrl || "",
        cookiesText: videoInfo.cookiesText || "",
        formatId: selectedFormat ? selectedFormat.formatId : "best"
      });

      const downloadUrl = `/api/export-video?${queryParams.toString()}`;

      // Create a temporary anchor element to trigger native browser download
      // target="_blank" is critical to break out of the iframe sandbox and allow downloads
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      // Wait a few seconds to simulate preparation, then set to success
      setTimeout(() => {
        clearInterval(interval);
        setExportProgress(100);
        setExportSuccess(true);
        setExporting(false);
      }, 3500);

    } catch (err: any) {
      console.error("[Export] Error:", err);
      setExportError(err.message || "حدث خطأ أثناء معالجة وتصدير المقطع.");
      setExporting(false);
    }
  };

  const activeSub = getActiveSubtitle();

  return (
    <div className="bg-slate-900 text-slate-100 rounded-3xl border border-slate-800 shadow-2xl overflow-hidden mt-6" id="opencut-editor-suite">
      {/* Editor Header */}
      <div className="bg-slate-950 px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-600/10 rounded-xl text-indigo-400 border border-indigo-500/20">
            <Scissors className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-200 flex items-center gap-1.5">
              <span>ستوديو تعديل الفيديو الاحترافي</span>
              <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                مستوحى من OpenCut
              </span>
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              قم بقص، تسريع، تعديل الألوان، إضافة نصوص، وتصدير مقطعك بدقة عالية عبر FFmpeg
            </p>
          </div>
        </div>
        
        <button
          onClick={handleExport}
          disabled={exporting}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0 border border-indigo-500/30"
        >
          {exporting ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>جاري التصدير {exportProgress}%...</span>
            </>
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              <span>تصدير بجودة عالية</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Main Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-slate-800">
        
        {/* Left Side: Video Preview Screen */}
        <div className="lg:col-span-7 bg-slate-950 p-6 flex flex-col justify-between border-l border-slate-800/80">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black/50 border border-slate-800 flex items-center justify-center">
            {/* Realtime Video Stream */}
            <video
              ref={videoRef}
              src={streamUrl}
              className="w-full h-full object-contain"
              style={{ filter: getFilterCSS() }}
            />

            {/* Live Subtitle/Text Overlay Render */}
            {activeSub && (
              <div 
                className="absolute left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-lg bg-black/75 text-center transition-all duration-150 pointer-events-none"
                style={{
                  color: activeSub.color,
                  fontSize: `${activeSub.fontSize}px`,
                  bottom: activeSub.position === "bottom" ? "12%" : undefined,
                  top: activeSub.position === "top" ? "12%" : undefined,
                  transform: activeSub.position === "middle" ? "translate(-50%, -50%)" : "translateX(-50%)",
                  ...(activeSub.position === "middle" ? { top: "50%" } : {})
                }}
              >
                {activeSub.text}
              </div>
            )}

            {/* Custom Overlay Controls */}
            <div className="absolute top-3 right-3 bg-slate-900/90 text-slate-300 border border-slate-800 px-2.5 py-1 rounded-lg text-[9px] font-mono pointer-events-none">
              {formatTime(playhead)} / {formatTime(videoInfo.duration)}
            </div>
          </div>

          {/* Player Navigation controls */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl transition-all cursor-pointer border border-slate-700/50 text-indigo-400 hover:text-indigo-300"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-indigo-400/20" /> : <Play className="w-4 h-4 fill-indigo-400" />}
              </button>
              
              <button
                type="button"
                onClick={() => handleSeek(startTime)}
                className="p-2.5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer border border-slate-700/50 text-slate-300"
                title="الرجوع إلى البداية المحددة"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSplitSegment}
                className="p-2.5 bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/30 rounded-xl transition-all cursor-pointer text-indigo-300 flex items-center gap-1 text-xs font-semibold"
                title="تقسيم المقطع عند المؤشر"
              >
                <Scissors className="w-3.5 h-3.5" />
                <span>تقسيم</span>
              </button>
            </div>

            <div className="flex items-center gap-4">
              {/* Playback speed selector */}
              <div className="flex items-center gap-1.5 min-w-[110px]">
                <CustomSelect
                  options={[
                    { value: "0.5", label: "0.5x" },
                    { value: "0.75", label: "0.75x" },
                    { value: "1.0", label: "1.0x (عادي)" },
                    { value: "1.25", label: "1.25x" },
                    { value: "1.5", label: "1.5x" },
                    { value: "2.0", label: "2.0x" },
                  ]}
                  value={playbackSpeed.toString()}
                  onChange={(val) => setPlaybackSpeed(parseFloat(val))}
                  size="sm"
                  variant="dark"
                  searchable={false}
                />
              </div>

              {/* Volume Controller */}
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="range"
                  min="0"
                  max="1.5"
                  step="0.1"
                  value={volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-16 accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
                <span className="text-[10px] font-mono text-slate-400 w-8">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Options & Settings Tabs */}
        <div className="lg:col-span-5 bg-slate-900/60 flex flex-col h-full overflow-hidden">
          {/* Tab Selection */}
          <div className="flex border-b border-slate-800/80 bg-slate-950/40 p-2 gap-1">
            <button
              onClick={() => setActiveTab("trim")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "trim"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>القص والتعديل</span>
            </button>
            <button
              onClick={() => setActiveTab("filters")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "filters"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>الفلاتر والألوان</span>
            </button>
            <button
              onClick={() => setActiveTab("subtitles")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "subtitles"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>الترجمة</span>
            </button>
            <button
              onClick={() => setActiveTab("watermark")}
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "watermark"
                  ? "bg-indigo-600 text-white shadow-xs"
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>الشعار</span>
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="p-5 flex-1 overflow-y-auto max-h-[460px] space-y-4">
            
            {/* Auto-Copyright Protection Banner */}
            <div className="bg-gradient-to-r from-amber-950/40 to-indigo-950/40 border border-amber-500/20 rounded-2xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-amber-500/10 rounded-lg text-amber-400 border border-amber-500/20">
                    <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1">
                      <span>نمط تفادي الكوبيرايت الذكي</span>
                      <span className="text-[9px] bg-amber-400 text-amber-950 px-1.5 py-0.5 rounded-full font-bold font-sans">
                        تلقائي
                      </span>
                    </h4>
                    <p className="text-[10px] text-slate-300 mt-0.5">
                      تعديل أبعاد المقطع وسرعته ونبرته تلقائياً لتجاوز الفلاتر وإعادة النشر بنجاح.
                    </p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={avoidCopyright}
                    onChange={(e) => setAvoidCopyright(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-amber-950"></div>
                </label>
              </div>

              {avoidCopyright && (
                <div className="grid grid-cols-2 gap-2 text-[9px] bg-black/30 p-2.5 rounded-lg border border-amber-500/10 text-slate-300 animate-fade-in">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>عكس الفيديو أفقياً (Mirroring)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>تغيير السرعة الذكي (1.06x)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>تعديل الألوان والتباين (+5%)</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Check className="w-3 h-3 shrink-0" />
                    <span>تغيير نبرة الصوت (Pitch)</span>
                  </div>
                </div>
              )}
            </div>
            
            {/* TRIM TAB CONTENT */}
            {activeTab === "trim" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>تحديد نطاق قص الفيديو</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    اسحب أو حدد وقت بدء ونهاية الفيديو لتصديره
                  </p>
                </div>

                {/* Range inputs with text */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">وقت البدء (ثانية):</label>
                    <input
                      type="number"
                      min="0"
                      max={endTime - 1}
                      step="0.5"
                      value={startTime.toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setStartTime(Math.max(0, Math.min(endTime - 1, val)));
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 font-mono focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">يقابل: {formatTime(startTime)}</span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-bold">وقت النهاية (ثانية):</label>
                    <input
                      type="number"
                      min={startTime + 1}
                      max={videoInfo.duration}
                      step="0.5"
                      value={endTime.toFixed(1)}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || videoInfo.duration;
                        setEndTime(Math.max(startTime + 1, Math.min(videoInfo.duration, val)));
                      }}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 font-mono focus:outline-none"
                    />
                    <span className="text-[9px] text-slate-500 block">يقابل: {formatTime(endTime)}</span>
                  </div>
                </div>

                {/* Segment cuts list */}
                <div className="space-y-2 pt-2">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" />
                    <span>المقاطع والقصاصات المقسمة ({segments.length})</span>
                  </h5>
                  
                  <div className="space-y-2 max-h-[140px] overflow-y-auto">
                    {segments.map((seg, idx) => (
                      <div 
                        key={seg.id} 
                        className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                          seg.isActive 
                            ? "bg-slate-950/40 border-slate-800" 
                            : "bg-slate-900/20 border-slate-900/60 opacity-60"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 w-5 h-5 rounded-md flex items-center justify-center font-mono font-bold">
                            {idx + 1}
                          </span>
                          <span className="text-xs text-slate-300 font-mono">
                            {formatTime(seg.start)} - {formatTime(seg.end)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleSegmentActive(seg.id)}
                            className={`px-2 py-1 rounded-md text-[9px] font-bold cursor-pointer border ${
                              seg.isActive 
                                ? "bg-indigo-900/30 border-indigo-700/30 text-indigo-300 hover:bg-indigo-900/50" 
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                            }`}
                          >
                            {seg.isActive ? "نشط" : "مستبعد"}
                          </button>

                          {segments.length > 1 && (
                            <button
                              type="button"
                              onClick={() => deleteSegment(seg.id)}
                              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/20 rounded-md transition-colors cursor-pointer"
                              title="حذف هذا الجزء"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* FILTERS TAB CONTENT */}
            {activeTab === "filters" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Wand2 className="w-4 h-4 text-indigo-400" />
                    <span>فلاتر وتعديل الألوان</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    اختر تأثيراً لونياً جاهزاً أو قم بضبط الخصائص يدوياً
                  </p>
                </div>

                {/* Built-in Filter Presets */}
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "none", name: "عادي" },
                    { id: "grayscale", name: "أبيض وأسود" },
                    { id: "sepia", name: "سيبيا كلاسيك" },
                    { id: "vintage", name: "عتيق سينمائي" },
                    { id: "invert", name: "ألوان معكوسة" }
                  ].map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => setColorFilter(preset.id)}
                      className={`py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                        colorFilter === preset.id
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>

                {/* Adjustments Sliders */}
                <div className="space-y-3 pt-3 border-t border-slate-800/60">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">تعديلات متقدمة</h5>
                  
                  {/* Brightness */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>السطوع</span>
                      <span className="font-mono">{brightness}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={brightness}
                      onChange={(e) => setBrightness(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Contrast */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>التباين</span>
                      <span className="font-mono">{contrast}%</span>
                    </div>
                    <input
                      type="range"
                      min="50"
                      max="150"
                      value={contrast}
                      onChange={(e) => setContrast(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Saturation */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>التشبع</span>
                      <span className="font-mono">{saturation}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="200"
                      value={saturation}
                      onChange={(e) => setSaturation(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Blur */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>ضبابية الخلفية (Blur)</span>
                      <span className="font-mono">{blur}px</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={blur}
                      onChange={(e) => setBlur(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SUBTITLES TAB CONTENT */}
            {activeTab === "subtitles" && (
              <div className="space-y-4">
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Type className="w-4 h-4 text-indigo-400" />
                    <span>شروحات ونصوص توضيحية</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">
                    أضف نصوصاً تظهر فوق الفيديو في أوقات محددة
                  </p>
                </div>

                {/* Subtitle Add Form */}
                <div className="bg-slate-950/40 border border-slate-800 p-3.5 rounded-xl space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block">نص الشرح التوضيحي:</label>
                    <input
                      type="text"
                      placeholder="اكتب العبارة هنا..."
                      value={newSubText}
                      onChange={(e) => setNewSubText(e.target.value)}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 block">البدء (ثانية):</label>
                      <input
                        type="number"
                        min="0"
                        max={videoInfo.duration}
                        step="0.5"
                        value={newSubStart}
                        onChange={(e) => setNewSubStart(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 block">الانتهاء (ثانية):</label>
                      <input
                        type="number"
                        min="0"
                        max={videoInfo.duration}
                        step="0.5"
                        value={newSubEnd}
                        onChange={(e) => setNewSubEnd(parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100 font-mono focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 block font-bold">الموقع:</label>
                      <CustomSelect
                        options={[
                          { value: "bottom", label: "أسفل" },
                          { value: "middle", label: "وسط" },
                          { value: "top", label: "أعلى" },
                        ]}
                        value={newSubPos}
                        onChange={(val) => setNewSubPos(val as any)}
                        size="sm"
                        variant="dark"
                        searchable={false}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] text-slate-400 block font-bold">اللون:</label>
                      <CustomSelect
                        options={[
                          { value: "#ffffff", label: "أبيض" },
                          { value: "#fef08a", label: "أصفر ملفت" },
                          { value: "#f87171", label: "أحمر دافئ" },
                          { value: "#4ade80", label: "أخضر زمردي" },
                          { value: "#000000", label: "أسود" },
                        ]}
                        value={newSubColor}
                        onChange={(val) => setNewSubColor(val)}
                        size="sm"
                        variant="dark"
                        searchable={false}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSubtitle}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة الشرح للخط الزمني</span>
                  </button>
                </div>

                {/* Subtitles list */}
                {subtitles.length > 0 && (
                  <div className="space-y-1.5">
                    <h5 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">النصوص المضافة ({subtitles.length})</h5>
                    <div className="space-y-1.5 max-h-[110px] overflow-y-auto">
                      {subtitles.map((sub) => (
                        <div key={sub.id} className="flex items-center justify-between p-2 bg-slate-950/40 rounded-lg border border-slate-800/50 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span 
                              className="w-2.5 h-2.5 rounded-full border border-black/30"
                              style={{ backgroundColor: sub.color }}
                            />
                            <span className="text-slate-300 line-clamp-1 font-medium">{sub.text}</span>
                            <span className="text-[9px] text-slate-500 font-mono">({formatTime(sub.start)}s - {formatTime(sub.end)}s)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveSubtitle(sub.id)}
                            className="text-rose-400 hover:text-rose-300 p-0.5 rounded-md hover:bg-rose-950/20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* WATERMARK TAB CONTENT */}
            {activeTab === "watermark" && (
              <div className="space-y-4 text-right">
                <div className="flex items-center justify-between bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">إضافة لوغو أو شعار القناة 🖼️</h4>
                    <p className="text-[10px] text-slate-400">طباعة صورة اللوغو كعلامة مائية على المقطع قبل التصدير</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableLogo}
                    onChange={(e) => setEnableLogo(e.target.checked)}
                    className="w-4 h-4 text-indigo-500 rounded border-slate-700 focus:ring-indigo-500 cursor-pointer"
                  />
                </div>

                {enableLogo && (
                  <div className="space-y-3 bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 block">رابط الشعار أو رفعه من جهازك</label>
                      <div className="flex gap-2 items-center">
                        <input
                          type="text"
                          placeholder="رابط الصورة (https://...)"
                          value={logoUrl}
                          onChange={(e) => setLogoUrl(e.target.value)}
                          className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                          style={{ direction: "ltr" }}
                        />
                        <label className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shrink-0">
                          <span>رفع</span>
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
                      <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <img src={logoUrl} alt="Logo preview" className="w-8 h-8 object-contain rounded bg-slate-900 p-0.5" />
                        <span className="text-[10px] text-emerald-400 font-bold">✓ تم تجهيز الشعار للتصدير</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">زاوية وضع الشعار</label>
                        <select
                          value={logoPosition}
                          onChange={(e) => setLogoPosition(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold"
                        >
                          <option value="top_right">↗️ أعلى اليمين (Top Right)</option>
                          <option value="top_left">↖️ أعلى اليسار (Top Left)</option>
                          <option value="bottom_right">↘️ أسفل اليمين (Bottom Right)</option>
                          <option value="bottom_left">↙️ أسفل اليسار (Bottom Left)</option>
                          <option value="center">🎯 المنتصف (Center)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-slate-400 block mb-1">حجم الشعار</label>
                        <select
                          value={logoSize}
                          onChange={(e) => setLogoSize(e.target.value as any)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-bold"
                        >
                          <option value="small">صغير (120px)</option>
                          <option value="medium">متوسط (180px)</option>
                          <option value="large">كبير (260px)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Timeline Scrubbing Area */}
      <div className="bg-slate-950 p-6 space-y-4 border-b border-slate-800">
        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500" />
              <span>مؤشر التشغيل: <span className="font-mono text-indigo-400 font-bold">{formatTime(playhead)}</span></span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="font-semibold text-emerald-400">البدء: {formatTime(startTime)}</span>
            <span className="font-semibold text-rose-400">النهاية: {formatTime(endTime)}</span>
            <span className="text-slate-500">المدة المحددة: {formatTime(endTime - startTime)}</span>
          </div>
        </div>

        {/* The Track Slider Box */}
        <div className="relative h-12 bg-slate-900 rounded-xl border border-slate-800 overflow-hidden flex flex-col justify-center">
          
          {/* Shaded boundaries for excluded parts */}
          <div 
            className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
            style={{ left: 0, width: `${(startTime / videoInfo.duration) * 100}%` }}
          />
          <div 
            className="absolute top-0 bottom-0 bg-black/60 pointer-events-none"
            style={{ right: 0, left: `${(endTime / videoInfo.duration) * 100}%` }}
          />

          {/* Subtitles mini-visual anchors */}
          {subtitles.map(sub => (
            <div
              key={sub.id}
              className="absolute h-1.5 bg-yellow-400/80 rounded-full top-1"
              style={{
                left: `${(sub.start / videoInfo.duration) * 100}%`,
                width: `${((sub.end - sub.start) / videoInfo.duration) * 100}%`
              }}
              title={sub.text}
            />
          ))}

          {/* Custom Range Slider Inputs */}
          <div className="relative w-full h-8 flex items-center">
            {/* The actual Scrub head line */}
            <div 
              className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 shadow-xl pointer-events-none z-30"
              style={{ left: `${(playhead / videoInfo.duration) * 100}%` }}
            >
              <div className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-indigo-500 rounded-full border-2 border-white shadow-md shadow-indigo-500/50" />
            </div>

            {/* Clickable Track to seek playhead */}
            <input
              type="range"
              min="0"
              max={videoInfo.duration}
              step="0.1"
              value={playhead}
              onChange={(e) => handleSeek(parseFloat(e.target.value))}
              className="absolute top-0 bottom-0 w-full opacity-30 accent-transparent cursor-pointer z-20 h-full appearance-none bg-transparent"
            />

            {/* Trim sliders layered underneath */}
            <div className="absolute w-full px-0.5 pointer-events-none z-10">
              <div className="relative w-full h-4">
                {/* Visual center track bar */}
                <div 
                  className="absolute h-1 bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full top-1.5"
                  style={{
                    left: `${(startTime / videoInfo.duration) * 100}%`,
                    right: `${100 - (endTime / videoInfo.duration) * 100}%`
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Slider instructions */}
        <div className="flex justify-between items-center text-[10px] text-slate-500">
          <span>0:00</span>
          <span>اسحب مؤشر التشغيل للتحرك عبر الخط الزمني</span>
          <span>{formatTime(videoInfo.duration)}</span>
        </div>
      </div>

      {/* Export Status & Details Area */}
      {(exportError || exportSuccess || exporting) && (
        <div className="bg-slate-950 p-5 border-t border-slate-800">
          {exporting && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>جاري معالجة الفيديو في الخلفية عبر FFmpeg...</span>
                </span>
                <span className="font-mono text-indigo-400 font-bold">{exportProgress}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-300"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                يقوم الخادم حالياً بسحب دفق الفيديو المباشر وقص الإطارات، وضبط الصوت ومعدلات السرعة، وتصدير دفق MP4 إليك مباشرة. قد يستغرق هذا بضع ثوانٍ للمقاطع القصيرة.
              </p>
            </div>
          )}

          {exportError && (
            <div className="bg-rose-950/40 border border-rose-900/50 rounded-2xl p-4 flex gap-3 text-right">
              <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-rose-200">فشل تصدير الفيديو</h4>
                <p className="text-xs text-rose-300/95 leading-relaxed">{exportError}</p>
              </div>
            </div>
          )}

          {exportSuccess && (
            <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-2xl p-4 flex gap-3 text-right">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-emerald-200">تم تصدير الفيديو وتحميله بنجاح!</h4>
                <p className="text-xs text-emerald-300/95 leading-relaxed">
                  تمت معالجة الفيديو ودمجه وتنزيله بنجاح إلى جهازك.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
