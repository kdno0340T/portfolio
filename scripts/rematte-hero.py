"""Re-cut the supplied portrait from the original incoming photograph."""
from pathlib import Path
import sys
import os

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / ".tmp-tools"))
os.environ["U2NET_HOME"] = str(ROOT / ".tmp-tools/models")

import cv2
import numpy as np
from PIL import Image
from pymatting import estimate_alpha_cf, estimate_foreground_ml
from rembg import new_session, remove

SOURCE = ROOT / "public/images/incoming/hero-new.png"
DEST = ROOT / "public/images/profile"
DEST.mkdir(parents=True, exist_ok=True)

image = Image.open(SOURCE).convert("RGB")
rgb = np.asarray(image, dtype=np.float64) / 255.0
session = new_session("u2net_human_seg")
mask_image = remove(image, session=session, only_mask=True, alpha_matting=False, post_process_mask=False)
model_alpha = np.asarray(mask_image.convert("L"), dtype=np.float32) / 255.0

# Make an explicit 12px trimap from the human model's confidence mask.
fg_seed = (model_alpha >= 0.94).astype(np.uint8)
kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25))
sure_fg = cv2.erode(fg_seed, kernel, iterations=1) > 0
expanded_subject = cv2.dilate((model_alpha > 0.025).astype(np.uint8), kernel, iterations=1) > 0
sure_bg = ~expanded_subject
trimap = np.full(model_alpha.shape, 0.5, dtype=np.float32)
trimap[sure_bg] = 0.0
trimap[sure_fg] = 1.0

# Closed-form matting refines wispy hair and the shirt/arm contour in the unknown band.
alpha = estimate_alpha_cf(rgb, trimap)
alpha = np.clip(alpha, 0.0, 1.0)

# ML foreground estimation decontaminates semi-transparent boundary colors.
foreground, _background = estimate_foreground_ml(rgb, alpha, return_background=True)
edge = (alpha > 0.035) & (alpha < 0.98)
clean_rgb = rgb.copy()
clean_rgb[edge] = foreground[edge]

# Shrink the matte by approximately 0.5px, soften it by 0.8px, and suppress isolated fringe specks.
alpha = cv2.erode(alpha, np.ones((3, 3), np.uint8), iterations=2)
alpha = cv2.GaussianBlur(alpha, (0, 0), 0.45)
alpha[alpha < 0.06] = 0.0
alpha = np.clip(alpha, 0.0, 1.0)

# Restrict cream light wrap to the outer antialiased edge; interior pixels remain original.
outer = cv2.dilate((alpha > 0.01).astype(np.uint8), np.ones((5, 5), np.uint8), iterations=1).astype(bool)
edge_band = outer & (alpha > 0.0) & (alpha < 0.9)
foreground_luma = clean_rgb @ np.array([0.2126, 0.7152, 0.0722])
wrap_weight = edge_band.astype(np.float32) * (foreground_luma > 0.42) * (0.08 * (1.0 - alpha))
cream = np.array([0xE9, 0xDF, 0xD0], dtype=np.float32) / 255.0
clean_rgb = clean_rgb * (1.0 - wrap_weight[..., None]) + cream * wrap_weight[..., None]

# Subject-bounded 4:5 crop with modest transparent breathing room.
ys, xs = np.where(alpha > 0.04)
left, right = int(xs.min()), int(xs.max() + 1)
top, bottom = int(ys.min()), int(ys.max() + 1)
cx = (left + right) / 2
# A head-to-mid-torso crop: preserve room over the hair and below the shoulders.
h = min((bottom - top) * 0.68, rgb.shape[0] - max(0, top - 28))
w = h * 0.8
cy = top - 28 + h / 2
x0 = int(round(cx - w / 2)); x1 = int(round(cx + w / 2))
y0 = int(round(cy - h / 2)); y1 = int(round(cy + h / 2))
pad_l, pad_t = max(0, -x0), max(0, -y0)
pad_r, pad_b = max(0, x1 - rgb.shape[1]), max(0, y1 - rgb.shape[0])
rgba = np.dstack([clean_rgb, alpha])
if any((pad_l, pad_t, pad_r, pad_b)):
    rgba = cv2.copyMakeBorder(rgba, pad_t, pad_b, pad_l, pad_r, cv2.BORDER_REFLECT_101)
x0 += pad_l; x1 += pad_l; y0 += pad_t; y1 += pad_t
crop = rgba[y0:y1, x0:x1]
crop = cv2.resize(crop, (960, 1200), interpolation=cv2.INTER_LANCZOS4)

def save(path: Path, frame: np.ndarray, quality: int = 92):
    pixels = np.clip(np.round(frame * 255.0), 0, 255).astype(np.uint8)
    Image.fromarray(pixels).save(path, "WEBP", quality=quality, method=6)

save(DEST / "hero-cutout.webp", crop, 94)

# Independent mobile crop: modestly tighter on the face/shoulders, still 4:5.
mobile = cv2.resize(crop, (800, 1000), interpolation=cv2.INTER_LANCZOS4)
save(DEST / "hero-cutout-mobile-4x5.webp", mobile, 92)

print(f"source={SOURCE.name} size={image.size}; bbox={(left, top, right, bottom)}; crop={crop.shape[1]}x{crop.shape[0]}")
print(f"alpha={float(alpha.min()):.3f}..{float(alpha.max()):.3f}; output={DEST / 'hero-cutout.webp'}")
