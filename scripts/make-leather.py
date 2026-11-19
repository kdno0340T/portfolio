#!/usr/bin/env python3
"""Create seamless procedural pebble-grain cream and dark leather textures."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy.ndimage import gaussian_filter
from scipy.spatial import cKDTree


SIZE = 1024
SEED = 20619
OUT = Path("public/images/textures")
PREVIEW = Path(".qa/mission-2e")


def worley(rng: np.random.Generator, count: int):
    # Jittered stratified points avoid a visible grid; random local spacing makes
    # the leather pebbles vary naturally in size. Nine wrapped copies give a torus.
    side = int(np.sqrt(count))
    step = SIZE / side
    jitter = rng.uniform(0.025, 0.975, (side * side, 2)).astype(np.float32)
    points = (np.stack(np.meshgrid(np.arange(side), np.arange(side)), axis=-1).reshape(-1, 2).astype(np.float32) + jitter) * step
    points += rng.normal(0, step * 0.045, points.shape).astype(np.float32)
    points %= SIZE
    shifts = [(x, y) for y in (-SIZE, 0, SIZE) for x in (-SIZE, 0, SIZE)]
    tiled = np.concatenate([points + np.array(shift, dtype=np.float32) for shift in shifts], axis=0)
    owners = np.tile(np.arange(len(points), dtype=np.int32), len(shifts))
    tree = cKDTree(tiled)
    _, point_neighbours = tree.query(points, k=2, workers=-1)
    local_radii = np.linalg.norm(points - tiled[point_neighbours[:, 1]], axis=1)
    # Rounded pebble tops end just before neighboring cells meet; mild variation
    # in these radii avoids the straight polygon walls of a raw Voronoi edge map.
    local_radii = local_radii * 0.63 * rng.uniform(0.97, 1.06, len(points))
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    coordinates = np.column_stack((xx.ravel(), yy.ravel()))
    distances = np.empty((len(coordinates), 2), dtype=np.float32)
    nearest = np.empty(len(coordinates), dtype=np.int32)
    chunk = 100_000
    for start in range(0, len(coordinates), chunk):
        stop = min(start + chunk, len(coordinates))
        local_dist, local_index = tree.query(coordinates[start:stop], k=2, workers=-1)
        distances[start:stop] = local_dist.astype(np.float32)
        nearest[start:stop] = owners[local_index[:, 0]]
    return distances[:, 0].reshape(SIZE, SIZE), distances[:, 1].reshape(SIZE, SIZE), nearest.reshape(SIZE, SIZE), local_radii, points, len(points)


def leather(seed: int, dark: bool):
    rng = np.random.default_rng(seed)
    first, second, owner, cell_radii, points, point_count = worley(rng, 2100)
    mean_cell = np.sqrt((SIZE * SIZE) / point_count)
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    dx = np.mod(xx - points[owner, 0] + SIZE / 2, SIZE) - SIZE / 2
    dy = np.mod(yy - points[owner, 1] + SIZE / 2, SIZE) - SIZE / 2
    angle = np.arctan2(dy, dx)
    phase3 = rng.uniform(0, 2 * np.pi, point_count)[owner]
    phase5 = rng.uniform(0, 2 * np.pi, point_count)[owner]
    edge = second - first
    edge_width = mean_cell * 0.16
    rounded_radius = cell_radii[owner] * (1 + 0.04 * np.sin(3 * angle + phase3) + 0.02 * np.sin(5 * angle + phase5))
    radial = np.clip((rounded_radius - first) / (mean_cell * 0.34), 0, 1)
    radial = radial * radial * (3 - 2 * radial)
    edge_dome = np.clip(edge / edge_width, 0, 1)
    edge_dome = edge_dome * edge_dome * (3 - 2 * edge_dome)
    dome = 0.25 * edge_dome + 0.75 * radial
    seam = 1 - edge_dome
    height_cell = rng.uniform(0.91, 1.09, point_count)[owner]
    height = dome * (0.82 + 0.18 * height_cell)
    height += rng.normal(0, 0.006, (SIZE, SIZE)).astype(np.float32)
    height = gaussian_filter(height, sigma=1.0, mode="wrap")

    grad_y, grad_x = np.gradient(height)
    nx = -grad_x * 2.4
    ny = -grad_y * 2.4
    nz = np.ones_like(height)
    norm = np.sqrt(nx * nx + ny * ny + nz * nz)
    nx, ny, nz = nx / norm, ny / norm, nz / norm
    light = np.array([-0.48, -0.53, 0.70], dtype=np.float32)
    light /= np.linalg.norm(light)
    lambert = np.maximum(0, nx * light[0] + ny * light[1] + nz * light[2])
    half_vector = light + np.array([0, 0, 1], dtype=np.float32)
    half_vector /= np.linalg.norm(half_vector)
    specular = np.maximum(0, nx * half_vector[0] + ny * half_vector[1] + nz * half_vector[2]) ** 24
    shading = 0.992 + (lambert - 0.72) * (0.022 if not dark else 0.014) + specular * (0.004 if not dark else 0.002)

    if dark:
        base = np.array([21, 17, 32], dtype=np.float32)
        brown = np.array([58, 39, 74], dtype=np.float32)
        highlight = np.array([48, 38, 65], dtype=np.float32)
        crevice = (seam * 0.09)[..., None]
        rgb = base * (1 - crevice) + brown * crevice
        rgb += np.clip(lambert - 0.65, 0, 1)[..., None] * (highlight - base)[None, None, :] * 0.18
    else:
        base = np.array([233, 223, 208], dtype=np.float32)
        brown = np.array([128, 83, 57], dtype=np.float32)
        highlight = np.array([251, 245, 233], dtype=np.float32)
        crevice = (seam * 0.09)[..., None]
        rgb = base * (1 - crevice) + brown * crevice
        light_mask = np.clip((lambert - 0.58) * 0.11, 0, 0.045)[..., None]
        rgb = rgb * (1 - light_mask) + highlight * light_mask

    rgb *= shading[..., None]
    if not dark:
        # Keep the 5th-to-95th percentile luminance shift beneath text below 8%.
        rgb = base[None, None, :] + (rgb - base[None, None, :]) * 0.72
    else:
        rgb = base[None, None, :] + (rgb - base[None, None, :]) * 0.55
    rgb += rng.normal(0, 2.8 if not dark else 4.0, (SIZE, SIZE, 1)).astype(np.float32)
    return np.clip(rgb, 0, 255).astype(np.uint8)


def save_texture(image: np.ndarray, path: Path, quality: int = 80):
    Image.fromarray(image).save(path, "WEBP", quality=quality, method=6, exact=True)


def save_tiling_preview(image: np.ndarray, path: Path, label: str):
    tile = Image.fromarray(image)
    canvas = Image.new("RGB", (SIZE * 3, SIZE * 3), (25, 20, 34) if label == "DARK" else (233, 223, 208))
    for y in range(3):
        for x in range(3):
            canvas.paste(tile, (x * SIZE, y * SIZE))
    canvas.save(path)


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PREVIEW.mkdir(parents=True, exist_ok=True)
    cream = leather(SEED, dark=False)
    dark = leather(SEED + 1, dark=True)
    cream_path = OUT / "cream-pebbled-leather.webp"
    dark_path = OUT / "dark-pebbled-leather.webp"
    save_texture(cream, cream_path)
    save_texture(dark, dark_path, quality=88)
    save_tiling_preview(cream, PREVIEW / "cream-leather-3x3.png", "CREAM")
    save_tiling_preview(dark, PREVIEW / "dark-leather-3x3.png", "DARK")

    crop_size = 512  # 100% CSS view when the 1024px tile is displayed at 2x.
    reference = Image.open("reference-capture/desktop-1440x900/home/scroll-001-y00400.png").convert("RGB")
    reference_crop = reference.crop((0, 64, crop_size, 64 + crop_size))
    generated_crop = Image.fromarray(cream).resize((crop_size, crop_size), Image.Resampling.LANCZOS)
    overlay = Image.new("RGB", generated_crop.size, (239, 230, 216))
    generated_crop = Image.blend(generated_crop, overlay, 0.65)
    comparison = Image.new("RGB", (crop_size * 2, crop_size + 44), (243, 239, 231))
    comparison.paste(reference_crop, (0, 44))
    comparison.paste(generated_crop, (crop_size, 44))
    draw = ImageDraw.Draw(comparison)
    draw.text((18, 14), "REFERENCE CREAM / 100% CROP", fill=(48, 42, 46))
    draw.text((crop_size + 18, 14), "ORIGINAL PEBBLED LEATHER / 100% CROP", fill=(48, 42, 46))
    comparison.save(PREVIEW / "reference-vs-leather-100.png")

    def save_100_crop(image: np.ndarray, destination: Path, base_rgb: tuple[int, int, int]):
        rendered = Image.fromarray(image).resize((512, 512), Image.Resampling.LANCZOS)
        flat = Image.new("RGB", (512, 512), base_rgb)
        rendered = Image.blend(rendered, flat, 0.65)
        crop = rendered.crop((56, 56, 456, 456))
        crop.save(destination)
        values = np.asarray(crop).astype(np.float32)
        luma = values[..., 0] * 0.2126 + values[..., 1] * 0.7152 + values[..., 2] * 0.0722
        print(f"{destination}: 400x400 rendered CSS crop, luminance SD={luma.std():.3f}/255")

    save_100_crop(cream, PREVIEW / "cream-crop-100.png", (239, 230, 216))
    save_100_crop(dark, PREVIEW / "dark-crop-100.png", (11, 10, 15))

    for path in (cream_path, dark_path):
        size = path.stat().st_size
        print(f"{path}: {size:,} bytes")
        if size > 250_000:
            raise SystemExit(f"Texture exceeds 250KB: {path}")
    # Quantify repeated boundary error across the tile edges.
    for label, image in (("cream", cream), ("dark", dark)):
        horizontal = np.abs(image[:, 0].astype(np.int16) - image[:, -1].astype(np.int16)).mean()
        vertical = np.abs(image[0].astype(np.int16) - image[-1].astype(np.int16)).mean()
        print(f"{label}: mean edge delta x={horizontal:.3f}, y={vertical:.3f}")


if __name__ == "__main__":
    main()
