#!/usr/bin/env python3
from __future__ import annotations

import argparse
import colorsys
from pathlib import Path
from typing import Iterable

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
ENEMIES_DIR = PROJECT_ROOT / "assets" / "sprites" / "enemies"
PALETTE_IMAGE = PROJECT_ROOT / "assets" / "palette_tools" / "master_palette.png"
DEFAULT_OUTPUT = PROJECT_ROOT / "assets" / "converted_assets" / "enemy_recolor_preview"
TARGET_FOLDERS = [
    "armored_axeman",
    "armored_elite_orc",
    "armored_orc",
    "armored_skeleton",
    "orc",
]


def load_palette_colors(path: Path) -> list[tuple[int, int, int]]:
    img = Image.open(path).convert("RGB")
    seen = set()
    ordered: list[tuple[int, int, int]] = []
    for color in img.getdata():
        if color in seen:
            continue
        seen.add(color)
        ordered.append(color)
    if not ordered:
        raise ValueError(f"No colors found in palette image: {path}")
    if len(ordered) > 256:
        raise ValueError(f"Palette has {len(ordered)} colors; indexed palettes support up to 256.")
    return ordered


def build_quantize_palette_image(colors: Iterable[tuple[int, int, int]]) -> Image.Image:
    pal_img = Image.new("P", (1, 1))
    flat: list[int] = []
    for r, g, b in colors:
        flat.extend((int(r), int(g), int(b)))
    flat.extend([0] * (768 - len(flat)))
    pal_img.putpalette(flat)
    return pal_img


def shift_green_toward_demon(r: int, g: int, b: int) -> tuple[int, int, int]:
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    deg = h * 360.0

    # Target organic green/orc tones only; leave metal/neutral shading mostly untouched.
    if 62 <= deg <= 178 and s >= 0.18 and v >= 0.10:
        # Red-forward mapping: drive greens toward deeper red/orange stops.
        t = (deg - 62.0) / 116.0  # 0..1 over green range
        target_deg = 18.0 - (t * 16.0)  # ~18 (red-orange) down to ~2 (red)
        new_h = (target_deg % 360.0) / 360.0
        new_s = min(1.0, max(0.0, s * 1.05 + 0.06))
        new_v = min(1.0, max(0.0, v * 0.96))
        rr, gg, bb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
        return int(round(rr * 255)), int(round(gg * 255)), int(round(bb * 255))

    return r, g, b


def warm_neutral_highlights_for_armored_orc(r: int, g: int, b: int) -> tuple[int, int, int]:
    h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
    deg = h * 360.0
    # Extra treatment for bright near-neutrals that read as chalky white.
    # Push them to warm demon-metal tones while keeping luminance structure.
    if s <= 0.15 and v >= 0.60:
        target_deg = 14.0 if v < 0.82 else 20.0
        new_h = target_deg / 360.0
        new_s = min(1.0, 0.28 + s * 0.5)
        new_v = min(1.0, v * 0.94)
        rr, gg, bb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
        return int(round(rr * 255)), int(round(gg * 255)), int(round(bb * 255))
    # Catch pale yellow highlights and pull them redder.
    if 35 <= deg <= 70 and s <= 0.30 and v >= 0.65:
        new_h = 16.0 / 360.0
        new_s = min(1.0, max(0.30, s * 1.2))
        new_v = min(1.0, v * 0.93)
        rr, gg, bb = colorsys.hsv_to_rgb(new_h, new_s, new_v)
        return int(round(rr * 255)), int(round(gg * 255)), int(round(bb * 255))
    return r, g, b


def recolor_image(path: Path, output_path: Path, quantize_palette: Image.Image) -> tuple[int, int]:
    src = Image.open(path).convert("RGBA")
    pixels = src.load()
    changed = 0
    opaque = 0
    parent_folder = path.parent.name.lower()

    for y in range(src.height):
        for x in range(src.width):
            r, g, b, a = pixels[x, y]
            if a == 0:
                continue
            opaque += 1
            nr, ng, nb = shift_green_toward_demon(r, g, b)
            if parent_folder == "armored_orc":
                nr, ng, nb = warm_neutral_highlights_for_armored_orc(nr, ng, nb)
            if (nr, ng, nb) != (r, g, b):
                changed += 1
                pixels[x, y] = (nr, ng, nb, a)

    rgb = src.convert("RGB")
    quantized = rgb.quantize(palette=quantize_palette, dither=Image.Dither.NONE).convert("RGBA")
    quantized.putalpha(src.getchannel("A"))

    output_path.parent.mkdir(parents=True, exist_ok=True)
    quantized.save(output_path, optimize=True, compress_level=9)
    return changed, opaque


def iter_targets() -> Iterable[Path]:
    for folder in TARGET_FOLDERS:
        root = ENEMIES_DIR / folder
        if not root.exists():
            continue
        for path in root.rglob("*.png"):
            if path.is_file():
                yield path


def main() -> int:
    parser = argparse.ArgumentParser(description="Recolor armored/orc enemies toward demon red/orange palette.")
    parser.add_argument(
        "--in-place",
        action="store_true",
        help="overwrite source files in assets/sprites/enemies (default writes preview output).",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=DEFAULT_OUTPUT,
        help="preview output directory when not using --in-place.",
    )
    parser.add_argument(
        "--only-folder",
        type=str,
        default=None,
        help="optional single folder name to process (e.g., armored_orc).",
    )
    args = parser.parse_args()

    palette_colors = load_palette_colors(PALETTE_IMAGE)
    quantize_palette = build_quantize_palette_image(palette_colors)

    total_files = 0
    total_changed = 0
    total_opaque = 0

    for src in sorted(iter_targets()):
        rel = src.relative_to(ENEMIES_DIR)
        if args.only_folder and rel.parts[0] != args.only_folder:
            continue
        if args.in_place:
            dst = src
        else:
            dst = args.output_dir / rel

        changed, opaque = recolor_image(src, dst, quantize_palette)
        total_files += 1
        total_changed += changed
        total_opaque += opaque
        pct = (changed / opaque * 100.0) if opaque else 0.0
        print(f"{rel}: changed {changed}/{opaque} pixels ({pct:.1f}%)")

    print(
        f"\nDone. Files: {total_files} | changed pixels: {total_changed}/{total_opaque}"
        f" ({(total_changed / total_opaque * 100.0) if total_opaque else 0.0:.1f}%)"
    )
    if not args.in_place:
        print(f"Preview output: {args.output_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
