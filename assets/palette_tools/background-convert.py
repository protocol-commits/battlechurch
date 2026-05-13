from PIL import Image, ImageFilter
import numpy as np
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

# Retro processing settings
# 4 = subtle
# 6 = SNES-ish
# 8 = chunkier retro
DOWNSCALE_FACTOR = 2

# Slight blur helps reduce noisy AI detail
BLUR_RADIUS = 1

# Ignore folders
IGNORE_FOLDERS = [
    "palette_tools",
    "converted_assets",
    ".vscode",
    ".claude"
]

# =====================================
# LOAD PALETTE
# =====================================

palette_img = Image.open(PALETTE_IMAGE).convert("RGB")
palette_colors = list(set(palette_img.getdata()))
palette = np.array(palette_colors)

# =====================================
# FIND CLOSEST COLOR
# =====================================

def closest_color(pixel):

    distances = np.sqrt(
        ((palette - pixel) ** 2).sum(axis=1)
    )

    return tuple(
        palette[np.argmin(distances)]
    )

# =====================================
# PALETTE CONVERT
# =====================================

def palette_convert(img):

    pixels = np.array(img)

    height, width = pixels.shape[:2]

    for y in range(height):

        for x in range(width):

            r, g, b, a = pixels[y, x]

            # Preserve transparency
            if a == 0:
                continue

            new_color = closest_color(
                np.array([r, g, b])
            )

            pixels[y, x] = [
                new_color[0],
                new_color[1],
                new_color[2],
                a
            ]

    return Image.fromarray(pixels)

# =====================================
# PROCESS IMAGE
# =====================================

def process_image(input_path, output_path):

    img = Image.open(input_path).convert("RGBA")

    original_width, original_height = img.size

    # =================================
    # BLUR
    # =================================

    img = img.filter(
        ImageFilter.GaussianBlur(
            radius=BLUR_RADIUS
        )
    )

    # =================================
    # DOWNSCALE
    # =================================

    small_width = max(
        1,
        original_width // DOWNSCALE_FACTOR
    )

    small_height = max(
        1,
        original_height // DOWNSCALE_FACTOR
    )

    img = img.resize(
        (small_width, small_height),
        Image.Resampling.BILINEAR
    )

    # =================================
    # PALETTE CONVERT
    # =================================

    img = palette_convert(img)

    # =================================
    # UPSCALE
    # =================================

    img = img.resize(
        (original_width, original_height),
        Image.Resampling.NEAREST
    )

    # =================================
    # SAVE
    # =================================

    os.makedirs(
        os.path.dirname(output_path),
        exist_ok=True
    )

    img.save(output_path)

# =====================================
# MAIN LOOP
# =====================================

for root, dirs, files in os.walk(SOURCE_DIR):

    dirs[:] = [
        d for d in dirs
        if d not in IGNORE_FOLDERS
    ]

    for file in files:

        if file.lower().endswith((
            ".png",
            ".jpg",
            ".jpeg"
        )):

            input_path = os.path.join(root, file)

            relative_path = os.path.relpath(
                input_path,
                SOURCE_DIR
            )

            # Force output to PNG
            relative_path = (
                os.path.splitext(relative_path)[0]
                + ".png"
            )

            output_path = os.path.join(
                OUTPUT_DIR,
                relative_path
            )

            print(f"Converting: {relative_path}")

            process_image(
                input_path,
                output_path
            )

print("DONE")