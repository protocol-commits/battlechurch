#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
from typing import Dict, Iterable, List

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INPUT_DIR = PROJECT_ROOT / "assets"
DEFAULT_OUTPUT = PROJECT_ROOT / "assets" / "palette_tools" / "asset_manifest.json"


def iter_image_files(root: Path) -> Iterable[Path]:
    root = root.resolve()
    for p in root.rglob("*"):
        if p.suffix.lower() in {".png", ".jpg", ".jpeg"} and p.is_file():
            yield p


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def unique_color_count(path: Path) -> int:
    img = Image.open(path).convert("RGBA")
    seen = set()
    for r, g, b, a in img.getdata():
        if a == 0:
            continue
        seen.add((r, g, b, a))
    return len(seen)


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate asset image manifest")
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    files = sorted(iter_image_files(args.input_dir))
    rows: List[Dict] = []
    total_bytes = 0
    for p in files:
        st = p.stat()
        total_bytes += st.st_size
        with Image.open(p) as im:
            w, h = im.size
            mode = im.mode
        try:
            rel = str(p.resolve().relative_to(PROJECT_ROOT))
        except ValueError:
            rel = str(p)
        rows.append(
            {
                "path": rel,
                "bytes": st.st_size,
                "sha256": file_sha256(p),
                "width": w,
                "height": h,
                "mode": mode,
                "unique_colors": unique_color_count(p),
            }
        )

    manifest = {
        "summary": {
            "file_count": len(rows),
            "total_bytes": total_bytes,
        },
        "files": rows,
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Manifest written: {args.output_json}")
    print(f"Images: {len(rows)} | bytes: {total_bytes}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
