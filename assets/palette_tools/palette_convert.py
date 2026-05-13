from PIL import Image
import numpy as np
import os

# =====================================
# CONFIG
# =====================================

# Only process files inside this folder
SOURCE_DIR = "../convert-this"

# Output converted files here
OUTPUT_DIR = "../converted_assets"

# Master palette image
PALETTE_IMAGE = "master_palette.png"

# Folders to ignore
IGNORE_FOLDERS = [
    "palette_tools",
    "converted_assets",
    "music",
    "sfx",
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
# CONVERT IMAGE
# =====================================

def convert_image(input_path, output_path):

    img = Image.open(input_path).convert("RGBA")

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

    # Create output folder structure
    os.makedirs(
        os.path.dirname(output_path),
        exist_ok=True
    )

    Image.fromarray(pixels).save(output_path)

# =====================================
# MAIN LOOP
# =====================================

for root, dirs, files in os.walk(SOURCE_DIR):

    # Ignore folders
    dirs[:] = [
        d for d in dirs
        if d not in IGNORE_FOLDERS
    ]

    for file in files:

        # Process PNG + JPG
        if file.lower().endswith((".png", ".jpg", ".jpeg")):

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

            convert_image(
                input_path,
                output_path
            )

print("DONE")