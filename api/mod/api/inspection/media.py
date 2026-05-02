"""Inspection uploads: compress and write under the API project uploads/ tree."""

from __future__ import annotations

import io
from pathlib import Path

from PIL import Image, ImageOps

API_ROOT = Path(__file__).resolve().parents[3]


def compress_image(
    image_bytes: bytes,
    *,
    max_edge: int = 1920,
    jpeg_quality: int = 82,
) -> bytes:
    """Re-encode as JPEG with optional downscale. RGB output."""
    with Image.open(io.BytesIO(image_bytes)) as im:
        im = ImageOps.exif_transpose(im)
        if im.mode in ("RGBA", "P"):
            base = Image.new("RGB", im.size, (255, 255, 255))
            mask = im.split()[-1] if im.mode == "RGBA" else None
            base.paste(im, mask=mask)
            im = base
        elif im.mode != "RGB":
            im = im.convert("RGB")
        w, h = im.size
        longest = max(w, h)
        if longest > max_edge:
            scale = max_edge / longest
            im = im.resize(
                (max(1, int(w * scale)), max(1, int(h * scale))),
                Image.Resampling.LANCZOS,
            )
        buf = io.BytesIO()
        im.save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
        return buf.getvalue()


def upload_media(relative_path: str, data: bytes) -> str:
    """Write bytes under API project root; returns a POSIX path for CDN prefixing.

    Path must stay under uploads/ (e.g. uploads/inspections/<barcode>/inbound/<id>.jpg).
    """
    rel = Path(relative_path)
    if rel.is_absolute() or ".." in rel.parts:
        raise ValueError("Invalid media path")
    parts = rel.parts
    if len(parts) < 1 or parts[0] != "uploads":
        raise ValueError("Media path must start with uploads/")
    dest = (API_ROOT / rel).resolve()
    uploads_root = (API_ROOT / "uploads").resolve()
    try:
        dest.relative_to(uploads_root)
    except ValueError as exc:
        raise ValueError("Media path must stay under uploads/") from exc
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    return rel.as_posix()
