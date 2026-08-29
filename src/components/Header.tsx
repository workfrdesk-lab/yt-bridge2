import { Youtube, Cloud, Heart } from "lucide-react";

export default function Header() {
  return (
    <header className="w-full py-6 px-4 bg-white border-b border-slate-100 shadow-xs" id="app-header">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100">
            <Youtube className="w-6 h-6 text-rose-600" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
            </span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
              ساحب اليوتيوب إلى كلاوديناري
            </h1>
            <p className="text-xs text-slate-500">
              سحب مباشر، تشغيل فوري، ورفع سحابي بضغطة زر
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
          <Cloud className="w-4 h-4 text-sky-500 animate-pulse" />
          <span className="text-xs font-mono text-slate-600 font-medium">Cloudinary API integration</span>
        </div>
      </div>
    </header>
  );
}
