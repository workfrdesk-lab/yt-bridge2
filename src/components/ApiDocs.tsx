import React, { useState } from "react";
import { 
  Terminal, Code, BookOpen, Copy, Check, FileCode, Globe, 
  Send, Database, Lock, Eye, ChevronRight, Server, Play, Shield
} from "lucide-react";

interface ApiEndpoint {
  method: "GET" | "POST" | "ALL" | "DELETE";
  path: string;
  title: string;
  description: string;
  headers: Record<string, string>;
  requestBody?: Record<string, any>;
  queryParams?: Record<string, any>;
  responseExample: Record<string, any>;
  curlTemplate: string;
  nodeTemplate: string;
  pythonTemplate: string;
}

export default function ApiDocs() {
  const [activeEndpointIdx, setActiveEndpointIdx] = useState(0);
  const [codeLanguage, setCodeLanguage] = useState<"curl" | "javascript" | "python">("curl");
  const [copied, setCopied] = useState(false);

  const endpoints: ApiEndpoint[] = [
    {
      method: "POST",
      path: "/api/video-info",
      title: "استخراج بيانات اليوتيوب",
      description: "يقوم باستخراج كافة معلومات الفيديو، الروابط المباشرة للبث والتنزيل، والصيغ المتوفرة لروابط يوتيوب الآمنة.",
      headers: {
        "Content-Type": "application/json"
      },
      requestBody: {
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        cookiesText: "# Netscape HTTP Cookie File\n# ..."
      },
      responseExample: {
        id: "dQw4w9WgXcQ",
        title: "Never Gonna Give You Up",
        thumbnail: "https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg",
        duration: 212,
        uploader: "Rick Astley",
        bestVideoUrl: "https://rr2---sn-ux37eunl.googlevideo.com/videoplayback?...",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        formats: [
          {
            formatId: "137",
            formatNote: "1080p",
            ext: "mp4",
            filesize: 45203010,
            resolution: "1920x1080",
            url: "https://googlevideo.com/..."
          }
        ]
      },
      curlTemplate: `curl -X POST "${window.location.origin}/api/video-info" \\
  -H "Content-Type: application/json" \\
  -d '{
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
  }'`,
      nodeTemplate: `const axios = require('axios');

axios.post('${window.location.origin}/api/video-info', {
  videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
})
.then(res => console.log(res.data))
.catch(err => console.error(err.message));`,
      pythonTemplate: `import requests

url = "${window.location.origin}/api/video-info"
payload = {
    "videoUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
}
response = requests.post(url, json=payload)
print(response.json())`
    },
    {
      method: "POST",
      path: "/api/tiktok/publish",
      title: "نشر فيديو تيك توك تلقائي",
      description: "يرفع وينشر مقطع الفيديو المعالج على حساب تيك توك المرتبط باستخدام كوكيز الجلسة بأمان تام وتفادي قيود الرفع.",
      headers: {
        "Content-Type": "application/json"
      },
      requestBody: {
        sessionid: "your_tiktok_sessionid_cookie_value",
        videoUrl: "https://cloudinary.com/your_video.mp4",
        caption: "تعديل مقطع الفيديو الرائع بالذكاء الاصطناعي #foryou #fyp",
        privacy: "public",
        allowComment: true,
        allowDuet: true,
        allowStitch: true
      },
      responseExample: {
        success: true,
        logs: [
          "بدء عملية التحقق من الحساب والاتصال بخوادم تيك توك...",
          "تم التحقق من جلسة العمل بنجاح.",
          "جاري تهيئة جلسة الرفع لملف الفيديو في خوادم تيك توك...",
          "تم النشر بنجاح على حسابك في تيك توك!"
        ],
        message: "تم رفع ونشر المقطع بنجاح على تيك توك!",
        postId: "post_834029103"
      },
      curlTemplate: `curl -X POST "${window.location.origin}/api/tiktok/publish" \\
  -H "Content-Type: application/json" \\
  -d '{
    "sessionid": "sessionid_value",
    "videoUrl": "https://example.com/video.mp4",
    "caption": "مقطع ذكي #fyp",
    "privacy": "public"
  }'`,
      nodeTemplate: `const axios = require('axios');

axios.post('${window.location.origin}/api/tiktok/publish', {
  sessionid: 'sessionid_value',
  videoUrl: 'https://example.com/video.mp4',
  caption: 'مقطع ذكي #fyp',
  privacy: 'public'
})
.then(res => console.log(res.data))
.catch(err => console.error(err));`,
      pythonTemplate: `import requests

url = "${window.location.origin}/api/tiktok/publish"
payload = {
    "sessionid": "sessionid_value",
    "videoUrl": "https://example.com/video.mp4",
    "caption": "مقطع ذكي #fyp",
    "privacy": "public"
}
response = requests.post(url, json=payload)
print(response.json())`
    },
    {
      method: "ALL",
      path: "/api/export-video",
      title: "بث ومعالجة الفيديوهات الفورية (FFmpeg)",
      description: "يقوم بقص وتعديل وتغيير سرعة وحجم الصوت ومحاذاة الفيديوهات لتجنب الكوبيرايت وبثها مباشرة كملف MP4 جاهز للتنزيل.",
      headers: {
        "Accept": "video/mp4"
      },
      queryParams: {
        directUrl: "https://googlevideo.com/...",
        startTime: 0,
        endTime: 15,
        speed: 1.05,
        avoidCopyright: true,
        volume: 1.0,
        colorFilter: "vintage",
        brightness: 100,
        contrast: 100,
        saturation: 100
      },
      responseExample: {
        "content-type": "video/mp4",
        "content-disposition": "attachment; filename=Edited_Video_1710291.mp4",
        "body": "Binary MP4 Video Stream"
      },
      curlTemplate: `curl -L -G "${window.location.origin}/api/export-video" \\
  --data-urlencode "directUrl=https://example.com/stream.mp4" \\
  -d "startTime=0" \\
  -d "endTime=15" \\
  -d "avoidCopyright=true" \\
  -o "edited_video.mp4"`,
      nodeTemplate: `// مباشر في المتصفح أو البث بـ Node.js
const fs = require('fs');
const axios = require('axios');

axios({
  method: 'get',
  url: '${window.location.origin}/api/export-video',
  params: {
    directUrl: 'https://example.com/stream.mp4',
    startTime: 0,
    endTime: 15,
    avoidCopyright: 'true'
  },
  responseType: 'stream'
})
.then(res => {
  res.data.pipe(fs.createWriteStream('edited.mp4'));
});`,
      pythonTemplate: `import requests

url = "${window.location.origin}/api/export-video"
params = {
    "directUrl": "https://example.com/stream.mp4",
    "startTime": 0,
    "endTime": 15,
    "avoidCopyright": "true"
}
response = requests.get(url, params=params, stream=True)
with open("edited.mp4", "wb") as f:
    for chunk in response.iter_content(chunk_size=1024):
        f.write(chunk)`
    }
  ];

  const activeEndpoint = endpoints[activeEndpointIdx];

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeCodeSnippet = 
    codeLanguage === "curl" 
      ? activeEndpoint.curlTemplate 
      : codeLanguage === "javascript" 
      ? activeEndpoint.nodeTemplate 
      : activeEndpoint.pythonTemplate;

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 md:p-8 text-slate-100 shadow-2xl font-sans" id="api-docs-root">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-6 gap-4 text-right">
        <div className="flex items-center gap-3 justify-end md:order-2">
          <div>
            <h3 className="text-lg md:text-xl font-bold flex items-center gap-2 justify-end">
              <span>مركز المطورين وواجهات الـ API</span>
              <BookOpen className="w-5 h-5 text-indigo-400" />
            </h3>
            <p className="text-xs text-slate-400">
              واجهات برمجة برمجية حرة وموثقة لجميع منشئي المحتوى ومطوري التطبيقات للتحكم بالأتمتة عن بعد.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 md:order-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800/80">
          <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
          <span className="text-[10px] text-slate-400 font-mono font-bold">API STATUS: ONLINE</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6">
        
        {/* RIGHT PANEL: Directory of Endpoints */}
        <div className="lg:col-span-4 space-y-3 lg:border-l lg:border-slate-800/80 lg:pl-6 text-right">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">قائمة الواجهات المتاحة</h4>
          <div className="space-y-1.5">
            {endpoints.map((ep, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setActiveEndpointIdx(idx);
                  setCopied(false);
                }}
                className={`w-full p-3.5 rounded-2xl border text-right transition-all cursor-pointer flex flex-col gap-1 ${
                  activeEndpointIdx === idx
                    ? "bg-indigo-600/10 border-indigo-500/30 shadow-md text-white"
                    : "bg-slate-950/40 border-transparent hover:bg-slate-950/70 text-slate-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[9px] font-mono font-bold ${
                    ep.method === "POST" 
                      ? "bg-emerald-950 text-emerald-400 border border-emerald-900" 
                      : ep.method === "ALL" 
                      ? "bg-indigo-950 text-indigo-400 border border-indigo-900" 
                      : "bg-blue-950 text-blue-400"
                  }`}>
                    {ep.method}
                  </span>
                  <span className="text-xs font-bold truncate max-w-[150px]">{ep.title}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400 truncate text-left" style={{ direction: "ltr" }}>{ep.path}</span>
              </button>
            ))}
          </div>

          <div className="bg-slate-950/60 p-4 border border-slate-800/80 rounded-2xl space-y-2 mt-4">
            <h5 className="text-[11px] font-bold text-slate-200 flex items-center gap-1.5 justify-end">
              <span>المصادقة والأمان</span>
              <Lock className="w-3.5 h-3.5 text-amber-500" />
            </h5>
            <p className="text-[10px] text-slate-400 leading-normal">
              تتم حماية العمليات التلقائية باستخدام رمز الجلسة الفردي (sessionid). لا تقم بمشاركة هذا الرمز مع أي شخص مجهول لحماية حسابك من السرقة.
            </p>
          </div>
        </div>

        {/* LEFT PANEL: Details & Live Sandbox preview */}
        <div className="lg:col-span-8 space-y-6">
          <div className="space-y-2 text-right">
            <h3 className="text-md font-bold text-white flex items-center gap-2 justify-end">
              <span>{activeEndpoint.title}</span>
              <Server className="w-4 h-4 text-indigo-400" />
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              {activeEndpoint.description}
            </p>
          </div>

          {/* Code Builder Panel */}
          <div className="border border-slate-800 rounded-2xl bg-slate-950 overflow-hidden">
            <div className="flex items-center justify-between bg-slate-900/80 px-4 py-2.5 border-b border-slate-800">
              <button
                onClick={() => handleCopyCode(activeCodeSnippet)}
                className="px-2.5 py-1.5 bg-slate-800 hover:bg-indigo-600 text-[10px] font-bold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1 font-mono"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-400" />
                    <span>COPIED!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>COPY CODE</span>
                  </>
                )}
              </button>

              {/* Language Picker */}
              <div className="flex items-center gap-1.5 text-[10px] font-mono">
                <button
                  onClick={() => setCodeLanguage("python")}
                  className={`px-2.5 py-1 rounded ${codeLanguage === "python" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Python
                </button>
                <button
                  onClick={() => setCodeLanguage("javascript")}
                  className={`px-2.5 py-1 rounded ${codeLanguage === "javascript" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  NodeJS
                </button>
                <button
                  onClick={() => setCodeLanguage("curl")}
                  className={`px-2.5 py-1 rounded ${codeLanguage === "curl" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  cURL
                </button>
              </div>
            </div>

            <pre className="p-4 text-left font-mono text-[11px] text-indigo-200 overflow-x-auto bg-slate-950 max-h-56" style={{ direction: "ltr" }}>
              {activeCodeSnippet}
            </pre>
          </div>

          {/* Query Params or Request Body Table */}
          {activeEndpoint.requestBody && (
            <div className="space-y-2 text-right">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">نموذج جسم الطلب (JSON Request Body)</h4>
              <pre className="p-4 text-left font-mono text-[10px] bg-slate-950 border border-slate-800/80 rounded-2xl text-slate-300" style={{ direction: "ltr" }}>
                {JSON.stringify(activeEndpoint.requestBody, null, 2)}
              </pre>
            </div>
          )}

          {/* Response Example Panel */}
          <div className="space-y-2 text-right">
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400">نموذج الاستجابة الناجحة (Response Schema)</h4>
            <pre className="p-4 text-left font-mono text-[10px] bg-slate-950 border border-slate-800/80 rounded-2xl text-emerald-400" style={{ direction: "ltr" }}>
              {JSON.stringify(activeEndpoint.responseExample, null, 2)}
            </pre>
          </div>

        </div>
      </div>
    </div>
  );
}
