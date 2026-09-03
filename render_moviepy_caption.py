#!/usr/bin/env python3
"""
High-Performance, Multi-Layer Video Caption Burning Engine
Renders crisp, RTL-aware, beautifully styled captions with custom fonts,
colors, strokes, opacity, rounded background boxes, and precise positioning.

Supports:
1. Native ImageMagick (convert / magick) if available
2. Native FFmpeg Vector SVG Rendering Engine (Zero external dependencies, 100% portable)
3. FFmpeg drawtext fallback
"""

import sys
import os
import shutil
import json
import argparse
import subprocess
import tempfile
import math
import html

def get_font_path(font_family):
    font_map = {
        "cairo": "fonts/Cairo-Bold.ttf",
        "tajawal": "fonts/Tajawal-Bold.ttf",
        "almarai": "fonts/Almarai-Bold.ttf",
        "amiri": "fonts/Amiri-Bold.ttf",
        "changa": "fonts/Changa-Bold.ttf",
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
        "dejavu": "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
        "liberation": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
        "arial": "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf"
    }
    cleaned = (font_family or "").lower().strip()
    for key, path in font_map.items():
        abs_p = os.path.abspath(path)
        if key in cleaned and (os.path.exists(path) or os.path.exists(abs_p)):
            return abs_p if os.path.exists(abs_p) else path

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
        abs_c = os.path.abspath(c)
        if os.path.exists(c):
            return abs_c
        if os.path.exists(abs_c):
            return abs_c
    return "Arial"

def hex_to_rgb(hex_code):
    if not hex_code:
        return 0, 0, 0
    hex_code = str(hex_code).lstrip('#')
    if len(hex_code) == 3:
        hex_code = ''.join([c*2 for c in hex_code])
    if len(hex_code) == 6:
        try:
            return int(hex_code[0:2], 16), int(hex_code[2:4], 16), int(hex_code[4:6], 16)
        except Exception:
            return 0, 0, 0
    return 0, 0, 0

def hex_to_rgba_str(hex_code, opacity=1.0):
    r, g, b = hex_to_rgb(hex_code)
    return f"rgba({r},{g},{b},{opacity})"

def find_imagemagick():
    """
    Look for working ImageMagick binary ('convert' or 'magick') and verify it.
    Returns (convert_cmd, identify_cmd) or None.
    """
    # Look in PATH
    for name in ["convert", "magick"]:
        p = shutil.which(name)
        if p:
            try:
                res = subprocess.run([p, "-version"], capture_output=True, text=True, timeout=2)
                if res.returncode == 0:
                    ident = shutil.which("identify") or (p if name == "magick" else None)
                    return (p, ident)
            except Exception:
                pass

    # Look in known Linux / Nix / Homebrew system directories
    candidates = [
        "/usr/bin/convert",
        "/usr/local/bin/convert",
        "/bin/convert",
        "/run/current-system/sw/bin/convert",
        "/nix/var/nix/profiles/default/bin/convert",
        "/usr/bin/magick",
        "/usr/local/bin/magick",
        "/run/current-system/sw/bin/magick"
    ]
    for cp in candidates:
        if os.path.isfile(cp) and os.access(cp, os.X_OK):
            try:
                res = subprocess.run([cp, "-version"], capture_output=True, text=True, timeout=2)
                if res.returncode == 0:
                    ident_candidate = os.path.join(os.path.dirname(cp), "identify")
                    ident = ident_candidate if os.path.isfile(ident_candidate) else cp
                    return (cp, ident)
            except Exception:
                pass
    return None

def get_video_dimensions_ffprobe(video_path):
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
    except Exception as e:
        print(f"[ffprobe Warning] Could not get video dimensions: {e}", file=sys.stderr)
        return 720, 1280

def wrap_text_for_card(text, max_chars_per_line=30):
    """
    Wraps text neatly into multiple lines without breaking words.
    """
    text = (text or "").strip()
    if not text:
        return ["Follow for more 🚀"]

    words = text.split()
    lines = []
    curr = []
    curr_len = 0

    for w in words:
        w_len = len(w)
        if curr_len + w_len + (1 if curr else 0) <= max_chars_per_line:
            curr.append(w)
            curr_len += w_len + (1 if len(curr) > 1 else 0)
        else:
            if curr:
                lines.append(" ".join(curr))
            curr = [w]
            curr_len = w_len

    if curr:
        lines.append(" ".join(curr))

    return lines or [text]

def build_caption_overlay_svg(text, template_opts, video_w, video_h, output_png):
    """
    Renders styled text and background card into an RGBA PNG using native SVG + FFmpeg.
    Zero ImageMagick dependency, 100% portable on all Linux/Nix/Docker platforms.
    """
    font_size_pt = float(template_opts.get("font_size") or 44)
    scale_factor = max(0.5, min(2.5, video_w / 720.0))
    actual_font_size = max(16, int(font_size_pt * scale_factor * 0.88))

    font_family = template_opts.get("font_family") or "Cairo"
    font_path = get_font_path(font_family)
    font_abs_path = os.path.abspath(font_path) if os.path.exists(font_path) else font_path

    font_color = str(template_opts.get("font_color") or "#FFFFFF")
    bg_color = str(template_opts.get("background_color") or "#000000")
    bg_opacity_val = float(template_opts.get("background_opacity") if template_opts.get("background_opacity") is not None else 0.75)
    has_bg = bool(template_opts.get("has_background", True)) and bg_opacity_val > 0.01

    stroke_color = str(template_opts.get("stroke_color") or "#000000")
    stroke_width_val = float(template_opts.get("stroke_width") or 0)
    stroke_width = max(0, int(stroke_width_val * scale_factor))

    pad_x = max(14, int(float(template_opts.get("padding_x") or 22) * scale_factor))
    pad_y = max(10, int(float(template_opts.get("padding_y") or 12) * scale_factor))
    radius = max(4, int(float(template_opts.get("border_radius") or 16) * scale_factor))

    # Calculate optimal characters per line based on video width and font size
    chars_per_line = max(16, int((video_w * 0.82) / (actual_font_size * 0.60)))
    lines = wrap_text_for_card(text, chars_per_line)

    line_height = int(actual_font_size * 1.35)
    text_content_h = len(lines) * line_height
    max_line_len = max(len(l) for l in lines)
    est_text_w = int(max_line_len * actual_font_size * 0.62)
    max_card_w = max(180, int(video_w * 0.88))
    card_w = min(max_card_w, max(180, est_text_w + (pad_x * 2)))
    card_h = text_content_h + (pad_y * 2)

    rgba_bg = hex_to_rgba_str(bg_color, bg_opacity_val) if has_bg else "none"

    stroke_style = ""
    if stroke_width > 0:
        stroke_style = f'stroke="{stroke_color}" stroke-width="{stroke_width}" paint-order="stroke fill"'

    font_face_block = ""
    if os.path.exists(font_abs_path):
        font_face_block = f"""
      @font-face {{
        font-family: 'CaptionCustomFont';
        src: url('{font_abs_path}');
      }}"""

    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{card_w}" height="{card_h}">
  <defs>
    <style>{font_face_block}
      .cap-text {{
        font-family: 'CaptionCustomFont', 'Cairo', 'Montserrat', Arial, sans-serif;
        font-size: {actual_font_size}px;
        font-weight: bold;
        fill: {font_color};
      }}
    </style>
  </defs>
"""

    if has_bg:
        svg_content += f'  <rect x="0" y="0" width="{card_w}" height="{card_h}" rx="{radius}" ry="{radius}" fill="{rgba_bg}"/>\n'

    start_y = pad_y + int(actual_font_size * 0.95)
    svg_content += f'  <text x="{card_w // 2}" y="{start_y}" class="cap-text" text-anchor="middle" dominant-baseline="alphabetic" {stroke_style} direction="rtl">\n'
    for i, line in enumerate(lines):
        dy = 0 if i == 0 else line_height
        safe_line = html.escape(line)
        svg_content += f'    <tspan x="{card_w // 2}" dy="{dy}">{safe_line}</tspan>\n'
    svg_content += "  </text>\n</svg>"

    tmp_svg = output_png + ".svg"
    try:
        with open(tmp_svg, "w", encoding="utf-8") as f:
            f.write(svg_content)

        # Rasterize SVG to high-quality transparent PNG using FFmpeg
        res = subprocess.run(
            ["ffmpeg", "-y", "-i", tmp_svg, output_png],
            capture_output=True,
            text=True
        )
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg SVG conversion failed: {res.stderr[-200:]}")

        return card_w, card_h
    finally:
        if os.path.exists(tmp_svg):
            try:
                os.remove(tmp_svg)
            except Exception:
                pass

def build_caption_overlay_imagemagick(convert_bin, identify_bin, text, template_opts, video_w, video_h, output_png):
    """
    Renders styled text and background card into an RGBA PNG with ImageMagick.
    """
    font_size_pt = float(template_opts.get("font_size") or 46)
    scale_factor = max(0.5, min(2.5, video_w / 720.0))
    actual_font_size = max(16, int(font_size_pt * scale_factor * 0.88))

    font_family = template_opts.get("font_family") or "Cairo"
    font_path = get_font_path(font_family)

    font_color = str(template_opts.get("font_color") or "#FFFFFF")
    bg_color = str(template_opts.get("background_color") or "#000000")
    
    bg_opacity_val = float(template_opts.get("background_opacity") if template_opts.get("background_opacity") is not None else 0.75)
    has_bg = bool(template_opts.get("has_background", True)) and bg_opacity_val > 0.01

    stroke_color = str(template_opts.get("stroke_color") or "#000000")
    stroke_width_val = float(template_opts.get("stroke_width") or 0)
    stroke_width = max(0, int(stroke_width_val * scale_factor))

    pad_x = max(8, int(float(template_opts.get("padding_x") or 22) * scale_factor))
    pad_y = max(6, int(float(template_opts.get("padding_y") or 12) * scale_factor))
    radius = max(0, int(float(template_opts.get("border_radius") or 14) * scale_factor))

    max_card_width = max(160, int(video_w * 0.86))
    max_text_width = max(120, max_card_width - (pad_x * 2))

    temp_text_png = tempfile.mktemp(suffix="_txt.png")
    temp_bg_png = tempfile.mktemp(suffix="_bg.png")

    try:
        convert_text_cmd = [
            convert_bin,
            "-background", "none",
            "-fill", font_color,
            "-font", font_path,
            "-pointsize", str(actual_font_size),
            "-size", f"{max_text_width}x",
            "-gravity", "center"
        ]

        if stroke_width > 0:
            convert_text_cmd += ["-stroke", stroke_color, "-strokewidth", str(stroke_width)]

        clean_text = str(text or "").strip()
        if not clean_text:
            clean_text = "Follow for more 🚀"

        convert_text_cmd += [f"caption:{clean_text}", temp_text_png]
        subprocess.run(convert_text_cmd, check=True)

        # Identify rendered text dimensions
        ident_cmd = [identify_bin, "-format", "%w %h", temp_text_png] if identify_bin else [convert_bin, "identify", "-format", "%w %h", temp_text_png]
        ident_res = subprocess.run(ident_cmd, capture_output=True, text=True, check=True)
        tw_str, th_str = ident_res.stdout.strip().split()
        tw, th = int(tw_str), int(th_str)

        card_w = min(video_w, tw + (pad_x * 2))
        card_h = th + (pad_y * 2)

        if has_bg:
            rgba_bg = hex_to_rgba_str(bg_color, bg_opacity_val)
            draw_bg_cmd = [
                convert_bin,
                "-size", f"{card_w}x{card_h}",
                "xc:none",
                "-fill", rgba_bg,
                "-draw", f"roundrectangle 0,0 {card_w-1},{card_h-1} {radius},{radius}",
                temp_bg_png
            ]
            subprocess.run(draw_bg_cmd, check=True)

            composite_cmd = [
                convert_bin,
                temp_bg_png,
                temp_text_png,
                "-gravity", "center",
                "-composite",
                output_png
            ]
            subprocess.run(composite_cmd, check=True)
        else:
            convert_nobg_cmd = [
                convert_bin,
                "-size", f"{card_w}x{card_h}",
                "xc:none",
                temp_text_png,
                "-gravity", "center",
                "-composite",
                output_png
            ]
            subprocess.run(convert_nobg_cmd, check=True)

        return card_w, card_h
    finally:
        for p in [temp_text_png, temp_bg_png]:
            if os.path.exists(p):
                try:
                    os.remove(p)
                except Exception:
                    pass

def build_caption_overlay(text, template_opts, video_w, video_h, output_png):
    """
    Master overlay builder:
    Tries ImageMagick if available.
    If ImageMagick is not found or fails, falls back seamlessly to the SVG engine.
    """
    im_info = find_imagemagick()
    if im_info:
        convert_bin, ident_bin = im_info
        try:
            return build_caption_overlay_imagemagick(convert_bin, ident_bin, text, template_opts, video_w, video_h, output_png)
        except Exception as im_err:
            print(f"[Caption Engine] ImageMagick failed ({im_err}), falling back to native SVG engine...", file=sys.stderr)

    # Fallback to pure SVG engine
    return build_caption_overlay_svg(text, template_opts, video_w, video_h, output_png)

def render_caption(input_video_path, output_video_path, template_opts, custom_text=None):
    """
    Burn caption overlay onto video with FFmpeg.
    """
    text = custom_text or template_opts.get("sample_text") or "Follow for more 🚀 #Shorts"
    vid_w, vid_h = get_video_dimensions_ffprobe(input_video_path)

    temp_overlay_png = tempfile.mktemp(suffix="_cap_overlay.png")

    try:
        cap_w, cap_h = build_caption_overlay(text, template_opts, vid_w, vid_h, temp_overlay_png)

        # Position calculation
        pos_preset = str(template_opts.get("position") or "bottom").lower()
        pos_y_percent = template_opts.get("position_y_percent")

        if pos_y_percent is not None and str(pos_y_percent).strip() != "":
            try:
                pct = float(pos_y_percent)
                y_pos = int((pct / 100.0) * (vid_h - cap_h))
            except Exception:
                y_pos = int(vid_h * 0.82) - cap_h
        elif pos_preset == "top":
            y_pos = int(vid_h * 0.08)
        elif pos_preset == "center":
            y_pos = (vid_h - cap_h) // 2
        else:  # bottom
            y_pos = int(vid_h * 0.82) - cap_h

        # Bounds clamp
        y_pos = max(10, min(vid_h - cap_h - 10, y_pos))
        x_pos = (vid_w - cap_w) // 2

        print(f"[Caption Engine] Overlaying {cap_w}x{cap_h} caption at ({x_pos}, {y_pos}) onto {input_video_path}...")

        ffmpeg_cmd = [
            "ffmpeg", "-y",
            "-i", input_video_path,
            "-i", temp_overlay_png,
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

        proc = subprocess.run(ffmpeg_cmd, capture_output=True, text=True)
        if proc.returncode != 0:
            print(f"[FFmpeg Error] {proc.stderr[-300:]}", file=sys.stderr)
            raise RuntimeError(f"FFmpeg failed with exit code {proc.returncode}")

        print(f"[Caption Engine] Video saved successfully to {output_video_path}!")

    except Exception as render_err:
        print(f"[Caption Engine Critical Error] {render_err}", file=sys.stderr)
        # Safe fallback: if overlay somehow failed completely, copy the video without caption so publish doesn't die
        if not os.path.exists(output_video_path):
            shutil.copyfile(input_video_path, output_video_path)
            print(f"[Caption Engine] Fallback: Copied original video to output destination.", file=sys.stderr)
        raise render_err

    finally:
        if os.path.exists(temp_overlay_png):
            try:
                os.remove(temp_overlay_png)
            except Exception:
                pass

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Video Caption Renderer Engine")
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
