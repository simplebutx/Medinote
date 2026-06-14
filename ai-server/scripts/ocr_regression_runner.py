from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.ocr.image_preprocessing import preprocess_prescription_image
from app.services.ocr.medicine_extractor import extract_medicines
from app.services.ocr.metadata_extractor import extract_metadata
from app.services.ocr.ocr_clients import _extract_tokens
from app.services.ocr.ocr_service import _tokens_to_lines


IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}


def iter_image_paths(path: Path) -> list[Path]:
    if path.is_file():
        return [path]
    return sorted(
        item
        for item in path.iterdir()
        if item.is_file() and item.suffix.lower() in IMAGE_EXTENSIONS
    )


def analyze_image(path: Path) -> dict[str, Any]:
    image_array = np.array(Image.open(path).convert("RGB"))
    preprocessed = preprocess_prescription_image(image_array)
    tokens = _extract_tokens(preprocessed)
    lines = _tokens_to_lines(tokens)

    return {
        "file": path.name,
        "metadata": extract_metadata(tokens, lines),
        "medicines": extract_medicines(tokens, lines),
        "rawText": "\n".join(lines),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run local OCR regression checks against image files."
    )
    parser.add_argument("image_path", type=Path, help="Image file or directory")
    parser.add_argument(
        "--json-out",
        type=Path,
        default=None,
        help="Optional path to write JSON results.",
    )
    parser.add_argument(
        "--raw",
        action="store_true",
        help="Print OCR raw text for each image.",
    )
    args = parser.parse_args()

    paths = iter_image_paths(args.image_path)
    results: list[dict[str, Any]] = []

    for index, path in enumerate(paths, start=1):
        print(f"\n=== [{index}/{len(paths)}] {path.name} ===", flush=True)
        try:
            result = analyze_image(path)
        except Exception as exc:
            result = {
                "file": path.name,
                "metadata": {},
                "medicines": [],
                "rawText": "",
                "error": str(exc),
            }
            results.append(result)
            print(
                json.dumps(
                    {
                        "file": result["file"],
                        "error": result["error"],
                    },
                    ensure_ascii=False,
                    indent=2,
                ),
                flush=True,
            )
            continue
        results.append(result)

        print(
            json.dumps(
                {
                    "file": result["file"],
                    **result["metadata"],
                    "medicines": result["medicines"],
                },
                ensure_ascii=False,
                indent=2,
            ),
            flush=True,
        )
        if args.raw:
            print("--- rawText ---")
            print(result["rawText"])

    if args.json_out is not None:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(results, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\nWrote {args.json_out}", flush=True)


if __name__ == "__main__":
    main()
