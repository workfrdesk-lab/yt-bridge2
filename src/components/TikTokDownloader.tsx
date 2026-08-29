import { useState } from "react";
import { Loader2, Download, Search, Edit3, Upload } from "lucide-react";
import VideoEditor from "./VideoEditor";
import CloudinaryUploader from "./CloudinaryUploader";
import { VideoInfo } from "../types";

interface TikTokDownloaderProps {
  onUploadSuccess: (cloudinaryUrl: string, video: VideoInfo) => void;
}

export default function TikTokDownloader({ onUploadSuccess }: TikTokDownloaderProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [video, setVideo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleDownload = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setVideo(null);
    setIsEditing(false);

    try {
      const res = await fetch("/api/tiktok/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to download");
      
      // Convert to VideoInfo structure
      const videoInfo: VideoInfo = {
        id: data.id || "tiktok_" + Date.now(),
        title: data.title || "TikTok Video",
        thumbnail: data.thumbnail || "",
        duration: data.duration || 60,
        uploader: "TikTok User",
        description: "",
        bestVideoUrl: data.url,
        videoUrl: data.url,
        formats: []
      };
      setVideo(videoInfo);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isEditing && video) {
    return (
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-6">
        <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-slate-800">← عودة</button>
        <VideoEditor videoInfo={video} selectedFormat={null} />
        <CloudinaryUploader videoInfo={video} selectedFormat={null} onUploadSuccess={(url) => { onUploadSuccess(url, video); setIsEditing(false); }} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-6">
      <h2 className="text-xl font-bold text-slate-800">مستعرض TikTok</h2>
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="أدخل رابط تيك توك..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="flex-1 p-3 rounded-xl border border-slate-200"
        />
        <button
          onClick={handleDownload}
          disabled={loading}
          className="px-6 py-3 bg-zinc-950 text-white rounded-xl flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          تحميل
        </button>
      </div>
      {error && <p className="text-rose-500">{error}</p>}
      {video && (
        <div className="space-y-4">
          <h3 className="font-bold">{video.title}</h3>
          <video src={video.videoUrl} controls className="w-full rounded-xl" />
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="flex-1 p-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              تعديل
            </button>
            <a
              href={video.videoUrl}
              download
              className="flex-1 text-center p-3 bg-teal-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" />
              حفظ
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
