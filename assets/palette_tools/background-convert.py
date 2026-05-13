from PIL import Image, ImageFilter
import os

# =====================================
# CONFIG
# =====================================

# Folder containing source images
SOURCE_DIR = "../convert-this"

# Output folder
OUTPUT_DIR = "../converted_assets"

# Master palette image
PALETTE_IMAGE = "master_palette.png"

# SNES-style processing settings
# 2 = subtle pixelation
# 3 = medium
# 4 = chunkier
DOWNSCALE_FACTOR = 2

# Slight blur helps reduce noisy AI detail before pixelation.
BLUR_RADIUS = 0.8

# Optionally cap output resolution (helps memory/upload time for fullscreen backgrounds).
# Set to None to disable capping.
MAX_OUTPUT_WIDTH = None
MAX_OUTPUT_HEIGHT = None

# Dithering for quantization:
# - Image.Dither.NONE keeps flatter SNES look
# - Image.Dither.FLOYDSTEINBERG adds texture/noise
USE_DITHER = False

# Save as indexed PNG ("P" mode) when image has no alpha.
# This usually reduces disk size and decode cost for backgrounds.
WRITE_INDEXED_PNG_WHEN_POSSIBLE = True

# Ignore folders
IGNORE_FOLDERS = [
    "palette_tools",
    "converted_assets",
    ".vscode",
    ".claude",
]


def load_palette_colors(path):
    """Load unique RGB colors from the palette image in scanline order."""
    img = Image.open(path).convert("RGB")
    seen = set()
    ordered = []
    for color in img.getdata():
        if color in seen:
            continue
        seen.add(color)
        ordered.append(color)
    if not ordered:
        raise ValueError(f"No colors found in palette image: {path}")
    if len(ordered) > 256:
        raise ValueError(
            f"Palette has {len(ordered)} colors; PNG indexed palettes support up to 256."
        )
    return ordered


def build_quantize_palette_image(colors):
    """Build a Pillow palette image usable by Image.quantize()."""
    pal_img = Image.new("P", (1, 1))
    flat = []
    for r, g, b in colors:
        flat.extend((int(r), int(g), int(b)))
    flat.extend([0] * (768 - len(flat)))  # 256 * RGB
    pal_img.putpalette(flat)
    return pal_img


PALETTE_COLORS = load_palette_colors(PALETTE_IMAGE)
QUANTIZE_PALETTE = build_quantize_palette_image(PALETTE_COLORS)
QUANTIZE_DITHER = Image.Dither.FLOYDSTEINBERG if USE_DITHER else Image.Dither.NONE


def maybe_cap_size(width, height):
    if not MAX_OUTPUT_WIDTH and not MAX_OUTPUT_HEIGHT:
        return width, height

    max_w = MAX_OUTPUT_WIDTH if MAX_OUTPUT_WIDTH else width
    max_h = MAX_OUTPUT_HEIGHT if MAX_OUTPUT_HEIGHT else height

    if width <= max_w and height <= max_h:
        return width, height

    scale = min(max_w / max(1, width), max_h / max(1, height))
    new_w = max(1, int(round(width * scale)))
    new_h = max(1, int(round(height * scale)))
    return new_w, new_h


def process_image(input_path, output_path):
    src = Image.open(input_path)
    has_alpha = "A" in src.getbands()

    # Convert to working RGBA so we can keep alpha exact if needed.
    img = src.convert("RGBA")

    # Optional cap before processing to keep output textures lightweight.
    target_w, target_h = maybe_cap_size(*img.size)
    if (target_w, target_h) != img.size:
        img = img.resize((target_w, target_h), Image.Resampling.BICUBIC)

    # Mild denoise before pixelation.
    if BLUR_RADIUS > 0:
        img = img.filter(ImageFilter.GaussianBlur(radius=BLUR_RADIUS))

    # Pixelate via downscale + nearest upscale.
    ow, oh = img.size
    small_w = max(1, ow // max(1, DOWNSCALE_FACTOR))
    small_h = max(1, oh // max(1, DOWNSCALE_FACTOR))
    small = img.resize((small_w, small_h), Image.Resampling.BILINEAR)

    # Quantize RGB to shared master palette.
    rgb_small = small.convert("RGB")
    quantized_small = rgb_small.quantize(
        palette=QUANTIZE_PALETTE,
        dither=QUANTIZE_DITHER,
    )

    # Return to target size with hard pixels.
    if has_alpha:
        alpha_small = small.getchannel("A")
        quant_rgba_small = quantized_small.convert("RGBA")
        quant_rgba_small.putalpha(alpha_small)
        out = quant_rgba_small.resize((ow, oh), Image.Resampling.NEAREST)
        out.save(output_path, optimize=True, compress_level=9)
    else:
        if WRITE_INDEXED_PNG_WHEN_POSSIBLE:
            out = quantized_small.resize((ow, oh), Image.Resampling.NEAREST)
            out.save(output_path, optimize=True, compress_level=9)
        else:
            out = quantized_small.convert("RGB").resize((ow, oh), Image.Resampling.NEAREST)
            out.save(output_path, optimize=True, compress_level=9)


def main():
    converted_files = []

    for root, dirs, files in os.walk(SOURCE_DIR):
        dirs[:] = [d for d in dirs if d not in IGNORE_FOLDERS]

        for file_name in files:
            if not file_name.lower().endswith((".png", ".jpg", ".jpeg")):
                continue

            input_path = os.path.join(root, file_name)
            relative_path = os.path.relpath(input_path, SOURCE_DIR)
            relative_path = os.path.splitext(relative_path)[0] + ".png"
            output_path = os.path.join(OUTPUT_DIR, relative_path)

            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            print(f"Converting: {relative_path}")
            process_image(input_path, output_path)
            converted_files.append((input_path, output_path))

    print("DONE")
    print_report(converted_files)


def _safe_size(path):
    try:
        return os.path.getsize(path)
    except OSError:
        return 0


def _human_size(num_bytes):
    if num_bytes < 1024:
        return f"{num_bytes} B"
    if num_bytes < 1024 * 1024:
        return f"{num_bytes / 1024:.1f} KB"
    return f"{num_bytes / (1024 * 1024):.2f} MB"


def print_report(converted_files):
    if not converted_files:
        print("REPORT: no files converted.")
        return

    in_total = 0
    out_total = 0
    deltas = []
    for input_path, output_path in converted_files:
        in_size = _safe_size(input_path)
        out_size = _safe_size(output_path)
        in_total += in_size
        out_total += out_size
        deltas.append((out_size - in_size, input_path, output_path, in_size, out_size))

    diff = out_total - in_total
    pct = (diff / in_total * 100.0) if in_total else 0.0

    print("\n=== POST-RUN REPORT ===")
    print(f"Files converted: {len(converted_files)}")
    print(f"Input total size:  {_human_size(in_total)}")
    print(f"Output total size: {_human_size(out_total)}")
    print(f"Net change:        {diff:+,} bytes ({pct:+.2f}%)")

    deltas.sort(reverse=True, key=lambda row: row[0])
    print("\nTop 10 output growth files:")
    for delta, input_path, output_path, in_size, out_size in deltas[:10]:
        rel_in = os.path.relpath(input_path, SOURCE_DIR)
        rel_out = os.path.relpath(output_path, OUTPUT_DIR)
        print(
            f"  {delta:+,} B | in {_human_size(in_size)} -> out {_human_size(out_size)}"
            f" | {rel_in} -> {rel_out}"
        )


if __name__ == "__main__":
    main()
