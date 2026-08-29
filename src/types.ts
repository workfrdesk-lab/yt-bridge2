export interface VideoFormat {
  formatId: string;
  formatNote: string;
  ext: string;
  filesize: number | null;
  resolution: string;
  url: string | null;
}

export interface VideoInfo {
  id: string;
  title: string;
  thumbnail: string;
  duration: number; // in seconds
  uploader: string;
  description: string;
  bestVideoUrl: string;
  videoUrl: string;
  youtubeUrl?: string;
  cookiesText?: string;
  formats: VideoFormat[];
}

export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  duration: number;
  width: number;
  height: number;
  format: string;
}

export interface SocialVideo {
  id: string;
  title: string;
  description?: string;
  url: string;
  directVideoUrl?: string;
  thumbnail: string;
  duration: number;
  views?: number | null;
  likes?: number | null;
  uploadDate?: string | null;
  uploader?: string;
  platform: "tiktok" | "facebook";
}

export interface SocialChannelData {
  platform: "tiktok" | "facebook";
  accountName: string;
  accountUrl: string;
  videos: SocialVideo[];
}

export interface CaptionTemplate {
  id: string;
  user_id?: string | null;
  name: string;
  font_family: "Cairo" | "Tajawal" | "Montserrat" | "Anton" | "DejaVu" | "Amiri" | string;
  font_size: number;
  font_color: string;
  background_color: string;
  background_opacity: number;
  has_background: boolean;
  stroke_color: string;
  stroke_width: number;
  position: "top" | "center" | "bottom" | "custom";
  position_y_percent: number;
  padding_x: number;
  padding_y: number;
  border_radius: number;
  sample_text: string;
  text_source?: "title" | "custom" | "ai_summary";
  is_default?: boolean;
  created_at?: string;
}

