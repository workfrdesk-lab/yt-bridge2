import { useState } from "react";
import { VideoInfo, VideoFormat } from "../types";
import { User, Clock, ChevronDown, ChevronUp, CheckCircle, ExternalLink, Download, Copy, CopyCheck, FileText, RefreshCw, Loader2, AlertTriangle } from "lucide-react";

interface VideoDetailsProps {
  videoInfo: VideoInfo;
  selectedFormat: VideoFormat | null;
  onFormatSelect: (format: VideoFormat) => void;
}

export default function VideoDetails({ videoInfo, selectedFormat, onFormatSelect }: VideoDetailsProps) {
  const [showFullDesc, setShowFullDesc] = useState(true);
  const [copiedText, setCopiedText] = useState(false);
  const [playerError, setPlayerError] = useState(false);
  const [repreparing, setRepreparing] = useState(false);
  const [currentStreamUrl, setCurrentStreamUrl] = useState<string | null>(null);

  const activeStreamUrl = currentStreamUrl || (selectedFormat ? selectedFormat.url || videoInfo.bestVideoUrl : videoInfo.bestVideoUrl);

  // Helper to format duration
  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? "0" : ""}${mins}:${secs < 10 ? "0" : ""}${secs}`;
    }
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Helper to format file size
  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "غير معروف";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)} ميجابايت`;
  };

  // Force re-download/prepare stream via server
  const handleReprepareStream = async () => {
    setRepreparing(true);
    setPlayerError(false);

    try {
      const res = await fetch("/api/social-video-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoInfo.videoUrl || videoInfo.youtubeUrl || activeStreamUrl,
          directVideoUrl: activeStreamUrl && activeStreamUrl.startsWith("http") ? activeStreamUrl : undefined,
          title: videoInfo.title,
          thumbnail: videoInfo.thumbnail,
          uploader: videoInfo.uploader,
          description: videoInfo.description
        })
      });

      const data = await res.json();
      if (res.ok && data.bestVideoUrl) {
        setCurrentStreamUrl(data.bestVideoUrl);
        setPlayerError(false);
      } else {
        setPlayerError(true);
      }
    } catch (e) {
      console.error("[VideoDetails] Stream prepare error:", e);
      setPlayerError(true);
    } finally {
      setRepreparing(false);
    }
  };

  const fullCaption = videoInfo.description || videoInfo.title || "";

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden" id="video-details-panel">
      {/* Video Stream Player Section */}
      <div className="bg-slate-950 aspect-video w-full relative flex items-center justify-center border-b border-slate-900 group">
        {!playerError ? (
          <video
            key={activeStreamUrl}
            src={activeStreamUrl}
            controls
            autoPlay={false}
            playsInline
            className="w-full h-full max-h-[480px] object-contain"
            poster={videoInfo.thumbnail}
            onError={() => {
              console.warn("[VideoDetails] Video tag failed to play stream URL:", activeStreamUrl);
              setPlayerError(true);
            }}
          >
            متصفحك لا يدعم مشغل الفيديو.
          </video>
        ) : (
          <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 z-10">
            {videoInfo.thumbnail && (
              <img src={videoInfo.thumbnail} alt={videoInfo.title} className="absolute inset-0 w-full h-full object-cover opacity-20" />
            )}
            <div className="relative z-10 p-3 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="relative z-10 space-y-1 max-w-md">
              <p className="text-xs font-bold text-white">
                تعذر تشغيل الفيديو مباشرة داخل المتصفح بسبب قيود حماية المنصة
              </p>
              <p className="text-[11px] text-slate-300">
                يمكنك الضغط على الزر أدناه لتجهيز وتنزيل المقطع كاملاً على الخادم وتشغيله بسلاسة.
              </p>
            </div>
            <button
              type="button"
              onClick={handleReprepareStream}
              disabled={repreparing}
              className="relative z-10 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-2 shadow-lg"
            >
              {repreparing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>جاري معالجة وتنزيل الفيديو عبر الخادم...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  <span>إعادة معالجة وتجهيز المقطع المباشر ⚡</span>
                </>
              )}
            </button>
          </div>
        )}

        <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] text-slate-300 pointer-events-none flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>مشغل البث المباشر</span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Title and Channel Info */}
        <div className="space-y-3">
          <h2 className="text-lg md:text-xl font-bold text-slate-800 leading-snug">
            {videoInfo.title}
          </h2>
          
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 pb-4 border-b border-slate-50">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4 text-indigo-500" />
              <span className="font-semibold text-slate-700">{videoInfo.uploader}</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-emerald-500" />
              <span>{formatDuration(videoInfo.duration)}</span>
            </div>
          </div>
        </div>

        {/* Video Formats Selector */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              صيغ البث والجودة المتاحة
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">
              جاري استخدام: {selectedFormat ? selectedFormat.formatNote : "أفضل جودة تلقائية"}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setPlayerError(false);
                onFormatSelect({
                  formatId: "best",
                  formatNote: "أفضل جودة تلقائية",
                  ext: "mp4",
                  filesize: null,
                  resolution: "Original",
                  url: videoInfo.bestVideoUrl
                });
              }}
              className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
                !selectedFormat || selectedFormat.formatId === "best"
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                  : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span>أفضل جودة</span>
              {(!selectedFormat || selectedFormat.formatId === "best") && (
                <CheckCircle className="w-3.5 h-3.5" />
              )}
            </button>

            {videoInfo.formats.slice(0, 8).map((fmt) => (
              <button
                key={fmt.formatId}
                onClick={() => {
                  setPlayerError(false);
                  onFormatSelect(fmt);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all duration-200 border flex items-center gap-1.5 ${
                  selectedFormat?.formatId === fmt.formatId
                    ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                    : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>{fmt.formatNote} ({fmt.ext})</span>
                {fmt.filesize && (
                  <span className={`text-[9px] ${
                    selectedFormat?.formatId === fmt.formatId ? "text-indigo-200" : "text-slate-400"
                  }`}>
                    {formatFileSize(fmt.filesize)}
                  </span>
                )}
                {selectedFormat?.formatId === fmt.formatId && (
                  <CheckCircle className="w-3.5 h-3.5" />
                )}
              </button>
            ))}
          </div>
          
          <div className="flex flex-wrap gap-2 pt-1.5">
            <a
              href={activeStreamUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline bg-indigo-50/50 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>فتح رابط البث في علامة تبويب جديدة</span>
            </a>
            <a
              href={activeStreamUrl}
              download={`${videoInfo.title || "video"}.mp4`}
              className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-800 font-semibold hover:underline bg-emerald-50/50 hover:bg-emerald-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>تحميل مباشر للملف</span>
            </a>
          </div>
        </div>

        {/* Video Description & Caption Section */}
        {fullCaption && (
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3 text-right">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>نص وصف المنشور المستورد مع الفيديو:</span>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(fullCaption);
                    setCopiedText(true);
                    setTimeout(() => setCopiedText(false), 2500);
                  }}
                  className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  {copiedText ? (
                    <>
                      <CopyCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">تم النسخ بنجاح!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>نسخ النص كاملاً</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowFullDesc(!showFullDesc)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-200/60 cursor-pointer"
                >
                  {showFullDesc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>
            
            <div className={`p-3 bg-white rounded-xl border border-slate-100 font-sans text-xs text-slate-700 whitespace-pre-wrap leading-relaxed transition-all ${
              showFullDesc ? "max-h-60 overflow-y-auto" : "line-clamp-3"
            }`}>
              {fullCaption}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
