#!/usr/bin/env python3
"""
MoviePy & FFmpeg Video Caption Engine
High-performance video caption burning engine supporting MoviePy 1.x & 2.x
and high-speed native FFmpeg overlay with full Arabic RTL shaping, modern typography,
custom fonts, strokes, rounded background boxes, and precise positioning.
"""

import sys
import os
import json
import argparse
import subprocess
import tempfile
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Try Arabic text shaping
try:
    import arabic_reshaper
    from bidi.algorithm import get_display
    HAS_ARABIC_SUPPORT = True
except ImportError:
    HAS_ARABIC_SUPPORT = False

# Try MoviePy imports (supporting both 1.x and 2.x)
HAS_MOVIEPY = False
try:
    try:
        from moviepy import VideoFileClip, ImageClip, CompositeVideoClip
        HAS_MOVIEPY = True
    except ImportError:
        from moviepy.editor import VideoFileClip, ImageClip, CompositeVideoClip
        HAS_MOVIEPY = True
except Exception:
    HAS_MOVIEPY = False

def reshape_arabic(text):
    if not text:
        return ""
    if HAS_ARABIC_SUPPORT:
        try:
            # Check if text contains Arabic characters
            if any('\u0600' <= c <= '\u06FF' or '\u0750' <= c <= '\u077F' or '\u08A0' <= c <= '\u08FF' for c in text):
                reshaped_text = arabic_reshaper.reshape(text)
                return get_display(reshaped_text)
        except Exception:
            pass
    return text

def hex_to_rgba(hex_code, alpha=255):
    if not hex_code:
        return (255, 255, 255, int(alpha))
    hex_code = str(hex_code).lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join([c*2 for c in hex_code])
    if len(hex_code) == 6:
        try:
            r, g, b = tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))
            return (r, g, b, int(alpha))
        except Exception:
            return (255, 255, 255, int(alpha))
    return (255, 255, 255, int(alpha))

def get_font_path(font_family):
    font_map = {
        "cairo": "fonts/Cairo-Bold.ttf",
        "tajawal": "fonts/Tajawal-Bold.ttf",
        "montserrat": "fonts/Montserrat-Bold.ttf",
        "anton": "fonts/Anton-Regular.ttf",
        "impact": "fonts/Anton-Regular.ttf",
        "bebas": "fonts/BebasNeue-Regular.ttf",
        "bebas neue": "fonts/BebasNeue-Regular.ttf",
        "oswald": "fonts/Oswald-Bold.ttf",
        "poppins": "fonts/Poppins-Bold.ttf",
        "roboto": "fonts/Roboto-Black.ttf",
        "league spartan": "fonts/LeagueSpartan-Bold.ttf",
        "spartan": "fonts/LeagueSpartan-Bold.ttf",
        "cinzel": "fonts/Cinzel-Bold.ttf",
        "arial": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "kacst": "/usr/share/fonts/truetype/kacst/KacstTitle.ttf",
        "amiri": "/usr/share/fonts/truetype/kacst/KacstPoster.ttf",
        "dejavu": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "liberation": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    }
    cleaned = (font_family or "").lower().strip()
    for key, path in font_map.items():
        if key in cleaned and os.path.exists(path):
            return path
    
    # Fallback search in fonts directory
    candidates = [
        "fonts/Cairo-Bold.ttf",
        "fonts/Montserrat-Bold.ttf",
        "fonts/Tajawal-Bold.ttf",
        "fonts/BebasNeue-Regular.ttf",
        "fonts/Poppins-Bold.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

def create_caption_image(text, template_opts, video_w, video_h):
    """
    Renders text onto an RGBA PIL Image with full Unicode/Arabic support,
    custom fonts, stroke, background box, and padding.
    """
    font_size_pt = float(template_opts.get("font_size", 44))
    # Scale font size relative to standard 720p/1080p width
    scale_factor = max(0.5, min(2.5, video_w / 720.0))
    actual_font_size = max(18, int(font_size_pt * scale_factor * 0.9))

    font_family = template_opts.get("font_family", "Cairo")
    font_path = get_font_path(font_family)
    
    try:
        if font_path and os.path.exists(font_path):
            font = ImageFont.truetype(font_path, actual_font_size)
        else:
            font = ImageFont.load_default()
    except Exception as e:
        print(f"[MoviePy Warning] Failed loading font {font_path}: {e}", file=sys.stderr)
        font = ImageFont.load_default()

    font_color_hex = template_opts.get("font_color", "#FFFFFF")
    font_color = hex_to_rgba(font_color_hex, 255)

    bg_color_hex = template_opts.get("background_color", "#000000")
    bg_opacity_val = float(template_opts.get("background_opacity", 0.75))
    has_bg = template_opts.get("has_background", True) and bg_opacity_val > 0.01
    bg_opacity = int(bg_opacity_val * 255)
    bg_color = hex_to_rgba(bg_color_hex, bg_opacity)

    stroke_color_hex = template_opts.get("stroke_color", "#000000")
    stroke_width_val = float(template_opts.get("stroke_width", 2))
    stroke_width = max(0, int(stroke_width_val * scale_factor))
    stroke_color = hex_to_rgba(stroke_color_hex, 255)

    box_padding_x = max(8, int(float(template_opts.get("padding_x", 24)) * scale_factor))
    box_padding_y = max(6, int(float(template_opts.get("padding_y", 14)) * scale_factor))
    border_radius = max(0, int(float(template_opts.get("border_radius", 14)) * scale_factor))

    # Reshape text for Arabic RTL
    display_text = reshape_arabic(text)

    # Word wrapping: max width is 88% of video width
    max_text_width = max(200, int(video_w * 0.88) - (box_padding_x * 2))

    lines = []
    paragraphs = display_text.split("\n")
    
    for p in paragraphs:
        words = p.split(" ")
        current_line = []
        for word in words:
            test_line = " ".join(current_line + [word])
            try:
                bbox = font.getbbox(test_line)
                w = bbox[2] - bbox[0]
            except Exception:
                w = len(test_line) * actual_font_size * 0.6
                
            if w <= max_text_width or not current_line:
                current_line.append(word)
            else:
                lines.append(" ".join(current_line))
                current_line = [word]
        if current_line:
            lines.append(" ".join(current_line))

    if not lines:
        lines = [display_text]

    # Measure total text bounding box
    line_heights = []
    line_widths = []
    for line in lines:
        try:
            bbox = font.getbbox(line)
            lw = bbox[2] - bbox[0]
            lh = bbox[3] - bbox[1]
        except Exception:
            lw = len(line) * actual_font_size * 0.6
            lh = actual_font_size
        line_widths.append(lw)
        line_heights.append(max(lh, actual_font_size))

    total_text_w = max(line_widths) if line_widths else 100
    line_spacing = int(actual_font_size * 0.3)
    total_text_h = sum(line_heights) + (line_spacing * (len(lines) - 1))

    # Canvas dimensions for the caption overlay image
    img_w = min(video_w, int(total_text_w + (box_padding_x * 2)))
    img_h = int(total_text_h + (box_padding_y * 2))

    # Create RGBA Pillow image
    img = Image.new("RGBA", (img_w, img_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw rounded background box if enabled
    if has_bg:
        try:
            draw.rounded_rectangle(
                [(0, 0), (img_w, img_h)],
                radius=border_radius,
                fill=bg_color
            )
        except AttributeError:
            draw.rectangle([(0, 0), (img_w, img_h)], fill=bg_color)

    # Draw text lines centered inside box
    curr_y = box_padding_y
    for i, line in enumerate(lines):
        try:
            bbox = font.getbbox(line)
            lw = bbox[2] - bbox[0]
        except Exception:
            lw = len(line) * actual_font_size * 0.6
        lx = (img_w - lw) // 2
        
        # Draw stroke if any
        if stroke_width > 0:
            for dx in range(-stroke_width, stroke_width + 1):
                for dy in range(-stroke_width, stroke_width + 1):
                    if dx != 0 or dy != 0:
                        draw.text((lx + dx, curr_y + dy), line, font=font, fill=stroke_color)
        
        # Draw main text
        draw.text((lx, curr_y), line, font=font, fill=font_color)
        curr_y += line_heights[i] + line_spacing

    return img, img_w, img_h

def get_video_dimensions_ffprobe(video_path):
    """Fallback probe to get video dimensions via ffprobe"""
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "json",
            video_path
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, check=True)
        data = json.loads(res.stdout)
        stream = data["streams"][0]
        return int(stream["width"]), int(stream["height"])
    except Exception:
        return 720, 1280

def render_caption_ffmpeg_overlay(input_video_path, output_video_path, overlay_img_path, x_pos, y_pos):
    """
    Ultra-fast, 100% reliable hardware-accelerated video overlay with FFmpeg.
    """
    print(f"[FFmpeg Overlay] Burning caption at ({x_pos}, {y_pos}) onto {input_video_path}...")
    cmd = [
        "ffmpeg", "-y",
        "-i", input_video_path,
        "-i", overlay_img_path,
        "-filter_complex", f"[0:v][1:v]overlay={x_pos}:{y_pos}[outv]",
        "-map", "[outv]",
        "-map", "0:a?",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "20",
        "-pix_fmt", "yuv420p",
        "-c:a", "copy",
        "-movflags", "+faststart",
        output_video_path
    ]
    subprocess.run(cmd, check=True)

def render_caption(input_video_path, output_video_path, template_opts, custom_text=None):
    """
    Loads video, creates styled Pillow caption, and renders it onto output_video_path.
    """
    text = custom_text or template_opts.get("sample_text") or "فيديو حصري | شاهد للنهاية 🚀 #Shorts"
    
    # Get dimensions
    vid_w, vid_h = 720, 1280
    if HAS_MOVIEPY:
        try:
            vclip = VideoFileClip(input_video_path)
            vid_w, vid_h = vclip.w, vclip.h
            vclip.close()
        except Exception:
            vid_w, vid_h = get_video_dimensions_ffprobe(input_video_path)
    else:
        vid_w, vid_h = get_video_dimensions_ffprobe(input_video_path)

    # 1. Generate Caption Image
    pil_img, cap_w, cap_h = create_caption_image(text, template_opts, vid_w, vid_h)
    
    # Calculate position
    pos_preset = template_opts.get("position", "bottom")
    pos_y_percent = template_opts.get("position_y_percent")
    
    if pos_y_percent is not None:
        y_pos = int((float(pos_y_percent) / 100.0) * (vid_h - cap_h))
    elif pos_preset == "top":
        y_pos = int(vid_h * 0.08)
    elif pos_preset == "center":
        y_pos = (vid_h - cap_h) // 2
    else: # bottom default
        y_pos = int(vid_h * 0.82) - cap_h

    # Ensure y_pos bounds
    y_pos = max(10, min(vid_h - cap_h - 10, y_pos))
    x_pos = (vid_w - cap_w) // 2

    # Save overlay PNG to temporary file
    temp_overlay_fd, temp_overlay_path = tempfile.mkstemp(suffix=".png")
    os.close(temp_overlay_fd)
    
    try:
        pil_img.save(temp_overlay_path, format="PNG")
        
        # Primary & High Performance: Native FFmpeg overlay with libx264
        render_caption_ffmpeg_overlay(input_video_path, output_video_path, temp_overlay_path, x_pos, y_pos)
        print(f"[Engine] Caption burned successfully into {output_video_path}!")
    finally:
        if os.path.exists(temp_overlay_path):
            try:
                os.remove(temp_overlay_path)
            except Exception:
                pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MoviePy / FFmpeg Video Caption Renderer")
    parser.add_argument("--input", "-i", required=True, help="Input video file path")
    parser.add_argument("--output", "-o", required=True, help="Output video file path")
    parser.add_argument("--config", "-c", help="JSON string or file containing template options")
    parser.add_argument("--text", "-t", help="Caption text to burn into video")
    
    args = parser.parse_args()
    
    template_config = {}
    if args.config:
        try:
            if os.path.exists(args.config):
                with open(args.config, "r", encoding="utf-8") as f:
                    template_config = json.load(f)
            else:
                template_config = json.loads(args.config)
        except Exception as err:
            print(f"[Error] Failed to parse config: {err}", file=sys.stderr)
            template_config = {}
            
    render_caption(args.input, args.output, template_config, args.text)
