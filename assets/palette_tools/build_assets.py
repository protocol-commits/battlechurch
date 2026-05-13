#!/usr/bin/env python3
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PROJECT_ROOT = ROOT.parents[1]


def run_step(name: str, cmd: list[str]) -> int:
    print(f"\n== {name} ==")
    print(" ".join(cmd))
    completed = subprocess.run(cmd, cwd=PROJECT_ROOT)
    if completed.returncode != 0:
        print(f"[FAIL] {name} (exit {completed.returncode})")
    else:
        print(f"[OK] {name}")
    return completed.returncode


def main() -> int:
    parser = argparse.ArgumentParser(
        description="One-command asset pipeline: convert -> validate -> manifest"
    )
    parser.add_argument(
        "--mode",
        choices=["sprites", "backgrounds", "both"],
        default="both",
        help="which converter(s) to run before validation/manifest",
    )
    parser.add_argument(
        "--max-colors",
        type=int,
        default=256,
        help="palette validation limit per image",
    )
    parser.add_argument(
        "--input-dir",
        type=Path,
        default=PROJECT_ROOT / "assets",
        help="validation/manifest input directory",
    )
    parser.add_argument(
        "--allow-outside-palette",
        action="store_true",
        help="do not fail validation when pixels are outside palette",
    )
    args = parser.parse_args()

    py = sys.executable
    steps: list[tuple[str, list[str]]] = []

    if args.mode in {"sprites", "both"}:
        steps.append(("Convert Sprites", [py, str(ROOT / "palette_convert.py")]))
    if args.mode in {"backgrounds", "both"}:
        steps.append(("Convert Backgrounds", [py, str(ROOT / "background-convert.py")]))

    validate_cmd = [
        py,
        str(ROOT / "validate_palette.py"),
        "--input-dir",
        str(args.input_dir),
        "--max-colors",
        str(args.max_colors),
    ]
    if args.allow_outside_palette:
        validate_cmd.append("--allow-outside")
    steps.append(("Validate Palette", validate_cmd))

    steps.append(
        (
            "Generate Manifest",
            [
                py,
                str(ROOT / "generate_manifest.py"),
                "--input-dir",
                str(args.input_dir),
            ],
        )
    )

    for name, cmd in steps:
        code = run_step(name, cmd)
        if code != 0:
            return code

    print("\nPipeline complete.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

