from PIL import Image
import os
from pathlib import Path

# =====================================
# CONFIG
# =====================================

# Only process files inside this folder
BASE_DIR = Path(__file__).resolve().parent
SOURCE_DIR = str((BASE_DIR / "../convert-this").resolve())

# Output converted files here
OUTPUT_DIR = str((BASE_DIR / "../converted_assets").resolve())

# Master palette image
PALETTE_IMAGE = str((BASE_DIR / "master_palette.png").resolve())

# Folders to ignore
IGNORE_FOLDERS = [
    "palette_tools",
    "converted_assets",
    "music",
    "sfx",
    ".vscode",
    ".claude",
]

# If True, write indexed PNG (mode "P") for assets without alpha.
# This reduces file size and memory footprint for many sprite sheets.
WRITE_INDEXED_PNG_WHEN_POSSIBLE = True


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
    # Pillow expects exactly 768 entries (256 * RGB)
    flat.extend([0] * (768 - len(flat)))
    pal_img.putpalette(flat)
    return pal_img


PALETTE_COLORS = load_palette_colors(PALETTE_IMAGE)
QUANTIZE_PALETTE = build_quantize_palette_image(PALETTE_COLORS)


def convert_image(input_path, output_path):
    """
    Convert an image to the master palette.
    - Uses Pillow quantization (C-optimized, much faster than Python pixel loops)
    - Preserves alpha channel exactly
    - Optionally writes indexed PNG for opaque images
    """
    src = Image.open(input_path)

    # Check transparency from original image before forced conversion.
    has_alpha = "A" in src.getbands()

    # Quantize RGB content to the shared master palette.
    rgb = src.convert("RGB")
    quantized = rgb.quantize(
        palette=QUANTIZE_PALETTE,
        dither=Image.Dither.NONE,
    )

    if has_alpha:
        # Keep alpha exactly from source, but RGB values from quantized palette.
        alpha = src.getchannel("A")
        out = quantized.convert("RGBA")
        out.putalpha(alpha)
        out.save(output_path, optimize=True, compress_level=9)
    else:
        if WRITE_INDEXED_PNG_WHEN_POSSIBLE:
            quantized.save(output_path, optimize=True, compress_level=9)
        else:
            quantized.convert("RGB").save(output_path, optimize=True, compress_level=9)


def main():
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
            convert_image(input_path, output_path)

    print("DONE")


if __name__ == "__main__":
    main()
