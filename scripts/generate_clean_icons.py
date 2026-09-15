#!/usr/bin/env python3
"""
Generate all Oryn icon assets with exact Android Adaptive Icon safe zones,
transparent foregrounds, dark #1A1A1A backgrounds, pure white monochrome silhouettes,
and Android notification icons.
"""

import os
import subprocess
from PIL import Image, ImageDraw

PROJECT_ROOT = "/home/resetadmin/projects/oryn"
ASSETS_DIR = os.path.join(PROJECT_ROOT, "assets/images")
RES_DIR = os.path.join(PROJECT_ROOT, "android/app/src/main/res")

# 1. Generate master high-res transparent logo (1024x1024)
svg_master = '''<svg width="2048" height="2048" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M261.674 295.308V210.709M261.674 295.308C261.674 295.308 278.052 303.873 306.342 317.676C334.632 331.479 396.423 332.815 435.88 317.676C475.337 302.537 450.025 200.128 435.88 191.223C421.735 182.318 333.887 184.099 306.342 191.223C278.796 198.347 261.674 210.709 261.674 210.709M261.674 295.308C261.674 295.308 249.017 306.099 228.172 317.676C207.327 329.253 106.079 335.932 78.5334 317.676C50.988 299.421 43.5431 203.69 78.5334 191.223C113.524 178.756 178.293 181.873 215.516 191.223C252.74 200.573 261.674 210.709 261.674 210.709" stroke="#FFFFFF" stroke-width="26" stroke-linecap="round" stroke-linejoin="round"/>
</svg>'''

svg_path = "/tmp/oryn_master.svg"
png_path = "/tmp/oryn_master.png"

with open(svg_path, "w") as f:
    f.write(svg_master)

subprocess.run(["convert", "-background", "none", svg_path, png_path], check=True)
master_img = Image.open(png_path)
bbox = master_img.getbbox()
# Crop tightly to the logo mark
cropped_logo = master_img.crop(bbox)
print(f"Cropped logo size: {cropped_logo.size}")

def create_adaptive_foreground(canvas_size, logo_width_ratio=0.60):
    """Creates a transparent foreground with logo sized to safe-zone."""
    img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    target_w = int(canvas_size * logo_width_ratio)
    target_h = int(cropped_logo.size[1] * (target_w / cropped_logo.size[0]))
    resized_logo = cropped_logo.resize((target_w, target_h), Image.Resampling.LANCZOS)
    x = (canvas_size - target_w) // 2
    y = (canvas_size - target_h) // 2
    img.paste(resized_logo, (x, y), resized_logo)
    return img

def create_solid_background(canvas_size, color=(26, 26, 26, 255)):
    return Image.new("RGBA", (canvas_size, canvas_size), color)

def create_composite_icon(canvas_size, logo_ratio=0.62):
    bg = create_solid_background(canvas_size, (26, 26, 26, 255))
    fg = create_adaptive_foreground(canvas_size, logo_ratio)
    bg.paste(fg, (0, 0), fg)
    return bg

def create_round_icon(canvas_size, logo_ratio=0.60):
    icon = create_composite_icon(canvas_size, logo_ratio)
    mask = Image.new("L", (canvas_size, canvas_size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, canvas_size - 1, canvas_size - 1), fill=255)
    round_img = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    round_img.paste(icon, (0, 0), mask)
    return round_img

# ── 1. Save Assets in assets/images/ ──────────────────────────────────────────
# A. android-icon-foreground.png (512x512, transparent, safe zone 58%)
fg_512 = create_adaptive_foreground(512, 0.58)
fg_512.save(os.path.join(ASSETS_DIR, "android-icon-foreground.png"), "PNG")
print("Saved assets/images/android-icon-foreground.png")

# B. android-icon-background.png (512x512, #1A1A1A)
bg_512 = create_solid_background(512, (26, 26, 26, 255))
bg_512.save(os.path.join(ASSETS_DIR, "android-icon-background.png"), "PNG")
print("Saved assets/images/android-icon-background.png")

# C. android-icon-monochrome.png (432x432, transparent, pure white silhouette, safe zone 58%)
mono_432 = create_adaptive_foreground(432, 0.58)
mono_432.save(os.path.join(ASSETS_DIR, "android-icon-monochrome.png"), "PNG")
print("Saved assets/images/android-icon-monochrome.png")

# D. notification-icon.png (512x512, transparent, white silhouette)
notif_512 = create_adaptive_foreground(512, 0.70)
notif_512.save(os.path.join(ASSETS_DIR, "notification-icon.png"), "PNG")
print("Saved assets/images/notification-icon.png")

# E. icon.png (1024x1024, #1A1A1A background, centered logo)
icon_1024 = create_composite_icon(1024, 0.62)
icon_1024.save(os.path.join(ASSETS_DIR, "icon.png"), "PNG")
print("Saved assets/images/icon.png")

# F. splash-icon.png (512x512, transparent, centered white logo)
splash_512 = create_adaptive_foreground(512, 0.65)
splash_512.save(os.path.join(ASSETS_DIR, "splash-icon.png"), "PNG")
print("Saved assets/images/splash-icon.png")

# ── 2. Update Android Native Res Files (Mipmap & Drawable) ─────────────────────
densities = {
    "mdpi": {"adaptive": 108, "legacy": 48, "notif": 24},
    "hdpi": {"adaptive": 162, "legacy": 72, "notif": 36},
    "xhdpi": {"adaptive": 216, "legacy": 96, "notif": 48},
    "xxhdpi": {"adaptive": 324, "legacy": 144, "notif": 72},
    "xxxhdpi": {"adaptive": 432, "legacy": 192, "notif": 96},
}

for density, sizes in densities.items():
    mipmap_dir = os.path.join(RES_DIR, f"mipmap-{density}")
    drawable_dir = os.path.join(RES_DIR, f"drawable-{density}")
    
    if os.path.exists(mipmap_dir):
        # Foreground (webp)
        fg = create_adaptive_foreground(sizes["adaptive"], 0.58)
        fg.save(os.path.join(mipmap_dir, "ic_launcher_foreground.webp"), "WEBP")
        
        # Background (webp)
        bg = create_solid_background(sizes["adaptive"], (26, 26, 26, 255))
        bg.save(os.path.join(mipmap_dir, "ic_launcher_background.webp"), "WEBP")
        
        # Monochrome (webp)
        mono = create_adaptive_foreground(sizes["adaptive"], 0.58)
        mono.save(os.path.join(mipmap_dir, "ic_launcher_monochrome.webp"), "WEBP")
        
        # Legacy square launcher (webp)
        leg = create_composite_icon(sizes["legacy"], 0.70)
        leg.save(os.path.join(mipmap_dir, "ic_launcher.webp"), "WEBP")
        
        # Legacy round launcher (webp)
        rnd = create_round_icon(sizes["legacy"], 0.65)
        rnd.save(os.path.join(mipmap_dir, "ic_launcher_round.webp"), "WEBP")
        
        print(f"Updated mipmap-{density} icons")
        
    if os.path.exists(drawable_dir):
        # Notification icon (png, transparent, white silhouette)
        notif = create_adaptive_foreground(sizes["notif"], 0.85)
        notif.save(os.path.join(drawable_dir, "notification_icon.png"), "PNG")
        print(f"Updated drawable-{density}/notification_icon.png")

# Cleanup
if os.path.exists(svg_path): os.remove(svg_path)
if os.path.exists(png_path): os.remove(png_path)
print("All icon assets generated successfully!")
