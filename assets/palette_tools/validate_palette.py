#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Set, Tuple

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_PALETTE_HEX = PROJECT_ROOT / "assets" / "palette_tools" / "desolate-guest.hex"
DEFAULT_INPUT_DIR = PROJECT_ROOT / "assets"
DEFAULT_REPORT = PROJECT_ROOT / "assets" / "palette_tools" / "validation_report.json"


def iter_image_files(root: Path) -> Iterable[Path]:
    root = root.resolve()
    for p in root.rglob("*"):
        if p.suffix.lower() in {".png", ".jpg", ".jpeg"} and p.is_file():
            yield p


def load_hex_palette(path: Path) -> Set[Tuple[int, int, int]]:
    colors: Set[Tuple[int, int, int]] = set()
    with path.open("r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip().lstrip("#")
            if not line:
                continue
            if len(line) != 6:
                raise ValueError(f"Invalid hex line '{raw_line.strip()}' in {path}")
            r = int(line[0:2], 16)
            g = int(line[2:4], 16)
            b = int(line[4:6], 16)
            colors.add((r, g, b))
    if not colors:
        raise ValueError(f"No colors parsed from {path}")
    return colors


def nearest_distance_sq(pixel: Tuple[int, int, int], palette: Set[Tuple[int, int, int]]) -> int:
    pr, pg, pb = pixel
    best = 1 << 30
    for r, g, b in palette:
        dr = pr - r
        dg = pg - g
        db = pb - b
        d = dr * dr + dg * dg + db * db
        if d < best:
            best = d
            if best == 0:
                break
    return best


@dataclass
class FileResult:
    path: str
    width: int
    height: int
    unique_colors: int
    outside_palette_count: int
    max_nearest_distance: int
    alpha_present: bool


def analyze_image(path: Path, palette: Set[Tuple[int, int, int]]) -> FileResult:
    img = Image.open(path)
    rgba = img.convert("RGBA")
    w, h = rgba.size
    unique: Set[Tuple[int, int, int]] = set()
    outside_count = 0
    max_dist = 0
    alpha_present = False
    for r, g, b, a in rgba.getdata():
        if a == 0:
            continue
        if a < 255:
            alpha_present = True
        rgb = (r, g, b)
        unique.add(rgb)
        if rgb not in palette:
            outside_count += 1
            d = nearest_distance_sq(rgb, palette)
            if d > max_dist:
                max_dist = d
    try:
        rel = str(path.resolve().relative_to(PROJECT_ROOT))
    except ValueError:
        rel = str(path)
    return FileResult(
        path=rel,
        width=w,
        height=h,
        unique_colors=len(unique),
        outside_palette_count=outside_count,
        max_nearest_distance=max_dist,
        alpha_present=alpha_present,
    )


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate image colors against desolate palette")
    parser.add_argument("--palette-hex", type=Path, default=DEFAULT_PALETTE_HEX)
    parser.add_argument("--input-dir", type=Path, default=DEFAULT_INPUT_DIR)
    parser.add_argument("--report-json", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--max-colors", type=int, default=256, help="fail if unique colors exceed this value")
    parser.add_argument("--allow-outside", action="store_true", help="do not fail when colors are outside palette")
    args = parser.parse_args()

    palette = load_hex_palette(args.palette_hex)
    files = list(iter_image_files(args.input_dir))
    if not files:
        print(f"No image files found in {args.input_dir}")
        return 1

    failures: List[Dict] = []
    results: List[Dict] = []
    for path in sorted(files):
        res = analyze_image(path, palette)
        row = {
            "path": res.path,
            "width": res.width,
            "height": res.height,
            "unique_colors": res.unique_colors,
            "outside_palette_count": res.outside_palette_count,
            "max_nearest_distance": res.max_nearest_distance,
            "alpha_present": res.alpha_present,
        }
        results.append(row)

        if res.unique_colors > args.max_colors:
            failures.append(
                {"path": res.path, "reason": f"unique_colors {res.unique_colors} > max_colors {args.max_colors}"}
            )
        if not args.allow_outside and res.outside_palette_count > 0:
            failures.append(
                {
                    "path": res.path,
                    "reason": f"{res.outside_palette_count} pixels outside palette (max_dist_sq={res.max_nearest_distance})",
                }
            )

    summary = {
        "files_scanned": len(results),
        "failures": len(failures),
        "max_colors_limit": args.max_colors,
        "allow_outside": args.allow_outside,
    }
    report = {
        "summary": summary,
        "failures": failures,
        "results": results,
    }
    args.report_json.parent.mkdir(parents=True, exist_ok=True)
    args.report_json.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Validation report: {args.report_json}")
    print(
        f"Scanned {summary['files_scanned']} images | failures: {summary['failures']} "
        f"(max_colors={args.max_colors}, allow_outside={args.allow_outside})"
    )
    if failures:
        print("Top failures:")
        for f in failures[:20]:
            print(f"  - {f['path']}: {f['reason']}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
